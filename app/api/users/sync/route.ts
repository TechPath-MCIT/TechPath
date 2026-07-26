// app/api/users/sync/route.ts
import { redirect } from 'next/navigation';
import { currentUser } from '@clerk/nextjs/server';
import * as users from '@/services/users';

export const dynamic = 'force-dynamic';

/**
 * @swagger
 * /api/users/sync:
 *   get:
 *     tags:
 *       - Authentication
 *     summary: Sync the signed-in Clerk identity into the local userinfo table
 *     description: >
 *       Hit once, right after Clerk's sign-in/sign-up redirect (via fallbackRedirectUrl 
 *       on the SignIn/SignUp components). Idempotently upserts a User row keyed on clerkId, 
 *       then redirects on to the app's normal landing route.
 *     responses:
 *       302:
 *         description: Sync succeeded (or was skipped for an unauthenticated request); redirects onward.
 *         headers:
 *           Location:
 *             description: The target dashboard URL where the user is redirected.
 *             schema:
 *               type: string
 *               example: /dashboard
 *       500:
 *         description: Internal server error during Prisma database sync execution.
 */
export async function GET() {
    const user = await currentUser();

    if (!user) {
        redirect('/sign-in');
    }

    const syncedUser = await users.syncUserFromClerk({
        clerkId: user.id,
        username: user.username ?? user.firstName ?? null,
        useremail: user.primaryEmailAddress?.emailAddress ?? null,
    });

    redirect(syncedUser.profile_ID ? "/landscape" : "/resume-upload");
}
