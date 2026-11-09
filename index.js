import fs from 'node:fs/promises'
import os from 'node:os'
import path from 'node:path'

const ROUTE = '/archived-session-purge/delete'
const CACHE_DOMAIN = 'session_projcache'
const MAX_BODY_BYTES = 64 * 1024
const inFlight = new Set()

class PurgeError extends Error {
  constructor(code, message) {
    super(message)
    this.name = 'PurgeError'
    this.code = code
  }
}

function failure(code, message) {
  return { ok: false, error: { code, message, details: {} } }
}

function statusFor(code) {
  switch (code) {
    case 'invalid-session':
    case 'invalid-request':
      return 400
    case 'forbidden':
      return 403
    case 'not-archived':
    case 'session-live':
    case 'busy':
      return 409
    default:
      return 500
  }
}

/**
 * Register the owner-only HTTP endpoint used by the settings page.
 * `connection.admit` applies the Host/Origin fence and browser cookie
 * authentication; the peer principal keeps destructive cleanup owner-only.
 */
export const inject = ['connection', 'sessionPersistence', 'workspaceRegistry', 'webServer']

export function apply(ctx) {
  ctx.effect(() => ctx.webServer.register({
    kind: 'exact',
    path: ROUTE,
    handler: (request, response) => handlePurgeRequest(ctx, request, response),
  }), 'archived-session-purge: delete endpoint')
}

async function handlePurgeRequest(ctx, request, response) {
  if (request.method !== 'POST') {
    response.writeHead(405, { allow: 'POST' })
    response.end()
    return
  }
  const admission = ctx.connection.admit(request)
  if ('rejection' in admission) {
    writeJson(response, admission.rejection, failure(
      admission.rejection === 401 ? 'unauthorized' : 'forbidden',
      admission.rejection === 401 ? 'The browser session is not authenticated.' : 'The request was rejected by the connection trust fence.',
    ))
    return
  }
  if (admission.peer.principal.kind !== 'owner') {
    writeJson(response, 403, failure('forbidden', 'Only the local owner may delete archived sessions.'))
    return
  }

  let payload
  try {
    payload = await readJsonBody(request)
  } catch (error) {
    writeJson(response, 400, failure('invalid-request', error instanceof Error ? error.message : String(error)))
    return
  }

  try {
    const value = await purgeArchivedSession(ctx, payload)
    writeJson(response, 200, { ok: true, value })
  } catch (error) {
    if (error instanceof PurgeError) {
      writeJson(response, statusFor(error.code), failure(error.code, error.message))
      return
    }
    const message = error instanceof Error ? error.message : String(error)
    try {
      ctx.logger?.warn?.(`[archived-session-purge] ${message}`)
    } catch {}
    writeJson(response, 500, failure('internal', message))
  }
}

async function readJsonBody(request) {
  const chunks = []
  let total = 0
  for await (const chunk of request) {
    total += chunk.length
    if (total > MAX_BODY_BYTES) throw new Error('The request body is too large.')
    chunks.push(chunk)
  }
  const text = Buffer.concat(chunks).toString('utf8')
  if (text.trim().length === 0) throw new Error('A JSON request body is required.')
  return JSON.parse(text)
}

function writeJson(response, status, body) {
  response.writeHead(status, {
    'content-type': 'application/json; charset=utf-8',
    'cache-control': 'no-store',
  })
  response.end(JSON.stringify(body))
}

/**
 * Permanently delete one archived session.
 *
 * The session log is removed first so a failed filesystem operation leaves the
 * archive mark untouched. Registry cleanup runs afterwards and any residual
 * failure is reported as a warning rather than pretending the log still exists.
 */
export async function purgeArchivedSession(ctx, payload) {
  const sessionId = typeof payload?.sessionId === 'string' ? payload.sessionId.trim() : ''
  if (sessionId.length === 0 || sessionId.length > 512 || sessionId === '.' || sessionId === '..' || /[\\/]/.test(sessionId)) {
    throw new PurgeError('invalid-session', 'A valid session identity is required.')
  }
  if (inFlight.has(sessionId)) throw new PurgeError('busy', 'This session is already being deleted.')

  inFlight.add(sessionId)
  try {
    return await purge(ctx, sessionId)
  } finally {
    inFlight.delete(sessionId)
  }
}

