import type { AppInfo } from '@/types/app'
export const APP_ID = `${process.env.NEXT_PUBLIC_APP_ID}`
export const API_KEY = `${process.env.NEXT_PUBLIC_APP_KEY}`
export const API_URL = `${process.env.NEXT_PUBLIC_API_URL}`

// Legacy boolean flag — still honoured for backward compatibility
export const IS_WORKFLOW = `${process.env.NEXT_PUBLIC_APP_TYPE_WORKFLOW}` === 'true'

// New explicit app-type enum: completion | workflow | chat | agent
// Falls back to the legacy flag so existing .env files keep working.
const _rawType = process.env.NEXT_PUBLIC_APP_TYPE
export type AppTypeValue = 'completion' | 'workflow' | 'chat' | 'agent'
export const APP_TYPE: AppTypeValue = (_rawType as AppTypeValue) ||
  (IS_WORKFLOW ? 'workflow' : 'completion')

export const IS_CHAT_APP = APP_TYPE === 'chat' || APP_TYPE === 'agent'
export const APP_INFO: AppInfo = {
  title: 'Text Generator APP',
  description: 'App description',
  copyright: '',
  privacy_policy: '',
  default_language: 'en',
}

export const API_PREFIX = '/api'

export const LOCALE_COOKIE_NAME = 'locale'

export const DEFAULT_VALUE_MAX_LEN = 48
