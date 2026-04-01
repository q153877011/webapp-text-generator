'use client'
import React, { useCallback, useEffect, useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'
import cn from 'classnames'
import { useBoolean } from 'ahooks'
import {
  PaperAirplaneIcon,
  StopIcon,
  ChatBubbleOvalLeftEllipsisIcon,
  SparklesIcon,
} from '@heroicons/react/24/solid'
import ReactMarkdown from 'react-markdown'
import Toast from '@/app/components/base/toast'
import {
  sendChatMessage,
  stopChatMessage,
  fetchSuggestedQuestions,
} from '@/service'
import type { ChatMessage, AgentThought } from '@/types/app'
import { MessageRole } from '@/types/app'
import { APP_TYPE } from '@/config'
import s from './chat-styles.module.css'

// ─── Types ────────────────────────────────────────────────────────────────────

type Props = {
  /** Active conversation ID (managed by parent / ConversationSidebar) */
  conversationId: string | null
  /** Called when the first assistant reply arrives with the new conversation ID */
  onConversationCreated?: (id: string) => void
  /** Called whenever messages change (e.g. to refresh sidebar) */
  onMessagesChange?: () => void
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

const formatTime = (ts: number) =>
  new Date(ts * 1000).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })

// ─── Component ────────────────────────────────────────────────────────────────

