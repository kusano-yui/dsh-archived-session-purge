import assert from 'node:assert/strict'
import fs from 'node:fs/promises'
import os from 'node:os'
import path from 'node:path'
import { apply } from '../index.js'

const ID = 'session-purge-fixture'
const root = await fs.mkdtemp(path.join(os.tmpdir(), 'dsh-archived-purge-'))
const home = path.join(root, 'home')
const sessionDir = path.join(home, 'sessions', '--fixture--', ID)
const logFile = path.join(sessionDir, 'session.v4.jsonl.zstd')
const cacheFile = path.join(home, 'storages', 'session_projcache', 'sessions', `${ID}.json`)
await fs.mkdir(sessionDir, { recursive: true })
await fs.mkdir(path.dirname(cacheFile), { recursive: true })
await fs.writeFile(logFile, 'fixture')
await fs.writeFile(cacheFile, '{}')
process.env.DSH_HOME = home

let archived = [ID]
let live = false
let detached = false
let unarchived = false
let route
let principal = 'owner'

const workspace = {
  sessionIds: [ID],
  async detachSession(sessionId) {
    assert.equal(sessionId, ID)
    detached = true
  },
}

const ctx = {
  effect(fn) {
    return fn()
  },
  logger: { warn() {} },
  connection: {
    admit() {
      return { peer: { principal: { kind: principal } } }
    },
  },
  webServer: {
    register(next) {
      route = next
      return () => {}
    },
  },
  get(name) {
    if (name === 'agents') return { get: () => (live ? { id: ID } : undefined) }
    if (name === 'sessions') return { get: () => undefined }
    if (name === 'storageDomain') {
      return {
        get(domain) {
          if (domain === 'workspace') {
            return { global: { get: () => ({ archivedSessionIds: archived }) } }
          }
          return undefined
        },
      }
    }
    return undefined
  },
  sessionPersistence: {
    async stat(sessionId) {
      assert.equal(sessionId, ID)
      return { header: { id: ID }, location: { kind: 'jsonl', path: logFile } }
    },
  },
  workspaceRegistry: {
    list() {
      return [workspace]
    },
    async unarchiveSession(sessionId) {
      assert.equal(sessionId, ID)
      unarchived = true
    },
  },
}

apply(ctx)
assert.equal(route?.path, '/archived-session-purge/delete')
assert.equal(route?.kind, 'exact')

async function call(body) {
  const request = {
    method: 'POST',
    headers: {},
    async *[Symbol.asyncIterator]() {
      yield Buffer.from(JSON.stringify(body))
    },
  }
  const response = {
    status: null,
    body: '',
    writeHead(status) {
      this.status = status
    },
    end(value) {
      this.body = value ?? ''
    },
  }
  await route.handler(request, response)
  return { status: response.status, body: response.body.length > 0 ? JSON.parse(response.body) : null }
}

const success = await call({ sessionId: ID })
assert.equal(success.status, 200)
assert.equal(success.body.ok, true)
assert.equal(success.body.value.removedLog, true)
assert.equal(success.body.value.removedCache, true)
assert.equal(success.body.value.removedArchive, true)
assert.equal(success.body.value.removedFromWorkspace, true)
assert.deepEqual(success.body.value.warnings, [])
assert.equal(detached, true)
assert.equal(unarchived, true)
await assert.rejects(fs.stat(sessionDir), { code: 'ENOENT' })
await assert.rejects(fs.stat(cacheFile), { code: 'ENOENT' })

archived = []
const notArchived = await call({ sessionId: ID })
assert.equal(notArchived.status, 409)
assert.equal(notArchived.body.ok, false)
assert.equal(notArchived.body.error.code, 'not-archived')

archived = [ID]
live = true
const liveResult = await call({ sessionId: ID })
assert.equal(liveResult.status, 409)
assert.equal(liveResult.body.error.code, 'session-live')
live = false

principal = 'api'
const forbidden = await call({ sessionId: ID })
assert.equal(forbidden.status, 403)
principal = 'owner'

const badLayout = path.join(home, 'sessions', '--fixture--', 'other-session', 'not-a-session.txt')
await fs.mkdir(path.dirname(badLayout), { recursive: true })
await fs.writeFile(badLayout, 'keep')
ctx.sessionPersistence.stat = async () => ({ header: { id: ID }, location: { kind: 'jsonl', path: badLayout } })
const refused = await call({ sessionId: ID })
assert.equal(refused.status, 500)
assert.equal(refused.body.error.code, 'unsupported-layout')
assert.equal(await fs.readFile(badLayout, 'utf8'), 'keep')

await fs.rm(root, { recursive: true, force: true })
console.log('archived purge host tests passed')
