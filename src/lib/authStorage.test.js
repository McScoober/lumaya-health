import test from 'node:test'
import assert from 'node:assert/strict'
import { authSessionStorageKey, migrateAuthSessionStorage } from './authStorage.js'

function memoryStorage(values = {}) {
  const entries = new Map(Object.entries(values))
  return {
    getItem: (key) => entries.get(key) ?? null,
    setItem: (key, value) => entries.set(key, value),
    removeItem: (key) => entries.delete(key),
  }
}

test('builds the Supabase auth storage key for the configured project', () => {
  assert.equal(authSessionStorageKey('https://example-ref.supabase.co'), 'sb-example-ref-auth-token')
  assert.equal(authSessionStorageKey('not a url'), null)
})

test('moves a tab-only session into shared browser storage once', () => {
  const key = 'sb-example-ref-auth-token'
  const session = JSON.stringify({ access_token: 'test-token' })
  const from = memoryStorage({ [key]: session })
  const to = memoryStorage()

  assert.equal(migrateAuthSessionStorage(from, to, key), true)
  assert.equal(to.getItem(key), session)
  assert.equal(from.getItem(key), null)
})

test('does not overwrite an existing shared session', () => {
  const key = 'sb-example-ref-auth-token'
  const from = memoryStorage({ [key]: 'older-tab-session' })
  const to = memoryStorage({ [key]: 'shared-session' })

  assert.equal(migrateAuthSessionStorage(from, to, key), false)
  assert.equal(to.getItem(key), 'shared-session')
  assert.equal(from.getItem(key), null)
})
