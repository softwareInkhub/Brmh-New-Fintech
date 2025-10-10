# 🎨 Authentication Flow - Visual Diagrams

## 🔄 Complete Authentication Flow

```
┌──────────────────────────────────────────────────────────────────┐
│                    USER VISITS APP                                │
│              https://fintech.brmh.in                             │
└────────────────────────┬─────────────────────────────────────────┘
                         │
                         ▼
        ┌────────────────────────────────────┐
        │   MIDDLEWARE.TS (Server-Side)      │
        │   Check: httpOnly cookies exist?   │
        └────────┬────────────────────┬──────┘
                 │                    │
        Has Cookies              No Cookies
                 │                    │
                 │                    ▼
                 │    ┌───────────────────────────────┐
                 │    │   REDIRECT TO SSO             │
                 │    │   https://auth.brmh.in/login  │
                 │    └───────┬───────────────────────┘
                 │            │
                 │            ▼
                 │    ┌───────────────────────────────┐
                 │    │   USER LOGS IN                │
                 │    │   (Cognito Authentication)    │
                 │    └───────┬───────────────────────┘
                 │            │
                 │            ▼
                 │    ┌───────────────────────────────┐
                 │    │   SSO SETS COOKIES            │
                 │    │   (httpOnly + secure)         │
                 │    └───────┬───────────────────────┘
                 │            │
                 │            ▼
                 │    ┌───────────────────────────────┐
                 │    │   REDIRECT BACK               │
                 │    │   https://fintech.brmh.in     │
                 │    └───────┬───────────────────────┘
                 │            │
                 └────────────┴──────────┐
                                         │
                                         ▼
                         ┌───────────────────────────────┐
                         │   AUTHGUARD.TSX (Client-Side) │
                         │   Check: globalAuthChecked?   │
                         └───────┬───────────────────────┘
                                 │
                    ┌────────────┴────────────┐
                    │                         │
              Already Checked           First Time
                    │                         │
                    │                         ▼
                    │         ┌───────────────────────────────┐
                    │         │   CALL /auth/me               │
                    │         │   (with credentials:include)  │
                    │         └───────┬───────────────────────┘
                    │                 │
                    │                 ▼
                    │         ┌───────────────────────────────┐
                    │         │   RESPONSE: User Data         │
                    │         │   { sub, email, username }    │
                    │         └───────┬───────────────────────┘
                    │                 │
                    │                 ▼
                    │         ┌───────────────────────────────┐
                    │         │   FETCH ROLE FROM brmh-users  │
                    │         │   Filter by cognitoUsername   │
                    │         └───────┬───────────────────────┘
                    │                 │
                    │                 ▼
                    │         ┌───────────────────────────────┐
                    │         │   EXTRACT fintech ROLE        │
                    │         │   namespaceRoles.fintech      │
                    │         └───────┬───────────────────────┘
                    │                 │
                    │                 ▼
                    │         ┌───────────────────────────────┐
                    │         │   STORE IN localStorage       │
                    │         │   - userId                    │
                    │         │   - user_email                │
                    │         │   - cognitoUsername           │
                    │         │   - userRole                  │
                    │         │   - userPermissions           │
                    │         └───────┬───────────────────────┘
                    │                 │
                    │                 ▼
                    │         ┌───────────────────────────────┐
                    │         │   SET GLOBAL FLAGS            │
                    │         │   globalAuthChecked = true    │
                    │         │   globalIsAuthenticated=true  │
                    │         └───────┬───────────────────────┘
                    │                 │
                    └─────────────────┴─────────────┐
                                                    │
                                                    ▼
                                    ┌───────────────────────────────┐
                                    │   RENDER APP                  │
                                    │   User is authenticated       │
                                    │   Role is known               │
                                    │   Permissions enforced        │
                                    └───────────────────────────────┘
```

---

## 🔑 Role & Permission Flow

