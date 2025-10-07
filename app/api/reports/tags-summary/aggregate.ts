import { brmhCrud, TABLES, getBankTransactionTable } from '../../brmh-client';

type TagItem = { id: string; name: string; color?: string; userId?: string };
type TransactionItem = Record<string, unknown> & {
  id?: string;
  userId?: string;
  statementId?: string;
  tags?: Array<string | TagItem>;
  AmountRaw?: number;
  Amount?: number | string;
  amount?: number | string;
  'Dr./Cr.'?: string;
  bankId?: string;
  accountId?: string;
  accountNumber?: string;
  AccountNumber?: string;
  account_number?: string;
  AccountNo?: string;
  accountNo?: string;
  'Dr/Cr'?: string;
  'DR/CR'?: string;
  'Type'?: string;
  // ICICI specific fields
  'Cr/Dr'?: string;
  'Transaction Amount(INR)'?: number | string;
};

function toNumber(val: unknown): number {
  if (typeof val === 'number') return val;
  if (typeof val === 'string') {
    const match = val.replace(/₹|,/g, '').match(/-?\d+(?:\.\d+)?/);
    if (match) return parseFloat(match[0]);
  }
  return 0;
}

function extractAmountAndType(tx: TransactionItem): { amountAbs: number; crdr: 'CR' | 'DR' | '' } {
  // Debug: Log the first few transactions to see field structure
  const txId = tx.id;
  const bankId = tx.bankId as string | undefined;
  
  // Enhanced debugging for ICICI and Kotak transactions specifically
  if (bankId && (bankId.toLowerCase().includes('kotak') || bankId.toLowerCase().includes('icici'))) {
    console.log(`🔍 ${bankId.toUpperCase()} Transaction fields:`, {
      id: txId,
      bankId: bankId,
      allFields: Object.keys(tx),
      allValues: Object.fromEntries(
        Object.entries(tx).map(([k, v]) => [k, typeof v === 'string' ? v.substring(0, 50) : v])
      ),
      drCrField: tx['Dr./Cr.'],
      drCrField2: tx['Dr/Cr' as keyof typeof tx],
      drCrField3: tx['DR/CR' as keyof typeof tx],
      typeField: tx['Type' as keyof typeof tx],
      amountField: tx.AmountRaw ?? tx.Amount ?? tx.amount,
      // ICICI specific fields
      iciciCrDr: tx['Cr/Dr' as keyof typeof tx],
      iciciAmount: tx['Transaction Amount(INR)' as keyof typeof tx]
    });
  }

  // Prefer unified amount fields if present (including ICICI specific field)
  const unified = tx.AmountRaw ?? tx.Amount ?? tx.amount ?? tx['Transaction Amount(INR)' as keyof typeof tx];

  // Enhanced CR/DR field detection
  const findCrDr = (): string => {
    // Try all possible CR/DR field variations
    const possibleFields = [
      'Dr./Cr.',
      'Dr/Cr', 
      'DR/CR',
      'dr/cr',
      'CR/DR',
      'cr/dr',
      'Cr/Dr',
      'Type',
      'Transaction Type',
      'Txn Type',
      'Debit/Credit',
      'DebitCredit',
      'DC',
      'D/C',
      // Add the exact field names from Kotak bank
      'Dr / Cr',
      'Dr / Cr_1',
      'DR / CR',
      'DR / CR_1',
      // Add ICICI specific field names
      'Cr/Dr',
      'Cr / Dr',
      'CR/DR',
      'CR / DR'
    ];
    
    for (const field of possibleFields) {
      const value = tx[field as keyof typeof tx];
      if (value != null && value !== '') {
        const norm = String(value).trim().toUpperCase();
        if (norm === 'CR' || norm === 'DR' || norm === 'DEBIT' || norm === 'CREDIT') {
          if (bankId && (bankId.toLowerCase().includes('kotak') || bankId.toLowerCase().includes('icici'))) {
            console.log(`🔍 Found CR/DR field "${field}": "${value}" -> "${norm}"`);
          }
          return norm === 'DEBIT' ? 'DR' : norm === 'CREDIT' ? 'CR' : norm;
        }
      }
    }
    
    // Fallback: scan keys that contain CR/DR indicators
    for (const k of Object.keys(tx || {})) {
      const lk = k.toLowerCase();
      if ((lk.includes('cr') && lk.includes('dr')) || lk.includes('debit') || lk.includes('credit')) {
        const v = tx[k as keyof typeof tx];
        if (v != null && v !== '') {
          const norm = String(v).trim().toUpperCase();
                  if (norm === 'CR' || norm === 'DR' || norm === 'DEBIT' || norm === 'CREDIT') {
          if (bankId && (bankId.toLowerCase().includes('kotak') || bankId.toLowerCase().includes('icici'))) {
            console.log(`🔍 Found CR/DR via key scan "${k}": "${v}" -> "${norm}"`);
          }
          return norm === 'DEBIT' ? 'DR' : norm === 'CREDIT' ? 'CR' : norm;
        }
        }
      }
    }
    
    if (bankId && (bankId.toLowerCase().includes('kotak') || bankId.toLowerCase().includes('icici'))) {
      console.log(`🔍 No CR/DR field found for ${bankId} transaction`);
    }
    return '';
  };
  
  const crdrField = findCrDr();

  if (unified !== undefined) {
    const num = toNumber(unified);
    const abs = Math.abs(num);
    if (crdrField === 'CR' || crdrField === 'DR') {
      const result = { amountAbs: abs, crdr: crdrField as 'CR' | 'DR' };
      if (bankId && (bankId.toLowerCase().includes('kotak') || bankId.toLowerCase().includes('icici'))) {
        console.log(`🔍 ${bankId}: Using explicit CR/DR field:`, result);
      }
      return result;
    }
    // Don't fall back to sign-based inference for now - let it go to split field detection
  }

  // Try split credit/debit style fields
  let credit = 0;
  let debit = 0;
  for (const [rawKey, value] of Object.entries(tx)) {
    const key = rawKey.toLowerCase();
    const n = toNumber(value);
    if (!n) continue;
    if (key.includes('credit') || key.includes('deposit') || key.includes('cr amount') || /(^|\W)cr(\W|$)/.test(key)) {
      credit += Math.abs(n);
    }
    if (key.includes('debit') || key.includes('withdraw') || key.includes('dr amount') || /(^|\W)dr(\W|$)/.test(key)) {
      debit += Math.abs(n);
    }
  }
  if (credit > 0 && debit === 0) return { amountAbs: Math.round(credit * 100) / 100, crdr: 'CR' };
  if (debit > 0 && credit === 0) return { amountAbs: Math.round(debit * 100) / 100, crdr: 'DR' };

  // If we still can't determine, return 0 to skip this transaction
  if (bankId && (bankId.toLowerCase().includes('kotak') || bankId.toLowerCase().includes('icici'))) {
    console.log(`🔍 ${bankId}: Could not determine CR/DR, skipping transaction`);
  }
  return { amountAbs: 0, crdr: '' };
}

