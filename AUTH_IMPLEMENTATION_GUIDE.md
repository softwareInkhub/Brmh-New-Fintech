# 🔐 BRMH Fintech SSO Authentication Implementation

## 📋 Overview

This document explains the complete SSO authentication flow implemented for BRMH Fintech (`fintech.brmh.in`).

**Key Features:**
- ✅ Centralized SSO via `auth.brmh.in`
- ✅ httpOnly cookies for production security
- ✅ Namespace-based role & permission system
- ✅ Automatic role fetching from `brmh-users` table
- ✅ Global singleton pattern (no re-render loops!)
- ✅ Development & production support

---

## 🏗️ Architecture

### **Authentication Flow**

```
User visits fintech.brmh.in
        ↓
AuthGuard checks authentication
        ↓
Production: Check httpOnly cookies → Call /auth/me
Development: Check localStorage + URL hash → Call /auth/validate
        ↓
If authenticated:
  1. Store user info (email, username, userId)
  2. Fetch role from brmh-users table
  3. Extract fintech namespace role & permissions
  4. Store in localStorage
  5. Render app
        ↓
If not authenticated:
  Redirect to https://auth.brmh.in/login
```

---

## 🔑 Namespace & Roles

### **Namespace: `fintech`**

The app operates in the `fintech` namespace. User roles are stored in the `brmh-users` DynamoDB table.

### **User Schema (brmh-users table)**

```typescript
{
  userId: string;
  cognitoUsername: string;
  email: string;
  namespaceRoles: {
    fintech: {
      role: 'admin' | 'editor' | 'viewer' | 'user';
      permissions: string[];
      assignedBy: string;
      assignedAt: string;
      updatedAt?: string;
    };
    // Other namespaces...
  };
  metadata: {
    lastLogin: string;
    loginCount: number;
    // ...
  };
  status: 'active' | 'inactive';
  createdAt: string;
  updatedAt: string;
}
```

### **Role Hierarchy**

| Role | Permissions | Description |
|------|-------------|-------------|
| **admin** | `crud:all`, `assign:users`, `read:all` | Full access to all features |
| **editor** | `crud:own`, `read:all` | Can create/edit own data, read all |
| **viewer** | `read:all` | Read-only access to all data |
| **user** (default) | `read:own` | Can only access own data |

### **Permission Checks**

```typescript
// In components:
const { user, hasPermission, isAdmin } = useAuth();

// Check specific permission
if (hasPermission('crud:all')) {
  // Show create/edit/delete buttons
}

// Check if admin
if (isAdmin()) {
  // Show admin-only features
}

// User object
user.role // 'admin' | 'editor' | 'viewer' | 'user'
user.permissions // ['crud:all', 'assign:users', 'read:all']
```

---

## 📁 Files Modified/Created

### **Created Files:**

1. ✅ `middleware.ts` - Server-side auth check with cookie validation
2. ✅ `app/components/AuthGuard.tsx` - Client-side auth guard with role fetching
3. ✅ `app/debug-auth/page.tsx` - Debug page for troubleshooting
4. ✅ `app/test-cookies/page.tsx` - Test page for cookie functionality
5. ✅ `AUTH_IMPLEMENTATION_GUIDE.md` - This documentation

### **Modified Files:**

1. ✅ `app/layout.tsx` - Added AuthGuard wrapper
2. ✅ `app/hooks/useAuth.ts` - Updated with role/permission support
3. ✅ `app/components/AuthWrapper.tsx` - Simplified (auth now in AuthGuard)
4. ✅ `app/components/Navbar.tsx` - Shows user role & username
5. ✅ `app/login-signup/page.tsx` - Redirects to SSO
6. ✅ `app/page.tsx` - Global singleton redirect
7. ✅ `.env` - Added namespace configuration

---

## 🌐 Environment Variables

```env
# Backend URL
NEXT_PUBLIC_BACKEND_URL=https://brmh.in
BRMH_BACKEND_URL=https://brmh.in

# Namespace Configuration
NEXT_PUBLIC_NAMESPACE=fintech
NAMESPACE=fintech

# Default Role & Permissions
NEXT_PUBLIC_DEFAULT_ROLE=user
NEXT_PUBLIC_DEFAULT_PERMISSIONS=read:own

# Admin Email (for backward compatibility)
ADMIN_EMAIL=mohit@gmail.com
NEXT_PUBLIC_ADMIN_EMAIL=mohit@gmail.com
```

