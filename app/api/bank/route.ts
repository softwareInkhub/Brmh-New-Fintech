import { NextResponse } from 'next/server';
import { brmhCrud, TABLES } from '../brmh-client';
import { verifyAdmin } from '../_utils/iam';
import { v4 as uuidv4 } from 'uuid';

export async function GET() {
  try {
    // Fetch all banks (global banks for all users)
    const allBanks: Record<string, unknown>[] = [];
    let lastEvaluatedKey: Record<string, unknown> | undefined = undefined;
    let hasMoreItems = true;
    
    while (hasMoreItems) {
      const result = await brmhCrud.scan(TABLES.BANKS, { 
        itemPerPage: 100 
      });
      const banks = result.items || [];
      allBanks.push(...banks);
      
      // Check if there are more items to fetch
      lastEvaluatedKey = result.lastEvaluatedKey;
      hasMoreItems = !!lastEvaluatedKey;
      
      // Add a small delay to avoid overwhelming DynamoDB
      if (hasMoreItems) {
        await new Promise(resolve => setTimeout(resolve, 100));
      }
    }

    return NextResponse.json(allBanks);
  } catch (error) {
    console.error('Error fetching banks:', error);
    return NextResponse.json(
      { error: 'Failed to fetch banks' },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  try {
    const { bankName, tags, userId } = await request.json();

    if (!bankName) {
      return NextResponse.json(
        { error: 'Bank name is required' },
        { status: 400 }
      );
    }

    if (!userId) {
      return NextResponse.json(
        { error: 'userId is required' },
        { status: 400 }
      );
    }

    // IAM: Only admins can create banks
    const iam = await verifyAdmin(userId);
    if (!iam.isAdmin) {
      return NextResponse.json({ error: 'Only admin can create banks' }, { status: 403 });
    }

    const id = uuidv4();
    const bank = {
      id,
      bankName,
      tags: Array.isArray(tags) ? tags : [],
      createdBy: userId, // Track who created the bank
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    await brmhCrud.create(TABLES.BANKS, bank);

    return NextResponse.json(bank);
  } catch (error) {
    console.error('Error creating bank:', error);
    return NextResponse.json(
      { error: 'Failed to create bank' },
      { status: 500 }
    );
  }
} 