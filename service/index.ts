import type { IOnCompleted, IOnData, IOnError, IOnNodeFinished, IOnNodeStarted, IOnTaskId, IOnWorkflowFinished, IOnWorkflowStarted } from './base'
import { get, post, ssePost } from './base'
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
