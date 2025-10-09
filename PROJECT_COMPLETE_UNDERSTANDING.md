# BRMH Fintech - Complete Project Understanding

## 📋 Project Overview

**BRMH Fintech** is a comprehensive financial management application built with Next.js 15, TypeScript, and integrated with BRMH backend services. It provides users with powerful tools to manage banks, accounts, transactions, tags, files, and generate financial reports without requiring any AWS setup.

### Key Features
- **Bank & Account Management**: Create and manage multiple banks and accounts
- **Transaction Processing**: Upload CSV statements and process transactions
- **Advanced Tagging System**: Tag-based transaction categorization
- **File Management**: User-specific file storage with BRMH Drive integration
- **Financial Analytics**: Comprehensive dashboard with detailed breakdowns
- **Reports Generation**: Cashflow reports, tag summaries, and analytics
- **Real-time Filtering**: Advanced filtering and sorting capabilities
- **Entity Management**: Organize business entities with file associations
- **Multi-tab Navigation**: Browser-like tab system for smooth navigation

---

## 🏗️ Architecture Overview

### Frontend Stack
- **Framework**: Next.js 15 (App Router)
- **Language**: TypeScript
- **Styling**: Tailwind CSS
- **State Management**: React Context API + Custom Hooks
- **Icons**: React Icons
- **Charts**: Chart.js with react-chartjs-2
- **PDF Generation**: html2pdf.js
- **CSV Parsing**: PapaParse
- **File Management**: React Window (virtualization)

### Backend Integration
- **Database**: DynamoDB (via BRMH Backend)
- **File Storage**: Amazon S3 (via BRMH Drive)
- **Authentication**: Custom JWT-based auth
- **API Layer**: Next.js API Routes
- **Base URL**: `https://brmh.in`

### Key Design Patterns
1. **Client Singleton Pattern**: `brmhCrud` and `brmhDrive` clients
2. **Context-based State Management**: Global tabs, theme, authentication
3. **Hook-based Logic**: Custom hooks for reusable functionality
4. **Server-Client Separation**: Clear separation between API and UI

---

## 🗄️ Database Architecture

### BRMH CRUD Client (`brmh-client.ts`)

The application uses a centralized CRUD client that communicates with the BRMH backend at `https://brmh.in/crud`.

#### Table Structure

```typescript
TABLES = {
  BANKS: 'banks',
  ACCOUNTS: 'accounts',
  BANK_STATEMENTS: 'bank-statements',
  TAGS: 'tags',
  REPORTS: 'brmh-fintech-user-reports',
  USERS: 'users',
  BRMH_DRIVE_FILES: 'brmh-drive-files'
}
```

#### Bank-Specific Transaction Tables
Each bank has its own transaction table dynamically generated:
```typescript
getBankTransactionTable(bankName) => `brmh-${normalized-bank-name}`
// Example: "State Bank of India" => "brmh-state-bank-of-india"
```

### Data Models

#### Bank
```typescript
{
  id: string (UUID)
  bankName: string
  tags?: string[]
  createdBy: string (userId)
  createdAt: ISO timestamp
  updatedAt: ISO timestamp
}
```

#### Account
```typescript
{
  id: string (UUID)
  bankId: string
  accountHolderName: string
  accountNumber: string
  ifscCode: string
  tags?: string[]
  userId: string
}
```

#### Transaction (Bank-specific table)
```typescript
{
  id: string (UUID)
  userId: string
  bankId: string
  bankName: string
  accountId: string
  accountName: string
  accountNumber: string
  statementId: string
  fileName: string
  s3FileUrl: string
  tags: string[] // Tag IDs
  createdAt: ISO timestamp
  // ... bank-specific fields from CSV
}
```

#### Tag
```typescript
{
  id: string (UUID)
  name: string
  color: string (hex)
  userId: string
  createdAt: ISO timestamp
}
```

#### User
```typescript
{
  id: string
  userId: string
  email: string
  password: string (bcrypt hashed)
  name: string
  username: string
  phone?: string
  role?: string
  createdAt: ISO timestamp
}
```

### CRUD Operations

#### Create
```typescript
await brmhCrud.create(tableName, item)
// POST to /crud?tableName={tableName}
// Body: { item: {...} }
```

