import { NextResponse } from 'next/server';
import { brmhDrive } from '../../brmh-drive-client';
import { brmhCrud, getBankTransactionTable } from '../../brmh-client';

// GET /api/files/[id]?userId=xxx
export async function GET(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const { searchParams } = new URL(request.url);
    const userId = searchParams.get('userId');
    
    if (!userId) {
      return NextResponse.json({ error: 'userId is required' }, { status: 400 });
    }
    
    // Get file details from BRMH Drive
    const fileResult = await brmhDrive.getFileById(userId, id);
    
    return NextResponse.json(fileResult);
  } catch (error) {
    console.error('Error getting file:', error);
    return NextResponse.json({ error: 'Failed to get file' }, { status: 500 });
  }
}

// PATCH /api/files/[id] - Rename file
export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const { userId, newName } = await request.json();
    
    if (!userId || !newName) {
      return NextResponse.json({ error: 'userId and newName are required' }, { status: 400 });
    }
    
    // Rename file using BRMH Drive
    const renameResult = await brmhDrive.renameFile(userId, id, newName);
    
    return NextResponse.json(renameResult);
  } catch (error) {
    console.error('Error renaming file:', error);
    return NextResponse.json({ error: 'Failed to rename file' }, { status: 500 });
  }
}

// DELETE /api/files/[id] - Delete file
export async function DELETE(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const { userId } = await request.json();
    
    if (!userId) {
      return NextResponse.json({ error: 'userId is required' }, { status: 400 });
    }
    
    // First, get file details to find related transactions
    let fileDetails = null;
    try {
      fileDetails = await brmhDrive.getFileById(userId, id);
    } catch (error) {
      console.warn('Could not get file details for cleanup:', error);
    }
    
    // Clean up related transactions if file details are available
    if (fileDetails && fileDetails.name) {
      try {
        // Get user's banks to know which tables to scan
        const banksResult = await brmhCrud.scan('banks', {
          FilterExpression: 'userId = :userId',
          ExpressionAttributeValues: { ':userId': userId }
        });
        const banks = banksResult.items || [];
        
        let totalDeletedTransactions = 0;
        
        // If user has no banks configured, scan common bank tables anyway
        const bankTablesToScan = banks.length > 0 
          ? banks.map((bank: { bankName: string }) => getBankTransactionTable(bank.bankName))
          : ['brmh-hdfc', 'brmh-icici', 'brmh-kotak', 'brmh-idfc', 'brmh-axis', 'brmh-sbi']; // Common bank tables
        
        // For each bank table, scan for transactions linked to this file
        for (const tableName of bankTablesToScan) {
          try {
            // Look for transactions with matching fileName OR statementId (NOT userId - that would delete all user transactions!)
            console.log(`Scanning ${tableName} for transactions with:`, {
              fileName: fileDetails.name,
              statementId: id,
              fileDetails: fileDetails
            });
            
            // Try multiple search strategies to find related transactions
            let transactionResult = { items: [] };
            
            // Strategy 1: Search by fileName and statementId
            try {
              transactionResult = await brmhCrud.scan(tableName, {
                FilterExpression: 'fileName = :fileName OR statementId = :statementId',
                ExpressionAttributeValues: {
                  ':fileName': fileDetails.name,
                  ':statementId': id
                }
              });
              console.log(`Strategy 1 (fileName/statementId): found ${transactionResult.items?.length || 0} transactions`);
            } catch (error) {
              console.warn('Strategy 1 failed:', error);
            }
            
            // Strategy 2: If no results, try searching by userId first, then filter client-side
            if ((transactionResult.items || []).length === 0) {
              try {
                console.log('Strategy 2: Searching by userId first, then filtering client-side');
                const userTransactions = await brmhCrud.scan(tableName, {
                  FilterExpression: 'userId = :userId',
                  ExpressionAttributeValues: {
                    ':userId': userId
                  }
                });
                
                console.log(`Found ${userTransactions.items?.length || 0} total transactions for user`);
                
                // Filter client-side for transactions matching this file
                const filteredTransactions = (userTransactions.items || []).filter((tx: Record<string, unknown>) => {
                  const fileName = (tx.fileName as string) || '';
                  const statementId = (tx.statementId as string) || '';
                  return fileName === fileDetails.name || statementId === id;
                });
                
                console.log(`After client-side filtering: found ${filteredTransactions.length} matching transactions`);
                
                transactionResult = { items: filteredTransactions };
              } catch (error) {
                console.warn('Strategy 2 failed:', error);
              }
            }
            
            const relatedTransactions = transactionResult.items || [];
            console.log(`Scanned ${tableName}: found ${relatedTransactions.length} transactions`);
            
            // Debug: Show sample transaction fields to understand the data structure
            if (relatedTransactions.length > 0) {
              const sampleTx = relatedTransactions[0] as Record<string, unknown>;
              console.log(`Sample transaction from ${tableName}:`, {
                fileName: sampleTx.fileName,
                statementId: sampleTx.statementId,
                id: sampleTx.id,
                userId: sampleTx.userId,
                allFields: Object.keys(sampleTx)
              });
            }
            
            if (relatedTransactions.length > 0) {
              console.log(`Found ${relatedTransactions.length} related transactions in ${tableName} to delete`);
              
              // Delete all related transactions
              const deletePromises = relatedTransactions.map((transaction: { id: string }) =>
                brmhCrud.delete(tableName, { id: transaction.id })
              );
              await Promise.all(deletePromises);
              totalDeletedTransactions += relatedTransactions.length;
            }
          } catch (tableError) {
            console.warn(`Failed to scan table ${tableName}:`, tableError);
            // Continue with other tables even if one fails
          }
        }
        
        if (totalDeletedTransactions > 0) {
          console.log(`Successfully deleted ${totalDeletedTransactions} related transactions`);
        }
      } catch (cleanupError) {
        console.warn('Failed to cleanup related transactions:', cleanupError);
        // Continue with file deletion even if cleanup fails
      }
    }
    
    // Delete file using BRMH Drive
    const deleteResult = await brmhDrive.deleteFile(userId, id);
    
    return NextResponse.json({
      ...deleteResult,
      deletedTransactions: fileDetails ? 'cleanup attempted' : 'no file details available'
    });
  } catch (error) {
    console.error('Error deleting file:', error);
    return NextResponse.json({ error: 'Failed to delete file' }, { status: 500 });
  }
}




