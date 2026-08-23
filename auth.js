import NextAuth from "next-auth";
import { prisma } from "@/lib/prisma";
import { authConfig } from "@/auth.config";

export const { handlers, signIn, signOut, auth } = NextAuth({
  ...authConfig,
  callbacks: {
    async signIn() {
      return true;
    },
    async jwt({ token, profile }) {
      const email = profile?.email ?? token.email;
      if (
        email &&
        (profile?.email ||
          token.atendenteId === null ||
          token.atendenteId === undefined)
      ) {
        const atendente = await prisma.atendente.findUnique({
          where: { email },
          select: { id: true },
        });
        token.atendenteId = atendente?.id ?? null;
      }
      return token;
    },
    async session({ session, token }) {
      session.atendenteId = token.atendenteId ?? null;
      return session;
    },
  },
});