#### Read (Scan with Filtering)
```typescript
await brmhCrud.scan(tableName, {
  FilterExpression: 'userId = :userId',
  ExpressionAttributeValues: { ':userId': userId },
  itemPerPage: 100
})
// GET to /crud?tableName={tableName}&FilterExpression=...
```

#### Update
```typescript
await brmhCrud.update(tableName, { id }, updates)
// PUT to /crud?tableName={tableName}
// Body: { key: { id }, updates: {...} }
```

#### Delete
```typescript
await brmhCrud.delete(tableName, { id })
// DELETE to /crud?tableName={tableName}
// Body: { id }
```

---

## 📁 BRMH Drive - File Storage System

### BRMH Drive Client (`brmh-drive-client.ts`)

The application uses BRMH Drive for all file operations, which stores files in Amazon S3 with metadata in DynamoDB.

### Core Features

1. **File Upload**: Uploads files to S3 with metadata
2. **Folder Management**: Create and organize folders
3. **File Operations**: Rename, move, delete files
4. **Download**: Generate presigned URLs for secure downloads
5. **Sharing**: Share files/folders with other users
6. **Permission Management**: Control access levels

### File Storage Structure

```
S3 Bucket (via BRMH Drive)
└── users/
    └── {userId}/
        ├── statements/
        │   └── {filename}.csv
        └── documents/
            └── {filename}.pdf
```

### BRMH Drive API Endpoints

#### File Operations

```typescript
// Upload File
brmhDrive.uploadFile(userId, {
  name: string,
  mimeType: string,
  size: number,
  content: string (base64),
  tags?: string[]
}, parentId)
// POST to /drive/upload

// Get File
brmhDrive.getFileById(userId, fileId)
// GET to /drive/file/{userId}/{fileId}

// Delete File
brmhDrive.deleteFile(userId, fileId)
// DELETE to /drive/file/{userId}/{fileId}

// Download File
brmhDrive.downloadFile(userId, fileId)
// GET to /drive/download/{userId}/{fileId}
// Returns presigned URL

// Rename File
brmhDrive.renameFile(userId, fileId, newName)
// PATCH to /drive/rename/{userId}/{fileId}

// Move File
brmhDrive.moveFile(userId, fileId, newParentId)
// PATCH to /drive/move-file/{userId}/{fileId}
```

#### Folder Operations

```typescript
// Create Folder
brmhDrive.createFolder(userId, {
  name: string,
  description?: string
}, parentId)
// POST to /drive/folder

// List Folders
brmhDrive.listFolders(userId, parentId, limit)
// GET to /drive/folders/{userId}?parentId={parentId}&limit={limit}

// Get Folder Contents
brmhDrive.listFolderContents(userId, folderId, limit)
// GET to /drive/contents/{userId}/{folderId}?limit={limit}

// Delete Folder
brmhDrive.deleteFolder(userId, folderId)
// DELETE to /drive/folder/{userId}/{folderId}
```

#### Sharing Operations

```typescript
// Share File
brmhDrive.shareFile(userId, fileId, {
  sharedWithUserId: string,
  permissions?: string[],
  expiresAt?: string,
  message?: string
})
// POST to /drive/share-file/{userId}/{fileId}

// Get Shared Files
brmhDrive.getSharedWithMe(userId, limit)
// GET to /drive/shared-with-me/{userId}

// Revoke Share
brmhDrive.revokeShare(userId, shareId)
// DELETE to /drive/revoke-share/{userId}/{shareId}
```

### File Upload Flow

1. **Client Side** (React Component):
   - User selects file via drag-drop or file input
   - Validate file size (max 50MB) and type
   - Convert file to ArrayBuffer
   - Convert to base64 encoding

2. **API Route** (`/api/files` or `/api/statement/upload`):
   - Receive FormData with file
   - Validate file size and user authentication
   - Convert to base64 (optimized with Buffer)
   - Call BRMH Drive API

3. **BRMH Drive Backend**:
   - Upload file to S3 with user-specific path
   - Generate unique file ID
   - Store metadata in `brmh-drive-files` table
   - Return file ID and S3 key

4. **Response**:
   - Return success with fileId
   - Include performance metrics (upload time, speed)

### File Metadata in `brmh-drive-files` Table

