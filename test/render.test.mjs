import assert from 'node:assert/strict'
import fs from 'node:fs'

const source = fs.readFileSync(new URL('../client.js', import.meta.url), 'utf8')
let captured
global.window = { __ModuleLoader__: { load(spec) { captured = spec } } }
global.document = { baseURI: 'http://127.0.0.1:3000/' }
await import('data:text/javascript;base64,' + Buffer.from(source).toString('base64'))

const React = {
  createElement(type, props, ...children) {
    return { type, props, children }
  },
  useEffect() {},
  useMemo(fn) {
    return fn()
  },
  useRef(value) {
    return { current: value }
  },
  useState(initial) {
    return [typeof initial === 'function' ? initial() : initial, () => {}]
  },
}

const registered = []
const ctx = {
  effect(fn) {
    return fn()
  },
  locale: {
    bind() {
      return (key, params) => {
        const text = {
          sectionLabel: 'Archived sessions',
          sectionDescription: 'Delete archived sessions.',
          totalArchived: '{count} archived sessions',
          rowCount: '{count} archived',
          updatedAt: 'Updated {time}',
          untitled: 'Untitled',
          blank: 'New session',
          ungrouped: 'Ungrouped',
          noPath: 'No workspace',
          delete: 'Delete',
          deleteAll: 'Delete all',
          deleteOne: 'Delete {title}',
        }[key] ?? key
        return params ? text.replace(/\{(\w+)\}/g, (match, name) => name in params ? String(params[name]) : match) : text
      }
    },
    register() {
      return () => {}
    },
  },
  slots: {
    inject(slot, callback) {
      return callback()
    },
    register(options, component) {
      registered.push({ options, component })
      return () => {}
    },
  },
}

const module = captured.factory(() => React)
module.apply(ctx)
assert.equal(registered.length, 1)

const component = registered[0].component
const t = ctx.locale.bind()
const baseProps = {
  t,
  deleteArchived: async () => ({ warnings: [] }),
  useWorkspaces(selector) {
    return selector({
      items: [{ workspaceId: 'w1', title: 'dsh', path: 'D:\\work\\example', sessionIds: ['s1'] }],
      archivedSessionIds: ['s1'],
    })
  },
  useSessions(selector) {
    return selector({
      ids: ['s1'],
      byId: { s1: { id: 's1', title: 'Old chat', updatedAt: 1700000000000, blank: false } },
    })
  },
}

const tree = component(baseProps)
assert.ok(tree, 'the populated section must render')
assert.ok(JSON.stringify(tree).includes('Old chat'), 'the archived row title must render')

const emptyTree = component({
  ...baseProps,
  useWorkspaces(selector) {
    return selector({ items: [], archivedSessionIds: [] })
  },
  useSessions(selector) {
    return selector({ ids: [], byId: {} })
  },
})
assert.ok(emptyTree, 'the empty section must render')
assert.ok(JSON.stringify(emptyTree).includes('No archived sessions') || JSON.stringify(emptyTree).includes('emptyTitle'))

console.log('archived purge render tests passed')
