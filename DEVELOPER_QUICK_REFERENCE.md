# BRMH Fintech - Developer Quick Reference

> Quick reference guide for common development tasks and API usage

---

## 🚀 Quick Start

```bash
# Install dependencies
npm install

# Start development server
npm run dev

# Build for production
npm run build

# Run linter
npm run lint
```

---

## 🔑 Environment Setup

Create `.env.local`:
```env
ADMIN_EMAIL=admin@example.com
NEXT_PUBLIC_ADMIN_EMAIL=admin@example.com
NEXT_PUBLIC_BACKEND_URL=https://brmh.in
```

---

## 📊 Common CRUD Operations

### Get All Items (Scan)
```typescript
import { brmhCrud, TABLES } from '@/app/api/brmh-client';

// Simple scan
const result = await brmhCrud.scan(TABLES.BANKS, {
  itemPerPage: 100
});
const banks = result.items;

// Filtered scan
const result = await brmhCrud.scan(TABLES.ACCOUNTS, {
  FilterExpression: 'userId = :userId',
  ExpressionAttributeValues: { ':userId': userId },
  itemPerPage: 100
});
const accounts = result.items;
```

### Get Single Item
```typescript
const result = await brmhCrud.getItem(TABLES.BANKS, { id: bankId });
const bank = result.item;
```

### Create Item
```typescript
const newBank = {
  id: uuidv4(),
  bankName: 'Example Bank',
  tags: ['retail'],
  createdBy: userId,
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString()
};

await brmhCrud.create(TABLES.BANKS, newBank);
```

### Update Item
```typescript
await brmhCrud.update(
  TABLES.BANKS,
  { id: bankId }, // Key
  { bankName: 'Updated Name', updatedAt: new Date().toISOString() } // Updates
);
```

### Delete Item
```typescript
await brmhCrud.delete(TABLES.BANKS, { id: bankId });
```

---

## 📁 File Operations

### Upload File
```typescript
import { brmhDrive } from '@/app/api/brmh-drive-client';

// Convert file to base64
const arrayBuffer = await file.arrayBuffer();
const base64Content = Buffer.from(arrayBuffer).toString('base64');

// Upload
const result = await brmhDrive.uploadFile(userId, {
  name: file.name,
  mimeType: file.type,
  size: file.size,
  content: base64Content,
  tags: ['bank-statement']
}, parentId);

console.log('Uploaded file ID:', result.fileId);
```

### List Files
```typescript
const result = await brmhDrive.listFiles(userId, parentId, limit);
const files = result.files;
```

### Download File
```typescript
const result = await brmhDrive.downloadFile(userId, fileId);
const downloadUrl = result.downloadUrl; // Pre-signed S3 URL
```

### Delete File
```typescript
await brmhDrive.deleteFile(userId, fileId);
```

### Create Folder
```typescript
const result = await brmhDrive.createFolder(userId, {
  name: 'My Folder',
  description: 'Folder description'
}, parentId);
```

---

## 🏷️ Tag Operations

### Create Tag
```typescript
const response = await fetch('/api/tags', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    name: 'Salary',
    color: '#4CAF50', // Optional, auto-generated if not provided
    userId: currentUser.userId
  })
});
const tag = await response.json();
```

### Update Tag
```typescript
const response = await fetch('/api/tags', {
  method: 'PUT',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    id: tagId,
    name: 'Updated Name',
    color: '#FF5722'
  })
});
```

### Delete Tag
```typescript
const response = await fetch('/api/tags', {
  method: 'DELETE',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ id: tagId })
});
```

### Tag Transactions
```typescript
const response = await fetch('/api/transaction/bulk-update', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    updates: selectedTransactions.map(tx => ({
      transactionId: tx.id,
      tags: [tagId],
      bankName: tx.bankName
    }))
  })
});
```

---

## 🏦 Bank & Account Operations

### Create Bank (Admin Only)
```typescript
const response = await fetch('/api/bank', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    bankName: 'New Bank',
    tags: ['retail', 'commercial'],
    userId: currentUser.userId,
    userEmail: currentUser.email // Must match ADMIN_EMAIL
  })
});
const bank = await response.json();
```

