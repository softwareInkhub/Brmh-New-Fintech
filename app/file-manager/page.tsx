import React from 'react';
import FileManager from '../components/FileManager';

export default function FileManagerPage() {
  return (
    <div className="min-h-screen bg-gray-50">
      <div className="container mx-auto py-8">
        <div className="bg-white rounded-lg shadow-lg">
          <FileManager />
        </div>
      </div>
    </div>
  );
}


