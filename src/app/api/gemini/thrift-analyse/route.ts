import { NextRequest, NextResponse } from 'next/server';
import { geminiPro, THRIFT_INTELLIGENCE_PROMPT, base64ToFilePart } from '@/lib/gemini';
import { createClient } from '@/utils/supabase/server';

export async function POST(req: NextRequest) {
  try {
    const { images } = await req.json(); // Array of { imageBase64, mimeType }

    if (!images || !Array.isArray(images) || images.length === 0) {
      return NextResponse.json(
        { error: 'An array of images is required.' },
        { status: 400 }
      );
    }

    // 1. Authenticate user session
    const supabase = await createClient();
    const { data: { user }, error: userError } = await supabase.auth.getUser();
    if (userError || !user) {
      return NextResponse.json(
        { error: 'Unauthorized.' },
        { status: 401 }
      );
    }

    // 2. Fetch custom AI styling/thrift instructions
    const { data: profile } = await supabase
      .from('profiles')
      .select('ai_instructions')
      .eq('id', user.id)
      .single();

    const customInstructions = profile?.ai_instructions
      ? `\n\nUSER CUSTOM THRIFT & QUALITY GUIDELINES (Strictly prioritize and apply these rules to your quality assessment, brand appraisal, fiber checks, and purchase advice):\n${profile.ai_instructions}`
      : '';

    const finalPrompt = `${THRIFT_INTELLIGENCE_PROMPT}${customInstructions}`;

    const imageParts = images.map((img: { imageBase64: string; mimeType: string }) =>
      base64ToFilePart(img.imageBase64, img.mimeType)
    );

    const result = await geminiPro.generateContent([
      finalPrompt,
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
