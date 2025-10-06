import { NextResponse } from 'next/server';
import { recomputeAndSaveTagsSummary } from '../aggregate';

// POST /api/reports/tags-summary/trigger-recompute - Force recomputation of tags summary with transactions
export async function POST(request: Request) {
  try {
    console.log('🔄 POST /api/reports/tags-summary/trigger-recompute called');
    const body = await request.json();
    const { userId } = body;
    
    console.log('👤 UserId from request:', userId);
    
    if (!userId) {
      return NextResponse.json({ error: 'userId is required' }, { status: 400 });
    }

    console.log('🔄 Calling recomputeAndSaveTagsSummary with transactions...');
    await recomputeAndSaveTagsSummary(userId);
    console.log('✅ recomputeAndSaveTagsSummary completed successfully');
    
    return NextResponse.json({ 
      success: true, 
      message: 'Tags summary recomputed successfully with individual transactions stored'
    });
  } catch (error) {
    console.error('❌ Error recomputing tags summary:', error);
    return NextResponse.json({ error: 'Failed to recompute tags summary' }, { status: 500 });
  }
}

