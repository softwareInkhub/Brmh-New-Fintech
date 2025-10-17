import { NextResponse } from 'next/server';
import { brmhDrive, NAMESPACE_ID, NAMESPACE_NAME } from '../brmh-drive-client';
import { brmhCrud, TABLES } from '../brmh-client';

// GET /api/files - List files
export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const userId = searchParams.get('userId');
    const parentId = searchParams.get('parentId') || 'ROOT';
    const limit = parseInt(searchParams.get('limit') || '50');
    
    if (!userId) {
      return NextResponse.json({ error: 'userId is required' }, { status: 400 });
    }
    
    console.log(`Fetching files for user: ${userId}, parentId: ${parentId}`);
    
    // First try to get files from local brmh-drive-files table
    try {
      console.log('Scanning brmh-drive-files table with params:', {
        userId,
        parentId,
        limit
      });
      
      // First try with parentId filter
      let localFiles = await brmhCrud.scan(TABLES.BRMH_DRIVE_FILES, {
        FilterExpression: 'userId = :userId AND parentId = :parentId',
        ExpressionAttributeValues: { 
          ':userId': userId,
          ':parentId': parentId
        },
        itemPerPage: limit
      });
      
      // If no files found with parentId filter, try without parentId filter for ROOT
      if ((!localFiles.items || localFiles.items.length === 0) && parentId === 'ROOT') {
        console.log('No files found with parentId filter, trying without parentId filter for ROOT...');
        localFiles = await brmhCrud.scan(TABLES.BRMH_DRIVE_FILES, {
          FilterExpression: 'userId = :userId',
          ExpressionAttributeValues: { 
            ':userId': userId
          },
          itemPerPage: limit
        });
      }
      
      console.log('Raw scan result from brmh-drive-files:', {
        itemsCount: localFiles.items?.length || 0,
        hasItems: !!localFiles.items,
        rawResult: localFiles
      });
      
      if (localFiles.items && localFiles.items.length > 0) {
        console.log(`Found ${localFiles.items.length} files in local brmh-drive-files table`);
        
        // Debug: Log the raw file data to see what's actually stored
        console.log('Raw file data from database:', localFiles.items.map((file: Record<string, unknown>) => ({
          id: file.id,
          name: file.name,
          bankId: file.bankId,
          bankName: file.bankName,
          accountId: file.accountId,
          accountName: file.accountName,
          accountNumber: file.accountNumber
        })));
        
        // Convert local files to the expected format
        const files = localFiles.items.map((file: Record<string, unknown>) => ({
          id: file.id,
          name: file.name,
          fileName: file.name, // Add fileName field for compatibility
          mimeType: file.mimeType,
          size: file.size,
          createdAt: file.createdAt,
          updatedAt: file.updatedAt,
          userId: file.userId,
          parentId: file.parentId || 'ROOT',
          tags: file.tags || [],
          bankId: file.bankId, // Add bankId field
          bankName: file.bankName,
          accountId: file.accountId,
          accountName: file.accountName,
          accountNumber: file.accountNumber,
          fileType: file.fileType,
          s3Key: file.s3Key,
          downloadUrl: file.downloadUrl,
          s3FileUrl: file.downloadUrl // Add s3FileUrl field for compatibility
        }));
        
        // Filter files by parentId if we're not looking for ROOT files
        const filteredFiles = parentId === 'ROOT' 
          ? files.filter((file: { parentId?: string }) => !file.parentId || file.parentId === 'ROOT')
          : files.filter((file: { parentId?: string }) => file.parentId === parentId);
        
        console.log('Converted files for response:', filteredFiles);
        return NextResponse.json({ files: filteredFiles });
      } else {
        console.log('No files found in brmh-drive-files table for user:', userId);
        
        // Try scanning all files for this user (without parentId filter) to debug
        console.log('Trying to scan all files for user to debug...');
        try {
          const allUserFiles = await brmhCrud.scan(TABLES.BRMH_DRIVE_FILES, {
            FilterExpression: 'userId = :userId',
            ExpressionAttributeValues: { 
              ':userId': userId
            },
            itemPerPage: 100
          });
          
          console.log('All files for user:', {
            userId,
            totalFiles: allUserFiles.items?.length || 0,
            files: allUserFiles.items?.map((f: Record<string, unknown>) => ({
              id: f.id,
              name: f.name,
              parentId: f.parentId,
              s3Key: f.s3Key
            }))
          });
        } catch (debugError) {
          console.error('Debug scan failed:', debugError);
        }
      }
    } catch (localError) {
      console.error('Error scanning brmh-drive-files table:', localError);
      console.log('Local files not available, trying external BRMH Drive API:', localError);
    }
    
    // Fallback: List files using external BRMH Drive API with namespace scoping
    try {
      const namespace = { id: NAMESPACE_ID, name: NAMESPACE_NAME };
      const result = await brmhDrive.listFiles(userId, parentId, limit, 
        parentId === 'ROOT' ? `${namespace.name}_${namespace.id}` : undefined);
      return NextResponse.json(result);
    } catch (externalError) {
      console.log('External BRMH Drive API not accessible:', externalError);
      return NextResponse.json({ 
        files: [],
        message: 'BRMH backend not accessible. Files will appear once connection is restored.',
        userId,
        parentId
      });
    }
    
  } catch (error) {
    console.error('Error listing files:', error);
    return NextResponse.json({ 
      error: 'Failed to list files',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}

// POST /api/files - Upload file (Optimized)
export async function POST(request: Request) {
  const startTime = Date.now();
  
  try {
    const formData = await request.formData();
    const file = formData.get('file');
    const userId = formData.get('userId');
    const parentId = formData.get('parentId') || 'ROOT';
    const tags = formData.get('tags');
    
    if (!file || typeof file === 'string' || !userId) {
      return NextResponse.json({ error: 'Missing file or userId' }, { status: 400 });
    }
    
    // File size validation (50MB limit)
    const maxSize = 50 * 1024 * 1024; // 50MB
    if (file.size > maxSize) {
      return NextResponse.json({ 
        error: `File too large. Maximum size is ${maxSize / (1024 * 1024)}MB` 
      }, { status: 400 });
    }
    
    console.log(`Starting upload for ${file.name} (${(file.size / 1024 / 1024).toFixed(2)}MB)`);
    
    // Optimized base64 conversion with streaming
    const arrayBuffer = await file.arrayBuffer();
    const base64Start = Date.now();
    
    // Use Buffer.from with encoding for better performance
    const base64Content = Buffer.from(arrayBuffer).toString('base64');
    
    const base64Time = Date.now() - base64Start;
    console.log(`Base64 conversion took ${base64Time}ms`);
    
    // Parse tags if provided
    let tagArray: string[] = [];
    if (tags && typeof tags === 'string') {
      try {
        tagArray = JSON.parse(tags);
      } catch {
        tagArray = [tags];
      }
    }
    
    // Upload file using BRMH Drive with namespace support
    const uploadStart = Date.now();
    const namespace = { id: NAMESPACE_ID, name: NAMESPACE_NAME };
    const uploadResult = await brmhDrive.uploadFile(userId as string, {
      name: file.name,
      mimeType: file.type,
      size: arrayBuffer.byteLength,
      content: base64Content,
      tags: tagArray
    }, parentId as string, parentId === 'ROOT' ? namespace : undefined);
    
    const uploadTime = Date.now() - uploadStart;
    const totalTime = Date.now() - startTime;
    
    console.log(`Upload completed in ${totalTime}ms (base64: ${base64Time}ms, upload: ${uploadTime}ms)`);
    
    // Save metadata to brmh-drive-files table for local access
    try {
      const driveFileRecord = {
        id: uploadResult.fileId,
        userId: userId,
        ownerId: userId,
        name: file.name,
        type: 'file',
        mimeType: file.type,
        size: arrayBuffer.byteLength,
        content: base64Content,
        parentId: parentId as string,
        tags: tagArray,
        s3Key: uploadResult.s3Key || '',
        s3Url: uploadResult.s3Url || '',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        isFile: true,
        isFolder: false,
        path: '', // Empty for root files
      };
      
      await brmhCrud.create(TABLES.BRMH_DRIVE_FILES, driveFileRecord);
      console.log('File metadata saved to brmh-drive-files table:', uploadResult.fileId);
    } catch (metadataError) {
      console.error('Failed to save file metadata:', metadataError);
      // Don't fail the upload if metadata saving fails
    }
    
    return NextResponse.json({
      ...uploadResult,
      performance: {
        totalTime,
        base64Time,
        uploadTime,
        fileSize: file.size
      }
    });
  } catch (error) {
    console.error('Error uploading file:', error);
    return NextResponse.json({ error: 'Failed to upload file' }, { status: 500 });
  }
}