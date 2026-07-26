// parse-resume.ts
import { generateObject } from 'ai';
import { createGoogleGenerativeAI } from '@ai-sdk/google';
import { z } from 'zod';
import { extractText, getDocumentProxy } from 'unpdf';
import mammoth from 'mammoth';
import * as fs from 'fs/promises';
import * as path from 'path';
import * as dotenv from 'dotenv';
import {createProfile} from "@/services/profiles";
import { NextResponse } from 'next/server';

dotenv.config({ path: '.env.local' });
type Experience = {
  company: string,
  title: string,
  years: number,
  bullets: Array<string>,
}
type EducationEntry = {
  school: string,
  degree: string,
  dateRange: string,
  gpa?: string,
}
export interface parsed_resume{
  name?: string;
  email?: string;
  location?: string;
  skills?: Array<string>;
  education?: string;
  educationHistory?: Array<EducationEntry>;
  experiences?: Array<Experience> ;
  rawText?: string;
  success:boolean;
  error_msg?:string;
}

const google = createGoogleGenerativeAI({
  apiKey: process.env.GOOGLE_GENERATIVE_AI_API_KEY,
});




export async function resumeParser(resume_path : string) : Promise<parsed_resume> {

  const absolutePath = path.resolve(resume_path);
  let unifiedText = "";

  try {
    await fs.access(absolutePath);
  } catch(error) {
    const failure = {
      success: false,
      error_msg: "File not found",
    }
    return failure;
  }
  const fileBuffer = await fs.readFile(absolutePath);
  const fileExtension = path.extname(resume_path).toLowerCase();

  // 1. DYNAMIC FORMAT ROUTING LAYER
  try{
    if (fileExtension === '.docx') {
      const result = await mammoth.extractRawText({ buffer: fileBuffer });
      unifiedText = result.value;
    } else if (fileExtension === '.pdf') {
      const pdfProxy = await getDocumentProxy(new Uint8Array(fileBuffer));
      const { text: rawResumeText } = await extractText(pdfProxy, { mergePages: true });
      unifiedText = Array.isArray(rawResumeText) ? rawResumeText.join("\n") : rawResumeText;
    } else {
      const failure = {
        success: false,
        error_msg: "only .docx or .pdf is allowed",
      }
      return failure;
    }

    const { object } = await generateObject({
      model: google('gemini-2.5-flash'),
      schema: z.object({
        name: z.string().describe("Candidate full name"),
        email: z.string().describe("Candidate primary email address"),
        location: z.string().optional().describe("Candidate location, e.g. city and state/country, if listed on the resume"),
        skills: z.array(z.string()).describe("List of code frameworks, languages, systems, and hard [id] found."),
        education: z.string().describe("Candidate highest level of education, use (B.S or M.S or phD, or other)"),

        educationHistory: z.array(
            z.object({
              school: z.string().describe("The name of the school or university"),
              degree: z.string().describe("The degree and field of study, e.g. B.S. Computer Science"),
              dateRange: z.string().describe("The attendance date range, e.g. 2019 - 2023"),
              gpa: z.string().optional().describe("GPA if listed on the resume")
            })
        ).describe("Every education entry found on the resume"),

        experience: z.array(
            z.object({
              company: z.string().describe("The name of the company or organization"),
              title: z.string().describe("The official job title for this specific period"),
              years: z.number().describe("Yearas employed in this specific role"),
              bullets: z.array(z.string()).describe("Array of accomplishments and responsibilities")
            })
        )

      }),
      prompt: `Extract structural criteria fields out of this plain-text resume:\n\n${unifiedText}`,
    });

    const experiences : Array<Experience> = [];

    for (let i = 0 ; i < object.experience.length; i++) {
      experiences.push({
        company: object.experience[i].company,
        title: object.experience[i].title,
        years: object.experience[i].years,
        bullets: object.experience[i].bullets,
      }
      )
    }

    const resume:parsed_resume = {
      name: object.name,
      email: object.email,
      location: object.location,
      skills: object.skills,
      education: object.education,
      educationHistory: object.educationHistory,
      experiences: experiences,
      rawText: unifiedText,
      success: true,
    }


    return resume;

  }
  catch (error) {
    const failure = {
      success: false,
      error_msg: 'Error while retrieving document',
    }

    return failure;
  }

}




