import NextAuth from "next-auth";
import Google from "next-auth/providers/google";
import Kakao from "next-auth/providers/kakao";
import { SignJWT } from "jose";

function getSecretBytes(): Uint8Array {
  return new TextEncoder().encode(process.env.NEXTAUTH_SECRET!);
}

async function createBackendJWT(payload: Record<string, unknown>): Promise<string> {
  return new SignJWT(payload)
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime("30d")
    .sign(getSecretBytes());
}

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
        // 최초 로그인: HS256 JWT를 직접 생성해 백엔드 verify 호출
        const tempJwt = await createBackendJWT({
          sub: token.sub,
          email: token.email,
          name: token.name,
          provider: account.provider,
        });

        try {
          const res = await fetch(
            `${process.env.NEXTAUTH_BACKEND_URL}/api/v1/auth/verify`,
            {
              method: "POST",
              headers: { Authorization: `Bearer ${tempJwt}` },
            }
          );
          if (res.ok) {
            const data = await res.json();
            token.user_id = data.user_id;
            token.provider = account.provider;
            // user_id 포함된 최종 JWT를 accessToken으로 저장
            token.accessToken = await createBackendJWT({
              sub: token.sub,
              email: token.email,
              name: token.name,
              provider: account.provider,
              user_id: data.user_id,
            });
          } else {
            token.accessToken = tempJwt;
          }
        } catch (err) {
          console.error("백엔드 verify 오류:", err);
          token.accessToken = tempJwt;
        }
        token.provider = account.provider;
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
