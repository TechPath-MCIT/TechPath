// services/skillRatings.ts
import { prisma } from '@/lib/db';

/**
 * Reads cached AI skill-proficiency ratings for a profile/role pair.
 */
export async function getCachedRatings(profileId: number, roleId: number) {
    return prisma.profileSkillRating.findMany({
        where: { profileId, roleId },
    });
}

export type NewRating = {
    skillId: number;
    proficiency: number;
    rationale: string;
};

/**
 * Persists freshly computed ratings for a profile/role pair. Uses per-row
 * upserts (rather than createMany) so a rating for a skill that somehow
 * already exists (e.g. a race between two requests) is overwritten instead
 * of throwing a unique-constraint error.
 */
export async function upsertRatings(profileId: number, roleId: number, ratings: NewRating[]) {
    return Promise.all(
        ratings.map((rating) =>
            prisma.profileSkillRating.upsert({
                where: {
                    profileId_roleId_skillId: {
                        profileId,
                        roleId,
                        skillId: rating.skillId,
                    },
                },
                update: {
                    proficiency: rating.proficiency,
                    rationale: rating.rationale,
                },
                create: {
                    profileId,
                    roleId,
                    skillId: rating.skillId,
                    proficiency: rating.proficiency,
                    rationale: rating.rationale,
                },
            }),
        ),
    );
}