const ChatGeneration: React.FC<Props> = ({
  conversationId,
  onConversationCreated,
  onMessagesChange,
}) => {
  const { t } = useTranslation()
  const isAgentApp = APP_TYPE === 'agent'

  // Messages state
  const [messages, setMessages] = useState<ChatMessage[]>([])
  const [inputValue, setInputValue] = useState('')
  const [isResponding, { setTrue: startResponding, setFalse: stopResponding }] = useBoolean(false)
  const [suggestedQuestions, setSuggestedQuestions] = useState<string[]>([])
  const [currentTaskId, setCurrentTaskId] = useState<string | null>(null)
  // Suggested questions toggle: user must opt-in; validated via a pre-flight request
  const [suggestEnabled, setSuggestEnabled] = useState(false)
  const [suggestChecking, setSuggestChecking] = useState(false)

  // Refs
  const abortControllerRef = useRef<AbortController>(new AbortController())
  const messageListRef = useRef<HTMLDivElement>(null)
  const textareaRef = useRef<HTMLTextAreaElement>(null)
  // Track message count so scroll effect only fires on new messages, not content chunks
  const messageCountRef = useRef(0)

  // ── Scroll to bottom ───────────────────────────────────────────────────────
  const scrollToBottom = useCallback(() => {
    requestAnimationFrame(() => {
      if (messageListRef.current)
        messageListRef.current.scrollTop = messageListRef.current.scrollHeight
    })
  }, [])

  // Only scroll when a new message is appended (count changes), not on every chunk update
  useEffect(() => {
    if (messages.length !== messageCountRef.current) {
      messageCountRef.current = messages.length
      scrollToBottom()
    }
  }, [messages.length, scrollToBottom])

  // ── Reset when switching conversation ─────────────────────────────────────
  useEffect(() => {
    // Abort any in-flight request from the previous conversation
    abortControllerRef.current.abort()

    setMessages([])
    setSuggestedQuestions([])
    setCurrentTaskId(null)
    stopResponding()
    messageCountRef.current = 0
  }, [conversationId])

  // ── Toggle suggested questions (with pre-flight validation) ───────────────
  const handleSuggestToggle = useCallback(async () => {
    if (suggestEnabled) {
      // Turning off — no network call needed
      setSuggestEnabled(false)
      setSuggestedQuestions([])
      return
    }

    // Turning on — send a pre-flight request using the last message in the current conversation
    const lastAssistantMsg = [...messages].reverse().find(m => m.role === MessageRole.Assistant && m.id && !m.id.startsWith('assistant-'))
    if (!lastAssistantMsg) {
      // No real message ID yet; just enable optimistically — will validate on next real reply
      setSuggestEnabled(true)
      return
    }

    setSuggestChecking(true)
    try {
      const res: any = await fetchSuggestedQuestions(lastAssistantMsg.id)
      if (res?.data && Array.isArray(res.data)) {
        setSuggestEnabled(true)
        setSuggestedQuestions(res.data)
      }
      else {
        setSuggestEnabled(true)
      }
    }
    catch (err: any) {
      const msg = err?.message || 'Failed to enable suggested questions'
      Toast.notify({ type: 'error', message: msg })
      // Do not enable — stay off
    }
    finally {
      setSuggestChecking(false)
    }
  }, [suggestEnabled, messages])

  // ── Auto-resize textarea ───────────────────────────────────────────────────
  const handleTextareaChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setInputValue(e.target.value)
    const ta = e.target
    ta.style.height = 'auto'
    ta.style.height = `${Math.min(ta.scrollHeight, 120)}px`
  }

  // ── Send message ───────────────────────────────────────────────────────────
  const handleSend = useCallback(async () => {
    const query = inputValue.trim()
    if (!query || isResponding) return

    setSuggestedQuestions([])

    // Append user message immediately
    const userMsg: ChatMessage = {
      id: `user-${Date.now()}`,
      conversation_id: conversationId || '',
      role: MessageRole.User,
      content: query,
      created_at: Math.floor(Date.now() / 1000),
    }
    setMessages(prev => [...prev, userMsg])
    setInputValue('')
    if (textareaRef.current)
      textareaRef.current.style.height = 'auto'

    // Placeholder assistant message (streaming)
    const assistantMsgId = `assistant-${Date.now()}`
    const assistantMsg: ChatMessage = {
      id: assistantMsgId,
      conversation_id: conversationId || '',
      role: MessageRole.Assistant,
      content: '',
      isStreaming: true,
      created_at: Math.floor(Date.now() / 1000),
    }
    setMessages(prev => [...prev, assistantMsg])
    startResponding()

    abortControllerRef.current = new AbortController()

    sendChatMessage(
      {
        query,
        inputs: {},
        conversation_id: conversationId || undefined,
      },
      {
        onData: (chunk, _isFirst, { messageId, conversationId: cid }) => {
          setMessages(prev =>
            prev.map(m =>
              m.id === assistantMsgId
                ? { ...m, id: messageId || m.id, content: m.content + chunk, conversation_id: cid || m.conversation_id }
                : m,
            ),
          )
          scrollToBottom()
          if (cid && !conversationId && onConversationCreated)
            onConversationCreated(cid)
        },
        onAgentMessage: (chunk, _isFirst, { messageId, conversationId: cid }) => {
          setMessages(prev =>
            prev.map(m =>
              m.id === assistantMsgId
                ? { ...m, id: messageId || m.id, content: m.content + chunk, conversation_id: cid || m.conversation_id }
                : m,
            ),
          )
          scrollToBottom()
          if (cid && !conversationId && onConversationCreated)
            onConversationCreated(cid)
        },
        onAgentThought: (thought: AgentThought) => {
          setMessages(prev =>
            prev.map(m =>
              m.id === assistantMsgId
                ? { ...m, agent_thoughts: [...(m.agent_thoughts || []), thought] }
                : m,
            ),
          )
        },
        onMessageEnd: (messageId, cid) => {
          setMessages(prev =>
            prev.map(m =>
              m.id === assistantMsgId
                ? { ...m, id: messageId, isStreaming: false, conversation_id: cid }
                : m,
            ),
          )
          stopResponding()
          onMessagesChange?.()
          // Only fetch suggested questions if the feature is enabled
          if (suggestEnabled && messageId) {
            fetchSuggestedQuestions(messageId)
              .then((res: any) => {
                if (res?.data && Array.isArray(res.data))
                  setSuggestedQuestions(res.data)
              })
              .catch(() => {})
          }
        },
        onCompleted: () => {
          // Fallback: ensures streaming stops if message_end wasn't received
          setMessages(prev =>
            prev.map(m =>
              m.id === assistantMsgId ? { ...m, isStreaming: false } : m,
            ),
          )
          stopResponding()
        },
        onError: (msg) => {
          Toast.notify({ type: 'error', message: msg })
          setMessages(prev =>
            prev.map(m =>
              m.id === assistantMsgId
                ? { ...m, content: msg || 'Something went wrong.', isStreaming: false }
                : m,
            ),
          )
          stopResponding()
        },
        onTaskId: (taskId) => {
          setCurrentTaskId(taskId)
        },
        abortController: abortControllerRef.current,
      },
    )
  }, [inputValue, isResponding, conversationId, suggestEnabled, onConversationCreated, onMessagesChange, startResponding, stopResponding, scrollToBottom])

  // ── Stop generation ────────────────────────────────────────────────────────
  const handleStop = useCallback(async () => {
    abortControllerRef.current.abort()
    if (currentTaskId) {
      try { await stopChatMessage(currentTaskId) } catch (_) {}
    }
    setMessages(prev => prev.map(m => m.isStreaming ? { ...m, isStreaming: false } : m))
    stopResponding()
  }, [currentTaskId, stopResponding])

  // ── Keyboard: Enter to send, Shift+Enter for newline ──────────────────────
  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSend()
    }
  }

  // ── Render ─────────────────────────────────────────────────────────────────
  return (
    <div className={cn(s.chatContainer, 'flex flex-col h-full')}>

      {/* Message list */}
      <div ref={messageListRef} className={cn(s.messageList, 'grow')}>
        {messages.length === 0 && (
          <div className={s.emptyState}>
            <ChatBubbleOvalLeftEllipsisIcon className={s.emptyStateIcon} />
            <div className={s.emptyStateTitle}>Start a conversation</div>
            <div className={s.emptyStateDesc}>
              Ask anything — your assistant is ready to help.
            </div>
          </div>
        )}

        {messages.map(msg => (
          <div
            key={msg.id}
            className={cn(
              s.messageRow,
              msg.role === MessageRole.User ? s.messageRowUser : s.messageRowAssistant,
            )}
          >
            {/* Avatar */}
            <div className={cn(s.avatar, msg.role === MessageRole.User ? s.avatarUser : s.avatarAssistant)}>
              {msg.role === MessageRole.User ? 'U' : 'AI'}
            </div>

            {/* Bubble content */}
            <div>
              {/* Agent thoughts */}
              {isAgentApp && msg.agent_thoughts && msg.agent_thoughts.length > 0 && (
                <div className="mb-2 space-y-1">
                  {msg.agent_thoughts.map(thought => (
                    <div key={thought.id} className={s.agentThought}>
                      <div className={s.agentThoughtLabel}>Thinking</div>
                      <div>{thought.thought}</div>
                      {thought.tool && (
                        <div className="mt-1 text-xs">
                          🔧 <strong>{thought.tool}</strong>
                          {thought.tool_input && ` — ${thought.tool_input}`}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}

              {/* Main bubble */}
              <div
                className={cn(
                  s.bubble,
                  msg.role === MessageRole.User ? s.bubbleUser : s.bubbleAssistant,
                  msg.isStreaming && s.cursor,
                )}
              >
                {msg.role === MessageRole.Assistant
                  ? (
                    <ReactMarkdown className="prose prose-sm max-w-none break-words">
                      {msg.content || (msg.isStreaming ? ' ' : '')}
                    </ReactMarkdown>
                    )
                  : msg.content}
              </div>

              {/* Timestamp */}
              <div className={s.messageTime}>{formatTime(msg.created_at)}</div>
            </div>
          </div>
        ))}
      </div>

      {/* Suggested questions */}
      {suggestEnabled && suggestedQuestions.length > 0 && !isResponding && (
        <div className="px-10 pb-3">
          <div className={s.suggestedList}>
            {suggestedQuestions.map((q, i) => (
              <button
                key={i}
                className={s.suggestedItem}
                onClick={() => {
                  setInputValue(q)
                  textareaRef.current?.focus()
                }}
              >
                {q}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Input area */}
      <div className={s.inputArea}>
        {/* Toolbar: suggested questions toggle */}
        <div className={s.inputToolbar}>
          <button
            className={cn(s.suggestToggle, suggestEnabled && s.suggestToggleActive)}
            onClick={handleSuggestToggle}
            disabled={suggestChecking}
            title={suggestEnabled ? 'Disable suggested questions' : 'Enable suggested questions'}
          >
            <SparklesIcon className="w-3.5 h-3.5" />
            <span>{suggestChecking ? 'Checking…' : 'Suggestions'}</span>
          </button>
        </div>

        <div className={s.inputWrapper}>
          <textarea
            ref={textareaRef}
            className={s.inputTextarea}
            placeholder="Type a message… (Enter to send, Shift+Enter for new line)"
            value={inputValue}
            onChange={handleTextareaChange}
            onKeyDown={handleKeyDown}
            rows={1}
            disabled={isResponding}
          />
          {isResponding
            ? (
              <button className={s.stopButton} onClick={handleStop}>
                <StopIcon className="w-3.5 h-3.5" />
                <span>Stop</span>
              </button>
              )
            : (
              <button
                className={s.sendButton}
                onClick={handleSend}
                disabled={!inputValue.trim()}
                title="Send"
              >
                <PaperAirplaneIcon className="w-4 h-4" />
              </button>
              )}
        </div>
        <div className={s.inputHint}>
          <kbd>Enter</kbd> to send · <kbd>Shift+Enter</kbd> for new line
        </div>
      </div>
    </div>
  )
}

export default ChatGeneration
