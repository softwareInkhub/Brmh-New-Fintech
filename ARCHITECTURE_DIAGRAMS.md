# BRMH Fintech - Architecture Diagrams

## 🏗️ System Architecture Overview

```
┌─────────────────────────────────────────────────────────────────┐
│                      BRMH Fintech Application                     │
│                                                                   │
│  ┌───────────────────────────────────────────────────────────┐  │
│  │                   Frontend Layer (Next.js 15)              │  │
│  │                                                             │  │
│  │  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐    │  │
│  │  │   React      │  │   Context    │  │   Custom     │    │  │
│  │  │  Components  │  │   Providers  │  │    Hooks     │    │  │
│  │  └──────┬───────┘  └──────┬───────┘  └──────┬───────┘    │  │
│  │         │                 │                  │             │  │
│  │         └─────────────────┴──────────────────┘             │  │
│  │                           │                                 │  │
│  └───────────────────────────┼─────────────────────────────────┘  │
│                              │                                    │
│  ┌───────────────────────────▼─────────────────────────────────┐  │
│  │              API Routes Layer (Next.js App Router)          │  │
│  │                                                             │  │
│  │  /api/bank    /api/account    /api/transactions           │  │
│  │  /api/tags    /api/files      /api/reports                │  │
│  │  /api/users   /api/folders    /api/statements             │  │
│  │                                                             │  │
│  └───────────────────────────────────────────────────────────┘  │
│                              │                                    │
└──────────────────────────────┼────────────────────────────────────┘
                               │
                               │ HTTPS
                               │
            ┌──────────────────┴──────────────────┐
            │                                     │
            ▼                                     ▼
┌────────────────────────┐          ┌────────────────────────┐
│   BRMH CRUD Client     │          │   BRMH Drive Client    │
│   (brmh-client.ts)     │          │ (brmh-drive-client.ts) │
│                        │          │                        │
│  • create()            │          │  • uploadFile()        │
│  • get()               │          │  • downloadFile()      │
│  • update()            │          │  • deleteFile()        │
│  • delete()            │          │  • createFolder()      │
│  • scan()              │          │  • shareFile()         │
└────────┬───────────────┘          └────────┬───────────────┘
         │                                   │
         │ POST/GET/PUT/DELETE              │ POST/GET/DELETE
         │                                   │
         ▼                                   ▼
┌─────────────────────────────────────────────────────────────┐
│              BRMH Backend (https://brmh.in)                 │
│                                                             │
│  ┌─────────────────────┐      ┌─────────────────────┐     │
│  │   /crud endpoint    │      │   /drive endpoint   │     │
│  │   (Database Ops)    │      │   (File Ops)        │     │
│  └──────────┬──────────┘      └──────────┬──────────┘     │
│             │                            │                 │
└─────────────┼────────────────────────────┼─────────────────┘
              │                            │
              ▼                            ▼
     ┌─────────────────┐         ┌─────────────────┐
     │   DynamoDB      │         │   Amazon S3     │
     │   (Database)    │         │ (File Storage)  │
     └─────────────────┘         └─────────────────┘
```

---

