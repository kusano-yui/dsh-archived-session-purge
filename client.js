(() => {
const NS = 'archived-purge'
const ENDPOINT = 'archived-session-purge/delete'

const ERROR_KEYS = {
  'not-archived': 'error.notArchived',
  'session-live': 'error.sessionLive',
  busy: 'error.busy',
  'invalid-session': 'error.invalid',
  'invalid-request': 'error.invalidRequest',
  unauthorized: 'error.unauthorized',
  unavailable: 'error.unavailable',
  forbidden: 'error.forbidden',
  'inspect-failed': 'error.inspectFailed',
  'unsupported-backend': 'error.unsupportedBackend',
  'unsupported-layout': 'error.unsupportedLayout',
  'log-delete-failed': 'error.logDeleteFailed',
  internal: 'error.internal',
}

const CSS = `
.aps-root{max-width:820px;padding:8px 0 40px;color:var(--dsw-alias-label-primary);font-size:13px;line-height:1.55}
.aps-header h2{margin:0 0 6px;font-size:18px;font-weight:600;line-height:1.4}
.aps-header p{margin:0;max-width:700px;color:var(--dsw-alias-label-secondary)}
.aps-total{margin-top:8px;color:var(--dsw-alias-label-secondary);font-size:12px}
.aps-notice{margin-top:14px;padding:9px 12px;border:1px solid var(--dsw-alias-border-l1);border-radius:9px;background:var(--dsw-alias-bg-layer-1);font-size:12px}
.aps-notice.ok{border-color:var(--dsw-alias-state-success-primary);color:var(--dsw-alias-state-success-primary)}
.aps-notice.warn{border-color:var(--dsw-alias-state-warn-primary);color:var(--dsw-alias-state-warn-primary)}
.aps-notice.error{border-color:var(--dsw-alias-state-error-primary);color:var(--dsw-alias-state-error-primary)}
.aps-group{margin-top:16px;border:1px solid var(--dsw-alias-border-l1);border-radius:12px;background:var(--dsw-alias-bg-layer-1);overflow:hidden}
.aps-group-head{display:flex;align-items:flex-start;justify-content:space-between;gap:16px;padding:12px 14px;border-bottom:1px solid var(--dsw-alias-border-l1)}
.aps-group-main{min-width:0}
.aps-group-name{font-size:14px;font-weight:600;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
.aps-group-path{margin-top:2px;color:var(--dsw-alias-label-secondary);font-family:ui-monospace,SFMono-Regular,Menlo,Consolas,monospace;font-size:11px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
.aps-group-actions{display:flex;align-items:center;gap:10px;flex:none}
.aps-count{color:var(--dsw-alias-label-secondary);font-size:11px;white-space:nowrap}
.aps-list{list-style:none;margin:0;padding:0}
.aps-row{display:flex;align-items:center;justify-content:space-between;gap:16px;padding:10px 14px;border-top:1px solid var(--dsw-alias-border-l1)}
.aps-row:first-child{border-top:none}
.aps-row-main{min-width:0}
.aps-row-title{font-size:13px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
.aps-row-meta{display:flex;align-items:center;gap:8px;margin-top:2px;color:var(--dsw-alias-label-secondary);font-size:11px;min-width:0}
.aps-row-meta span{overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
.aps-row-id{font-family:ui-monospace,SFMono-Regular,Menlo,Consolas,monospace;color:var(--dsw-alias-label-secondary);opacity:.8}
.aps-btn{appearance:none;border:1px solid var(--dsw-alias-border-l2);border-radius:8px;background:transparent;color:var(--dsw-alias-label-primary);padding:6px 12px;font:inherit;font-size:12px;line-height:1.2;cursor:pointer;white-space:nowrap}
.aps-btn:hover{background:var(--dsw-alias-bg-layer-2)}
.aps-btn:focus-visible{outline:2px solid var(--dsw-alias-brand-primary);outline-offset:2px}
.aps-btn:disabled{opacity:.55;cursor:default}
.aps-danger{color:var(--dsw-alias-state-error-primary);border-color:var(--dsw-alias-state-error-primary)}
.aps-danger:hover{background:color-mix(in srgb,var(--dsw-alias-state-error-primary) 10%,transparent)}
.aps-delete{padding:5px 10px}
.aps-empty{margin-top:22px;padding:34px 20px;border:1px dashed var(--dsw-alias-border-l1);border-radius:14px;text-align:center;color:var(--dsw-alias-label-secondary)}
.aps-empty svg{color:var(--dsw-alias-label-secondary);opacity:.7;margin-bottom:10px}
.aps-empty-title{margin:0 0 4px;color:var(--dsw-alias-label-primary);font-size:14px;font-weight:600}
.aps-empty-hint{margin:0;font-size:12px}
.aps-dialog{width:min(460px,calc(100vw - 32px));margin:auto;padding:0;border:1px solid var(--dsw-alias-border-l1);border-radius:14px;background:var(--dsw-alias-bg-overlay);color:var(--dsw-alias-label-primary);box-shadow:0 18px 60px rgba(0,0,0,.35)}
.aps-dialog::backdrop{background:rgba(0,0,0,.48)}
.aps-dialog-body{padding:20px 20px 16px}
.aps-dialog h3{margin:0 0 8px;font-size:15px;font-weight:600;line-height:1.4}
.aps-dialog p{margin:0 0 8px;color:var(--dsw-alias-label-secondary);font-size:12px;line-height:1.6}
.aps-dialog p.aps-warn{color:var(--dsw-alias-state-warn-primary)}
.aps-dialog p.aps-error{color:var(--dsw-alias-state-error-primary);word-break:break-word}
.aps-dialog-actions{display:flex;justify-content:flex-end;gap:8px;padding:12px 20px 18px}
@media (max-width:640px){.aps-group-head{flex-direction:column;align-items:stretch}.aps-group-actions{justify-content:space-between}.aps-row{align-items:flex-start}.aps-count{white-space:normal}}
`

const EN = {
  sectionLabel: 'Archived sessions',
  sectionDescription: 'Permanently erase archived sessions from this profile. The complete session log, cached projection index, archive mark, and workspace membership are removed. This cannot be undone.',
  totalArchived: '{count} archived sessions in this profile',
  delete: 'Delete',
  deleteAll: 'Delete all',
  deleteOne: 'Delete {title} permanently',
  confirmTitle: 'Delete this archived session?',
  confirmBody: '“{title}” and its complete log will be permanently erased.',
  confirmGroupTitle: 'Delete every archived session in this workspace?',
  confirmGroupBody: '{count} archived sessions and their complete logs will be permanently erased.',
  irreversible: 'This action cannot be undone.',
  cancel: 'Cancel',
  confirmDelete: 'Delete permanently',
  deleting: 'Deleting {done} of {total}…',
  deletedOne: 'Deleted “{title}”.',
  deletedMany: 'Deleted {count} archived sessions.',
  deletedWithWarnings: 'Deleted {count} archived sessions; some metadata cleanup steps reported warnings.',
  partial: 'Deleted {done} of {total} sessions.',
  partialError: 'Deleted {done} of {total} sessions. {message}',
  emptyTitle: 'No archived sessions',
  emptyHint: 'Archive a session first; it will appear here for permanent deletion.',
  rowCount: '{count} archived',
  updatedAt: 'Updated {time}',
  untitled: 'Untitled session',
  blank: 'New session',
  ungrouped: 'Ungrouped',
  noPath: 'No workspace',
  'error.generic': 'Deletion failed. {message}',
  'error.notArchived': 'This session is no longer archived; refresh the page.',
  'error.sessionLive': 'This session still has live runtime state. Close it and try again.',
  'error.busy': 'This session is already being deleted.',
  'error.invalid': 'The session identity is invalid.',
  'error.invalidRequest': 'The deletion request was malformed.',
  'error.unauthorized': 'The browser session is not authenticated. Reload the page and try again.',
  'error.unavailable': 'The workspace registry is unavailable in this profile.',
  'error.forbidden': 'Only the local owner may delete archived sessions.',
  'error.inspectFailed': 'The session log could not be inspected.',
  'error.unsupportedBackend': 'This profile uses a session storage backend this plugin cannot delete.',
  'error.unsupportedLayout': 'The session artifact layout is not recognized; nothing was deleted.',
  'error.logDeleteFailed': 'The session log could not be removed. Close any process using it and try again.',
  'error.internal': 'The deletion failed unexpectedly.',
}

const ZH = {
  sectionLabel: '归档会话',
  sectionDescription: '从当前配置中彻底删除已归档会话：会话日志、投影缓存索引、归档标记和工作区归属都会被清理。此操作不可撤销。',
  totalArchived: '当前配置中共有 {count} 个归档会话',
  delete: '删除',
  deleteAll: '全部删除',
  deleteOne: '彻底删除 {title}',
  confirmTitle: '彻底删除这个归档会话？',
  confirmBody: '“{title}”及其完整日志将被永久删除。',
  confirmGroupTitle: '彻底删除此工作区的全部归档会话？',
  confirmGroupBody: '{count} 个归档会话及其完整日志将被永久删除。',
  irreversible: '此操作不可撤销。',
  cancel: '取消',
  confirmDelete: '彻底删除',
  deleting: '正在删除 {done}/{total}…',
  deletedOne: '已删除“{title}”。',
  deletedMany: '已删除 {count} 个归档会话。',
  deletedWithWarnings: '已删除 {count} 个归档会话，但部分元数据清理步骤报告了警告。',
  partial: '已删除 {done}/{total} 个会话。',
  partialError: '已删除 {done}/{total} 个会话。{message}',
  emptyTitle: '没有归档会话',
  emptyHint: '先归档一个会话，它就会出现在这里以供彻底删除。',
  rowCount: '{count} 个归档',
  updatedAt: '更新于 {time}',
  untitled: '未命名会话',
  blank: '新会话',
  ungrouped: '未分组',
  noPath: '无工作区',
  'error.generic': '删除失败。{message}',
  'error.notArchived': '该会话已不再处于归档状态，请刷新页面。',
  'error.sessionLive': '该会话仍有运行中的状态。请先关闭它再重试。',
  'error.busy': '该会话正在被删除。',
  'error.invalid': '会话标识无效。',
  'error.invalidRequest': '删除请求格式不正确。',
  'error.unauthorized': '浏览器会话未通过认证，请刷新页面后重试。',
  'error.unavailable': '当前配置中无法访问工作区注册表。',
  'error.forbidden': '只有本地所有者可以删除归档会话。',
  'error.inspectFailed': '无法检查会话日志。',
  'error.unsupportedBackend': '当前配置使用此插件无法删除的会话存储后端。',
  'error.unsupportedLayout': '无法识别会话文件布局，未执行删除。',
  'error.logDeleteFailed': '无法删除会话日志。请关闭占用它的进程后重试。',
  'error.internal': '删除过程中发生意外错误。',
}

window.__ModuleLoader__.load({
  id: 'dsh-archived-purge',
  factory(require) {
    const React = require('react')
    const h = React.createElement
    const { useEffect, useMemo, useRef, useState } = React

    function rowFor(sessionId, sessionState, t) {
      const summary = sessionState?.byId?.[sessionId]
      const title = summary?.blank === true
        ? t('blank')
        : (typeof summary?.title === 'string' && summary.title.trim().length > 0 ? summary.title.trim() : t('untitled'))
      return {
        id: sessionId,
        title,
        updatedAt: typeof summary?.updatedAt === 'number' ? summary.updatedAt : undefined,
      }
    }

    function errorText(t, error) {
      const code = error?.code
      const key = code !== undefined ? ERROR_KEYS[code] : undefined
      if (key !== undefined) return t(key)
      const message = typeof error?.message === 'string' && error.message.length > 0 ? ` ${error.message}` : ''
      return t('error.generic', { message })
    }

    function ArchivedPurgeSection(props) {
      const t = props.t ?? props.translate ?? ((key) => key)
      const { deleteArchived, useSessions, useWorkspaces } = props
      const workspaces = useWorkspaces((state) => state.items)
      const archivedSessionIds = useWorkspaces((state) => state.archivedSessionIds)
      const sessionState = useSessions((state) => state)

      const [removed, setRemoved] = useState(() => new Set())
      const [target, setTarget] = useState(null)
      const [busy, setBusy] = useState(false)
      const [progress, setProgress] = useState({ done: 0, total: 0 })
      const [error, setError] = useState(null)
      const [notice, setNotice] = useState(null)
      const dialogRef = useRef(null)
      const abortRef = useRef(null)

      const groups = useMemo(() => {
        const archived = new Set(Array.isArray(archivedSessionIds) ? archivedSessionIds : [])
        const result = (Array.isArray(workspaces) ? workspaces : []).map((workspace) => ({
          id: workspace.workspaceId,
          title: workspace.title || workspace.path || t('ungrouped'),
          path: workspace.path,
          rows: [],
        }))
        const byId = new Map(result.map((group) => [group.id, group]))
        const claimed = new Set()
        for (const workspace of Array.isArray(workspaces) ? workspaces : []) {
          const group = byId.get(workspace.workspaceId)
          if (group === undefined) continue
          for (const sessionId of workspace.sessionIds ?? []) {
            if (!archived.has(sessionId) || claimed.has(sessionId)) continue
            claimed.add(sessionId)
            group.rows.push(rowFor(sessionId, sessionState, t))
          }
        }
        const leftovers = [...archived].filter((sessionId) => !claimed.has(sessionId)).map((sessionId) => rowFor(sessionId, sessionState, t))
        if (leftovers.length > 0) result.push({ id: '__ungrouped', title: t('ungrouped'), path: '', rows: leftovers })
        for (const group of result) {
          group.rows.sort((a, b) => (b.updatedAt ?? 0) - (a.updatedAt ?? 0))
        }
        return result.filter((group) => group.rows.length > 0)
      }, [workspaces, archivedSessionIds, sessionState, t])

      const visibleGroups = useMemo(() => groups
        .map((group) => ({ ...group, rows: group.rows.filter((row) => !removed.has(row.id)) }))
        .filter((group) => group.rows.length > 0), [groups, removed])
      const total = visibleGroups.reduce((sum, group) => sum + group.rows.length, 0)

      useEffect(() => {
        const dialog = dialogRef.current
        if (dialog === null) return
        if (target !== null && !dialog.open) {
          setError(null)
          dialog.showModal()
        } else if (target === null && dialog.open) {
          dialog.close()
        }
      }, [target])

      useEffect(() => {
        if (notice === null) return
        const timer = setTimeout(() => setNotice(null), 6500)
        return () => clearTimeout(timer)
      }, [notice])

      useEffect(() => () => {
        abortRef.current?.abort()
      }, [])

      const begin = (nextTarget) => {
        if (busy) return
        setNotice(null)
        setError(null)
        setTarget(nextTarget)
      }

      const confirmDelete = async () => {
        if (target === null || busy) return
        const rows = target.type === 'group' ? target.rows : [target.row]
        if (rows.length === 0) return
        const controller = new AbortController()
        abortRef.current = controller
        setBusy(true)
        setError(null)
        setProgress({ done: 0, total: rows.length })
        let deleted = 0
        let warnings = 0
        let failure = null
        for (const row of rows) {
          try {
            const value = await deleteArchived(row.id, controller.signal)
            warnings += Array.isArray(value?.warnings) ? value.warnings.length : 0
            deleted += 1
            setRemoved((current) => {
              const next = new Set(current)
              next.add(row.id)
              return next
            })
            setProgress({ done: deleted, total: rows.length })
          } catch (reason) {
            failure = reason
            break
          }
        }
        abortRef.current = null
        setBusy(false)
        if (failure !== null) {
          if (deleted === 0) {
            setError(failure)
            return
          }
          setTarget(null)
          setNotice({
            kind: 'error',
            text: t('partialError', { done: deleted, total: rows.length, message: errorText(t, failure) }),
          })
          return
        }
        setTarget(null)
        if (rows.length === 1) {
          setNotice({ kind: warnings > 0 ? 'warn' : 'ok', text: warnings > 0 ? t('deletedWithWarnings', { count: 1 }) : t('deletedOne', { title: rows[0].title }) })
        } else {
          setNotice({ kind: warnings > 0 ? 'warn' : 'ok', text: warnings > 0 ? t('deletedWithWarnings', { count: rows.length }) : t('deletedMany', { count: rows.length }) })
        }
      }

      const targetRows = target?.type === 'group' ? target.rows : target?.row ? [target.row] : []

      return h('section', { className: 'aps-root', 'aria-label': t('sectionLabel') },
        h('style', null, CSS),
        h('header', { className: 'aps-header' },
          h('h2', null, t('sectionLabel')),
          h('p', null, t('sectionDescription')),
          total > 0 ? h('div', { className: 'aps-total' }, t('totalArchived', { count: total })) : null,
        ),
        notice !== null ? h('div', { className: `aps-notice ${notice.kind}`, role: notice.kind === 'error' ? 'alert' : 'status' }, notice.text) : null,
        visibleGroups.length === 0
          ? h('div', { className: 'aps-empty' },
            h('svg', { width: 42, height: 42, viewBox: '0 0 48 48', 'aria-hidden': true },
              h('rect', { x: 7, y: 10, width: 34, height: 7, rx: 2, fill: 'currentColor', opacity: 0.55 }),
              h('path', { d: 'M10 20h28v15a4 4 0 0 1-4 4H14a4 4 0 0 1-4-4z', fill: 'none', stroke: 'currentColor', strokeWidth: 2.4 }),
              h('path', { d: 'M19 26h10M20 32h8', stroke: 'currentColor', strokeWidth: 2.2, strokeLinecap: 'round' }),
            ),
            h('p', { className: 'aps-empty-title' }, t('emptyTitle')),
            h('p', { className: 'aps-empty-hint' }, t('emptyHint')),
          )
          : visibleGroups.map((group) => h('section', { key: group.id, className: 'aps-group' },
            h('div', { className: 'aps-group-head' },
              h('div', { className: 'aps-group-main' },
                h('div', { className: 'aps-group-name', title: group.title }, group.title),
                h('div', { className: 'aps-group-path', title: group.path || t('noPath') }, group.path || t('noPath')),
              ),
              h('div', { className: 'aps-group-actions' },
                h('span', { className: 'aps-count' }, t('rowCount', { count: group.rows.length })),
                group.rows.length > 1
                  ? h('button', {
                    type: 'button',
                    className: 'aps-btn aps-danger',
                    onClick: () => begin({ type: 'group', rows: group.rows, title: group.title }),
                  }, t('deleteAll'))
                  : null,
              ),
            ),
            h('ul', { className: 'aps-list' }, group.rows.map((row) => h('li', { key: row.id, className: 'aps-row' },
              h('div', { className: 'aps-row-main' },
                h('div', { className: 'aps-row-title', title: row.title }, row.title),
                h('div', { className: 'aps-row-meta' },
                  row.updatedAt !== undefined
                    ? h('span', null, t('updatedAt', { time: new Date(row.updatedAt).toLocaleString() }))
                    : null,
                  h('span', { className: 'aps-row-id' }, `#${row.id.length > 18 ? row.id.slice(-12) : row.id}`),
                ),
              ),
              h('button', {
                type: 'button',
                className: 'aps-btn aps-danger aps-delete',
                'aria-label': t('deleteOne', { title: row.title }),
                onClick: () => begin({ type: 'one', row }),
              }, t('delete')),
            ))),
          )),
        h('dialog', {
          ref: dialogRef,
          className: 'aps-dialog',
          'aria-labelledby': 'aps-dialog-title',
          onCancel: (event) => {
            if (busy) event.preventDefault()
          },
          onClose: () => {
            if (!busy) {
              setTarget(null)
              setError(null)
            }
          },
        },
        h('div', { className: 'aps-dialog-body' },
          h('h3', { id: 'aps-dialog-title' }, target?.type === 'group' ? t('confirmGroupTitle') : t('confirmTitle')),
          h('p', null, target?.type === 'group'
            ? t('confirmGroupBody', { count: targetRows.length })
            : t('confirmBody', { title: target?.row?.title ?? '' })),
          h('p', { className: 'aps-warn' }, t('irreversible')),
          error !== null ? h('p', { className: 'aps-error', role: 'alert' }, errorText(t, error)) : null,
        ),
        h('div', { className: 'aps-dialog-actions' },
          h('button', {
            type: 'button',
            className: 'aps-btn',
            disabled: busy,
            autoFocus: true,
            onClick: () => setTarget(null),
          }, t('cancel')),
          h('button', {
            type: 'button',
            className: 'aps-btn aps-danger',
            disabled: busy,
            onClick: confirmDelete,
          }, busy ? t('deleting', { done: progress.done, total: progress.total }) : t('confirmDelete')),
        )),
      )
    }

    return {
      inject: ['slots', 'locale'],
      apply(ctx) {
        const t = ctx.locale.bind(NS)
        ctx.effect(() => ctx.locale.register(NS, { en: EN, zh: ZH }), 'archived-purge: dictionaries')
        const deleteArchived = async (sessionId, signal) => {
          const response = await fetch(new URL(ENDPOINT, document.baseURI), {
            method: 'POST',
            credentials: 'same-origin',
            headers: { 'content-type': 'application/json' },
            body: JSON.stringify({ sessionId }),
            signal,
          })
          const result = await response.json().catch(() => null)
          if (result?.ok !== true) {
            const failure = new Error(result?.error?.message || `Deletion failed (HTTP ${response.status})`)
            failure.code = result?.error?.code
            throw failure
          }
          return result.value
        }
        ctx.slots.inject('settings.section', () => ctx.slots.register({
          name: 'settings.section',
          id: 'archived-purge',
          order: 25,
          label: () => t('sectionLabel'),
          locale: NS,
          inject: () => ({ deleteArchived, translate: t }),
        }, ArchivedPurgeSection))
      },
    }
  },
})
})()