```typescript
{
  id: string (UUID)
  userId: string
  ownerId: string
  name: string
  type: 'file' | 'folder'
  mimeType: string
  size: number
  content: string (base64) // Backup storage
  parentId: string // 'ROOT' for root files
  tags: string[]
  
  // Bank/Account metadata (for statements)
  bankId?: string
  bankName?: string
  accountId?: string
  accountName?: string
  accountNumber?: string
  fileType?: string
  
  // S3 metadata
  s3Key: string
  s3Url: string
  downloadUrl?: string
  
  // Timestamps
  createdAt: ISO timestamp
  updatedAt: ISO timestamp
  
  // Flags
  isFile: boolean
  isFolder: boolean
  path: string
}
```

---

## 🔌 API Routes Structure

### Complete API Endpoints

#### Authentication & Users
- `POST /api/users` - Login/Signup
- `GET /api/users?id={userId}` - Get user details

#### Banks
- `GET /api/bank` - List all banks
- `POST /api/bank` - Create bank (admin only)
- `PUT /api/bank/[id]` - Update bank
- `DELETE /api/bank/[id]` - Delete bank
- `GET /api/bank-header?bankName={name}` - Get bank CSV header config
- `POST /api/bank-header` - Save bank header config

#### Accounts
- `GET /api/account?bankId={id}&userId={userId}` - List accounts
- `GET /api/account?accountId={id}` - Get single account
- `POST /api/account` - Create account
- `PUT /api/account/[id]` - Update account
- `DELETE /api/account/[id]` - Delete account

#### Statements
- `POST /api/statement/upload` - Upload CSV statement
- `GET /api/statement/data?statementId={id}` - Get statement with transactions
- `POST /api/statement/delete` - Delete statement
- `POST /api/statement/update` - Update statement metadata
- `GET /api/statements?accountId={id}` - List statements

#### Transactions
- `GET /api/transactions?bankName={name}&accountId={id}` - List transactions
- `GET /api/transactions/all?userId={id}` - All user transactions
- `GET /api/transactions/bank?bankName={name}` - Bank transactions
- `GET /api/transactions/by-tag?tagId={id}` - Transactions by tag (optimized)
- `GET /api/transactions/paginated` - Paginated transactions
- `POST /api/transaction/update` - Update single transaction
- `POST /api/transaction/bulk-update` - Bulk update transactions
- `POST /api/transaction/slice` - Process CSV slice into transactions

#### Tags
- `GET /api/tags?userId={id}` - List tags
- `POST /api/tags` - Create tag
- `PUT /api/tags` - Update tag
- `DELETE /api/tags` - Delete tag

#### Files & Folders
- `GET /api/files?userId={id}&parentId={id}` - List files
- `POST /api/files` - Upload file
- `DELETE /api/files/[id]` - Delete file
- `GET /api/folders?userId={id}&parentId={id}` - List folders
- `POST /api/folders` - Create folder
- `GET /api/folders/[id]/contents` - Get folder contents
- `DELETE /api/folders/[id]` - Delete folder

#### Reports & Analytics
- `GET /api/reports/cashflow?userId={id}` - Get cashflow report
- `POST /api/reports/cashflow` - Save cashflow report
- `GET /api/reports/tags-summary?userId={id}` - Get tag summary
- `POST /api/reports/tags-summary` - Recompute tag summary
- `POST /api/reports/tags-summary/update` - Update tag summary
- `GET /api/dashboard/summary?userId={id}` - Dashboard summary

#### Namespace
- `GET /api/namespace?bankId={id}` - Get bank namespace (bank + accounts + statements)

---

## 🎨 Frontend Architecture

### Context Providers

#### 1. ThemeContext
- Manages dark/light mode
- Persists theme preference in localStorage

#### 2. GlobalTabContext
- Manages browser-like tab system
- Tab types: dashboard, banks, entities, tags, files, reports, etc.
- Tab operations: add, remove, close, duplicate, close others

#### 3. EntitySyncContext
- Synchronizes entity data across components
- Triggers re-fetches when entities are modified

#### 4. FileSyncContext
- Synchronizes file data across components
- Triggers re-fetches when files are modified

#### 5. SidebarPreferencesContext
- Manages sidebar collapse/expand state
- Persists preferences in localStorage