## 📊 Database Schema Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                     DynamoDB Tables                             │
│                                                                 │
│  ┌──────────────┐    ┌──────────────┐    ┌──────────────┐    │
│  │    banks     │    │   accounts   │    │    users     │    │
│  │              │    │              │    │              │    │
│  │ • id         │◄───┤ • bankId     │    │ • userId     │    │
│  │ • bankName   │    │ • userId     │◄───┤ • email      │    │
│  │ • createdBy  │    │ • accountNum │    │ • password   │    │
│  └──────┬───────┘    └──────┬───────┘    └──────────────┘    │
│         │                   │                                  │
│         └────┬──────────────┘                                  │
│              │                                                  │
│              ▼                                                  │
│  ┌─────────────────────────────────────────────────────┐      │
│  │  bank-statements                                    │      │
│  │                                                      │      │
│  │  • id                                                │      │
│  │  • bankId                                            │      │
│  │  • accountId                                         │      │
│  │  • userId                                            │      │
│  │  • fileName                                          │      │
│  │  • driveFileId ────┐                                │      │
│  └─────────────────────┼────────────────────────────────┘      │
│                        │                                        │
│         ┌──────────────┘                                        │
│         │                                                       │
│         ▼                                                       │
│  ┌──────────────────────────────────────────────────────┐     │
│  │  brmh-drive-files                                     │     │
│  │                                                       │     │
│  │  • id                                                 │     │
│  │  • userId                                             │     │
│  │  • name                                               │     │
│  │  • s3Key      ───────────┐                          │     │
│  │  • parentId               │                          │     │
│  │  • bankId                 │                          │     │
│  └───────────────────────────┼──────────────────────────┘     │
│                               │                                │
│  ┌───────────────────────────▼──────────────────────────┐     │
│  │  brmh-{bank-name} (Dynamic Transaction Tables)       │     │
│  │                                                       │     │
│  │  • id                                                 │     │
│  │  • userId                                             │     │
│  │  • bankId                                             │     │
│  │  • accountId                                          │     │
│  │  • tags[] ───────┐                                   │     │
│  │  • ...CSV fields │                                   │     │
│  └──────────────────┼───────────────────────────────────┘     │
│                     │                                          │
│         ┌───────────┘                                          │
│         │                                                      │
│         ▼                                                      │
│  ┌──────────────────────────────────────────────────────┐     │
│  │  tags                                                 │     │
│  │                                                       │     │
│  │  • id                                                 │     │
│  │  • name                                               │     │
│  │  • color                                              │     │
│  │  • userId                                             │     │
│  └───────────────────────────────────────────────────────┘     │
│                                                                │
│  ┌──────────────────────────────────────────────────────┐     │
│  │  brmh-fintech-user-reports                           │     │
│  │                                                       │     │
│  │  • id (tags_summary_{userId})                        │     │
│  │  • userId                                             │     │
│  │  • tags[]                                             │     │
│  │  • totals                                             │     │
│  │                                                       │     │
│  │  • id (cashflow_{userId})                            │     │
│  │  • cashFlowData                                       │     │
│  └───────────────────────────────────────────────────────┘     │
└─────────────────────────────────────────────────────────────────┘
```

---

## 🔄 Statement Upload Flow Diagram

```
┌─────────────────────────────────────────────────────────────────┐
│                    Statement Upload Process                      │
└─────────────────────────────────────────────────────────────────┘

     User Selects CSV File
            │
            ▼
┌───────────────────────────┐
│  Client-Side Validation   │
│  • File size < 50MB       │
│  • File type = CSV        │
└───────────┬───────────────┘
            │ ✓ Valid
            ▼
┌───────────────────────────┐
│  Convert to Base64        │
│  • Read as ArrayBuffer    │
│  • Buffer.from().base64   │
└───────────┬───────────────┘
            │
            ▼
┌───────────────────────────┐
│ POST /api/statement/upload│
│  FormData:                │
│  • file                   │
│  • bankId                 │
│  • accountId              │
│  • userId                 │
└───────────┬───────────────┘
            │
            ▼
┌───────────────────────────┐
│  BRMH Drive Upload        │
│  POST /drive/upload       │
│  • Upload to S3           │
│  • users/{userId}/...     │
└───────────┬───────────────┘
            │
            ▼
┌───────────────────────────┐
│  Save to DynamoDB         │
│  Table: brmh-drive-files  │
│  • fileId                 │
│  • s3Key                  │
│  • metadata               │
└───────────┬───────────────┘
            │
            ▼
┌───────────────────────────┐
│  User Previews CSV        │
│  • View headers           │
│  • Map columns            │
│  • Select row range       │
└───────────┬───────────────┘
            │
            ▼
┌───────────────────────────┐
│ POST /api/transaction/slice│
│  • csv content            │
│  • startRow, endRow       │
│  • bankName               │
└───────────┬───────────────┘
            │
            ▼
┌───────────────────────────┐
│  Parse CSV with PapaParse │
│  • Convert to objects     │
│  • Validate fields        │
└───────────┬───────────────┘
            │
            ▼
┌───────────────────────────┐
│  Duplicate Check          │
│  • Compare with existing  │
│  • Check within upload    │
└───────────┬───────────────┘
            │ ✓ No duplicates
            ▼
