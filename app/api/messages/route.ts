import { type NextRequest } from 'next/server'
import { NextResponse } from 'next/server'
import { client, getInfo, setSession } from '@/app/api/utils/common'

/**
 * 获取对话消息列表
 *
 * @route GET /api/messages
 * @dify  GET /v1/messages
 *
 * @description 获取指定对话的消息历史记录。
 *              适用于 Chat / Agent 类型应用的多轮对话消息回溯。
 *
 * @queryParam conversation_id {string} 必填 — 对话 ID，用于指定要获取消息的对话
 *
 * @cookie session_id {string} 可选 — 用户会话标识，若不存在则自动生成
 *
 * @returns {object} JSON
 *   - data {Array<Message>} 消息列表，每条消息包含 id、role、content、created_at 等
 *
 * @example
 *   GET /api/messages?conversation_id=abc-123
 */
export async function GET(request: NextRequest) {
  const { sessionId, user } = getInfo(request)
  const { searchParams } = new URL(request.url)
  const conversationId = searchParams.get('conversation_id')
  const { data }: any = await client.getConversationMessages(user, conversationId as string)
  return NextResponse.json(data, {
    headers: setSession(sessionId),
  })
}
