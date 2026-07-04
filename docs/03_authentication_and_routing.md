# Part 3: Authentication & Routing Flow

PharmaLedger implements an admin-provisioned identity model with role-based routing controls. This document details the session lifecycle and route guards.

---

## 🔒 Staff Provisioning & Role Access

There is **no registration page** in PharmaLedger. Users cannot sign themselves up. Instead:
- **First Admin Account**: Bootstrapped manually in the Firebase console (see [README.md](file:///c:/Users/JOSHUA%20ZAZA/Downloads/pharmaledger/README.md#L41-L56)).
- **Staff Accounts**: Created by logged-in admins from **Dashboard → Staff → Add Staff**, which calls `/api/users/create` to provision credentials.
- **Deactivation**: If an administrator changes a user's `active` field to `false` in Firestore:
  - Firestore security rules instantly block database queries for that user.
  - The client application automatically logs the user out.

---

## 🔑 Login Lifecycle Flow

```
+-------------+         +------------------+         +-------------------+
|  User enters|         |  Firebase Auth   |         | Fetch User Profile|
|  credentials| --------> authenticates ID  ---------> | from Firestore    |
+-------------+         +------------------+         +---------+---------+
                                                               |
                                                               | (Active & Approved)
                                                               v
+-------------+         +------------------+         +---------+---------+
| Redirect to | <-------| Set "pl_session" | <-------| Read Role         |
| Dashboard   |         | Cookie (30 days) |         | (Admin/Attendant) |
+-------------+         +------------------+         +-------------------+
```

1. **Submission**: The user enters their email and password at `/auth/login`.
2. **Client-Side Sign-In**: The client calls Firebase Auth SDK `signInWithEmailAndPassword()`.
3. **Deactivation Check**: Upon successful auth callback, the login page queries the `/users/{uid}` document.
   - If the user document has `active == false` or doesn't exist, the login fails, the Auth SDK signs out, and an error toast is displayed.
4. **Session Cookie**: If the profile is active, the application writes a lightweight cookie:
   `pl_session=1; path=/; max-age=2592000; SameSite=Lax`
   *(This cookie notifies Next.js Edge Middleware that a valid auth session exists.)*
5. **Redirection**: The user is redirected to `/dashboard`.

---

## 🔄 Authentication Context (`lib/AuthContext.tsx`)

The React state tree is wrapped in `AuthProvider`, which exposes:
- `user`: The current logged-in user profile (`AppUser | null`), containing `uid`, `email`, `displayName`, `role`, and `active`.
- `loading`: A boolean indicating whether the session is still loading.

### What the AuthProvider does in the background:
- It registers an `onAuthStateChanged()` listener.
- When a user logs in, it fetches their Firestore document `/users/{uid}`.
- **Active Listener**: If the database changes (e.g. an admin updates their profile role or deactivates their account), the state syncs in real-time. If they are deactivated, the provider deletes the session cookie, logs out, and redirects to `/auth/login`.

---

## 🚧 Route Guarding & Middleware

Route protection is enforced via a two-layer security guard system.

```
                              User requests page /dashboard/pos
                                              |
                                              v
                                  +-----------------------+
                                  | Next.js Edge          |
                                  | Middleware            |
                                  +-----------+-----------+
                                              |
                       +----------------------+----------------------+
                       | Has "pl_session" cookie?                    |
                       |                                             |
                       | NO                                          | YES
                       v                                             v
               +---------------+                             +---------------+
               | Redirect to   |                             | Forward to    |
               | /auth/login   |                             | Dashboard     |
               +---------------+                             +-------+-------+
                                                                     |
                                                                     v
                                                          +---------------------+
                                                          | AppShell Client-Side|
                                                          | Guard               |
                                                          +----------+----------+
                                                                     |
                                             +-----------------------+-----------------------+
                                             |                                               |
                                             | Attendant accessing Admin page?               |
                                             |                                               |
                                             | YES                                           | NO
                                             v                                               v
                                     +---------------+                               +---------------+
                                     | Redirect to   |                               | Render Page   |
                                     | /dashboard    |                               | Content       |
                                     +---------------+                               +---------------+
```

### Layer 1: Server Edge Middleware (`middleware.ts`)
- Runs at the server edge when paths matching `/dashboard/:path*` are requested.
- Because Firebase Auth credentials are saved in IndexedDB (which edge code cannot read), the middleware checks for the presence of the `pl_session` cookie.
- If the cookie is **missing**, it redirects the request to `/auth/login` instantly. This prevents the browser from downloading and showing a "flash" of the dashboard layout.

### Layer 2: Client Shell Guard (`components/shells/AppShell.tsx`)
- Once the page layout loads in the browser, the client-side `AppShell` verifies that `AuthContext.loading` is complete and `AuthContext.user` is defined.
- If `AuthContext.user` is null (e.g., they bypassed the cookie check), it redirects to `/auth/login`.
- **Role Restrictions**: If the user is an **attendant** and tries to load admin-only paths (like `/dashboard/users` or `/dashboard/settings`), the `AppShell` halts rendering and redirects them back to `/dashboard`.

---

## 🚪 Logout Lifecycle Flow

When a user clicks "Sign Out":
1. The app calls `auth.signOut()` on the client Firebase SDK.
2. The custom session cookie is removed by setting its expiration date to the past:
   `document.cookie = "pl_session=; path=/; max-age=0"`
3. The page resets and redirects back to `/auth/login`.
