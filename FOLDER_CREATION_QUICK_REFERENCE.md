# Folder Creation - Quick Reference

## How to Create Folders with Namespace Support

### Frontend API Call

```typescript
const userId = localStorage.getItem('userId');

const response = await fetch('/api/folders', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    userId: userId,
    folderData: {
      name: 'My Folder Name',
      description: 'Optional description' // optional
    },
    parentId: 'ROOT' // or specific folder ID for subfolders
  })
});

const result = await response.json();
console.log('Folder created:', result);
```

### S3 Path Result

For ROOT folders:
```
brmh-drive/namespaces/fintech-f04c3ae0-e1ca-4a9b-b017-e121fedbf29b/users/{userId}/FolderName/
```

For subfolders:
```
brmh-drive/namespaces/fintech-f04c3ae0-e1ca-4a9b-b017-e121fedbf29b/users/{userId}/ParentFolder/FolderName/
```

### Namespace Configuration

**Current Settings**:
- Namespace ID: `f04c3ae0-e1ca-4a9b-b017-e121fedbf29b`
- Namespace Name: `fintech`
- Full Identifier: `fintech-f04c3ae0-e1ca-4a9b-b017-e121fedbf29b`

**Location**: `app/api/brmh-drive-client.ts`

### Pages with Folder Creation

1. **Entities Page** (`app/entities/page.tsx`)
   - Creates entities (which are folders)
   - ✅ Now uses namespace-aware API route

2. **Files Page** (`app/files/page.tsx`)
   - Creates folders for organizing files
   - ✅ Now uses correct API format with namespace

### Backend Route

**Endpoint**: `POST /api/folders`

**Handles**:
- User validation
- Namespace injection for ROOT folders
- BRMH Drive API communication
- Error handling and logging

### Key Points

✅ All folder creation automatically includes namespace
✅ No need to manually specify namespace in frontend
✅ User ID determines the user's directory
✅ Consistent S3 path structure across all operations
✅ Comprehensive logging for debugging

### Console Logs to Watch

**Backend**:
```
📁 Create folder request: { ... }
📁 Using namespace configuration: { ... }
✅ Folder created successfully: { ... }
```

**Frontend**:
```
Folder created with namespace: { ... }
```

---

**Need Help?** Check `NAMESPACE_FOLDER_IMPLEMENTATION.md` for detailed implementation guide.


