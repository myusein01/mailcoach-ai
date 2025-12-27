// app/api/auth/[...nextauth]/route.ts
import NextAuth, { type NextAuthOptions } from "next-auth";
import GoogleProvider from "next-auth/providers/google";
import { dbExec } from "@/db/helpers";

export const authOptions: NextAuthOptions = {
  providers: [
    GoogleProvider({
      clientId: process.env.GOOGLE_CLIENT_ID!,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
    }),
  ],

  session: { strategy: "jwt" },

  callbacks: {
    // ✅ crée le user si première connexion, sinon met à jour le name (sans casser le plan)
    async signIn({ user }) {
      const email = user?.email?.toLowerCase();
      if (!email) return false;

      const name = user?.name ?? null;

      try {
        // 1) crée le user si n'existe pas (fonctionne seulement si tu as un UNIQUE sur email)
        await dbExec(
          `
          INSERT OR IGNORE INTO users (
            id,
            email,
            name,
            plan,
            credits_used,
            period_start
          )
          VALUES (
            ?, ?, ?, 'free', 0,
            (CAST(strftime('%s','now') AS INTEGER) * 1000)
          )
          `,
          [email, email, name]
        );

        // 2) s'assure que le name est à jour + fixe id si jamais il est NULL
        await dbExec(
          `
          UPDATE users
          SET
            name = COALESCE(?, name),
            id = COALESCE(id, ?)
          WHERE lower(email) = ?
          `,
          [name, email, email]
        );

        return true;
      } catch (e) {
        console.error("signIn DB error:", e);
        return false;
      }
    },

    async jwt({ token, user }) {
      if (user?.email) token.email = user.email.toLowerCase();
      return token;
    },

    async session({ session, token }) {
      if (session.user && token?.email) {
        session.user.email = token.email as string;
      }
      return session;
    },
  },
};

const handler = NextAuth(authOptions);
export { handler as GET, handler as POST };
