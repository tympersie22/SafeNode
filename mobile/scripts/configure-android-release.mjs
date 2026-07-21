import { readFileSync, writeFileSync } from 'node:fs'
import { resolve } from 'node:path'

const required = [
  'ANDROID_KEYSTORE_PATH',
  'ANDROID_KEYSTORE_PASSWORD',
  'ANDROID_KEY_ALIAS',
  'ANDROID_KEY_PASSWORD',
  'ANDROID_VERSION_CODE',
  'ANDROID_VERSION_NAME',
]

for (const key of required) {
  if (!process.env[key]) throw new Error(`${key} is required for a signed Android release.`)
}

const versionCode = Number(process.env.ANDROID_VERSION_CODE)
if (!Number.isSafeInteger(versionCode) || versionCode < 1) {
  throw new Error('ANDROID_VERSION_CODE must be a positive integer.')
}

const gradlePath = resolve('android/app/build.gradle')
let gradle = readFileSync(gradlePath, 'utf8')

const releaseConfig = `
        release {
            storeFile file(System.getenv('ANDROID_KEYSTORE_PATH'))
            storePassword System.getenv('ANDROID_KEYSTORE_PASSWORD')
            keyAlias System.getenv('ANDROID_KEY_ALIAS')
            keyPassword System.getenv('ANDROID_KEY_PASSWORD')
        }
`

gradle = gradle.replace(
  /(signingConfigs \{\s*debug \{[\s\S]*?\n\s*}\s*)(\n\s*})/,
  `$1${releaseConfig}$2`,
)
gradle = gradle.replace(/versionCode \d+/, `versionCode ${versionCode}`)
gradle = gradle.replace(/versionName "[^"]+"/, `versionName "${process.env.ANDROID_VERSION_NAME.replace(/^v/, '')}"`)
gradle = gradle.replace(
  /(buildTypes \{[\s\S]*?release \{[\s\S]*?)signingConfig signingConfigs\.debug/,
  '$1signingConfig signingConfigs.release',
)

if (!gradle.includes('signingConfig signingConfigs.release')) {
  throw new Error('Could not configure the generated Android release signing block.')
}

writeFileSync(gradlePath, gradle)
