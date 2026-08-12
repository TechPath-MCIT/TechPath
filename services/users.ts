// services/users.ts
import { prisma } from '@/lib/db';

export type ClerkSyncInput = {
    clerkId: string;
    username: string | null;
    useremail: string | null;
};

/**
 * Idempotently syncs a Clerk-authenticated identity into the local `userinfo` table.
 * Looks up by `clerkId`; the internal `id` stays an autoincrementing int.
 * Never touches `profile_ID` — a Profile is created later via the resume-upload flow.
 */
export async function syncUserFromClerk(input: ClerkSyncInput) {
    return prisma.user.upsert({
        where: { clerkId: input.clerkId },
        update: {
            username: input.username,
            useremail: input.useremail,
        },
        create: {
            clerkId: input.clerkId,
            username: input.username,
            useremail: input.useremail,
        },
    });
}

/**
 * Fetches the local User row for a given Clerk ID, or null if not synced yet.
 */
export async function getUserByClerkId(clerkId: string) {
    return prisma.user.findUnique({
        where: { clerkId },
    });
}

/**
 * Fetches a Clerk-authenticated user's local row together with their linked
 * Profile and that Profile's dream Role, in a single query — used by the
 * workspace layout, which previously ran these as 3 sequential round trips
 * (getUserByClerkId, then getProfileById, then getRoleById).
 */
export async function getUserWithProfileByClerkId(clerkId: string) {
    return prisma.user.findUnique({
        where: { clerkId },
        include: {
            profile: {
                include: { dreamRole: true },
            },
        },
    });
}

/**
 * Links a User to the Profile created from their resume upload.
 */
export async function linkProfileToUser(clerkId: string, profile_ID: number) {
    return prisma.user.update({
        where: { clerkId },
        data: { profile_ID },
    });
}
