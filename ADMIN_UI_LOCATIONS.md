# 📍 Admin UI & Features Locations in Codebase

This document shows you **exactly where** admin features are implemented in the codebase - both UI elements and backend checks.

---

## 🎨 Frontend - Admin UI Elements

### 1. **Navbar** (`app/components/Navbar.tsx`)

**Location**: Lines 115-130

**What's shown**: Admin role badge with purple styling

```typescript
// Line 118-127
{user?.role && (
  <div className="mt-2 flex items-center gap-2">
    <span className={`px-2 py-1 rounded text-xs font-semibold ${
      user.role === 'admin' ? 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-300' :
      user.role === 'editor' ? 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300' :
      'bg-gray-100 text-gray-700 dark:bg-gray-700 dark:text-gray-300'
    }`}>
      {user.role.charAt(0).toUpperCase() + user.role.slice(1)}
    </span>
  </div>
)}
```

**Admin Feature**: 
- ✅ Purple badge showing "Admin" role
- ✅ Visible in user dropdown menu
- ✅ Shows namespace (fintech)

---

### 2. **Banks Overview Page** (`app/banks/BanksTabsClient.tsx`)

#### A. **Create/Edit Bank Buttons on Bank Cards**

**Location**: Lines 601-618

**What's shown**: Edit and Delete buttons on hover over bank cards

```typescript
// Lines 601-618
{user?.email === adminEmail && (
  <div className="absolute top-3 right-3 flex gap-1 opacity-0 group-hover:opacity-100 transition-all duration-200 z-10">
    <button
      className="p-1.5 bg-white/90 backdrop-blur-sm hover:bg-blue-50 rounded-lg shadow border border-gray-200 hover:scale-110 transition-all duration-200"
      onClick={e => { e.stopPropagation(); handleEditBank(bank); }}
      title="Edit Bank"
    >
      <RiEdit2Line className="text-blue-600" size={14} />
    </button>
    <button
      className="p-1.5 bg-white/90 backdrop-blur-sm hover:bg-red-50 rounded-lg shadow border border-gray-200 hover:scale-110 transition-all duration-200"
      onClick={e => { e.stopPropagation(); handleDeleteBank(bank.id); }}
      title="Delete Bank"
    >
      <RiDeleteBin6Line className="text-red-600" size={14} />
    </button>
  </div>
)}
```

**Admin Features**:
- ✅ **Edit Bank button** (blue pencil icon) - only visible to admins on hover
- ✅ **Delete Bank button** (red trash icon) - only visible to admins on hover
- ✅ Appears on top-right corner of each bank card

#### B. **Add Your First Bank Button**

**Location**: Lines 576-582

**What's shown**: Button to create first bank when no banks exist

```typescript
// Lines 576-582
<button
  onClick={() => setIsModalOpen(true)}
  className="inline-flex items-center gap-2 px-5 py-2.5 bg-gradient-to-r from-blue-600 to-purple-600 text-white rounded-lg font-semibold hover:shadow-lg hover:scale-105 transition-all duration-200 text-sm"
>
  <RiAddLine size={18} />
  Add Your First Bank
</button>
```

**Note**: This button is shown to everyone when no banks exist, but the backend will reject non-admin requests.

#### C. **Admin Check in Create Bank Handler**

**Location**: Lines 237-241

```typescript
// Lines 237-241
// Check if user is admin
if (user?.email !== adminEmail) {
  setError('Only admin can create banks');
  return;
}
```

#### D. **Admin Check in Edit Bank Handler**

**Location**: Lines 264-268

```typescript
// Lines 264-268
// Check if user is admin
if (user?.email !== adminEmail) {
  setError('Only admin can edit banks');
  return;
}
```

#### E. **Admin Check in Delete Bank Handler**

**Location**: Lines 354-357

```typescript
// Lines 354-357
if (user?.email !== adminEmail) {
  setError('Only admin can delete banks');
  return;
}
```

---

### 3. **Super Bank Page** (`app/super-bank/page.tsx`)

#### A. **Edit Header Button (Admin-Only)**

**Location**: Lines 4053-4061

**What's shown**: Edit button for Super Bank CSV header configuration

```typescript
// Lines 4053-4061
{user?.email === process.env.NEXT_PUBLIC_ADMIN_EMAIL && !headerEditing && (
  <button
    className="px-2 py-1 bg-blue-500 text-white rounded text-xs flex items-center"
    onClick={() => setHeaderEditing(true)}
    title="Edit Header"
  >
    <RiEdit2Line size={16} />
  </button>
)}
```

**Admin Feature**:
- ✅ **Edit Header button** - allows admin to configure CSV header mapping
- ✅ Only visible to admins
- ✅ Appears in Super Bank statement preview modal

#### B. **Admin Check in Header Editing**

**Location**: Lines 3697-3700 (Super Bank page)

