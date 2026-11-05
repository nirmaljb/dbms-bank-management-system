# Authentication System Specification

## Overview
A lightweight authentication system for the Bank Management platform consisting of an Express TypeScript backend and a Next.js frontend with clean UI, backed by NeonDB (PostgreSQL).

---

## 1. Architecture

- **Backend**: Express + TypeScript in `apps/server` (port `5001`).
- **Frontend**: Next.js 16 (App Router) + React 19 + Tailwind CSS in `apps/web` (port `3000`).
- **Database**: NeonDB PostgreSQL accessed with `pg` (node-postgres). See [ADR 0002](./adr/0002-banking-logic-in-postgres.md).
- **Session Transport**: Signed JWT transmitted via HTTP-only, `SameSite=Lax` cookies.
- **Proxy**: Next.js rewrite rule (`/api/:path*` -> `http://localhost:5001/api/:path*`) to avoid CORS/cookie domain mismatch in development.

---

## 2. Domain Entities

See [CONTEXT.md](../CONTEXT.md) for canonical terminology.

### User
```typescript
interface User {
  id: string; // UUID primary key
  name: string;
  email: string; // Unique
  passwordHash: string; // bcrypt hash
  role: 'customer' | 'admin'; // Defaults to 'customer'
  createdAt: Date;
  updatedAt: Date;
}
```

---

## 3. API Endpoints

### `POST /api/auth/signup`
- **Request Body**:
  ```json
  {
    "name": "Jane Doe",
    "email": "jane@example.com",
    "password": "securePassword123"
  }
  ```
- **Validation**:
  - `name`: string, min 2 chars.
  - `email`: valid email format, must not already exist in database.
  - `password`: string, min 8 chars.
- **Response (201 Created)**:
  - Header: `Set-Cookie: token=<jwt>; HttpOnly; Path=/; SameSite=Lax`
  - Body:
    ```json
    {
      "user": {
        "id": "uuid",
        "name": "Jane Doe",
        "email": "jane@example.com",
        "role": "customer"
      }
    }
    ```

### `POST /api/auth/login`
- **Request Body**:
  ```json
  {
    "email": "jane@example.com",
    "password": "securePassword123"
  }
  ```
- **Response (200 OK)**:
  - Header: `Set-Cookie: token=<jwt>; HttpOnly; Path=/; SameSite=Lax`
  - Body: User profile object.
- **Error (401 Unauthorized)**:
  - Generic message: `"Invalid email or password"`

### `POST /api/auth/logout`
- **Response (200 OK)**:
  - Header: `Set-Cookie: token=; HttpOnly; Path=/; Max-Age=0`
  - Body: `{"message": "Logged out successfully"}`

### `GET /api/auth/me`
- **Auth**: Protected (requires valid `token` cookie).
- **Response (200 OK)**:
  - Body: Current authenticated user details.
- **Error (401 Unauthorized)**:
  - `{"error": "Unauthorized"}`

---

## 4. Frontend Specifications (`apps/web`)

1. **`/login` Page**:
   - Card layout with email and password inputs.
   - Client-side validation with error callouts.
   - Redirects to `/dashboard` upon successful login.
   - Link to `/signup`.

2. **`/signup` Page**:
   - Card layout with full name, email, and password inputs.
   - Redirects to `/dashboard` upon successful registration.
   - Link to `/login`.

3. **`/dashboard` Protected View**:
   - Route verification checking session via `/api/auth/me`.
   - Displays user greeting, role badge, email, and active status.
   - Prominent **Logout** action triggering cookie invalidation and redirecting to `/login`.

---

## 5. Database Schema & Migration

- **Schema definition**: plain SQL files in `apps/server/db/sql/`, applied in filename order.
- **Sync mechanism**: `npm run db:setup --workspace=apps/server` (idempotent; `-- --reset` drops and rebuilds).
- **Config**: `DATABASE_URL` from `apps/server/.env`. Superseded in detail by [BANKING-SPEC.md](./BANKING-SPEC.md).
