import { NextRequest, NextResponse } from 'next/server';
import { geminiFlash, STYLE_ASSISTANT_SYSTEM_PROMPT } from '@/lib/gemini';
import { createClient } from '@/utils/supabase/server';

export async function POST(req: NextRequest) {
  try {
    const { messages } = await req.json(); // Array of { role: 'user'|'assistant', content: string }

    if (!messages || !Array.isArray(messages)) {
      return NextResponse.json(
        { error: 'Messages array is required.' },
        { status: 400 }
      );
    }

    // 1. Initialize Supabase client
    const supabase = await createClient();

    // 2. Fetch the authenticated user
    const { data: { user }, error: userError } = await supabase.auth.getUser();
    if (userError || !user) {
      return NextResponse.json(
        { error: 'Unauthorized.' },
        { status: 401 }
      );
    }

    // 3. Fetch user's garments
    const { data: garments, error: dbError } = await supabase
      .from('garments')
      .select('*')
      .order('created_at', { ascending: false });

    if (dbError) {
      console.error('Database fetch error:', dbError);
    }

    // 4. Construct wardrobe context string
    let wardrobeContext = 'The user currently has no items in their digital wardrobe. Advise them to upload some clothes to get personalized styling recommendations.';
    if (garments && garments.length > 0) {
      wardrobeContext = 'Here are the items currently in the user\'s wardrobe:\n' +
        garments.map((g, i) => {
          return `${i + 1}. [ID: ${g.id}] Brand: ${g.brand || 'Unknown'}, Category: ${g.category}, Subcategory: ${g.subcategory || 'N/A'}, Era: ${g.era || 'N/A'}, Fabrics: ${g.fabrics?.join(', ') || 'N/A'}, Colours: ${g.colours?.join(', ') || 'N/A'}, AI Summary: ${g.ai_summary || 'N/A'}, Notes: ${g.notes || 'None'}`;
        }).join('\n');
    }

    // 5. Build system instruction prompt
    const systemInstruction = `${STYLE_ASSISTANT_SYSTEM_PROMPT}\n\n[WARDROBE_CONTEXT]\n${wardrobeContext}`;

    // 6. Format chat history for Gemini (model expects 'model' instead of 'assistant').
    // Gemini expects the first message in the chat history to be from the 'user' role.
    // Since the client initializes the conversation with an assistant welcome message,
    // we must filter the history so that it begins with the first 'user' message.
    const firstUserIndex = messages.findIndex((msg: { role: string }) => msg.role === 'user');
    const historyMessages = firstUserIndex !== -1 && firstUserIndex < messages.length - 1
      ? messages.slice(firstUserIndex, -1)
      : [];

    const formattedHistory = historyMessages.map((msg: { role: string; content: string }) => ({
      role: msg.role === 'user' ? 'user' : 'model',
      parts: [{ text: msg.content }],
    }));

    const currentMessage = messages[messages.length - 1].content;

    // Start chat with system instructions. We manually structure systemInstruction as a Content object
    // to bypass an SDK limitation where strings passed to startChat are not correctly formatted
    // before being sent to the Google Generative Language REST API.
    const chat = geminiFlash.startChat({
      history: formattedHistory,
      systemInstruction: {
        role: 'system',
        parts: [{ text: systemInstruction }],
      },
    });

    const responseResult = await chat.sendMessage(currentMessage);
    const replyText = responseResult.response.text();

    return NextResponse.json({ reply: replyText });
  } catch (error) {
    console.error('Style chat error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'An error occurred during styling chat.' },
      { status: 500 }
    );
  }
}
