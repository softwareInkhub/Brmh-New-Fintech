 # 👑 Admin Role & Permissions Documentation

## 📋 Overview

This document provides a comprehensive overview of the **Admin role** in the BRMH Fintech application, including capabilities, permissions, and differences from other user roles.

---

## 🎯 What is an Admin?

An **Admin** is the highest privilege level user in the fintech namespace with full control over:
- Bank management (create, edit, delete)
- Bank header configuration
- User role assignment
- All data operations (CRUD on all entities)
- System-wide settings

---

## 🔑 Admin Permissions

### Permission Set

Admins automatically receive the following permissions in the `fintech` namespace:

```typescript
permissions: [
  'crud:all',        // Create, Read, Update, Delete on all data
  'assign:users',    // Assign and manage user roles
  'read:all'         // Read access to all user data
]
```

### Permission Breakdown

| Permission | Description | What It Allows |
|------------|-------------|----------------|
| **`crud:all`** | Full CRUD access | Create, edit, delete any entity (banks, accounts, transactions, tags, files) |
| **`assign:users`** | User management | Assign roles to users in the fintech namespace |
| **`read:all`** | Read all data | View all users' data, not just own data |

---

## 🎨 Admin Role Assignment

### How Admin Role is Assigned

Admin status is determined by the `brmh-users` DynamoDB table in the `fintech` namespace:

```typescript
// brmh-users table structure
{
  userId: "d4e8d4a8-5091-7079-5174-639ccb295849",
  email: "admin@example.com",
  namespaceRoles: {
    fintech: {
      role: "admin",  // 👈 Admin role assignment
      permissions: ["crud:all", "assign:users", "read:all"],
      assignedBy: "system",
      assignedAt: "2025-10-10T00:00:00.000Z"
    }
  }
}
```

### Admin Detection Logic

The system identifies admins through multiple checks:

```typescript
// Method 1: Direct role check
user.role === 'admin'

// Method 2: Superadmin role (treated as admin)
user.role === 'superadmin'

// Method 3: Permission-based check
user.permissions.includes('crud:all')
```

### Environment-Based Admin (Legacy)

For backward compatibility, there's an environment-based admin check:

```env
# .env.local
ADMIN_EMAIL=admin@example.com
NEXT_PUBLIC_ADMIN_EMAIL=admin@example.com
```

Users with email matching `ADMIN_EMAIL` get admin privileges in certain operations.

---

## 🚀 Admin Capabilities

### 1. Bank Management (Admin-Only)

#### Create Banks
```typescript
POST /api/bank
{
  bankName: "State Bank of India",
  tags: ["retail", "savings"],
  userId: "user-id",
  userEmail: "admin@example.com"  // Must match ADMIN_EMAIL
}
```

✅ **Only admins can create banks**
- Creates bank entry in `banks` table
- Creates dynamic transaction table: `brmh-{normalized-bank-name}`
- Required for all bank operations

#### Edit Banks
```typescript
PUT /api/bank/[id]
{
  bankName: "Updated Bank Name",
  tags: ["new", "tags"],
  userEmail: "admin@example.com"
}
```

✅ **Only admins can edit bank names and tags**

#### Delete Banks
```typescript
DELETE /api/bank/[id]
{
  userId: "user-id",
  userEmail: "admin@example.com"
}
```

✅ **Only admins can delete banks**
- Deletes bank from `banks` table
- Deletes all associated accounts
- Deletes all statements
- Deletes all transactions
- **Cascading delete operation**

### 2. Bank Header Configuration (Admin-Only)

```typescript
POST /api/bank-header
{
  bankName: "State Bank of India",
  bankId: "bank-uuid",
  header: ["Date", "Description", "Amount", "Balance"],
  tag: "default-tag-id",
  mapping: { ... },
  conditions: { ... },
  userId: "user-id",
  userEmail: "admin@example.com"
}
```

✅ **Only admins can configure bank CSV headers**
- Defines how CSV files are parsed
- Maps columns to transaction fields
- Sets default tagging rules
- Configures conditional logic

### 3. User Role Management

Admins with `assign:users` permission can:

```typescript
// Check if current user can assign roles
const { canAssign } = usePermissions();

if (canAssign()) {
  // Update user roles in brmh-users table
  await updateUserRole(targetUserId, 'editor');
}
```

✅ **Assign roles**: `admin`, `editor`, `viewer`, `user`
✅ **Modify permissions**: Grant/revoke specific permissions
✅ **Manage access**: Control who can access what

### 4. Full Data Access

