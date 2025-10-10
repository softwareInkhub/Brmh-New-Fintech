/**
 * File Matching Utilities
 * Automated helpers for intelligent CSV file comparison and matching
 */

// Common header variations for auto-detection
const HEADER_PATTERNS = {
  date: [
    'date', 'transaction date', 'txn date', 'value date', 'posting date',
    'trans date', 'trn date', 'dt', 'dated', 'transaction_date', 'txndate',
    'valuedate', 'value_date', 'tran_date', 'trans_date'
  ],
  amount: [
    'amount', 'amt', 'value', 'transaction amount', 'txn amount', 'debit',
    'credit', 'withdrawal', 'deposit', 'transaction_amount', 'txnamount',
    'amt.', 'amountraw', 'amount raw', 'transaction value'
  ],
  description: [
    'description', 'narration', 'particular', 'particulars', 'details',
    'transaction details', 'txn details', 'remarks', 'reference', 'desc',
    'transaction description', 'txn description', 'narration/description',
    'transaction_description', 'txndescription', 'cheque number', 'ref no',
    'reference no', 'chq./ref.no.', 'chq/ref no'
  ],
  withdrawal: [
    'withdrawal', 'debit', 'dr', 'withdrawal amt', 'withdrawal amount',
    'debit amount', 'dr amount', 'withdrawals', 'debits', 'withdrawal_amt',
    'withdrawalamt', 'debit_amount'
  ],
  deposit: [
    'deposit', 'credit', 'cr', 'deposit amt', 'deposit amount',
    'credit amount', 'cr amount', 'deposits', 'credits', 'deposit_amt',
    'depositamt', 'credit_amount'
  ],
  balance: [
    'balance', 'closing balance', 'closing bal', 'balance amt', 'bal',
    'available balance', 'book balance', 'closingbalance', 'closing_balance'
  ],
  reference: [
    'reference', 'ref', 'ref no', 'reference no', 'cheque no', 'chq no',
    'transaction ref', 'txn ref', 'chq./ref.no.', 'reference_no', 'refno'
  ]
};

/**
 * Normalize header name to detect its type
 */
export function normalizeHeader(header: string): string {
  const normalized = header.toLowerCase().trim().replace(/[^a-z0-9]/g, '');
  
  for (const [type, patterns] of Object.entries(HEADER_PATTERNS)) {
    for (const pattern of patterns) {
      const patternNormalized = pattern.replace(/[^a-z0-9]/g, '');
      if (normalized === patternNormalized || 
          normalized.includes(patternNormalized) ||
          patternNormalized.includes(normalized)) {
        return type;
      }
    }
  }
  
  return header; // Return original if no pattern matches
}

/**
 * Auto-detect column types in a CSV file
 */
export function detectColumnTypes(headers: string[]): {
  dateColumns: number[];
  amountColumns: number[];
  descriptionColumns: number[];
  withdrawalColumns: number[];
  depositColumns: number[];
  balanceColumns: number[];
  referenceColumns: number[];
} {
  const result = {
    dateColumns: [] as number[],
    amountColumns: [] as number[],
    descriptionColumns: [] as number[],
    withdrawalColumns: [] as number[],
    depositColumns: [] as number[],
    balanceColumns: [] as number[],
    referenceColumns: [] as number[]
  };

  headers.forEach((header, index) => {
    const type = normalizeHeader(header);
    switch (type) {
      case 'date':
        result.dateColumns.push(index);
        break;
      case 'amount':
        result.amountColumns.push(index);
        break;
      case 'description':
        result.descriptionColumns.push(index);
        break;
      case 'withdrawal':
        result.withdrawalColumns.push(index);
        break;
      case 'deposit':
        result.depositColumns.push(index);
        break;
      case 'balance':
        result.balanceColumns.push(index);
        break;
      case 'reference':
        result.referenceColumns.push(index);
        break;
    }
  });

  return result;
}

/**
 * Auto-detect date format from sample values
 */
