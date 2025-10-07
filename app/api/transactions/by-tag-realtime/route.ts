import { NextResponse } from 'next/server';
import { brmhCrud } from '../../brmh-client';

export const runtime = 'nodejs';

// GET /api/transactions/by-tag-realtime?userId=xxx&tagName=xxx&filterType=month&month=5&year=2024&limit=100
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
    const limit = parseInt(searchParams.get('limit') || '100');
    
    if (!userId || !tagName) {
      return NextResponse.json({ error: 'userId and tagName are required' }, { status: 400 });
    }

    console.log(`🔍 Real-time fetching transactions for tag: ${tagName}, userId: ${userId}`);

    // Calculate date range based on filter type
    let startDateTime: Date | null = null;
    let endDateTime: Date | null = null;
    
    if (filterType && filterType !== 'all') {
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
      }
    }

    console.log(`📅 Date range: ${startDateTime ? startDateTime.toISOString() : 'all'} to ${endDateTime ? endDateTime.toISOString() : 'all'}`);

    // Get all bank tables
    const bankTables = [
      'brmh-hdfc',
      'brmh-idfc', 
      'brmh-kotak',
      'brmh-icici'
    ];

    const allTransactions: Record<string, unknown>[] = [];

    // Fetch from each bank table
    for (const tableName of bankTables) {
      try {
        console.log(`🔍 Scanning table: ${tableName}`);
        
        // Build filter expression
        let filterExpression = 'userId = :userId';
        const expressionAttributeValues: Record<string, unknown> = { ':userId': userId };
        
        // Add tag filter - check if tags array contains the tag name
        filterExpression += ' AND contains(tags, :tagName)';
        expressionAttributeValues[':tagName'] = tagName;

        // NOTE: Do NOT add a DynamoDB BETWEEN on a single hard-coded date attribute here.
        // Many rows store dates under different keys and formats. We will scan by userId+tag
        // and then apply robust date parsing and filtering in code below.

        const scanParams: Record<string, unknown> = {
          FilterExpression: filterExpression,
          ExpressionAttributeValues: expressionAttributeValues,
          // No ExpressionAttributeNames for date; server-side filtering happens below.
        };

        const result = await brmhCrud.scan(tableName, scanParams);
        const transactions = result.items || [];
        
        console.log(`✅ Found ${transactions.length} transactions in ${tableName}`);
        
        // Filter transactions by date if needed (additional client-side filtering for accuracy)
        let filteredTransactions = transactions;
        if (startDateTime && endDateTime) {
          filteredTransactions = transactions.filter((tx: Record<string, unknown>) => {
            const txDate = parseTransactionDate(tx);
            const isValid = txDate && txDate >= startDateTime && txDate <= endDateTime;
            if (!isValid && txDate) {
              console.log(`🚫 Filtered out transaction: ${txDate.toISOString()} (outside range ${startDateTime.toISOString()} - ${endDateTime.toISOString()})`);
            }
            return isValid;
          });
          console.log(`📅 After date filtering: ${filteredTransactions.length} transactions in ${tableName} (from ${transactions.length} total)`);
        }

        allTransactions.push(...filteredTransactions);
        
      } catch (error) {
        console.error(`❌ Error scanning table ${tableName}:`, error);
        // Continue with other tables
      }
    }

    // Sort by date (newest first) and limit results
    allTransactions.sort((a, b) => {
      const dateA = parseTransactionDate(a);
      const dateB = parseTransactionDate(b);
      if (!dateA || !dateB) return 0;
      return dateB.getTime() - dateA.getTime();
    });

    const limitedTransactions = allTransactions.slice(0, limit);

    console.log(`✅ Total transactions found: ${allTransactions.length}, returning: ${limitedTransactions.length}`);

    return NextResponse.json(limitedTransactions);

  } catch (error) {
    console.error('❌ Error in real-time tag transactions fetch:', error);
    return NextResponse.json({ error: 'Failed to fetch real-time transactions' }, { status: 500 });
  }
}

// Helper function to parse transaction date from various field formats
function parseTransactionDate(tx: Record<string, unknown>): Date | null {
  const possibleDateFields = [
    'Date', 'date', 'TransactionDate', 'transactionDate',
    'TxnDate', 'txnDate', 'ValueDate', 'valueDate',
    'Transaction Date', 'transaction date', 'Value Date', 'value date'
  ];
  
  for (const field of possibleDateFields) {
    const dateValue = tx[field];
    if (dateValue) {
      // Handle different date formats
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
      
      if (!isNaN(parsedDate.getTime())) {
        console.log(`📅 Parsed date for transaction: ${parsedDate.toISOString()} from field '${field}'`);
        return parsedDate;
      }
    }
  }
  
  console.warn(`⚠️ Could not parse date for transaction:`, tx);
  return null;
}
