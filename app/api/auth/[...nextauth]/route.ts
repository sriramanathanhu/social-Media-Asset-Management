import NextAuth from "next-auth";
import KeycloakProvider from "next-auth/providers/keycloak";
import { PrismaAdapter } from "@auth/prisma-adapter";
import { prisma } from "@/lib/db/prisma";

const handler = NextAuth({
  adapter: PrismaAdapter(prisma),
  providers: [
    KeycloakProvider({
      clientId: process.env.KEYCLOAK_CLIENT_ID!,
      clientSecret: process.env.KEYCLOAK_CLIENT_SECRET!,
      issuer: `${process.env.KEYCLOAK_URL}/realms/${process.env.KEYCLOAK_REALM}`,
      allowDangerousEmailAccountLinking: true,
    }),
  ],
  callbacks: {
    async jwt({ token, user, account }) {
      // Add user ID and provider info to token
      if (user) {
        token.userId = user.id;
        token.provider = account?.provider;
      }
      return token;
    },
    async session({ session, token, user }) {
      // Enhance session with user data from database
      if (user) {
        session.user = {
          ...session.user,
          id: user.id,
          role: user.role || 'user',
          ecitizenId: user.ecitizen_id,
          provider: 'keycloak'
        };
      }
      return session;
    },
    async signIn({ user, account, profile }) {
      console.log("Sign-in attempt:", { 
        email: user.email, 
        provider: account?.provider,
        userId: user.id 
      });
      
      // Let NextAuth handle user creation automatically
      // Just log for debugging
      return true;
    },
  },
  pages: {
    signIn: "/", // Redirect to home page for sign-in
    error: "/auth/error", // Error page
  },
  session: {
    strategy: "database",
    maxAge: 24 * 60 * 60, // 24 hours
  },
  // Enable automatic account linking for same email
  events: {
    async linkAccount({ user, account, profile }) {
      console.log("Account linked:", { email: user.email, provider: account.provider });
    },
    async createUser({ user }) {
      console.log("User created:", { email: user.email, id: user.id });
      
      // Update user with default role if not set
      if (!user.role) {
        await prisma.user.update({
          where: { id: user.id },
          data: { role: 'user' }
        });
      }
    },
  },
  debug: process.env.NODE_ENV === "development" || process.env.NEXTAUTH_DEBUG === "true",
});

export { handler as GET, handler as POST };