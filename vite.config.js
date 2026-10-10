import { createClient } from '@supabase/supabase-js'
import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'

const LOCAL_TEST_LOGIN_PATH = '/__maisie/test-login'
const LOCAL_ORIGINS = new Set(['http://localhost:5180', 'http://127.0.0.1:5180'])

function isLoopback(address = '') {
  return address === '127.0.0.1' || address === '::1' || address === '::ffff:127.0.0.1'
}

function localTestLogin(env) {
  return {
    name: 'maisie-local-test-login',
    apply: 'serve',
    configureServer(server) {
      server.middlewares.use(LOCAL_TEST_LOGIN_PATH, async (req, res) => {
        res.setHeader('Content-Type', 'application/json')
        res.setHeader('Cache-Control', 'no-store')

        const origin = req.headers.origin || ''
        const requestIsLocal = req.method === 'POST' &&
          isLoopback(req.socket.remoteAddress) &&
          LOCAL_ORIGINS.has(origin) &&
          req.headers['x-maisie-local-test'] === '1'

        if (!requestIsLocal) {
          res.statusCode = 403
          res.end(JSON.stringify({ error: 'Local test login is only available on this computer.' }))
          return
        }

        const supabaseUrl = env.VITE_SUPABASE_URL
        const serviceRoleKey = env.SUPABASE_SERVICE_ROLE_KEY
        const testUserId = env.LOCAL_TEST_USER_ID
        if (!supabaseUrl || !serviceRoleKey || !testUserId) {
          res.statusCode = 503
          res.end(JSON.stringify({ error: 'Local test login is not configured.' }))
          return
        }

        try {
          const admin = createClient(supabaseUrl, serviceRoleKey, {
            auth: { autoRefreshToken: false, persistSession: false },
          })
          const { data: userData, error: userError } = await admin.auth.admin.getUserById(testUserId)
          const email = userData?.user?.email
          if (userError || !email) throw userError || new Error('Test user has no email address.')

          const { data, error } = await admin.auth.admin.generateLink({ type: 'magiclink', email })
          if (error || !data?.properties?.hashed_token) throw error || new Error('No test token was returned.')

          res.statusCode = 200
          res.end(JSON.stringify({
            tokenHash: data.properties.hashed_token,
            verificationType: data.properties.verification_type,
          }))
        } catch (error) {
          server.config.logger.error(`Local test login failed: ${error?.message || 'unknown error'}`)
          res.statusCode = 500
          res.end(JSON.stringify({ error: 'The test account could not be opened.' }))
        }
      })
    },
  }
}

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '')
  return {
    plugins: [react(), localTestLogin(env)],
    server: {
      port: 5180,
      strictPort: true,
      host: true,
    },
    preview: {
      port: 4173,
      host: true,
      allowedHosts: true,
    },
  }
})
