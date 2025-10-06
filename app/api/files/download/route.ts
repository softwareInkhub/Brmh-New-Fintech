import { NextResponse } from 'next/server';
import { brmhDrive } from '../../brmh-drive-client';

// GET /api/files/download?userId=xxx&fileId=xxx
export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const userId = searchParams.get('userId');
    const fileId = searchParams.get('fileId');
    
    console.log('Download request:', { userId, fileId, url: request.url });
    
    if (!userId || !fileId) {
      return NextResponse.json({ error: 'userId and fileId are required' }, { status: 400 });
    }
    
    // Get download URL from BRMH Drive
    console.log('Calling BRMH Drive downloadFile...');
    const downloadResult = await brmhDrive.downloadFile(userId, fileId);
    console.log('BRMH Drive download result:', downloadResult);
    
    return NextResponse.json(downloadResult);
  } catch (error) {
    console.error('Error getting download URL:', error);
    console.error('Error details:', {
      message: error instanceof Error ? error.message : 'Unknown error',
      stack: error instanceof Error ? error.stack : undefined
    });
    return NextResponse.json({ error: 'Failed to get download URL' }, { status: 500 });
  }
}
