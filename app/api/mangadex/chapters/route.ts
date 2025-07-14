import { NextResponse } from 'next/server';

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const mangaId = searchParams.get('mangaId');
  const limit = searchParams.get('limit') || '500';
  const offset = searchParams.get('offset') || '0';
  const chapterOrder = searchParams.get('order[chapter]') || 'asc';

  if (!mangaId) {
    return NextResponse.json({ error: 'mangaId is required' }, { status: 400 });
  }

  try {
    const url = `https://api.mangadex.org/manga/${mangaId}/feed?translatedLanguage[]=en&order[chapter]=${chapterOrder}&limit=${limit}&offset=${offset}`;
    const resp = await fetch(url, {
      headers: {
        'User-Agent': 'Manganime/1.0',
      },
    });

    if (!resp.ok) {
      const errorData = await resp.text();
      console.error(
        `MangaDex API error: ${resp.status} ${resp.statusText}`,
        errorData
      );
      return NextResponse.json(
        { error: `Failed to fetch from MangaDex: ${resp.statusText}` },
        { status: resp.status }
      );
    }

    const json = await resp.json();
    return NextResponse.json(json);
  } catch (error) {
    console.error('[MANGADEX_PROXY_ERROR]', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
} 