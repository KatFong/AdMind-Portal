import NextAuth from "next-auth";
import { authConfig } from "@/lib/auth.config";

// Only imports edge-safe auth.config (no Prisma, no bcrypt)
// Keeps Edge Function well under the 1 MB limit
export default NextAuth(authConfig).auth;

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|api/scheduler).*)"],
};