export async function recomputeAndSaveTagsSummary(userId: string): Promise<void> {
  try {
    console.log(`🚀 Starting tags summary computation for user ${userId}...`);
    
    // 1) Load all tags for this user
    const userTags: TagItem[] = [];
    {
      let lastEvaluatedKey: Record<string, unknown> | undefined = undefined;
      let hasMoreItems = true;
      while (hasMoreItems) {
        // Remove unused params object since we're using brmhCrud.scan directly
        const result = await brmhCrud.scan(TABLES.TAGS, {
          FilterExpression: 'userId = :userId',
          ExpressionAttributeValues: { ':userId': userId },
          itemPerPage: 100
        });
        userTags.push(...(result.items as TagItem[] | undefined ?? []));
        lastEvaluatedKey = result.lastEvaluatedKey;
        hasMoreItems = !!lastEvaluatedKey;
        if (hasMoreItems) await new Promise(r => setTimeout(r, 100));
      }
    }
    
    console.log(`Loaded ${userTags.length} tags for user ${userId}`);

  const tagsById = new Map<string, TagItem>();
  const tagsByNameLower = new Map<string, TagItem>();
  for (const t of userTags) {
    if (t?.id) tagsById.set(t.id, t);
    if (t?.name) tagsByNameLower.set(t.name.toLowerCase(), t);
  }

  type BankBreakdown = {
    credit: number;
    debit: number;
    balance: number;
    transactionCount: number;
    accounts: string[];
  };

  type TagAgg = {
    tagId: string;
    tagName: string;
    credit: number;
    debit: number;
    balance: number;
    transactionCount: number;
    statementIds: string[];
    bankBreakdown: { [bankName: string]: BankBreakdown };
    transactions: TransactionItem[]; // Store individual transactions for this tag
  };
  const aggByTagId = new Map<string, TagAgg>();

  const getOrInitAgg = (tag: TagItem): TagAgg => {
    let entry = aggByTagId.get(tag.id);
    if (!entry) {
      entry = {
        tagId: tag.id,
        tagName: tag.name || '',
        credit: 0,
        debit: 0,
        balance: 0,
        transactionCount: 0,
        statementIds: [],
        bankBreakdown: {},
        transactions: [], // Initialize transactions array
      };
      aggByTagId.set(tag.id, entry);
    }
    return entry;
  };

  // 2) Load all banks
  const banksResult = await brmhCrud.scan(TABLES.BANKS, {});
  const banks = (banksResult.items || []) as Array<{ bankName?: string } & Record<string, unknown>>;

  // 3) Accumulate per-tag metrics across bank tables
  for (const bank of banks) {
    const bankName = String(bank.bankName ?? '').trim();
    if (!bankName) continue;
    const tableName = getBankTransactionTable(bankName);
    try {
      let lastEvaluatedKey: Record<string, unknown> | undefined = undefined;
      let hasMoreItems = true;
      while (hasMoreItems) {
        // Remove unused params object since we're using brmhCrud.scan directly
        const result = await brmhCrud.scan(tableName, {
          FilterExpression: 'userId = :userId',
          ExpressionAttributeValues: { ':userId': userId },
          itemPerPage: 1000
        });
        const txs = (result.items || []) as TransactionItem[];

        for (const tx of txs) {
          const txTagsRaw = Array.isArray(tx.tags) ? tx.tags : [];
          const txTags: TagItem[] = txTagsRaw
            .map(tag => {
              if (typeof tag === 'string') return tagsById.get(tag) || tagsByNameLower.get(tag.toLowerCase());
              if (tag && typeof tag === 'object') {
                const anyTag = tag as Record<string, unknown>;
                const byId = typeof anyTag.id === 'string' ? tagsById.get(anyTag.id) : undefined;
                if (byId) return byId;
                const byName = typeof anyTag.name === 'string' ? tagsByNameLower.get((anyTag.name as string).toLowerCase()) : undefined;
                if (byName) return byName;
              }
              return undefined;
            })
            .filter(Boolean) as TagItem[];

          if (txTags.length === 0) continue;

          const { amountAbs, crdr } = extractAmountAndType(tx);
          if (!amountAbs) continue; // skip zero/unknown amounts
          const statementId = typeof tx.statementId === 'string' ? tx.statementId : undefined;

          for (const tag of txTags) {
            const entry = getOrInitAgg(tag);
            if (crdr === 'CR') {
              entry.credit = Math.round((entry.credit + amountAbs) * 100) / 100;
            } else if (crdr === 'DR') {
              entry.debit = Math.round((entry.debit + amountAbs) * 100) / 100;
            }
            entry.balance = Math.round((entry.credit - entry.debit) * 100) / 100;
            entry.transactionCount += 1;
            if (statementId && !entry.statementIds.includes(statementId)) {
              entry.statementIds.push(statementId);
            }
            
            // Store the individual transaction for this tag with normalized isoDate for reliable filtering
            try {
              const normalized = { ...tx } as Record<string, unknown>;
              const possibleDateFields = [
                'isoDate', 'Date', 'date', 'TransactionDate', 'transactionDate',
                'TxnDate', 'txnDate', 'ValueDate', 'valueDate',
                'Transaction Date', 'transaction date', 'Value Date', 'value date'
              ];
              let parsed: Date | null = null;
              for (const field of possibleDateFields) {
                const val = (tx as Record<string, unknown>)[field];
                if (!val) continue;
                if (typeof val === 'string') {
                  const d1 = new Date(val);
                  if (!isNaN(d1.getTime())) { parsed = d1; break; }
                  const parts = val.split('/');
                  if (parts.length === 3) {
                    const day = parseInt(parts[0]);
                    const month = parseInt(parts[1]);
                    const year = parseInt(parts[2]);
                    const fullYear = year < 50 ? 2000 + year : year < 100 ? 1900 + year : year;
                    parsed = new Date(fullYear, month - 1, day);
                    break;
                  }
                } else if (typeof val === 'number' || val instanceof Date) {
                  const d2 = new Date(val as number | Date);
                  if (!isNaN(d2.getTime())) { parsed = d2; break; }
                }
              }
              if (parsed) normalized.isoDate = parsed.toISOString();
              entry.transactions.push(normalized as TransactionItem);
            } catch {
              entry.transactions.push(tx);
            }
            
            // Add bank breakdown data
            if (!entry.bankBreakdown[bankName]) {
              entry.bankBreakdown[bankName] = {
                credit: 0,
                debit: 0,
                balance: 0,
                transactionCount: 0,
                accounts: [],
              };
            }
            
            const bankData = entry.bankBreakdown[bankName];
            if (crdr === 'CR') {
              bankData.credit = Math.round((bankData.credit + amountAbs) * 100) / 100;
            } else if (crdr === 'DR') {
              bankData.debit = Math.round((bankData.debit + amountAbs) * 100) / 100;
            }
            bankData.balance = Math.round((bankData.credit - bankData.debit) * 100) / 100;
            bankData.transactionCount += 1;
            
            // Add account number if not already present (prefer account number over name)
            const accountNumber = tx.accountNumber as string | undefined || 
                                 tx.AccountNumber as string | undefined || 
                                 tx.account_number as string | undefined || 
                                 tx.AccountNo as string | undefined || 
                                 tx.accountNo as string | undefined || '';
            
            let accountDisplay = '';
            if (accountNumber && typeof accountNumber === 'string') {
              accountDisplay = accountNumber;
            } else if (tx.accountId && typeof tx.accountId === 'string') {
              // Only use accountId as last resort, but truncate UUID for readability
              accountDisplay = `Account-${tx.accountId.substring(0, 8)}...`;
            }
            
            if (accountDisplay && !bankData.accounts.includes(accountDisplay)) {
              bankData.accounts.push(accountDisplay);
            }
            
            // Debug logging for HDFC tag
            if (tag.name === 'HDFC') {
              console.log(`HDFC Tag - Transaction ${tx.id}: amount=${amountAbs}, crdr=${crdr}, totalCount=${entry.transactionCount}, bank=${bankName}, accountDisplay=${accountDisplay}`);
              console.log(`Available account fields:`, {
                accountId: tx.accountId,
                accountNumber,
                allKeys: Object.keys(tx).filter(k => k.toLowerCase().includes('account'))
              });
            }
          }
        }

        lastEvaluatedKey = result.lastEvaluatedKey;
        hasMoreItems = !!lastEvaluatedKey;
        if (hasMoreItems) await new Promise(r => setTimeout(r, 50)); // Reduced delay for better performance
      }
    } catch (error) {
      console.error(`Error processing bank ${bankName} (table: ${tableName}):`, error);
      continue;
    }
  }

  // 4) Ensure all user tags present
  for (const tag of userTags) {
    if (!aggByTagId.has(tag.id)) {
      aggByTagId.set(tag.id, {
        tagId: tag.id,
        tagName: tag.name || '',
        credit: 0,
        debit: 0,
        balance: 0,
        transactionCount: 0,
        statementIds: [],
        bankBreakdown: {},
        transactions: [], // Add the missing transactions property
      });
    }
  }

  const tagsSummary = Array.from(aggByTagId.values()).sort((a, b) => (a.tagName || '').localeCompare(b.tagName || ''));
  
  // Debug logging for final summary
  console.log(`Tags Summary Computation Complete for user ${userId}:`);
  tagsSummary.forEach(tag => {
    console.log(`  ${tag.tagName}: ${tag.transactionCount} transactions, Credit: ${tag.credit}, Debit: ${tag.debit}, Balance: ${tag.balance}`);
    if (Object.keys(tag.bankBreakdown).length > 0) {
      console.log(`    Bank Breakdown:`);
      Object.entries(tag.bankBreakdown).forEach(([bankName, bankData]) => {
        console.log(`      ${bankName}: ${bankData.transactionCount} transactions, Credit: ${bankData.credit}, Debit: ${bankData.debit}, Balance: ${bankData.balance}`);
      });
    }
  });
  
  const now = new Date().toISOString();
  try {
    console.log(`💾 Attempting to save tags summary to database for user ${userId}...`);
    console.log(`📊 Tags summary data:`, JSON.stringify(tagsSummary, null, 2));
    
    // Try to create the item first, then update if it exists
    const itemData = {
      id: `tags_summary_${userId}`,
      type: 'tags_summary',
      userId,
      tags: tagsSummary,
      updatedAt: now,
      createdAt: now,
    };
    
    // First try to get the existing item
    try {
      const existingItem = await brmhCrud.getItem(TABLES.REPORTS, { id: `tags_summary_${userId}` });
      if (existingItem.item) {
        // Item exists, update it
        console.log(`Updating existing tags summary for user ${userId}...`);
        const saveResult = await brmhCrud.update(TABLES.REPORTS, { id: `tags_summary_${userId}` }, {
          type: 'tags_summary',
          userId,
          tags: tagsSummary,
          updatedAt: now,
        });
        console.log(`Successfully updated tags summary to database:`, saveResult);
      } else {
        // Item doesn't exist, create it
        console.log(`Creating new tags summary for user ${userId}...`);
        const saveResult = await brmhCrud.create(TABLES.REPORTS, itemData);
        console.log(`Successfully created tags summary in database:`, saveResult);
      }
    } catch {
      // If getItem fails, try to create the item
      console.log(`GetItem failed, creating new tags summary for user ${userId}...`);
      const saveResult = await brmhCrud.create(TABLES.REPORTS, itemData);
      console.log(`Successfully created tags summary in database:`, saveResult);
    }
  } catch (error) {
    console.error(`Failed to save tags summary to database for user ${userId}:`, error);
    throw error;
  }
  
  } catch (error) {
    console.error(`Failed to compute tags summary for user ${userId}:`, error);
    throw error;
  }
}


