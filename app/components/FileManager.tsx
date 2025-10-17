'use client';

import React, { useState, useEffect, useCallback } from 'react';

interface File {
  id: string;
  name: string;
  size: number;
  mimeType: string;
  s3Key: string;
  createdAt: string;
  tags: string[];
}

interface Folder {
  id: string;
  name: string;
  parentId: string;
  createdAt: string;
}


const FileManager: React.FC = () => {
  const [files, setFiles] = useState<File[]>([]);
  const [folders, setFolders] = useState<Folder[]>([]);
  const [currentFolder, setCurrentFolder] = useState<string>('ROOT');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');

  // Namespace configuration
  const NAMESPACE_ID = 'f04c3ae0-e1ca-4a9b-b017-e121fedbf29b';
  const NAMESPACE_NAME = 'fintech';
  const FULL_NAMESPACE_ID = `${NAMESPACE_NAME}-${NAMESPACE_ID}`;
  
  // Get userId from localStorage or throw error
  const getUserId = (): string => {
    const userId = localStorage.getItem('userId');
    if (!userId) {
      throw new Error('User ID not found. Please ensure user is logged in.');
    }
    return userId;
  };


  // Get files from namespace ROOT
  const getFilesFromNamespace = useCallback(async (): Promise<File[]> => {
    try {
      const userId = getUserId();
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
  }, []);

  // Get folders in namespace ROOT
  const getFoldersInNamespace = useCallback(async (): Promise<Folder[]> => {
    try {
      const userId = getUserId();
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
  }, []);

  // Get files in specific folder
  const getFilesInFolder = useCallback(async (folderId: string): Promise<File[]> => {
    try {
      const userId = getUserId();
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
  }, []);

  // Get folders in specific folder
  const getFoldersInFolder = useCallback(async (folderId: string): Promise<Folder[]> => {
    try {
      const userId = getUserId();
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
  }, []);

  // Download file
  const downloadFile = async (fileId: string, fileName: string) => {
    try {
      const userId = getUserId();
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
    } catch (error) {
      console.error('Error downloading file:', error);
      setError('Failed to download file');
    }
  };


  // Fetch data for current folder
  const fetchData = useCallback(async (parentId: string = 'ROOT') => {
    setLoading(true);
    setError(null);

    try {
      if (parentId === 'ROOT') {
        // Fetch from namespace ROOT
        const [filesData, foldersData] = await Promise.all([
          getFilesFromNamespace(),
          getFoldersInNamespace()
        ]);
        setFiles(filesData);
        setFolders(foldersData);
      } else {
        // Fetch from specific folder
        const [filesData, foldersData] = await Promise.all([
          getFilesInFolder(parentId),
          getFoldersInFolder(parentId)
        ]);
        setFiles(filesData);
        setFolders(foldersData);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
      console.error('Error fetching data:', err);
    } finally {
      setLoading(false);
    }
  }, [getFilesFromNamespace, getFoldersInNamespace, getFilesInFolder, getFoldersInFolder]);

  // Navigate to folder
  const navigateToFolder = (folderId: string) => {
    setCurrentFolder(folderId);
    fetchData(folderId);
  };

  // Navigate back to parent
  const navigateBack = () => {
    if (currentFolder !== 'ROOT') {
      setCurrentFolder('ROOT');
      fetchData('ROOT');
    }
  };

  // Filter files based on search term
  const filteredFiles = files.filter(file => 
    file.name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const filteredFolders = folders.filter(folder => 
    folder.name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  // Load data on component mount
  useEffect(() => {
    fetchData(currentFolder);
  }, [currentFolder, fetchData]);

  // Refresh data
  const refreshData = () => {
    fetchData(currentFolder);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="text-lg">Loading files and folders...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-4 bg-red-100 border border-red-400 text-red-700 rounded">
        <div className="font-bold">Error:</div>
        <div>{error}</div>
        <button 
          onClick={refreshData}
          className="mt-2 px-4 py-2 bg-red-500 text-white rounded hover:bg-red-600"
        >
          Retry
        </button>
      </div>
    );
  }

  return (
    <div className="file-manager p-6">
      {/* Header */}
      <div className="mb-6">
        <div className="flex items-center justify-between mb-4">
          <h1 className="text-2xl font-bold">File Manager</h1>
          <button 
            onClick={refreshData}
            className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600"
          >
            Refresh
          </button>
        </div>

        {/* Breadcrumb */}
        <div className="flex items-center space-x-2 mb-4">
          <button 
            onClick={navigateBack} 
            disabled={currentFolder === 'ROOT'}
            className="px-3 py-1 bg-gray-200 text-gray-700 rounded hover:bg-gray-300 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            ← Back
          </button>
          <span className="text-gray-600">
            Current: {currentFolder === 'ROOT' ? 'Root Namespace' : currentFolder}
          </span>
        </div>

        {/* Search */}
        <div className="mb-4">
          <input
            type="text"
            placeholder="Search files and folders..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 gap-4 mb-6">
        <div className="bg-blue-50 p-4 rounded">
          <div className="text-2xl font-bold text-blue-600">{filteredFiles.length}</div>
          <div className="text-blue-800">Files</div>
        </div>
        <div className="bg-green-50 p-4 rounded">
          <div className="text-2xl font-bold text-green-600">{filteredFolders.length}</div>
          <div className="text-green-800">Folders</div>
        </div>
      </div>

      {/* Folders */}
      {filteredFolders.length > 0 && (
        <div className="mb-6">
          <h3 className="text-lg font-semibold mb-3">Folders ({filteredFolders.length})</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
            {filteredFolders.map((folder) => (
              <div key={folder.id} className="border border-gray-200 rounded p-4 hover:bg-gray-50">
                <button 
                  onClick={() => navigateToFolder(folder.id)}
                  className="w-full text-left"
                >
                  <div className="flex items-center space-x-2">
                    <span className="text-2xl">📁</span>
                    <div>
                      <div className="font-medium">{folder.name}</div>
                      <div className="text-sm text-gray-500">
                        Created: {new Date(folder.createdAt).toLocaleDateString()}
                      </div>
                    </div>
                  </div>
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Files */}
      {filteredFiles.length > 0 ? (
        <div>
          <h3 className="text-lg font-semibold mb-3">Files ({filteredFiles.length})</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
            {filteredFiles.map((file) => (
              <div key={file.id} className="border border-gray-200 rounded p-4 hover:bg-gray-50">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-2 flex-1">
                    <span className="text-2xl">📄</span>
                    <div className="flex-1 min-w-0">
                      <div className="font-medium truncate">{file.name}</div>
                      <div className="text-sm text-gray-500">
                        {Math.round(file.size / 1024)} KB
                      </div>
                      <div className="text-xs text-gray-400 truncate">
                        {file.mimeType}
                      </div>
                    </div>
                  </div>
                  <button 
                    onClick={() => downloadFile(file.id, file.name)}
                    className="ml-2 px-3 py-1 bg-green-500 text-white text-sm rounded hover:bg-green-600"
                  >
                    Download
                  </button>
                </div>
                
                {/* File details */}
                <div className="mt-2 text-xs text-gray-500">
                  <div>ID: {file.id}</div>
                  <div>Created: {new Date(file.createdAt).toLocaleDateString()}</div>
                  {file.tags && file.tags.length > 0 && (
                    <div>Tags: {file.tags.join(', ')}</div>
                  )}
                  <div className="truncate mt-1">
                    S3: {file.s3Key}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      ) : (
        <div className="text-center py-8 text-gray-500">
          {searchTerm ? 'No files or folders match your search.' : 'No files or folders found in this location.'}
        </div>
      )}

      {/* Namespace Info */}
      <div className="mt-8 p-4 bg-gray-100 rounded">
        <h4 className="font-semibold mb-2">Namespace Information</h4>
        <div className="text-sm text-gray-600">
          <div>Namespace ID: {FULL_NAMESPACE_ID}</div>
          <div>User ID: {getUserId()}</div>
          <div>Current Folder: {currentFolder}</div>
        </div>
      </div>
    </div>
  );
};

export default FileManager;
