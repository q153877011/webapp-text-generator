import { type NextRequest, NextResponse } from 'next/server'
import { API_KEY, API_URL } from '@/config'
import { getInfo } from '@/app/api/utils/common'

export async function POST(request: NextRequest) {
  const { user } = getInfo(request)

  const body = await request.json()
  const { text, message_id } = body

  const baseUrl = API_URL.replace(/\/v1\/?$/, '')
  const res = await fetch(`${baseUrl}/v1/text-to-audio`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${API_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ text, message_id, user, streaming: false }),
  })

  if (!res.ok) {
    const raw = await res.text()
    let errorData: { message: string }
    try { errorData = JSON.parse(raw) }
    catch { errorData = { message: raw || `TTS failed (${res.status})` } }
    return NextResponse.json(errorData, { status: res.status })
  }

  // Stream audio bytes back to the client
  return new Response(res.body, {
    status: res.status,
    headers: {
      'Content-Type': res.headers.get('Content-Type') ?? 'audio/mpeg',
    },
  })
}