export function detectDateFormat(dateString: string): string | null {
  if (!dateString) return null;
  
  const patterns = [
    { regex: /^\d{4}-\d{2}-\d{2}$/, format: 'YYYY-MM-DD' },
    { regex: /^\d{2}\/\d{2}\/\d{4}$/, format: 'DD/MM/YYYY' },
    { regex: /^\d{2}-\d{2}-\d{4}$/, format: 'DD-MM-YYYY' },
    { regex: /^\d{2}\.\d{2}\.\d{4}$/, format: 'DD.MM.YYYY' },
    { regex: /^\d{2} [A-Za-z]{3} \d{4}$/, format: 'DD MMM YYYY' },
    { regex: /^\d{2}\/[A-Za-z]{3}\/\d{4}$/, format: 'DD/MMM/YYYY' },
    { regex: /^\d{1,2}\/\d{1,2}\/\d{2,4}$/, format: 'M/D/YYYY' }
  ];

  for (const { regex, format } of patterns) {
    if (regex.test(dateString.trim())) {
      return format;
    }
  }

  return null;
}

/**
 * Convert various date formats to ISO format (YYYY-MM-DD)
 */
export function normalizeDate(dateString: string): string {
  if (!dateString) return '';
  
  const cleaned = dateString.trim();
  
  // Already ISO
  if (/^\d{4}-\d{2}-\d{2}$/.test(cleaned)) {
    return cleaned;
  }
  
  // DD/MM/YYYY or DD-MM-YYYY
  if (/^\d{2}[/-]\d{2}[/-]\d{4}$/.test(cleaned)) {
    const parts = cleaned.split(/[/-]/);
    return `${parts[2]}-${parts[1]}-${parts[0]}`;
  }
  
  // DD MMM YYYY or DD/MMM/YYYY
  if (/^\d{2}[\s/][A-Za-z]{3}[\s/]\d{4}$/.test(cleaned)) {
    const monthMap: { [key: string]: string } = {
      'jan': '01', 'feb': '02', 'mar': '03', 'apr': '04', 'may': '05', 'jun': '06',
      'jul': '07', 'aug': '08', 'sep': '09', 'oct': '10', 'nov': '11', 'dec': '12'
    };
    const parts = cleaned.split(/[\s/]/);
    const month = monthMap[parts[1].toLowerCase()] || '01';
    return `${parts[2]}-${month}-${parts[0]}`;
  }
  
  // M/D/YYYY (American format)
  if (/^\d{1,2}\/\d{1,2}\/\d{2,4}$/.test(cleaned)) {
    const parts = cleaned.split('/');
    const year = parts[2].length === 2 ? `20${parts[2]}` : parts[2];
    const month = parts[0].padStart(2, '0');
    const day = parts[1].padStart(2, '0');
    return `${year}-${month}-${day}`;
  }
  
  return cleaned; // Return as-is if can't parse
}

/**
 * Normalize amount to number
 */
export function normalizeAmount(amountString: string): number {
  if (!amountString) return 0;
  
  // Remove currency symbols, commas, and spaces
  const cleaned = amountString
    .toString()
    .replace(/[₹$,\s]/g, '')
    .replace(/[()]/g, '') // Remove parentheses
    .trim();
  
  const num = parseFloat(cleaned);
  return isNaN(num) ? 0 : Math.abs(num);
}

/**
 * Normalize description text for comparison
 */
export function normalizeDescription(text: string): string {
  if (!text) return '';
  
  return text
    .toLowerCase()
    .trim()
    .replace(/\s+/g, ' ') // Normalize spaces
    .replace(/[^\w\s]/g, ''); // Remove special characters
}

/**
 * Auto-map columns between two files
 */