async function purge(ctx, sessionId) {
  const storageDomain = ctx.get('storageDomain')
  const workspaceDomain = storageDomain?.get('workspace')
  if (workspaceDomain === undefined) {
    throw new PurgeError('unavailable', 'The workspace registry is unavailable in this profile.')
  }
  const workspaceState = workspaceDomain.global.get()
  const archived = Array.isArray(workspaceState?.archivedSessionIds) ? workspaceState.archivedSessionIds : []
  if (!archived.includes(sessionId)) {
    throw new PurgeError('not-archived', 'Only archived sessions can be permanently deleted.')
  }

  if (ctx.get('agents')?.get(sessionId) !== undefined || ctx.get('sessions')?.get(sessionId) !== undefined) {
    throw new PurgeError('session-live', 'This session still has live runtime state. Close it and try again.')
  }

  // Capture the accounting owner before the log disappears: the registry's
  // sessionIds getter validates headers and would stop seeing the id later.
  let ownerWorkspace
  try {
    ownerWorkspace = ctx.workspaceRegistry.list().find((workspace) => workspace.sessionIds.includes(sessionId))
  } catch {}

  let snapshot
  try {
    snapshot = await ctx.sessionPersistence.stat(sessionId)
  } catch (error) {
    throw new PurgeError('inspect-failed', `Could not inspect the session log: ${error instanceof Error ? error.message : String(error)}`)
  }

  let sessionDir
  if (snapshot !== undefined) {
    const location = snapshot.location
    if (location !== undefined) {
      if (location.kind !== 'jsonl' || typeof location.path !== 'string') {
        throw new PurgeError('unsupported-backend', `This profile stores the session as ${String(location.kind)}; this build only removes JSONL session files.`)
      }
      const fileName = path.basename(location.path)
      if (!/^session(?:\.v\d+)?\.jsonl(?:\.zstd)?$/.test(fileName)) {
        throw new PurgeError('unsupported-layout', `Refusing to remove an unrecognized session artifact: ${fileName}`)
      }
      sessionDir = path.dirname(location.path)
      if (path.dirname(sessionDir) === sessionDir) {
        throw new PurgeError('unsupported-layout', 'Refusing to remove a session directory at a filesystem root.')
      }
    }
  }

  let removedLog = false
  if (sessionDir !== undefined) {
    try {
      await fs.rm(sessionDir, { recursive: true, force: true, maxRetries: 3, retryDelay: 50 })
      removedLog = true
    } catch (error) {
      throw new PurgeError('log-delete-failed', `Could not remove the session log: ${error instanceof Error ? error.message : String(error)}`)
    }
  }

  const warnings = []
  let removedCache = false
  const cacheDomain = storageDomain.get(CACHE_DOMAIN)
  if (cacheDomain !== undefined) {
    try {
      removedCache = await cacheDomain.table('sessions').delete(sessionId)
    } catch (error) {
      warnings.push(`projection cache: ${error instanceof Error ? error.message : String(error)}`)
    }
  }
  if (!removedCache && /^[A-Za-z0-9._-]+$/.test(sessionId)) {
    const cacheFile = path.join(resolveDshHome(), 'storages', CACHE_DOMAIN, 'sessions', `${sessionId}.json`)
    try {
      await fs.rm(cacheFile, { force: true })
      removedCache = true
    } catch (error) {
      warnings.push(`projection cache file: ${error instanceof Error ? error.message : String(error)}`)
    }
  }

  let removedArchive = false
  try {
    await ctx.workspaceRegistry.unarchiveSession(sessionId)
    removedArchive = true
  } catch (error) {
    warnings.push(`archive mark: ${error instanceof Error ? error.message : String(error)}`)
  }

  let removedFromWorkspace = false
  if (ownerWorkspace !== undefined) {
    try {
      await ownerWorkspace.detachSession(sessionId)
      removedFromWorkspace = true
    } catch (error) {
      warnings.push(`workspace record: ${error instanceof Error ? error.message : String(error)}`)
    }
  }

  return {
    sessionId,
    removedLog,
    removedCache,
    removedArchive,
    removedFromWorkspace,
    warnings,
  }
}

function resolveDshHome() {
  const configured = process.env.DSH_HOME?.trim()
  return configured && configured.length > 0 ? configured : path.join(os.homedir(), '.dsh')
}
