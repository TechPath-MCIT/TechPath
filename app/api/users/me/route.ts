// app/api/users/me/route.ts
import { NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import * as users from '@/services/users';

export const dynamic = 'force-dynamic';

/**
 * @swagger
 * /api/users/me:
 *   get:
 *     tags:
 *       - Authentication
 *     summary: Get the signed-in user's local record, including their profile_ID
 *     description: >
 *       Resolves the current Clerk session to the local userinfo row, so client
 *       components (which can't call Clerk's server-only auth() helpers directly)
 *       can find their profile_ID for use in other profile-scoped API calls.
 *     responses:
 *       200:
 *         description: Successfully fetched the signed-in user's record.
 *       401:
 *         description: No signed-in Clerk session.
 *       404:
 *         description: Signed in with Clerk but not yet synced into userinfo.
 *       500:
 *         description: Core internal server network execution block.
 */
export async function GET() {
    try {
        const { userId } = await auth();
        if (!userId) {
            return NextResponse.json({ success: false, error: "Not signed in." }, { status: 401 });
        }

        const user = await users.getUserByClerkId(userId);
        if (!user) {
            return NextResponse.json({ success: false, error: "Signed in but not yet synced." }, { status: 404 });
        }

        return NextResponse.json({ success: true, data: user }, { status: 200 });
    } catch (error: any) {
        return NextResponse.json({ success: false, error: error.message }, { status: 500 });
    }
}
