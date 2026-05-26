'use client';

import { useState, useEffect, useRef } from 'react';
import { createClient } from '@/utils/supabase/client';
import Navigation from '@/components/Navigation';
import { Send, Sparkles, User, Bot, Loader2, ArrowRight, Shirt } from 'lucide-react';
import { GarmentItem } from '@/lib/types';

interface Message {
  role: 'user' | 'assistant';
  content: string;
}

export default function AskStylistPage() {
  const supabase = createClient();
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const [wardrobe, setWardrobe] = useState<GarmentItem[]>([]);
  const [messages, setMessages] = useState<Message[]>([
    {
      role: 'assistant',
      content: "Welcome to your digital atelier. I've reviewed your curated wardrobe. Ask me to assemble an outfit, styling recommendations, or how to pair your thrifted vintage pieces.",
    },
  ]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [wardrobeLoading, setWardrobeLoading] = useState(true);

  // Suggested prompts
  const suggestions = [
    "Assemble an editorial look for a rainy day.",
    "Which tops match best with my vintage items?",
    "Suggest a smart-casual ensemble from my closet.",
  ];

  // Fetch closet context to display on the side
  useEffect(() => {
    async function fetchWardrobe() {
      try {
        const { data } = await supabase
          .from('garments')
          .select('*')
          .order('created_at', { ascending: false });
        if (data) setWardrobe(data);
      } catch (err) {
        console.error('Error fetching wardrobe context:', err);
      } finally {
        setWardrobeLoading(false);
      }
    }
    fetchWardrobe();
  }, [supabase]);

  // Scroll to bottom
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleSendMessage = async (textToSend?: string) => {
    const queryText = textToSend || input;
    if (!queryText.trim() || loading) return;

    if (!textToSend) setInput('');

    const newMessages: Message[] = [...messages, { role: 'user', content: queryText }];
    setMessages(newMessages);
    setLoading(true);

    try {
      const res = await fetch('/api/gemini/style-chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ messages: newMessages }),
      });
      const data = await res.json();
      if (data.error) throw new Error(data.error);

      setMessages((prev) => [...prev, { role: 'assistant', content: data.reply }]);
    } catch (err) {
      console.error(err);
      setMessages((prev) => [
        ...prev,
        {
          role: 'assistant',
          content: "Apologies, I encountered an issue accessing the styling model. Please try again shortly.",
        },
      ]);
    } finally {
      setLoading(false);
    }
  };

  // Helper to format Gemini's Markdown responses to basic HTML structure
  const formatMessageContent = (text: string) => {
    return text.split('\n').map((line, idx) => {
      // Bold text formatting
      let formattedLine = line.replace(/\*\*(.*?)\*\*/g, '<strong class="text-[#c9a96e] font-semibold">$1</strong>');
      // Italic formatting
      formattedLine = formattedLine.replace(/\*(.*?)\*/g, '<span class="italic">$1</span>');

      // Unordered lists
      if (line.startsWith('* ') || line.startsWith('- ')) {
        return (
          <li
            key={idx}
            className="ml-4 list-disc text-sm text-[#f5f0e8] leading-relaxed py-0.5"
            dangerouslySetInnerHTML={{ __html: formattedLine.substring(2) }}
          />
        );
      }

      // Ordered lists (e.g. 1. , 2. )
      const orderedMatch = line.match(/^(\d+)\.\s(.*)/);
      if (orderedMatch) {
        return (
          <li
            key={idx}
            className="ml-5 list-decimal text-sm text-[#f5f0e8] leading-relaxed py-0.5"
            dangerouslySetInnerHTML={{ __html: formattedLine.replace(/^\d+\.\s/, '') }}
          />
        );
      }

      // Plain paragraph line
      return (
        <p
          key={idx}
          className="text-sm text-[#f5f0e8] leading-relaxed min-h-[1rem] py-0.5"
          dangerouslySetInnerHTML={{ __html: formattedLine }}
        />
      );
    });
  };

  return (
    <div className="min-h-screen bg-[#1a1814] text-[#f5f0e8] flex flex-col">
      <Navigation />

      <div className="flex-1 max-w-7xl w-full mx-auto px-4 py-8 sm:px-6 lg:px-8 flex flex-col md:flex-row gap-8">
        
        {/* Left Side: Wardrobe Reference Drawer */}
        <aside className="w-full md:w-80 bg-[#252118] border border-[#c9a96e]/10 p-6 flex flex-col rounded-sm">
          <div className="flex items-center gap-2 border-b border-[#c9a96e]/10 pb-4 mb-4">
            <Shirt className="h-4 w-4 text-[#c9a96e]" />
            <h2 className="font-serif text-xs uppercase tracking-widest text-[#8a8070]">
              Closet Context
            </h2>
          </div>

          <p className="text-xs text-[#8a8070] mb-4 leading-relaxed">
            Gemini reads these specific catalogued items to design your styling looks.
          </p>

          <div className="flex-1 overflow-y-auto space-y-3 pr-2 max-h-[300px] md:max-h-none">
            {wardrobeLoading ? (
              <div className="flex items-center gap-2 py-4 justify-center text-xs text-[#8a8070]">
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
                Retrieving catalog...
              </div>
            ) : wardrobe.length === 0 ? (
              <p className="text-xs text-[#8a8070] italic py-4 text-center">
                No garments catalogued. Upload clothes to begin styling.
              </p>
            ) : (
              wardrobe.map((item) => (
                <div
                  key={item.id}
                  className="flex items-center gap-3 bg-[#1a1814] p-2 border border-[#c9a96e]/5 rounded-sm hover:border-[#c9a96e]/20 transition-all"
                >
                  {item.image_urls?.[0] ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={item.image_urls[0]}
                      alt={item.subcategory || item.category}
                      className="h-10 w-10 object-cover rounded-sm"
                    />
                  ) : (
                    <div className="h-10 w-10 bg-[#252118] flex items-center justify-center rounded-sm">
                      <Shirt className="h-4 w-4 text-[#8a8070]" />
                    </div>
                  )}
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-semibold text-[#f5f0e8] truncate">
                      {item.subcategory || item.category}
                    </p>
                    <p className="text-[10px] text-[#8a8070] truncate">
                      {item.brand || 'Vintage'}
                    </p>
                  </div>
                </div>
              ))
            )}
          </div>
        </aside>

        {/* Right Side: Chat Panel */}
        <main className="flex-1 bg-[#252118] border border-[#c9a96e]/10 flex flex-col rounded-sm h-[calc(100vh-12rem)] min-h-[500px]">
          {/* Header */}
          <div className="flex items-center justify-between px-6 py-4 border-b border-[#c9a96e]/10">
            <div>
              <h1 className="font-serif text-xl font-light text-[#f5f0e8] tracking-wide">
                AI Stylist Chat
              </h1>
              <p className="text-[10px] text-[#8a8070] uppercase tracking-wider font-semibold">
                Gemini 1.5 Flash
              </p>
            </div>
            <Sparkles className="h-5 w-5 text-[#c9a96e] animate-pulse" />
          </div>

          {/* Messages Grid */}
          <div className="flex-1 overflow-y-auto p-6 space-y-6">
            {messages.map((msg, index) => (
              <div
                key={index}
                className={`flex gap-4 max-w-3xl ${msg.role === 'user' ? 'ml-auto flex-row-reverse' : ''}`}
              >
                {/* Avatar */}
                <div
                  className={`h-8 w-8 shrink-0 flex items-center justify-center rounded-sm border ${
                    msg.role === 'user'
                      ? 'border-[#c9a96e]/40 bg-[#c9a96e]/10 text-[#c9a96e]'
                      : 'border-[#c9a96e]/20 bg-[#1a1814] text-[#8a8070]'
                  }`}
                >
                  {msg.role === 'user' ? <User className="h-4 w-4" /> : <Bot className="h-4 w-4" />}
                </div>

                {/* Bubble */}
                <div
                  className={`p-4 rounded-sm border space-y-1 ${
                    msg.role === 'user'
                      ? 'bg-[#c9a96e]/5 border-[#c9a96e]/20 text-[#f5f0e8] max-w-[80%]'
                      : 'bg-[#1a1814]/40 border-[#c9a96e]/5 text-[#f5f0e8]'
                  }`}
                >
                  {msg.role === 'user' ? (
                    <p className="text-sm leading-relaxed">{msg.content}</p>
                  ) : (
                    <div className="space-y-1.5">{formatMessageContent(msg.content)}</div>
                  )}
                </div>
              </div>
            ))}

            {loading && (
              <div className="flex gap-4 max-w-3xl">
                <div className="h-8 w-8 shrink-0 flex items-center justify-center rounded-sm border border-[#c9a96e]/20 bg-[#1a1814] text-[#8a8070]">
                  <Bot className="h-4 w-4" />
                </div>
                <div className="p-4 rounded-sm border bg-[#1a1814]/40 border-[#c9a96e]/5 flex items-center gap-2 text-xs text-[#8a8070]">
                  <Loader2 className="h-3.5 w-3.5 animate-spin text-[#c9a96e]" />
                  Formulating style curation...
                </div>
              </div>
            )}

            <div ref={messagesEndRef} />
          </div>

          {/* Quick suggestions overlay */}
          {messages.length === 1 && (
            <div className="px-6 py-4 bg-[#1a1814]/30 border-t border-[#c9a96e]/5">
              <span className="text-[10px] uppercase font-bold tracking-wider text-[#8a8070] block mb-2">
                Suggested Inquiries
              </span>
              <div className="flex flex-wrap gap-2">
                {suggestions.map((suggestion, idx) => (
                  <button
                    key={idx}
                    onClick={() => handleSendMessage(suggestion)}
                    className="inline-flex items-center gap-1 text-xs text-[#8a8070] hover:text-[#c9a96e] border border-[#c9a96e]/10 hover:border-[#c9a96e]/30 px-3 py-1.5 rounded-sm transition-all text-left bg-[#1a1814]/40 cursor-pointer"
                  >
                    {suggestion}
                    <ArrowRight className="h-3 w-3 shrink-0" />
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Input form */}
          <form
            onSubmit={(e) => {
              e.preventDefault();
              handleSendMessage();
            }}
            className="p-4 border-t border-[#c9a96e]/10 bg-[#1a1814]/50 flex gap-4"
          >
            <input
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              disabled={loading}
              placeholder="Ask for outfit ideas, matching accessories, styling formulas..."
              className="flex-1 border border-[#c9a96e]/20 bg-[#1a1814] px-4 py-3 text-sm text-[#f5f0e8] placeholder-[#8a8070]/30 outline-none transition-all focus:border-[#c9a96e] rounded-sm"
            />
            <button
              type="submit"
              disabled={loading || !input.trim()}
              className="inline-flex items-center justify-center border border-[#c9a96e] bg-[#c9a96e] px-5 py-3 text-[#1a1814] hover:bg-transparent hover:text-[#c9a96e] transition-all disabled:opacity-50 disabled:pointer-events-none rounded-sm cursor-pointer"
            >
              <Send className="h-4 w-4" />
            </button>
          </form>
        </main>

      </div>
    </div>
  );
}
