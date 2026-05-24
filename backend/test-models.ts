import { GoogleGenerativeAI } from '@google/generative-ai';
import dotenv from 'dotenv';
dotenv.config();

const apiKey = process.env.GEMINI_API_KEY as string;
const genAI = new GoogleGenerativeAI(apiKey);

async function listModels() {
  try {
    // There is no list models in old SDK, let's try a few models
    const modelsToTest = ["gemini-1.5-flash", "gemini-1.5-flash-latest", "gemini-pro", "gemini-1.0-pro"];
    for (const m of modelsToTest) {
      try {
        const model = genAI.getGenerativeModel({ model: m });
        const result = await model.generateContent("hello");
        console.log(`✅ Model ${m} WORKS`);
      } catch (e: any) {
        console.log(`❌ Model ${m} FAILED: ${e.message}`);
      }
    }
  } catch (error) {
    console.error("Error testing models:", error);
  }
}
listModels();
