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
import Loading from '@/app/components/base/loading'
import {
  sendChatMessage,
  stopChatMessage,
  fetchSuggestedQuestions,
  fetchMessages,
  fetchAppParams,
} from '@/service'
import type { ChatMessage } from '@/types/app'
import { MessageRole } from '@/types/app'
import { APP_TYPE } from '@/config'
import s from './chat-styles.module.css'

// ─── Types ────────────────────────────────────────────────────────────

type Props = {
  /** Active conversation ID (managed by parent / ConversationSidebar) */
  conversationId: string | null
  /** Called when first assistant reply arrives with new conversation ID */
  onConversationCreated?: (id: string) => void
  /** Called whenever messages change (e.g. to refresh sidebar) */
  onMessagesChange?: () => void
}

// ─── Component ────────────────────────────────────────────────────────

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
  const [loadingHistory, setLoadingHistory] = useState(false)

  // Refs
  const abortControllerRef = useRef<AbortController>(new AbortController())
  const messageListRef = useRef<HTMLDivElement>(null)
  const textareaRef = useRef<HTMLTextAreaElement>(null)
  const messageCountRef = useRef<number>(0)
  const currentTaskIdRef = useRef<string | null>(null)

  // ── Scroll to bottom ───────────────────────────────────────────────
  const scrollToBottom = useCallback(() => {
    requestAnimationFrame(() => {
      if (messageListRef.current)
        messageListRef.current.scrollTop = messageListRef.current.scrollHeight
    })
  }, [])

  useEffect(() => {
    if (messages.length !== messageCountRef.current) {
      messageCountRef.current = messages.length
      scrollToBottom()
    }
  }, [messages.length, scrollToBottom])

  // ── Reset when switching conversation ──────────────────────────────
  useEffect(() => {
    // Abort any in-flight request from the previous conversation
    abortControllerRef.current.abort()
    abortControllerRef.current = new AbortController()

    setMessages([])
    setSuggestedQuestions([])
    currentTaskIdRef.current = null
    stopResponding()
    messageCountRef.current = 0

    if (!conversationId) return

    const loadConversationHistory = async () => {
      setLoadingHistory(true)
      try {
        const res: any = await fetchMessages(conversationId)
        if (res?.code) {
          Toast.notify({ type: 'error', message: res.message || 'Failed to load conversation history' })
          return
        }

        if (res?.data && Array.isArray(res.data)) {
          // Map Dify response fields to frontend format.
          // Each Dify message contains both query (user) and answer (assistant),
          // so we reconstruct both sides of the conversation.
          const normalizedMessages = res.data.map((m: any) => {
            const assistantMsg: ChatMessage = {
              id: m.id,
              conversation_id: m.conversation_id,
              role: MessageRole.Assistant,
              content: m.answer || m.content || '',
              isStreaming: false,
              feedback: m.feedback,
              agent_thoughts: m.agent_thoughts || [],
              created_at: m.created_at,
            }

            if (m.query && m.query.trim().length > 0) {
              const userMsg: ChatMessage = {
                id: `user-${m.id}`,
                conversation_id: m.conversation_id,
                role: MessageRole.User,
                content: m.query,
                isStreaming: false,
                agent_thoughts: [],
                created_at: m.created_at - 1,
              }
              return [userMsg, assistantMsg]
            }

            return assistantMsg
          })
          setMessages((normalizedMessages as (ChatMessage | ChatMessage[])[]).flat() as ChatMessage[])
        }
      }
      catch (e: any) {
        Toast.notify({ type: 'error', message: e.message || 'Failed to load conversation history' })
      }
      finally {
        setLoadingHistory(false)
      }
    }

    loadConversationHistory()
  }, [conversationId]) // eslint-disable-line react-hooks/exhaustive-deps

  // ── Toggle suggested questions (with pre-flight validation) ────────
  const [suggestEnabled, setSuggestEnabled] = useState(false)
  const [suggestChecking, setSuggestChecking] = useState(false)

  const handleSuggestToggle = useCallback(async () => {
    if (suggestEnabled) {
      setSuggestEnabled(false)
      return
    }

    setSuggestChecking(true)
    try {
      const paramsRes: any = await fetchAppParams()
      if (paramsRes?.data?.suggested_questions_after_answer?.enabled) {
        setSuggestEnabled(true)
      }
      else {
        Toast.notify({ type: 'error', message: 'Suggested Questions is not enabled in your Dify app settings.' })
      }
    }
    catch {
      Toast.notify({ type: 'error', message: 'Could not verify Suggested Questions setting.' })
    }
    finally {
      setSuggestChecking(false)
    }
  }, [suggestEnabled])

  // ── Textarea auto-resize ───────────────────────────────────────────
  const handleTextareaChange = useCallback((e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setInputValue(e.target.value)
    e.target.style.height = 'auto'
    e.target.style.height = `${Math.min(e.target.scrollHeight, 120)}px`
  }, [])

  // ── Send message ───────────────────────────────────────────────────
  const handleSend = useCallback(async () => {
    const query = inputValue.trim()
    if (!query || isResponding) return

    setInputValue('')
    if (textareaRef.current)
      textareaRef.current.style.height = 'auto'
    setSuggestedQuestions([])

    // Optimistically append user message
    setMessages(prev => [
      ...prev,
      {
        id: `user-${Date.now()}`,
        role: MessageRole.User,
        content: query,
        isStreaming: false,
        agent_thoughts: [],
      } as ChatMessage,
    ])

    // Append empty streaming assistant placeholder
    const placeholderId = `assistant-${Date.now()}`
    setMessages(prev => [
      ...prev,
      {
        id: placeholderId,
        role: MessageRole.Assistant,
        content: '',
        isStreaming: true,
        agent_thoughts: [],
      } as ChatMessage,
    ])

    startResponding()

    const abortController = new AbortController()
    abortControllerRef.current = abortController

    // Track the real message ID once the server assigns one
    let resolvedMsgId = placeholderId
    let resolvedConvId = conversationId

    await sendChatMessage(
      {
        query,
        inputs: {},
        conversation_id: conversationId || undefined,
      },
      {
        onData: (text, _isFirst, { conversationId: cid, messageId }) => {
          if (cid && !resolvedConvId) {
            resolvedConvId = cid
            onConversationCreated?.(cid)
          }
          if (messageId)
            resolvedMsgId = messageId

          setMessages(prev =>
            prev.map(m =>
              m.id === placeholderId || m.id === resolvedMsgId
                ? { ...m, id: resolvedMsgId, content: m.content + text, isStreaming: true }
                : m,
            ),
          )
          scrollToBottom()
        },

        onAgentMessage: (text, _isFirst, { conversationId: cid, messageId }) => {
          if (cid && !resolvedConvId) {
            resolvedConvId = cid
            onConversationCreated?.(cid)
          }
          if (messageId)
            resolvedMsgId = messageId

          setMessages(prev =>
            prev.map(m =>
              m.id === placeholderId || m.id === resolvedMsgId
                ? { ...m, id: resolvedMsgId, content: m.content + text, isStreaming: true }
                : m,
            ),
          )
          scrollToBottom()
        },

        onAgentThought: (thought) => {
          setMessages(prev =>
            prev.map((m) => {
              if (m.id !== placeholderId && m.id !== resolvedMsgId) return m
              const existing = m.agent_thoughts || []
              const idx = existing.findIndex((t: any) => t.id === thought.data?.id)
              const newThoughts
                = idx === -1
                  ? [...existing, thought.data]
                  : existing.map((t: any, i: number) => (i === idx ? thought.data : t))
              return { ...m, agent_thoughts: newThoughts }
            }),
          )
        },

        onMessageEnd: (messageId, cid) => {
          if (cid && !resolvedConvId) {
            resolvedConvId = cid
            onConversationCreated?.(cid)
          }
          resolvedMsgId = messageId

          setMessages(prev =>
            prev.map(m =>
              m.id === placeholderId || m.id === resolvedMsgId
                ? { ...m, id: messageId, isStreaming: false }
                : m,
            ),
          )
          onMessagesChange?.()

          if (suggestEnabled && messageId) {
            fetchSuggestedQuestions(messageId)
              .then((res: any) => {
                if (Array.isArray(res?.data))
                  setSuggestedQuestions(res.data)
              })
              .catch(() => { /* silently ignore */ })
          }
        },

        onCompleted: () => {
          setMessages(prev => prev.map(m => m.isStreaming ? { ...m, isStreaming: false } : m))
          stopResponding()
        },

        onError: (msg) => {
          Toast.notify({ type: 'error', message: msg })
          setMessages(prev => prev.map(m => m.isStreaming ? { ...m, isStreaming: false } : m))
          stopResponding()
        },

        onTaskId: (taskId) => {
          currentTaskIdRef.current = taskId
        },

        abortController,
      },
    )
  }, [
    inputValue,
    isResponding,
    conversationId,
    suggestEnabled,
    startResponding,
    stopResponding,
    scrollToBottom,
    onConversationCreated,
    onMessagesChange,
  ])

  // ── Stop responding ────────────────────────────────────────────────
  const handleStop = useCallback(async () => {
    abortControllerRef.current.abort()
    const taskId = currentTaskIdRef.current
    if (taskId) {
      try { await stopChatMessage(taskId) }
      catch (_) { }
    }
    setMessages(prev => prev.map(m => m.isStreaming ? { ...m, isStreaming: false } : m))
    stopResponding()
  }, [stopResponding])

  // ── Keyboard: Enter to send, Shift+Enter for newline ──────────────
  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSend()
    }
  }

  // ── Render ─────────────────────────────────────────────────────────
  return (
    <div className={cn(s.chatContainer, 'flex flex-col h-full')}>
      {/* Message list */}
      <div ref={messageListRef} className={cn(s.messageList, 'grow')}>
        {loadingHistory && (
          <div className="flex justify-center items-center h-full">
            <Loading type="area" />
          </div>
        )}

        {!loadingHistory && messages.length === 0 && (
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
            <div className={s.messageBody}>
              {/* Agent thoughts */}
              {isAgentApp && msg.agent_thoughts && msg.agent_thoughts.length > 0 && (
                <div className="mb-2 space-y-1">
                  {msg.agent_thoughts.map((thought: any) => (
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
            </div>
          </div>
        ))}
      </div>

      {/* Suggested questions — outside the scroll area */}
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
        {/* Toolbar */}
        <div className={s.inputToolbar}>
          <button
            className={cn(s.suggestToggle, suggestEnabled && s.suggestToggleActive)}
            onClick={handleSuggestToggle}
            disabled={suggestChecking}
            title={suggestEnabled ? 'Disable suggested questions' : 'Enable suggested questions'}
          >
            <SparklesIcon className="w-3.5 h-3.5" />
            <span>Suggestions</span>
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

export default React.memo(ChatGeneration)
