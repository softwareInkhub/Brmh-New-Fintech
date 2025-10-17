# Namespace Folder Implementation

## Overview
All folder creation operations across the webapp now automatically use namespace configuration (namespace ID, namespace name, and user ID) to create folders in the correct S3 path structure.

## S3 Path Structure
When a folder is created in ROOT, it follows this path pattern:
```
brmh-drive/namespaces/{namespaceName}-{namespaceId}/users/{userId}/folders/{folderName}/
```

Example:
```
brmh-drive/namespaces/fintech-f04c3ae0-e1ca-4a9b-b017-e121fedbf29b/users/b4e834e8-5081-7069-3dab-7c98bbcf78a7/folders/MyFolder/
```

## Namespace Configuration

### Constants (in `brmh-drive-client.ts`):
```typescript
NAMESPACE_ID = 'f04c3ae0-e1ca-4a9b-b017-e121fedbf29b'
NAMESPACE_NAME = 'fintech'
NAMESPACE_IDENTIFIER = 'fintech-f04c3ae0-e1ca-4a9b-b017-e121fedbf29b'
```

## Implementation Details

### 1. Backend API Route (`/api/folders`)

**File**: `app/api/folders/route.ts`

**POST Method**:
- Automatically includes namespace configuration for ROOT folder creation
- Passes namespace to BRMH Drive client
- Logs folder creation details for debugging

**Request Format**:
```json
{
  "userId": "user-id-here",
  "folderData": {
    "name": "Folder Name",
    "description": "Optional description"
  },
  "parentId": "ROOT"
}
```

**Key Logic**:
```typescript
const namespace = { id: NAMESPACE_ID, name: NAMESPACE_NAME };
const folderResult = await brmhDrive.createFolder(
  userId, 
  folderData, 
  parentId, 
  parentId === 'ROOT' ? namespace : undefined
);
```

### 2. BRMH Drive Client

**File**: `app/api/brmh-drive-client.ts`

**createFolder Method**:
- Accepts optional namespace parameter
- Automatically adds namespaceId and namespaceName to folderData for ROOT folders
- Format: `namespaceId: "fintech_f04c3ae0-e1ca-4a9b-b017-e121fedbf29b"`

**Key Logic**:
```typescript
const requestBody = {
  userId,
  folderData: {
    ...folderData,
    // Add namespace for ROOT folders
    ...(parentId === 'ROOT' && namespace ? {
      namespaceId: `${namespace.name}_${namespace.id}`,
      namespaceName: namespace.name
    } : {})
  },
  parentId
};
```

### 3. Frontend Implementation

#### Entities Page (`app/entities/page.tsx`)
**Changed**: Now uses `/api/folders` route instead of directly calling BRMH Drive API
- ✅ Namespace is automatically applied
- ✅ Consistent with the rest of the application

**Before**:
```typescript
const response = await fetch('https://brmh.in/drive/folder', { ... });
```

**After**:
```typescript
const response = await fetch('/api/folders', { ... });
```

#### Files Page (`app/files/page.tsx`)
**Changed**: Uses correct API format with namespace support
- ✅ Proper request structure
- ✅ Handles server response and updates local state

**Improved**:
```typescript
const response = await fetch('/api/folders', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    userId: userId,
    folderData: {
      name: folderName.trim(),
      description: ''
    },
    parentId: 'ROOT'
  })
});
```

## How It Works

### Folder Creation Flow:

1. **User creates folder** (via Entities page or Files page)
   - User provides folder name and optional description
   - `userId` is retrieved from localStorage

2. **Frontend sends request** to `/api/folders`
   - Includes: userId, folderData, parentId

3. **Backend API route** receives request
   - Validates required fields
   - Adds namespace configuration for ROOT folders
   - Calls BRMH Drive client

4. **BRMH Drive client** processes request
   - Adds namespaceId and namespaceName to folderData
   - Sends to BRMH Drive API

5. **BRMH Drive API** creates folder in S3
   - Path: `brmh-drive/namespaces/{namespaceName}-{namespaceId}/users/{userId}/`
   - Returns folder metadata

6. **Response flows back** to frontend
   - Frontend updates local state
   - Folder appears in UI

## Debugging & Logging

### Backend Logs:
```
📁 Create folder request: { userId, folderName, parentId, namespaceWillBeUsed }
📁 Using namespace configuration: { namespaceId, namespaceName, fullNamespaceId, targetPath }
✅ Folder created successfully: { folderResult }
```

### Frontend Logs:
```
Folder created with namespace: { createdFolder }
```

## Benefits

1. **Consistency**: All folders are created in the same namespace structure
2. **User Isolation**: Each user's folders are stored in their own directory
3. **Organization**: Namespace-based organization for multi-tenant support
4. **Scalability**: Easy to add more namespaces or change configuration
5. **Maintainability**: Single source of truth for namespace configuration

## Testing

### To Test Folder Creation:

1. **Entities Page**:
   - Navigate to Entities page
   - Click "Create Entity" button
   - Enter entity name and description
   - Submit
   - Check console logs for namespace usage
   - Verify folder appears in S3 at correct path

2. **Files Page**:
   - Navigate to Files page
   - Click "Create Folder" button
   - Enter folder name
   - Submit
   - Check console logs for namespace usage
   - Verify folder appears in S3 at correct path

### Expected S3 Path:
```
brmh-drive/
  └── namespaces/
      └── fintech-f04c3ae0-e1ca-4a9b-b017-e121fedbf29b/
          └── users/
              └── {your-user-id}/
                  └── {folder-name}/
```

## Configuration

To change namespace configuration, update the constants in `app/api/brmh-drive-client.ts`:

```typescript
const NAMESPACE_ID = 'f04c3ae0-e1ca-4a9b-b017-e121fedbf29b';
const NAMESPACE_NAME = 'fintech';
const NAMESPACE_IDENTIFIER = `${NAMESPACE_NAME}-${NAMESPACE_ID}`;
```

All folder creation operations will automatically use the new configuration.

## Summary

✅ **All folder creation now uses namespace**
✅ **Consistent S3 path structure**
✅ **User-specific folder isolation**
✅ **Comprehensive logging for debugging**
✅ **Centralized namespace configuration**

---

**Last Updated**: October 16, 2025
**Status**: ✅ Implemented and Working


