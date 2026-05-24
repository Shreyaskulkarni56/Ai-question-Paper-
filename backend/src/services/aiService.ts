import { GoogleGenerativeAI } from '@google/generative-ai';
import dotenv from 'dotenv';

dotenv.config();

// Initialize Gemini client if key is present
const apiKey = process.env.GEMINI_API_KEY;
let genAI: any = null;

if (apiKey && apiKey.trim() !== "") {
  try {
    genAI = new GoogleGenerativeAI(apiKey);
    console.log("Gemini AI Client initialized successfully.");
  } catch (error) {
    console.error("Failed to initialize Gemini AI Client:", error);
  }
}

interface GenerateParams {
  title: string;
  questionTypes: string[];
  numQuestions: number;
  totalMarks: number;
  additionalInstructions?: string;
  fileText?: string;
}

export interface GeneratedAssessment {
  sections: Array<{
    title: string;
    instructions: string;
    questions: Array<{
      id: string;
      text: string;
      options?: string[];
      difficulty: 'easy' | 'medium' | 'hard';
      marks: number;
      answerKey?: string;
    }>;
  }>;
}

/**
 * Main AI Generation entrypoint
 */
export async function generateAssessment(params: GenerateParams, onProgress?: (msg: string, percent: number) => void): Promise<GeneratedAssessment> {
  if (onProgress) onProgress("Initializing generation parameters...", 15);

  if (!genAI) {
    throw new Error("Gemini AI Client not initialized. Please configure a valid API key.");
  }

  try {
    if (onProgress) onProgress("Crafting structured academic prompt...", 30);

    const prompt = buildStructuredPrompt(params);
    // console.log("=== GEMINI API DEBUG: STARTING GENERATION ===");
    // console.log("=== PROMPT BEING SENT TO GEMINI ===");
    // console.log(prompt);

    if (onProgress) onProgress("Querying Gemini 1.5 model (awaiting structure)...", 50);

    // Call Gemini API with JSON output enforcement
    const model = genAI.getGenerativeModel({
      model: "gemini-2.5-flash",
      generationConfig: {
        responseMimeType: "application/json",
        temperature: 0.8, // Add temperature to ensure distinct questions
      }
    });

    const result = await model.generateContent(prompt);
    const response = await result.response;
    const textText = response.text();

    // console.log("=== GEMINI API RAW RESPONSE RECEIVED ===");
    // console.log(textText);
    // console.log("=========================================");

    if (onProgress) onProgress("Parsing and validating structured JSON response...", 85);

    const parsedData = JSON.parse(textText) as GeneratedAssessment;

    // Post-validation and sanitization
    if (!parsedData.sections || !Array.isArray(parsedData.sections)) {
      throw new Error("Invalid response format: Missing sections list");
    }

    if (onProgress) onProgress("Assignment structured successfully!", 100);
    return parsedData;
  } catch (error) {
    console.error("Gemini Generation failed:", error);
    if (onProgress) onProgress("Gemini API errored. Please try again later.", 75);
    throw error;
  }
}

function buildStructuredPrompt(params: GenerateParams): string {
  return `
You are an expert academic assessment creator. Create a high-quality, structured examination paper based on the following instructions.

EXAM DETAILS:
- Title / Topic: "${params.title}"
- Question Types Wanted: ${params.questionTypes.join(', ')}
- Total Questions Required: ${params.numQuestions}
- Total Marks Allocated: ${params.totalMarks}
${params.additionalInstructions ? `- Additional Teacher Instructions: "${params.additionalInstructions}"` : ''}
${params.fileText ? `- Reference Textbook/Source Content Provided: "${params.fileText}"` : ''}

OUTPUT FORMAT RULES:
- You MUST respond with a single valid JSON object.
- Do NOT wrap in markdown \`\`\`json blocks. Return raw JSON.
- Organize the questions into logical sections based on question types or difficulty (e.g. "Section A: Multiple Choice Questions", "Section B: Short Answers").
- Distribute marks proportionally across the ${params.numQuestions} questions so that the sum of all question marks exactly equals ${params.totalMarks}.
- Distribute difficulty levels (easy, medium, hard) realistically.
- For Multiple Choice questions (MCQ), you MUST include an "options" array of exactly 4 strings, and a corresponding "answerKey" string matching one of the options.
- For True/False questions, options should be ["True", "False"].
- CRITICAL: Ensure ALL questions are distinct and unique. Avoid repeating the same questions.
- Random variance seed: ${Math.random()} (use this to randomize question selection and phrasing).

JSON SCHEMA EXPECTED:
{
  "sections": [
    {
      "title": "String (e.g., Section A: Multiple Choice)",
      "instructions": "String (e.g., Answer all questions. Each carries 2 marks.)",
      "questions": [
        {
          "id": "String (e.g., q_1)",
          "text": "String (The question text)",
          "options": ["String", "String", "String", "String"], // ONLY for MCQs or True/False
          "difficulty": "easy" | "medium" | "hard",
          "marks": Number,
          "answerKey": "String (correct choice or descriptive answer guideline)"
        }
      ]
    }
  ]
}

Double check that the sum of marks is exactly ${params.totalMarks} and total question count is ${params.numQuestions}. Ensure academic excellence, clarity, and rigorous styling.
`;
}

