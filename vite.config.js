import { createClient } from '@supabase/supabase-js'
import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'
import { localTestProfile } from './src/config/localTestProfiles.js'

const LOCAL_TEST_LOGIN_PATH = '/__maisie/test-login'
const LOCAL_ORIGINS = new Set(['http://localhost:5180', 'http://127.0.0.1:5180'])

function isLoopback(address = '') {
  return address === '127.0.0.1' || address === '::1' || address === '::ffff:127.0.0.1'
}

async function findOrCreateTestUser(admin, configuredUserId, email) {
  if (configuredUserId) {
    const { data } = await admin.auth.admin.getUserById(configuredUserId)
    if (data?.user) return data.user
  }

  const { data: usersData, error: usersError } = await admin.auth.admin.listUsers({ page: 1, perPage: 1000 })
  if (usersError) throw usersError
  const existing = usersData.users.find((user) => user.email?.toLowerCase() === email)
  if (existing) return existing

  const { data, error } = await admin.auth.admin.createUser({
    email,
    email_confirm: true,
    user_metadata: { local_test_account: true },
  })
  if (error || !data.user) throw error || new Error('The local test user could not be created.')
  return data.user
}

async function seedTestAccount(admin, user, testProfile) {
  const birthYear = new Date().getFullYear() - 16
  const profileResult = await admin.from('profiles').upsert({
    user_id: user.id,
    name: testProfile.name,
    email: user.email,
    age_band: '16',
    birth_month: 1,
    birth_year: birthYear,
    is_minor: true,
    privacy_ack_at: new Date().toISOString(),
  }, { onConflict: 'user_id' })
  if (profileResult.error) throw profileResult.error
}