┌───────────────────────────┐
│  Batch Insert (25 each)   │
│  • Create UUIDs           │
│  • Add metadata           │
│  • Parallel processing    │
└───────────┬───────────────┘
            │
            ▼
┌───────────────────────────┐
│  Save to Bank Table       │
│  brmh-{bank-name}         │
│  • All transactions       │
└───────────┬───────────────┘
            │
            ▼
┌───────────────────────────┐
│  Success Response         │
│  • Inserted count         │
│  • Performance metrics    │
│  • Processing time        │
└───────────┬───────────────┘
            │
            ▼
      UI Refreshes
   Transaction List Updated
```

---

## 🏷️ Transaction Tagging Flow

```
┌─────────────────────────────────────────────────────────────────┐
│                    Transaction Tagging Flow                      │
└─────────────────────────────────────────────────────────────────┘

  User Selects Transactions
            │
            ▼
┌───────────────────────────┐
│  Select or Create Tag     │
│  • Choose existing tag    │
│  • Create new tag         │
└───────────┬───────────────┘
            │
            ▼
┌───────────────────────────┐
│ POST /api/tags (if new)   │
│  • name                   │
│  • color (auto-generated) │
│  • userId                 │
└───────────┬───────────────┘
            │
            ▼
┌───────────────────────────┐
│ POST /api/transaction/    │
│      bulk-update          │
│  updates: [               │
│    { transactionId,       │
│      tags: [tagId],       │
│      bankName }           │
│  ]                        │
└───────────┬───────────────┘
            │
            ▼
┌───────────────────────────┐
│  Update Each Transaction  │
│  • Loop through updates   │
│  • Update tags field      │
│  • Bank-specific table    │
└───────────┬───────────────┘
            │
            ▼
┌───────────────────────────┐
│  Background Operations    │
│  (Async, non-blocking)    │
│                           │
│  • Recompute Tag Summary  │
│  • Update Cashflow        │
│  • Recalculate Totals     │
└───────────┬───────────────┘
            │
            ▼
┌───────────────────────────┐
│  Update Reports Table     │
│  brmh-fintech-user-reports│
│  • tags_summary_{userId}  │
│  • cashflow_{userId}      │
└───────────┬───────────────┘
            │
            ▼
      UI Refreshes
   Tags Displayed on Transactions
```

---

## 🔐 Authentication Flow

```
┌─────────────────────────────────────────────────────────────────┐
│                    Authentication Flow                           │
└─────────────────────────────────────────────────────────────────┘

        App Loads
            │
            ▼
┌───────────────────────────┐
│  AuthWrapper Component    │
│  • Check localStorage     │
│  • userId exists?         │
│  • isLoggedIn = true?     │
└───────────┬───────────────┘
            │
       ┌────┴────┐
       │         │
    ✓ Yes      ✗ No
       │         │
       │         ▼
       │    ┌────────────────────┐
       │    │ Redirect to Login  │
       │    │ /login-signup      │
       │    └────────┬───────────┘
       │             │
       │             ▼
       │    ┌────────────────────┐
       │    │ User Enters Creds  │
       │    │ • email            │
       │    │ • password         │
       │    └────────┬───────────┘
       │             │
       │             ▼
       │    ┌────────────────────┐
       │    │ POST /api/users    │
       │    │ action: "login"    │
       │    └────────┬───────────┘
       │             │
       │             ▼
       │    ┌────────────────────┐
       │    │ Find User by Email │
       │    │ Table: users       │
       │    └────────┬───────────┘
       │             │
       │             ▼
       │    ┌────────────────────┐
       │    │ Verify Password    │
       │    │ bcrypt.compare()   │
       │    └────────┬───────────┘
       │             │
       │        ✓ Valid
       │             │
       │             ▼
       │    ┌────────────────────┐
       │    │ Store in localStorage│
       │    │ • userId           │
       │    │ • isLoggedIn=true  │
       │    └────────┬───────────┘
       │             │
       └─────────────┘
                     │
                     ▼
            ┌────────────────────┐
            │ GET /api/users     │
            │ ?id={userId}       │
            │ Fetch user details │
            └────────┬───────────┘
                     │
                     ▼
            ┌────────────────────┐
            │ Set User Context   │
            │ • userId           │
            │ • email            │
            │ • name             │
            └────────┬───────────┘
                     │
                     ▼
              Render App
           Dashboard Opens
