# API Contract: 인증 (Authentication)

**Domain**: Authentication & User Profile | **Base URL**: `/api/v1`
**Auth Provider**: NextAuth.js v5 (프론트엔드) — Google OAuth 2.0 + Kakao OAuth 2.0

---

## 인증 흐름 개요

```
[Browser] → NextAuth.js Google/Kakao OAuth 플로우
         → NextAuth.js가 JWT 발급 (JWT_SECRET 공유)
         → 프론트엔드 API 요청 시 Authorization: Bearer {token}
         → FastAPI가 PyJWT로 토큰 검증 → user_info 추출
```

**JWT 페이로드 구조**:
```json
{
  "user_id": "uuid-...",
  "email": "user@example.com",
  "name": "홍길동",
  "provider": "google",
  "iat": 1744000000,
  "exp": 1744086400
}
```

---

## POST /api/v1/auth/verify

NextAuth.js JWT 토큰 검증 및 사용자 DB 등록/조회.
최초 로그인 시 users 테이블에 자동 INSERT. 이후 로그인 시 기존 레코드 반환.

### Request

```
POST /api/v1/auth/verify
Authorization: Bearer {nextauth_jwt_token}
```

(Request body 없음 — 토큰에서 모든 정보 추출)

### Response 200

```json
{
  "user_id": "550e8400-e29b-41d4-a716-446655440000",
  "email": "user@example.com",
  "name": "홍길동",
  "provider": "google",
  "is_new_user": false
}
```

**`is_new_user`**: `true`이면 최초 가입, `false`이면 기존 사용자 재로그인

### Response 401 — 유효하지 않은 토큰

```json
{
  "error": "INVALID_TOKEN",
  "message": "유효하지 않은 인증 토큰입니다."
}
```

### Response 401 — 만료된 토큰

```json
{
  "error": "TOKEN_EXPIRED",
  "message": "인증 토큰이 만료되었습니다. 다시 로그인해 주세요."
}
```

---

## GET /api/v1/users/me

현재 로그인한 사용자 프로필 조회.

**Authentication**: JWT 인증 필요

### Response 200

```json
{
  "user_id": "550e8400-e29b-41d4-a716-446655440000",
  "email": "user@example.com",
  "name": "홍길동",
  "provider": "google",
  "created_at": "2026-04-15T10:00:00Z",
  "watchlist_count": 5
}
```

### Response 401

```json
{
  "error": "UNAUTHORIZED",
  "message": "로그인이 필요합니다."
}
```

---

## PUT /api/v1/users/me

사용자 프로필 수정 (닉네임 등).

**Authentication**: JWT 인증 필요

### Request Body

```json
{
  "name": "새닉네임"
}
```

| 필드 | 타입 | 필수 | 설명 |
|------|------|------|------|
| name | string | | 표시 이름 변경 (최대 100자) |

### Response 200

```json
{
  "user_id": "550e8400-e29b-41d4-a716-446655440000",
  "email": "user@example.com",
  "name": "새닉네임",
  "provider": "google",
  "updated_at": "2026-04-15T11:00:00Z"
}
```

### Response 422 — 유효성 검사 실패

```json
{
  "error": "VALIDATION_ERROR",
  "message": "닉네임은 1자 이상 100자 이하여야 합니다."
}
```

---

## DELETE /api/v1/users/me

회원 탈퇴. 인증된 사용자 본인의 계정을 소프트 삭제하고 관련 개인 데이터를 정리한다.

**Authentication**: JWT 인증 필요

### Request

```
DELETE /api/v1/users/me
Authorization: Bearer {nextauth_jwt_token}
```

(Request body 없음)

### 처리 순서

1. JWT 토큰 검증 → `user_id` 추출
2. `watchlist` 테이블에서 해당 `user_id`의 모든 레코드 물리 삭제
3. `chat_messages` 테이블에서 해당 `user_id`를 NULL로 익명화 (`UPDATE ... SET user_id = NULL`)
4. `users` 테이블: `is_active = false`, `deleted_at = now()` 설정
5. 204 No Content 반환

### Response 204 — 탈퇴 성공

(응답 바디 없음)

### Response 401 — 미인증

```json
{
  "error": "UNAUTHORIZED",
  "message": "로그인이 필요합니다."
}
```

### Response 409 — 이미 탈퇴한 계정

```json
{
  "error": "ALREADY_DELETED",
  "message": "이미 탈퇴한 계정입니다."
}
```

---

## 환경변수 (공유 JWT_SECRET)

NextAuth.js와 FastAPI가 동일한 JWT_SECRET을 공유한다.

**Frontend (`.env.local`)**:
```env
NEXTAUTH_SECRET=your-shared-secret-here
NEXTAUTH_URL=http://localhost:3000
GOOGLE_CLIENT_ID=...
GOOGLE_CLIENT_SECRET=...
KAKAO_CLIENT_ID=...
KAKAO_CLIENT_SECRET=...
```

**Backend (`.env`)**:
```env
JWT_SECRET=your-shared-secret-here   # NEXTAUTH_SECRET과 동일한 값
```

> ⚠️ `JWT_SECRET`과 `NEXTAUTH_SECRET`은 반드시 동일한 값이어야 한다.
> 프로덕션에서는 최소 32자 이상의 랜덤 문자열 사용.

---

## NextAuth.js v5 콜백 구성 (프론트엔드)

```typescript
// frontend/src/auth.ts
export const { handlers, auth, signIn, signOut } = NextAuth({
  providers: [
    Google({ clientId: process.env.GOOGLE_CLIENT_ID! }),
    Kakao({ clientId: process.env.KAKAO_CLIENT_ID! }),
  ],
  callbacks: {
    async jwt({ token, account, profile }) {
      if (account) {
        // 최초 로그인: 백엔드에 verify 요청 → user_id 획득
        const res = await fetch(`${process.env.NEXTAUTH_BACKEND_URL}/api/v1/auth/verify`, {
          method: 'POST',
          headers: { Authorization: `Bearer ${token.access_token}` },
        });
        const data = await res.json();
        token.user_id = data.user_id;
        token.provider = account.provider;
      }
      return token;
    },
    async session({ session, token }) {
      session.user.user_id = token.user_id as string;
      session.user.provider = token.provider as string;
      return session;
    },
  },
});
```
