'use client'
import React, { useCallback, useEffect, useState } from 'react'
import { fetchAppParams, fetchAppMeta } from '@/service'
import type { AppTypeValue } from '@/config'
import { setLocaleOnClient } from '@/i18n/client'
import type { Locale } from '@/i18n'
import { i18n as i18nConfig } from '@/i18n'
import CoolTextGeneration from './cool-text-generation'
import ChatGeneration from './chat-generation'
import ConversationSidebar from './conversation-sidebar'
import Loading from '@/app/components/base/loading'

/**
 * Root component — detects the app type at runtime by calling the Dify API,
 * then renders the appropriate UI:
 *
 * - completion / workflow → CoolTextGeneration
 * - chat / agent          → ConversationSidebar + ChatGeneration
 *
 * App type is inferred from /v1/parameters:
 *   • has `workflow` key   → 'workflow'
 *   • has `chat_messages`-capable params (speech_to_text / suggested_questions)
 *     but /v1/meta agent_mode hints agent tools → 'agent'
 *   • has speech_to_text or suggested_questions → 'chat'
 *   • otherwise → 'completion'
 *
 * If detection fails we fall back to 'completion' so the app always renders.
 */

function detectAppType(params: any, meta: any): AppTypeValue {
  // Workflow apps have a distinct top-level `workflow` key in their parameters
  if (params && typeof params === 'object' && 'workflow' in params)
    return 'workflow'

  // Chat / Agent apps expose speech_to_text or suggested_questions_after_answer
  const isChatLike
    = params?.speech_to_text !== undefined
    || params?.suggested_questions_after_answer !== undefined
    || params?.text_to_speech !== undefined

  if (!isChatLike)
    return 'completion'

  // Distinguish agent from plain chat: meta.tool_icons is non-empty for agent apps
  const hasTools
    = meta
    && typeof meta === 'object'
    && 'tool_icons' in meta
    && Object.keys(meta.tool_icons || {}).length > 0

  return hasTools ? 'agent' : 'chat'
}

/** Map Dify locale names to supported i18n locales */
function difyLocaleToAppLocale(difyLocale: string): Locale | null {
  const lower = difyLocale.toLowerCase()
  if (lower === 'zh-hans' || lower === 'zh_hans' || lower.startsWith('zh'))
    return 'zh-Hans'
  if (lower.startsWith('en'))
    return 'en'
  return null
}

const THEMES = ['', 'dark', 'cool', 'minimal'] as const
type Theme = typeof THEMES[number]

const AppEntry: React.FC = () => {
  const [appType, setAppType] = useState<AppTypeValue | null>(null)
  const [appParams, setAppParams] = useState<any>(null)
  const [activeConversationId, setActiveConversationId] = useState<string | null>(null)
  const [sidebarRefreshSignal, setSidebarRefreshSignal] = useState(0)
  const [theme, setTheme] = useState<Theme>('')

  const triggerSidebarRefresh = useCallback(() => {
    setSidebarRefreshSignal(prev => prev + 1)
  }, [])

  // Apply theme to <html> element
  useEffect(() => {
    document.documentElement.dataset.theme = theme
  }, [theme])

  const cycleTheme = useCallback(() => {
    setTheme(prev => {
      const idx = THEMES.indexOf(prev)
      return THEMES[(idx + 1) % THEMES.length]
    })
  }, [])

  // Detect app type once on mount; also read default_language for locale
  useEffect(() => {
    let cancelled = false
    Promise.all([
      fetchAppParams().catch(() => null),
      fetchAppMeta().catch(() => null),
    ]).then(([params, meta]) => {
      if (cancelled) return

      setAppType(detectAppType(params, meta))
      setAppParams(params)

      // Auto-switch locale from Dify's default_language field
      const difyLang = (params as any)?.default_language
      if (difyLang) {
        const locale = difyLocaleToAppLocale(difyLang)
        if (locale && locale !== i18nConfig.defaultLocale)
          setLocaleOnClient(locale, /* notReload */ true)
      }
    })
    return () => { cancelled = true }
  }, [])

  // Theme label displayed on toggle button
  const themeLabel = theme === '' ? '☀️ Warm' : theme === 'dark' ? '🌙 Dark' : theme === 'cool' ? '🔵 Cool' : '⬜ Minimal'

  // Show a minimal spinner while detecting
  if (appType === null) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%', width: '100%' }}>
        <Loading type="area" />
      </div>
    )
  }

  if (appType === 'completion' || appType === 'workflow')
    return (
      <>
        <CoolTextGeneration />
        <button className="themeToggle" onClick={cycleTheme}>{themeLabel}</button>
      </>
    )

  return (
    <div style={{ display: 'flex', height: '100%', width: '100%', overflow: 'hidden' }}>
      <ConversationSidebar
        activeConversationId={activeConversationId}
        onSelectConversation={setActiveConversationId}
        refreshSignal={sidebarRefreshSignal}
        appType={appType}
      />
      <div style={{ flex: 1, overflow: 'hidden' }}>
        <ChatGeneration
          conversationId={activeConversationId}
          appType={appType}
          appParams={appParams}
          onConversationCreated={(id) => {
            setActiveConversationId(id)
            triggerSidebarRefresh()
          }}
          onMessagesChange={triggerSidebarRefresh}
        />
      </div>
      <button className="themeToggle" onClick={cycleTheme}>{themeLabel}</button>
    </div>
  )
}

export default AppEntry