#### View All Users' Data
```typescript
// Admin can see ALL transactions across ALL users
GET /api/transactions/all?userId={any-user-id}

// Admin can access any user's files
GET /api/files?userId={any-user-id}
```

✅ **No data isolation for admins**
- View all transactions
- Access all files
- See all tags
- View all reports

#### Modify Any Data
```typescript
// Admin can edit any transaction
POST /api/transaction/update
{
  transactionId: "any-transaction-id",
  tags: ["updated-tag"],
  bankName: "any-bank"
}

// Admin can delete any file
DELETE /api/files/[any-file-id]
```

✅ **Full CRUD on all entities**
- Edit any transaction
- Delete any statement
- Modify any tag
- Manage any file

### 5. Account & Statement Management

Admins have no special restrictions on:

```typescript
// Create accounts for any bank
POST /api/account
{
  bankId: "any-bank-id",
  accountHolderName: "John Doe",
  accountNumber: "1234567890",
  ifscCode: "SBIN0001234",
  userId: "any-user-id"  // Can create for any user
}

// Upload statements for any account
POST /api/statement/upload
FormData {
  file: CSV file,
  bankId: "any-bank-id",
  accountId: "any-account-id",
  userId: "any-user-id"
}
```

✅ **Create accounts for any user**
✅ **Upload statements for any account**
✅ **Delete any statement**
✅ **Process any transaction**

### 6. Tag Management

While all users can create tags, admins can:

```typescript
// Create global/system tags
POST /api/tags
{
  name: "System Tag",
  color: "#FF0000",
  userId: "system",  // System-wide tag
  isGlobal: true     // Available to all users
}

// Delete any user's tag
DELETE /api/tags?tagId={any-tag-id}&userId={any-user-id}
```

✅ **Create system-wide tags**
✅ **Delete any user's tags**
✅ **Modify tag visibility**

### 7. Report & Analytics Access

```typescript
// View any user's reports
GET /api/reports/cashflow?userId={any-user-id}
GET /api/reports/tags-summary?userId={any-user-id}

// Recompute any user's reports
POST /api/reports/tags-summary
{
  userId: "any-user-id"
}
```

✅ **View all users' reports**
✅ **Trigger report regeneration**
✅ **Access dashboard summaries**

---

## 🔒 Admin vs Other Roles

### Role Comparison Table

| Capability | Admin | Editor | Viewer | User |
|------------|-------|--------|--------|------|
| **Bank Operations** |
| Create banks | ✅ | ❌ | ❌ | ❌ |
| Edit banks | ✅ | ❌ | ❌ | ❌ |
| Delete banks | ✅ | ❌ | ❌ | ❌ |
| Configure bank headers | ✅ | ❌ | ❌ | ❌ |
| **Account Operations** |
| Create own accounts | ✅ | ✅ | ❌ | ✅ |
| Create accounts for others | ✅ | ❌ | ❌ | ❌ |
| Edit own accounts | ✅ | ✅ | ❌ | ✅ |
| Edit others' accounts | ✅ | ❌ | ❌ | ❌ |
| Delete own accounts | ✅ | ✅ | ❌ | ✅ |
| Delete others' accounts | ✅ | ❌ | ❌ | ❌ |
| **Transaction Operations** |
| Upload statements | ✅ | ✅ | ❌ | ✅ |
| Tag own transactions | ✅ | ✅ | ❌ | ✅ |
| Tag others' transactions | ✅ | ❌ | ❌ | ❌ |
| Edit own transactions | ✅ | ✅ | ❌ | ✅ |
| Edit others' transactions | ✅ | ❌ | ❌ | ❌ |
| Delete own transactions | ✅ | ✅ | ❌ | ✅ |
| Delete others' transactions | ✅ | ❌ | ❌ | ❌ |
| **Tag Operations** |
| Create tags | ✅ | ✅ | ❌ | ✅ |
| Edit own tags | ✅ | ✅ | ❌ | ✅ |
| Edit others' tags | ✅ | ❌ | ❌ | ❌ |
| Delete own tags | ✅ | ✅ | ❌ | ✅ |
| Delete others' tags | ✅ | ❌ | ❌ | ❌ |
| Create system tags | ✅ | ❌ | ❌ | ❌ |
| **File Operations** |
| Upload own files | ✅ | ✅ | ❌ | ✅ |
| Upload to others' folders | ✅ | ❌ | ❌ | ❌ |
| View own files | ✅ | ✅ | ✅ | ✅ |
| View others' files | ✅ | ✅ (if shared) | ✅ (if shared) | ❌ |
| Delete own files | ✅ | ✅ | ❌ | ✅ |
| Delete others' files | ✅ | ❌ | ❌ | ❌ |
| **Data Access** |
| View own data | ✅ | ✅ | ✅ | ✅ |
| View all users' data | ✅ | ✅ | ✅ | ❌ |
| **Reports & Analytics** |
| View own reports | ✅ | ✅ | ✅ | ✅ |
| View others' reports | ✅ | ✅ | ✅ | ❌ |
| Regenerate any report | ✅ | ❌ | ❌ | ❌ |
| **User Management** |
| View all users | ✅ | ❌ | ❌ | ❌ |
| Assign roles | ✅ | ❌ | ❌ | ❌ |
| Change permissions | ✅ | ❌ | ❌ | ❌ |