export function autoMapColumns(
  inputHeaders: string[],
  outputHeaders: string[]
): { inputIndex: number; outputIndex: number; type: string; confidence: number }[] {
  const mappings: { inputIndex: number; outputIndex: number; type: string; confidence: number }[] = [];
  
  const inputTypes = detectColumnTypes(inputHeaders);
  const outputTypes = detectColumnTypes(outputHeaders);
  
  // Map date columns
  if (inputTypes.dateColumns.length > 0 && outputTypes.dateColumns.length > 0) {
    mappings.push({
      inputIndex: inputTypes.dateColumns[0],
      outputIndex: outputTypes.dateColumns[0],
      type: 'date',
      confidence: 1.0
    });
  }
  
  // Map amount columns (prefer withdrawal/deposit, fallback to amount)
  const inputAmountCol = inputTypes.withdrawalColumns[0] ?? inputTypes.depositColumns[0] ?? inputTypes.amountColumns[0];
  const outputAmountCol = outputTypes.withdrawalColumns[0] ?? outputTypes.depositColumns[0] ?? outputTypes.amountColumns[0];
  
  if (inputAmountCol !== undefined && outputAmountCol !== undefined) {
    mappings.push({
      inputIndex: inputAmountCol,
      outputIndex: outputAmountCol,
      type: 'amount',
      confidence: 0.9
    });
  }
  
  // Map description columns
  if (inputTypes.descriptionColumns.length > 0 && outputTypes.descriptionColumns.length > 0) {
    mappings.push({
      inputIndex: inputTypes.descriptionColumns[0],
      outputIndex: outputTypes.descriptionColumns[0],
      type: 'description',
      confidence: 0.8
    });
  }
  
  // Map reference columns
  if (inputTypes.referenceColumns.length > 0 && outputTypes.referenceColumns.length > 0) {
    mappings.push({
      inputIndex: inputTypes.referenceColumns[0],
      outputIndex: outputTypes.referenceColumns[0],
      type: 'reference',
      confidence: 0.7
    });
  }
  
  return mappings;
}

/**
 * Calculate similarity between two rows using mapped columns
 */
export function calculateRowSimilarity(
  row1: string[],
  row2: string[],
  mappings: { inputIndex: number; outputIndex: number; type: string; confidence: number }[]
): number {
  if (mappings.length === 0) return 0;
  
  let totalScore = 0;
  let totalWeight = 0;
  
  for (const mapping of mappings) {
    const val1 = row1[mapping.inputIndex] || '';
    const val2 = row2[mapping.outputIndex] || '';
    
    let similarity = 0;
    
    switch (mapping.type) {
      case 'date':
        const date1 = normalizeDate(val1);
        const date2 = normalizeDate(val2);
        similarity = date1 === date2 ? 1.0 : 0.0;
        break;
        
      case 'amount':
        const amt1 = normalizeAmount(val1);
        const amt2 = normalizeAmount(val2);
        const diff = Math.abs(amt1 - amt2);
        const avg = (amt1 + amt2) / 2;
        similarity = avg > 0 ? Math.max(0, 1 - (diff / avg)) : (amt1 === amt2 ? 1.0 : 0.0);
        break;
        
      case 'description':
      case 'reference':
        const norm1 = normalizeDescription(val1);
        const norm2 = normalizeDescription(val2);
        if (norm1 === norm2) {
          similarity = 1.0;
        } else if (norm1.includes(norm2) || norm2.includes(norm1)) {
          similarity = 0.8;
        } else {
          // Levenshtein-like fuzzy match
          const maxLen = Math.max(norm1.length, norm2.length);
          if (maxLen === 0) {
            similarity = 0;
          } else {
            let matches = 0;
            for (let i = 0; i < Math.min(norm1.length, norm2.length); i++) {
              if (norm1[i] === norm2[i]) matches++;
            }
            similarity = matches / maxLen;
          }
        }
        break;
        
      default:
        similarity = val1 === val2 ? 1.0 : 0.0;
    }
    
    totalScore += similarity * mapping.confidence;
    totalWeight += mapping.confidence;
  }
  
  return totalWeight > 0 ? totalScore / totalWeight : 0;
}

/**
 * Smart auto-match between two CSV files
 */
