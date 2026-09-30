import test from 'node:test'
import assert from 'node:assert/strict'
import { buildAuthRedirectUrl, implicitAuthCallbackUrl } from './authRedirect.js'

test('builds an exact localhost callback from the current app origin', () => {
  assert.equal(
    buildAuthRedirectUrl('http://localhost:5180'),
    'http://localhost:5180/auth/callback',
  )
})

test('builds an exact production callback from the current app origin', () => {
  assert.equal(
    buildAuthRedirectUrl('https://maisie-six.vercel.app'),
    'https://maisie-six.vercel.app/auth/callback',
  )
})

test('keeps a non-default destination in the callback query', () => {
  assert.equal(
    buildAuthRedirectUrl('https://maisie-six.vercel.app', '/parent?invite=test'),
    'https://maisie-six.vercel.app/auth/callback?next=%2Fparent%3Finvite%3Dtest',
  )
})

test('routes a root implicit session through the auth callback', () => {
  const hash = '#access_token=test-access&refresh_token=test-refresh&type=magiclink'
  assert.equal(
    implicitAuthCallbackUrl({ pathname: '/', search: '', hash }),
    `/auth/callback${hash}`,
  )
})

test('preserves a safe destination query for the callback to validate', () => {
  const hash = '#access_token=test-access&refresh_token=test-refresh'
  assert.equal(
    implicitAuthCallbackUrl({ pathname: '/', search: '?next=%2Fparent', hash }),
    `/auth/callback?next=%2Fparent${hash}`,
  )
})

test('does not rewrite ordinary fragments or an existing callback route', () => {
  assert.equal(implicitAuthCallbackUrl({ pathname: '/', search: '', hash: '#patterns' }), null)
  assert.equal(implicitAuthCallbackUrl({
    pathname: '/auth/callback',
    search: '',
    hash: '#access_token=test-access&refresh_token=test-refresh',
  }), null)
})

test('routes authentication errors to the callback for a useful message', () => {
  const hash = '#error=access_denied&error_code=otp_expired&error_description=Expired'
  assert.equal(
    implicitAuthCallbackUrl({ pathname: '/', search: '', hash }),
    `/auth/callback${hash}`,
  )
})
