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
import * as skills from "@/services/skills";
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
type Project = {
  name: string,
  dateRange?: string,
  bullets: Array<string>,
}
export interface parsed_resume{
  name?: string;
  email?: string;
  location?: string;
  skills?: Array<string>;
  education?: string;
  educationHistory?: Array<EducationEntry>;
  experiences?: Array<Experience> ;
  projects?: Array<Project>;
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

    if (!unifiedText.trim()) {
      return {
        success: false,
        error_msg:
          "No readable text was found in this resume. Please upload a text-based PDF.",
      };
    }

    const catalog = await skills.getAllSkillNames();

    const { object } = await generateObject({
      model: google('gemini-2.5-flash'),
      schema: z.object({
        name: z.string().describe("Candidate full name"),
        email: z.string().describe("Candidate primary email address"),
        location: z.string().optional().describe("Candidate location, e.g. city and state/country, if listed on the resume"),
        skills: z.array(z.string()).describe(
          "List of code frameworks, languages, systems, and hard skills found. " +
          "When a found skill matches an entry in the provided skill catalog — including by " +
          "common abbreviation or synonym (e.g. \"AI\" matching \"Artificial Intelligence\") — " +
          "use that catalog entry's exact spelling. Keep skills not in the catalog as written."
        ),
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
        ),

        projects: z.array(
            z.object({
              name: z.string().describe("The project's name or title"),
              dateRange: z.string().optional().describe("When the project was worked on, e.g. 'Fall 2024' or '2023 - 2024', if listed"),
              bullets: z.array(z.string()).describe("Accomplishments, tools, and technologies used in this project")
            })
        ).describe(
          "Academic, personal, and class projects listed on the resume — keep these separate from " +
          "the 'experience' array even if they appear under a heading like 'Projects' or 'Academic Projects' " +
          "rather than 'Experience'; do not merge a project into experience just because it resembles a job."
        )

      }),
      prompt: `Extract structural criteria fields out of this plain-text resume:\n\n${unifiedText}\n\nKnown skill catalog (map matches to these exact names):\n${catalog.join(', ')}`,
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
      projects: object.projects,
      rawText: unifiedText,
      success: true,
    }


    return resume;

  }

  catch (error) {
    console.error("Resume parsing failed:", error);

    return {
      success: false,
      error_msg: "Unable to process this resume. Please try another PDF.",
    };
  }

}