function dateKeyDaysAgo(daysAgo, today = new Date()) {
  const date = new Date(today)
  date.setHours(12, 0, 0, 0)
  date.setDate(date.getDate() - daysAgo)
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

function buildSampleTrackerChanges(today = new Date()) {
  const dailyLogs = {}
  const periodLogs = {}
  const cycleStarts = [87, 59, 31, 3]
  const moods = [
    { mood: 'Okay', vibe: 3, vibeLabel: 'okay' },
    { mood: 'Good', vibe: 4, vibeLabel: 'good' },
    { mood: 'Great', vibe: 5, vibeLabel: 'great' },
    { mood: 'Good', vibe: 4, vibeLabel: 'good' },
  ]

  cycleStarts.forEach((startDaysAgo, cycleIndex) => {
    for (let periodDay = 0; periodDay < 5; periodDay += 1) {
      const daysAgo = startDaysAgo - periodDay
      if (daysAgo < 0) continue
      periodLogs[dateKeyDaysAgo(daysAgo, today)] = {
        period: true,
        periodStart: periodDay === 0,
        periodPromptAnswered: true,
        source: 'test-seed',
        status: 'confirmed',
      }
    }

    const observations = [
      { offset: 0, pain: 4, symptoms: ['Cramps', 'Fatigue'], impact: cycleIndex === 1 ? ['school'] : [] },
      { offset: 1, pain: 3, symptoms: ['Cramps', 'Bloating'], impact: [] },
      { offset: 3, pain: 1, symptoms: cycleIndex % 2 === 0 ? ['Fatigue'] : [], impact: [] },
      { offset: 8, pain: 0, symptoms: [], impact: [] },
      { offset: 14, pain: 1, symptoms: cycleIndex % 2 === 0 ? ['Skin breakout'] : ['Headache'], impact: [] },
      { offset: 21, pain: 0, symptoms: cycleIndex % 2 === 0 ? ['Mood changes'] : ['Sleep trouble'], impact: [] },
    ]

    observations.forEach(({ offset, pain, symptoms, impact }, observationIndex) => {
      const daysAgo = startDaysAgo - offset
      if (daysAgo < 0) return
      const mood = moods[(cycleIndex + observationIndex) % moods.length]
      dailyLogs[dateKeyDaysAgo(daysAgo, today)] = {
        checkinCompleted: true,
        ...mood,
        pain,
        symptoms,
        impact,
      }
    })
  })

  return {
    dailyLogs,
    periodLogs,
    answers: {
      age: '16',
      started: 'Yes',
      flow: 'Moderate',
      changes: '3',
      clots: 'Small clots',
      painWorst: 5,
      painTrend: 'Same',
      missedDays: '0',
      relievers: 'Somewhat',
      bathroomPain: 'Sometimes',
      nausea: 'Sometimes',
      acne: 'Mild',
      birthControl: 'No',
      lifestyle: 'Neither',
    },
  }
}

function buildFlaggedHeavyFlowTrackerChanges(today = new Date()) {
  const sample = buildSampleTrackerChanges(today)
  const dailyLogs = { ...sample.dailyLogs }
  const periodLogs = {}
  const cycleStarts = [87, 59, 31, 3]

  cycleStarts.forEach((startDaysAgo, cycleIndex) => {
    for (let periodDay = 0; periodDay < 7; periodDay += 1) {
      const daysAgo = startDaysAgo - periodDay
      if (daysAgo < 0) continue
      const key = dateKeyDaysAgo(daysAgo, today)
      const harderDay = periodDay <= 1
      periodLogs[key] = {
        period: true,
        periodStart: periodDay === 0,
        periodPromptAnswered: true,
        flow: harderDay ? 'heavy' : 'medium',
        source: 'test-seed',
        status: 'confirmed',
      }
      dailyLogs[key] = {
        checkinCompleted: true,
        mood: harderDay ? 'Low' : 'Okay',
        vibe: harderDay ? 2 : 3,
        vibeLabel: harderDay ? 'low' : 'okay',
        pain: harderDay ? 5 : 3,
        energy: harderDay ? 2 : 3,
        symptoms: harderDay ? ['Cramps', 'Fatigue', 'Dizziness'] : ['Fatigue'],
        impact: harderDay && cycleIndex < 3 ? ['school'] : [],
        bleeding: {
          clots: 'Small',
          flooding: harderDay,
          productFullness: { light: 0, moderate: harderDay ? 1 : 2, full: harderDay ? 4 : 1 },
        },
      }
    }
  })

  return {
    dailyLogs,
    periodLogs,
    answers: {
      ...sample.answers,
      flow: 'Heavy',
      changes: 'More than 6',
      clots: 'Small clots',
      painWorst: 5,
      missedDays: '1',
      relievers: 'Somewhat',
    },
  }
}

function trackerChangesForProfile(profileId) {
  return profileId === 'flagged-heavy-flow'
    ? buildFlaggedHeavyFlowTrackerChanges()
    : buildSampleTrackerChanges()
}

async function onlyMissingSampleData(client, userId, sample) {
  const [dailyResult, periodResult, answerResult] = await Promise.all([
    client.from('daily_logs').select('log_date').eq('user_id', userId),
    client.from('period_days').select('log_date').eq('user_id', userId),
    client.from('questionnaire_answers').select('question_key').eq('user_id', userId),
  ])
  const error = dailyResult.error || periodResult.error || answerResult.error
  if (error) throw error

  const existingDaily = new Set((dailyResult.data || []).map((row) => row.log_date))
  const existingPeriods = new Set((periodResult.data || []).map((row) => row.log_date))
  const existingAnswers = new Set((answerResult.data || []).map((row) => row.question_key))
  const missingEntries = (entries, existing) => Object.fromEntries(
    Object.entries(entries).filter(([key]) => !existing.has(key)),
  )

  return {
    dailyLogs: missingEntries(sample.dailyLogs, existingDaily),
    periodLogs: missingEntries(sample.periodLogs, existingPeriods),
    answers: missingEntries(sample.answers, existingAnswers),
  }
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
        const anonKey = env.VITE_SUPABASE_ANON_KEY
        const serviceRoleKey = env.SUPABASE_SERVICE_ROLE_KEY
        const testUserId = env.LOCAL_TEST_USER_ID
        if (!supabaseUrl || !anonKey || !serviceRoleKey) {
          res.statusCode = 503
          res.end(JSON.stringify({ error: 'Local test login is not configured.' }))
          return
        }

        try {
          const requestUrl = new URL(req.url || '/', 'http://localhost')
          const requestedProfile = requestUrl.searchParams.get('profile') || 'typical'
          const testProfile = localTestProfile(requestedProfile)
          const admin = createClient(supabaseUrl, serviceRoleKey, {
            auth: { autoRefreshToken: false, persistSession: false },
          })
          const configuredEmail = testProfile.id === 'typical'
            ? (env.LOCAL_TEST_USER_EMAIL || testProfile.defaultEmail)
            : testProfile.defaultEmail
          const configuredId = testProfile.id === 'typical' ? testUserId : null
          const user = await findOrCreateTestUser(admin, configuredId, configuredEmail.trim().toLowerCase())
          await seedTestAccount(admin, user, testProfile)

          const { data, error } = await admin.auth.admin.generateLink({ type: 'magiclink', email: user.email })
          if (error || !data?.properties?.hashed_token) throw error || new Error('No test token was returned.')

          const localClient = createClient(supabaseUrl, anonKey, {
            auth: { autoRefreshToken: false, persistSession: false },
          })
          const { data: sessionData, error: sessionError } = await localClient.auth.verifyOtp({
            token_hash: data.properties.hashed_token,
            type: data.properties.verification_type,
          })
          if (sessionError || !sessionData.session) throw sessionError || new Error('No test session was returned.')

          const sampleChanges = await onlyMissingSampleData(localClient, user.id, trackerChangesForProfile(testProfile.id))

          const { error: settingsError } = await localClient.rpc('save_tracker_changes', {
            changes: {
              ...sampleChanges,
              settings: {
                onboarded: true,
                profile: {
                  studentAthlete: null,
                  sleep: null,
                  sport: '',
                  onBirthControl: false,
                  trackingModules: {
                    core: true,
                    symptoms: true,
                    sleep: true,
                    skinHair: true,
                    food: false,
                    movement: true,
                    painRelief: true,
                    bleedingDetail: true,
                    moodPms: false,
                    labs: false,
                  },
                },
                preferences: { periodCheckin: true, phaseTips: true },
              },
            },
            expected_user_id: user.id,
          })
          if (settingsError) throw settingsError

          res.statusCode = 200
          res.end(JSON.stringify({
            accessToken: sessionData.session.access_token,
            refreshToken: sessionData.session.refresh_token,
            profileId: testProfile.id,
          }))
        } catch (error) {
          server.config.logger.error(`Local test login failed: ${error?.message || 'unknown error'}`)
          res.statusCode = 500
          res.end(JSON.stringify({
            error: 'The test account could not be opened.',
            detail: error?.message || 'Unknown local test error.',
          }))
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
