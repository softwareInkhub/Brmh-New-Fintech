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

const SimpleFileList: React.FC = () => {
  const [files, setFiles] = useState<File[]>([]);
  const [folders, setFolders] = useState<Folder[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchFiles = async () => {
      try {
        setLoading(true);
        const namespaceData = await fileManagerUtils.getAllNamespaceData();
        setFiles(namespaceData.files);
        setFolders(namespaceData.folders);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'An error occurred');
      } finally {
        setLoading(false);
      }
    };

    fetchFiles();
  }, []);

  const handleDownload = async (fileId: string, fileName: string) => {
    const success = await fileManagerUtils.downloadFileWithLink(fileId, fileName);
    if (!success) {
      setError('Failed to download file');
    }
  };

  if (loading) return <div>Loading files...</div>;
  if (error) return <div>Error: {error}</div>;

  return (
    <div className="p-4">
      <h2 className="text-xl font-bold mb-4">Your Files ({files.length})</h2>
      
      {/* Folders */}
      {folders.length > 0 && (
        <div className="mb-6">
          <h3 className="text-lg font-semibold mb-3">Folders ({folders.length})</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
            {folders.map(folder => (
              <div key={folder.id} className="border border-gray-200 rounded p-3 hover:bg-gray-50">
                <div className="flex items-center space-x-2">
                  <span className="text-2xl">📁</span>
                  <div>
                    <div className="font-medium">{folder.name}</div>
                    <div className="text-sm text-gray-500">
                      Created: {new Date(folder.createdAt).toLocaleDateString()}
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Files */}
      {files.length > 0 ? (
        <div>
          <h3 className="text-lg font-semibold mb-3">Files ({files.length})</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
            {files.map(file => (
              <div key={file.id} className="border border-gray-200 rounded p-3 hover:bg-gray-50">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-2 flex-1">
                    <span className="text-2xl">{fileManagerUtils.getFileIcon(file.mimeType)}</span>
                    <div className="flex-1 min-w-0">
                      <div className="font-medium truncate">{file.name}</div>
                      <div className="text-sm text-gray-500">
                        {fileManagerUtils.formatFileSize(file.size)}
                      </div>
                      <div className="text-xs text-gray-400 truncate">
                        {file.mimeType}
                      </div>
                    </div>
                  </div>
                  <button 
                    onClick={() => handleDownload(file.id, file.name)}
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
          No files found in your namespace.
        </div>
      )}

      {/* Namespace Info */}
      <div className="mt-8 p-4 bg-gray-100 rounded">
        <h4 className="font-semibold mb-2">Namespace Information</h4>
        <div className="text-sm text-gray-600">
          <div>Namespace ID: {fileManagerUtils.getNamespaceInfo().namespaceId}</div>
          <div>User ID: {fileManagerUtils.getNamespaceInfo().userId}</div>
          <div>Namespace Name: {fileManagerUtils.getNamespaceInfo().namespaceName}</div>
        </div>
      </div>
    </div>
  );
};

export default SimpleFileList;
