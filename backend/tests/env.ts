// Loads the local test environment BEFORE any app module (and its dotenv config)
// is imported, so tests never connect to the production database configured in
// .env / .env.local. Runs via jest `setupFiles`.
import { config as loadEnv } from 'dotenv'
import path from 'path'

loadEnv({ path: path.resolve(__dirname, '..', '.env.test') })