```typescript
// Lines 3697-3700
const adminEmail = process.env.NEXT_PUBLIC_ADMIN_EMAIL;
if (user?.email !== adminEmail) {
  setHeaderError('Only admin can edit Super Bank header');
  return;
}
```

---

### 4. **Banks Sidebar** (`app/components/BanksSidebar.tsx`)

**Location**: Lines 257-269

**What's shown**: Edit and Delete icons for banks in sidebar (though commented out or conditional)

```typescript
// Lines 257-269
title="Edit Bank"

title="Delete Bank"
```

**Admin Features**:
- ✅ Edit/Delete buttons in sidebar bank list (if enabled)
- ✅ Admin-only access to bank management from sidebar

---

### 5. **Modals**

#### A. **Create/Edit Bank Modal** (`app/components/Modals/CreateBankModal.tsx`)

**Location**: Line 49

```typescript
// Line 49
<Modal isOpen={isOpen} onClose={onClose} title={editBank ? 'Edit Bank' : 'Create New Bank'}>
```

**Admin Features**:
- ✅ Modal for creating new banks
- ✅ Modal for editing existing banks
- ✅ Form fields: Bank Name, Tags
- ✅ Backend validates admin status before saving

---

## 🔧 Backend - Admin API Checks

### 1. **Bank Creation API** (`app/api/bank/route.ts`)

**Location**: Lines 58-70

**What's checked**: User email must match `ADMIN_EMAIL` environment variable

```typescript
// Lines 58-70
const adminEmail = process.env.ADMIN_EMAIL;
if (!adminEmail) {
  return NextResponse.json(
    { error: 'Admin email not configured' },
    { status: 500 }
  );
}
if (userEmail !== adminEmail) {
  return NextResponse.json(
    { error: 'Only admin can create banks' },
    { status: 403 }
  );
}
```

**Admin Capability**: POST `/api/bank` - Create new banks

---

### 2. **Bank Edit API** (`app/api/bank/[id]/route.ts`)

#### A. **Edit Bank Check**

**Location**: Lines 13-25

```typescript
// Lines 13-25
const adminEmail = process.env.ADMIN_EMAIL;
if (!adminEmail) {
  return NextResponse.json(
    { error: 'Admin email not configured' },
    { status: 500 }
  );
}
if (userEmail !== adminEmail) {
  return NextResponse.json(
    { error: 'Only admin can edit banks' },
    { status: 403 }
  );
}
```

**Admin Capability**: PUT `/api/bank/[id]` - Edit existing banks

#### B. **Delete Bank Check**

**Location**: Lines 52-66

```typescript
// Lines 52-66
const adminEmail = process.env.ADMIN_EMAIL;
if (!adminEmail) {
  return NextResponse.json(
    { error: 'Admin email not configured' },
    { status: 500 }
  );
}
if (userEmail !== adminEmail) {
  return NextResponse.json(
    { error: 'Only admin can delete banks' },
    { status: 403 }
  );
}
```

**Admin Capability**: DELETE `/api/bank/[id]` - Delete banks (cascading delete)

---

### 3. **Bank Header Configuration API** (`app/api/bank-header/route.ts`)

**Location**: Lines 42-54

**What's checked**: Admin-only bank header configuration

```typescript
// Lines 42-54
const adminEmail = process.env.ADMIN_EMAIL;
if (!adminEmail) {
  return NextResponse.json(
    { error: 'Admin email not configured' },
    { status: 500 }
  );
}
if (userEmail !== adminEmail) {
  return NextResponse.json(
    { error: 'Only admin can manage bank headers' },
    { status: 403 }
  );
}
```

**Admin Capability**: POST `/api/bank-header` - Configure CSV header mappings for banks

---

## 🔐 Authentication & Permissions

### 1. **useAuth Hook** (`app/hooks/useAuth.ts`)

#### A. **Admin Role Detection**

**Location**: Lines 73-74

```typescript
// Lines 73-74
const isAdmin = resolvedRole === 'admin' || resolvedRole === 'superadmin' || resolvedPermissions.includes('crud:all');
const finalRole = isAdmin ? 'admin' : resolvedRole;
```

#### B. **isAdmin() Function**

**Location**: Lines 201-203

```typescript
// Lines 201-203
const isAdmin = (): boolean => {
  return user?.role === 'admin';
};
```

**Exported at**: Line 236

```typescript
return {
  // ...
  isAdmin,
  // ...
}
```

---

### 2. **usePermissions Hook** (`app/hooks/usePermissions.ts`)

**Location**: Lines 13-40

**Admin-related functions**:

```typescript
// Line 18
isAdmin: () => checkIsAdmin(),

// Line 24
canCreate: () => hasPermission('crud:all') || hasPermission('crud:own'),

// Line 25
canEdit: () => hasPermission('crud:all') || hasPermission('crud:own'),

// Line 26
canDelete: () => hasPermission('crud:all'),

// Line 27
canAssign: () => hasPermission('assign:users'),
```

