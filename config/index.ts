import type { AppInfo } from '@/types/app'

export const APP_ID = `${process.env.NEXT_PUBLIC_APP_KEY}` // kept for legacy API routes
export const API_KEY = `${process.env.NEXT_PUBLIC_APP_KEY}`
export const API_URL = `${process.env.NEXT_PUBLIC_API_URL}`

export const API_PREFIX = '/api'

export const LOCALE_COOKIE_NAME = 'locale'

export const DEFAULT_VALUE_MAX_LEN = 48

/**
 * App type values returned by Dify's /v1/parameters endpoint (inferred) or
 * set explicitly by runtime detection.
 *
 * - completion: single-turn text generation
 * - workflow:   multi-step workflow execution
 * - chat:       multi-turn chat with conversation history
 * - agent:      chat with tool-calling / agent thoughts
 */
export type AppTypeValue = 'completion' | 'workflow' | 'chat' | 'agent'

/** Legacy boolean — kept for cool-text-generation which hasn't been migrated yet */
export const IS_WORKFLOW = false

/** Fallback app info — actual info is fetched at runtime via /v1/meta */
export const APP_INFO: AppInfo = {
  title: 'Text Generator APP',
  description: '',
  copyright: '',
  privacy_policy: '',
  default_language: 'en',
}