### Custom Hooks

#### useAuth
```typescript
const { user, isLoading, isAuthenticated, login, logout, requireAuth } = useAuth()
```
- Manages authentication state
- Syncs with localStorage
- Auto-redirects to login if not authenticated

#### useTabManager
```typescript
const { 
  openDashboard, openBanks, openEntities, 
  openTags, openFiles, openReports 
} = useTabManager()
```
- Manages global tab operations
- Creates and opens tabs with appropriate components

#### useCachedFetch
```typescript
const { data, loading, error, refetch } = useCachedFetch(url, cacheKey, ttl)
```
- Client-side caching for API responses
- TTL-based cache expiration
- Automatic refetching

#### usePreviewTabManager
- Manages preview tabs for transactions and statements

### Key Components

#### Layout Components
- **AppLayoutClient**: Main layout with sidebar, navbar, and tab system
- **Sidebar**: Navigation sidebar with collapsible menu
- **Navbar**: Top navigation bar with breadcrumbs
- **GlobalTabBar**: Browser-like tab bar
- **GlobalTabContent**: Renders active tab content

#### Bank & Account Components
- **BanksSidebar**: Bank listing sidebar
- **BankTransactionsPage**: Transaction table for specific bank
- **HeaderEditor**: CSV header mapping editor

#### Transaction Components
- **TransactionTable**: Main transaction table
- **EnhancedTransactionTable**: Advanced transaction table with filters
- **TransactionFilterBar**: Filter transactions by various criteria
- **TaggingControls**: Bulk tagging interface

#### File Components
- **EntityFilesPage**: File browser for entities
- **BankFilesComponent**: File browser for banks
- **FilesSidebar**: File navigation sidebar
- **OptimizedFileUploader**: Drag-drop file uploader with progress
- **UploadPerformanceMonitor**: Upload performance metrics

#### Report Components
- **AnalyticsSummary**: Analytics dashboard
- **SummaryCards**: Dashboard summary cards

#### Modal Components
- **CreateBankModal**: Bank creation modal
- **StatementPreviewModal**: Statement preview
- **TransactionPreviewModal**: Transaction details
- **ConfirmDeleteModal**: Delete confirmation

---

## 🔄 Key Workflows

### 1. User Authentication Flow

```
1. User lands on app
   ↓
2. AuthWrapper checks localStorage for userId
   ↓
3. If not authenticated → redirect to /login-signup
   ↓
4. User enters credentials
   ↓
5. POST /api/users (action: login)
   ↓
6. Verify email/password with bcrypt
   ↓
7. Store userId in localStorage
   ↓
8. Redirect to dashboard
```

### 2. Statement Upload & Processing Flow

```
1. User selects bank and account
   ↓
2. User uploads CSV file
   ↓
3. Client validates file (size, type)
   ↓
4. Convert file to base64
   ↓
5. POST /api/statement/upload
   ↓
6. Upload to BRMH Drive (S3)
   ↓
7. Save metadata to brmh-drive-files table
   ↓
8. User previews CSV and maps headers
   ↓
9. User selects row range
   ↓
10. POST /api/transaction/slice
    ↓
11. Parse CSV with PapaParse
    ↓
12. Check for duplicates
    ↓
13. Batch insert transactions (25 per batch)
    ↓
14. Return success with count
    ↓
15. Refresh transaction list
```

### 3. Transaction Tagging Flow

```
1. User selects transactions
   ↓
2. User selects/creates tag
   ↓
3. POST /api/transaction/bulk-update
   ↓
4. Update each transaction with tag IDs
   ↓
5. Background: Recompute tag summary
   ↓
6. Refresh UI with updated tags
```

### 4. Tag Summary Generation

```
1. User creates/updates/deletes tag
   ↓
2. Trigger recomputeAndSaveTagsSummary(userId)
   ↓
3. Fetch all user transactions from all banks
   ↓
4. Group transactions by tag
   ↓
5. Calculate totals (income, expense, count)
   ↓
6. Save to brmh-fintech-user-reports table
   ↓
7. Cache for 2 minutes on client
```

### 5. Bank Creation Flow

