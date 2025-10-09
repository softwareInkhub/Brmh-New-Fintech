'use client';

import React, { useState, useRef } from 'react';
import { FiUpload, FiDownload, FiFileText, FiCheckCircle, FiXCircle, FiAlertCircle, FiBarChart, FiTrendingUp } from 'react-icons/fi';

interface CSVData {
  headers: string[];
  rows: string[][];
  fileName: string;
  mapping?: unknown;
  conditions?: unknown;
}

interface MatchResult {
  inputRow: string[];
  outputRow: string[] | null;
  isMatch: boolean;
  matchType: 'exact' | 'partial' | 'no-match';
  differences: string[];
  inputRowIndex: number;
  outputRowIndex: number | null;
}

interface ComparisonSummary {
  totalInputRows: number;
  totalOutputRows: number;
  exactMatches: number;
  partialMatches: number;
  inputOnlyRows: number;
  outputOnlyRows: number;
  noMatches: number;
}

export default function FileMatchingPage() {
  const [inputFile, setInputFile] = useState<CSVData | null>(null);
  const [outputFile, setOutputFile] = useState<CSVData | null>(null);
  const [matchResults, setMatchResults] = useState<MatchResult[]>([]);
  const [comparisonSummary, setComparisonSummary] = useState<ComparisonSummary | null>(null);
  const [outputOnlyRows, setOutputOnlyRows] = useState<string[][]>([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [activeMainTab, setActiveMainTab] = useState<'upload' | 'results'>('upload');
  const [activeTablesTab, setActiveTablesTab] = useState<'input' | 'output' | 'sideBySide'>('sideBySide');
  const [activeView, setActiveView] = useState<'analysis' | 'tables'>('analysis');
  const [showDifferencesByRow, setShowDifferencesByRow] = useState<Record<number, boolean>>({});
  const [showConfigStep, setShowConfigStep] = useState(false);
  const [selectedInputColumns, setSelectedInputColumns] = useState<Set<number>>(new Set());
  const [selectedOutputColumns, setSelectedOutputColumns] = useState<Set<number>>(new Set());
  const [inputRowRange, setInputRowRange] = useState<{start: number, end: number}>({start: 0, end: 0});
  const [outputRowRange, setOutputRowRange] = useState<{start: number, end: number}>({start: 0, end: 0});
  const [inputRowsToShow, setInputRowsToShow] = useState(20);
  const [outputRowsToShow, setOutputRowsToShow] = useState(20);
  const [inputDelimiter] = useState(',');
  const [outputDelimiter] = useState(',');
  const [inputSkipRows] = useState(0);
  const [outputSkipRows] = useState(0);
  const [showInputDelimitModal, setShowInputDelimitModal] = useState(false);
  const [showOutputDelimitModal, setShowOutputDelimitModal] = useState(false);
  const [selectedDelimitColumn, setSelectedDelimitColumn] = useState('');
  const [delimitChar, setDelimitChar] = useState('');
  const [newColumnNames, setNewColumnNames] = useState('');
  const [delimitPreview, setDelimitPreview] = useState<Array<{original: string, split: string[], newColumns: string[]}>>([]);
  const [inputHeaderRow, setInputHeaderRow] = useState(0);
  const [outputHeaderRow, setOutputHeaderRow] = useState(0);
  const [originalInputFile, setOriginalInputFile] = useState<File | null>(null);
  const [originalOutputFile, setOriginalOutputFile] = useState<File | null>(null);
  
  // Header Set Modal states
  const [showHeaderSetModal, setShowHeaderSetModal] = useState(false);
  const [headerSetFileType, setHeaderSetFileType] = useState<'input' | 'output'>('input');
  const [superBankHeaders, setSuperBankHeaders] = useState<Array<{id?: string, bankId?: string, header?: unknown}>>([]);
  const [loadingHeaders, setLoadingHeaders] = useState(false);
  
  // Mapping Modal states
  const [showMappingModal, setShowMappingModal] = useState(false);
  const [mappingFileType, setMappingFileType] = useState<'input' | 'output'>('input');
  const [allBankMappings, setAllBankMappings] = useState<Array<{id?: string, bankId?: string, header?: unknown, conditions?: unknown, mapping?: unknown}>>([]);
  const [loadingMappings, setLoadingMappings] = useState(false);
  const [showBankDetails, setShowBankDetails] = useState(false);
  const [selectedBankDetails, setSelectedBankDetails] = useState<{id?: string, bankId?: string, header?: unknown, conditions?: unknown, mapping?: unknown} | null>(null);
  
  const inputFileRef = useRef<HTMLInputElement>(null);
  const outputFileRef = useRef<HTMLInputElement>(null);

  // Type guard for unknown arrays
  const isArray = (value: unknown): value is unknown[] => Array.isArray(value);
  
  // Helper function to check if header is valid array
  const isValidHeaderArray = (header: unknown): header is unknown[] => {
    return header !== null && header !== undefined && Array.isArray(header);
  };
  
  // Helper function to check if conditions exist
  const hasConditions = (conditions: unknown): boolean => {
    return conditions !== null && conditions !== undefined;
  };
  
  // Helper function to check if we should render conditions
  const shouldRenderConditions = (): boolean => {
    return Boolean(selectedBankDetails && hasConditions(selectedBankDetails.conditions));
  };
  
  // Render function for conditions section
  const renderConditionsSection = (): React.ReactElement | null => {
    if (!selectedBankDetails || !hasConditions(selectedBankDetails.conditions)) return null;
    return (
      <div>
        <h4 className="text-lg font-medium text-gray-800 mb-3">Advanced Field Conditions</h4>
        <div className="space-y-3">
          {isArray(selectedBankDetails.conditions) ? (
            (selectedBankDetails.conditions as unknown[]).map((condition: unknown, index: number) => (
              <div key={index} className="bg-gray-50 p-4 rounded-lg border">
                <div className="flex items-center gap-2 text-sm">
                  <span className="text-gray-600">If</span>
                  <span className="px-2 py-1 bg-blue-100 text-blue-800 rounded font-medium">
                    {typeof condition === 'object' && condition !== null && 'if' in condition && typeof (condition as Record<string, unknown>).if === 'object' && (condition as Record<string, unknown>).if !== null && 'field' in ((condition as Record<string, unknown>).if as Record<string, unknown>) ? String(((condition as Record<string, unknown>).if as Record<string, unknown>).field) : 'Field'}
                  </span>
                  <span className="text-gray-600">
                    {typeof condition === 'object' && condition !== null && 'if' in condition && typeof (condition as Record<string, unknown>).if === 'object' && (condition as Record<string, unknown>).if !== null && 'op' in ((condition as Record<string, unknown>).if as Record<string, unknown>) && ((condition as Record<string, unknown>).if as Record<string, unknown>).op === 'present' ? 'is present' : typeof condition === 'object' && condition !== null && 'if' in condition && typeof (condition as Record<string, unknown>).if === 'object' && (condition as Record<string, unknown>).if !== null && 'op' in ((condition as Record<string, unknown>).if as Record<string, unknown>) ? String(((condition as Record<string, unknown>).if as Record<string, unknown>).op) : 'operator'}
                  </span>
                  <span className="text-gray-600">then</span>
                  <span className="px-2 py-1 bg-green-100 text-green-800 rounded font-medium">
                    {typeof condition === 'object' && condition !== null && 'then' in condition && typeof (condition as Record<string, unknown>).then === 'object' && (condition as Record<string, unknown>).then !== null ? Object.keys((condition as Record<string, unknown>).then as Record<string, unknown>)[0] || 'Target Field' : 'Target Field'}
                  </span>
                  <span className="text-gray-600">=</span>
                  <span className="px-2 py-1 bg-yellow-100 text-yellow-800 rounded font-medium">
                    {typeof condition === 'object' && condition !== null && 'then' in condition && typeof (condition as Record<string, unknown>).then === 'object' && (condition as Record<string, unknown>).then !== null ? String(Object.values((condition as Record<string, unknown>).then as Record<string, unknown>)[0] || 'Value') : 'Value'}
                  </span>
                </div>
              </div>
            ))
          ) : (
            <div className="bg-gray-50 p-4 rounded-lg border">
              <div className="text-sm text-gray-600">
                {typeof selectedBankDetails!.conditions === 'string' ? 
                  selectedBankDetails!.conditions : 
                  'Custom conditions defined'
                }
              </div>
            </div>
          )}
        </div>
      </div>
    );
  };

  const parseCSV = (file: File, delimiter: string = ',', skipRows: number = 0, headerRow: number = 0): Promise<CSVData> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = (e) => {
        try {
          const text = e.target?.result as string;
          const lines = text.split('\n').filter(line => line.trim());
          
          if (lines.length === 0) {
            reject(new Error('File is empty'));
            return;
          }

          // Skip rows if specified
          const dataLines = lines.slice(skipRows);
          
          if (dataLines.length === 0) {
            reject(new Error('No data after skipping rows'));
            return;
          }

          // Improved CSV parsing to handle quoted fields with custom delimiter
          const parseCSVLine = (line: string, delim: string): string[] => {
            const result: string[] = [];
            let current = '';
            let inQuotes = false;
            
            for (let i = 0; i < line.length; i++) {
              const char = line[i];
              
              if (char === '"') {
                if (inQuotes && line[i + 1] === '"') {
                  // Escaped quote
                  current += '"';
                  i++; // Skip next quote
                } else {
                  inQuotes = !inQuotes;
                }
              } else if (char === delim && !inQuotes) {
                result.push(current.trim());
                current = '';
              } else {
                current += char;
              }
            }
            
            result.push(current.trim());
            return result;
          };

            // Use the specified header row (relative to dataLines)
            const actualHeaderRow = Math.min(headerRow, dataLines.length - 1);
            const headers = parseCSVLine(dataLines[actualHeaderRow], delimiter);
            
            // Data rows start after the header row
            const dataStartIndex = actualHeaderRow + 1;
            const rows = dataLines.slice(dataStartIndex).map(line => parseCSVLine(line, delimiter));

          resolve({
            headers,
            rows,
            fileName: file.name
          });
        } catch {
          reject(new Error('Failed to parse CSV file'));
        }
      };
      reader.onerror = () => reject(new Error('Failed to read file'));
      reader.readAsText(file);
    });
  };

  const handleFileUpload = async (file: File, type: 'input' | 'output') => {
    try {
      setError(null);
      const delimiter = type === 'input' ? inputDelimiter : outputDelimiter;
      const skipRows = type === 'input' ? inputSkipRows : outputSkipRows;
      const headerRow = type === 'input' ? inputHeaderRow : outputHeaderRow;
      const csvData = await parseCSV(file, delimiter, skipRows, headerRow);
      
      if (type === 'input') {
        setInputFile(csvData);
        setOriginalInputFile(file);
        // Initialize with all columns selected and full row range
        setSelectedInputColumns(new Set(csvData.headers.map((_, i) => i)));
        setInputRowRange({start: 0, end: csvData.rows.length - 1});
      } else {
        setOutputFile(csvData);
        setOriginalOutputFile(file);
        // Initialize with all columns selected and full row range
        setSelectedOutputColumns(new Set(csvData.headers.map((_, i) => i)));
        setOutputRowRange({start: 0, end: csvData.rows.length - 1});
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to upload file');
    }
  };

  const reprocessFile = async (type: 'input' | 'output') => {
    try {
      if (type === 'input' && originalInputFile) {
        await handleFileUpload(originalInputFile, 'input');
      } else if (type === 'output' && originalOutputFile) {
        await handleFileUpload(originalOutputFile, 'output');
      } else {
        // Fallback to file input if original file is not available
        if (type === 'input' && inputFileRef.current?.files?.[0]) {
          await handleFileUpload(inputFileRef.current.files[0], 'input');
        } else if (type === 'output' && outputFileRef.current?.files?.[0]) {
          await handleFileUpload(outputFileRef.current.files[0], 'output');
        }
      }
    } catch (err) {
      console.error('Error reprocessing file:', err);
    }
  };

  const findBestHeaderRow = async (type: 'input' | 'output') => {
    const file = type === 'input' ? originalInputFile : originalOutputFile;
    if (!file) return;

    try {
      const delimiter = type === 'input' ? inputDelimiter : outputDelimiter;
      const skipRows = type === 'input' ? inputSkipRows : outputSkipRows;
      
      // Parse the file to get raw lines
      const text = await new Promise<string>((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = (e) => resolve(e.target?.result as string);
        reader.onerror = () => reject(new Error('Failed to read file'));
        reader.readAsText(file);
      });

      const lines = text.split('\n').filter(line => line.trim());
      const dataLines = lines.slice(skipRows);
      
      // Look for the best header row
      let bestHeaderRow = 0;
      let bestScore = 0;
      
      for (let i = 0; i < Math.min(10, dataLines.length); i++) {
        const line = dataLines[i];
        const parsed = line.split(delimiter);
        
        // Score based on common header words
        const headerWords = ['date', 'narration', 'description', 'amount', 'balance', 'reference', 'chq', 'ref', 'value', 'withdrawal', 'deposit', 'credit', 'debit'];
        const score = parsed.reduce((acc, cell) => {
          const cellLower = cell.toLowerCase().trim();
          return acc + headerWords.filter(word => cellLower.includes(word)).length;
        }, 0);
        
        if (score > bestScore) {
          bestScore = score;
          bestHeaderRow = i;
        }
      }
      
      // Update the header row
      if (type === 'input') {
        setInputHeaderRow(bestHeaderRow);
      } else {
        setOutputHeaderRow(bestHeaderRow);
      }
      
      // Reprocess the file with the new header row
      await handleFileUpload(file, type);
      
    } catch {
      setError('Failed to find header row');
    }
  };

  const openDelimitModal = (type: 'input' | 'output') => {
    setSelectedDelimitColumn('');
    setDelimitChar('');
    setNewColumnNames('');
    setDelimitPreview([]);
    if (type === 'input') {
      setShowInputDelimitModal(true);
    } else {
      setShowOutputDelimitModal(true);
    }
  };

  // Fetch Super Bank headers from bank-header table
  const fetchSuperBankHeaders = async () => {
    setLoadingHeaders(true);
    try {
      // Try different variations of Super Bank name
      const possibleNames = ['SUPER BANK', 'Super Bank', 'super bank', 'SUPERBANK', 'SuperBank'];
      let superBankData = null;
      
      for (const bankName of possibleNames) {
        const response = await fetch(`/api/bank-header?bankName=${encodeURIComponent(bankName)}`);
        if (response.ok) {
          const data = await response.json();
          if (data && data.id) {
            superBankData = data;
            console.log('Found Super Bank data with name:', bankName);
            break;
          }
        }
      }
      
      if (superBankData) {
        setSuperBankHeaders([superBankData]);
      } else {
        console.log('No Super Bank headers found. Available bank names might be different.');
        setSuperBankHeaders([]);
      }
    } catch (error) {
      console.error('Error fetching Super Bank headers:', error);
      setSuperBankHeaders([]);
    } finally {
      setLoadingHeaders(false);
    }
  };

  // Open header set modal
  const openHeaderSetModal = (fileType: 'input' | 'output') => {
    setHeaderSetFileType(fileType);
    setShowHeaderSetModal(true);
    fetchSuperBankHeaders();
  };

  // Apply selected Super Bank header to file
  const applySuperBankHeader = (bankHeader: {id?: string, bankId?: string, header?: unknown}) => {
    try {
      console.log('Applying Super Bank header:', bankHeader);
      
      // Parse the header from the bank-header data
      let headers: string[] = [];
      
      if (bankHeader.header && Array.isArray(bankHeader.header)) {
        // Handle DynamoDB format
        headers = bankHeader.header.map((item: unknown) => {
          // Try different possible formats
          if (typeof item === 'string') {
            return item;
          }
          if (typeof item === 'object' && item !== null) {
            const obj = item as Record<string, unknown>;
            if (typeof obj.S === 'string') {
              return obj.S;
            }
            if (typeof obj.M === 'object' && obj.M !== null) {
              const m = obj.M as Record<string, unknown>;
              if (typeof m.name === 'object' && m.name !== null) {
                const name = m.name as Record<string, unknown>;
                if (typeof name.S === 'string') {
                  return name.S;
                }
              }
            }
            if (typeof obj.name === 'string') {
              return obj.name;
            }
          }
          return '';
        }).filter((header: string) => header && header.trim() !== '');
      }
      
      console.log('Parsed Super Bank headers:', headers);
      
      if (headers.length === 0) {
        alert('No valid headers found in this Super Bank configuration. Please check the bank-header data structure.');
        return;
      }
      
      // Apply headers to the current file data
      const currentFile = headerSetFileType === 'input' ? inputFile : outputFile;
      if (!currentFile || !currentFile.rows) {
        alert('No file data available to apply headers to');
        return;
      }
      
      // Create new data with the Super Bank headers
      const newFile = {
        ...currentFile,
        headers: headers
      };
      
      if (headerSetFileType === 'input') {
        setInputFile(newFile);
        setSelectedInputColumns(new Set(headers.map((_, i) => i)));
      } else {
        setOutputFile(newFile);
        setSelectedOutputColumns(new Set(headers.map((_, i) => i)));
      }
      
      // Close modal
      setShowHeaderSetModal(false);
      
    } catch (error) {
      console.error('Error applying Super Bank header:', error);
      alert('Error applying Super Bank header: ' + (error instanceof Error ? error.message : String(error)));
    }
  };

  // Fetch all bank mappings from bank-header table
  const fetchAllBankMappings = async () => {
    setLoadingMappings(true);
    try {
      // First, let's try to get all bank headers by scanning the table directly
      const response = await fetch('/api/bank-header?getAll=true');
      if (response.ok) {
        const data = await response.json();
        setAllBankMappings(data.items || []);
        console.log('Found bank mappings:', data.items?.length || 0);
      } else {
        // Fallback: try to get some common bank headers
        const commonBanks = ['HDFC', 'ICICI', 'SBI', 'AXIS', 'KOTAK', 'SUPER BANK', 'Super Bank', 'super bank', 'SUPERBANK', 'SuperBank'];
        const bankPromises = commonBanks.map(bankName => 
          fetch(`/api/bank-header?bankName=${encodeURIComponent(bankName)}`)
            .then(res => res.ok ? res.json() : null)
            .catch(() => null)
        );
        
        const results = await Promise.all(bankPromises);
        const validBanks = results.filter(bank => bank !== null);
        setAllBankMappings(validBanks);
        console.log('Found bank mappings via fallback:', validBanks.length);
      }
    } catch (error) {
      console.error('Error fetching bank mappings:', error);
      setAllBankMappings([]);
    } finally {
      setLoadingMappings(false);
    }
  };

  // Open mapping modal
  const openMappingModal = (fileType: 'input' | 'output') => {
    setMappingFileType(fileType);
    setShowMappingModal(true);
    setShowBankDetails(false);
    setSelectedBankDetails(null);
    fetchAllBankMappings();
  };

  // Show bank details within the modal
  const showBankDetailsView = (bank: {id?: string, bankId?: string, header?: unknown, conditions?: unknown, mapping?: unknown}) => {
    setSelectedBankDetails(bank);
    setShowBankDetails(true);
  };

  // Go back to bank list
  const goBackToBankList = () => {
    setShowBankDetails(false);
    setSelectedBankDetails(null);
  };

  // Clear/reset file to original state
  const clearFileToOriginal = (fileType: 'input' | 'output') => {
    try {
      if (fileType === 'input' && originalInputFile) {
        // Reset input file to original state
        parseCSV(originalInputFile, ',', 0, 0).then((parsedData) => {
          setInputFile(parsedData);
          setSelectedInputColumns(new Set(parsedData.headers.map((_, i) => i)));
          setInputHeaderRow(0);
          setInputRowRange({ start: 0, end: Math.min(19, parsedData.rows.length - 1) });
        });
      } else if (fileType === 'output' && originalOutputFile) {
        // Reset output file to original state
        parseCSV(originalOutputFile, ',', 0, 0).then((parsedData) => {
          setOutputFile(parsedData);
          setSelectedOutputColumns(new Set(parsedData.headers.map((_, i) => i)));
          setOutputHeaderRow(0);
          setOutputRowRange({ start: 0, end: Math.min(19, parsedData.rows.length - 1) });
        });
      }
    } catch (error) {
      console.error('Error clearing file to original state:', error);
      alert('Error resetting file to original state');
    }
  };

  // Slice file to keep only selected rows
  const sliceFile = (fileType: 'input' | 'output') => {
    try {
      if (fileType === 'input' && inputFile) {
        const rowRange = inputRowRange;
        if (rowRange.start === 0 && rowRange.end === 0) {
          alert('Please select rows to slice first');
          return;
        }
        
        const slicedRows = inputFile.rows.slice(rowRange.start, rowRange.end + 1);
        const updatedFile = {
          ...inputFile,
          rows: slicedRows
        };
        setInputFile(updatedFile);
        setInputRowRange({ start: 0, end: slicedRows.length - 1 });
        alert(`Sliced to rows ${rowRange.start}-${rowRange.end}. File now has ${slicedRows.length} rows.`);
      } else if (fileType === 'output' && outputFile) {
        const rowRange = outputRowRange;
        if (rowRange.start === 0 && rowRange.end === 0) {
          alert('Please select rows to slice first');
          return;
        }
        
        const slicedRows = outputFile.rows.slice(rowRange.start, rowRange.end + 1);
        const updatedFile = {
          ...outputFile,
          rows: slicedRows
        };
        setOutputFile(updatedFile);
        setOutputRowRange({ start: 0, end: slicedRows.length - 1 });
        alert(`Sliced to rows ${rowRange.start}-${rowRange.end}. File now has ${slicedRows.length} rows.`);
      }
    } catch (error) {
      console.error('Error slicing file:', error);
      alert('Error slicing file');
    }
  };

  // Apply selected bank mapping to file (preserve existing headers, remap row values, and apply conditions)
  const applyBankMapping = (bankMapping: {id?: string, bankId?: string, header?: unknown, conditions?: unknown, mapping?: unknown}) => {
    try {
      console.log('Applying bank mapping:', bankMapping);
      
      // Parse the conditions and mapping from the bank-header data
      let conditions: unknown = null;
      let mapping: unknown = null;
      let sourceHeaders: string[] = [];
      
      // Parse conditions
      if (bankMapping.conditions) {
        conditions = bankMapping.conditions;
      }
      
      // Parse mapping
      if (bankMapping.mapping) {
        mapping = bankMapping.mapping;
      }
      // Parse source headers (the bank's native headers) to extract values from rows
      if (Array.isArray(bankMapping.header)) {
        sourceHeaders = bankMapping.header.map((item: unknown) => {
          if (typeof item === 'string') return item;
          if (typeof item === 'object' && item !== null) {
            const obj = item as Record<string, unknown>;
            if (typeof obj.S === 'string') return obj.S;
            if (typeof obj.M === 'object' && obj.M !== null) {
              const m = obj.M as Record<string, unknown>;
              if (typeof m.name === 'object' && m.name !== null) {
                const name = m.name as Record<string, unknown>;
                if (typeof name.S === 'string') return name.S;
              }
            }
            if (typeof obj.name === 'string') return obj.name;
          }
          return '';
        }).filter(Boolean);
      }
      
      console.log('Parsed bank mapping data:', { conditions, mapping, sourceHeaders });
      
      // Apply only mapping and conditions to the current file data (preserve existing headers)
      const currentFile = mappingFileType === 'input' ? inputFile : outputFile;
      if (!currentFile || !currentFile.rows) {
        alert('No file data available to apply mapping to');
        return;
      }
      
      // If we have source headers, remap each row so that current headers (likely Super Bank) pull values
      // from their mapped source columns in the original bank layout. We DO NOT change headers.
      let remappedRows = currentFile.rows;
      if (sourceHeaders.length > 0) {
        const targetHeaders = currentFile.headers; // preserved (e.g., Super Bank)
        remappedRows = currentFile.rows.map((row, index) => {
          // Skip the header row (index 0) - keep it as is
          if (index === 0) {
            return row;
          }
          const newRow: string[] = new Array(targetHeaders.length).fill('');
          for (let i = 0; i < targetHeaders.length; i++) {
            const targetHeader = targetHeaders[i];
            // Special handling for bankName - use the bank's name/ID instead of mapping to a column
            if (targetHeader.toLowerCase().trim() === 'bankname') {
              newRow[i] = (bankMapping?.id || bankMapping?.bankId || 'Unknown Bank').toString();
            } else {
              // Determine which source header contains the value for this targetHeader
              const mappedSource = mapping && typeof mapping === 'object' && mapping !== null && targetHeader in mapping ? (mapping as Record<string, unknown>)[targetHeader] : targetHeader;
              const sourceIndex = sourceHeaders.findIndex(
                (h) => h && h.toString().toLowerCase().trim() === String(mappedSource).toLowerCase().trim()
              );
              let value = sourceIndex >= 0 ? (row[sourceIndex] ?? '') : '';
              
              // Special handling for Amount column - fill empty values with Deposit Amt.
              if (targetHeader.toLowerCase().trim() === 'amount' && (!value || value.trim() === '')) {
                const depositAmtIndex = sourceHeaders.findIndex(
                  (h) => h && h.toString().toLowerCase().includes('deposit')
                );
                if (depositAmtIndex >= 0) {
                  const depositValue = row[depositAmtIndex] ?? '';
                  if (depositValue && depositValue.trim() !== '') {
                    value = depositValue;
                    // Mark this row as using deposit amount for Dr./Cr. handling
                    (row as string[] & {__usedDepositAmount?: boolean}).__usedDepositAmount = true;
                  }
                }
              }
              
              // Special handling for Dr./Cr. column - set to CR if we used deposit amount
              if (targetHeader.toLowerCase().trim() === 'dr./cr.' && (!value || value.trim() === '')) {
                if ((row as string[] & {__usedDepositAmount?: boolean}).__usedDepositAmount) {
                  value = 'CR';
                } else {
                  // Check if there's a withdrawal amount to set as DR
                  const withdrawalAmtIndex = sourceHeaders.findIndex(
                    (h) => h && h.toString().toLowerCase().includes('withdrawal')
                  );
                  if (withdrawalAmtIndex >= 0) {
                    const withdrawalValue = row[withdrawalAmtIndex] ?? '';
                    if (withdrawalValue && withdrawalValue.trim() !== '') {
                      value = 'DR';
                    }
                  }
                }
              }
              
              newRow[i] = value;
            }
          }
          return newRow;
        });
      }

      // Create new data with existing headers but new mapping, conditions, and remapped rows for display
      const newFile = {
        ...currentFile,
        rows: remappedRows,
        conditions: conditions,
        mapping: mapping
      } as CSVData;
      
      if (mappingFileType === 'input') {
        setInputFile(newFile);
      } else {
        setOutputFile(newFile);
      }
      
      // Close modal
      setShowMappingModal(false);
      
      // Show success message with details
      const details = [];
      if (conditions) details.push('conditions');
      if (mapping) details.push('mapping');
      
      if (details.length > 0) {
        alert(`Bank mapping applied successfully!\nApplied: ${details.join(', ')}\nNote: Headers preserved from previous configuration.`);
      } else {
        alert('No mapping or conditions found in this bank configuration.');
      }
      
    } catch (error) {
      console.error('Error applying bank mapping:', error);
      alert('Error applying bank mapping: ' + (error instanceof Error ? error.message : String(error)));
    }
  };

  const previewDelimit = () => {
    if (!selectedDelimitColumn || !delimitChar || !newColumnNames) return;
    
    const currentFile = showInputDelimitModal ? inputFile : outputFile;
    if (!currentFile) return;

    const columnIndex = currentFile.headers.indexOf(selectedDelimitColumn);
    if (columnIndex === -1) return;

    const newColumns = newColumnNames.split(',').map(name => name.trim());
    const preview = currentFile.rows.slice(0, 5).map(row => {
      const originalValue = row[columnIndex] || '';
      const splitValues = originalValue.split(delimitChar);
      return {
        original: originalValue,
        split: splitValues,
        newColumns: newColumns
      };
    });

    setDelimitPreview(preview);
  };

  const applyDelimit = () => {
    if (!selectedDelimitColumn || !delimitChar || !newColumnNames) return;
    
    const currentFile = showInputDelimitModal ? inputFile : outputFile;
    if (!currentFile) return;

    const columnIndex = currentFile.headers.indexOf(selectedDelimitColumn);
    if (columnIndex === -1) return;

    const newColumns = newColumnNames.split(',').map(name => name.trim());
    
    // Create new headers
    const newHeaders = [...currentFile.headers];
    newHeaders.splice(columnIndex, 1, ...newColumns);
    
    // Create new rows
    const newRows = currentFile.rows.map(row => {
      const originalValue = row[columnIndex] || '';
      const splitValues = originalValue.split(delimitChar);
      const newRow = [...row];
      newRow.splice(columnIndex, 1, ...splitValues);
      return newRow;
    });

    // Update the file
    const updatedFile = {
      ...currentFile,
      headers: newHeaders,
      rows: newRows
    };

    if (showInputDelimitModal) {
      setInputFile(updatedFile);
      setSelectedInputColumns(new Set(newHeaders.map((_, i) => i)));
      setInputRowRange({start: 0, end: newRows.length - 1});
    } else {
      setOutputFile(updatedFile);
      setSelectedOutputColumns(new Set(newHeaders.map((_, i) => i)));
      setOutputRowRange({start: 0, end: newRows.length - 1});
    }

    // Close modal
    setShowInputDelimitModal(false);
    setShowOutputDelimitModal(false);
    setSelectedDelimitColumn('');
    setDelimitChar('');
    setNewColumnNames('');
    setDelimitPreview([]);
  };

  // Enhanced matching algorithm with header mapping and conditions
  const normalizeValueWithMapping = (value: string, header: string, mapping?: unknown, conditions?: unknown): string => {
    if (!value) return '';
    
    const normalized = value.toString().toLowerCase().trim();
    
    // Apply conditions if they exist
    if (conditions) {
      // Apply any filtering or transformation conditions
      // This could include specific rules for the bank
      if (typeof conditions === 'string') {
        // Handle string-based conditions
        if (conditions.includes('remove_prefix') && conditions.includes(header)) {
          // Remove specific prefixes based on conditions
          const prefixMatch = conditions.match(new RegExp(`${header}.*?remove_prefix[\\s]*[:=][\\s]*([^\\s,]+)`, 'i'));
          if (prefixMatch) {
            return normalized.replace(new RegExp(`^${prefixMatch[1]}`, 'i'), '');
          }
        }
      }
    }
    
    // Apply mapping if it exists
    if (mapping && typeof mapping === 'object' && mapping !== null && header in mapping) {
      const mappingRule = (mapping as Record<string, unknown>)[header];
      if (typeof mappingRule === 'string') {
        // Simple string replacement
        return normalized.replace(new RegExp(mappingRule, 'gi'), '');
      } else if (typeof mappingRule === 'object' && mappingRule !== null) {
        // Complex mapping rules
        const rule = mappingRule as Record<string, unknown>;
        if (typeof rule.remove === 'string') {
          return normalized.replace(new RegExp(rule.remove, 'gi'), '');
        }
        if (typeof rule.replace === 'object' && rule.replace !== null) {
          const replace = rule.replace as Record<string, unknown>;
          if (typeof replace.from === 'string' && typeof replace.to === 'string') {
            return normalized.replace(new RegExp(replace.from, 'gi'), replace.to);
          }
        }
      }
    }
    
    // Fall back to standard normalization
    return normalizeValue(value, header);
  };

  // Enhanced matching algorithm with better date/amount handling
  const normalizeValue = (value: string, header: string): string => {
    if (!value) return '';
    
    const normalized = value.toString().toLowerCase().trim();
    
    // Handle dates - normalize various date formats
    if (header.toLowerCase().includes('date') || header.toLowerCase().includes('dt')) {
      // Remove common separators and normalize to YYYYMMDD format
      const cleanDate = normalized.replace(/[\/\-\.\s]/g, '');
      
      // Try to parse and normalize different date formats
      if (cleanDate.length === 8) {
        // DDMMYYYY or MMDDYYYY format
        const day = cleanDate.substring(0, 2);
        const month = cleanDate.substring(2, 4);
        const year = cleanDate.substring(4, 8);
        
        // If day > 12, it's likely DDMMYYYY, otherwise MMDDYYYY
        if (parseInt(day) > 12) {
          return `${year}${month}${day}`; // Convert to YYYYMMDD
        } else {
          return `${year}${month}${day}`; // Keep as YYYYMMDD
        }
      }
      
      return cleanDate;
    }
    
    // Handle amounts - remove currency symbols and normalize
    if (header.toLowerCase().includes('amount') || header.toLowerCase().includes('balance') || 
        header.toLowerCase().includes('withdraw') || header.toLowerCase().includes('deposit')) {
      // Remove currency symbols, commas, spaces, and handle negative amounts
      return normalized.replace(/[₹$,\s]/g, '').replace(/\(/g, '-').replace(/\)/g, '');
    }
    
    // Handle reference numbers - remove common prefixes/suffixes and normalize
    if (header.toLowerCase().includes('ref') || header.toLowerCase().includes('reference') || 
        header.toLowerCase().includes('chq') || header.toLowerCase().includes('cheque')) {
      return normalized.replace(/^(ref|reference|ref\.|ref\s+no\.?|chq|cheque|chq\.|cheque\s+no\.?)/i, '').trim();
    }
    
    // Handle descriptions - normalize common variations
    if (header.toLowerCase().includes('description') || header.toLowerCase().includes('narration') || 
        header.toLowerCase().includes('particulars')) {
      // Remove extra spaces and normalize common abbreviations
      return normalized.replace(/\s+/g, ' ')
        .replace(/\bimps\b/g, 'immediate payment service')
        .replace(/\bneft\b/g, 'national electronic funds transfer')
        .replace(/\brtgs\b/g, 'real time gross settlement')
        .replace(/\bupi\b/g, 'unified payments interface');
    }
    
    // Handle account numbers - remove spaces and normalize
    if (header.toLowerCase().includes('account') || header.toLowerCase().includes('ac')) {
      return normalized.replace(/\s+/g, '');
    }
    
    return normalized;
  };

  // Calculate string similarity using Levenshtein distance
  const calculateSimilarity = (str1: string, str2: string): number => {
    if (str1 === str2) return 1;
    if (str1.length === 0 || str2.length === 0) return 0;
    
    const matrix = Array(str2.length + 1).fill(null).map(() => Array(str1.length + 1).fill(null));
    
    for (let i = 0; i <= str1.length; i++) matrix[0][i] = i;
    for (let j = 0; j <= str2.length; j++) matrix[j][0] = j;
    
    for (let j = 1; j <= str2.length; j++) {
      for (let i = 1; i <= str1.length; i++) {
        const indicator = str1[i - 1] === str2[j - 1] ? 0 : 1;
        matrix[j][i] = Math.min(
          matrix[j][i - 1] + 1,
          matrix[j - 1][i] + 1,
          matrix[j - 1][i - 1] + indicator
        );
      }
    }
    
    const maxLength = Math.max(str1.length, str2.length);
    return maxLength === 0 ? 1 : (maxLength - matrix[str2.length][str1.length]) / maxLength;
  };

  const findMatchingRows = (inputData: CSVData, outputData: CSVData, inputMapping?: unknown, inputConditions?: unknown, outputMapping?: unknown, outputConditions?: unknown): { 
    matchResults: MatchResult[], 
    outputOnlyRows: string[][],
    summary: ComparisonSummary 
  } => {
    const results: MatchResult[] = [];
    const usedOutputIndices = new Set<number>();
    
    // Find common columns for matching with better logic
    const inputHeaders = inputData.headers.map(h => h.toLowerCase().trim());
    const outputHeaders = outputData.headers.map(h => h.toLowerCase().trim());
    
    // Create column mapping with fuzzy matching
    const columnMappings: { inputIndex: number, outputIndex: number, inputHeader: string, outputHeader: string }[] = [];
    
    inputHeaders.forEach((inputHeader, inputIndex) => {
      outputHeaders.forEach((outputHeader, outputIndex) => {
        // Exact match
        if (inputHeader === outputHeader) {
          columnMappings.push({ inputIndex, outputIndex, inputHeader, outputHeader });
          return;
        }
        
        // Partial match - check if one contains the other
        if (inputHeader.includes(outputHeader) || outputHeader.includes(inputHeader)) {
          columnMappings.push({ inputIndex, outputIndex, inputHeader, outputHeader });
          return;
        }
        
        // Fuzzy match for common variations
        const inputKey = inputHeader.replace(/[^a-z0-9]/g, '');
        const outputKey = outputHeader.replace(/[^a-z0-9]/g, '');
        
        if (inputKey === outputKey || 
            (inputKey.length > 3 && outputKey.length > 3 && 
             (inputKey.includes(outputKey) || outputKey.includes(inputKey)))) {
          columnMappings.push({ inputIndex, outputIndex, inputHeader, outputHeader });
        }
      });
    });
    
    if (columnMappings.length === 0) {
      throw new Error('No matching columns found between the two files');
    }
    
    // Process each input row
    for (let inputIndex = 0; inputIndex < inputData.rows.length; inputIndex++) {
      const inputRow = inputData.rows[inputIndex];
      let bestMatch: { row: string[]; score: number; index: number } | null = null;
      let matchType: 'exact' | 'partial' | 'no-match' = 'no-match';
      let differences: string[] = [];

      // Find best matching row in output data
      for (let outputIndex = 0; outputIndex < outputData.rows.length; outputIndex++) {
        const outputRow = outputData.rows[outputIndex];
        let matchScore = 0;
        const rowDifferences: string[] = [];

        // Compare each mapped column
        let totalComparisons = 0;
        columnMappings.forEach(({ inputIndex: inputColIndex, outputIndex: outputColIndex, inputHeader, outputHeader }) => {
          const inputValue = (inputRow[inputColIndex] || '').toString().trim();
          const outputValue = (outputRow[outputColIndex] || '').toString().trim();
          
          if (inputValue || outputValue) {
            totalComparisons++;
            
            const normalizedInput = normalizeValueWithMapping(inputValue, inputHeader, inputMapping, inputConditions);
            const normalizedOutput = normalizeValueWithMapping(outputValue, outputHeader, outputMapping, outputConditions);
            
            if (normalizedInput === normalizedOutput) {
              matchScore += 1;
            } else if (normalizedInput && normalizedOutput) {
              // Check for partial matches with different strategies
              if (normalizedInput.includes(normalizedOutput) || normalizedOutput.includes(normalizedInput)) {
                matchScore += 0.7;
                rowDifferences.push(`${inputHeader}: "${inputValue}" vs "${outputValue}"`);
              } else if (calculateSimilarity(normalizedInput, normalizedOutput) > 0.8) {
                matchScore += 0.5;
                rowDifferences.push(`${inputHeader}: "${inputValue}" vs "${outputValue}"`);
              } else {
                rowDifferences.push(`${inputHeader}: "${inputValue}" vs "${outputValue}"`);
              }
            }
          }
        });
        
        // Normalize score by total comparisons
        const normalizedScore = totalComparisons > 0 ? matchScore / totalComparisons : 0;

        // Update best match if this is better
        if (normalizedScore > (bestMatch?.score || 0)) {
          bestMatch = { row: outputRow, score: normalizedScore, index: outputIndex };
          differences = rowDifferences;
        }
      }

      // Determine match type based on normalized score
      if (bestMatch) {
        if (bestMatch.score >= 0.9) {
          matchType = 'exact';
        } else if (bestMatch.score >= 0.5) {
          matchType = 'partial';
        }
        
        // Mark this output row as used if it's a good match
        if (bestMatch.score >= 0.5) {
          usedOutputIndices.add(bestMatch.index);
        }
      }

      results.push({
        inputRow,
        outputRow: bestMatch?.row || null,
        isMatch: matchType !== 'no-match',
        matchType,
        differences,
        inputRowIndex: inputIndex,
        outputRowIndex: bestMatch?.index || null
      });
    }

    // Find rows that exist only in output file
    const outputOnlyRows = outputData.rows.filter((_, index) => !usedOutputIndices.has(index));

    // Calculate summary
    const summary: ComparisonSummary = {
      totalInputRows: inputData.rows.length,
      totalOutputRows: outputData.rows.length,
      exactMatches: results.filter(r => r.matchType === 'exact').length,
      partialMatches: results.filter(r => r.matchType === 'partial').length,
      inputOnlyRows: results.filter(r => r.matchType === 'no-match').length,
      outputOnlyRows: outputOnlyRows.length,
      noMatches: results.filter(r => r.matchType === 'no-match').length
    };

    return { matchResults: results, outputOnlyRows, summary };
  };

  const handleCompare = async () => {
    if (!inputFile || !outputFile) {
      setError('Please upload both input and output files');
      return;
    }

    // Show configuration step first
    setShowConfigStep(true);
  };

  const handleConfirmComparison = async () => {
    if (!inputFile || !outputFile) {
      setError('Please upload both input and output files');
      return;
    }

    if (selectedInputColumns.size === 0 || selectedOutputColumns.size === 0) {
      setError('Please select at least one column from each file');
      return;
    }

    setIsProcessing(true);
    setError(null);
    setShowConfigStep(false);

    try {
      // Simulate processing time
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      // Create filtered data based on user selections
      const filteredInputData: CSVData = {
        headers: inputFile.headers.filter((_, i) => selectedInputColumns.has(i)),
        rows: inputFile.rows
          .slice(inputRowRange.start, inputRowRange.end + 1)
          .map(row => row.filter((_, i) => selectedInputColumns.has(i))),
        fileName: inputFile.fileName
      };

      const filteredOutputData: CSVData = {
        headers: outputFile.headers.filter((_, i) => selectedOutputColumns.has(i)),
        rows: outputFile.rows
          .slice(outputRowRange.start, outputRowRange.end + 1)
          .map(row => row.filter((_, i) => selectedOutputColumns.has(i))),
        fileName: outputFile.fileName
      };
      
      // Get mapping and conditions from applied bank configurations
      const inputMapping = inputFile.mapping;
      const inputConditions = inputFile.conditions;
      const outputMapping = outputFile.mapping;
      const outputConditions = outputFile.conditions;
      
      const { matchResults: results, outputOnlyRows, summary } = findMatchingRows(
        filteredInputData, 
        filteredOutputData, 
        inputMapping, 
        inputConditions, 
        outputMapping, 
        outputConditions
      );
      setMatchResults(results);
      setOutputOnlyRows(outputOnlyRows);
      setComparisonSummary(summary);
      // Auto-switch to the results tab and tables view
      setActiveMainTab('results');
      setActiveView('tables');
    } catch {
      setError('Failed to compare files');
    } finally {
      setIsProcessing(false);
    }
  };

  const downloadResults = () => {
    if (matchResults.length === 0) return;

    // Create comprehensive CSV with all comparison data
    const csvContent = [
      // Headers
      ['Input Row Index', 'Output Row Index', 'Match Type', 'Is Match', 'Input Data', 'Output Data', 'Differences'].join(','),
      // Input file analysis
      ...matchResults.map(result => [
        result.inputRowIndex + 1,
        result.outputRowIndex !== null ? result.outputRowIndex + 1 : 'N/A',
        result.matchType,
        result.isMatch ? 'Yes' : 'No',
        `"${result.inputRow.join('|')}"`,
        `"${result.outputRow?.join('|') || 'No Match'}"`,
        `"${result.differences.join('; ')}"`
      ].join(',')),
      // Separator
      ['', '', '', '', '', '', ''].join(','),
      ['OUTPUT ONLY ROWS', '', '', '', '', '', ''].join(','),
      // Output only rows
      ...outputOnlyRows.map((row, index) => [
        'N/A',
        index + 1,
        'output-only',
        'No',
        'N/A',
        `"${row.join('|')}"`,
        'Row exists only in output file'
      ].join(','))
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `file-matching-results-${new Date().toISOString().split('T')[0]}.csv`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  const getMatchIcon = (matchType: string) => {
    switch (matchType) {
      case 'exact':
        return <FiCheckCircle className="w-5 h-5 text-green-500" />;
      case 'partial':
        return <FiAlertCircle className="w-5 h-5 text-yellow-500" />;
      default:
        return <FiXCircle className="w-5 h-5 text-red-500" />;
    }
  };

  const getMatchColor = (matchType: string) => {
    switch (matchType) {
      case 'exact':
        return 'bg-green-50 border-green-200';
      case 'partial':
        return 'bg-yellow-50 border-yellow-200';
      default:
        return 'bg-red-50 border-red-200';
    }
  };

  return (
    <React.Fragment>
      <style jsx>{`
        @keyframes fadeIn {
          from {
            opacity: 0;
            transform: translateY(20px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }
        .animate-fadeIn {
          animation: fadeIn 0.6s ease-out;
        }
        @keyframes slideIn {
          from {
            opacity: 0;
            transform: translateX(-20px);
          }
          to {
            opacity: 1;
            transform: translateX(0);
          }
        }
        .animate-slideIn {
          animation: slideIn 0.4s ease-out;
        }
        @keyframes pulse {
          0%, 100% {
            opacity: 1;
          }
          50% {
            opacity: 0.5;
          }
        }
        .animate-pulse {
          animation: pulse 2s cubic-bezier(0.4, 0, 0.6, 1) infinite;
        }
      `}</style>
      <div className="w-full h-full bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50 min-h-screen">
        <div className="max-w-9xl mx-auto px-6 py-4">
        {/* Main Tabs - Files Section Style */}
        <div className="mb-6">
          <div className="border-b border-gray-200">
            <nav className="flex space-x-8">
              <button
                onClick={() => setActiveMainTab('upload')}
                className={`py-2 px-1 border-b-2 font-medium text-sm flex items-center gap-2 ${
                  activeMainTab === 'upload' 
                    ? 'border-blue-500 text-blue-600 bg-white' 
                    : 'border-transparent text-gray-500 hover:text-gray-700'
                }`}
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M9 19l3 3m0 0l3-3m-3 3V10" />
                </svg>
                Upload & Compare
              </button>
              <button
                onClick={() => setActiveMainTab('results')}
                disabled={matchResults.length === 0}
                className={`py-2 px-1 border-b-2 font-medium text-sm flex items-center gap-2 ${
                  activeMainTab === 'results' 
                    ? 'border-blue-500 text-blue-600 bg-white' 
                    : 'border-transparent text-gray-500 hover:text-gray-700'
                } ${matchResults.length === 0 ? 'opacity-50 cursor-not-allowed' : ''}`}
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                </svg>
                Results ({matchResults.length > 0 ? matchResults.length : 0} rows)
              </button>
            </nav>
          </div>
          
          {/* Secondary Tabs - Only show when Results tab is active */}
          {activeMainTab === 'results' && matchResults.length > 0 && (
            <div className="border-b border-gray-200 bg-gray-50">
              <nav className="flex space-x-6 px-6">
                <button
                  onClick={() => setActiveView('analysis')}
                  className={`py-2 text-sm font-medium border-b-2 ${
                    activeView === 'analysis' ? 'border-blue-500 text-blue-600' : 'border-transparent text-gray-500 hover:text-gray-700'
                  }`}
                >
                  Analysis ({matchResults.length} rows)
                </button>
                <button
                  onClick={() => setActiveView('tables')}
                  className={`py-2 text-sm font-medium border-b-2 ${
                    activeView === 'tables' ? 'border-blue-500 text-blue-600' : 'border-transparent text-gray-500 hover:text-gray-700'
                  }`}
                >
                  Tables
                </button>
                {inputFile && (
                  <button
                    onClick={() => setActiveTablesTab('input')}
                    className={`py-2 text-sm font-medium border-b-2 flex items-center gap-2 ${
                      activeView === 'tables' && activeTablesTab === 'input' ? 'border-blue-500 text-blue-600' : 'border-transparent text-gray-500 hover:text-gray-700'
                    }`}
                  >
                    {inputFile.fileName}
                    <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                )}
                {outputFile && (
                  <button
                    onClick={() => setActiveTablesTab('output')}
                    className={`py-2 text-sm font-medium border-b-2 flex items-center gap-2 ${
                      activeView === 'tables' && activeTablesTab === 'output' ? 'border-blue-500 text-blue-600' : 'border-transparent text-gray-500 hover:text-gray-700'
                    }`}
                  >
                    {outputFile.fileName}
                    <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                )}
              </nav>
            </div>
          )}
        </div>

        {/* Header Section */}
        <div className="mb-4 flex items-center gap-3">
          <div className="flex items-center justify-center w-6 h-6 bg-gradient-to-r from-blue-600 to-purple-600 rounded-md shadow-sm">
            <FiBarChart className="w-3 h-3 text-white" />
          </div>
          <div>
            <h1 className="text-lg font-bold bg-gradient-to-r from-gray-900 via-blue-900 to-purple-900 bg-clip-text text-transparent">
              File Matching
            </h1>
            <p className="text-[11px] text-gray-600">
              Compare and match CSV files to find differences and similarities
            </p>
          </div>
        </div>

        {error && (
          <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-xl shadow-sm animate-pulse">
            <div className="flex items-center gap-3">
              <FiAlertCircle className="w-5 h-5 text-red-500 flex-shrink-0" />
              <span className="text-red-700 font-medium">{error}</span>
            </div>
          </div>
        )}

        {/* Configuration Step - Interactive CSV Tables */}
        {showConfigStep && inputFile && outputFile && (
          <div className="bg-white rounded-xl shadow-lg border border-gray-100 p-6 mb-6 animate-fadeIn">
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-gradient-to-r from-purple-500 to-blue-600 rounded-lg flex items-center justify-center shadow-md">
                  <FiBarChart className="w-5 h-5 text-white" />
                </div>
                <div>
                  <h3 className="text-lg font-bold text-gray-900">Select Data to Compare</h3>
                  <p className="text-sm text-gray-600">Click on rows and columns to select them for comparison</p>
                </div>
              </div>
              <button
                onClick={() => setShowConfigStep(false)}
                className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
              {/* Input File Table */}
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className="w-6 h-6 bg-blue-500 rounded flex items-center justify-center">
                      <FiFileText className="w-3 h-3 text-white" />
                    </div>
                    <h4 className="font-semibold text-gray-900">Input File: {inputFile.fileName}</h4>
                  </div>
                  <div className="flex gap-2">
                    <button
                      onClick={() => {
                        setSelectedInputColumns(new Set(inputFile.headers.map((_, i) => i)));
                        setInputRowRange({start: 0, end: inputFile.rows.length - 1});
                      }}
                      className="text-xs px-2 py-1 bg-blue-100 text-blue-700 rounded hover:bg-blue-200 transition-colors"
                    >
                      Select All
                    </button>
                    <button
                      onClick={() => {
                        setSelectedInputColumns(new Set());
                        setInputRowRange({start: 0, end: 0});
                      }}
                      className="text-xs px-2 py-1 bg-gray-100 text-gray-700 rounded hover:bg-gray-200 transition-colors"
                    >
                      Clear All
                    </button>
                    <div className="flex items-center gap-1">
                      <span className="text-xs text-gray-600">Show:</span>
                      <select
                        value={inputRowsToShow}
                        onChange={(e) => setInputRowsToShow(parseInt(e.target.value))}
                        className="text-xs px-1 py-1 border border-gray-300 rounded"
                      >
                        <option value={20}>20 rows</option>
                        <option value={50}>50 rows</option>
                        <option value={100}>100 rows</option>
                        <option value={inputFile.rows.length}>All rows</option>
                      </select>
                    </div>
                  </div>
                </div>

                {/* Input File Action Buttons */}
                <div className="bg-blue-50 rounded-lg p-3 border border-blue-200">
                  <div className="flex items-center gap-3">
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-medium text-blue-700">Header:</span>
                      <input
                        type="number"
                        min="0"
                        value={inputHeaderRow}
                        onChange={(e) => {
                          setInputHeaderRow(parseInt(e.target.value) || 0);
                          // Auto-reprocess when header row changes
                          setTimeout(() => reprocessFile('input'), 100);
                        }}
                        className="w-16 text-xs px-2 py-1 border border-blue-300 rounded focus:ring-1 focus:ring-blue-500"
                        placeholder="0"
                      />
                      <span className="text-xs text-blue-600">row</span>
                    </div>
                    <button
                      onClick={() => openDelimitModal('input')}
                      className="text-xs px-3 py-1 bg-purple-500 text-white rounded hover:bg-purple-600 transition-colors"
                    >
                      Delimit
                    </button>
                    <button
                      onClick={() => findBestHeaderRow('input')}
                      className="text-xs px-3 py-1 bg-orange-500 text-white rounded hover:bg-orange-600 transition-colors"
                      title="Auto-detect the best header row"
                    >
                      Find Headers
                    </button>
                    <button
                      onClick={() => openHeaderSetModal('input')}
                      className="text-xs px-3 py-1 bg-indigo-500 text-white rounded hover:bg-indigo-600 transition-colors"
                      title="Select from Super Bank headers"
                    >
                      Header Set
                    </button>
                    <button
                      onClick={() => openMappingModal('input')}
                      className="text-xs px-3 py-1 bg-teal-500 text-white rounded hover:bg-teal-600 transition-colors"
                      title="Apply Super Bank headers, conditions, and mapping"
                    >
                      Mapping
                    </button>
                    <button
                      onClick={() => sliceFile('input')}
                      className="text-xs px-3 py-1 bg-purple-500 text-white rounded hover:bg-purple-600 transition-colors"
                      title="Keep only selected rows, remove all others"
                    >
                      Slice
                    </button>
                    <button
                      onClick={() => clearFileToOriginal('input')}
                      className="text-xs px-3 py-1 bg-red-500 text-white rounded hover:bg-red-600 transition-colors"
                      title="Reset file to original uploaded state"
                    >
                      Clear
                    </button>
                  </div>
                </div>

                <div className="border border-gray-200 rounded-lg overflow-hidden">
                  <div className="max-h-96 overflow-auto">
                    <table className="w-full text-xs">
                      <thead className="sticky top-0 bg-blue-50">
                        <tr>
                          <th className="w-8 px-1 py-2 border-b border-gray-200 bg-blue-100"></th>
                          {inputFile.headers.map((header, index) => (
                            <th 
                              key={index} 
                              className={`px-2 py-2 border-b border-gray-200 text-left cursor-pointer hover:bg-blue-100 transition-colors ${
                                selectedInputColumns.has(index) ? 'bg-blue-200' : ''
                              }`}
                              onClick={() => {
                                const newSet = new Set(selectedInputColumns);
                                if (newSet.has(index)) {
                                  newSet.delete(index);
                                } else {
                                  newSet.add(index);
                                }
                                setSelectedInputColumns(newSet);
                              }}
                            >
                              <div className="flex items-center gap-1">
                                <input
                                  type="checkbox"
                                  checked={selectedInputColumns.has(index)}
                                  onChange={() => {}}
                                  className="rounded border-gray-300"
                                />
                                <span className="font-semibold text-blue-800 truncate max-w-24" title={header}>
                                  {header}
                                </span>
                              </div>
                            </th>
                          ))}
                        </tr>
                      </thead>
                      <tbody>
                        {inputFile.rows.slice(0, inputRowsToShow).map((row, rowIndex) => (
                          <tr 
                            key={rowIndex} 
                            className={`hover:bg-gray-50 cursor-pointer transition-colors ${
                              rowIndex >= inputRowRange.start && rowIndex <= inputRowRange.end ? 'bg-blue-50 border-l-4 border-blue-400' : ''
                            }`}
                            onClick={() => {
                              // Simple toggle selection for individual rows
                              if (rowIndex >= inputRowRange.start && rowIndex <= inputRowRange.end) {
                                // If this row is already selected, deselect it
                                if (inputRowRange.start === inputRowRange.end && inputRowRange.start === rowIndex) {
                                  setInputRowRange({start: 0, end: 0});
                                } else if (inputRowRange.start === rowIndex) {
                                  setInputRowRange(prev => ({...prev, start: rowIndex + 1}));
                                } else if (inputRowRange.end === rowIndex) {
                                  setInputRowRange(prev => ({...prev, end: rowIndex - 1}));
                                } else {
                                  // Split the range
                                  setInputRowRange({start: rowIndex, end: rowIndex});
                                }
                              } else {
                                // Select this row or extend range
                                if (inputRowRange.start === inputRowRange.end && inputRowRange.start === 0) {
                                  setInputRowRange({start: rowIndex, end: rowIndex});
                                } else {
                                  setInputRowRange(prev => ({
                                    start: Math.min(prev.start, rowIndex),
                                    end: Math.max(prev.end, rowIndex)
                                  }));
                                }
                              }
                            }}
                          >
                            <td className="px-1 py-1 border-b border-gray-100 bg-gray-50 text-center font-semibold text-gray-600">
                              {rowIndex}
                            </td>
                            {row.map((cell, cellIndex) => (
                              <td 
                                key={cellIndex} 
                                className={`px-2 py-1 border-b border-gray-100 text-gray-700 ${
                                  selectedInputColumns.has(cellIndex) ? 'bg-blue-100' : ''
                                }`}
                              >
                                <div className="truncate max-w-24" title={cell}>
                                  {cell}
                                </div>
                              </td>
                            ))}
                          </tr>
                        ))}
                        {inputFile.rows.length > inputRowsToShow && (
                          <tr>
                            <td colSpan={inputFile.headers.length + 1} className="px-2 py-2 text-center text-gray-500 bg-gray-50">
                              ... and {inputFile.rows.length - inputRowsToShow} more rows
                            </td>
                          </tr>
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>
                <div className="text-xs text-blue-600 bg-blue-50 px-2 py-1 rounded">
                  <div className="flex items-center gap-2">
                    <span className="font-semibold">Selected rows:</span>
                    <span className="bg-blue-200 px-2 py-0.5 rounded">
                      {inputRowRange.start === inputRowRange.end && inputRowRange.start === 0 ? 'None' : `${inputRowRange.start}-${inputRowRange.end}`}
                    </span>
                    <span className="font-semibold">Selected columns:</span>
                    <span className="bg-blue-200 px-2 py-0.5 rounded">
                      {selectedInputColumns.size} of {inputFile.headers.length}
                    </span>
                  </div>
                  <div className="text-xs text-blue-500 mt-1">
                    💡 Click on any row to select it. Click again to deselect.
                  </div>
                </div>
              </div>

              {/* Output File Table */}
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className="w-6 h-6 bg-green-500 rounded flex items-center justify-center">
                      <FiFileText className="w-3 h-3 text-white" />
                    </div>
                    <h4 className="font-semibold text-gray-900">Output File: {outputFile.fileName}</h4>
                  </div>
                  <div className="flex gap-2">
                    <button
                      onClick={() => {
                        setSelectedOutputColumns(new Set(outputFile.headers.map((_, i) => i)));
                        setOutputRowRange({start: 0, end: outputFile.rows.length - 1});
                      }}
                      className="text-xs px-2 py-1 bg-green-100 text-green-700 rounded hover:bg-green-200 transition-colors"
                    >
                      Select All
                    </button>
                    <button
                      onClick={() => {
                        setSelectedOutputColumns(new Set());
                        setOutputRowRange({start: 0, end: 0});
                      }}
                      className="text-xs px-2 py-1 bg-gray-100 text-gray-700 rounded hover:bg-gray-200 transition-colors"
                    >
                      Clear All
                    </button>
                    <div className="flex items-center gap-1">
                      <span className="text-xs text-gray-600">Show:</span>
                      <select
                        value={outputRowsToShow}
                        onChange={(e) => setOutputRowsToShow(parseInt(e.target.value))}
                        className="text-xs px-1 py-1 border border-gray-300 rounded"
                      >
                        <option value={20}>20 rows</option>
                        <option value={50}>50 rows</option>
                        <option value={100}>100 rows</option>
                        <option value={outputFile.rows.length}>All rows</option>
                      </select>
                    </div>
                  </div>
                </div>

                {/* Output File Action Buttons */}
                <div className="bg-green-50 rounded-lg p-3 border border-green-200">
                  <div className="flex items-center gap-3">
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-medium text-green-700">Header:</span>
                      <input
                        type="number"
                        min="0"
                        value={outputHeaderRow}
                        onChange={(e) => {
                          setOutputHeaderRow(parseInt(e.target.value) || 0);
                          // Auto-reprocess when header row changes
                          setTimeout(() => reprocessFile('output'), 100);
                        }}
                        className="w-16 text-xs px-2 py-1 border border-green-300 rounded focus:ring-1 focus:ring-green-500"
                        placeholder="0"
                      />
                      <span className="text-xs text-green-600">row</span>
                    </div>
                    <button
                      onClick={() => openDelimitModal('output')}
                      className="text-xs px-3 py-1 bg-purple-500 text-white rounded hover:bg-purple-600 transition-colors"
                    >
                      Delimit
                    </button>
                    <button
                      onClick={() => findBestHeaderRow('output')}
                      className="text-xs px-3 py-1 bg-orange-500 text-white rounded hover:bg-orange-600 transition-colors"
                      title="Auto-detect the best header row"
                    >
                      Find Headers
                    </button>
                    <button
                      onClick={() => openHeaderSetModal('output')}
                      className="text-xs px-3 py-1 bg-indigo-500 text-white rounded hover:bg-indigo-600 transition-colors"
                      title="Select from Super Bank headers"
                    >
                      Header Set
                    </button>
                    <button
                      onClick={() => openMappingModal('output')}
                      className="text-xs px-3 py-1 bg-teal-500 text-white rounded hover:bg-teal-600 transition-colors"
                      title="Apply Super Bank headers, conditions, and mapping"
                    >
                      Mapping
                    </button>
                    <button
                      onClick={() => sliceFile('output')}
                      className="text-xs px-3 py-1 bg-purple-500 text-white rounded hover:bg-purple-600 transition-colors"
                      title="Keep only selected rows, remove all others"
                    >
                      Slice
                    </button>
                    <button
                      onClick={() => clearFileToOriginal('output')}
                      className="text-xs px-3 py-1 bg-red-500 text-white rounded hover:bg-red-600 transition-colors"
                      title="Reset file to original uploaded state"
                    >
                      Clear
                    </button>
                  </div>
                </div>

                <div className="border border-gray-200 rounded-lg overflow-hidden">
                  <div className="max-h-96 overflow-auto">
                    <table className="w-full text-xs">
                      <thead className="sticky top-0 bg-green-50">
                        <tr>
                          <th className="w-8 px-1 py-2 border-b border-gray-200 bg-green-100"></th>
                          {outputFile.headers.map((header, index) => (
                            <th 
                              key={index} 
                              className={`px-2 py-2 border-b border-gray-200 text-left cursor-pointer hover:bg-green-100 transition-colors ${
                                selectedOutputColumns.has(index) ? 'bg-green-200' : ''
                              }`}
                              onClick={() => {
                                const newSet = new Set(selectedOutputColumns);
                                if (newSet.has(index)) {
                                  newSet.delete(index);
                                } else {
                                  newSet.add(index);
                                }
                                setSelectedOutputColumns(newSet);
                              }}
                            >
                              <div className="flex items-center gap-1">
                                <input
                                  type="checkbox"
                                  checked={selectedOutputColumns.has(index)}
                                  onChange={() => {}}
                                  className="rounded border-gray-300"
                                />
                                <span className="font-semibold text-green-800 truncate max-w-24" title={header}>
                                  {header}
                                </span>
                              </div>
                            </th>
                          ))}
                        </tr>
                      </thead>
                      <tbody>
                        {outputFile.rows.slice(0, outputRowsToShow).map((row, rowIndex) => (
                          <tr 
                            key={rowIndex} 
                            className={`hover:bg-gray-50 cursor-pointer transition-colors ${
                              rowIndex >= outputRowRange.start && rowIndex <= outputRowRange.end ? 'bg-green-50 border-l-4 border-green-400' : ''
                            }`}
                            onClick={() => {
                              // Simple toggle selection for individual rows
                              if (rowIndex >= outputRowRange.start && rowIndex <= outputRowRange.end) {
                                // If this row is already selected, deselect it
                                if (outputRowRange.start === outputRowRange.end && outputRowRange.start === rowIndex) {
                                  setOutputRowRange({start: 0, end: 0});
                                } else if (outputRowRange.start === rowIndex) {
                                  setOutputRowRange(prev => ({...prev, start: rowIndex + 1}));
                                } else if (outputRowRange.end === rowIndex) {
                                  setOutputRowRange(prev => ({...prev, end: rowIndex - 1}));
                                } else {
                                  // Split the range
                                  setOutputRowRange({start: rowIndex, end: rowIndex});
                                }
                              } else {
                                // Select this row or extend range
                                if (outputRowRange.start === outputRowRange.end && outputRowRange.start === 0) {
                                  setOutputRowRange({start: rowIndex, end: rowIndex});
                                } else {
                                  setOutputRowRange(prev => ({
                                    start: Math.min(prev.start, rowIndex),
                                    end: Math.max(prev.end, rowIndex)
                                  }));
                                }
                              }
                            }}
                          >
                            <td className="px-1 py-1 border-b border-gray-100 bg-gray-50 text-center font-semibold text-gray-600">
                              {rowIndex}
                            </td>
                            {row.map((cell, cellIndex) => (
                              <td 
                                key={cellIndex} 
                                className={`px-2 py-1 border-b border-gray-100 text-gray-700 ${
                                  selectedOutputColumns.has(cellIndex) ? 'bg-green-100' : ''
                                }`}
                              >
                                <div className="truncate max-w-24" title={cell}>
                                  {cell}
                                </div>
                              </td>
                            ))}
                          </tr>
                        ))}
                        {outputFile.rows.length > outputRowsToShow && (
                          <tr>
                            <td colSpan={outputFile.headers.length + 1} className="px-2 py-2 text-center text-gray-500 bg-gray-50">
                              ... and {outputFile.rows.length - outputRowsToShow} more rows
                            </td>
                          </tr>
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>
                <div className="text-xs text-green-600 bg-green-50 px-2 py-1 rounded">
                  <div className="flex items-center gap-2">
                    <span className="font-semibold">Selected rows:</span>
                    <span className="bg-green-200 px-2 py-0.5 rounded">
                      {outputRowRange.start === outputRowRange.end && outputRowRange.start === 0 ? 'None' : `${outputRowRange.start}-${outputRowRange.end}`}
                    </span>
                    <span className="font-semibold">Selected columns:</span>
                    <span className="bg-green-200 px-2 py-0.5 rounded">
                      {selectedOutputColumns.size} of {outputFile.headers.length}
                    </span>
                  </div>
                  <div className="text-xs text-green-500 mt-1">
                    💡 Click on any row to select it. Click again to deselect.
                  </div>
                </div>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="flex items-center justify-end gap-3 mt-6 pt-4 border-t border-gray-200">
              <button
                onClick={() => setShowConfigStep(false)}
                className="px-4 py-2 text-gray-600 hover:text-gray-800 hover:bg-gray-100 rounded-lg transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleConfirmComparison}
                disabled={selectedInputColumns.size === 0 || selectedOutputColumns.size === 0}
                className="px-6 py-2 bg-gradient-to-r from-blue-600 to-purple-600 text-white rounded-lg hover:from-blue-700 hover:to-purple-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-300 flex items-center gap-2 font-semibold"
              >
                {isProcessing ? (
                  <React.Fragment>
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                    Analyzing...
                  </React.Fragment>
                ) : (
                  <React.Fragment>
                    <FiCheckCircle className="w-4 h-4" />
                    Start Comparison
                  </React.Fragment>
                )}
              </button>
            </div>
          </div>
        )}

        {/* Upload & Compare Tab Content */}
        {activeMainTab === 'upload' && !showConfigStep && (
          <React.Fragment>
            {/* File Upload Section */}
        <div className="space-y-6 mb-6">

          {/* File Upload Cards */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Input File */}
          <div className="group animate-slideIn">
            <div className="bg-white rounded-xl shadow-md border border-gray-100 p-6 hover:shadow-lg transition-all duration-300 transform hover:-translate-y-1">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-10 h-10 bg-gradient-to-r from-blue-500 to-blue-600 rounded-lg flex items-center justify-center shadow-md">
                  <FiFileText className="w-5 h-5 text-white" />
                </div>
                <div>
                  <h3 className="text-lg font-bold text-gray-900">Input File</h3>
                  <p className="text-xs text-gray-500">Super Bank CSV</p>
                </div>
              </div>
              
              <div className="space-y-3">
                <div className="border-2 border-dashed border-gray-200 rounded-xl p-6 text-center hover:border-blue-400 hover:bg-blue-50/50 transition-all duration-300 group-hover:scale-[1.02]">
                  <input
                    ref={inputFileRef}
                    type="file"
                    accept=".csv"
                    onChange={(e) => {
                      const file = e.target.files?.[0];
                      if (file) handleFileUpload(file, 'input');
                    }}
                    className="hidden"
                  />
                  <button
                    onClick={() => inputFileRef.current?.click()}
                    className="flex flex-col items-center gap-2 text-gray-600 hover:text-blue-600 transition-colors"
                  >
                    <div className="w-12 h-12 bg-gradient-to-r from-blue-100 to-blue-200 rounded-xl flex items-center justify-center group-hover:from-blue-200 group-hover:to-blue-300 transition-all duration-300">
                      <FiUpload className="w-6 h-6" />
                    </div>
                    <span className="font-semibold text-sm">Upload Input File</span>
                    <span className="text-xs text-gray-500">CSV files only</span>
                  </button>
                </div>
                
                {inputFile && (
                  <div className="p-3 bg-gradient-to-r from-blue-50 to-blue-100 rounded-lg border border-blue-200 animate-fadeIn">
                    <div className="flex items-center gap-2 mb-1">
                      <FiFileText className="w-4 h-4 text-blue-600" />
                      <span className="font-semibold text-blue-900 text-sm">{inputFile.fileName}</span>
                    </div>
                    <div className="text-xs text-blue-700 flex items-center gap-3">
                      <span className="flex items-center gap-1">
                        <FiTrendingUp className="w-3 h-3" />
                        {inputFile.rows.length} rows
                      </span>
                      <span className="flex items-center gap-1">
                        <FiBarChart className="w-3 h-3" />
                        {inputFile.headers.length} columns
                      </span>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Output File */}
          <div className="group animate-slideIn" style={{ animationDelay: '0.2s' }}>
            <div className="bg-white rounded-xl shadow-md border border-gray-100 p-6 hover:shadow-lg transition-all duration-300 transform hover:-translate-y-1">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-10 h-10 bg-gradient-to-r from-green-500 to-green-600 rounded-lg flex items-center justify-center shadow-md">
                  <FiFileText className="w-5 h-5 text-white" />
                </div>
                <div>
                  <h3 className="text-lg font-bold text-gray-900">Output File</h3>
                  <p className="text-xs text-gray-500">To Compare</p>
                </div>
              </div>
              
              <div className="space-y-3">
                <div className="border-2 border-dashed border-gray-200 rounded-xl p-6 text-center hover:border-green-400 hover:bg-green-50/50 transition-all duration-300 group-hover:scale-[1.02]">
                  <input
                    ref={outputFileRef}
                    type="file"
                    accept=".csv"
                    onChange={(e) => {
                      const file = e.target.files?.[0];
                      if (file) handleFileUpload(file, 'output');
                    }}
                    className="hidden"
                  />
                  <button
                    onClick={() => outputFileRef.current?.click()}
                    className="flex flex-col items-center gap-2 text-gray-600 hover:text-green-600 transition-colors"
                  >
                    <div className="w-12 h-12 bg-gradient-to-r from-green-100 to-green-200 rounded-xl flex items-center justify-center group-hover:from-green-200 group-hover:to-green-300 transition-all duration-300">
                      <FiUpload className="w-6 h-6" />
                    </div>
                    <span className="font-semibold text-sm">Upload Output File</span>
                    <span className="text-xs text-gray-500">CSV files only</span>
                  </button>
                </div>
                
                {outputFile && (
                  <div className="p-3 bg-gradient-to-r from-green-50 to-green-100 rounded-lg border border-green-200 animate-fadeIn">
                    <div className="flex items-center gap-2 mb-1">
                      <FiFileText className="w-4 h-4 text-green-600" />
                      <span className="font-semibold text-green-900 text-sm">{outputFile.fileName}</span>
                    </div>
                    <div className="text-xs text-green-700 flex items-center gap-3">
                      <span className="flex items-center gap-1">
                        <FiTrendingUp className="w-3 h-3" />
                        {outputFile.rows.length} rows
                      </span>
                      <span className="flex items-center gap-1">
                        <FiBarChart className="w-3 h-3" />
                        {outputFile.headers.length} columns
                      </span>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>

            {/* Compare Button */}
            <div className="flex justify-center mb-6">
              <button
                onClick={handleCompare}
                disabled={!inputFile || !outputFile || isProcessing}
                className="group relative px-8 py-3 bg-gradient-to-r from-blue-600 via-purple-600 to-blue-700 text-white rounded-xl font-semibold text-base hover:from-blue-700 hover:via-purple-700 hover:to-blue-800 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-300 transform hover:scale-105 hover:shadow-xl disabled:hover:scale-100 disabled:hover:shadow-md flex items-center gap-2 shadow-md"
              >
                <div className="absolute inset-0 bg-gradient-to-r from-blue-600 via-purple-600 to-blue-700 rounded-xl blur opacity-30 group-hover:opacity-50 transition-opacity duration-300"></div>
                {isProcessing ? (
                  <React.Fragment>
                    <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                    <span className="relative z-10">Analyzing...</span>
                  </React.Fragment>
                ) : (
                  <React.Fragment>
                    <FiCheckCircle className="w-5 h-5 relative z-10" />
                    <span className="relative z-10">Compare Files</span>
                  </React.Fragment>
                )}
              </button>
            </div>
          </div>
          </React.Fragment>
        )}

        {/* Results Tab Content */}
        {activeMainTab === 'results' && matchResults.length > 0 && (
          <div className="bg-white rounded-xl shadow-lg border border-gray-100 overflow-hidden animate-fadeIn">
            <div className="p-4 border-b border-gray-100 bg-gradient-to-r from-gray-50 to-blue-50">
              <div className="flex items-center justify-end mb-3">
                <button
                  onClick={downloadResults}
                  className="px-3 py-1.5 bg-gradient-to-r from-green-500 to-green-600 text-white rounded-md hover:from-green-600 hover:to-green-700 transition-all duration-300 flex items-center gap-1.5 text-xs font-semibold"
                >
                  <FiDownload className="w-3 h-3" />
                  Download
                </button>
              </div>
              
              <div className="grid grid-cols-5 gap-1.5">
                <div className="text-center p-1.5 bg-gradient-to-br from-green-50 to-green-100 rounded border border-green-200">
                  <div className="w-4 h-4 bg-gradient-to-r from-green-500 to-green-600 rounded flex items-center justify-center mx-auto mb-0.5">
                    <FiCheckCircle className="w-2.5 h-2.5 text-white" />
                  </div>
                  <div className="text-sm font-bold text-green-600">
                    {comparisonSummary?.exactMatches || 0}
                  </div>
                  <div className="text-[10px] font-semibold text-green-700">Exact</div>
                </div>
                <div className="text-center p-1.5 bg-gradient-to-br from-yellow-50 to-yellow-100 rounded border border-yellow-200">
                  <div className="w-4 h-4 bg-gradient-to-r from-yellow-500 to-yellow-600 rounded flex items-center justify-center mx-auto mb-0.5">
                    <FiAlertCircle className="w-2.5 h-2.5 text-white" />
                  </div>
                  <div className="text-sm font-bold text-yellow-600">
                    {comparisonSummary?.partialMatches || 0}
                  </div>
                  <div className="text-[10px] font-semibold text-yellow-700">Partial</div>
                </div>
                <div className="text-center p-1.5 bg-gradient-to-br from-red-50 to-red-100 rounded border border-red-200">
                  <div className="w-4 h-4 bg-gradient-to-r from-red-500 to-red-600 rounded flex items-center justify-center mx-auto mb-0.5">
                    <FiXCircle className="w-2.5 h-2.5 text-white" />
                  </div>
                  <div className="text-sm font-bold text-red-600">
                    {comparisonSummary?.inputOnlyRows || 0}
                  </div>
                  <div className="text-[10px] font-semibold text-red-700">Input Only</div>
                </div>
                <div className="text-center p-1.5 bg-gradient-to-br from-blue-50 to-blue-100 rounded border border-blue-200">
                  <div className="w-4 h-4 bg-gradient-to-r from-blue-500 to-blue-600 rounded flex items-center justify-center mx-auto mb-0.5">
                    <FiFileText className="w-2.5 h-2.5 text-white" />
                  </div>
                  <div className="text-sm font-bold text-blue-600">
                    {comparisonSummary?.outputOnlyRows || 0}
                  </div>
                  <div className="text-[10px] font-semibold text-blue-700">Output Only</div>
                </div>
                <div className="text-center p-1.5 bg-gradient-to-br from-purple-50 to-purple-100 rounded border border-purple-200">
                  <div className="w-4 h-4 bg-gradient-to-r from-purple-500 to-purple-600 rounded flex items-center justify-center mx-auto mb-0.5">
                    <FiBarChart className="w-2.5 h-2.5 text-white" />
                  </div>
                  <div className="text-sm font-bold text-purple-600">
                    {comparisonSummary?.totalInputRows || 0}
                  </div>
                  <div className="text-[10px] font-semibold text-purple-700">Total</div>
                </div>
              </div>
            </div>

            {activeView === 'analysis' && (
            <div className="max-h-[55vh] overflow-y-auto">
              {matchResults.map((result, index) => (
                <div key={index} className={`p-4 border-b border-gray-100 hover:bg-gray-50/50 transition-all duration-200 ${getMatchColor(result.matchType)}`}>
                  <div className="flex items-start gap-3">
                    <div className="flex-shrink-0 mt-1">
                      <div className={`w-8 h-8 rounded-lg flex items-center justify-center shadow-sm ${
                        result.matchType === 'exact' ? 'bg-green-100' :
                        result.matchType === 'partial' ? 'bg-yellow-100' :
                        'bg-red-100'
                      }`}>
                        {getMatchIcon(result.matchType)}
                      </div>
                    </div>
                    
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-2">
                        <span className="text-sm font-bold text-gray-900">
                          Input Row {result.inputRowIndex + 1}
                        </span>
                        <span className={`px-2 py-1 text-xs rounded-full font-semibold ${
                          result.matchType === 'exact' ? 'bg-green-100 text-green-800' :
                          result.matchType === 'partial' ? 'bg-yellow-100 text-yellow-800' :
                          'bg-red-100 text-red-800'
                        }`}>
                          {result.matchType.replace('-', ' ').toUpperCase()}
                        </span>
                        {result.outputRowIndex !== null && (
                          <span className="text-xs text-gray-500">
                            → Output Row {result.outputRowIndex + 1}
                          </span>
                        )}
                      </div>
                      
                      <div className="grid grid-cols-1 lg:grid-cols-2 gap-3 text-sm">
                        <div>
                          <div className="font-semibold text-gray-700 mb-1 flex items-center gap-2">
                            <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
                            Input Data
                          </div>
                          <div className="text-gray-600 font-mono text-xs bg-white p-2 rounded-lg border border-gray-200 shadow-sm">
                            {result.inputRow.join(', ')}
                          </div>
                        </div>
                        
                        <div>
                          <div className="font-semibold text-gray-700 mb-1 flex items-center gap-2">
                            <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                            Output Data
                          </div>
                          <div className="text-gray-600 font-mono text-xs bg-white p-2 rounded-lg border border-gray-200 shadow-sm">
                            {result.outputRow ? result.outputRow.join(', ') : 'No match found'}
                          </div>
                        </div>
                      </div>
                      
                      {/* Toggleable Differences */}
                      <div className="mt-3">
                        <button
                          onClick={() => setShowDifferencesByRow(prev => ({ ...prev, [index]: !prev[index] }))}
                          className="text-xs px-2 py-1 rounded-md border border-orange-300 text-orange-700 hover:bg-orange-50 transition-colors"
                        >
                          {showDifferencesByRow[index] ? 'Hide Differences' : 'Show Differences'}
                        </button>
                        {showDifferencesByRow[index] && result.differences.length > 0 && (
                          <div className="mt-2">
                            <div className="font-semibold text-gray-700 mb-1 flex items-center gap-2">
                              <FiAlertCircle className="w-3 h-3 text-orange-500" />
                              Differences
                            </div>
                            <div className="text-xs text-gray-600 bg-orange-50 p-2 rounded-lg border border-orange-200">
                              {result.differences.join('; ')}
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              ))}
              
              {/* Output Only Rows Section */}
              {outputOnlyRows.length > 0 && (
                <div className="border-t border-gray-200 bg-blue-50/30">
                  <div className="p-4 bg-blue-100/50 border-b border-blue-200">
                    <h4 className="font-semibold text-blue-900 flex items-center gap-2">
                      <FiFileText className="w-4 h-4" />
                      Rows Present Only in Output File ({outputOnlyRows.length} rows)
                    </h4>
                    <p className="text-xs text-blue-700 mt-1">
                      These rows exist in the output file but have no matching rows in the input file
                    </p>
                  </div>
                  {outputOnlyRows.map((row, index) => (
                    <div key={index} className="p-4 border-b border-gray-100 hover:bg-blue-50/50 transition-all duration-200">
                      <div className="flex items-start gap-3">
                        <div className="flex-shrink-0 mt-1">
                          <div className="w-8 h-8 rounded-lg flex items-center justify-center shadow-sm bg-blue-100">
                            <FiFileText className="w-4 h-4 text-blue-600" />
                          </div>
                        </div>
                        
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-2">
                            <span className="text-sm font-bold text-gray-900">
                              Output Row {index + 1}
                            </span>
                            <span className="px-2 py-1 text-xs rounded-full font-semibold bg-blue-100 text-blue-800">
                              OUTPUT ONLY
                            </span>
                          </div>
                          
                          <div className="text-gray-600 font-mono text-xs bg-white p-2 rounded-lg border border-gray-200 shadow-sm">
                            {row.join(', ')}
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
            )}

            {activeView === 'tables' && (
              <div className="p-4">
                {(() => {
                  const inputRowToType = new Map<number, 'exact' | 'partial' | 'no-match'>();
                  const outputRowToType = new Map<number, 'exact' | 'partial' | 'no-match'>();
                  matchResults.forEach(r => {
                    inputRowToType.set(r.inputRowIndex, r.matchType);
                    if (typeof r.outputRowIndex === 'number') {
                      outputRowToType.set(r.outputRowIndex, r.matchType);
                    }
                  });
                  if (outputFile) {
                    outputFile.rows.forEach((_, idx) => {
                      if (!outputRowToType.has(idx)) outputRowToType.set(idx, 'no-match');
                    });
                  }
                  const colorClass = (t: 'exact' | 'partial' | 'no-match'): string => (
                    t === 'exact' ? 'bg-green-50' : t === 'partial' ? 'bg-yellow-50' : 'bg-red-50'
                  );
                  const renderInputTable = () => (
                    <div className="border rounded-lg overflow-hidden">
                      <div className="px-3 py-2 bg-blue-50 border-b font-semibold text-sm text-blue-800">Input CSV</div>
                      <div className="max-h-[60vh] overflow-auto">
                        <table className="w-full text-xs">
                          <thead className="sticky top-0 bg-white">
                            <tr>
                              {inputFile?.headers.map((h, i) => (
                                <th key={i} className="text-left px-2 py-1 border-b">{h}</th>
                              ))}
                            </tr>
                          </thead>
                          <tbody>
                            {inputFile?.rows.map((row, idx) => {
                              const t = inputRowToType.get(idx) || 'no-match';
                              return (
                                <tr key={idx} className={`${colorClass(t)} hover:opacity-90`}>
                                  {row.map((cell, ci) => (
                                    <td key={ci} className="px-2 py-1 border-b align-top">{cell}</td>
                                  ))}
                                </tr>
                              );
                            })}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  );

                  const renderOutputTable = () => (
                    <div className="border rounded-lg overflow-hidden">
                      <div className="px-3 py-2 bg-green-50 border-b font-semibold text-sm text-green-800">Output CSV</div>
                      <div className="max-h-[60vh] overflow-auto">
                        <table className="w-full text-xs">
                          <thead className="sticky top-0 bg-white">
                            <tr>
                              {outputFile?.headers.map((h, i) => (
                                <th key={i} className="text-left px-2 py-1 border-b">{h}</th>
                              ))}
                            </tr>
                          </thead>
                          <tbody>
                            {outputFile?.rows.map((row, idx) => {
                              const t = outputRowToType.get(idx) || 'no-match';
                              return (
                                <tr key={idx} className={`${colorClass(t)} hover:opacity-90`}>
                                  {row.map((cell, ci) => (
                                    <td key={ci} className="px-2 py-1 border-b align-top">{cell}</td>
                                  ))}
                                </tr>
                              );
                            })}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  );

                  if (activeTablesTab === 'input') {
                    return renderInputTable();
                  }
                  if (activeTablesTab === 'output') {
                    return renderOutputTable();
                  }
                  return (
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                      {renderInputTable()}
                      {renderOutputTable()}
                    </div>
                  );
                })()}
              </div>
            )}
          </div>
        )}

        {/* Delimit Column Modal */}
        {(showInputDelimitModal || showOutputDelimitModal) && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white rounded-xl shadow-xl p-6 w-full max-w-2xl mx-4">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-bold text-gray-900">Delimit Column</h3>
                <button
                  onClick={() => {
                    setShowInputDelimitModal(false);
                    setShowOutputDelimitModal(false);
                    setSelectedDelimitColumn('');
                    setDelimitChar('');
                    setNewColumnNames('');
                    setDelimitPreview([]);
                  }}
                  className="text-gray-400 hover:text-gray-600"
                >
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>

              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Select column to delimit:
                  </label>
                  <select
                    value={selectedDelimitColumn}
                    onChange={(e) => setSelectedDelimitColumn(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  >
                    <option value="">Select column</option>
                    {(showInputDelimitModal ? inputFile : outputFile)?.headers.map((header, index) => (
                      <option key={index} value={header}>{header}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Delimiter:
                  </label>
                  <input
                    type="text"
                    value={delimitChar}
                    onChange={(e) => setDelimitChar(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    placeholder="Enter delimiter character (e.g., , ; | space)"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    New column names (comma separated):
                  </label>
                  <input
                    type="text"
                    value={newColumnNames}
                    onChange={(e) => setNewColumnNames(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    placeholder="e.g., Date, Time"
                  />
                </div>

                {delimitPreview.length > 0 && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Preview:
                    </label>
                    <div className="border border-gray-200 rounded-lg overflow-hidden">
                      <table className="w-full text-sm">
                        <thead className="bg-gray-50">
                          <tr>
                            <th className="px-3 py-2 text-left">Original</th>
                            {delimitPreview[0]?.newColumns.map((col, index) => (
                              <th key={index} className="px-3 py-2 text-left">{col}</th>
                            ))}
                          </tr>
                        </thead>
                        <tbody>
                          {delimitPreview.map((item, index) => (
                            <tr key={index} className="border-t border-gray-200">
                              <td className="px-3 py-2 text-gray-600">{item.original}</td>
                              {item.split.map((value, colIndex) => (
                                <td key={colIndex} className="px-3 py-2">{value}</td>
                              ))}
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                )}

                <div className="flex items-center justify-end gap-3 pt-4">
                  <button
                    onClick={() => {
                      setShowInputDelimitModal(false);
                      setShowOutputDelimitModal(false);
                      setSelectedDelimitColumn('');
                      setDelimitChar('');
                      setNewColumnNames('');
                      setDelimitPreview([]);
                    }}
                    className="px-4 py-2 text-gray-600 hover:text-gray-800 hover:bg-gray-100 rounded-lg transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={previewDelimit}
                    disabled={!selectedDelimitColumn || !delimitChar || !newColumnNames}
                    className="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                  >
                    Preview
                  </button>
                  <button
                    onClick={applyDelimit}
                    disabled={!selectedDelimitColumn || !delimitChar || !newColumnNames}
                    className="px-4 py-2 bg-green-500 text-white rounded-lg hover:bg-green-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                  >
                    Save
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Header Set Modal */}
        {showHeaderSetModal && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white rounded-xl shadow-xl p-6 w-full max-w-4xl mx-4 max-h-[80vh] overflow-hidden">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold text-gray-800">
                  Select Super Bank Header for {headerSetFileType === 'input' ? 'Input' : 'Output'} File
                </h3>
                <button
                  onClick={() => setShowHeaderSetModal(false)}
                  className="text-gray-400 hover:text-gray-600 transition-colors"
                >
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>

              <div className="mb-4">
                <p className="text-sm text-gray-600">
                  Choose a Super Bank header configuration to apply to your file. This will replace the current headers with the Super Bank&apos;s header format.
                </p>
              </div>

              {loadingHeaders ? (
                <div className="flex items-center justify-center py-8">
                  <div className="w-8 h-8 border-4 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
                  <span className="ml-3 text-gray-600">Loading Super Bank headers...</span>
                </div>
              ) : (
                <div className="overflow-y-auto max-h-96">
                  {superBankHeaders.length === 0 ? (
                    <div className="text-center py-8 text-gray-500">
                      <div className="mb-4">
                        <svg className="w-12 h-12 mx-auto text-gray-400 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                        </svg>
                      </div>
                      <h4 className="text-lg font-medium text-gray-700 mb-2">No Super Bank Headers Found</h4>
                      <p className="text-sm text-gray-500 mb-4">
                        No Super Bank header configuration found in the database.
                      </p>
                      <p className="text-xs text-gray-400">
                        Check the console for debugging information about available bank names.
                      </p>
                    </div>
                  ) : (
                    <div className="grid gap-3">
                      {superBankHeaders.map((bank, index) => (
                        <div
                          key={index}
                          className="border border-gray-200 rounded-lg p-4 hover:border-indigo-300 hover:bg-indigo-50 transition-colors cursor-pointer"
                          onClick={() => applySuperBankHeader(bank)}
                        >
                          <div className="flex items-center justify-between">
                            <div>
                              <h4 className="font-medium text-gray-800">
                                {bank.id || `Bank ${index + 1}`}
                              </h4>
                              {bank.bankId && (
                                <p className="text-sm text-gray-500">ID: {bank.bankId}</p>
                              )}
                            </div>
                            <div className="text-right">
                              <div className="text-sm text-gray-600">
                                {bank.header && Array.isArray(bank.header) ? 
                                  `${bank.header.length} columns` : 
                                  'No headers'
                                }
                              </div>
                            </div>
                          </div>
                          
                          {Boolean(bank.header && isArray(bank.header)) && (
                            <div className="mt-3">
                              <div className="text-xs text-gray-500 mb-1">Super Bank Headers ({(bank.header as unknown[]).length}):</div>
                              <div className="flex flex-wrap gap-1 max-h-20 overflow-y-auto">
                                {(bank.header as unknown[]).map((item: unknown, headerIndex: number) => {
                                  // Try different possible formats for header names
                                  let headerName = '';
                                  if (typeof item === 'string') {
                                    headerName = item;
                                  } else if (typeof item === 'object' && item !== null) {
                                    const obj = item as Record<string, unknown>;
                                    if (typeof obj.S === 'string') {
                                      headerName = obj.S;
                                    } else if (typeof obj.M === 'object' && obj.M !== null) {
                                      const m = obj.M as Record<string, unknown>;
                                      if (typeof m.name === 'object' && m.name !== null) {
                                        const name = m.name as Record<string, unknown>;
                                        if (typeof name.S === 'string') {
                                          headerName = name.S;
                                        }
                                      }
                                    } else if (typeof obj.name === 'string') {
                                      headerName = obj.name;
                                    }
                                  }
                                  
                                  return headerName ? (
                                    <span
                                      key={headerIndex}
                                      className="px-2 py-1 bg-indigo-100 text-indigo-700 text-xs rounded"
                                    >
                                      {headerName}
                                    </span>
                                  ) : (
                                    <span
                                      key={headerIndex}
                                      className="px-2 py-1 bg-red-100 text-red-600 text-xs rounded"
                                    >
                                      Invalid
                                    </span>
                                  );
                                })}
                              </div>
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}

              <div className="flex justify-end gap-3 mt-6 pt-4 border-t border-gray-200">
                <button
                  onClick={() => setShowHeaderSetModal(false)}
                  className="px-4 py-2 text-gray-600 hover:text-gray-800 hover:bg-gray-100 rounded-lg transition-colors"
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Mapping Modal */}
        {showMappingModal && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white rounded-xl shadow-xl p-6 w-full max-w-5xl mx-4 max-h-[80vh] overflow-hidden">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-3">
                  {showBankDetails && (
                    <button
                      onClick={goBackToBankList}
                      className="text-gray-400 hover:text-gray-600 transition-colors"
                      title="Back to bank list"
                    >
                      <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                      </svg>
                    </button>
                  )}
                  <h3 className="text-lg font-semibold text-gray-800">
                    {showBankDetails 
                      ? `${selectedBankDetails?.id || 'Bank'} Configuration Details`
                      : `Apply Bank Configuration for ${mappingFileType === 'input' ? 'Input' : 'Output'} File`
                    }
                  </h3>
                </div>
                <button
                  onClick={() => {
                    setShowMappingModal(false);
                    setShowBankDetails(false);
                    setSelectedBankDetails(null);
                  }}
                  className="text-gray-400 hover:text-gray-600 transition-colors"
                >
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>

              {!showBankDetails && (
                <div className="mb-4">
                  <p className="text-sm text-gray-600">
                    Apply bank mapping and conditions to your file. This will preserve your current headers and only apply the selected bank&apos;s mapping rules and conditions for better matching.
                  </p>
                </div>
              )}

              {loadingMappings ? (
                <div className="flex items-center justify-center py-8">
                  <div className="w-8 h-8 border-4 border-teal-500 border-t-transparent rounded-full animate-spin"></div>
                  <span className="ml-3 text-gray-600">Loading bank configurations...</span>
                </div>
              ) : showBankDetails ? (
                // Bank Details View
                <div className="overflow-y-auto max-h-96">
                  {selectedBankDetails && (
                    <div className="space-y-6">
                      {/* Headers Section */}
                      {isValidHeaderArray(selectedBankDetails.header) ? (
                        <div>
                          <h4 className="text-lg font-medium text-gray-800 mb-3">Headers ({(selectedBankDetails.header as unknown[]).length})</h4>
                          <div className="flex flex-wrap gap-2">
                            {(selectedBankDetails.header as unknown[]).map((item: unknown, headerIndex: number) => {
                              let headerName = '';
                              if (typeof item === 'string') {
                                headerName = item;
                              } else if (typeof item === 'object' && item !== null) {
                                const obj = item as Record<string, unknown>;
                                if (typeof obj.S === 'string') {
                                  headerName = obj.S;
                                } else if (typeof obj.M === 'object' && obj.M !== null) {
                                  const m = obj.M as Record<string, unknown>;
                                  if (typeof m.name === 'object' && m.name !== null) {
                                    const name = m.name as Record<string, unknown>;
                                    if (typeof name.S === 'string') {
                                      headerName = name.S;
                                    }
                                  }
                                } else if (typeof obj.name === 'string') {
                                  headerName = obj.name;
                                }
                              }
                              
                              return headerName ? (
                                <span
                                  key={headerIndex}
                                  className="px-3 py-2 bg-teal-100 text-teal-700 text-sm rounded-lg border border-teal-200"
                                >
                                  {headerName}
                                </span>
                              ) : null;
                            })}
                          </div>
                        </div>
                      ) : null}

                      {/* Conditions Section */}
                      {shouldRenderConditions() && renderConditionsSection()}

                      {/* Mapping Section */}
                      {!!selectedBankDetails.mapping && (
                        <div>
                          <h4 className="text-lg font-medium text-gray-800 mb-3">Field Mappings</h4>
                          <div className="space-y-2">
                            {typeof selectedBankDetails.mapping === 'object' && selectedBankDetails.mapping !== null ? (
                              Object.entries(selectedBankDetails.mapping as Record<string, unknown>).map(([sourceField, targetField], index) => (
                                <div key={index} className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg border">
                                  <span className="px-3 py-1 bg-blue-100 text-blue-800 rounded font-medium min-w-0 flex-shrink-0">
                                    {sourceField}
                                  </span>
                                  <span className="text-gray-400">→</span>
                                  <span className="px-3 py-1 bg-green-100 text-green-800 rounded font-medium min-w-0 flex-shrink-0">
                                    {String(targetField) === 'Ignore' ? (
                                      <span className="text-gray-500 italic">Ignore</span>
                                    ) : (
                                      String(targetField)
                                    )}
                                  </span>
                                </div>
                              ))
                            ) : (
                              <div className="bg-gray-50 p-4 rounded-lg border">
                                <div className="text-sm text-gray-600">
                                  {typeof selectedBankDetails.mapping === 'string' ? 
                                    selectedBankDetails.mapping : 
                                    'Custom mapping defined'
                                  }
                                </div>
                              </div>
                            )}
                          </div>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              ) : (
                // Bank List View
                <div className="overflow-y-auto max-h-96">
                  {allBankMappings.length === 0 ? (
                    <div className="text-center py-8 text-gray-500">
                      <div className="mb-4">
                        <svg className="w-12 h-12 mx-auto text-gray-400 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                        </svg>
                      </div>
                      <h4 className="text-lg font-medium text-gray-700 mb-2">No Bank Configurations Found</h4>
                      <p className="text-sm text-gray-500 mb-4">
                        No bank configurations found in the database.
                      </p>
                      <p className="text-xs text-gray-400">
                        Check the console for debugging information about available bank names.
                      </p>
                    </div>
                  ) : (
                    <div className="grid gap-3">
                      {allBankMappings.map((bank, index) => (
                        <div
                          key={index}
                          className="border border-gray-200 rounded-lg p-4 hover:border-teal-300 hover:bg-teal-50 transition-colors"
                        >
                          <div className="flex items-center justify-between">
                            <div>
                              <h4 className="font-medium text-gray-800">
                                {bank.id || `Bank ${index + 1}`}
                              </h4>
                              {bank.bankId && (
                                <p className="text-sm text-gray-500">ID: {bank.bankId}</p>
                              )}
                            </div>
                            <div className="flex items-center gap-2">
                              <div className="text-sm text-gray-600">
                                {bank.header && Array.isArray(bank.header) ? 
                                  `${bank.header.length} columns` : 
                                  'No headers'
                                }
                              </div>
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  showBankDetailsView(bank);
                                }}
                                className="text-xs px-3 py-1 bg-blue-500 text-white rounded hover:bg-blue-600 transition-colors"
                              >
                                Show
                              </button>
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  applyBankMapping(bank);
                                }}
                                className="text-xs px-3 py-1 bg-teal-500 text-white rounded hover:bg-teal-600 transition-colors"
                              >
                                Apply
                              </button>
                            </div>
                          </div>
                          
                          {/* Summary */}
                          <div className="mt-3 pt-2 border-t border-gray-200">
                            <div className="flex items-center gap-4 text-xs text-gray-500">
                              <span className="flex items-center gap-1">
                                <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
                                  <path fillRule="evenodd" d="M3 4a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zm0 4a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zm0 4a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1z" clipRule="evenodd" />
                                </svg>
                                Headers
                              </span>
                              {!!bank.conditions && (
                                <span className="flex items-center gap-1">
                                  <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
                                    <path fillRule="evenodd" d="M3 3a1 1 0 000 2v8a2 2 0 002 2h2.586l-1.293 1.293a1 1 0 101.414 1.414L10 15.414l2.293 2.293a1 1 0 001.414-1.414L12.414 15H15a2 2 0 002-2V5a1 1 0 100-2H3zm11.707 4.707a1 1 0 00-1.414-1.414L10 9.586 8.707 8.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                                  </svg>
                                  Conditions
                                </span>
                              )}
                              {!!bank.mapping && (
                                <span className="flex items-center gap-1">
                                  <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
                                    <path fillRule="evenodd" d="M12.316 3.051a1 1 0 01.633 1.265l-4 12a1 1 0 11-1.898-.632l4-12a1 1 0 011.265-.633zM5.707 6.293a1 1 0 010 1.414L3.414 10l2.293 2.293a1 1 0 11-1.414 1.414l-3-3a1 1 0 010-1.414l3-3a1 1 0 011.414 0zm8.586 0a1 1 0 011.414 0l3 3a1 1 0 010 1.414l-3 3a1 1 0 11-1.414-1.414L16.586 10l-2.293-2.293a1 1 0 010-1.414z" clipRule="evenodd" />
                                  </svg>
                                  Mapping
                                </span>
                              )}
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}

              <div className="flex justify-end gap-3 mt-6 pt-4 border-t border-gray-200">
                <button
                  onClick={() => setShowMappingModal(false)}
                  className="px-4 py-2 text-gray-600 hover:text-gray-800 hover:bg-gray-100 rounded-lg transition-colors"
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        )}
        </div>
      </div>
    </React.Fragment>
  );
}