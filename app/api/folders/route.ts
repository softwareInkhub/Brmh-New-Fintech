import { NextResponse } from 'next/server';
import { brmhDrive, NAMESPACE_ID, NAMESPACE_NAME } from '../brmh-drive-client';

// GET /api/folders?userId=xxx&parentId=ROOT&limit=50
export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const userId = searchParams.get('userId');
    const parentId = searchParams.get('parentId') || 'ROOT';
    const limit = parseInt(searchParams.get('limit') || '50');
    
    console.log('Folders API request:', { userId, parentId, limit, url: request.url });
    
    if (!userId) {
      return NextResponse.json({ error: 'userId is required' }, { status: 400 });
    }
    
    // Get folders from BRMH Drive with namespace scoping
    console.log('Calling BRMH Drive listFolders...');
    const namespace = { id: NAMESPACE_ID, name: NAMESPACE_NAME };
    const foldersResult = await brmhDrive.listFolders(userId, parentId, limit, 
      parentId === 'ROOT' ? `${namespace.name}_${namespace.id}` : undefined);
    console.log('BRMH Drive listFolders result:', foldersResult);
    
    return NextResponse.json(foldersResult);
  } catch (error) {
    console.error('Error listing folders:', error);
    console.error('Error details:', {
      message: error instanceof Error ? error.message : 'Unknown error',
      stack: error instanceof Error ? error.stack : undefined
    });
    return NextResponse.json({ error: 'Failed to list folders' }, { status: 500 });
  }
}

// POST /api/folders - Create folder
export async function POST(request: Request) {
  try {
    const { userId, folderData, parentId = 'ROOT' } = await request.json();
    
    console.log('📁 Create folder request:', {
      userId,
      folderName: folderData?.name,
      parentId,
      namespaceWillBeUsed: parentId === 'ROOT'
    });
    
    if (!userId || !folderData?.name) {
      return NextResponse.json({ error: 'userId and folder name are required' }, { status: 400 });
    }
    
    // Create folder using BRMH Drive with namespace support
    const namespace = { id: NAMESPACE_ID, name: NAMESPACE_NAME };
    
    console.log('📁 Using namespace configuration:', {
      namespaceId: NAMESPACE_ID,
      namespaceName: NAMESPACE_NAME,
      fullNamespaceId: `${namespace.name}_${namespace.id}`,
      targetPath: `brmh-drive/namespaces/${namespace.name}-${namespace.id}/users/${userId}/`
    });
    
    const folderResult = await brmhDrive.createFolder(userId, folderData, parentId, 
      parentId === 'ROOT' ? namespace : undefined);
    
    console.log('✅ Folder created successfully:', folderResult);
    
    return NextResponse.json(folderResult);
  } catch (error) {
    console.error('❌ Error creating folder:', error);
    return NextResponse.json({ 
      error: 'Failed to create folder',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}











