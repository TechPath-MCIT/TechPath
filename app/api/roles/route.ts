// app/api/roles/route.ts
import { NextResponse } from 'next/server';
import { getRolesList } from '@/services/roles'; // Imports your clean SQL service layer

export const dynamic = 'force-dynamic';

/**
 * @swagger
 * /api/roles:
 *   get:
 *     tags:
 *       - Roles
 *     summary: Grab a list of roles
 *     description: Fetches a bounded tracking array directly from our AWS RDS database cluster using the internal services query layer.
 *     responses:
 *       200:
 *         description: Successfully fetched positions.
 *       500:
 *         description: Core internal server network execution block.
 */
export async function GET() {
  try {
    const roles = await getRolesList(10);
    return NextResponse.json({ success: true, count: roles.length, data: roles }, { status: 200 });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}