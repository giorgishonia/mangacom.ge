import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { z } from 'zod'

// Comment schema for validation
const commentSchema = z.object({
  contentId: z.string(),
  contentType: z.enum(['anime', 'manga']),
  text: z.string().min(1).max(1000)
})

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const contentId = searchParams.get('contentId')
  const contentType = searchParams.get('contentType')

  if (!contentId || !contentType) {
    return NextResponse.json(
      { error: 'Missing required parameters' },
      { status: 400 }
    )
  }

  try {
    // In a real implementation, you would fetch comments from your database
    // Example: const comments = await db.comments.findMany({ where: { contentId, contentType } })
    
    // For now, we'll return mock data
    const mockComments = [
      {
        id: '1',
        userId: 'user1',
        userName: 'Shota Rustaveli',
        userImage: 'https://i.pravatar.cc/150?img=1',
        contentId,
        text: 'This is amazing! I love how they adapted the manga.',
        createdAt: new Date(Date.now() - 1000 * 60 * 60 * 2).toISOString()
      },
      {
        id: '2',
        userId: 'user2',
        userName: 'Nino Chkheidze',
        userImage: 'https://i.pravatar.cc/150?img=5',
        contentId,
        text: 'The animation quality is top-notch. Can\'t wait for the next episode!',
        createdAt: new Date(Date.now() - 1000 * 60 * 60 * 24).toISOString()
      }
    ]

    return NextResponse.json({ comments: mockComments })
  } catch (error) {
    console.error('Error fetching comments:', error)
    return NextResponse.json(
      { error: 'Error fetching comments' },
      { status: 500 }
    )
  }
}

export async function POST(request: Request) {
  // Check authentication
  const session = await getServerSession(authOptions)
  
  if (!session || !session.user) {
    return NextResponse.json(
      { error: 'Authentication required' },
      { status: 401 }
    )
  }

  try {
    const body = await request.json()
    
    // Validate input
    const result = commentSchema.safeParse(body)
    if (!result.success) {
      return NextResponse.json(
        { error: 'Invalid comment data', details: result.error.format() },
        { status: 400 }
      )
    }
    
    const { contentId, contentType, text } = result.data

    // In a real implementation, save to your database
    // Example: const comment = await db.comments.create({ data: { ... } })
    
    // Return mock response
    const newComment = {
      id: `comment-${Date.now()}`,
      userId: session.user.id,
      userName: session.user.name,
      userImage: session.user.image,
      contentId,
      contentType,
      text,
      createdAt: new Date().toISOString()
    }

    return NextResponse.json({ comment: newComment }, { status: 201 })
  } catch (error) {
    console.error('Error creating comment:', error)
    return NextResponse.json(
      { error: 'Error creating comment' },
      { status: 500 }
    )
  }
} 