export function smartAutoMatch(
  file1: { headers: string[]; rows: string[][] },
  file2: { headers: string[]; rows: string[][] },
  similarityThreshold: number = 0.7
): {
  matches: { file1RowIndex: number; file2RowIndex: number; similarity: number }[];
  unmatchedFile1: number[];
  unmatchedFile2: number[];
  columnMappings: { inputIndex: number; outputIndex: number; type: string; confidence: number }[];
} {
  // Auto-map columns
  const columnMappings = autoMapColumns(file1.headers, file2.headers);
  
  if (columnMappings.length === 0) {
    return {
      matches: [],
      unmatchedFile1: file1.rows.map((_, i) => i),
      unmatchedFile2: file2.rows.map((_, i) => i),
      columnMappings: []
    };
  }
  
  const matches: { file1RowIndex: number; file2RowIndex: number; similarity: number }[] = [];
  const usedFile2Indices = new Set<number>();
  const unmatchedFile1: number[] = [];
  
  // For each row in file1, find best match in file2
  for (let i = 0; i < file1.rows.length; i++) {
    const row1 = file1.rows[i];
    let bestMatch: { index: number; similarity: number } | null = null;
    
    for (let j = 0; j < file2.rows.length; j++) {
      if (usedFile2Indices.has(j)) continue;
      
      const row2 = file2.rows[j];
      const similarity = calculateRowSimilarity(row1, row2, columnMappings);
      
      if (similarity >= similarityThreshold) {
        if (!bestMatch || similarity > bestMatch.similarity) {
          bestMatch = { index: j, similarity };
        }
      }
    }
    
    if (bestMatch) {
      matches.push({
        file1RowIndex: i,
        file2RowIndex: bestMatch.index,
        similarity: bestMatch.similarity
      });
      usedFile2Indices.add(bestMatch.index);
    } else {
      unmatchedFile1.push(i);
    }
  }
  
  // Find unmatched rows in file2
  const unmatchedFile2: number[] = [];
  for (let i = 0; i < file2.rows.length; i++) {
    if (!usedFile2Indices.has(i)) {
      unmatchedFile2.push(i);
    }
  }
  
  return {
    matches,
    unmatchedFile1,
    unmatchedFile2,
    columnMappings
  };
}

/**
 * Format match results for display
 */
export function formatMatchResults(
  file1: { headers: string[]; rows: string[][]; fileName: string },
  file2: { headers: string[]; rows: string[][]; fileName: string },
  matchResults: {
    matches: { file1RowIndex: number; file2RowIndex: number; similarity: number }[];
    unmatchedFile1: number[];
    unmatchedFile2: number[];
    columnMappings: { inputIndex: number; outputIndex: number; type: string; confidence: number }[];
  }
) {
  return {
    summary: {
      totalFile1Rows: file1.rows.length,
      totalFile2Rows: file2.rows.length,
      matchedRows: matchResults.matches.length,
      unmatchedFile1Rows: matchResults.unmatchedFile1.length,
      unmatchedFile2Rows: matchResults.unmatchedFile2.length,
      matchRate: file1.rows.length > 0 
        ? ((matchResults.matches.length / file1.rows.length) * 100).toFixed(2) + '%'
        : '0%',
      averageSimilarity: matchResults.matches.length > 0
        ? (matchResults.matches.reduce((sum, m) => sum + m.similarity, 0) / matchResults.matches.length * 100).toFixed(2) + '%'
        : '0%'
    },
    columnMappings: matchResults.columnMappings.map(m => ({
      file1Header: file1.headers[m.inputIndex],
      file2Header: file2.headers[m.outputIndex],
      type: m.type,
      confidence: (m.confidence * 100).toFixed(0) + '%'
    })),
    matches: matchResults.matches.map(m => ({
      file1Row: file1.rows[m.file1RowIndex],
      file2Row: file2.rows[m.file2RowIndex],
      similarity: (m.similarity * 100).toFixed(2) + '%',
      file1RowIndex: m.file1RowIndex,
      file2RowIndex: m.file2RowIndex
    })),
    unmatchedFile1: matchResults.unmatchedFile1.map(index => ({
      row: file1.rows[index],
      rowIndex: index,
      fileName: file1.fileName
    })),
    unmatchedFile2: matchResults.unmatchedFile2.map(index => ({
      row: file2.rows[index],
      rowIndex: index,
      fileName: file2.fileName
    }))
  };
}

/**
 * Extract key field values from a row based on detected columns
 */
export function extractKeyFields(
  row: string[],
  headers: string[]
): {
  date: string;
  amount: number;
  description: string;
  reference: string;
} {
  const types = detectColumnTypes(headers);
  
  return {
    date: types.dateColumns.length > 0 ? normalizeDate(row[types.dateColumns[0]]) : '',
    amount: types.amountColumns.length > 0 
      ? normalizeAmount(row[types.amountColumns[0]])
      : (types.withdrawalColumns.length > 0 
          ? normalizeAmount(row[types.withdrawalColumns[0]])
          : (types.depositColumns.length > 0 
              ? normalizeAmount(row[types.depositColumns[0]])
              : 0)),
    description: types.descriptionColumns.length > 0 ? normalizeDescription(row[types.descriptionColumns[0]]) : '',
    reference: types.referenceColumns.length > 0 ? row[types.referenceColumns[0]] : ''
  };
}

