'use client';

import React, { useState, useRef } from 'react';
import { FiUpload, FiDownload, FiFileText, FiCheckCircle, FiXCircle, FiAlertCircle, FiBarChart, FiTrendingUp } from 'react-icons/fi';
import { smartAutoMatch, normalizeDate, normalizeAmount, normalizeDescription } from '../utils/fileMatchingUtils';

interface CSVData {
  headers: string[];
  rows: string[][];
  fileName: string;
}

interface MatchResult {
  inputRow: string[];
  outputRow: string[] | null;
  isMatch: boolean;
  matchType: 'exact' | 'partial' | 'no-match';
  differences: string[];
  inputRowIndex: number;
  outputRowIndex: number | null;
  dateMatch: boolean;
  referenceMatch: boolean;
}

interface ComparisonSummary {
  totalInputRows: number;
  totalOutputRows: number;
  exactMatches: number;
  partialMatches: number;
  inputOnlyRows: number;
  outputOnlyRows: number;
  noMatches: number;
  dateAndRefMatches: number;
  dateOnlyMatches: number;
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
  const [detectedMappings, setDetectedMappings] = useState<{ inputIndex: number; outputIndex: number; type: string; confidence: number }[]>([]);
  
  const inputFileRef = useRef<HTMLInputElement>(null);
  const outputFileRef = useRef<HTMLInputElement>(null);

  const parseCSV = (file: File): Promise<CSVData> => {
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

          // Improved CSV parsing to handle quoted fields
          const parseCSVLine = (line: string): string[] => {
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
              } else if (char === ',' && !inQuotes) {
                result.push(current.trim());
                current = '';
              } else {
                current += char;
              }
            }
            