```

---

## 📁 File Storage Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│              S3 Bucket Structure (via BRMH Drive)                │
└─────────────────────────────────────────────────────────────────┘

brmh-drive-bucket/
│
├── users/
│   │
│   ├── user_123456/
│   │   ├── ROOT/
│   │   │   ├── statement_2024_01.csv
│   │   │   ├── invoice_jan.pdf
│   │   │   └── report.xlsx
│   │   │
│   │   ├── Documents/
│   │   │   ├── contract.pdf
│   │   │   └── agreement.docx
│   │   │
│   │   └── Statements/
│   │       ├── bank_statement_q1.csv
│   │       └── bank_statement_q2.csv
│   │
│   ├── user_789012/
│   │   ├── ROOT/
│   │   │   └── statement_2024_01.csv
│   │   │
│   │   └── Reports/
│   │       └── financial_report.pdf
│   │
│   └── ...
│
└── shared/
    ├── {shareId}_fileId/
    └── ...

┌─────────────────────────────────────────────────────────────────┐
│          DynamoDB: brmh-drive-files (Metadata Storage)           │
└─────────────────────────────────────────────────────────────────┘

File Record:
{
  id: "file_abc123",
  userId: "user_123456",
  name: "statement_2024_01.csv",
  type: "file",
  mimeType: "text/csv",
  size: 2048000,
  parentId: "ROOT",
  s3Key: "users/user_123456/ROOT/statement_2024_01.csv",
  s3Url: "https://s3.amazonaws.com/...",
  downloadUrl: "https://presigned-url...",
  createdAt: "2024-01-15T10:30:00Z",
  
  // Bank metadata (for statements)
  bankId: "bank_xyz",
  bankName: "Example Bank",
  accountId: "acc_456"
}
```

---

## 🔄 Data Synchronization Pattern

```
┌─────────────────────────────────────────────────────────────────┐
│              Context-Based Data Sync Pattern                     │
└─────────────────────────────────────────────────────────────────┘

     Component A                Component B              Component C
         │                          │                        │
         │                          │                        │
         └──────────┬───────────────┴────────────────────────┘
                    │
                    ▼
        ┌───────────────────────────┐
        │   EntitySyncContext       │
        │   • refreshTrigger        │
        │   • triggerRefresh()      │
        └────────────┬──────────────┘
                     │
        ┌────────────┴────────────┐
        │                         │
        ▼                         ▼
  Component A                Component B
  useEffect(() => {          useEffect(() => {
    refetch()                  refetch()
  }, [refreshTrigger])       }, [refreshTrigger])


Flow:
1. User action in Component A (e.g., creates entity)
2. Component A calls triggerRefresh()
3. Context updates refreshTrigger
4. All subscribed components detect change
5. Each component refetches its data
6. UI updates across all components
```

---

## 🎯 Global Tab System Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                    Global Tab System                             │
└─────────────────────────────────────────────────────────────────┘

┌────────────────────────────────────────────────────────────────┐
│  GlobalTabContext                                              │
│                                                                │
│  State:                                                        │
│  • tabs: GlobalTab[]                                          │
│  • activeTabId: string | null                                 │
│                                                                │
│  Operations:                                                   │
│  • addTab(tab)         - Add or update tab                   │
│  • removeTab(id)       - Remove tab                          │
│  • setActiveTab(id)    - Switch active tab                   │
│  • closeTab(id)        - Close single tab                    │
│  • closeAllTabs()      - Close all tabs                      │
│  • closeOtherTabs(id)  - Close all except one                │
│  • duplicateTab(id)    - Duplicate existing tab              │
└────────────────────────────────────────────────────────────────┘
                            │
                            ▼