### Permission String Comparison

```typescript
// Admin
permissions: ['crud:all', 'assign:users', 'read:all']

// Editor
permissions: ['crud:own', 'read:all']

// Viewer
permissions: ['read:all']

// User (Default)
permissions: ['read:own']
```

### Role Descriptions

#### **Admin** (`role: 'admin'`)
- **Full system access**
- Can manage banks, users, and all data
- No restrictions
- System administration capabilities

#### **Editor** (`role: 'editor'`)
- **Can create and edit own data**
- Can view all data (read:all)
- Cannot manage banks or users
- Cannot delete or edit others' data

#### **Viewer** (`role: 'viewer'`)
- **Read-only access to all data**
- Cannot create, edit, or delete anything
- Perfect for stakeholders and auditors

#### **User** (`role: 'user'`, default)
- **Basic access to own data only**
- Can manage own accounts and transactions
- Cannot see others' data
- Default role for new users

---

## 🛠️ Using Admin Permissions in Code

### Check if Current User is Admin

```typescript
import { useAuth } from '@/app/hooks/useAuth';

export default function MyComponent() {
  const { isAdmin, hasPermission } = useAuth();

  // Method 1: Direct admin check
  if (isAdmin()) {
    return <AdminControls />;
  }

  // Method 2: Permission check
  if (hasPermission('crud:all')) {
    return <AdminControls />;
  }

  return <RegularUserView />;
}
```

### Use Permission Hooks

```typescript
import { usePermissions } from '@/app/hooks/usePermissions';

export default function BankPage() {
  const {
    isAdmin,
    canCreate,
    canEdit,
    canDelete,
    canAssign,
    canReadAll
  } = usePermissions();

  return (
    <div>
      {canCreate() && <CreateButton />}
      {canEdit() && <EditButton />}
      {canDelete() && <DeleteButton />}
      {canAssign() && <UserManagement />}
      {canReadAll() && <AllUsersData />}
    </div>
  );
}
```

### Conditional Rendering

```typescript
const { user } = useAuth();

return (
  <div>
    {/* Show for all users */}
    <Dashboard />

    {/* Show only for admin */}
    {user?.role === 'admin' && (
      <>
        <CreateBankButton />
        <UserManagement />
        <SystemSettings />
      </>
    )}

    {/* Show for admin or editor */}
    {(user?.role === 'admin' || user?.role === 'editor') && (
      <CreateTransactionButton />
    )}
  </div>
);
```

### API Route Protection

```typescript
// In API routes (e.g., /api/bank/route.ts)
export async function POST(request: Request) {
  const { userEmail } = await request.json();

  // Check if user is admin
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

  // Proceed with admin operation
  // ...
}
```

---

## 🔐 Security Considerations

### Admin Account Security

1. **Protect Admin Credentials**
   - Use strong passwords
   - Enable 2FA (if available)
   - Never share admin credentials

2. **Limit Admin Access**
   - Only assign admin role to trusted users
   - Review admin accounts regularly
   - Revoke admin access when no longer needed

3. **Audit Admin Actions**
   - All admin operations are logged
   - Track who created/modified what
   - Monitor for suspicious activity

### Best Practices

```typescript
// ✅ Good: Check permissions before showing UI
if (isAdmin()) {
  return <DeleteAllButton />;
}

// ❌ Bad: Always show, hope backend checks
return <DeleteAllButton />; // Backend might still reject
```

```typescript
// ✅ Good: Server-side validation
export async function DELETE(request: Request) {
  const { userEmail } = await request.json();
  if (userEmail !== process.env.ADMIN_EMAIL) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }
  // ...
}

// ❌ Bad: Client-side only
// Anyone can call the API directly
```

---

## 📊 Admin Workflow Examples

### Example 1: Creating a New Bank

