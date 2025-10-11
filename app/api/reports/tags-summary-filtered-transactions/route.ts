import { NextResponse } from 'next/server';
import { brmhCrud, TABLES } from '../../brmh-client';

export const runtime = 'nodejs';

/**
 * GET /api/reports/tags-summary-filtered-transactions?userId=xxx&tagName=xxx&filterType=month&month=5&year=2024
 * 
 * This endpoint fetches filtered transactions for a specific tag based on date filter.
 * Used when opening tag transactions modal with date filtering applied.
 * 
 * Key Features:
 * - Fetches data from brmh-fintech-user-reports table
 * - Filters transactions by date using DD/MM/YYYY format (priority)
 * - Returns only transactions within the specified date range for the specific tag
 * - Used by reports page when opening tag transactions modal
 */
export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const userId = searchParams.get('userId');
    const tagName = searchParams.get('tagName');
    const filterType = searchParams.get('filterType');
    const month = searchParams.get('month');
    const year = searchParams.get('year');
    const startDate = searchParams.get('startDate');
    const endDate = searchParams.get('endDate');
    
    if (!userId || !tagName || !filterType) {
      return NextResponse.json({ 
        error: 'userId, tagName, and filterType are required' 
      }, { status: 400 });
    }

    console.log(`🔍 Fetching filtered transactions for tag "${tagName}" with filter: ${filterType}`);

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

    // Calculate date range based on filter type
    let startDateTime: Date;
    let endDateTime: Date;
    
    switch (filterType) {
      case 'month':
        if (!month || !year) {
          return NextResponse.json({ error: 'month and year are required for month filter' }, { status: 400 });
        }
        startDateTime = new Date(parseInt(year), parseInt(month) - 1, 1);
        endDateTime = new Date(parseInt(year), parseInt(month), 0, 23, 59, 59, 999);
        break;
        
      case 'year':
        if (!year) {
          return NextResponse.json({ error: 'year is required for year filter' }, { status: 400 });
        }
        startDateTime = new Date(parseInt(year), 0, 1);
        endDateTime = new Date(parseInt(year), 11, 31, 23, 59, 59, 999);
        break;
        
      case 'dateRange':
        if (!startDate || !endDate) {
          return NextResponse.json({ error: 'startDate and endDate are required for date range filter' }, { status: 400 });
        }
        startDateTime = new Date(startDate);
        endDateTime = new Date(endDate + 'T23:59:59.999Z');
        break;
        
      default:
        return NextResponse.json({ error: 'Invalid filter type' }, { status: 400 });
    }

    console.log(`📅 Date range: ${startDateTime.toISOString()} to ${endDateTime.toISOString()}`);

    // Filter transactions by date using DD/MM/YYYY format
    const filteredTransactions = targetTag.transactions.filter((tx: Record<string, unknown>) => {
      const txDate = parseTransactionDate(tx);
      if (!txDate) {
        console.log(`⚠️ Could not parse date for transaction:`, tx);
        return false;
      }
      
      const isInRange = txDate >= startDateTime && txDate <= endDateTime;
      if (isInRange) {
        console.log(`✅ Transaction date ${txDate.toISOString()} is in range for tag "${tagName}"`);
      }
      return isInRange;
    });

    console.log(`✅ Found ${filteredTransactions.length} filtered transactions for tag "${tagName}"`);

    return NextResponse.json(filteredTransactions);

  } catch (error) {
    console.error('❌ Error fetching filtered transactions:', error);
    return NextResponse.json({ 
      error: error instanceof Error ? error.message : 'Failed to fetch filtered transactions' 
    }, { status: 500 });
  }
}

// Helper function to parse transaction date from superbank format
// Prioritizes DD/MM/YYYY format as requested
function parseTransactionDate(tx: Record<string, unknown>): Date | null {
  // For superbank format, we have both 'date' and 'isoDate' fields
  // Try isoDate first (most reliable), then date field
  
  if (tx.isoDate && typeof tx.isoDate === 'string') {
    const parsedDate = new Date(tx.isoDate);
    if (!isNaN(parsedDate.getTime())) {
      return parsedDate;
    }
  }
  
  if (tx.date && typeof tx.date === 'string') {
    const dateValue = tx.date;
    
    // First try DD/MM/YYYY format (priority as requested)
    const parts = dateValue.split('/');
    if (parts.length === 3) {
      // Handle DD/MM/YYYY format
      const day = parseInt(parts[0]);
      const month = parseInt(parts[1]);
      const year = parseInt(parts[2]);
      
      // Handle 2-digit years (assume 20xx if < 50, otherwise 19xx)
      const fullYear = year < 50 ? 2000 + year : year < 100 ? 1900 + year : year;
      
      const parsedDate = new Date(fullYear, month - 1, day);
      if (!isNaN(parsedDate.getTime())) {
        console.log(`📅 Parsed DD/MM/YYYY: ${dateValue} -> ${parsedDate.toISOString()}`);
        return parsedDate;
      }
    }
    
    // If DD/MM/YYYY fails, try parsing as ISO string
    const parsedDate = new Date(dateValue);
    if (!isNaN(parsedDate.getTime())) {
      return parsedDate;
    }
  }
  
  return null;
}
