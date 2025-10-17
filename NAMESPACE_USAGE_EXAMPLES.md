# BRMH Drive Namespace Usage Examples

This document provides comprehensive examples of how to use the updated BRMH Drive client with namespace support.

## Namespace Configuration

```typescript
// Namespace constants (already configured in brmh-drive-client.ts)
const NAMESPACE_ID = 'f04c3ae0-e1ca-4a9b-b017-e121fedbf29b';
const NAMESPACE_NAME = 'fintech';
```

## Expected S3 Path Structure

After implementing namespace support, your files will be stored with this structure:

```
brmh-drive/namespaces/fintech_f04c3ae0-e1ca-4a9b-b017-e121fedbf29b/users/b4e834e8-5081-7069-3dab-7c98bbcf78a7/
├── file.pdf                    ← ROOT file
├── file.csv                    ← ROOT file  
├── document.xlsx               ← ROOT file
├── folder/                     ← ROOT folder
│   └── .folder                 ← Folder marker
├── Documents/                  ← ROOT folder
│   └── .folder                 ← Folder marker
└── Reports/                    ← ROOT folder
    └── .folder                 ← Folder marker
```

## 1. Upload Files to Namespace ROOT

### Using BRMH Drive Client Directly

```typescript
import { brmhDrive, NAMESPACE_ID, NAMESPACE_NAME } from './app/api/brmh-drive-client';

// Upload to namespace ROOT
const uploadToNamespaceRoot = async (file: File) => {
  const userId = localStorage.getItem('user_id');
  const namespace = { id: NAMESPACE_ID, name: NAMESPACE_NAME };
  
  // Convert file to base64
  const arrayBuffer = await file.arrayBuffer();
  const base64Content = Buffer.from(arrayBuffer).toString('base64');
  
  const result = await brmhDrive.uploadFile(userId, {
    name: file.name,
    mimeType: file.type,
    size: arrayBuffer.byteLength,
    content: base64Content,
    tags: ['namespace-upload']
  }, 'ROOT', namespace); // Pass namespace for ROOT
  
  console.log('Uploaded to:', result.s3Key);
  // Expected: brmh-drive/namespaces/fintech_f04c3ae0.../users/{userId}/{fileName}
  
  return result;
};
```

### Using API Route

```typescript
// POST /api/files
const formData = new FormData();
formData.append('file', fileObject);
formData.append('userId', userId);
formData.append('parentId', 'ROOT'); // Will automatically use namespace

const response = await fetch('/api/files', {
  method: 'POST',
  body: formData
});

const result = await response.json();
```

### Using Statement Upload API

```typescript
// POST /api/statement/upload
const formData = new FormData();
formData.append('file', csvFile);
formData.append('userId', userId);
formData.append('bankId', bankId);
formData.append('bankName', bankName);
formData.append('accountId', accountId);
formData.append('accountName', accountName);
formData.append('accountNumber', accountNumber);
formData.append('fileName', 'statement.csv');
formData.append('fileType', 'Statement');

const response = await fetch('/api/statement/upload', {
  method: 'POST',
  body: formData
});

const result = await response.json();
```

## 2. Upload Files to Specific Folders

### Using BRMH Drive Client

```typescript
// Upload to specific folder (inherits namespace from parent)
const uploadToFolder = async (file: File, folderId: string) => {
  const userId = localStorage.getItem('user_id');
  
  // Convert file to base64
  const arrayBuffer = await file.arrayBuffer();
  const base64Content = Buffer.from(arrayBuffer).toString('base64');
  
  const result = await brmhDrive.uploadFile(userId, {
    name: file.name,
    mimeType: file.type,
    size: arrayBuffer.byteLength,
    content: base64Content,
    tags: ['folder-upload']
  }, folderId); // No namespace - backend inherits from parent
  
  console.log('Uploaded to:', result.s3Key);
  // Expected: brmh-drive/namespaces/fintech_f04c3ae0.../users/{userId}/folder/{fileName}
  
  return result;
};
```

### Using API Route

```typescript
// POST /api/files
const formData = new FormData();
formData.append('file', fileObject);
formData.append('userId', userId);
formData.append('parentId', folderId); // Will inherit namespace from parent folder

const response = await fetch('/api/files', {
  method: 'POST',
  body: formData
});
```

## 3. Create Folders

### Create ROOT Folder in Namespace

```typescript
// Create ROOT folder in namespace
const createNamespaceFolder = async (folderName: string) => {
  const userId = localStorage.getItem('user_id');
  const namespace = { id: NAMESPACE_ID, name: NAMESPACE_NAME };
  
  const result = await brmhDrive.createFolder(userId, {
    name: folderName,
    description: 'Namespace folder'
  }, 'ROOT', namespace); // Pass namespace for ROOT
  
  console.log('Created folder:', result.s3Key);
  // Expected: brmh-drive/namespaces/fintech_f04c3ae0.../users/{userId}/{folderName}/.folder
  
  return result;
};
```

### Create Subfolder (Inherit Namespace)

```typescript
// Create subfolder (inherits namespace from parent)
const createSubfolder = async (parentFolderId: string, subfolderName: string) => {
  const userId = localStorage.getItem('user_id');
  
  const result = await brmhDrive.createFolder(userId, {
    name: subfolderName,
    description: 'Subfolder'
  }, parentFolderId); // No namespace - backend inherits from parent
  
  console.log('Created subfolder:', result.s3Key);
  // Expected: brmh-drive/namespaces/fintech_f04c3ae0.../users/{userId}/parent/{subfolder}/.folder
  
  return result;
};
```

### Using API Route

