# 🚀 Deploy SSO Authentication - Quick Guide

## ✅ What's Implemented

1. ✅ **SSO Integration** - Uses `auth.brmh.in` for centralized login
2. ✅ **httpOnly Cookies** - Secure authentication in production
3. ✅ **Namespace Roles** - Fetches user role from `brmh-users` table
4. ✅ **Global Singleton** - No re-render loops or console spam
5. ✅ **Debug Tools** - `/debug-auth` and `/test-cookies` pages
6. ✅ **Role UI** - Shows user role in navbar dropdown

---

## 📋 Pre-Deployment Checklist

### **1. Vercel Environment Variables**

Go to Vercel dashboard → Settings → Environment Variables

Add these:

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

### **2. Custom Domain**

Ensure `fintech.brmh.in` is configured in Vercel:
- Go to Settings → Domains
- Add `fintech.brmh.in`
- Update DNS records as instructed

---

## 🚀 Deploy Command (One Line)

```bash
cd Brmh-New-Fintech && git add middleware.ts app/components/AuthGuard.tsx app/debug-auth/ app/test-cookies/ app/layout.tsx app/hooks/useAuth.ts app/components/AuthWrapper.tsx app/components/Navbar.tsx app/login-signup/page.tsx app/page.tsx .env AUTH_IMPLEMENTATION_GUIDE.md DEPLOY_SSO_AUTH.md && git commit -m "Implement SSO auth with namespace roles from brmh-users table" && git push origin main
```

---

## 🧪 Test After Deployment

### **Step 1: Clear Cache**

Open incognito window or clear cache:
```
Hard Refresh: Ctrl+Shift+R (Windows) or Cmd+Shift+R (Mac)
```

### **Step 2: Test Login Flow**

1. Visit: `https://fintech.brmh.in`
2. Should redirect to: `https://auth.brmh.in/login`
3. Login with your Cognito credentials
4. Should redirect back to: `https://fintech.brmh.in`
5. App should load smoothly

### **Step 3: Verify Console**

Open browser console (F12), should see:

```
[Fintech Middleware] ✅ User authenticated via SSO cookies
[Fintech AuthGuard] 🔍 Starting authentication check...
[Fintech AuthGuard] ✅ Authenticated via cookies! User: your@email.com
[Fintech AuthGuard] 🔍 Fetching user role from brmh-users table...
[Fintech AuthGuard] ✅ User role in fintech namespace: admin
[Fintech AuthGuard] 🎉 Cookie-based authentication successful!

(Then complete silence - no more logs!)
```

**Total logs:** ~10-15 lines, then NOTHING

### **Step 4: Verify UI**

- ✅ User email in navbar (top right)
- ✅ Click profile → See username & role badge
- ✅ Navigate tabs → Smooth, no console logs
- ✅ Refresh page → Loads cleanly once
- ✅ No screen blinking
- ✅ No infinite redirects

### **Step 5: Test Debug Page**

Visit: `https://fintech.brmh.in/debug-auth`

All sections should show:
- ✅ Environment: Production mode
- ✅ localStorage: Has userId, email, role, permissions
- ✅ Cookies: auth_valid=true
- ✅ /auth/me: Status 200, user data present
- ✅ brmh-users: Status 200, namespace role found

---

## 🔑 User Role Setup

### **Adding Users to brmh-users Table**

Users must exist in `brmh-users` table with appropriate namespace roles.

**Example user record:**

```json
{
  "userId": "d4e8d4a8-5091-7079-5174-639ccb295849",
  "cognitoUsername": "Aditya_Kumar",
  "email": "adityabot69@gmail.com",
  "namespaceRoles": {
    "fintech": {
      "role": "admin",
      "permissions": ["crud:all", "assign:users", "read:all"],
      "assignedBy": "system",
      "assignedAt": "2025-10-10T00:00:00.000Z"
    }
  },
  "status": "active",
  "createdAt": "2025-10-10T09:51:12.948Z"
}
```

### **Quick Role Assignment (AWS CLI):**

```bash
aws dynamodb update-item \
  --table-name brmh-users \
  --key '{"userId":{"S":"USER_ID_HERE"}}' \
  --update-expression 'SET namespaceRoles.fintech = :role' \
  --expression-attribute-values '{
    ":role": {
      "M": {
        "role": {"S": "admin"},
        "permissions": {"L": [
          {"S": "crud:all"},
          {"S": "assign:users"},
          {"S": "read:all"}
        ]},
        "assignedBy": {"S": "system"},
        "assignedAt": {"S": "2025-10-10T00:00:00.000Z"}
      }
    }
  }'
```

---

## 🎯 Success Metrics

| Metric | Before | After | Status |
|--------|--------|-------|--------|
| Auth method | Local (insecure) | Centralized SSO | ✅ |
| Cookie security | None | httpOnly cookies | ✅ |
| Role management | Hardcoded | Dynamic from DB | ✅ |
| Console logs | Many | ~15 once, then silence | ✅ |
| Screen stability | May blink | Completely stable | ✅ |
| Redirect loops | Possible | Prevented | ✅ |
| Developer experience | Complex | Simple | ✅ |

---

## 🆘 Troubleshooting

### **Issue: Can't login in production**

**Solution:**
1. Visit `/debug-auth`
2. Check if `/auth/me` returns 200 OK
3. If not, check if cookies are being sent
4. Try incognito window (clear cache)

### **Issue: Role not showing**

**Solution:**
1. Visit `/debug-auth`
2. Check `brmh-users` endpoint section
3. Verify user exists in table
4. Verify `namespaceRoles.fintech` is set
5. If not, add user to table with role

### **Issue: Permission denied**

**Solution:**
1. Check user role in navbar dropdown
2. Check user permissions in `/debug-auth`
3. Update role in brmh-users table
4. Logout and login again

### **Issue: Console spam**

**Solution:**
- This should NOT happen with global singleton
- If it does, hard refresh (Ctrl+Shift+R)
- Clear localStorage and login again

---

## 📖 Additional Documentation

- **`AUTH_IMPLEMENTATION_GUIDE.md`** - Full technical documentation
- **`/debug-auth`** - Live debug information
- **`/test-cookies`** - Cookie functionality tests

---

## ⚡ Quick Commands

### **Deploy:**
```bash
cd Brmh-New-Fintech && git add -A && git commit -m "SSO auth with namespace roles" && git push origin main
```

### **Test Locally:**
```bash
npm run dev
# Visit: http://localhost:3000
# Will redirect to: http://localhost:5000/login
```

### **Clear Local Storage (in browser console):**
```javascript
localStorage.clear();
location.reload();
```

---

## 🎊 That's It!

Your app now has:
- ✅ Secure, centralized authentication
- ✅ Role-based access control
- ✅ Namespace isolation
- ✅ Clean, professional UX
- ✅ Easy debugging tools

**Deploy and test now!** 🚀

---

**Questions?** Check `/debug-auth` or read `AUTH_IMPLEMENTATION_GUIDE.md`

