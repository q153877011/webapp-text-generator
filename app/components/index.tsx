'use client'
import React, { useCallback, useState } from 'react'
import { IS_CHAT_APP } from '@/config'
import CoolTextGeneration from './cool-text-generation'
import ChatGeneration from './chat-generation'
import ConversationSidebar from './conversation-sidebar'

/**
 * Root component — renders the appropriate UI based on NEXT_PUBLIC_APP_TYPE.
 *
 * - completion / workflow → CoolTextGeneration (existing UI)
 * - chat / agent          → ConversationSidebar + ChatGeneration
 */
const AppEntry: React.FC = () => {
  const [activeConversationId, setActiveConversationId] = useState<string | null>(null)
  // Increment to signal sidebar to reload its list
  const [sidebarRefreshSignal, setSidebarRefreshSignal] = useState(0)

  const triggerSidebarRefresh = useCallback(() => {
    setSidebarRefreshSignal(prev => prev + 1)
  }, [])

  if (!IS_CHAT_APP)
    return <CoolTextGeneration />

  return (
    <div style={{ display: 'flex', height: '100%', width: '100%', overflow: 'hidden' }}>
      <ConversationSidebar
        activeConversationId={activeConversationId}
        onSelectConversation={setActiveConversationId}
        refreshSignal={sidebarRefreshSignal}
      />
      <div style={{ flex: 1, overflow: 'hidden' }}>
        <ChatGeneration
          conversationId={activeConversationId}
          onConversationCreated={(id) => {
            setActiveConversationId(id)
            triggerSidebarRefresh()
          }}
          onMessagesChange={triggerSidebarRefresh}
        />
      </div>
    </div>
  )
}

export default AppEntry
