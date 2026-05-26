import { NextRequest, NextResponse } from 'next/server';
import { geminiFlash, GARMENT_ANALYSIS_PROMPT, base64ToFilePart } from '@/lib/gemini';

export async function POST(req: NextRequest) {
  try {
    const { imageBase64, mimeType } = await req.json();

    if (!imageBase64 || !mimeType) {
      return NextResponse.json(
        { error: 'imageBase64 and mimeType are required fields.' },
        { status: 400 }
      );
    }

    const imagePart = base64ToFilePart(imageBase64, mimeType);

    const result = await geminiFlash.generateContent([
      GARMENT_ANALYSIS_PROMPT,
      imagePart,
    ]);

    const response = await result.response;
    const text = response.text().trim();

    // Remove markdown codeblock formatting if Gemini accidentally wraps the JSON output
    const cleanedText = text.replace(/^```json\s*/i, '').replace(/```$/, '').trim();
    
    try {
      const parsedData = JSON.parse(cleanedText);
      return NextResponse.json({ data: parsedData });
    } catch {
      console.error('Failed to parse Gemini output:', text);
      return NextResponse.json(
        { error: 'Invalid JSON response from Gemini.', raw: text },
        { status: 500 }
      );
    }
  } catch (error) {
    console.error('Garment analysis error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'An error occurred during analysis.' },
      { status: 500 }
    );
  }
}