┌────────────────────────────────────────────────────────────────┐
│  GlobalTabBar (UI Component)                                   │
│                                                                │
│  ┌──────┐ ┌──────┐ ┌──────┐ ┌──────┐                        │
│  │ Tab1 │ │ Tab2 │ │ Tab3 │ │  +   │                        │
│  └──────┘ └──────┘ └──────┘ └──────┘                        │
│                                                                │
│  Features:                                                     │
│  • Click to switch tab                                         │
│  • Right-click for context menu                                │
│  • Close button on each tab                                    │
│  • Drag to reorder (future)                                    │
└────────────────────────────────────────────────────────────────┘
                            │
                            ▼
┌────────────────────────────────────────────────────────────────┐
│  GlobalTabContent                                              │
│                                                                │
│  Renders: tabs[activeTabId].component                         │
│                                                                │
│  • Only active tab is rendered                                 │
│  • Component state is preserved                                │
│  • No re-mounting on tab switch                                │
└────────────────────────────────────────────────────────────────┘

Tab Types:
• dashboard     - Main dashboard
• banks         - Bank transaction view
• entities      - Entity management
• tags          - Tag management
• files         - File browser
• reports       - Financial reports
• file-matching - CSV comparison tool
```

---

## 🚀 Performance Optimization Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                 Performance Optimization Layers                  │
└─────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────┐
│  Layer 1: Client-Side Caching                                   │
│                                                                  │
│  useCachedFetch(url, cacheKey, ttl)                            │
│                                                                  │
│  Cache Store:                                                    │
│  {                                                               │
│    'tags-list': { data: [...], timestamp: 1234567890 },        │
│    'tags-summary': { data: {...}, timestamp: 1234567890 },     │
│    'bank-transactions': { data: [...], timestamp: 1234567890 } │
│  }                                                               │
│                                                                  │
│  TTL Values:                                                     │
│  • Tags list: 5 minutes                                         │
│  • Tag summary: 2 minutes                                       │
│  • Tag transactions: 2 minutes                                  │
└─────────────────────────────────────────────────────────────────┘
                            │
                            ▼
┌─────────────────────────────────────────────────────────────────┐
│  Layer 2: Rate Limiting & Debouncing                            │
│                                                                  │
│  Debounced Operations:                                           │
│  • Tag visibility changes: 30s                                   │
│  • Tag updates: 5s                                               │
│  • Search queries: 300ms                                         │
│                                                                  │
│  Rate Limiting:                                                  │
│  • Max API calls per minute: 60                                 │
│  • Concurrent requests: 5                                        │
└─────────────────────────────────────────────────────────────────┘
                            │
                            ▼
┌─────────────────────────────────────────────────────────────────┐
│  Layer 3: Batch Processing                                      │
│                                                                  │
│  Transaction Insertion:                                          │
│  • Batch size: 25 items                                         │
│  • Concurrent batches: 5                                         │
│  • Total throughput: 125 items at once                          │
│                                                                  │
│  Tag Updates:                                                    │
│  • Batch size: 50 transactions                                  │
│  • Parallel processing with Promise.allSettled                  │
└─────────────────────────────────────────────────────────────────┘
                            │
                            ▼
┌─────────────────────────────────────────────────────────────────┐
│  Layer 4: Progressive Loading                                   │
│                                                                  │
│  Initial Load:                                                   │
│  • First 500 transactions immediately                            │
│  • Show to user right away                                       │
│                                                                  │
│  Background Load:                                                │
│  • Remaining transactions in background                          │
│  • No UI blocking                                                │
│  • Update UI when complete                                       │
└─────────────────────────────────────────────────────────────────┘
                            │
                            ▼
┌─────────────────────────────────────────────────────────────────┐
│  Layer 5: Server-Side Optimization                              │
│                                                                  │
│  Database Queries:                                               │
│  • Pagination: 100 items per page                               │
│  • FilterExpression for targeted queries                        │
│  • Early termination for large datasets                         │
│                                                                  │
│  Background Jobs:                                                │
│  • Tag summary recomputation                                     │
│  • Cashflow updates                                              │
│  • Report generation                                             │
│  • All non-blocking using setImmediate()                        │
└─────────────────────────────────────────────────────────────────┘
```

---

## 🔒 Security Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                     Security Layers                              │
└─────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────┐
│  Layer 1: Authentication                                         │
│                                                                  │
│  • Password hashing: bcrypt (12 rounds)                         │
│  • Session storage: localStorage                                 │
│  • Auto-logout on invalid session                                │
│  • No tokens in URL parameters                                   │
└─────────────────────────────────────────────────────────────────┘
                            │
                            ▼
