import { type NextRequest } from 'next/server'
import { NextResponse } from 'next/server'
import { getInfo, setSession } from '@/app/api/utils/common'
import { API_KEY, API_URL } from '@/config'

export async function GET(request: NextRequest) {
  const { sessionId } = getInfo(request)
  const { searchParams } = new URL(request.url)

  const page = searchParams.get('page') || '1'
  const limit = searchParams.get('limit') || '20'
  const status = searchParams.get('status') || ''
  const keyword = searchParams.get('keyword') || ''

  const baseUrl = API_URL || 'https://api.dify.ai/v1'

  const params = new URLSearchParams()
  params.append('page', page)
  params.append('limit', limit)
  if (status)
    params.append('status', status)
  if (keyword)
    params.append('keyword', keyword)

  try {
    const res = await fetch(`${baseUrl}/workflows/logs?${params.toString()}`, {
      method: 'GET',
      headers: {
        Authorization: `Bearer ${API_KEY}`,
        'Content-Type': 'application/json',
      },
    })

    if (!res.ok) {
      const errorData = await res.json().catch(() => ({}))
      return NextResponse.json(
        { error: errorData.message || 'Failed to fetch workflow logs' },
        { status: res.status, headers: setSession(sessionId) },
      )
    }

    const data = await res.json()
    return NextResponse.json(data, {
      headers: setSession(sessionId),
    })
  }
  catch (error: any) {
    return NextResponse.json(
      { error: error.message || 'Internal server error' },
      { status: 500, headers: setSession(sessionId) },
    )
  }
}