### Get All Banks
```typescript
const response = await fetch('/api/bank');
const banks = await response.json();
```

### Create Account
```typescript
const response = await fetch('/api/account', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    bankId: 'bank-id',
    accountHolderName: 'John Doe',
    accountNumber: '1234567890',
    ifscCode: 'BANK0001234',
    tags: ['savings'],
    userId: currentUser.userId
  })
});
const account = await response.json();
```

### Get Bank Accounts
```typescript
const response = await fetch(`/api/account?bankId=${bankId}&userId=${userId}`);
const accounts = await response.json();
```

---

## 💳 Transaction Operations

### Upload Statement
```typescript
const formData = new FormData();
formData.append('file', file);
formData.append('bankId', bankId);
formData.append('bankName', bankName);
formData.append('accountId', accountId);
formData.append('accountName', accountName);
formData.append('accountNumber', accountNumber);
formData.append('userId', userId);
formData.append('fileType', 'Statement');

const response = await fetch('/api/statement/upload', {
  method: 'POST',
  body: formData
});
const result = await response.json();
```

### Process CSV Slice
```typescript
const response = await fetch('/api/transaction/slice', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    csv: csvContent,
    statementId: statementId,
    startRow: 0,
    endRow: 100,
    bankId: bankId,
    bankName: bankName,
    accountId: accountId,
    accountName: accountName,
    accountNumber: accountNumber,
    userId: userId,
    duplicateCheckFields: ['Date', 'Amount', 'Description']
  })
});
const result = await response.json();
console.log(`Inserted ${result.inserted} transactions`);
```

### Get Transactions
```typescript
// By account
const response = await fetch(
  `/api/transactions?bankName=${bankName}&accountId=${accountId}&userId=${userId}`
);
const transactions = await response.json();

// All user transactions
const response = await fetch(`/api/transactions/all?userId=${userId}&limit=1000`);
const allTransactions = await response.json();

// By tag (optimized)
const response = await fetch(`/api/transactions/by-tag?tagId=${tagId}&userId=${userId}`);
const taggedTransactions = await response.json();
```

### Update Single Transaction
```typescript
const response = await fetch('/api/transaction/update', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    transactionId: txId,
    transactionData: {
      description: 'Updated description',
      amount: 150.00
    },
    tags: [tagId1, tagId2],
    bankName: bankName
  })
});
```

---

## 📊 Reports & Analytics

### Get Dashboard Summary
```typescript
const response = await fetch(`/api/dashboard/summary?userId=${userId}`);
const summary = await response.json();
// Returns: banks, accounts, statements, totalTransactions, recentTransactions
```

### Get Tag Summary
```typescript
const response = await fetch(`/api/reports/tags-summary?userId=${userId}`);
const tagSummary = await response.json();
// Returns: tags array with counts and totals
```

### Recompute Tag Summary
```typescript
const response = await fetch('/api/reports/tags-summary', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ userId: userId })
});
```

### Get Cashflow Report
```typescript
const response = await fetch(`/api/reports/cashflow?userId=${userId}`);
const cashflow = await response.json();
```

### Save Cashflow Report
```typescript
const response = await fetch('/api/reports/cashflow', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    userId: userId,
    cashFlowData: cashflowSections
  })
});
```

---

## 🎣 Custom Hooks

### useAuth
```typescript
import { useAuth } from '@/app/hooks/useAuth';

function MyComponent() {
  const { user, isLoading, isAuthenticated, login, logout, requireAuth } = useAuth();
  
  useEffect(() => {
    requireAuth(); // Redirect to login if not authenticated
  }, [requireAuth]);
  
  const handleLogin = async () => {
    const response = await fetch('/api/users', {
      method: 'POST',
      body: JSON.stringify({ action: 'login', email, password })
    });
    const data = await response.json();
    login({ userId: data.userId, email: data.email, name: data.name });
  };
  
  return <div>{user?.name}</div>;
}
```

