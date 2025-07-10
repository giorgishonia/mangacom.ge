import NextAuth, { DefaultSession } from "next-auth"
import { JWT } from "next-auth/jwt"

declare module "next-auth" {
  /**
   * Extend the session object to include user ID
   */
  interface Session {
    user: {
      id: string
    } & DefaultSession["user"]
  }

  /**
   * Returned by useSession, getSession
   */
  interface User {
    id: string
  }
}

declare module "next-auth/jwt" {
  /** Extend the JWT token */
  interface JWT {
    userId: string
  }
} 