import type { NextAuthConfig } from "next-auth";

/**
 * Edge-safe auth config — NO Prisma, NO bcrypt.
 * Used only by middleware (Edge Runtime).
 * The full auth.ts extends this with the Prisma adapter + Credentials provider.
 */
export const authConfig: NextAuthConfig = {
  pages: {
    signIn: "/login",
    error: "/login",
  },
  session: { strategy: "jwt" },
  callbacks: {
    authorized({ auth, request: { nextUrl } }) {
      const isLoggedIn = !!auth?.user?.id;
      const PUBLIC_PATHS = ["/login", "/register", "/api/auth", "/api/scheduler"];
      const isPublic = PUBLIC_PATHS.some((p) => nextUrl.pathname.startsWith(p));

      if (!isPublic && !isLoggedIn) return false;   // redirect to /login
      return true;
    },
    async jwt({ token, user }) {
      if (user) {
        token.id = user.id;
        token.isSuperAdmin = (user as { isSuperAdmin?: boolean }).isSuperAdmin ?? false;
      }
      return token;
    },
    async session({ session, token }) {
      if (token) {
        session.user.id = token.id as string;
        session.user.isSuperAdmin = (token.isSuperAdmin as boolean) ?? false;
      }
      return session;
    },
  },
  providers: [], // providers are added in auth.ts only
};
