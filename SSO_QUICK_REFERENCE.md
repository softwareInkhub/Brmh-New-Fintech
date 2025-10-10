# 🎯 SSO Authentication - Quick Reference Card

## 🔐 Authentication Flow

```
fintech.brmh.in → auth.brmh.in/login → Back to fintech.brmh.in (authenticated)
```

---

## 🎫 User Role in fintech Namespace

| Role | Permissions | What They Can Do |
|------|-------------|------------------|
| **admin** | crud:all, assign:users, read:all | Everything |
| **editor** | crud:own, read:all | Edit own data, view all |
| **viewer** | read:all | Read-only access |
| **user** | read:own | Only their own data |

---

## 💾 LocalStorage After Login

```typescript
userId           // Cognito user ID
user_email       // User email
user_name        // Cognito username
cognitoUsername  // Cognito username
userRole         // 'admin' | 'editor' | 'viewer' | 'user'
userPermissions  // JSON: ["crud:all", ...]
namespaceRoles   // JSON: { fintech: {...}, ... }
```

---

## 🛠️ Using in Components

```typescript
import { useAuth } from '@/app/hooks/useAuth';

const { user, hasPermission, isAdmin } = useAuth();

// Check permission
if (hasPermission('crud:all')) {
  // Show button
}

// Check if admin
if (isAdmin()) {
  // Admin-only feature
}

// User info
user.email       // Email address
user.username    // Cognito username
user.role        // Current role
user.permissions // Array of permissions
```

---

## 🧪 Debug Pages

| URL | Purpose |
|-----|---------|
| `/debug-auth` | Full debug info + test all endpoints |
| `/test-cookies` | Test cookie functionality |

---

## 📡 API Endpoints

### **Production:**
```
/auth/me          → Get user from cookies
/crud?tableName=  → Get user role from brmh-users
```

### **Development:**
```
/auth/validate    → Validate Bearer token
/crud?tableName=  → Get user role from brmh-users
```

---

## 🔧 Environment Variables

```env
NEXT_PUBLIC_BACKEND_URL=https://brmh.in
NEXT_PUBLIC_NAMESPACE=fintech
NEXT_PUBLIC_DEFAULT_ROLE=user
```

---

## 🚀 Deploy Command

```bash
cd Brmh-New-Fintech && git add -A && git commit -m "SSO auth with namespace roles" && git push origin main
```

---

## ✅ Test Checklist

- [ ] Login works
- [ ] Role shows in navbar
- [ ] Console shows ~15 lines, then silence
- [ ] `/debug-auth` all green
- [ ] Navigate tabs - no new logs
- [ ] Refresh - works cleanly

---

## 🆘 Quick Fixes

**Can't login:**
→ Visit `/debug-auth`, check /auth/me response

**No role showing:**
→ Check brmh-users table for your cognitoUsername

**Permission denied:**
→ Update namespaceRoles.fintech in brmh-users table

**Console spam:**
→ Hard refresh (Ctrl+Shift+R)

---

## 📞 Files to Check

| File | Purpose |
|------|---------|
| `middleware.ts` | Server-side cookie check |
| `app/components/AuthGuard.tsx` | Client-side auth + role fetch |
| `app/hooks/useAuth.ts` | Auth hook with permissions |
| `app/components/Navbar.tsx` | Shows user + role |

---

**🎉 Everything's ready! Deploy now!**

Read `AUTH_IMPLEMENTATION_GUIDE.md` for full details.

