import { NextResponse } from 'next/server';
import { brmhCrud, TABLES } from '../../brmh-client';

export const runtime = 'nodejs';

/**
 * GET /api/reports/tags-summary-all-transactions?userId=xxx&tagName=xxx
 * 
 * This endpoint fetches ALL transactions for a specific tag from brmh-fintech-user-reports table.
 * Used when no date filter is applied and user wants to see all transactions for a tag.
 * 
 * Key Features:
 * - Fetches data from brmh-fintech-user-reports table
 * - Returns ALL transactions for the specified tag (no date filtering)
 * - Used by reports page when opening tag transactions modal without date filter
 */
export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const userId = searchParams.get('userId');
    const tagName = searchParams.get('tagName');
    
    if (!userId || !tagName) {
      return NextResponse.json({ 
        error: 'userId and tagName are required' 
      }, { status: 400 });
    }

    console.log(`🔍 Fetching ALL transactions for tag "${tagName}" (no date filter)`);

    // Get the original tags summary from reports table
    const tagsSummaryResult = await brmhCrud.getItem(TABLES.REPORTS, { 
      id: `tags_summary_${userId}` 
    });
    
    if (!tagsSummaryResult.item || !tagsSummaryResult.item.tags) {
      console.log(`❌ No tags summary found for user ${userId}`);
      return NextResponse.json([]);
    }

    const originalTagsSummary = tagsSummaryResult.item;
    
    // Find the specific tag
    const targetTag = originalTagsSummary.tags.find((tag: Record<string, unknown>) => 
      tag.tagName && (tag.tagName as string).toLowerCase() === tagName.toLowerCase()
    );
    
    if (!targetTag) {
      console.log(`❌ Tag "${tagName}" not found in tags summary`);
      return NextResponse.json([]);
    }

    if (!targetTag.transactions || targetTag.transactions.length === 0) {
      console.log(`❌ Tag "${tagName}" has no transactions`);
      return NextResponse.json([]);
    }

    // Return ALL transactions for this tag (no date filtering)
    const allTransactions = targetTag.transactions as Record<string, unknown>[];
    console.log(`✅ Found ${allTransactions.length} total transactions for tag "${tagName}"`);

    return NextResponse.json(allTransactions);

  } catch (error) {
    console.error('❌ Error fetching all transactions for tag:', error);
    return NextResponse.json({ 
      error: error instanceof Error ? error.message : 'Failed to fetch all transactions for tag' 
    }, { status: 500 });
  }
}