**Usage Example**:
```typescript
const { isAdmin, canCreate, canDelete, canAssign } = usePermissions();

if (isAdmin()) {
  // Show admin features
}
```

---

### 3. **AuthGuard** (`app/components/AuthGuard.tsx`)

**Location**: Lines 153-154, 250-251

**What happens**: When user logs in, role is resolved from IAM

```typescript
// Lines 250-251
const isAdmin = resolvedRole === 'admin' || resolvedRole === 'superadmin' || resolvedPerms.includes('crud:all');
const finalRole = isAdmin ? 'admin' : resolvedRole;
```

**Stored in localStorage**:
- `userRole` → 'admin'
- `userPermissions` → `["crud:all", "assign:users", "read:all"]`

---

## 📊 Summary of Admin-Only UI Elements

### Visible Only to Admins:

| UI Element | Location | What It Does |
|------------|----------|--------------|
| **Purple "Admin" badge** | Navbar dropdown | Shows admin role |
| **Edit Bank button** | Bank card hover | Opens edit bank modal |
| **Delete Bank button** | Bank card hover | Deletes bank (with confirmation) |
| **Edit Header button** | Super Bank page | Configures CSV header mapping |
| **Create Bank modal** | Banks overview | Creates new bank (backend validates) |

### Available to All Users (Backend Validates):

| UI Element | Location | Note |
|------------|----------|------|
| **"Add Your First Bank" button** | Banks overview (when no banks) | Backend will reject non-admins |

---

## 🔍 How to Test Admin Features

### 1. **Set Admin Email in Environment**

```env
# .env.local
ADMIN_EMAIL=your-admin-email@gmail.com
NEXT_PUBLIC_ADMIN_EMAIL=your-admin-email@gmail.com
```

### 2. **Set Admin Role in brmh-users Table**

Update DynamoDB `brmh-users` table:

```json
{
  "userId": "your-user-id",
  "email": "your-admin-email@gmail.com",
  "namespaceRoles": {
    "fintech": {
      "role": "admin",
      "permissions": ["crud:all", "assign:users", "read:all"],
      "assignedBy": "system",
      "assignedAt": "2025-10-16T00:00:00.000Z"
    }
  }
}
```

### 3. **Login and Verify**

1. Login with admin credentials
2. Check navbar for purple "Admin" badge
3. Navigate to Banks page
4. Hover over bank cards → Edit/Delete buttons should appear
5. Open Super Bank → Edit Header button should be visible

### 4. **Debug Admin Status**

```typescript
// In browser console
console.log('Role:', localStorage.getItem('userRole'));
console.log('Permissions:', localStorage.getItem('userPermissions'));
console.log('Email:', localStorage.getItem('user_email'));
console.log('Admin Email:', process.env.NEXT_PUBLIC_ADMIN_EMAIL);
```

Or visit: `/debug-auth` page for full authentication details

---

## 🎯 Quick Reference: Where to Add New Admin Features

### Frontend:

1. **UI Element**: Add conditional rendering with `{user?.email === adminEmail && (...)}`
2. **Permission Check**: Use `isAdmin()` from `useAuth` or `usePermissions`
3. **Example**:
```typescript
import { useAuth } from '@/app/hooks/useAuth';

export default function MyComponent() {
  const { user, isAdmin } = useAuth();
  const adminEmail = process.env.NEXT_PUBLIC_ADMIN_EMAIL;
  
  return (
    <>
      {/* Method 1: Email check */}
      {user?.email === adminEmail && (
        <AdminButton />
      )}
      
      {/* Method 2: Role check */}
      {isAdmin() && (
        <AdminPanel />
      )}
    </>
  );
}
```

### Backend:

1. **API Route**: Add admin check at the start of the handler
2. **Example**:
```typescript
export async function POST(request: Request) {
  const { userEmail } = await request.json();
  
  // Admin check
  const adminEmail = process.env.ADMIN_EMAIL;
  if (userEmail !== adminEmail) {
    return NextResponse.json(
      { error: 'Admin access required' },
      { status: 403 }
    );
  }
  
  // Admin operation
  // ...
}
```

---

## 📚 Related Files

- **Admin Documentation**: `ADMIN.md` - Complete admin capabilities
- **Auth Implementation**: `AUTH_IMPLEMENTATION_GUIDE.md`
- **Auth Hook**: `app/hooks/useAuth.ts`
- **Permissions Hook**: `app/hooks/usePermissions.ts`
- **Banks Page**: `app/banks/BanksTabsClient.tsx`
- **API Routes**: `app/api/bank/**`

---

**Last Updated**: October 16, 2025
**Purpose**: Developer reference for admin UI/feature locations