```
┌────────────────────────────────────────────────────────┐
│         USER AUTHENTICATED                              │
│         cognitoUsername: "Aditya_Kumar"                │
└─────────────────────┬──────────────────────────────────┘
                      │
                      ▼
      ┌───────────────────────────────────────┐
      │   QUERY brmh-users TABLE              │
      │   WHERE cognitoUsername = Aditya_Kumar│
      └───────────────┬───────────────────────┘
                      │
                      ▼
      ┌───────────────────────────────────────┐
      │   FOUND USER RECORD                   │
      │   Get: namespaceRoles                 │
      └───────────────┬───────────────────────┘
                      │
                      ▼
      ┌───────────────────────────────────────┐
      │   CHECK: namespaceRoles.fintech       │
      │   (current namespace)                 │
      └───────────────┬───────────────────────┘
                      │
        ┌─────────────┴─────────────┐
        │                           │
   Role Found                  Not Found
        │                           │
        ▼                           ▼
┌──────────────────┐      ┌──────────────────┐
│ Use DB Role      │      │ Use Default      │
│ {                │      │ {                │
│   role: "admin", │      │   role: "user",  │
│   permissions: [ │      │   permissions: [ │
│     "crud:all",  │      │     "read:own"   │
│     "assign:..."│      │   ]              │
│   ]              │      │ }                │
│ }                │      └──────────────────┘
└──────────────────┘
        │
        └─────────────┬─────────────┘
                      │
                      ▼
      ┌───────────────────────────────────────┐
      │   STORE IN localStorage               │
      │   - userRole: "admin"                 │
      │   - userPermissions: ["crud:all",...]│
      └───────────────┬───────────────────────┘
                      │
                      ▼
      ┌───────────────────────────────────────┐
      │   AVAILABLE IN useAuth() HOOK         │
      │   - user.role                         │
      │   - user.permissions                  │
      │   - hasPermission(perm)               │
      │   - isAdmin()                         │
      └───────────────────────────────────────┘
```

---

## 🎭 Multi-Namespace Support

```
Same User, Different Namespaces:

┌─────────────────────────────────────────────────────────┐
│  User: Aditya_Kumar                                     │
│  Email: adityabot69@gmail.com                           │
└────────────────────┬────────────────────────────────────┘
                     │
     ┌───────────────┼───────────────┬─────────────────┐
     │               │               │                 │
     ▼               ▼               ▼                 ▼
┌─────────┐   ┌──────────┐   ┌──────────┐   ┌──────────────┐
│  auth   │   │ fintech  │   │  drive   │   │ project mgmt │
│  viewer │   │  admin   │   │  editor  │   │    admin     │
└─────────┘   └──────────┘   └──────────┘   └──────────────┘
     │               │               │                 │
     ▼               ▼               ▼                 ▼
 read:all      crud:all       crud:own          crud:all
              assign:users     read:all        assign:users
              read:all                         read:all
```

**Each app checks its own namespace!**

---

## 🔐 Security Model

### **Production (fintech.brmh.in):**

```
┌─────────────────────────────────────────────────┐
│  BROWSER                                        │
│  ┌───────────────────────────────────────────┐ │
│  │  httpOnly Cookies (Set by auth.brmh.in)   │ │
│  │  ✅ access_token (httpOnly + secure)      │ │
│  │  ✅ id_token (httpOnly + secure)          │ │
│  │  ✅ NOT accessible to JavaScript          │ │
│  └───────────────────────────────────────────┘ │
│                                                  │
│  ┌───────────────────────────────────────────┐ │
│  │  localStorage (Accessible to JS)          │ │
│  │  ✅ User info (non-sensitive)             │ │
│  │  ✅ Role (not sensitive)                  │ │
│  │  ✅ Permissions (not sensitive)           │ │
│  │  ❌ NO TOKENS (secure!)                   │ │
│  └───────────────────────────────────────────┘ │
└─────────────────────────────────────────────────┘
```

### **Development (localhost:3000):**

```
┌─────────────────────────────────────────────────┐
│  BROWSER                                        │
│  ┌───────────────────────────────────────────┐ │
│  │  localStorage                             │ │
│  │  ✅ access_token (for dev only)           │ │
│  │  ✅ id_token (for dev only)               │ │
│  │  ✅ User info                             │ │
│  │  ✅ Role                                  │ │
│  │  ✅ Permissions                           │ │
│  │  ⚠️  Less secure (but OK for dev)         │ │
│  └───────────────────────────────────────────┘ │
└─────────────────────────────────────────────────┘
```

---

## 📊 Data Flow Diagram

