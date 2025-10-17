'use client';
import React, { createContext, useContext, useState, useCallback, ReactNode } from 'react';

interface EntityItem {
  id: string;
  name: string;
  description?: string;
  createdAt?: string;
}

interface EntitySyncContextType {
  entities: EntityItem[];
  addEntity: (entity: EntityItem) => void;
  removeEntity: (entityId: string) => void;
  updateEntities: (entities: EntityItem[]) => void;
  refreshEntities: () => Promise<void>;
}

const EntitySyncContext = createContext<EntitySyncContextType | undefined>(undefined);

interface EntitySyncProviderProps {
  children: ReactNode;
}

export const EntitySyncProvider: React.FC<EntitySyncProviderProps> = ({ children }) => {
  const [entities, setEntities] = useState<EntityItem[]>([]);

  const addEntity = useCallback((entity: EntityItem) => {
    setEntities(prev => {
      // Check if entity already exists
      const exists = prev.some(e => e.id === entity.id);
      if (exists) return prev;
      return [...prev, entity];
    });
  }, []);

  const removeEntity = useCallback((entityId: string) => {
    setEntities(prev => prev.filter(entity => entity.id !== entityId));
  }, []);

  const updateEntities = useCallback((newEntities: EntityItem[]) => {
    setEntities(newEntities);
  }, []);

  const refreshEntities = useCallback(async () => {
    try {
      const userId = localStorage.getItem('userId');
      if (!userId) return;

      // Fetch from BRMH Drive directly using the same logic as Entities page
      const NAMESPACE_ID = 'f04c3ae0-e1ca-4a9b-b017-e121fedbf29b';
      const NAMESPACE_NAME = 'fintech';
      const FULL_NAMESPACE_ID = `${NAMESPACE_NAME}_${NAMESPACE_ID}`;
      const response = await fetch(`https://brmh.in/drive/folders/${userId}?parentId=ROOT&limit=100&namespaceId=${FULL_NAMESPACE_ID}`, {
        method: 'GET',
        headers: { 'Content-Type': 'application/json' },
      });
      if (!response.ok) return;
      const driveResponse = await response.json();
      type DriveItem = {
        id?: string;
        name?: string;
        description?: string;
        createdAt?: string;
        type?: string;
        [key: string]: unknown;
      };
      let driveFolders: DriveItem[] = [];
      if (Array.isArray(driveResponse)) {
        driveFolders = driveResponse;
      } else if (driveResponse && Array.isArray(driveResponse.items)) {
        driveFolders = driveResponse.items;
      } else if (driveResponse && Array.isArray(driveResponse.folders)) {
        driveFolders = driveResponse.folders;
      } else if (driveResponse && Array.isArray(driveResponse.files)) {
        driveFolders = driveResponse.files;
      }
      const mapped: EntityItem[] = driveFolders
        .filter((item: DriveItem) => Boolean(item && item.type === 'folder' && item.id && item.name))
        .map((folder: DriveItem) => ({
          id: String(folder.id),
          name: String(folder.name),
          description: (folder.description as string) || '',
          createdAt: folder.createdAt ? String(folder.createdAt) : undefined,
        }));
      setEntities(mapped);
    } catch (error) {
      console.error('Failed to refresh entities:', error);
    }
  }, []);

  const value: EntitySyncContextType = {
    entities,
    addEntity,
    removeEntity,
    updateEntities,
    refreshEntities
  };

  return (
    <EntitySyncContext.Provider value={value}>
      {children}
    </EntitySyncContext.Provider>
  );
};

export const useEntitySync = () => {
  const context = useContext(EntitySyncContext);
  if (context === undefined) {
    throw new Error('useEntitySync must be used within an EntitySyncProvider');
  }
  return context;
};

