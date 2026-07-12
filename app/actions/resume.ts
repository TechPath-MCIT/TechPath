"use server";

import { generateObject } from 'ai';
import { google } from '@ai-sdk/google';
import { z } from 'zod';
import PdfParse from 'pdf-parse';
import fs from 'fs/promises';
import path from 'path';

export async function parseResumeWithAI(relativeFilePath: string) {
  try {
    const absolutePath = path.resolve(relativeFilePath);
    
    // 1. Read PDF file into binary buffer natively in Node
    const fileBuffer = await fs.readFile(absolutePath);
    
    // 2. Extract raw plain text from PDF structure
    const pdfData = await PdfParse(fileBuffer);
    const rawResumeText = pdfData.text;

    if (!rawResumeText.trim()) {
      throw new Error("PDF contains no readable text layers (scanned image).");
    }

    // 3. Leverage Vercel AI SDK to enforce structural schema compliance
    const { object } = await generateObject({
      // CHANGE THIS LINE FROM 'gemini-2.0-flash' TO 'gemini-1.5-flash'
      model: google('gemini-1.5-flash'), 
      apiKey: process.env.GOOGLE_GENERATIVE_AI_API_KEY,
      schema: z.object({
        name: z.string().describe("Candidate full name"),
        email: z.string().describe("Candidate primary email address"),
        skills: z.array(z.string()).describe("List of code frameworks, languages, systems, and hard skills found."),
        education: z.string().describe("Academic summaries including majors, years, and schools."),
        experience: z.string().describe("Markdown list summary mapping employment tracking history.")
      }),
      prompt: `Extract structural criteria fields out of this plain-text resume:\n\n${unifiedText}`,
    });

    return { success: true, data: object };

  } catch (error: any) {
    console.error("Node resume parsing exception:", error.message || error);
    return { success: false, error: error.message || "Failed extraction execution." };
  }
}