```
AUTH FLOW:
──────────
auth.brmh.in
     │
     │ (Sets httpOnly cookies)
     ▼
fintech.brmh.in/middleware.ts
     │
     │ (Validates cookies)
     ▼
fintech.brmh.in/app/components/AuthGuard.tsx
     │
     ├─→ Call /auth/me (get user info)
     │
     ├─→ Query brmh-users table (get role)
     │
     ├─→ Extract fintech namespace role
     │
     └─→ Store in localStorage


PERMISSION FLOW:
────────────────
Component needs permission
     │
     ▼
usePermissions() hook
     │
     ├─→ Read userRole from localStorage
     │
     ├─→ Read userPermissions from localStorage
     │
     ├─→ Check hasPermission(permission)
     │
     └─→ Return true/false


UI UPDATES:
───────────
Navbar
  │
  ├─→ Read user.email (show in navbar)
  │
  ├─→ Read user.username (show in dropdown)
  │
  └─→ Read user.role (show badge with color)


DATA FILTERING:
───────────────
API Request
  │
  ├─→ Include userId in query
  │
  ├─→ Backend filters by userId
  │
  ├─→ If admin: return all data
  │
  └─→ If user: return only own data
```

---

## 🎯 Component Tree

```
app/layout.tsx
  └─ <ThemeProvider>
       └─ <GlobalTabProvider>
            └─ <AuthGuard>              ← AUTH CHECK HAPPENS HERE
                 └─ <AppLayoutClient>
                      ├─ <Sidebar>
                      ├─ <Navbar>        ← SHOWS USER ROLE
                      └─ {children}      ← PROTECTED ROUTES

All routes automatically protected!
No need for individual route guards!
```

---

## 🧩 Global Singleton Pattern

```
MODULE LOAD (First time page loads):
───────────────────────────────────
let globalAuthChecked = false;
let globalAuthChecking = false;
let globalIsAuthenticated = false;


COMPONENT MOUNT #1:
───────────────────
AuthGuard mounts
  │
  ▼
Check: globalAuthChecked? → false
  │
  ▼
Set: globalAuthChecking = true
  │
  ▼
Perform auth check...
  │
  ▼
Set: globalAuthChecked = true
Set: globalIsAuthenticated = true
  │
  ▼
Render app ✅


COMPONENT MOUNT #2 (e.g., page navigation):
───────────────────────────────────────────
AuthGuard mounts again
  │
  ▼
Check: globalAuthChecked? → TRUE!
  │
  ▼
Skip auth check (early return)
  │
  ▼
Use: globalIsAuthenticated → true
  │
  ▼
Render app immediately ✅

NO auth check, NO logs, NO delay!
```

---

## 🎨 UI States

### **Loading State:**

```
┌────────────────────────────────┐
│                                │
│      [Spinning Circle]         │
│                                │
│  Checking authentication...    │
│                                │
└────────────────────────────────┘
```

### **Authenticated State:**

```
┌────────────────────────────────────────────────┐
│  Navbar                                        │
│  ┌──────────────────────────────────────────┐ │
│  │  Brmh Fintech  │  [🔔]  user@email.com  │ │
│  │                                      [👤] │ │
│  └──────────────────────────────────────────┘ │
│                                                │
│  Content Area                                  │
│  ┌──────────────────────────────────────────┐ │
│  │  Dashboard / Banks / Tags / Reports      │ │
│  │                                          │ │
│  │  [Your app content here]                │ │
│  └──────────────────────────────────────────┘ │
└────────────────────────────────────────────────┘
```

### **Profile Dropdown (with role):**

```
┌────────────────────────────────┐
│  user@email.com                │
│  @username                     │
│  ┌──────────┐                  │
│  │  Admin   │ fintech          │ ← ROLE BADGE
│  └──────────┘                  │
│  ────────────────────────      │
│  🔍 Debug Auth                 │
│  ────────────────────────      │
│  Sign Out                      │
└────────────────────────────────┘
```

---

## 📦 Data Storage Visualization

