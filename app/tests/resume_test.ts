import {resumeParser} from "@/app/actions/resume";

async function runResumeParserTest() {
    const TARGET_FILE = "./app/tests/test_resumes/test.pdf";

    const object = await resumeParser(TARGET_FILE);

    console.log(JSON.stringify(object, null, 2));

}

runResumeParserTest();