import NextAuth from "next-auth";
import GitHub from "next-auth/providers/github";

function allowedUsers(): string[] {
  const configuredUsers = (process.env.ALLOWED_GITHUB_USERS ?? "")
    .split(",")
    .map((name) => name.trim().toLowerCase())
    .filter(Boolean);

  // Keep production private even before an explicit allowlist is configured.
  return configuredUsers.length > 0 ? configuredUsers : ["benjistun"];
}

export const { handlers, auth, signIn, signOut } = NextAuth({
  providers: [GitHub],
  pages: { signIn: "/login", error: "/login" },
  callbacks: {
    async signIn({ account, profile }) {
      if (account?.provider !== "github") return false;
      const allowlist = allowedUsers();
      if (allowlist.length === 0) return true;
      const login = typeof profile?.login === "string" ? profile.login.toLowerCase() : "";
      return allowlist.includes(login);
    },
    async session({ session, token }) {
      if (session.user && token.sub) session.user.id = token.sub;
      return session;
    },
  },
  session: { strategy: "jwt", maxAge: 60 * 60 * 8 },
});
