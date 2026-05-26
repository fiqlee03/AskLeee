import { GoogleGenerativeAI } from '@google/generative-ai';

const apiKey = process.env.GOOGLE_GEMINI_API_KEY;
if (!apiKey) {
  throw new Error('GOOGLE_GEMINI_API_KEY is not defined.');
}

const genAI = new GoogleGenerativeAI(apiKey);

// Helper to determine if an error is a quota/rate limit error (429)
function isQuotaError(error: any): boolean {
  if (!error) return false;
  if (error.status === 429) return true;
  const msg = error.message?.toLowerCase() || '';
  return (
    msg.includes('429') ||
    msg.includes('quota') ||
    msg.includes('too many requests') ||
    msg.includes('rate limit')
  );
}

class FallbackGenerativeModel {
  constructor(private modelNames: string[]) {}

  private async executeWithFallback<T>(
    operation: (model: any) => Promise<T>
  ): Promise<T> {
    let lastError: any = null;
    for (const modelName of this.modelNames) {
      try {
        console.log(`[Gemini API] Attempting operation with model: ${modelName}`);
        const modelInstance = genAI.getGenerativeModel({ model: modelName });
        const result = await operation(modelInstance);
        console.log(`[Gemini API] Successfully completed operation with model: ${modelName}`);
        return result;
      } catch (error: any) {
        if (isQuotaError(error)) {
          console.warn(`[Gemini API] Quota/Rate Limit (429) exceeded for model ${modelName}. Retrying with next fallback model...`);
          lastError = error;
          continue;
        }
        // If it's a validation error or something else, we might still want to try fallback,
        // but let's log it clearly.
        console.error(`[Gemini API] Error occurred with model ${modelName}:`, error);
        lastError = error;
        continue;
      }
    }
    throw lastError || new Error('All Gemini fallback models failed.');
  }

  async generateContent(request: any): Promise<any> {
    return this.executeWithFallback((model) => model.generateContent(request));
  }

  startChat(config?: any): any {
    // Return a wrapped chat session that delegates sendMessage with fallback
    return {
      sendMessage: async (parts: any) => {
        return this.executeWithFallback(async (model) => {
          const chat = model.startChat(config);
          return await chat.sendMessage(parts);
        });
      }
    };
  }
}

// Fallback chain for free-tier:
// 1. gemini-3.5-flash (primary, newest, fast, high quality)
// 2. gemini-2.5-flash (secondary, standard 2.5)
// 3. gemini-flash-latest (last resort fallback, very high limit: 1500 RPD free tier limit)
const fallbackChain = ['gemini-3.5-flash', 'gemini-2.5-flash', 'gemini-flash-latest'];

export const geminiPro = new FallbackGenerativeModel(fallbackChain) as any;
export const geminiFlash = new FallbackGenerativeModel(fallbackChain) as any;


export interface FilePart {
  inlineData: {
    data: string;
    mimeType: string;
  };
}

// Utility to convert a base64 image string into Gemini-compatible format
export function base64ToFilePart(base64Data: string, mimeType: string): FilePart {
  // Strip metadata prefix (e.g., "data:image/png;base64,") if present
  const data = base64Data.includes('base64,') 
    ? base64Data.split('base64,')[1] 
    : base64Data;

  return {
    inlineData: {
      data,
      mimeType,
    },
  };
}

// --- Prompts ---

export const GARMENT_ANALYSIS_PROMPT = `
You are a fashion cataloguer with expertise in vintage clothing, natural fibres, and heritage brands.
Analyse this garment image and return a JSON object containing the details.
Focus on construction quality, fabric texture, label design, and silhouette era.

Respond ONLY with a valid JSON object matching this schema:
{
  "category": "tops" | "bottoms" | "footwear" | "shoes" | "accessories",
  "subcategory": "string (e.g. Oxford shirt, Chino, Harrington jacket)",
  "brand": "string or null",
  "era": "string or null (e.g. 1970s, 1990s, Contemporary)",
  "colours": ["string"],
  "fabrics": ["string (e.g. 100% wool, cotton/linen blend)"],
  "is_natural_fibre": boolean,
  "tags": ["string"],
  "ai_summary": "string (a concise one-sentence description)"
}
Do not wrap the response in markdown code blocks like \`\`\`json. Return only the raw JSON.
`;

export const STYLE_ASSISTANT_SYSTEM_PROMPT = `
You are ASKLEE, a personal style advisor with the taste level of a seasoned vintage collector and menswear enthusiast.
You prize natural fibres, considered dressing, and clothes that improve with age.

Give direct, specific outfit advice based on the user's closet items provided below. Reference actual items by name and details.
Be concise, stylish, and direct — no more than 3 short paragraphs.
`;

export const THRIFT_INTELLIGENCE_PROMPT = `
You are an expert in vintage clothing authentication and quality assessment.
The user is considering purchasing a thrifted item. Analyse the provided label, care tag, and/or garment images to return a structured assessment.

Prioritise: natural fibres (wool, linen, silk, cotton, cashmere), heritage brands (UK, US, Italian, Japanese makers), pre-1990s construction, union labels, and "Made in [quality country]" indicators.
Red flags: polyester/synthetic blends over 30%, low-quality fast fashion brands, poor seam quality.

Respond ONLY with a valid JSON object matching this schema:
{
  "verdict": "BUY" | "PASS" | "CONSIDER",
  "confidenceScore": number (0-100),
  "brandAssessment": "string detailing brand heritage and quality tier",
  "fibreAnalysis": "string detailing fabric blend and quality assessment",
  "eraEstimate": "string detailing decade or era estimate with clues",
  "qualitySignals": ["string of positive findings"],
  "redFlags": ["string of concerns"],
  "maxFairPrice": number or null (suggested ceiling price in MYR),
  "reasoning": "string with final reasoning"
}
Do not wrap the response in markdown code blocks like \`\`\`json. Return only the raw JSON.
`;
