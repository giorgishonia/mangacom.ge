import NextAuth from "next-auth"
import DiscordProvider from "next-auth/providers/discord"
import GoogleProvider from "next-auth/providers/google"
import CredentialsProvider from "next-auth/providers/credentials"
import { supabase } from "@/lib/supabase"

const handler = NextAuth({
  providers: [
    DiscordProvider({
      clientId: process.env.DISCORD_CLIENT_ID!,
      clientSecret: process.env.DISCORD_CLIENT_SECRET!,
    }),
    GoogleProvider({
      clientId: process.env.GOOGLE_CLIENT_ID!,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
    }),
    CredentialsProvider({
      name: "Credentials",
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" }
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) {
          return null
        }

        try {
          // Authenticate with Supabase
          const { data, error } = await supabase.auth.signInWithPassword({
            email: credentials.email,
            password: credentials.password,
          })

          if (error || !data.user) {
            return null
          }

          // Get user profile data
          const { data: profileData } = await supabase
            .from('profiles')
            .select('*')
            .eq('id', data.user.id)
            .single()

          return {
            id: data.user.id,
            email: data.user.email,
            name: profileData?.username || data.user.email?.split('@')[0],
            image: profileData?.avatar_url,
          }
        } catch (error) {
          console.error("Auth error:", error)
          return null
        }
      }
    })
  ],
  callbacks: {
    async jwt({ token, user, account }) {
      // Initial sign in
      if (account && user) {
        // If OAuth provider, create or update user in Supabase
        if (account.provider === 'discord' || account.provider === 'google') {
          const email = user.email
          
          if (email) {
            // Check if user exists in Supabase
            const { data: existingUser, error } = await supabase
              .from('profiles')
              .select('*')
              .eq('email', email)
              .single()

            if (error || !existingUser) {
              // Create new user profile
              await supabase.from('profiles').insert({
                id: user.id,
                email: email,
                username: user.name || email.split('@')[0],
                avatar_url: user.image || '',
              })
            }
          }
        }

        token.userId = user.id
        token.email = user.email
      }
      
      return token
    },
    async session({ session, token }) {
      if (token.userId) {
        session.user.id = token.userId as string
      }
      return session
    }
  },
  pages: {
    signIn: '/login',
    signOut: '/',
    error: '/login',
    // newUser: '/register', // New users will be directed here upon sign up
  },
  session: {
    strategy: "jwt",
  },
  secret: process.env.NEXTAUTH_SECRET,
})

export { handler as GET, handler as POST } 