import type { AppTypeValue } from '@/config'
import { fetchAppParams, fetchAppMeta } from '@/service'

const VALID_TYPES: AppTypeValue[] = ['chat', 'agent', 'workflow', 'completion']

/**
 * Infer app type from Dify API responses.
 *
 * Priority rules:
 * 1. Workflow apps expose a `workflow` key in /v1/parameters.
 * 2. Chat-like apps expose `speech_to_text`, `text_to_speech`, or
 *    `suggested_questions_after_answer`.  Among those, agent apps have
 *    non-empty `tool_icons` in /v1/meta.
 * 3. Anything else is treated as a completion app.
 */
export function detectAppType(params: any, meta: any): AppTypeValue {
  // Workflow apps have a distinct top-level `workflow` key
  if (params && typeof params === 'object' && 'workflow' in params)
    return 'workflow'

  // Chat / Agent apps expose one or more of these fields
  const isChatLike
    = params?.speech_to_text !== undefined
    || params?.suggested_questions_after_answer !== undefined
    || params?.text_to_speech !== undefined

  if (!isChatLike)
    return 'completion'

  // Distinguish agent from plain chat by non-empty tool_icons in meta
  const hasTools
    = meta
    && typeof meta === 'object'
    && 'tool_icons' in meta
    && Object.keys(meta.tool_icons || {}).length > 0

  return hasTools ? 'agent' : 'chat'
}

export interface ResolvedApp {
  /** The determined app type. */
  appType: AppTypeValue
  /** Raw response from /v1/parameters (null if the request failed). */
  appParams: any
  /** Raw response from /v1/meta (null if the request failed). */
  appMeta: any
  /**
   * `true` when the type came from the NEXT_PUBLIC_APP_TYPE env var,
   * `false` when it was inferred by detectAppType().
   */
  fromEnv: boolean
}

/**
 * Resolve the app type, using a two-tier strategy:
 *
 * 1. **Fast path** – if `NEXT_PUBLIC_APP_TYPE` is set to a valid value
 *    (`chat | agent | workflow | completion`), use it directly and skip
 *    the detectAppType() inference step.  The /parameters and /meta
 *    requests are still issued in parallel because the rest of the UI
 *    depends on their payloads (input form, feature flags, app title…).
 *
 * 2. **Dynamic path** – if the env var is absent or invalid, fetch both
 *    endpoints and pass the results through detectAppType().
 *
 * Both paths always resolve; individual request failures are swallowed
 * and surfaced as `null` in the returned payloads.
 */
export async function resolveAppType(): Promise<ResolvedApp> {
  // Always fetch both endpoints — the UI needs them regardless of how the
  // type is determined.
  const [params, meta] = await Promise.all([
    fetchAppParams().catch(() => null),
    fetchAppMeta().catch(() => null),
  ])

  const envRaw = process.env.NEXT_PUBLIC_APP_TYPE
  const envType = envRaw && VALID_TYPES.includes(envRaw as AppTypeValue)
    ? (envRaw as AppTypeValue)
    : null

  return {
    appType: envType ?? detectAppType(params, meta),
    appParams: params,
    appMeta: meta,
    fromEnv: envType !== null,
  }
}