---

## 🔐 Authentication Endpoints

### **Production (`fintech.brmh.in`):**

```typescript
// Check authentication (with httpOnly cookies)
GET https://brmh.in/auth/me
Headers: credentials: 'include'
Response: { user: { sub, email, cognito:username, ... } }

// Fetch user role
GET https://brmh.in/crud?tableName=brmh-users&FilterExpression=cognitoUsername = :username&:username=VALUE
Headers: credentials: 'include'
Response: { items: [{ namespaceRoles: { fintech: { role, permissions } } }] }
```

### **Development (`localhost:3000`):**

```typescript
// Validate tokens from localStorage
GET http://localhost:5001/auth/validate
Headers: Authorization: Bearer ACCESS_TOKEN
Response: { user: { ... } }

// Fetch user role (same as production)
GET http://localhost:5001/crud?tableName=brmh-users&FilterExpression=cognitoUsername = :username&:username=VALUE
Headers: Authorization: Bearer ACCESS_TOKEN
Response: { items: [{ namespaceRoles: { fintech: { role, permissions } } }] }
```

---

## 💾 LocalStorage Schema

After successful authentication, the following data is stored:

```typescript
localStorage = {
  // User Identity
  userId: string;              // Cognito user ID (sub)
  user_email: string;           // User email
  user_name: string;            // Cognito username
  cognitoUsername: string;      // Cognito username (same as user_name)
  
  // Role & Permissions
  userRole: string;             // 'admin' | 'editor' | 'viewer' | 'user'
  userPermissions: string;      // JSON array: ["crud:all", "assign:users", ...]
  namespaceRoles: string;       // JSON object: { fintech: {...}, projectmanagement: {...} }
  
  // Tokens (development only)
  access_token: string;         // Only in dev, not in production
  id_token: string;             // Only in dev, not in production
  
  // User Object (full)
  user: string;                 // JSON: { sub, email, username, email_verified }
}
```

---

## 🎯 How It Works

### **1. Global Singleton Pattern**

```typescript
// In AuthGuard.tsx
let globalAuthChecked = false;
let globalAuthChecking = false;
let globalIsAuthenticated = false;

// These persist across:
// - Component re-renders ✅
// - Component unmounts/remounts ✅
// - Page navigation ✅
// - Only reset on hard page refresh ✅
```

**Benefits:**
- Auth check runs ONCE per session
- No re-render loops
- Clean console logs
- Fast, stable app

### **2. Production Flow (httpOnly Cookies)**

```typescript
// Step 1: AuthGuard calls /auth/me
const response = await fetch('https://brmh.in/auth/me', {
  credentials: 'include', // Sends httpOnly cookies
});

// Step 2: Backend validates cookies, returns user data
const userData = await response.json();
// { user: { sub, email, cognito:username, ... } }

// Step 3: Fetch role from brmh-users table
const roleResponse = await fetch(
  `https://brmh.in/crud?tableName=brmh-users&FilterExpression=cognitoUsername = :username&:username=${userData.user['cognito:username']}`,
  { credentials: 'include' }
);

// Step 4: Extract fintech namespace role
const roleData = await roleResponse.json();
const fintechRole = roleData.items[0].namespaceRoles.fintech;
// { role: 'admin', permissions: ['crud:all', 'assign:users', 'read:all'] }

// Step 5: Store everything in localStorage
localStorage.setItem('userRole', fintechRole.role);
localStorage.setItem('userPermissions', JSON.stringify(fintechRole.permissions));

// Step 6: Set authenticated and render app!
globalIsAuthenticated = true;
```

### **3. Development Flow (localStorage Tokens)**

```typescript
// Step 1: Check URL hash for tokens (from SSO redirect)
const hash = window.location.hash;
// #access_token=xxx&id_token=yyy

// Step 2: Parse and store tokens
const params = new URLSearchParams(hash.substring(1));
localStorage.setItem('access_token', params.get('access_token'));
localStorage.setItem('id_token', params.get('id_token'));