┌─────────────────────────────────────────────────────────────────┐
│  Layer 2: Authorization                                          │
│                                                                  │
│  • Admin-only operations (bank creation)                        │
│  • User-specific data filtering                                  │
│  • File access control by userId                                │
│  • No cross-user data leakage                                    │
└─────────────────────────────────────────────────────────────────┘
                            │
                            ▼
┌─────────────────────────────────────────────────────────────────┐
│  Layer 3: Input Validation                                       │
│                                                                  │
│  Client-Side:                                                    │
│  • File size limits (50MB)                                      │
│  • File type validation                                          │
│  • Form field validation                                         │
│                                                                  │
│  Server-Side:                                                    │
│  • Re-validate all inputs                                        │
│  • Sanitize user data                                            │
│  • Prevent SQL injection (DynamoDB)                             │
└─────────────────────────────────────────────────────────────────┘
                            │
                            ▼
┌─────────────────────────────────────────────────────────────────┐
│  Layer 4: Data Isolation                                         │
│                                                                  │
│  DynamoDB:                                                       │
│  • FilterExpression: 'userId = :userId'                         │
│  • No global scans                                               │
│  • User-specific queries only                                    │
│                                                                  │
│  S3:                                                             │
│  • Path: users/{userId}/...                                     │
│  • Pre-signed URLs with expiration                              │
│  • No public bucket access                                       │
└─────────────────────────────────────────────────────────────────┘
                            │
                            ▼
┌─────────────────────────────────────────────────────────────────┐
│  Layer 5: API Security                                           │
│                                                                  │
│  • HTTPS only (enforced by BRMH)                                │
│  • CORS configuration                                            │
│  • Rate limiting (future)                                        │
│  • Error messages don't expose internals                        │
└─────────────────────────────────────────────────────────────────┘
```

---

## 📊 Report Generation Flow

```
┌─────────────────────────────────────────────────────────────────┐
│                Tag Summary Report Generation                     │
└─────────────────────────────────────────────────────────────────┘

  Trigger Event
  (Tag created/updated/deleted)
            │
            ▼
┌───────────────────────────┐
│ POST /api/reports/        │
│      tags-summary         │
│ { userId }                │
└───────────┬───────────────┘
            │
            ▼
┌───────────────────────────┐
│ recomputeAndSaveTagsSummary│
│ (Aggregate function)      │
└───────────┬───────────────┘
            │
            ▼
┌───────────────────────────┐
│ Fetch All User Banks      │
│ Table: banks              │
│ Filter: createdBy=userId  │
└───────────┬───────────────┘
            │
            ▼
┌───────────────────────────┐
│ For Each Bank:            │
│ • Get table name          │
│ • Scan all transactions   │
│ • Filter by userId        │
└───────────┬───────────────┘
            │
            ▼
┌───────────────────────────┐
│ Group by Tag              │
│ For each transaction:     │
│ • Read tags array         │
│ • Add to tag totals       │
│ • Calculate income/expense│
└───────────┬───────────────┘
            │
            ▼
┌───────────────────────────┐
│ Fetch Tag Details         │
│ Table: tags               │
│ Get: name, color          │
└───────────┬───────────────┘
            │
            ▼
┌───────────────────────────┐
│ Generate Summary          │
│ {                         │
│   tags: [                 │
│     {                     │
│       id, name, color,    │
│       count, income,      │
│       expense, total      │
│     }                     │
│   ],                      │
│   totals: {               │
│     totalIncome,          │
│     totalExpense,         │
│     netTotal              │
│   }                       │
│ }                         │
└───────────┬───────────────┘
            │
            ▼
┌───────────────────────────┐
│ Save to Reports Table     │
│ Table: brmh-fintech-      │
│        user-reports       │
│ Key: tags_summary_{userId}│
└───────────┬───────────────┘
            │
            ▼
┌───────────────────────────┐
│ Return Success            │
│ Cache for 2 minutes       │
└───────────────────────────┘
```

---

These diagrams provide a visual representation of the system architecture, data flows, and key processes in the BRMH Fintech application.