```
┌─────────────────────────────────────────────────────────────┐
│  BROWSER STORAGE                                            │
│                                                             │
│  ┌─────────────────────────────────────────────────────┐   │
│  │  httpOnly COOKIES (Production Only)                 │   │
│  │  🔐 access_token (Set by auth.brmh.in)              │   │
│  │  🔐 id_token (Set by auth.brmh.in)                  │   │
│  │  ⚠️  NOT accessible to JavaScript!                  │   │
│  │  ✅ Automatically sent with fetch (credentials)     │   │
│  └─────────────────────────────────────────────────────┘   │
│                                                             │
│  ┌─────────────────────────────────────────────────────┐   │
│  │  localStorage (Both Dev & Prod)                     │   │
│  │  ┌─────────────────────────────────────────────┐   │   │
│  │  │  User Identity:                             │   │   │
│  │  │  • userId: "d4e8d4a8-5091..."             │   │   │
│  │  │  • user_email: "user@example.com"          │   │   │
│  │  │  • cognitoUsername: "Aditya_Kumar"         │   │   │
│  │  └─────────────────────────────────────────────┘   │   │
│  │  ┌─────────────────────────────────────────────┐   │   │
│  │  │  Role & Permissions:                        │   │   │
│  │  │  • userRole: "admin"                       │   │   │
│  │  │  • userPermissions: ["crud:all",...]       │   │   │
│  │  │  • namespaceRoles: { fintech: {...} }      │   │   │
│  │  └─────────────────────────────────────────────┘   │   │
│  │  ┌─────────────────────────────────────────────┐   │   │
│  │  │  Tokens (Dev Only):                         │   │   │
│  │  │  • access_token: "eyJhbGc..."              │   │   │
│  │  │  • id_token: "eyJhbGc..."                  │   │   │
│  │  └─────────────────────────────────────────────┘   │   │
│  └─────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────┘
```

---

## 🔄 Session Lifecycle

```
PAGE LOAD:
──────────
1. Middleware checks cookies         (Server)
2. AuthGuard checks globalAuthChecked (Client)
3. If not checked → Call /auth/me
4. Fetch role from brmh-users
5. Set globalAuthChecked = true
6. Render app

NAVIGATE TO NEW PAGE:
─────────────────────
1. Middleware checks cookies         (Server) ✅
2. AuthGuard checks globalAuthChecked (Client) ✅
3. globalAuthChecked = true → Skip!
4. Render page immediately

PAGE REFRESH:
─────────────
1. Global flags reset (page reload)
2. Back to "PAGE LOAD" flow
3. Auth check runs once
4. App renders

LOGOUT:
───────
1. User clicks "Sign Out"
2. Clear localStorage
3. Clear global flags
4. Redirect to: auth.brmh.in/login (logout endpoint doesn't exist)
5. User can login again or stay on login page
6. After login: Redirect to: fintech.brmh.in
7. No cookies → Redirect to login
```

---

## 🎯 Permission Check Flow

```
Component Render:
─────────────────
<CreateBankButton />
        │
        ▼
const { canCreate } = usePermissions();
        │
        ▼
Read: localStorage.getItem('userPermissions')
        │
        ▼
Parse: ["crud:all", "assign:users", "read:all"]
        │
        ▼
Check: includes("crud:all") OR includes("crud:own")?
        │
    ┌───┴───┐
    │       │
   YES     NO
    │       │
    ▼       ▼
 Show    Hide
Button  Button
```

---

## 🎊 Summary Visualization

```
┌───────────────────────────────────────────────────────────────┐
│                 BEFORE (Old System)                           │
├───────────────────────────────────────────────────────────────┤
│  ❌ Local authentication (insecure)                          │
│  ❌ No role management                                       │
│  ❌ No permission system                                     │
│  ❌ Hardcoded admin checks                                   │
│  ❌ No centralized auth                                      │
└───────────────────────────────────────────────────────────────┘

                            ▼ ▼ ▼

┌───────────────────────────────────────────────────────────────┐
│                  AFTER (New System)                           │
├───────────────────────────────────────────────────────────────┤
│  ✅ Centralized SSO (auth.brmh.in)                           │
│  ✅ httpOnly cookies (secure)                                │
│  ✅ Namespace-based roles (from brmh-users table)            │
│  ✅ Dynamic permissions (crud:all, read:all, etc.)           │
│  ✅ Global singleton (no re-render loops)                    │
│  ✅ Debug tools (/debug-auth, /test-cookies)                 │
│  ✅ Role UI (shows in navbar)                                │
│  ✅ Permission hooks (usePermissions)                        │
│  ✅ Clean console (15 logs once, then silence)               │
│  ✅ Professional UX                                           │
└───────────────────────────────────────────────────────────────┘
```

---

**🎊 Your authentication system is now enterprise-grade!**

Deploy with confidence using `DEPLOY_SSO_AUTH.md` 🚀

