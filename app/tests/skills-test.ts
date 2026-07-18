import {getSkillByName} from "@/services/skills"


function testSkillByName(name: string) {
    console.log(getSkillByName(name));
}


testSkillByName("Python")