```
1. Admin clicks "Create Bank"
   ↓
2. Enter bank name and tags
   ↓
3. POST /api/bank
   ↓
4. Verify admin email
   ↓
5. Create bank in 'banks' table
   ↓
6. Create dynamic transaction table: brmh-{bank-name}
   ↓
7. Refresh bank list
```

### 6. File Management Flow

```
1. User navigates to Files section
   ↓
2. GET /api/folders (fetch folder structure)
   ↓
3. GET /api/files (fetch files in folder)
   ↓
4. User uploads file
   ↓
5. POST /api/files
   ↓
6. brmhDrive.uploadFile(userId, fileData, parentId)
   ↓
7. File stored in S3: users/{userId}/...
   ↓
8. Metadata saved to brmh-drive-files table
   ↓
9. Refresh file list
```

---

## 🚀 Performance Optimizations

### 1. Client-Side Caching
- Tags list: 5-minute cache
- Tag summary: 2-minute cache
- Tag transactions: 2-minute cache

### 2. Rate Limiting
- Visibility changes: 30-second debounce
- Tag updates: 5-second debounce

### 3. Batch Processing
- Transaction insertion: 25 items per batch
- Concurrent batch processing: 5 batches at once

### 4. Progressive Loading
- Initial load: 500 transactions
- Background load: remaining transactions

### 5. Server-Side Filtering
- Tag-based filtering on backend
- Early termination for large datasets

### 6. Upload Optimization
- File size validation: 50MB max
- Base64 conversion with Buffer (faster)
- Performance metrics tracking
- Client-side validation before upload

### 7. Database Query Optimization
- Pagination with itemPerPage: 100
- FilterExpression for targeted queries
- Client-side filtering fallback

---

## 🔒 Security Features

### 1. Authentication
- bcrypt password hashing (12 rounds)
- JWT-like userId storage
- Session persistence in localStorage

### 2. Authorization
- Admin-only bank creation
- User-specific data isolation
- File access control by userId

### 3. Input Validation
- File size limits (50MB)
- File type validation
- SQL injection prevention (DynamoDB)
- XSS prevention (React escaping)

### 4. Data Isolation
- User-specific folders in S3
- FilterExpression for user data
- No cross-user data access

---

## 📊 Data Flow Summary

```
User Action
    ↓
React Component (Client)
    ↓
Custom Hook / Context
    ↓
API Route (Next.js)
    ↓
BRMH Client (brmhCrud / brmhDrive)
    ↓
BRMH Backend (https://brmh.in)
    ↓
DynamoDB / S3
    ↓
Response back through stack
    ↓
UI Update
```

---

## 🎯 Key Technical Decisions

### 1. Why BRMH Backend?
- **No AWS Setup**: Users don't need AWS credentials
- **Centralized Management**: Single backend for all operations
- **Scalability**: BRMH handles infrastructure
- **Security**: No client-side AWS keys

### 2. Why Dynamic Bank Tables?
- **Flexibility**: Each bank can have unique transaction fields
- **Performance**: Smaller tables for faster queries
- **Isolation**: Bank data is separated

### 3. Why Client-Side Caching?
- **Reduced API Calls**: Lower server load
- **Faster UI**: Instant data access
- **Better UX**: No loading spinners for cached data

### 4. Why Global Tab System?
- **Better UX**: Browser-like navigation
- **No Page Refreshes**: Smooth transitions
- **Persistent State**: Tabs maintain their state

### 5. Why Context over Redux?
- **Simpler**: Less boilerplate
- **Built-in**: No external dependency
- **Sufficient**: App complexity doesn't require Redux

---

## 🔧 Configuration & Environment

### Required Environment Variables

```env
# Admin Configuration
ADMIN_EMAIL=your-admin@example.com
NEXT_PUBLIC_ADMIN_EMAIL=your-admin@example.com

# Optional: Override backend URL
NEXT_PUBLIC_BACKEND_URL=https://brmh.in
```

### No AWS Configuration Needed!
All AWS operations (DynamoDB, S3) are handled by BRMH backend.

---

## 📈 Scalability Considerations

### Current Architecture Supports:
- Unlimited users (isolated by userId)
- Unlimited banks (dynamic table creation)
- Large file uploads (50MB limit, can be increased)
- Millions of transactions (pagination + filtering)
- Multiple concurrent users

