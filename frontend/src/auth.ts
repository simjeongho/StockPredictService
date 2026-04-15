import NextAuth from "next-auth";
import Google from "next-auth/providers/google";
import Kakao from "next-auth/providers/kakao";

export const { handlers, auth, signIn, signOut } = NextAuth({
  providers: [
    Google({
      clientId: process.env.GOOGLE_CLIENT_ID!,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
    }),
    Kakao({
      clientId: process.env.KAKAO_CLIENT_ID!,
      clientSecret: process.env.KAKAO_CLIENT_SECRET ?? "",
    }),
  ],
  secret: process.env.NEXTAUTH_SECRET,
  callbacks: {
    async jwt({ token, account }) {
      if (account) {
        // 최초 로그인: 백엔드에 verify 요청 → user_id 획득
        try {
          const res = await fetch(
            `${process.env.NEXTAUTH_BACKEND_URL}/api/v1/auth/verify`,
            {
              method: "POST",
              headers: {
                Authorization: `Bearer ${account.access_token}`,
              },
            }
          );
          if (res.ok) {
            const data = await res.json();
            token.user_id = data.user_id;
            token.provider = account.provider;
          }
        } catch (err) {
          console.error("백엔드 verify 오류:", err);
        }
        token.accessToken = account.access_token;
      }
      return token;
    },
    async session({ session, token }) {
      session.user.user_id = token.user_id as string;
      session.user.provider = token.provider as string;
      (session as Record<string, unknown>).accessToken = token.accessToken;
      return session;
    },
  },
});