            result.push(current.trim());
            return result;
          };

          const headers = parseCSVLine(lines[0]);
          const rows = lines.slice(1).map(line => parseCSVLine(line));

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
      const csvData = await parseCSV(file);
      
      if (type === 'input') {
        setInputFile(csvData);
        // Auto-detect mappings if output file already exists
        if (outputFile) {
          const autoMatchResults = smartAutoMatch(csvData, outputFile, 0.7);
          setDetectedMappings(autoMatchResults.columnMappings);
        }
      } else {
        setOutputFile(csvData);
        // Auto-detect mappings if input file already exists
        if (inputFile) {
          const autoMatchResults = smartAutoMatch(inputFile, csvData, 0.7);
          setDetectedMappings(autoMatchResults.columnMappings);
        }
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to upload file');
    }
  };



  const handleCompare = async () => {
    if (!inputFile || !outputFile) {
      setError('Please upload both input and output files');
      return;
    }

    setIsProcessing(true);
    setError(null);

    try {
      // Use smart auto-matching with intelligent column mapping
      const autoMatchResults = smartAutoMatch(inputFile, outputFile, 0.7); // 70% similarity threshold
      
      // Convert to the format expected by the UI
      const results: MatchResult[] = [];
      
      // Process matched rows
      autoMatchResults.matches.forEach(match => {
        const inputRow = inputFile.rows[match.file1RowIndex];
        const outputRow = outputFile.rows[match.file2RowIndex];
        const similarity = match.similarity;
        const dateMatch = match.dateMatch;
        const referenceMatch = match.referenceMatch;
        
        // Determine match type based on date and reference matching
        let matchType: 'exact' | 'partial' | 'no-match' = 'no-match';
        if (dateMatch && referenceMatch) {
          matchType = 'exact'; // Green: Both date and reference match
        } else if (dateMatch) {
          matchType = 'partial'; // Yellow: Only date matches
        } else if (similarity >= 0.7) {
          matchType = 'partial'; // Yellow: Similarity match
        }
        
        // Calculate differences based on mapped columns
        const differences: string[] = [];
        autoMatchResults.columnMappings.forEach(mapping => {
          const inputVal = inputRow[mapping.inputIndex] || '';
          const outputVal = outputRow[mapping.outputIndex] || '';
          
          // Normalize for comparison
          let inputNorm = inputVal;
          let outputNorm = outputVal;
          
          if (mapping.type === 'date') {
            inputNorm = normalizeDate(inputVal);
            outputNorm = normalizeDate(outputVal);
          } else if (mapping.type === 'amount') {
            inputNorm = normalizeAmount(inputVal).toString();
            outputNorm = normalizeAmount(outputVal).toString();
          } else if (mapping.type === 'description') {
            inputNorm = normalizeDescription(inputVal);
            outputNorm = normalizeDescription(outputVal);
          }
          
          if (inputNorm !== outputNorm) {
            differences.push(`${inputFile.headers[mapping.inputIndex]}: "${inputVal}" vs "${outputVal}"`);
          }
        });
        
        results.push({
          inputRow,
          outputRow,
          isMatch: matchType !== 'no-match',
          matchType,
          differences,
          inputRowIndex: match.file1RowIndex,
          outputRowIndex: match.file2RowIndex,
          dateMatch,
          referenceMatch
        });
      });
      
      // Add unmatched input rows
      autoMatchResults.unmatchedFile1.forEach(index => {
        results.push({
          inputRow: inputFile.rows[index],
          outputRow: null,
          isMatch: false,
          matchType: 'no-match',
          differences: ['No matching row found in output file'],
          inputRowIndex: index,
          outputRowIndex: null,
          dateMatch: false,
          referenceMatch: false
        });
      });
      
      // Collect output-only rows
      const outputOnly = autoMatchResults.unmatchedFile2.map(index => outputFile.rows[index]);
      
      const summary: ComparisonSummary = {
        totalInputRows: inputFile.rows.length,
        totalOutputRows: outputFile.rows.length,
        exactMatches: results.filter(r => r.matchType === 'exact').length,
        partialMatches: results.filter(r => r.matchType === 'partial').length,
        inputOnlyRows: autoMatchResults.unmatchedFile1.length,
        outputOnlyRows: autoMatchResults.unmatchedFile2.length,
        noMatches: results.filter(r => r.matchType === 'no-match').length,
        dateAndRefMatches: results.filter(r => r.dateMatch && r.referenceMatch).length,
        dateOnlyMatches: results.filter(r => r.dateMatch && !r.referenceMatch).length
      };
      
      setMatchResults(results);
      setOutputOnlyRows(outputOnly);
      setComparisonSummary(summary);
      setDetectedMappings(autoMatchResults.columnMappings);
      
      // Show detected column mappings in console for user reference
      console.log('🎯 Auto-detected Column Mappings:');
      autoMatchResults.columnMappings.forEach(m => {
        console.log(`  ${inputFile.headers[m.inputIndex]} ➜ ${outputFile.headers[m.outputIndex]} (${m.type}, confidence: ${(m.confidence * 100).toFixed(0)}%)`);
      });
      
      // Auto-switch to the results tab and tables view
      setActiveMainTab('results');
      setActiveView('tables');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to compare files');
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
    <>
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

        {/* Main Tabs */}
        <div className="mb-6">
          <div className="border-b border-gray-200">
            <nav className="flex space-x-8">
              <button
                onClick={() => setActiveMainTab('upload')}
                className={`py-2 px-1 border-b-2 font-medium text-sm ${
                  activeMainTab === 'upload' 
                    ? 'border-blue-500 text-blue-600' 
                    : 'border-transparent text-gray-500 hover:text-gray-700'
                }`}
              >
                Upload & Compare
              </button>
              <button
                onClick={() => setActiveMainTab('results')}
                disabled={matchResults.length === 0}
                className={`py-2 px-1 border-b-2 font-medium text-sm ${
                  activeMainTab === 'results' 
                    ? 'border-blue-500 text-blue-600' 
                    : 'border-transparent text-gray-500 hover:text-gray-700'
                } ${matchResults.length === 0 ? 'opacity-50 cursor-not-allowed' : ''}`}
              >
                Results ({matchResults.length > 0 ? matchResults.length : 0} rows)
              </button>
            </nav>
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

        {/* Upload & Compare Tab Content */}
        {activeMainTab === 'upload' && (
          <>
            {/* File Upload Section */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
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

            {/* Auto-Detected Column Mappings Info (shown after files are uploaded) */}
            {inputFile && outputFile && detectedMappings.length > 0 && (
              <div className="mb-6 bg-gradient-to-r from-blue-50 to-purple-50 rounded-xl p-6 border border-blue-200 shadow-sm animate-fadeIn">
                <div className="flex items-center gap-2 mb-4">
                  <FiCheckCircle className="w-5 h-5 text-blue-600" />
                  <h3 className="font-bold text-blue-900">✨ Auto-Detected Column Mappings</h3>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                  {detectedMappings.map((mapping, idx) => (
                    <div key={idx} className="bg-white rounded-lg p-3 shadow-sm border border-blue-100">
                      <div className="text-xs text-gray-500 mb-1 uppercase tracking-wide font-semibold">
                        {mapping.type}
                      </div>
                      <div className="flex items-center gap-2 text-sm">
                        <span className="text-blue-600 font-medium truncate" title={inputFile.headers[mapping.inputIndex]}>
                          {inputFile.headers[mapping.inputIndex]}
                        </span>
                        <span className="text-gray-400">→</span>
                        <span className="text-purple-600 font-medium truncate" title={outputFile.headers[mapping.outputIndex]}>
                          {outputFile.headers[mapping.outputIndex]}
                        </span>
                      </div>
                      <div className="mt-1 text-xs text-gray-400">
                        Confidence: {(mapping.confidence * 100).toFixed(0)}%
                      </div>
                    </div>
                  ))}
                </div>
                <div className="mt-4 text-xs text-blue-700 bg-blue-100 rounded px-3 py-2">
                  💡 <strong>Smart Matching:</strong> The system automatically detected {detectedMappings.length} column mappings. 
                  Date formats, amount formats, and text variations are normalized automatically for accurate matching.
                </div>
              </div>
            )}

            {/* Compare Button */}
            <div className="flex justify-center mb-6">
              <button
                onClick={handleCompare}
                disabled={!inputFile || !outputFile || isProcessing}
                className="group relative px-8 py-3 bg-gradient-to-r from-blue-600 via-purple-600 to-blue-700 text-white rounded-xl font-semibold text-base hover:from-blue-700 hover:via-purple-700 hover:to-blue-800 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-300 transform hover:scale-105 hover:shadow-xl disabled:hover:scale-100 disabled:hover:shadow-md flex items-center gap-2 shadow-md"
              >
                <div className="absolute inset-0 bg-gradient-to-r from-blue-600 via-purple-600 to-blue-700 rounded-xl blur opacity-30 group-hover:opacity-50 transition-opacity duration-300"></div>
                {isProcessing ? (
                  <>
                    <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                    <span className="relative z-10">Analyzing...</span>
                  </>
                ) : (
                  <>
                    <FiCheckCircle className="w-5 h-5 relative z-10" />
                    <span className="relative z-10">🚀 Smart Auto-Match Files</span>
                  </>
                )}
              </button>
            </div>
          </>
        )}

        {/* Results Tab Content */}
        {activeMainTab === 'results' && matchResults.length > 0 && (
          <div className="bg-white rounded-xl shadow-lg border border-gray-100 overflow-hidden animate-fadeIn">
            <div className="p-6 border-b border-gray-100 bg-gradient-to-r from-gray-50 to-blue-50">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-gradient-to-r from-purple-500 to-blue-600 rounded-lg flex items-center justify-center shadow-md">
                    <FiBarChart className="w-5 h-5 text-white" />
                  </div>
                  <div>
                    <h3 className="text-lg font-bold text-gray-900">Comparison Results</h3>
                    <p className="text-sm text-gray-600">Analysis completed successfully</p>
                  </div>
                </div>
                <button
                  onClick={downloadResults}
                  className="px-4 py-2 bg-gradient-to-r from-green-500 to-green-600 text-white rounded-lg hover:from-green-600 hover:to-green-700 transition-all duration-300 transform hover:scale-105 shadow-md flex items-center gap-2 text-sm font-semibold"
                >
                  <FiDownload className="w-4 h-4" />
                  Download
                </button>
              </div>
              
              <div className="grid grid-cols-2 md:grid-cols-7 gap-2">
                <div className="text-center p-2 bg-gradient-to-br from-green-50 to-green-100 rounded-md border border-green-200">
                  <div className="w-6 h-6 bg-gradient-to-r from-green-500 to-green-600 rounded flex items-center justify-center mx-auto mb-1">
                    <FiCheckCircle className="w-3.5 h-3.5 text-white" />
                  </div>
                  <div className="text-base font-bold text-green-600 mb-0.5">
                    {comparisonSummary?.dateAndRefMatches || 0}
                  </div>
                  <div className="text-[11px] font-semibold text-green-700">Date+Ref Match</div>
                </div>
                <div className="text-center p-2 bg-gradient-to-br from-blue-50 to-blue-100 rounded-md border border-blue-200">
                  <div className="w-6 h-6 bg-gradient-to-r from-blue-500 to-blue-600 rounded flex items-center justify-center mx-auto mb-1">
                    <FiCheckCircle className="w-3.5 h-3.5 text-white" />
                  </div>
                  <div className="text-base font-bold text-blue-600 mb-0.5">
                    {comparisonSummary?.dateOnlyMatches || 0}
                  </div>
                  <div className="text-[11px] font-semibold text-blue-700">Date Only</div>
                </div>
                <div className="text-center p-2 bg-gradient-to-br from-emerald-50 to-emerald-100 rounded-md border border-emerald-200">
                  <div className="w-6 h-6 bg-gradient-to-r from-emerald-500 to-emerald-600 rounded flex items-center justify-center mx-auto mb-1">
                    <FiCheckCircle className="w-3.5 h-3.5 text-white" />
                  </div>
                  <div className="text-base font-bold text-emerald-600 mb-0.5">
                    {comparisonSummary?.exactMatches || 0}
                  </div>
                  <div className="text-[11px] font-semibold text-emerald-700">Exact Matches</div>
                </div>
                <div className="text-center p-2 bg-gradient-to-br from-yellow-50 to-yellow-100 rounded-md border border-yellow-200">
                  <div className="w-6 h-6 bg-gradient-to-r from-yellow-500 to-yellow-600 rounded flex items-center justify-center mx-auto mb-1">
                    <FiAlertCircle className="w-3.5 h-3.5 text-white" />
                  </div>
                  <div className="text-base font-bold text-yellow-600 mb-0.5">
                    {comparisonSummary?.partialMatches || 0}
                  </div>
                  <div className="text-[11px] font-semibold text-yellow-700">Partial</div>
                </div>
                <div className="text-center p-2 bg-gradient-to-br from-red-50 to-red-100 rounded-md border border-red-200">
                  <div className="w-6 h-6 bg-gradient-to-r from-red-500 to-red-600 rounded flex items-center justify-center mx-auto mb-1">
                    <FiXCircle className="w-3.5 h-3.5 text-white" />
                  </div>
                  <div className="text-base font-bold text-red-600 mb-0.5">
                    {comparisonSummary?.inputOnlyRows || 0}
                  </div>
                  <div className="text-[11px] font-semibold text-red-700">Input Only</div>
                </div>
                <div className="text-center p-2 bg-gradient-to-br from-indigo-50 to-indigo-100 rounded-md border border-indigo-200">
                  <div className="w-6 h-6 bg-gradient-to-r from-indigo-500 to-indigo-600 rounded flex items-center justify-center mx-auto mb-1">
                    <FiFileText className="w-3.5 h-3.5 text-white" />
                  </div>
                  <div className="text-base font-bold text-indigo-600 mb-0.5">
                    {comparisonSummary?.outputOnlyRows || 0}
                  </div>
                  <div className="text-[11px] font-semibold text-indigo-700">Output Only</div>
                </div>
                <div className="text-center p-2 bg-gradient-to-br from-purple-50 to-purple-100 rounded-md border border-purple-200">
                  <div className="w-6 h-6 bg-gradient-to-r from-purple-500 to-purple-600 rounded flex items-center justify-center mx-auto mb-1">
                    <FiBarChart className="w-3.5 h-3.5 text-white" />
                  </div>
                  <div className="text-base font-bold text-purple-600 mb-0.5">
                    {comparisonSummary?.totalInputRows || 0}
                  </div>
                  <div className="text-[11px] font-semibold text-purple-700">Total Rows</div>
                </div>
              </div>
            </div>

            {/* Tabs for different views */}
            <div className="border-b border-gray-200">
              <nav className="flex space-x-8 px-6">
                <button
                  onClick={() => setActiveView('analysis')}
                  className={`py-2 px-1 border-b-2 font-medium text-sm ${
                    activeView === 'analysis' ? 'border-blue-500 text-blue-600' : 'border-transparent text-gray-500 hover:text-gray-700'
                  }`}
                >
                  Input File Analysis ({matchResults.length} rows)
                </button>
                <button
                  onClick={() => setActiveView('tables')}
                  className={`py-2 px-1 border-b-2 font-medium text-sm ${
                    activeView === 'tables' ? 'border-blue-500 text-blue-600' : 'border-transparent text-gray-500 hover:text-gray-700'
                  }`}
                >
                  Tables (Side-by-side)
                </button>
              </nav>
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
                      <div className="flex items-center gap-2 mb-2 flex-wrap">
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
                        {/* Match indicators */}
                        {result.dateMatch && (
                          <span className="px-2 py-0.5 text-xs rounded-full bg-blue-100 text-blue-700 font-medium">
                            📅 Date Match
                          </span>
                        )}
                        {result.referenceMatch && (
                          <span className="px-2 py-0.5 text-xs rounded-full bg-purple-100 text-purple-700 font-medium">
                            🔖 Ref Match
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
                {/* Tables sub-tabs */}
                <div className="mb-3 border-b border-gray-200">
                  <nav className="flex space-x-6 px-1">
                    <button
                      onClick={() => setActiveTablesTab('input')}
                      className={`py-2 text-sm font-medium border-b-2 ${
                        activeTablesTab === 'input' ? 'border-blue-500 text-blue-600' : 'border-transparent text-gray-500 hover:text-gray-700'
                      }`}
                    >
                      Input CSV
                    </button>
                    <button
                      onClick={() => setActiveTablesTab('output')}
                      className={`py-2 text-sm font-medium border-b-2 ${
                        activeTablesTab === 'output' ? 'border-blue-500 text-blue-600' : 'border-transparent text-gray-500 hover:text-gray-700'
                      }`}
                    >
                      Output CSV
                    </button>
                    <button
                      onClick={() => setActiveTablesTab('sideBySide')}
                      className={`py-2 text-sm font-medium border-b-2 ${
                        activeTablesTab === 'sideBySide' ? 'border-blue-500 text-blue-600' : 'border-transparent text-gray-500 hover:text-gray-700'
                      }`}
                    >
                      Tables (Side-by-side)
                    </button>
                  </nav>
                </div>

                {(() => {
                  const inputRowToType = new Map<number, 'exact' | 'partial' | 'no-match'>();
                  const outputRowToType = new Map<number, 'exact' | 'partial' | 'no-match'>();
                  const inputRowToMatches = new Map<number, { dateMatch: boolean; referenceMatch: boolean }>();
                  const outputRowToMatches = new Map<number, { dateMatch: boolean; referenceMatch: boolean }>();
                  
                  matchResults.forEach(r => {
                    inputRowToType.set(r.inputRowIndex, r.matchType);
                    inputRowToMatches.set(r.inputRowIndex, { dateMatch: r.dateMatch, referenceMatch: r.referenceMatch });
                    if (typeof r.outputRowIndex === 'number') {
                      outputRowToType.set(r.outputRowIndex, r.matchType);
                      outputRowToMatches.set(r.outputRowIndex, { dateMatch: r.dateMatch, referenceMatch: r.referenceMatch });
                    }
                  });
                  if (outputFile) {
                    outputFile.rows.forEach((_, idx) => {
                      if (!outputRowToType.has(idx)) outputRowToType.set(idx, 'no-match');
                    });
                  }
                  const colorClass = (idx: number, isInput: boolean): string => {
                    const matches = isInput ? inputRowToMatches.get(idx) : outputRowToMatches.get(idx);
                    if (matches?.dateMatch && matches?.referenceMatch) {
                      return 'bg-green-100 hover:bg-green-200'; // Green for both date and reference match
                    }
                    const t = isInput ? inputRowToType.get(idx) : outputRowToType.get(idx);
                    return t === 'exact' ? 'bg-green-50' : t === 'partial' ? 'bg-yellow-50' : 'bg-red-50';
                  };
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
                              return (
                                <tr key={idx} className={`${colorClass(idx, true)} transition-colors`}>
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
                              return (
                                <tr key={idx} className={`${colorClass(idx, false)} transition-colors`}>
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
        </div>
      </div>
    </>
  );
}
