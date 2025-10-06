import { NextResponse } from 'next/server';
import { brmhCrud, TABLES } from '../../brmh-client';

// GET /api/transactions/by-tag-cached?userId=xxx&tagName=xxx&limit=xxx
export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const userId = searchParams.get('userId');
  const tagName = searchParams.get('tagName');
  const limit = parseInt(searchParams.get('limit') || '100');
  
  if (!userId || !tagName) {
    return NextResponse.json({ error: 'userId and tagName are required' }, { status: 400 });
  }
  
  try {
    console.log(`🔍 Fetching cached transactions for tag: ${tagName}, userId: ${userId}`);
    
    // Get the tags summary from brmh-fintech-user-reports table
    const result = await brmhCrud.getItem(TABLES.REPORTS, { id: `tags_summary_${userId}` });
    
    if (!result.item) {
      console.log(`❌ No tags summary found for user ${userId}`);
      return NextResponse.json([]);
    }
    
    const tagsSummary = result.item;
    if (!tagsSummary.tags || !Array.isArray(tagsSummary.tags)) {
      console.log(`❌ No tags data in summary for user ${userId}`);
      return NextResponse.json([]);
    }
    
    // Find the tag by name
    const targetTag = tagsSummary.tags.find((tag: Record<string, unknown>) => 
      tag.tagName && (tag.tagName as string).toLowerCase() === tagName.toLowerCase()
    );
    
    if (!targetTag) {
      console.log(`❌ Tag "${tagName}" not found in cached summary`);
      return NextResponse.json([]);
    }
    
    // Get transactions for this tag
    const tagTransactions = targetTag.transactions || [];
    
    // Apply limit
    const limitedTransactions = tagTransactions.slice(0, limit);
    
    console.log(`✅ Found ${limitedTransactions.length} cached transactions for tag: ${tagName}`);
    
    return NextResponse.json(limitedTransactions);
    
  } catch (error) {
    console.error('❌ Error fetching cached transactions by tag:', error);
    return NextResponse.json({ error: 'Failed to fetch cached transactions' }, { status: 500 });
  }
}
