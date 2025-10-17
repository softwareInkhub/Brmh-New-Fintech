// File Manager Utility Class
export class FileManagerUtils {
  private namespaceId: string;

  constructor() {
    this.namespaceId = 'fintech-f04c3ae0-e1ca-4a9b-b017-e121fedbf29b';
  }

  // Get current userId from localStorage or throw error
  private getUserId(): string {
    const userId = localStorage.getItem('userId');
    if (!userId) {
      throw new Error('User ID not found. Please ensure user is logged in.');
    }
    return userId;
  }

  // Method to get current userId (public access)
  getCurrentUserId(): string {
    return this.getUserId();
  }

  // Method to check if user is logged in
  isUserLoggedIn(): boolean {
    try {
      this.getUserId();
      return true;
    } catch {
      return false;
    }
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
    try {
      const userId = this.getUserId();
      const response = await fetch(
        `/api/files?userId=${userId}&parentId=ROOT&limit=1000`,
        { 
          method: 'GET',
          credentials: 'include',
          headers: { 'Content-Type': 'application/json' }
        }
      );
      
      if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
      const data = await response.json();
      return data.files || [];
    } catch (error) {
      console.error('Error fetching files from namespace:', error);
      return [];
    }
  }

  // Get folders in namespace ROOT
  async getFoldersInNamespace() {
    try {
      const userId = this.getUserId();
      const response = await fetch(
        `/api/folders?userId=${userId}&parentId=ROOT&limit=100`,
        { 
          method: 'GET',
          credentials: 'include',
          headers: { 'Content-Type': 'application/json' }
        }
      );
      
      if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
      const data = await response.json();
      return data.folders || [];
    } catch (error) {
      console.error('Error fetching folders from namespace:', error);
      return [];
    }
  }

  // Get files in specific folder
  async getFilesInFolder(folderId: string) {
    try {
      const userId = this.getUserId();
      const response = await fetch(
        `/api/files?userId=${userId}&parentId=${folderId}&limit=1000`,
        { 
          method: 'GET',
          credentials: 'include',
          headers: { 'Content-Type': 'application/json' }
        }
      );
      
      if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
      const data = await response.json();
      return data.files || [];
    } catch (error) {
      console.error('Error fetching folder files:', error);
      return [];
    }
  }

  // Get folders in specific folder
  async getFoldersInFolder(folderId: string) {
    try {
      const userId = this.getUserId();
      const response = await fetch(
        `/api/folders?userId=${userId}&parentId=${folderId}&limit=100`,
        { 
          method: 'GET',
          credentials: 'include',
          headers: { 'Content-Type': 'application/json' }
        }
      );
      
      if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
      const data = await response.json();
      return data.folders || [];
    } catch (error) {
      console.error('Error fetching folder folders:', error);
      return [];
    }
  }

  // Download file
  async downloadFile(fileId: string) {
    try {
      const userId = this.getUserId();
      const response = await fetch(
        `https://brmh.in/drive/download/${userId}/${fileId}`,
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
    } catch (error) {
      console.error('Error downloading file:', error);
      return null;
    }
  }

  // Get file metadata
  async getFileMetadata(fileId: string) {
    try {
      const userId = this.getUserId();
      const response = await fetch(
        `https://brmh.in/drive/file/${userId}/${fileId}`,
        { 
          method: 'GET',
          credentials: 'include',
          headers: { 'Content-Type': 'application/json' }
        }
      );
      
      if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
      return await response.json();
    } catch (error) {
      console.error('Error fetching file metadata:', error);
      return null;
    }
  }

  // Download file with automatic download
  async downloadFileWithLink(fileId: string, fileName: string) {
    try {
      const userId = this.getUserId();
      const response = await fetch(
        `https://brmh.in/drive/download/${userId}/${fileId}`,
        { 
          method: 'GET',
          credentials: 'include',
          headers: { 'Content-Type': 'application/json' }
        }
      );
      
      if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
      const data = await response.json();
      
      // Create download link
      const link = document.createElement('a');
      link.href = data.downloadUrl;
      link.download = fileName;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      
      console.log('File download initiated:', fileName);
      return true;
    } catch (error) {
      console.error('Error downloading file:', error);
      return false;
    }
  }

  // Search files by name
  async searchFiles(searchTerm: string, parentId: string = 'ROOT') {
    try {
      const files = parentId === 'ROOT' 
        ? await this.getFilesFromNamespace()
        : await this.getFilesInFolder(parentId);
      
      return files.filter((file: { name: string }) => 
        file.name.toLowerCase().includes(searchTerm.toLowerCase())
      );
    } catch (error) {
      console.error('Error searching files:', error);
      return [];
    }
  }

  // Get file size in human readable format
  formatFileSize(bytes: number): string {
    if (bytes === 0) return '0 Bytes';
    
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  }

  // Get file icon based on mime type
  getFileIcon(mimeType: string): string {
    if (mimeType.startsWith('image/')) return '🖼️';
    if (mimeType.startsWith('video/')) return '🎥';
    if (mimeType.startsWith('audio/')) return '🎵';
    if (mimeType.includes('pdf')) return '📕';
    if (mimeType.includes('word')) return '📝';
    if (mimeType.includes('excel') || mimeType.includes('spreadsheet')) return '📊';
    if (mimeType.includes('zip') || mimeType.includes('rar')) return '📦';
    if (mimeType.includes('text/')) return '📄';
    return '📄';
  }

  // Get namespace info
  getNamespaceInfo() {
    return {
      namespaceId: this.namespaceId,
      userId: this.getUserId(),
      namespaceName: 'fintech'
    };
  }
}

// Export singleton instance
export const fileManagerUtils = new FileManagerUtils();
