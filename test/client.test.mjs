import assert from 'node:assert/strict'

global.document = { baseURI: 'http://127.0.0.1:3000/' }
let captured
global.window = {
  __ModuleLoader__: {
    load(spec) {
      captured = spec
    },
  },
}

await import('../client.js')
assert.equal(captured.id, 'dsh-archived-purge')

const React = {
  createElement() {},
  useEffect() {},
  useMemo() {},
  useRef() {},
  useState() {},
}
const module = captured.factory((name) => {
  assert.equal(name, 'react')
  return React
})

const registered = []
const translations = {
  sectionLabel: 'Archived sessions',
}
const ctx = {
  effect(fn) {
    return fn()
  },
  locale: {
    bind() {
      return (key) => translations[key] ?? key
    },
    register(ns, dictionaries) {
      assert.equal(ns, 'archived-purge')
      assert.equal(typeof dictionaries.en, 'object')
      assert.equal(typeof dictionaries.zh, 'object')
      return () => {}
    },
  },
  slots: {
    inject(slot, callback) {
      assert.equal(slot, 'settings.section')
      return callback()
    },
    register(options, component) {
      registered.push({ options, component })
      return () => {}
    },
  },
}

module.apply(ctx)
assert.equal(registered.length, 1)
const { options } = registered[0]
assert.equal(options.name, 'settings.section')
assert.equal(options.id, 'archived-purge')
assert.equal(options.order, 25)
assert.equal(options.locale, 'archived-purge')
assert.equal(options.label(), 'Archived sessions')
const injected = options.inject()
assert.equal(typeof injected.deleteArchived, 'function')

let request
global.fetch = async (url, init) => {
  request = { url: String(url), init }
  return { ok: true, status: 200, json: async () => ({ ok: true, value: { warnings: [] } }) }
}
const value = await injected.deleteArchived('session-test', new AbortController().signal)
assert.equal(request.url, 'http://127.0.0.1:3000/archived-session-purge/delete')
assert.equal(request.init.method, 'POST')
assert.equal(request.init.body, JSON.stringify({ sessionId: 'session-test' }))
assert.deepEqual(value, { warnings: [] })

global.fetch = async () => ({
  ok: false,
  status: 409,
  json: async () => ({ ok: false, error: { code: 'not-archived', message: 'gone' } }),
})
await assert.rejects(
  injected.deleteArchived('session-test', new AbortController().signal),
  (error) => error.code === 'not-archived',
)

console.log('archived purge client tests passed')
