import { NextResponse } from 'next/server';
import { pool } from '@/lib/db';

export async function GET() {
  try {
    const result = await pool.query('SELECT NOW() as current_time, version();');
    return NextResponse.json({
      success: true,
      message: "Connected to AWS RDS PostgreSQL!",
      timestamp: result.rows[0].current_time,
      version: result.rows[0].version
    });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}