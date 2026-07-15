// parse-resume.ts
import { generateObject } from 'ai';
import { google } from '@ai-sdk/google';
import { z } from 'zod';
import { extractText, getDocumentProxy } from 'unpdf'; 
import mammoth from 'mammoth'; 
import * as fs from 'fs/promises';
import * as path from 'path';
import * as dotenv from 'dotenv';

dotenv.config({ path: '.env.local' });

async function runResumeParserTest() {
  const TARGET_FILE = "./test3.docx"; 

  try {
    console.log(`\x1b[36m[TechPath] Target File:\x1b[0m ${TARGET_FILE}`);

    const absolutePath = path.resolve(TARGET_FILE);
    try {
      await fs.access(absolutePath);
    } catch {
      throw new Error(`File not found at ${absolutePath}.`);
    }

    const fileBuffer = await fs.readFile(absolutePath);
    const fileExtension = path.extname(TARGET_FILE).toLowerCase();
    
    let unifiedText = "";

    // 1. DYNAMIC FORMAT ROUTING LAYER
    if (fileExtension === '.docx') {
      console.log(`\x1b[33m[TechPath] Parsing Word document text layers with mammoth...\x1b[0m`);
      const result = await mammoth.extractRawText({ buffer: fileBuffer });
      unifiedText = result.value;
    } else if (fileExtension === '.pdf') {
      console.log(`\x1b[33m[TechPath] Parsing PDF text layers with unpdf...\x1b[0m`);
      const pdfProxy = await getDocumentProxy(new Uint8Array(fileBuffer));
      const { text: rawResumeText } = await extractText(pdfProxy, { mergePages: true });
      unifiedText = Array.isArray(rawResumeText) ? rawResumeText.join("\n") : rawResumeText;
    } else {
      throw new Error(`Unsupported file extension: ${fileExtension}. Please provide a .pdf or .docx file.`);
    }

    if (!unifiedText || !unifiedText.trim()) {
      throw new Error("Document layout contains no discoverable text characters.");
    }

    // --- RESTORED: PRINTING THE EXTRACTED RESUME RAW TEXT ---
    console.log(`\n\x1b[34m==================================================`);
    console.log(`[EXTRACTED RESUME RAW TEXT START]`);
    console.log(`==================================================\x1b[0m\n`);
    
    console.log(unifiedText);
    
    console.log(`\n\x1b[34m==================================================`);
    console.log(`[EXTRACTED RESUME RAW TEXT END]`);
    console.log(`==================================================\x1b[0m\n`);
    // --------------------------------------------------------

    console.log(`\x1b[33m[TechPath] Transmitting data to Gemini 2.5...\x1b[0m`);

    // 2. Leverage Vercel AI SDK to compile schemas
    const { object } = await generateObject({
      model: google('gemini-2.5-flash'), 
      apiKey: process.env.GOOGLE_GENERATIVE_AI_API_KEY || process.env.GEMINI_API_KEY,
      schema: z.object({
        name: z.string().describe("Candidate full name"),
        email: z.string().describe("Candidate primary email address"),
        skills: z.array(z.string()).describe("List of code frameworks, languages, systems, and hard skills found."),
        education: z.array(
          z.object({
            school: z.string().describe("Full official name of the university or institution"),
            degree: z.string().describe("The degree obtained or pursued, including major/field of study"),
            dateRange: z.string().describe("The start and end date or graduation year"),
            gpa: z.string().optional().describe("GPA if explicitly stated")
          })
        ),
        experience: z.array(
          z.object({
            company: z.string().describe("The name of the company or organization"),
            location: z.string().optional().describe("The physical location"),
            roles: z.array(
              z.object({
                title: z.string().describe("The official job title for this specific period"),
                dateRange: z.string().describe("The dates employed in this specific role"),
                bullets: z.array(z.string()).describe("Array of accomplishments and responsibilities")
              })
            )
          })
        )
      }),
      prompt: `Extract structural criteria fields out of this plain-text resume:\n\n${unifiedText}`,
    });

    console.log(`\n\x1b[32m[TechPath] SUCCESS! Structured Profile Output:\x1b[0m`);
    console.log(JSON.stringify(object, null, 2));

  } catch (error: any) {
    console.error(`\n\x1b[31m[TechPath] Execution Dropped:\x1b[0m`, error.message || error);
  }
}

runResumeParserTest();