// Step 3: Parse ID token for user info
const idToken = params.get('id_token');
const payload = JSON.parse(atob(idToken.split('.')[1]));
localStorage.setItem('userId', payload.sub);
localStorage.setItem('user_email', payload.email);
localStorage.setItem('cognitoUsername', payload['cognito:username']);

// Step 4: Validate with backend
const response = await fetch('http://localhost:5001/auth/validate', {
  headers: { 'Authorization': `Bearer ${accessToken}` }
});

// Step 5: Fetch role (same as production)
const roleResponse = await fetch(
  `http://localhost:5001/crud?tableName=brmh-users&FilterExpression=cognitoUsername = :username&:username=${payload['cognito:username']}`,
  { headers: { 'Authorization': `Bearer ${accessToken}` } }
);

// Step 6: Store role and render
```

---

## 🧪 Testing

### **Test URLs:**

1. **Debug Auth:** `https://fintech.brmh.in/debug-auth`
   - Shows all auth state
   - Tests all endpoints
   - Shows role data from brmh-users table
   - Copy debug info for support

2. **Test Cookies:** `https://fintech.brmh.in/test-cookies`
   - Tests cookie functionality
   - Tests /auth/me endpoint
   - Shows pass/fail status

### **Expected Console Output (Production):**

```
[Fintech Middleware] ✅ User authenticated via SSO cookies
[Fintech AuthGuard] 🔍 Starting authentication check...
[Fintech AuthGuard] 🌐 API Base URL: https://brmh.in (production)
[Fintech AuthGuard] 📍 Current URL: https://fintech.brmh.in/
[Fintech AuthGuard] 🌐 Production: Using /auth/me for cookie-based authentication...
[Fintech AuthGuard] 📡 Response status: 200 OK
[Fintech AuthGuard] ✅ Authenticated via cookies! User: user@example.com
[Fintech AuthGuard] 🔍 Fetching user role from brmh-users table...
[Fintech AuthGuard] ✅ User role in fintech namespace: admin
[Fintech AuthGuard] ✅ Permissions: ["crud:all","assign:users","read:all"]
[Fintech AuthGuard] 🎉 Cookie-based authentication successful!

(Then silence - no more logs!)
```

---

## 🚀 Deployment

### **Vercel Configuration**

The app is configured to deploy to:
- **Production URL:** `https://fintech.brmh.in`
- **Platform:** Vercel
- **Framework:** Next.js 15

### **Deploy Command:**

```bash
cd Brmh-New-Fintech

git add middleware.ts app/components/AuthGuard.tsx app/debug-auth/ app/test-cookies/ app/layout.tsx app/hooks/useAuth.ts app/components/AuthWrapper.tsx app/components/Navbar.tsx app/login-signup/page.tsx app/page.tsx .env AUTH_IMPLEMENTATION_GUIDE.md

git commit -m "Implement SSO authentication with namespace-based roles"

git push origin main
```

### **Vercel Environment Variables**

Ensure these are set in Vercel dashboard:

```
NEXT_PUBLIC_BACKEND_URL=https://brmh.in
BRMH_BACKEND_URL=https://brmh.in
NEXT_PUBLIC_NAMESPACE=fintech
NAMESPACE=fintech
NEXT_PUBLIC_DEFAULT_ROLE=user
NEXT_PUBLIC_DEFAULT_PERMISSIONS=read:own
ADMIN_EMAIL=mohit@gmail.com
NEXT_PUBLIC_ADMIN_EMAIL=mohit@gmail.com
```

---

## ✅ Verification Checklist

After deployment:

- [ ] Visit `https://fintech.brmh.in` - should redirect to `auth.brmh.in/login`
- [ ] Login with Cognito credentials
- [ ] Should redirect back to `fintech.brmh.in`
- [ ] App loads smoothly (no blinking)
- [ ] User info shows in navbar (email, username, role)
- [ ] Console shows ~15 log lines, then silence
- [ ] Navigate between tabs - smooth, no new auth checks
- [ ] Refresh page - works perfectly
- [ ] `/debug-auth` shows all green checkmarks
- [ ] Role badge shows correct role (admin/editor/viewer/user)