### Future Enhancements:
1. **Chunked File Uploads**: For files >50MB
2. **WebSocket Integration**: Real-time updates
3. **Background Jobs**: Long-running operations
4. **CDN Integration**: Faster file downloads
5. **Analytics Dashboard**: Advanced reporting

---

## 🐛 Common Issues & Solutions

### 1. Authentication Issues
**Problem**: User not authenticated after login
**Solution**: Check localStorage for userId and isLoggedIn

### 2. File Upload Fails
**Problem**: File upload returns error
**Solution**: 
- Check file size (<50MB)
- Verify BRMH Drive API is accessible
- Check network connection

### 3. Transactions Not Loading
**Problem**: Transaction list is empty
**Solution**:
- Verify bank-specific table exists
- Check userId in FilterExpression
- Ensure transactions were imported

### 4. Tag Summary Not Updating
**Problem**: Tag counts are incorrect
**Solution**:
- Trigger manual recompute via POST /api/reports/tags-summary
- Check cache expiration (2 minutes)

### 5. Duplicate Transactions
**Problem**: Same transactions appearing multiple times
**Solution**:
- Check duplicateCheckFields in upload
- Verify unique identifiers in CSV

---

## 📚 Code Examples

### Creating a Bank (Admin Only)
```typescript
const response = await fetch('/api/bank', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    bankName: 'Example Bank',
    tags: ['retail', 'commercial'],
    userId: currentUser.userId,
    userEmail: currentUser.email
  })
});
const bank = await response.json();
```

### Uploading a Statement
```typescript
const formData = new FormData();
formData.append('file', file);
formData.append('bankId', bankId);
formData.append('bankName', bankName);
formData.append('accountId', accountId);
formData.append('userId', userId);

const response = await fetch('/api/statement/upload', {
  method: 'POST',
  body: formData
});
const result = await response.json();
```

### Tagging Transactions
```typescript
const response = await fetch('/api/transaction/bulk-update', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    updates: transactions.map(tx => ({
      transactionId: tx.id,
      tags: [tagId],
      bankName: tx.bankName
    }))
  })
});
```

### Creating a Tag
```typescript
const response = await fetch('/api/tags', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    name: 'Salary',
    color: '#4CAF50',
    userId: currentUser.userId
  })
});
const tag = await response.json();
```

---

## 🎓 Learning Resources

### Understanding the Codebase
1. **Start with**: `app/layout.tsx` - Main app layout
2. **Then**: `app/api/brmh-client.ts` - Backend communication
3. **Next**: `app/contexts/GlobalTabContext.tsx` - Tab system
4. **Finally**: `app/components/` - Individual features

### Key Files to Review
- `README.md` - Project overview and setup
- `apidoc.md` - Complete API documentation
- `UPLOAD_OPTIMIZATION_SUMMARY.md` - Upload performance details

---

## 🚀 Getting Started (For New Developers)

### Setup
```bash
# 1. Clone repository
git clone <repo-url>

# 2. Install dependencies
npm install

# 3. Create .env.local
echo "ADMIN_EMAIL=admin@example.com" > .env.local
echo "NEXT_PUBLIC_ADMIN_EMAIL=admin@example.com" >> .env.local

# 4. Run development server
npm run dev

# 5. Open browser
# Navigate to http://localhost:3000
```

### First Steps
1. Create an account at `/login-signup`
2. Login with your credentials
3. Explore the dashboard
4. Create a bank (if admin)
5. Create an account
6. Upload a CSV statement
7. Start tagging transactions

---

## 📝 Summary

**BRMH Fintech** is a production-ready, scalable financial management application that:

✅ **Fully Integrated**: No AWS setup required, uses BRMH backend
✅ **User-Friendly**: Intuitive UI with browser-like navigation
✅ **Performance Optimized**: Caching, batch processing, progressive loading
✅ **Secure**: User isolation, encrypted passwords, access control
✅ **Feature-Rich**: Banks, accounts, transactions, tags, files, reports
✅ **Maintainable**: Clean architecture, TypeScript, documented code
✅ **Scalable**: Handles unlimited users and large datasets

The application successfully abstracts away AWS complexity while providing a powerful, feature-rich financial management platform.

---

**Last Updated**: October 9, 2025
**Version**: 2.0
**Architecture**: Next.js 15 + BRMH Backend + TypeScript