```typescript
// 1. Admin logs in
await login({ email: 'admin@example.com', password: '***' });

// 2. Navigate to banks page
router.push('/banks');

// 3. Click "Create Bank" (only visible to admin)
const newBank = await fetch('/api/bank', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    bankName: 'HDFC Bank',
    tags: ['retail', 'savings'],
    userId: currentUser.userId,
    userEmail: currentUser.email
  })
});

// 4. Configure bank header (admin only)
await fetch('/api/bank-header', {
  method: 'POST',
  body: JSON.stringify({
    bankName: 'HDFC Bank',
    bankId: newBank.id,
    header: ['Date', 'Particulars', 'Debit', 'Credit', 'Balance'],
    userEmail: currentUser.email
  })
});

// 5. Bank is now ready for all users to create accounts
```

### Example 2: Managing User Roles

```typescript
// 1. Admin views user list
const users = await fetch('/api/users').then(r => r.json());

// 2. Select user to promote
const targetUser = users.find(u => u.email === 'neweditor@example.com');

// 3. Update role in brmh-users table (via backend)
await updateUserRole({
  userId: targetUser.userId,
  namespace: 'fintech',
  role: 'editor',
  permissions: ['crud:own', 'read:all'],
  assignedBy: currentUser.userId
});

// 4. User now has editor privileges
```

### Example 3: Deleting a Bank (Cascading Delete)

```typescript
// 1. Admin decides to remove a bank
const bankToDelete = banks.find(b => b.bankName === 'Old Bank');

// 2. Confirm deletion (affects all users)
if (confirm('This will delete all accounts, statements, and transactions for this bank. Continue?')) {
  await fetch(`/api/bank/${bankToDelete.id}`, {
    method: 'DELETE',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      userId: currentUser.userId,
      userEmail: currentUser.email
    })
  });
}

// 3. Backend performs cascading delete:
//    - Deletes bank from 'banks' table
//    - Deletes all accounts with bankId
//    - Deletes all statements with bankId
//    - Deletes all transactions from brmh-{bank-name} table
//    - Removes bank from all user caches
```

---

## 🔍 Debugging Admin Permissions

### Check Current User's Role

```typescript
// In browser console
const userId = localStorage.getItem('userId');
const role = localStorage.getItem('userRole');
const permissions = JSON.parse(localStorage.getItem('userPermissions') || '[]');

console.log('User ID:', userId);
console.log('Role:', role);
console.log('Permissions:', permissions);
```

### Verify Admin Status

```typescript
import { useAuth } from '@/app/hooks/useAuth';

export default function DebugComponent() {
  const { user, isAdmin, hasPermission } = useAuth();

  console.log('User:', user);
  console.log('Is Admin:', isAdmin());
  console.log('Has crud:all:', hasPermission('crud:all'));
  console.log('Has assign:users:', hasPermission('assign:users'));
  console.log('Has read:all:', hasPermission('read:all'));

  return <div>Check console for debug info</div>;
}
```

### Test Admin Endpoints

Visit the debug pages:
- `/debug-auth` - Full authentication debug info
- `/test-cookies` - Cookie functionality test

---

## 🎓 Admin Onboarding Checklist

When a new admin is assigned:

- [ ] Verify admin role in `brmh-users` table under `namespaceRoles.fintech`
- [ ] Confirm permissions include: `crud:all`, `assign:users`, `read:all`
- [ ] Add email to `ADMIN_EMAIL` environment variable (legacy support)
- [ ] Test bank creation capability
- [ ] Test bank header configuration
- [ ] Verify access to all users' data
- [ ] Test user role assignment
- [ ] Review security best practices
- [ ] Provide admin documentation

---

## 📚 Related Documentation

- **Authentication Guide**: `AUTH_IMPLEMENTATION_GUIDE.md`
- **SSO Quick Reference**: `SSO_QUICK_REFERENCE.md`
- **Project Overview**: `PROJECT_COMPLETE_UNDERSTANDING.md`
- **API Documentation**: `apidoc.md`
- **README**: `README.md`

---

## 🚨 Important Notes

### ⚠️ Admin Responsibilities

1. **Bank Management**: Only admins can create/edit/delete banks - this affects ALL users
2. **Cascading Deletes**: Deleting a bank removes ALL associated data for ALL users
3. **User Privacy**: Admins can see all users' financial data - handle with care
4. **System Stability**: Admin actions can break functionality if done incorrectly

### 🛡️ Security Reminders

- **Never share admin credentials**
- **Always verify before deleting**
- **Review changes in non-production first**
- **Log all admin actions for audit trail**
- **Limit admin access to minimum required users**

---

## 📞 Support

For questions about admin capabilities or to request admin access, contact the system administrator.

**Last Updated**: October 16, 2025
**Version**: 1.0
**Namespace**: `fintech`