```typescript
// POST /api/folders
const response = await fetch('/api/folders', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    userId,
    folderData: { name: 'My Folder', description: 'A new folder' },
    parentId: 'ROOT' // Will automatically use namespace
  })
});
```

## 4. List Files and Folders

### List Namespace Files

```typescript
// List files with namespace scope
const listNamespaceFiles = async (parentId: string = 'ROOT') => {
  const userId = localStorage.getItem('user_id');
  const result = await brmhDrive.listFiles(userId, parentId, 50, 
    parentId === 'ROOT' ? NAMESPACE_ID : undefined);
  
  return result;
};
```

### List Namespace Folders

```typescript
// List folders with namespace scope
const listNamespaceFolders = async (parentId: string = 'ROOT') => {
  const userId = localStorage.getItem('user_id');
  const result = await brmhDrive.listFolders(userId, parentId, 50, 
    parentId === 'ROOT' ? NAMESPACE_ID : undefined);
  
  return result;
};
```

### Using API Routes

```typescript
// GET /api/files?userId=xxx&parentId=ROOT
const response = await fetch(`/api/files?userId=${userId}&parentId=ROOT&limit=50`);
const { files } = await response.json();

// GET /api/folders?userId=xxx&parentId=ROOT
const response = await fetch(`/api/folders?userId=${userId}&parentId=ROOT&limit=50`);
const { folders } = await response.json();
```

## 5. Download Files

### Get Download URL

```typescript
// Get presigned download URL
const downloadFile = async (fileId: string) => {
  const userId = localStorage.getItem('user_id');
  
  const result = await brmhDrive.downloadFile(userId, fileId);
  
  // Fetch the actual file
  const fileResponse = await fetch(result.downloadUrl);
  const fileContent = await fileResponse.text(); // or .blob(), .arrayBuffer()
  
  return fileContent;
};
```

### Using API Route

```typescript
// GET /api/files/download?userId=xxx&fileId=xxx
const response = await fetch(`/api/files/download?userId=${userId}&fileId=${fileId}`);
const { downloadUrl } = await response.json();

// Then fetch the actual file
const fileResponse = await fetch(downloadUrl);
const fileContent = await fileResponse.text();
```

## 6. Complete Example: File Management Workflow

```typescript
import { brmhDrive, NAMESPACE_ID, NAMESPACE_NAME } from './app/api/brmh-drive-client';

class FileManager {
  private userId: string;
  private namespace = { id: NAMESPACE_ID, name: NAMESPACE_NAME };

  constructor(userId: string) {
    this.userId = userId;
  }

  // Create a folder structure
  async createFolderStructure() {
    // Create main folders in namespace ROOT
    const documentsFolder = await brmhDrive.createFolder(this.userId, {
      name: 'Documents',
      description: 'Main documents folder'
    }, 'ROOT', this.namespace);

    const reportsFolder = await brmhDrive.createFolder(this.userId, {
      name: 'Reports',
      description: 'Financial reports folder'
    }, 'ROOT', this.namespace);

    // Create subfolders (inherit namespace)
    const statementsFolder = await brmhDrive.createFolder(this.userId, {
      name: 'Statements',
      description: 'Bank statements'
    }, documentsFolder.folderId);

    return { documentsFolder, reportsFolder, statementsFolder };
  }

  // Upload files to different locations
  async uploadFiles() {
    // Upload to namespace ROOT
    const rootFile = await brmhDrive.uploadFile(this.userId, {
      name: 'config.json',
      mimeType: 'application/json',
      size: 1024,
      content: Buffer.from('{"key": "value"}').toString('base64'),
      tags: ['config', 'root']
    }, 'ROOT', this.namespace);

    // Upload to specific folder
    const folderFile = await brmhDrive.uploadFile(this.userId, {
      name: 'statement.csv',
      mimeType: 'text/csv',
      size: 2048,
      content: Buffer.from('date,amount,description\n2024-01-01,100.00,Payment').toString('base64'),
      tags: ['statement', 'bank']
    }, 'folder-id-here'); // Inherits namespace from parent

    return { rootFile, folderFile };
  }

  // List all content
  async listAllContent() {
    // List ROOT files and folders (with namespace scoping)
    const rootFiles = await brmhDrive.listFiles(this.userId, 'ROOT', 50, this.namespace.id);
    const rootFolders = await brmhDrive.listFolders(this.userId, 'ROOT', 50, this.namespace.id);

    return { rootFiles, rootFolders };
  }

  // Download a file
  async downloadFile(fileId: string) {
    const downloadResult = await brmhDrive.downloadFile(this.userId, fileId);
    const fileResponse = await fetch(downloadResult.downloadUrl);
    return await fileResponse.text();
  }
}

// Usage
const fileManager = new FileManager('user-123');
await fileManager.createFolderStructure();
await fileManager.uploadFiles();
const content = await fileManager.listAllContent();
```

## 7. Migration Notes

### What Changed

1. **ROOT uploads**: Now include `namespaceId` and `namespaceName` in the request
2. **ROOT folder creation**: Now include namespace fields in folder data
3. **List operations**: Now include `namespaceId` query parameter for ROOT requests
4. **S3 paths**: Now follow the namespace structure pattern

### Backward Compatibility

- Existing files and folders will continue to work
- New uploads will use the namespace structure
- List operations will scope to the namespace when appropriate
- Download operations remain unchanged

### Testing

To verify the namespace integration is working:

1. Upload a file to ROOT and check the S3 key includes the namespace path
2. Create a folder in ROOT and verify the namespace structure
3. List files/folders and ensure they're scoped to the namespace
4. Download files and verify they work correctly

The expected S3 key pattern should be:
`brmh-drive/namespaces/fintech_f04c3ae0-e1ca-4a9b-b017-e121fedbf29b/users/{userId}/...`


