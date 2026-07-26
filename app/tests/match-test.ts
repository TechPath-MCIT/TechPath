import { getRoleMatchScores } from "@/services/match";


async function testGetRoleMatchScores(profileId: number) {
    console.log(await getRoleMatchScores(profileId));
}


testGetRoleMatchScores(1)
