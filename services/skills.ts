// services/route.ts

import { prisma } from '@/lib/db';

/**
 * Fetches a bounded list of [id] from the cloud database
 * @param limit Number of records to return
 */
export async function getSkillsList(limit: number = 10) {
    return prisma.skill.findMany({
        take: limit,
        orderBy: {
            skillId: 'asc', // Keeps the output in a consistent order
        },
    });
}

/**
 *
 * Fetches a single role matching a specific ID parameter
 */
export async function getSkillById(skillId: number) {
    return prisma.skill.findUnique({
        where: {
            skillId: skillId, // Uses the mapped 'skill ID' primary key
        },
    });
}

export async function getSkillByName(skill: string) {
    const name_formated = skill.toLowerCase();

    return prisma.skill.findFirst({
        select:{
            skillId : true
        },
        where:{
            name: {
                equals: name_formated,
                mode: 'insensitive',
            },
            },

    })
}



/**
 * Inserts a brand new tracking role record down into AWS RDS

 export async function createNewRole(title: string) {
 return await prisma.role.create({
 data: {
 role: title, // Maps to the text column 'role' in your DDL
 // Note: If you add custom inputs for salaries or importance values later,
 // you pass them directly here (e.g., entrySalary: 85000)
 },
 });
 }
 */