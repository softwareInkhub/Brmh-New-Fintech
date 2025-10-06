import { NextResponse } from 'next/server';

export const runtime = 'nodejs';

// This endpoint redirects to by-tag-realtime for consistency
export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const newUrl = `/api/transactions/by-tag-realtime?${searchParams.toString()}`;
  
  return NextResponse.redirect(new URL(newUrl, request.url));
}
