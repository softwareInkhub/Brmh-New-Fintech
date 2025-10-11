import { NextResponse } from 'next/server';
import { brmhCrud, TABLES } from '../../brmh-client';

export const runtime = 'nodejs';

/**
 * GET /api/reports/tags-summary-filtered?userId=xxx&filterType=month&month=5&year=2024
 * 
 * This endpoint filters tags and their transactions based on date range.
 * It only returns tags that have transactions within the specified date range.
 * 
 * Key Features:
 * - Fetches data from brmh-fintech-user-reports table
 * - Filters transactions by date using DD/MM/YYYY format (priority)
 * - Only shows tags that have transactions in the filtered date range
 * - Recalculates tag statistics (credit, debit, balance) based on filtered transactions
 * - Excludes tags with no transactions in the date range
 */
export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const userId = searchParams.get('userId');
    const filterType = searchParams.get('filterType');
    const month = searchParams.get('month');
    const year = searchParams.get('year');
    const startDate = searchParams.get('startDate');
    const endDate = searchParams.get('endDate');
    
    if (!userId || !filterType) {
      return NextResponse.json({ error: 'userId and filterType are required' }, { status: 400 });
    }

    console.log(`🔍 Fetching filtered tags summary for user ${userId}, filter: ${filterType}`);

    // Get the original tags summary from reports table
    const tagsSummaryResult = await brmhCrud.getItem(TABLES.REPORTS, { 
      id: `tags_summary_${userId}` 
    });
    
    if (!tagsSummaryResult.item || !tagsSummaryResult.item.tags) {
      console.log(`❌ No tags summary found for user ${userId}`);
      return NextResponse.json({ tags: [] });
    }

    const originalTagsSummary = tagsSummaryResult.item;
    
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
    console.log(`📊 Total tags in summary: ${originalTagsSummary.tags.length}`);

    // Filter tags based on transactions in the date range
    // Only show tags that have transactions in the filtered date range
    const filteredTags = [];
    
    for (const tag of originalTagsSummary.tags) {
      // Add validation for malformed tags
      if (!tag || typeof tag.tagName !== 'string' || typeof tag.tagId !== 'string') {
        console.warn('Skipping malformed tag in tags summary:', tag);
        continue;
      }

      if (!tag.transactions || tag.transactions.length === 0) {
        console.log(`📋 Tag "${tag.tagName}" has no transactions - skipping`);
        continue; // Skip tags with no transactions
      }

      // Filter transactions by date using DD/MM/YYYY format
      const filteredTransactions = tag.transactions.filter((tx: Record<string, unknown>) => {
        const txDate = parseTransactionDate(tx);
        if (!txDate) {
          console.log(`⚠️ Could not parse date for transaction:`, tx);
          return false;
        }
        
        const isInRange = txDate >= startDateTime && txDate <= endDateTime;
        if (isInRange) {
          console.log(`✅ Transaction date ${txDate.toISOString()} is in range for tag "${tag.tagName}"`);
        }
        return isInRange;
      });

      // Only include tag if it has transactions in the date range
      if (filteredTransactions.length > 0) {
        console.log(`📊 Tag "${tag.tagName}" has ${filteredTransactions.length} transactions in date range - including`);
        // Recalculate tag statistics based on filtered transactions
        const recalculatedTag = recalculateTagStats(tag, filteredTransactions);
        filteredTags.push(recalculatedTag);
      } else {
        console.log(`📋 Tag "${tag.tagName}" has no transactions in date range - excluding`);
      }
    }

    console.log(`✅ Found ${filteredTags.length} tags with transactions in the specified date range`);

    // Return filtered tags summary with same structure as original
    return NextResponse.json({
      id: originalTagsSummary.id,
      type: originalTagsSummary.type,
      userId: originalTagsSummary.userId,
      updatedAt: new Date().toISOString(),
      createdAt: originalTagsSummary.createdAt,
      tags: filteredTags
    });

  } catch (error) {
    console.error('❌ Error fetching filtered tags summary:', error);
    return NextResponse.json({ 
      error: error instanceof Error ? error.message : 'Failed to fetch filtered tags summary' 
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

// Helper function to recalculate tag statistics based on filtered superbank transactions
function recalculateTagStats(originalTag: Record<string, unknown>, filteredTransactions: Record<string, unknown>[]): Record<string, unknown> {
  let credit = 0;
  let debit = 0;
  const transactionCount = filteredTransactions.length;
  const statementIds = new Set<string>();
  const bankBreakdown: { [bankName: string]: Record<string, unknown> } = {};

  for (const tx of filteredTransactions) {
    // Validate transaction object
    if (!tx || typeof tx !== 'object') {
      console.warn('Skipping invalid transaction:', tx);
      continue;
    }

    // For superbank format, we have explicit cr and dr fields
    const txCredit = typeof tx.cr === 'number' ? tx.cr : 0;
    const txDebit = typeof tx.dr === 'number' ? tx.dr : 0;
    
    credit += txCredit;
    debit += txDebit;

    // Collect statement IDs
    if (tx.statementId && typeof tx.statementId === 'string') {
      statementIds.add(tx.statementId);
    }

    // Update bank breakdown
    const bankName = (tx.bankName && typeof tx.bankName === 'string') ? tx.bankName : 'Unknown';
    if (!bankBreakdown[bankName]) {
      bankBreakdown[bankName] = {
        credit: 0,
        debit: 0,
        balance: 0,
        transactionCount: 0,
        accounts: new Set<string>()
      };
    }

    const bankData = bankBreakdown[bankName] as {
      credit: number;
      debit: number;
      balance: number;
      transactionCount: number;
      accounts: Set<string>;
    };

    bankData.credit += txCredit;
    bankData.debit += txDebit;
    bankData.transactionCount++;
    bankData.balance = bankData.credit - bankData.debit;

    if (tx.accountId && typeof tx.accountId === 'string') {
      bankData.accounts.add(tx.accountId);
    } else if (tx.accountNumber && typeof tx.accountNumber === 'string') {
      bankData.accounts.add(tx.accountNumber);
    }
  }

  // Convert Set to Array for accounts
  for (const bankName in bankBreakdown) {
    const bankData = bankBreakdown[bankName] as {
      credit: number;
      debit: number;
      balance: number;
      transactionCount: number;
      accounts: Set<string>;
    };
    (bankData as Record<string, unknown>).accounts = Array.from(bankData.accounts);
  }

  return {
    ...originalTag,
    credit,
    debit,
    balance: credit - debit,
    transactionCount,
    statementIds: Array.from(statementIds),
    bankBreakdown,
    transactions: filteredTransactions // Include filtered transactions
  };
}

// Note: extractAmountAndType function removed since we now use superbank format
// with explicit cr, dr, and type fields