### useCachedFetch
```typescript
import { useCachedFetch } from '@/app/hooks/useCachedFetch';

function MyComponent() {
  const { data, loading, error, refetch } = useCachedFetch(
    '/api/tags?userId=' + userId,
    'tags-list',
    5 * 60 * 1000 // 5 minutes TTL
  );
  
  if (loading) return <div>Loading...</div>;
  if (error) return <div>Error: {error}</div>;
  
  return (
    <div>
      {data.map(tag => <div key={tag.id}>{tag.name}</div>)}
      <button onClick={refetch}>Refresh</button>
    </div>
  );
}
```

### useTabManager
```typescript
import { useTabManager } from '@/app/hooks/useTabManager';

function Navigation() {
  const { 
    openDashboard, 
    openBanks, 
    openEntities, 
    openTags, 
    openFiles, 
    openReports 
  } = useTabManager();
  
  return (
    <nav>
      <button onClick={openDashboard}>Dashboard</button>
      <button onClick={openBanks}>Banks</button>
      <button onClick={openTags}>Tags</button>
    </nav>
  );
}
```

---

## 🎨 Context Usage

### GlobalTabContext
```typescript
import { useGlobalTabs } from '@/app/contexts/GlobalTabContext';

function TabManager() {
  const { tabs, activeTabId, addTab, removeTab, setActiveTab } = useGlobalTabs();
  
  const openCustomTab = () => {
    addTab({
      id: 'custom-' + Date.now(),
      title: 'Custom Tab',
      type: 'custom',
      component: <CustomComponent />,
      closable: true
    });
  };
  
  return (
    <div>
      {tabs.map(tab => (
        <button
          key={tab.id}
          onClick={() => setActiveTab(tab.id)}
          className={activeTabId === tab.id ? 'active' : ''}
        >
          {tab.title}
          {tab.closable && <span onClick={() => removeTab(tab.id)}>×</span>}
        </button>
      ))}
    </div>
  );
}
```

### EntitySyncContext
```typescript
import { useEntitySync } from '@/app/contexts/EntitySyncContext';

function EntityList() {
  const { refreshTrigger, triggerRefresh } = useEntitySync();
  
  useEffect(() => {
    // Refetch entities when refresh is triggered
    fetchEntities();
  }, [refreshTrigger]);
  
  const handleCreate = async () => {
    await createEntity();
    triggerRefresh(); // Notify other components
  };
  
  return <button onClick={handleCreate}>Create Entity</button>;
}
```

---

## 🎯 Common Patterns

### Pagination Pattern
```typescript
async function fetchAllItems(tableName: string, userId: string) {
  const allItems: any[] = [];
  let lastEvaluatedKey: any = undefined;
  let hasMore = true;
  
  while (hasMore) {
    const result = await brmhCrud.scan(tableName, {
      FilterExpression: 'userId = :userId',
      ExpressionAttributeValues: { ':userId': userId },
      itemPerPage: 100,
      pagination: lastEvaluatedKey
    });
    
    allItems.push(...(result.items || []));
    lastEvaluatedKey = result.lastEvaluatedKey;
    hasMore = !!lastEvaluatedKey;
    
    // Rate limiting
    if (hasMore) {
      await new Promise(resolve => setTimeout(resolve, 100));
    }
  }
  
  return allItems;
}
```

### Batch Processing Pattern
```typescript
async function batchProcess(items: any[], batchSize = 25) {
  const results = [];
  
  for (let i = 0; i < items.length; i += batchSize) {
    const batch = items.slice(i, i + batchSize);
    const batchPromises = batch.map(item => processItem(item));
    const batchResults = await Promise.allSettled(batchPromises);
    results.push(...batchResults);
  }
  
  return results;
}
```

### Error Handling Pattern
```typescript
async function safeApiCall<T>(apiCall: () => Promise<T>): Promise<T | null> {
  try {
    return await apiCall();
  } catch (error) {
    console.error('API call failed:', error);
    if (error instanceof Error) {
      // Show user-friendly error
      alert(error.message);
    }
    return null;
  }
}

// Usage
const banks = await safeApiCall(() => 
  fetch('/api/bank').then(r => r.json())
);
```

