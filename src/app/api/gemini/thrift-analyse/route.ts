import { NextRequest, NextResponse } from 'next/server';
import { geminiPro, THRIFT_INTELLIGENCE_PROMPT, base64ToFilePart } from '@/lib/gemini';

export async function POST(req: NextRequest) {
  try {
    const { images } = await req.json(); // Array of { imageBase64, mimeType }

    if (!images || !Array.isArray(images) || images.length === 0) {
      return NextResponse.json(
        { error: 'An array of images is required.' },
        { status: 400 }
      );
    }

    const imageParts = images.map((img: { imageBase64: string; mimeType: string }) =>
      base64ToFilePart(img.imageBase64, img.mimeType)
    );

    const result = await geminiPro.generateContent([
      THRIFT_INTELLIGENCE_PROMPT,
      ...imageParts,
    ]);

    const response = await result.response;
    const text = response.text().trim();

    const cleanedText = text.replace(/^```json\s*/i, '').replace(/```$/, '').trim();

  try {
      const parsedData = JSON.parse(cleanedText);
      return NextResponse.json({ data: parsedData });
    } catch {
      console.error('Failed to parse Gemini thrift output:', text);
      return NextResponse.json(
        { error: 'Invalid JSON response from Gemini.', raw: text },
        { status: 500 }
      );
    }
  } catch (error) {
    console.error('Thrift analysis error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'An error occurred during thrift analysis.' },
      { status: 500 }
    );
  }  
}
