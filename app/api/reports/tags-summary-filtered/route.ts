import { NextResponse } from 'next/server';
import { brmhCrud, TABLES } from '../../brmh-client';

export const runtime = 'nodejs';

// GET /api/reports/tags-summary-filtered?userId=xxx&filterType=month&month=5&year=2024
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

    // Filter tags based on transactions in the date range
    const filteredTags = [];
    
    for (const tag of originalTagsSummary.tags) {
      // Add validation for malformed tags
      if (!tag || typeof tag.tagName !== 'string' || typeof tag.tagId !== 'string') {
        console.warn('Skipping malformed tag in tags summary:', tag);
        continue;
      }

      if (!tag.transactions || tag.transactions.length === 0) {
        continue; // Skip tags with no transactions
      }

      // Filter transactions by date
      const filteredTransactions = tag.transactions.filter((tx: Record<string, unknown>) => {
        const txDate = parseTransactionDate(tx);
        if (!txDate) return false;
        
        return txDate >= startDateTime && txDate <= endDateTime;
      });

      // Only include tag if it has transactions in the date range
      if (filteredTransactions.length > 0) {
        // Recalculate tag statistics based on filtered transactions
        const recalculatedTag = recalculateTagStats(tag, filteredTransactions);
        filteredTags.push(recalculatedTag);
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

// Helper function to parse transaction date from various field formats
function parseTransactionDate(tx: Record<string, unknown>): Date | null {
  const possibleDateFields = [
    'Date', 'date', 'TransactionDate', 'transactionDate',
    'TxnDate', 'txnDate', 'ValueDate', 'valueDate'
  ];
  
  for (const field of possibleDateFields) {
    const dateValue = tx[field];
    if (dateValue) {
      let parsedDate: Date;
      
      if (typeof dateValue === 'string') {
        // Try parsing as ISO string first
        parsedDate = new Date(dateValue);
        
        // If that fails, try DD/MM/YYYY format
        if (isNaN(parsedDate.getTime())) {
          const parts = dateValue.split('/');
          if (parts.length === 3) {
            // Handle DD/MM/YYYY format
            const day = parseInt(parts[0]);
            const month = parseInt(parts[1]);
            const year = parseInt(parts[2]);
            
            // Handle 2-digit years (assume 20xx if < 50, otherwise 19xx)
            const fullYear = year < 50 ? 2000 + year : year < 100 ? 1900 + year : year;
            
            parsedDate = new Date(fullYear, month - 1, day);
            console.log(`📅 Parsed DD/MM/YYYY: ${dateValue} -> ${parsedDate.toISOString()}`);
          }
        }
              } else if (typeof dateValue === 'number' || dateValue instanceof Date) {
        parsedDate = new Date(dateValue);
                  } else {
        continue; // Skip invalid date values
      }
      
      if (parsedDate && !isNaN(parsedDate.getTime())) {
        return parsedDate;
      }
    }
  }
  
  return null;
}

// Helper function to recalculate tag statistics based on filtered transactions
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

    // Extract amount and type
    const { amount, type } = extractAmountAndType(tx);
    
    if (type === 'CR') {
      credit += amount;
    } else if (type === 'DR') {
      debit += amount;
    }

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

    if (type === 'CR') {
      bankData.credit += amount;
    } else if (type === 'DR') {
      bankData.debit += amount;
    }
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

// Helper function to extract amount and type from transaction
function extractAmountAndType(tx: Record<string, unknown>): { amount: number; type: 'CR' | 'DR' | '' } {
  // Try to get amount from various fields
  const amountFields = ['AmountRaw', 'Amount', 'amount', 'TransactionAmount', 'transactionAmount'];
  let amount = 0;
  
  for (const field of amountFields) {
    if (tx[field] !== undefined && tx[field] !== null) {
      const value = tx[field];
      if (typeof value === 'number') {
        amount = Math.abs(value);
        break;
      } else if (typeof value === 'string') {
        const cleaned = value.replace(/₹|,/g, '').trim();
        const num = parseFloat(cleaned);
        if (!isNaN(num)) {
          amount = Math.abs(num);
          break;
        }
      }
    }
  }

  // Try to get CR/DR type from various fields
  const typeFields = ['Dr./Cr.', 'Dr/Cr', 'DR/CR', 'Type', 'Cr/Dr', 'TransactionType'];
  let type: 'CR' | 'DR' | '' = '';
  
  for (const field of typeFields) {
    if (tx[field]) {
      const value = tx[field].toString().trim().toUpperCase();
      if (value === 'CR' || value === 'CREDIT') {
        type = 'CR';
        break;
      } else if (value === 'DR' || value === 'DEBIT') {
        type = 'DR';
        break;
      }
    }
  }

  return { amount, type };
}
