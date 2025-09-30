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
        console.log("Sign-in attempt:", { email: user.email, provider: account?.provider });
        
        // Check if user exists in our database
        const existingUser = await prisma.user.findUnique({
          where: { email: user.email! },
        });

        if (!existingUser) {
          console.log("User not found in database, creating new user:", user.email);
          // Create new user automatically
          try {
            await prisma.user.create({
              data: {
                email: user.email!,
                name: user.name || user.email!.split('@')[0],
                role: 'user',
                emailVerified: new Date(),
                image: user.image
              }
            });
            console.log("New user created successfully");
          } catch (createError) {
            console.error("Error creating user:", createError);
            // User might have been created by NextAuth adapter, continue
          }
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
  // Enable automatic account linking
  events: {
    async linkAccount({ user, account, profile }) {
      console.log("Account linked:", { email: user.email, provider: account.provider });
    },
  },
  debug: process.env.NODE_ENV === "development",
});

export { handler as GET, handler as POST };