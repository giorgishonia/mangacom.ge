import { NextRequest, NextResponse } from 'next/server'

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams
    const mangaId = searchParams.get('mangaId')
    const limit = searchParams.get('limit') || '500'
    const offset = searchParams.get('offset') || '0'
    
    if (!mangaId) {
      return NextResponse.json(
        { error: 'mangaId parameter is required' },
        { status: 400 }
      )
    }
    
    // Make the request to MangaDx API from the server
    const url = `https://api.mangadex.org/manga/${mangaId}/feed?translatedLanguage[]=en&order[chapter]=asc&limit=${limit}&offset=${offset}`
    
    const response = await fetch(url, {
      headers: {
        'User-Agent': 'MangAnime/1.0'
      }
    })
    
    if (!response.ok) {
      throw new Error(`MangaDx API error: ${response.status}`)
    }
    
    const data = await response.json()
    
    return NextResponse.json({
      success: true,
      data: data
    })
  } catch (error) {
    console.error('MangaDx API proxy error:', error)
    return NextResponse.json(
      { 
        success: false, 
        error: error instanceof Error ? error.message : 'Unknown error' 
      },
      { status: 500 }
    )
  }
} 