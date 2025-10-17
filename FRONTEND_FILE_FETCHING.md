# 📥 Frontend File Fetching Implementation

## 🎯 **Complete Implementation to GET Your Uploaded Files**

### **1. Get Files from Namespace ROOT**

```javascript
// Get all files from your namespace ROOT
const getFilesFromNamespace = async () => {
  const userId = localStorage.getItem('userId'); // Your user ID
  const namespaceId = 'fintech-f04c3ae0-e1ca-4a9b-b017-e121fedbf29b'; // Your namespace with dashes
  
  try {
    const response = await fetch(
      `https://brmh.in/drive/files/${userId}?parentId=ROOT&namespaceId=${namespaceId}`,
      { 
        method: 'GET',
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json'
        }
      }
    );
    
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    
    const data = await response.json();
    console.log('Files from namespace ROOT:', data.files);
    return data.files;
  } catch (error) {
    console.error('Error fetching files:', error);
    return [];
  }
};

// Usage
const files = await getFilesFromNamespace();
console.log('Your uploaded files:', files);
```

### **2. Get Files from Specific Folder**

```javascript
// Get files from a specific folder within your namespace
const getFilesInFolder = async (folderId) => {
  const userId = localStorage.getItem('userId');
  
  try {
    const response = await fetch(
      `https://brmh.in/drive/files/${userId}?parentId=${folderId}`,
      { 
        method: 'GET',
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json'
        }
      }
    );
    
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    
    const data = await response.json();
    console.log('Files in folder:', data.files);
    return data.files;
  } catch (error) {
    console.error('Error fetching folder files:', error);
    return [];
  }
};

// Usage
const folderFiles = await getFilesInFolder('FOLDER_abc123...');
```

### **3. Get Folders in Namespace**

```javascript
// Get all folders in your namespace ROOT
const getFoldersInNamespace = async () => {
  const userId = localStorage.getItem('userId');
  const namespaceId = 'fintech-f04c3ae0-e1ca-4a9b-b017-e121fedbf29b';
  
  try {
    const response = await fetch(
      `https://brmh.in/drive/folders/${userId}?parentId=ROOT&namespaceId=${namespaceId}`,
      { 
        method: 'GET',
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json'
        }
      }
    );
    
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    
    const data = await response.json();
    console.log('Folders in namespace:', data.folders);
    return data.folders;
  } catch (error) {
    console.error('Error fetching folders:', error);
    return [];
  }
};

// Usage
const folders = await getFoldersInNamespace();
```

### **4. Download File**

```javascript
// Get download URL for a specific file
const downloadFile = async (fileId) => {
  const userId = localStorage.getItem('userId');
  
  try {
    const response = await fetch(
      `https://brmh.in/drive/download/${userId}/${fileId}`,
      { 
        method: 'GET',
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json'
        }
      }
    );
    
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    
    const data = await response.json();
    console.log('Download URL:', data.downloadUrl);
    
    // Use the download URL to fetch the actual file
    const fileResponse = await fetch(data.downloadUrl);
    const fileBlob = await fileResponse.blob();
    
    return fileBlob;
  } catch (error) {
    console.error('Error downloading file:', error);
    return null;
  }
};

// Usage
const fileBlob = await downloadFile('FILE_5ab70223773143699bf039d3aeb32cca');
```

### **5. Complete File Management System**

```javascript
// Complete file management class
class FileManager {
  constructor() {
    this.userId = localStorage.getItem('userId');
    this.namespaceId = 'fintech-f04c3ae0-e1ca-4a9b-b017-e121fedbf29b';
  }

  // Get all files and folders in namespace
  async getAllNamespaceData() {
    try {
      const [files, folders] = await Promise.all([
        this.getFilesFromNamespace(),
        this.getFoldersInNamespace()
      ]);

      return {
        files,
        folders,
        totalFiles: files.length,
        totalFolders: folders.length
      };
    } catch (error) {
      console.error('Error fetching namespace data:', error);
      return { files: [], folders: [], totalFiles: 0, totalFolders: 0 };
    }
  }

  // Get files from namespace ROOT
  async getFilesFromNamespace() {
    const response = await fetch(
      `https://brmh.in/drive/files/${this.userId}?parentId=ROOT&namespaceId=${this.namespaceId}`,
      { 
        method: 'GET',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' }
      }
    );
    
    if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
    const data = await response.json();
    return data.files || [];
  }

  // Get folders in namespace ROOT
  async getFoldersInNamespace() {
    const response = await fetch(
      `https://brmh.in/drive/folders/${this.userId}?parentId=ROOT&namespaceId=${this.namespaceId}`,
      { 
        method: 'GET',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' }
      }
    );
    
    if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
    const data = await response.json();
    return data.folders || [];
  }

  // Get files in specific folder
  async getFilesInFolder(folderId) {
    const response = await fetch(
      `https://brmh.in/drive/files/${this.userId}?parentId=${folderId}`,
      { 
        method: 'GET',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' }
      }
    );
    
    if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
    const data = await response.json();
    return data.files || [];
  }

