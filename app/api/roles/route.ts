// app/api/roles/route.ts
import { NextResponse } from 'next/server';
import { getRolesList } from '@/services/roles'; // Import clean service layer

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    // Simply invoke the clean service layer wrapper
    const data = await getRolesList(10);

    return NextResponse.json({
      success: true,
      count: data.length,
      data: data
    }, { status: 200 });

  } catch (error: any) {
    console.error("API Route Error:", error.message || error);
    return NextResponse.json({
      success: false,
      error: "Internal data collection error."
    }, { status: 500 });
  }
}