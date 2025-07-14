import { NextResponse } from 'next/server'

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const chapterId = searchParams.get('chapterId')

  if (!chapterId) {
    return NextResponse.json({ error: 'chapterId is required' }, { status: 400 })
  }

  try {
    const url = `https://api.mangadex.org/at-home/server/${chapterId}`
    const resp = await fetch(url, {
      headers: {
        'User-Agent': 'Manganime/1.0',
      },
    })

    if (!resp.ok) {
      const errorData = await resp.text()
      console.error(
        `MangaDex at-home API error: ${resp.status} ${resp.statusText}`,
        errorData
      )
      return NextResponse.json(
        { error: `Failed to fetch from MangaDex at-home: ${resp.statusText}` },
        { status: resp.status }
      )
    }

    const json = await resp.json()
    return NextResponse.json(json)
  } catch (error) {
    console.error('[MANGADEX_PAGES_PROXY_ERROR]', error)
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 })
  }
} 