---

## 🔍 Debugging Tips

### Enable Debug Logging
```typescript
// In development mode, all requests are logged
// Check browser console for:
// - API requests/responses
// - BRMH client operations
// - Performance metrics

// For file uploads, check for:
console.log('Base64 conversion time:', metrics.base64Time);
console.log('Upload time:', metrics.uploadTime);
console.log('Total time:', metrics.totalTime);
```

### Common Issues

**Issue: "User not authenticated"**
```typescript
// Check localStorage
console.log('userId:', localStorage.getItem('userId'));
console.log('isLoggedIn:', localStorage.getItem('isLoggedIn'));

// Clear and re-login
localStorage.clear();
// Then login again
```

**Issue: "Failed to fetch"**
```typescript
// Check BRMH backend status
fetch('https://brmh.in/health')
  .then(r => r.json())
  .then(console.log)
  .catch(console.error);
```

**Issue: "Duplicate transactions"**
```typescript
// Use duplicate check fields
duplicateCheckFields: ['Date', 'Amount', 'Description']
// Or skip check for testing
skipDuplicateCheck: true
```

---

## 📝 TypeScript Types

### Common Types
```typescript
interface Bank {
  id: string;
  bankName: string;
  tags?: string[];
  createdBy: string;
  createdAt: string;
  updatedAt: string;
}

interface Account {
  id: string;
  bankId: string;
  accountHolderName: string;
  accountNumber: string;
  ifscCode: string;
  tags?: string[];
  userId: string;
}

interface Transaction {
  id: string;
  userId: string;
  bankId: string;
  bankName: string;
  accountId: string;
  accountName: string;
  accountNumber: string;
  statementId: string;
  fileName: string;
  tags: string[]; // Tag IDs
  createdAt: string;
  [key: string]: any; // Bank-specific fields
}

interface Tag {
  id: string;
  name: string;
  color: string;
  userId: string;
  createdAt: string;
}

interface User {
  userId: string;
  email: string;
  name?: string;
}
```

---

## 🚀 Performance Tips

1. **Use Client-Side Caching**
   ```typescript
   const { data } = useCachedFetch(url, key, 5 * 60 * 1000);
   ```

2. **Batch API Calls**
   ```typescript
   const [banks, accounts, tags] = await Promise.all([
     fetch('/api/bank').then(r => r.json()),
     fetch('/api/account?userId=' + userId).then(r => r.json()),
     fetch('/api/tags?userId=' + userId).then(r => r.json())
   ]);
   ```

3. **Debounce Expensive Operations**
   ```typescript
   const debouncedSearch = useMemo(
     () => debounce((query) => performSearch(query), 300),
     []
   );
   ```

4. **Use Progressive Loading**
   ```typescript
   // Load first batch immediately
   const first500 = await fetchTransactions(0, 500);
   setTransactions(first500);
   
   // Load rest in background
   setTimeout(() => {
     fetchTransactions(500, Infinity).then(rest => {
       setTransactions([...first500, ...rest]);
     });
   }, 1000);
   ```

---

## 📚 Additional Resources

- **Full Documentation**: `PROJECT_COMPLETE_UNDERSTANDING.md`
- **Architecture Diagrams**: `ARCHITECTURE_DIAGRAMS.md`
- **API Documentation**: `apidoc.md`
- **Upload Optimization**: `UPLOAD_OPTIMIZATION_SUMMARY.md`
- **README**: `README.md`

---

## 🆘 Getting Help

### Common Commands
```bash
# Clear all node_modules and reinstall
rm -rf node_modules package-lock.json && npm install

# Clear Next.js cache
rm -rf .next

# Check for TypeScript errors
npm run build

# Run linter
npm run lint
```

### Support Contacts
- Backend Issues: Check BRMH backend status at https://brmh.in
- Frontend Issues: Check browser console for errors
- Authentication: Verify .env.local configuration

---

**Quick Reference Version**: 1.0  
**Last Updated**: October 9, 2025