  // Download file
  async downloadFile(fileId) {
    const response = await fetch(
      `https://brmh.in/drive/download/${this.userId}/${fileId}`,
      { 
        method: 'GET',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' }
      }
    );
    
    if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
    const data = await response.json();
    
    // Fetch the actual file
    const fileResponse = await fetch(data.downloadUrl);
    return await fileResponse.blob();
  }

  // Get file metadata
  async getFileMetadata(fileId) {
    const response = await fetch(
      `https://brmh.in/drive/file/${this.userId}/${fileId}`,
      { 
        method: 'GET',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' }
      }
    );
    
    if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
    return await response.json();
  }
}

// Usage
const fileManager = new FileManager();

// Get all your files and folders
const namespaceData = await fileManager.getAllNamespaceData();
console.log('Your namespace data:', namespaceData);

// Get just files
const files = await fileManager.getFilesFromNamespace();
console.log('Your files:', files);

// Get just folders
const folders = await fileManager.getFoldersInNamespace();
console.log('Your folders:', folders);
```

### **6. React Component Example**

```jsx
import React, { useState, useEffect } from 'react';

const FileList = () => {
  const [files, setFiles] = useState([]);
  const [folders, setFolders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchFiles = async () => {
      try {
        setLoading(true);
        const userId = localStorage.getItem('userId');
        const namespaceId = 'fintech-f04c3ae0-e1ca-4a9b-b017-e121fedbf29b';

        // Fetch files
        const filesResponse = await fetch(
          `https://brmh.in/drive/files/${userId}?parentId=ROOT&namespaceId=${namespaceId}`,
          { 
            method: 'GET',
            credentials: 'include',
            headers: { 'Content-Type': 'application/json' }
          }
        );
        
        if (!filesResponse.ok) throw new Error('Failed to fetch files');
        const filesData = await filesResponse.json();

        // Fetch folders
        const foldersResponse = await fetch(
          `https://brmh.in/drive/folders/${userId}?parentId=ROOT&namespaceId=${namespaceId}`,
          { 
            method: 'GET',
            credentials: 'include',
            headers: { 'Content-Type': 'application/json' }
          }
        );
        
        if (!foldersResponse.ok) throw new Error('Failed to fetch folders');
        const foldersData = await foldersResponse.json();

        setFiles(filesData.files || []);
        setFolders(foldersData.folders || []);
      } catch (err) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };

    fetchFiles();
  }, []);

  const handleDownload = async (fileId) => {
    try {
      const userId = localStorage.getItem('userId');
      const response = await fetch(
        `https://brmh.in/drive/download/${userId}/${fileId}`,
        { 
          method: 'GET',
          credentials: 'include',
          headers: { 'Content-Type': 'application/json' }
        }
      );
      
      if (!response.ok) throw new Error('Failed to get download URL');
      const data = await response.json();
      
      // Open download URL in new tab
      window.open(data.downloadUrl, '_blank');
    } catch (err) {
      console.error('Download failed:', err);
    }
  };

  if (loading) return <div>Loading files...</div>;
  if (error) return <div>Error: {error}</div>;

  return (
    <div>
      <h2>Your Files ({files.length})</h2>
      
      {/* Folders */}
      {folders.length > 0 && (
        <div>
          <h3>Folders ({folders.length})</h3>
          {folders.map(folder => (
            <div key={folder.id} style={{ padding: '10px', border: '1px solid #ccc', margin: '5px' }}>
              📁 {folder.name}
            </div>
          ))}
        </div>
      )}

      {/* Files */}
      {files.length > 0 ? (
        <div>
          {files.map(file => (
            <div key={file.id} style={{ padding: '10px', border: '1px solid #ccc', margin: '5px' }}>
              📄 {file.name} ({file.size} bytes)
              <button onClick={() => handleDownload(file.id)} style={{ marginLeft: '10px' }}>
                Download
              </button>
              <div style={{ fontSize: '12px', color: '#666' }}>
                S3 Path: {file.s3Key}
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div>No files found in your namespace.</div>
      )}
    </div>
  );
};

export default FileList;
```

## 🎯 **Key Points:**

1. **Use the correct namespace ID**: `fintech-f04c3ae0-e1ca-4a9b-b017-e121fedbf29b` (with dashes)
2. **Always include credentials**: `credentials: 'include'` for authentication
3. **Handle errors properly**: Check response.ok and catch exceptions
4. **Use the correct endpoints**: 
   - `/drive/files/` for files
   - `/drive/folders/` for folders
   - `/drive/download/` for downloads

## 🚀 **Expected Response Format:**

```json
{
  "files": [
    {
      "id": "FILE_5ab70223773143699bf039d3aeb32cca",
      "name": "anything.csv",
      "size": 99586,
      "mimeType": "text/csv",
      "s3Key": "brmh-drive/namespaces/fintech-f04c3ae0_fintech_f04c3ae0-e1ca-4a9b-b017-e121fedbf29b/users/b4e834e8-5081-7069-3dab-7c98bbcf78a7/anything.csv",
      "createdAt": "2025-10-15T06:40:00.997Z",
      "tags": ["bank-statement", "HDFC", "bd24b37d-9603-4a9b-b51a-a70abb62ebbc"]
    }
  ]
}
```

This implementation will fetch all your uploaded files from the correct namespace path! 🎉


