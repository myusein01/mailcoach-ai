import NextAuth from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";

const handler = NextAuth({
  secret: process.env.AUTH_SECRET,
  session: {
    strategy: "jwt",
  },
  providers: [
    CredentialsProvider({
      name: "Connexion",
      credentials: {
        email: { label: "Email", type: "text" },
        name: { label: "Nom", type: "text" },
      },
      async authorize(credentials) {
        if (!credentials?.email) return null;

        return {
          id: credentials.email,
          email: credentials.email,
          name: credentials.name || "Utilisateur",
        };
      },
    }),
  ],
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.email = user.email;
        token.name = user.name;
      }
      return token;
    },
    async session({ session, token }) {
      if (session.user) {
        session.user.email = token.email as string | undefined;
        session.user.name = token.name as string | undefined;
      }
      return session;
    },
  },
});

export { handler as GET, handler as POST };
