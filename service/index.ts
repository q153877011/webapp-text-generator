import type { IOnCompleted, IOnData, IOnError, IOnNodeFinished, IOnNodeStarted, IOnTaskId, IOnWorkflowFinished, IOnWorkflowStarted, IOnMessageEnd, IOnAgentMessage, IOnAgentThought } from './base'
import { get, post, del, ssePost } from './base'
import type { Feedbacktype } from '@/types/app'

export const sendCompletionMessage = async (
  body: Record<string, any>,
  {
    onData,
    onCompleted,
    onError,
    onTaskId,
    abortController,
  }: {
    onData: IOnData
    onCompleted: IOnCompleted
    onError: IOnError
    onTaskId?: IOnTaskId
    abortController?: AbortController
  },
) => {
  return ssePost('completion-messages', {
    body: {
      ...body,
      response_mode: 'streaming',
    },
  }, { onData, onCompleted, onError, onTaskId, abortController })
}

export const sendWorkflowMessage = async (
  body: Record<string, any>,
  {
    onWorkflowStarted,
    onNodeStarted,
    onNodeFinished,
    onWorkflowFinished,
    onTaskId,
    abortController,
  }: {
    onWorkflowStarted: IOnWorkflowStarted
    onNodeStarted: IOnNodeStarted
    onNodeFinished: IOnNodeFinished
    onWorkflowFinished: IOnWorkflowFinished
    onTaskId?: IOnTaskId
    abortController?: AbortController
  },
) => {
  return ssePost('workflows/run', {
    body: {
      ...body,
      response_mode: 'streaming',
    },
  }, { onNodeStarted, onWorkflowStarted, onWorkflowFinished, onNodeFinished, onTaskId, abortController })
}

export const stopCompletionMessage = async (taskId: string) => {
  return post(`completion-messages/${taskId}/stop`)
}

export const stopWorkflow = async (taskId: string) => {
  return post(`workflows/${taskId}/stop`)
}

export const fetchAppParams = async () => {
  return get('parameters')
}

export const fetchWorkflowLogs = async (params?: { page?: number; limit?: number; status?: string; keyword?: string }) => {
  const query: Record<string, string> = {}
  if (params?.page) query.page = String(params.page)
  if (params?.limit) query.limit = String(params.limit)
  if (params?.status) query.status = params.status
  if (params?.keyword) query.keyword = params.keyword
  return get('workflows/logs', { params: query })
}

export const fetchWorkflowRunDetail = async (id: string) => {
  return get(`workflows/run/${id}`)
}

export const fetchAppMeta = async () => {
  return get('meta')
}

export const updateFeedback = async ({ url, body }: { url: string; body: Feedbacktype }) => {
  return post(url, { body })
}

// ────────────────────────────────────────────────
// Chat / Agent APIs
// ────────────────────────────────────────────────

export const sendChatMessage = async (
  body: {
    query: string
    inputs?: Record<string, any>
    conversation_id?: string
    files?: any[]
  },
  {
    onData,
    onCompleted,
    onError,
    onTaskId,
    onMessageEnd,
    onAgentMessage,
    onAgentThought,
    abortController,
  }: {
    onData: IOnData
    onCompleted?: IOnCompleted
    onError?: IOnError
    onTaskId?: IOnTaskId
    onMessageEnd?: IOnMessageEnd
    onAgentMessage?: IOnAgentMessage
    onAgentThought?: IOnAgentThought
    abortController?: AbortController
  },
) => {
  return ssePost('chat-messages', {
    body: {
      ...body,
      response_mode: 'streaming',
    },
  }, { onData, onCompleted, onError, onTaskId, onMessageEnd, onAgentMessage, onAgentThought, abortController })
}

export const stopChatMessage = async (taskId: string) => {
  return post(`chat-messages/${taskId}/stop`)
}

export const fetchSuggestedQuestions = async (messageId: string) => {
  return get(`messages/${messageId}/suggested`)
}

export const fetchConversations = async (params?: { first_id?: string; limit?: number }) => {
  const query: Record<string, string> = {}
  if (params?.first_id) query.first_id = params.first_id
  if (params?.limit) query.limit = String(params.limit)
  return get('conversations', { params: query })
}

export const deleteConversation = async (conversationId: string) => {
  return del(`conversations/${conversationId}`)
}

export const renameConversation = async (
  conversationId: string,
  name: string,
  autoGenerate = false,
) => {
  return post(`conversations/${conversationId}/name`, {
    body: { name, auto_generate: autoGenerate },
  })
}

