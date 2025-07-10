import 'dotenv/config'
import express from 'express'
import { createServer } from 'http'
import { Server } from 'socket.io'
import cors from 'cors'
import jwt from 'jsonwebtoken'

const PORT = process.env.PORT || 4000
const SUPABASE_JWT_SECRET = process.env.SUPABASE_JWT_SECRET || ''

if (!SUPABASE_JWT_SECRET) {
  console.warn('⚠️  SUPABASE_JWT_SECRET not set – JWT verification will fail.')
}

interface JwtPayload {
  sub: string
  [key: string]: any
}

const app = express()
app.use(cors())
app.get('/', (_req, res) => {
  res.send('Manganime Live Reading Socket Server')
})

const httpServer = createServer(app)

const io = new Server(httpServer, {
  cors: {
    origin: '*',
  },
})

type SafeSocket = typeof io extends { on: any } ? any : never

// Auth middleware – verifies Supabase JWT
io.use((socket: SafeSocket, next) => {
  const token = socket.handshake.auth?.token || socket.handshake.query?.token
  if (!token) {
    return next(new Error('No token provided'))
  }
  try {
    const decoded = jwt.verify(token, SUPABASE_JWT_SECRET) as JwtPayload
    socket.data.user = {
      id: decoded.sub,
      ...decoded,
    }
    return next()
  } catch (err) {
    return next(new Error('Invalid token'))
  }
})

io.on('connection', (socket: SafeSocket) => {
  const { id: userId } = socket.data.user || {}
  console.log(`🔗  User connected: ${userId} (${socket.id})`)

  socket.on('join', ({ roomId }: { roomId: string }) => {
    socket.join(roomId)
    io.to(roomId).emit('presence', { type: 'join', userId })
  })

  socket.on('page', ({ roomId, pageIndex }: { roomId: string; pageIndex: number }) => {
    socket.to(roomId).emit('page', { pageIndex })
  })

  socket.on('chat', ({ roomId, message }: any) => {
    socket.to(roomId).emit('chat', message)
  })

  socket.on('reaction', ({ roomId, emoji }: { roomId: string; emoji: string }) => {
    socket.to(roomId).emit('reaction', { emoji, userId })
  })

  socket.on('disconnect', () => {
    console.log(`❌  User disconnected: ${userId}`)
  })
})

httpServer.listen(PORT, () => {
  console.log(`🚀 Socket server listening on :${PORT}`)
}) 