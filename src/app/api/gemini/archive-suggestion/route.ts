import { NextRequest, NextResponse } from 'next/server';
import { geminiFlash } from '@/lib/gemini';
import { createClient } from '@/utils/supabase/server';

export async function POST(req: NextRequest) {
  try {
    const { garment } = await req.json();

    if (!garment) {
      return NextResponse.json(
        { error: 'Garment data is required.' },
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

    // 2. Build Appraisal Prompt
    const garmentDetails = `
      Garment Details:
      - Category: ${garment.category}
      - Subcategory: ${garment.subcategory || 'N/A'}
      - Brand: ${garment.brand || 'Unknown / Vintage'}
      - Era: ${garment.era || 'Contemporary'}
      - Fabrics: ${garment.fabrics?.join(', ') || 'N/A'}
      - Colours: ${garment.colours?.join(', ') || 'N/A'}
      - Purchase Price: ${garment.purchase_price ? `RM ${garment.purchase_price.toFixed(2)}` : 'Unknown'}
      - Wear Count: ${garment.worn_count} wears
      - Notes: ${garment.notes || 'None'}
      - AI Summary: ${garment.ai_summary || 'N/A'}
    `;

    const prompt = `
      You are an expert vintage clothing appraiser, archivist, and wardrobe consultant.
      The user is reviewing this garment in their closet because they have worn it very little or not at all (Wear Count: ${garment.worn_count}).
      Evaluate the item's brand equity, material quality, and current vintage/secondhand trends.
      Decide whether they should:
      1. STYLE it (keep it and try to wear it again with a specific styling tip).
      2. SELL it (sell it on secondhand markets like Grailed, Carousell, or eBay).
      3. DONATE it (it has low resale value but is still usable).

      ${garmentDetails}

      Provide your appraisal ONLY in valid JSON matching this schema:
      {
        "recommendation": "STYLE" | "SELL" | "DONATE",
        "resaleValueRange": "string (e.g. 'RM 80 - RM 120' or 'Low resale value')",
        "explanation": "A concise 1-2 sentence explanation of your recommendation based on the fabrics, brand power, and current market demand.",
        "outfitIdea": "A specific, stylish outfit pairing suggestion from a typical wardrobe (e.g. 'Pair it with olive fatigues and brown loafers') to give the piece a final chance."
      }
      Do not include any markdown wrap like \`\`\`json. Return only raw JSON.
    `;

    const result = await geminiFlash.generateContent([prompt]);
    const response = await result.response;
    const text = response.text().trim();

    const cleanedText = text.replace(/^```json\s*/i, '').replace(/```$/, '').trim();

    try {
      const parsedData = JSON.parse(cleanedText);
      return NextResponse.json({ data: parsedData });
    } catch {
      console.error('Failed to parse Gemini archival suggestion output:', text);
      return NextResponse.json(
        { error: 'Invalid JSON response from Gemini.', raw: text },
        { status: 500 }
      );
    }
  } catch (error) {
    console.error('Archival suggestion error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'An error occurred during archival suggestion.' },
      { status: 500 }
    );
  }
}