---

## 🔍 Debugging

### **If auth fails:**

1. **Visit:** `https://fintech.brmh.in/debug-auth`
2. **Check:**
   - Environment info
   - localStorage values
   - Cookie values
   - /auth/me response
   - brmh-users table response
3. **Copy debug info** and share for support

### **Common Issues:**

| Issue | Cause | Fix |
|-------|-------|-----|
| Infinite redirect loop | Cookies not being sent | Check CORS, credentials: 'include' |
| Screen blinking | Component re-mounting | Already fixed with global singleton |
| Role not showing | Not in brmh-users table | Add user to table with fintech namespace role |
| Permission denied | Wrong role in fintech namespace | Update namespaceRoles.fintech in brmh-users |
| Console spam | Multiple auth checks | Already fixed with global singleton |

---

## 📊 Role Management

### **Adding Users to brmh-users Table**

Users are automatically created in brmh-users table on first login, but roles must be assigned manually or via admin panel.

### **Default Role:**

If a user is NOT found in brmh-users table, they get:
```typescript
{
  role: 'user',
  permissions: ['read:own']
}
```

### **Assigning Roles:**

Update the `namespaceRoles` field in DynamoDB:

```json
{
  "namespaceRoles": {
    "fintech": {
      "role": "admin",
      "permissions": ["crud:all", "assign:users", "read:all"],
      "assignedBy": "system",
      "assignedAt": "2025-10-10T00:00:00.000Z"
    }
  }
}
```

---

## 🎯 Integration with Existing Code

### **Protecting Routes:**

All routes are automatically protected by AuthGuard. No need for individual route protection.

### **Checking Permissions in Components:**

```typescript
import { useAuth } from '@/app/hooks/useAuth';

export default function MyComponent() {
  const { user, hasPermission, isAdmin } = useAuth();

  if (!hasPermission('crud:all')) {
    return <div>You don't have permission to access this feature</div>;
  }

  return (
    <div>
      {/* Your protected content */}
      {isAdmin() && (
        <button>Admin Only Action</button>
      )}
    </div>
  );
}
```

### **API Route Protection:**

```typescript
// In API routes
export async function POST(request: Request) {
  const { userId } = await request.json();
  
  // Get user role from request or fetch from brmh-users
  const userRole = request.headers.get('x-user-role');
  
  if (userRole !== 'admin') {
    return NextResponse.json(
      { error: 'Only admins can perform this action' },
      { status: 403 }
    );
  }
  
  // Proceed with admin action
}
```

---

## 🎓 Key Technical Concepts

### **1. httpOnly Cookies**

- Set by server (`auth.brmh.in`)
- Cannot be accessed by JavaScript
- Automatically sent with requests (`credentials: 'include'`)
- Secure against XSS attacks

### **2. Global Singleton Pattern**

- Variables outside React component
- Persist across component lifecycle
- Prevent re-initialization
- Perfect for one-time auth checks

### **3. Namespace Isolation**

- Each app has its own namespace (fintech, projectmanagement, auth, etc.)
- Users can have different roles in different namespaces
- Roles are checked at runtime based on namespace

---

## 📞 Support

**If you encounter issues:**

1. Visit `/debug-auth` for comprehensive debug info
2. Check console for `[Fintech AuthGuard]` and `[Fintech Middleware]` logs
3. Verify brmh-users table has your user with fintech namespace role
4. Ensure Vercel environment variables are set correctly
5. Clear browser cache and try incognito window

---

## ✨ Summary

**What This Implementation Provides:**

- ✅ Secure, centralized authentication
- ✅ Automatic role & permission management
- ✅ No configuration needed for users
- ✅ Works seamlessly in dev & production
- ✅ Clean console, stable app
- ✅ Professional UX
- ✅ Easy to extend with new namespaces

**Admin tasks:**
- Add users to brmh-users table
- Assign roles in fintech namespace
- Manage permissions as needed

**User experience:**
- Click "Login" → Redirect to auth.brmh.in
- Enter credentials → Redirect back
- App loads → Role automatically fetched
- Use app with appropriate permissions

---

**🎊 Authentication is now fully integrated and production-ready!**

