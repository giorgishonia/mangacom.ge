import { NextRequest, NextResponse } from 'next/server'

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams
    const chapterId = searchParams.get('chapterId')
    
    if (!chapterId) {
      return NextResponse.json(
        { error: 'chapterId parameter is required' },
        { status: 400 }
      )
    }
    
    // Make the request to MangaDx at-home API from the server
    const url = `https://api.mangadex.org/at-home/server/${chapterId}`
    
    const response = await fetch(url, {
      headers: {
        'User-Agent': 'MangAnime/1.0'
      }
    })
    
    if (!response.ok) {
      throw new Error(`MangaDx at-home API error: ${response.status}`)
    }
    
    const data = await response.json()
    
    return NextResponse.json({
      success: true,
      data: data
    })
  } catch (error) {
    console.error('MangaDx pages API proxy error:', error)
    return NextResponse.json(
      { 
        success: false, 
        error: error instanceof Error ? error.message : 'Unknown error' 
      },
      { status: 500 }
    )
  }
} 