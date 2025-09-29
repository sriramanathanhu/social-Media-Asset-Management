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
        // Get additional user data from database
        const dbUser = await prisma.user.findUnique({
          where: { email: user.email! },
        });

        session.user = {
          ...session.user,
          id: user.id,
          role: dbUser?.role || 'user',
          ecitizenId: dbUser?.ecitizen_id,
          provider: 'keycloak'
        };
      }
      return session;
    },
    async signIn({ user, account, profile }) {
      try {
        // Check if user exists in our database
        const existingUser = await prisma.user.findUnique({
          where: { email: user.email! },
        });

        if (!existingUser) {
          console.log("User not found in database:", user.email);
          // For now, we'll allow the sign-in and let the admin add users later
          // You can change this behavior based on your requirements
          return true;
        }

        console.log("User authenticated:", user.email);
        return true;
      } catch (error) {
        console.error("Error during sign-in:", error);
        return false;
      }
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
  debug: process.env.NODE_ENV === "development",
});

export { handler as GET, handler as POST };