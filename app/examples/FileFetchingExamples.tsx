'use client';

import React, { useState, useEffect } from 'react';
import { fileManagerUtils } from '../utils/FileManagerUtils';

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

// Example 1: Basic file fetching
export const BasicFileFetching: React.FC = () => {
  const [files, setFiles] = useState<File[]>([]);
  const [loading, setLoading] = useState(false);

  const fetchFiles = async () => {
    setLoading(true);
    try {
      const files = await fileManagerUtils.getFilesFromNamespace();
      setFiles(files);
      console.log('Files fetched:', files);
    } catch (error) {
      console.error('Error fetching files:', error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="p-4">
      <h3 className="text-lg font-semibold mb-2">Basic File Fetching</h3>
      <button 
        onClick={fetchFiles}
        disabled={loading}
        className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600 disabled:opacity-50"
      >
        {loading ? 'Loading...' : 'Fetch Files'}
      </button>
      <div className="mt-4">
        <p>Files found: {files.length}</p>
        {files.map((file: File) => (
          <div key={file.id} className="text-sm text-gray-600">
            📄 {file.name} ({fileManagerUtils.formatFileSize(file.size)})
          </div>
        ))}
      </div>
    </div>
  );
};

// Example 2: Folder navigation
export const FolderNavigation: React.FC = () => {
  const [currentFolder, setCurrentFolder] = useState('ROOT');
  const [files, setFiles] = useState<File[]>([]);
  const [folders, setFolders] = useState<Folder[]>([]);
  const [loading, setLoading] = useState(false);

  const fetchFolderContents = async (folderId: string) => {
    setLoading(true);
    try {
      const [filesData, foldersData] = await Promise.all([
        folderId === 'ROOT' 
          ? fileManagerUtils.getFilesFromNamespace()
          : fileManagerUtils.getFilesInFolder(folderId),
        folderId === 'ROOT'
          ? fileManagerUtils.getFoldersInNamespace()
          : fileManagerUtils.getFoldersInFolder(folderId)
      ]);
      
      setFiles(filesData);
      setFolders(foldersData);
      setCurrentFolder(folderId);
    } catch (error) {
      console.error('Error fetching folder contents:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchFolderContents('ROOT');
  }, []);

  return (
    <div className="p-4">
      <h3 className="text-lg font-semibold mb-2">Folder Navigation</h3>
      
      {/* Breadcrumb */}
      <div className="mb-4">
        <button 
          onClick={() => fetchFolderContents('ROOT')}
          className="px-3 py-1 bg-gray-200 text-gray-700 rounded hover:bg-gray-300"
        >
          ← Back to Root
        </button>
        <span className="ml-2 text-gray-600">
          Current: {currentFolder === 'ROOT' ? 'Root Namespace' : currentFolder}
        </span>
      </div>

      {loading && <div>Loading...</div>}

      {/* Folders */}
      {folders.length > 0 && (
        <div className="mb-4">
          <h4 className="font-medium mb-2">Folders ({folders.length})</h4>
          {folders.map((folder: Folder) => (
            <button
              key={folder.id}
              onClick={() => fetchFolderContents(folder.id)}
              className="block w-full text-left p-2 border border-gray-200 rounded hover:bg-gray-50 mb-1"
            >
              📁 {folder.name}
            </button>
          ))}
        </div>
      )}

      {/* Files */}
      {files.length > 0 && (
        <div>
          <h4 className="font-medium mb-2">Files ({files.length})</h4>
          {files.map((file: File) => (
            <div key={file.id} className="p-2 border border-gray-200 rounded mb-1">
              <div className="flex items-center justify-between">
                <div>
                  {fileManagerUtils.getFileIcon(file.mimeType)} {file.name}
                  <span className="text-sm text-gray-500 ml-2">
                    ({fileManagerUtils.formatFileSize(file.size)})
                  </span>
                </div>
                <button
                  onClick={() => fileManagerUtils.downloadFileWithLink(file.id, file.name)}
                  className="px-2 py-1 bg-green-500 text-white text-sm rounded hover:bg-green-600"
                >
                  Download
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {files.length === 0 && folders.length === 0 && !loading && (
        <div className="text-gray-500">No files or folders found.</div>
      )}
    </div>
  );
};

// Example 3: File search
export const FileSearch: React.FC = () => {
  const [searchTerm, setSearchTerm] = useState('');
  const [searchResults, setSearchResults] = useState<File[]>([]);
  const [loading, setLoading] = useState(false);

  const searchFiles = async () => {
    if (!searchTerm.trim()) return;
    
    setLoading(true);
    try {
      const results = await fileManagerUtils.searchFiles(searchTerm);
      setSearchResults(results);
      console.log('Search results:', results);
    } catch (error) {
      console.error('Error searching files:', error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="p-4">
      <h3 className="text-lg font-semibold mb-2">File Search</h3>
      
      <div className="flex space-x-2 mb-4">
        <input
          type="text"
          placeholder="Search files..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="flex-1 px-3 py-2 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
        <button
          onClick={searchFiles}
          disabled={loading || !searchTerm.trim()}
          className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600 disabled:opacity-50"
        >
          {loading ? 'Searching...' : 'Search'}
        </button>
      </div>

      {searchResults.length > 0 && (
        <div>
          <h4 className="font-medium mb-2">Search Results ({searchResults.length})</h4>
          {searchResults.map((file: File) => (
            <div key={file.id} className="p-2 border border-gray-200 rounded mb-1">
              <div className="flex items-center justify-between">
                <div>
                  {fileManagerUtils.getFileIcon(file.mimeType)} {file.name}
                  <span className="text-sm text-gray-500 ml-2">
                    ({fileManagerUtils.formatFileSize(file.size)})
                  </span>
                </div>
                <button
                  onClick={() => fileManagerUtils.downloadFileWithLink(file.id, file.name)}
                  className="px-2 py-1 bg-green-500 text-white text-sm rounded hover:bg-green-600"
                >
                  Download
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {searchResults.length === 0 && !loading && searchTerm && (
        <div className="text-gray-500">No files found matching &quot;{searchTerm}&quot;</div>
      )}
    </div>
  );
};

// Example 4: File metadata
export const FileMetadata: React.FC = () => {
  const [fileId, setFileId] = useState('');
  const [metadata, setMetadata] = useState<Record<string, unknown> | null>(null);
  const [loading, setLoading] = useState(false);

  const fetchMetadata = async () => {
    if (!fileId.trim()) return;
    
    setLoading(true);
    try {
      const data = await fileManagerUtils.getFileMetadata(fileId);
      setMetadata(data);
      console.log('File metadata:', data);
    } catch (error) {
      console.error('Error fetching metadata:', error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="p-4">
      <h3 className="text-lg font-semibold mb-2">File Metadata</h3>
      
      <div className="flex space-x-2 mb-4">
        <input
          type="text"
          placeholder="Enter file ID..."
          value={fileId}
          onChange={(e) => setFileId(e.target.value)}
          className="flex-1 px-3 py-2 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
        <button
          onClick={fetchMetadata}
          disabled={loading || !fileId.trim()}
          className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600 disabled:opacity-50"
        >
          {loading ? 'Loading...' : 'Get Metadata'}
        </button>
      </div>

      {metadata && (
        <div className="p-4 bg-gray-100 rounded">
          <h4 className="font-medium mb-2">File Metadata</h4>
          <pre className="text-sm text-gray-700 whitespace-pre-wrap">
            {JSON.stringify(metadata, null, 2)}
          </pre>
        </div>
      )}
    </div>
  );
};

// Example 5: Complete namespace data
export const CompleteNamespaceData: React.FC = () => {
  const [namespaceData, setNamespaceData] = useState<{
    files: File[];
    folders: Folder[];
    totalFiles: number;
    totalFolders: number;
  } | null>(null);
  const [loading, setLoading] = useState(false);

  const fetchAllData = async () => {
    setLoading(true);
    try {
      const data = await fileManagerUtils.getAllNamespaceData();
      setNamespaceData(data);
      console.log('Complete namespace data:', data);
    } catch (error) {
      console.error('Error fetching namespace data:', error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="p-4">
      <h3 className="text-lg font-semibold mb-2">Complete Namespace Data</h3>
      
      <button
        onClick={fetchAllData}
        disabled={loading}
        className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600 disabled:opacity-50 mb-4"
      >
        {loading ? 'Loading...' : 'Fetch All Data'}
      </button>

      {namespaceData && (
        <div className="space-y-4">
          {/* Summary */}
          <div className="grid grid-cols-2 gap-4">
            <div className="bg-blue-50 p-4 rounded">
              <div className="text-2xl font-bold text-blue-600">{namespaceData.totalFiles}</div>
              <div className="text-blue-800">Total Files</div>
            </div>
            <div className="bg-green-50 p-4 rounded">
              <div className="text-2xl font-bold text-green-600">{namespaceData.totalFolders}</div>
              <div className="text-green-800">Total Folders</div>
            </div>
          </div>

          {/* Files */}
          {namespaceData.files.length > 0 && (
            <div>
              <h4 className="font-medium mb-2">Files ({namespaceData.files.length})</h4>
              <div className="max-h-64 overflow-y-auto">
                {namespaceData.files.map((file: File) => (
                  <div key={file.id} className="p-2 border border-gray-200 rounded mb-1">
                    <div className="flex items-center justify-between">
                      <div>
                        {fileManagerUtils.getFileIcon(file.mimeType)} {file.name}
                        <span className="text-sm text-gray-500 ml-2">
                          ({fileManagerUtils.formatFileSize(file.size)})
                        </span>
                      </div>
                      <button
                        onClick={() => fileManagerUtils.downloadFileWithLink(file.id, file.name)}
                        className="px-2 py-1 bg-green-500 text-white text-sm rounded hover:bg-green-600"
                      >
                        Download
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Folders */}
          {namespaceData.folders.length > 0 && (
            <div>
              <h4 className="font-medium mb-2">Folders ({namespaceData.folders.length})</h4>
              <div className="max-h-64 overflow-y-auto">
                {namespaceData.folders.map((folder: Folder) => (
                  <div key={folder.id} className="p-2 border border-gray-200 rounded mb-1">
                    📁 {folder.name}
                    <span className="text-sm text-gray-500 ml-2">
                      (Created: {new Date(folder.createdAt).toLocaleDateString()})
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

// Main component that combines all examples
const FileFetchingExamples: React.FC = () => {
  return (
    <div className="min-h-screen bg-gray-50 p-8">
      <div className="max-w-6xl mx-auto">
        <h1 className="text-3xl font-bold mb-8">File Fetching Examples</h1>
        
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          <div className="bg-white rounded-lg shadow-lg p-6">
            <BasicFileFetching />
          </div>
          
          <div className="bg-white rounded-lg shadow-lg p-6">
            <FolderNavigation />
          </div>
          
          <div className="bg-white rounded-lg shadow-lg p-6">
            <FileSearch />
          </div>
          
          <div className="bg-white rounded-lg shadow-lg p-6">
            <FileMetadata />
          </div>
          
          <div className="bg-white rounded-lg shadow-lg p-6 lg:col-span-2">
            <CompleteNamespaceData />
          </div>
        </div>
      </div>
    </div>
  );
};

export default FileFetchingExamples;
