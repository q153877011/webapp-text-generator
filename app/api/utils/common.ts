import { type NextRequest } from 'next/server'
import { CompletionClient, ChatClient } from 'dify-client'
import { v4 } from 'uuid'
import { API_KEY, API_URL, APP_ID } from '@/config'

const userPrefix = `user_${APP_ID}:`

export const getInfo = (request: NextRequest) => {
  const sessionId = request.cookies.get('session_id')?.value || v4()
  const user = userPrefix + sessionId
  return {
    sessionId,
    user,
  }
}

export const setSession = (sessionId: string) => {
  return { 'Set-Cookie': `session_id=${sessionId}` }
}

export const chatClient = new ChatClient(API_KEY, API_URL || undefined)
export const completionClient = new CompletionClient(API_KEY, API_URL || undefined)

// Default export — kept for routes that haven't been migrated
export const client = chatClient
