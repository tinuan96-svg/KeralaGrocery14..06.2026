'use client';

import { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Send, ShoppingCart, Loader2, Sparkles, Mic, MicOff } from 'lucide-react';
import { useAssistant } from './AssistantContext';
import { useAuth } from '@/lib/context/AuthContext';
import { useCart, useCartData } from '@/lib/context/CartContext';
import { useWallet } from '@/hooks/useWallet';
import Image from 'next/image';
import Link from 'next/link';

interface Message {
  role: 'user' | 'assistant';
  content: string;
}

export default function AssistantChat() {
  const { isOpen, setIsOpen, setEmotion, isThinking, setIsThinking } = useAssistant();
  const { user, profile } = useAuth();
  const { addToCart } = useCart();
  const { cartCount } = useCartData();
  const { wallet } = useWallet();

  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [isListening, setIsListening] = useState(false);
  const [recommendedProducts, setRecommendedProducts] = useState<any[]>([]);
  const [recommendedRecipes, setRecommendedRecipes] = useState<any[]>([]);
  const [orderInfo, setOrderInfo] = useState<any | null>(null);

  const scrollRef = useRef<HTMLDivElement>(null);

  // Initial Message
  useEffect(() => {
    if (messages.length === 0) {
      const name = profile?.name?.split(' ')[0];
      const greeting = user && name
        ? `Namaskaram, **${name}**! 🙏\n\nSo good to see you again. Need help finding something traditional for dinner today? I can check our latest arrivals for you.`
        : `Namaskaram! 🙏\n\nI'm **Kichu**, your Kerala Grocery expert. Looking for:\n\n- Authentic Matta Rice\n- Pure Coconut Oil\n- Traditional Spices\n\nI can find anything for you! What's on your list today?`;
      setMessages([{ role: 'assistant', content: greeting }]);
    }
  }, [user, profile, messages.length]);

  // Auto Scroll
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages, isThinking]);

  const processMessage = async (text: string) => {
    if (!text.trim() || isThinking) return;

    const userMessage: Message = { role: 'user', content: text };
    setMessages(prev => [...prev, userMessage]);
    setInput('');
    setIsThinking(true);
    setEmotion('thinking');

    // Clear previous recommendations on new request
    setRecommendedProducts([]);
    setRecommendedRecipes([]);
    setOrderInfo(null);

    try {
      const response = await fetch(`${process.env.NEXT_PUBLIC_SUPABASE_URL}/functions/v1/ai-assistant`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY}`
        },
        body: JSON.stringify({
          messages: [...messages, userMessage],
          context: {
            user_name: profile?.name || 'Customer',
            wallet_balance: wallet?.balance || 0,
            cart_count: cartCount || 0
          }
        })
      });

      if (!response.ok) {
        throw new Error(`Error ${response.status}`);
      }

      const contentType = response.headers.get('Content-Type');
      const isJson = contentType?.includes('application/json');

      if (isJson) {
        const data = await response.json();
        const content = data.message?.content || "";

        // Handle actions if present
        if (data.actions) {
          data.actions.forEach((action: any) => {
            if (action.type === 'RECOMMEND_PRODUCT') {
              setRecommendedProducts(prev => [...prev, action.product]);
            } else if (action.type === 'ORDER_INFO') {
              setOrderInfo(action.order);
            } else if (action.type === 'RECOMMEND_RECIPE') {
              setRecommendedRecipes(prev => [...prev, action.recipe]);
            }
          });
        }

        setMessages(prev => [...prev, { role: 'assistant', content }]);
      } else {
        const reader = response.body?.getReader();
        if (reader) {
          const decoder = new TextDecoder();
          let accumulatedText = "";

          setMessages(prev => [...prev, { role: 'assistant', content: "" }]);
          setEmotion('talking');

          while (true) {
            const { done, value } = await reader.read();
            if (done) break;

            const chunk = decoder.decode(value, { stream: true });
            const lines = chunk.split('\n');

            for (const line of lines) {
              if (line.startsWith('data: ')) {
                const dataStr = line.slice(6);
                if (dataStr === '[DONE]') continue;

                try {
                  const json = JSON.parse(dataStr);
                  const content = json.choices[0]?.delta?.content || "";
                  if (content) {
                    accumulatedText += content;
                    setMessages(prev => {
                      const last = prev[prev.length - 1];
                      if (last.role === 'assistant') {
                        return [...prev.slice(0, -1), { ...last, content: accumulatedText }];
                      }
                      return prev;
                    });
                  }
                } catch (e) {
                  // Ignore parse errors for incomplete chunks
                }
              }
            }
          }
        }
      }

      setEmotion('idle');
    } catch (error) {
      console.error('AI Assistant Error:', error);
      setMessages(prev => [...prev, { role: 'assistant', content: "I'm having a small problem connecting to home. 🥥 Please try asking again in a second!" }]);
      setEmotion('confused');
    } finally {
      setIsThinking(false);
    }
  };

  const startVoiceInput = () => {
    if (!('webkitSpeechRecognition' in window)) return;
    const recognition = new (window as any).webkitSpeechRecognition();
    recognition.lang = 'en-GB';
    recognition.onstart = () => setIsListening(true);
    recognition.onend = () => setIsListening(false);
    recognition.onerror = (event: any) => {
      console.error('Speech recognition error:', event.error);
      setIsListening(false);
    };
    recognition.onresult = (event: any) => {
      const transcript = event.results[0][0].transcript;
      processMessage(transcript);
    };
    recognition.start();
  };

  const renderMessageContent = (content: string) => {
    return content.split('\n').map((line, i) => {
      const trimmedLine = line.trim();
      if (!trimmedLine) return <div key={i} className="h-2" />;

      const isBullet = trimmedLine.startsWith('- ') || trimmedLine.startsWith('* ');
      const lineContent = isBullet ? trimmedLine.substring(2) : trimmedLine;

      // Handle Bold **text**
      const parts = lineContent.split(/(\*\*.*?\*\*)/g);
      const renderedParts = parts.map((part, j) => {
        if (part.startsWith('**') && part.endsWith('**')) {
          return (
            <strong key={j} className="font-black text-[#0B5D3B]">
              {part.slice(2, -2)}
            </strong>
          );
        }
        return part;
      });

      if (isBullet) {
        return (
          <div key={i} className="flex gap-2 mb-2 ml-1">
            <span className="text-[#0B5D3B] font-bold mt-0.5">•</span>
            <span className="flex-1 leading-relaxed text-gray-700">{renderedParts}</span>
          </div>
        );
      }

      return (
        <p key={i} className="mb-3 last:mb-0 leading-relaxed text-gray-700">
          {renderedParts}
        </p>
      );
    });
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0, y: 50, scale: 0.95 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: 50, scale: 0.95 }}
          className="fixed bottom-[calc(var(--nav-height,60px)+20px)] left-4 sm:left-10 z-[100] w-[calc(100%-2rem)] sm:w-[420px] h-[580px] max-h-[70vh] bg-white/90 backdrop-blur-xl rounded-[3rem] border border-white/50 shadow-[0_20px_50px_rgba(0,0,0,0.15)] flex flex-col overflow-hidden pointer-events-auto"
        >
          {/* Header - Kerala Green Gradient */}
          <div className="bg-gradient-to-br from-[#0B5D3B] to-[#064e3b] p-6 text-white flex items-center justify-between shadow-lg">
            <div className="flex items-center gap-3">
              <div className="w-14 h-14 bg-white/10 rounded-2xl flex items-center justify-center overflow-hidden border border-white/20 shadow-inner p-1">
                 <Image src="/assistant/kichu.png" alt="Kichu" width={100} height={100} className="object-contain scale-125 translate-y-1" unoptimized />
              </div>
              <div>
                <h3 className="text-base font-black tracking-tight">Kichu Guide</h3>
                <div className="flex items-center gap-1.5 mt-0.5">
                  <span className="w-2 h-2 bg-emerald-400 rounded-full animate-pulse shadow-[0_0_8px_#10b981]" />
                  <span className="text-[10px] text-green-100 font-black uppercase tracking-widest">Taste of Home</span>
                </div>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={() => setMessages([])}
                title="Clear conversation"
                className="bg-white/10 hover:bg-white/20 px-3 py-1.5 rounded-xl transition-all text-[10px] font-black uppercase tracking-widest border border-white/20"
              >
                Clear
              </button>
              <button onClick={() => setIsOpen(false)} className="bg-black/10 hover:bg-black/20 p-2.5 rounded-2xl transition-all">
                <X className="w-5 h-5" />
              </button>
            </div>
          </div>

          {/* Chat Body */}
          <div ref={scrollRef} className="flex-1 overflow-y-auto p-6 space-y-6 bg-gradient-to-b from-gray-50/50 to-white/50 custom-scrollbar">
            {messages.map((msg, i) => (
              <motion.div
                key={i}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
              >
                <div className={`max-w-[85%] p-5 rounded-[2rem] text-sm font-medium shadow-sm ${
                  msg.role === 'user'
                    ? 'bg-[#0B5D3B] text-white rounded-tr-none ml-auto'
                    : 'bg-white border border-green-50 text-gray-800 rounded-tl-none mr-auto'
                }`}>
                  {msg.role === 'user' ? msg.content : renderMessageContent(msg.content)}
                </div>
              </motion.div>
            ))}

            {isThinking && (
              <div className="flex justify-start">
                <div className="bg-white border border-gray-100 p-5 rounded-[2rem] rounded-tl-none shadow-sm flex items-center gap-2">
                  <Loader2 className="w-4 h-4 text-green-600 animate-spin" />
                  <span className="text-xs font-bold text-gray-400 animate-pulse">Kichu is thinking...</span>
                </div>
              </div>
            )}
          </div>

          {/* AI Recommendation Tray */}
          <AnimatePresence>
            {(recommendedProducts.length > 0 || recommendedRecipes.length > 0 || orderInfo) && (
              <motion.div
                initial={{ y: 20, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                className="bg-white/80 border-t border-green-50 p-4 flex gap-3 overflow-x-auto scrollbar-hide relative"
              >
                {orderInfo && (
                  <div className="flex-shrink-0 w-48 bg-emerald-900 text-white rounded-2xl p-4 shadow-xl border border-emerald-700">
                    <p className="text-[10px] font-bold opacity-60 uppercase mb-1">Order Summary</p>
                    <h4 className="text-sm font-black mb-1">#{orderInfo.order_number}</h4>
                    <p className="text-xs font-bold text-emerald-400 mb-3 uppercase tracking-wider">{orderInfo.order_status}</p>
                    <Link href="/orders" className="text-[10px] font-black bg-white text-emerald-900 px-3 py-1.5 rounded-xl block text-center shadow-md">VIEW MY ORDERS</Link>
                  </div>
                )}
                {recommendedProducts.map((p) => (
                  <div key={p.id} className="flex-shrink-0 w-32 bg-white rounded-2xl p-2 border border-gray-100 shadow-sm relative group">
                    <div className="relative h-20 w-full mb-2">
                      <Image src={p.image_main || p.image_url || '/placeholder.webp'} alt={p.name} fill className="object-contain" />
                    </div>
                    <p className="text-[10px] font-bold text-gray-800 truncate mb-1">{p.name}</p>
                    <div className="flex items-center justify-between">
                      <span className="text-[10px] font-black text-green-700">£{Number(p.price).toFixed(2)}</span>
                      <button
                        onClick={() => addToCart({ id: p.id, name: p.name, price: p.price, slug: p.slug, image_url: p.image_main || p.image_url })}
                        className="w-7 h-7 bg-[#0B5D3B] text-white rounded-xl flex items-center justify-center active:scale-90 transition-all shadow-md"
                      >
                        <ShoppingCart className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                ))}
                {recommendedRecipes.map((r) => (
                  <Link key={r.id} href={`/recipes/${r.slug}`} className="flex-shrink-0 w-32 bg-white rounded-2xl p-2 border border-gray-100 shadow-sm relative group">
                    <div className="relative h-20 w-full mb-2">
                       <Image src={r.image_url || '/placeholder.webp'} alt={r.title} fill className="object-cover rounded-xl" />
                    </div>
                    <p className="text-[10px] font-bold text-gray-800 truncate mb-1">{r.title}</p>
                    <span className="text-[8px] font-black text-orange-600 uppercase">Recipe</span>
                  </Link>
                ))}
                <button
                  onClick={() => { setRecommendedProducts([]); setRecommendedRecipes([]); setOrderInfo(null); }}
                  className="absolute top-2 right-2 bg-gray-100 rounded-full p-1 hover:bg-red-50 hover:text-red-500 transition-all shadow-sm"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Footer - Input */}
          <div className="p-6 bg-white border-t border-gray-50">
            <form onSubmit={(e) => { e.preventDefault(); processMessage(input); }} className="flex items-center gap-3">
              <button
                type="button"
                onClick={startVoiceInput}
                className={`w-12 h-12 rounded-2xl flex items-center justify-center transition-all shadow-sm ${
                  isListening ? 'bg-red-500 text-white animate-pulse' : 'bg-gray-100 text-gray-400 hover:bg-gray-200'
                }`}
              >
                {isListening ? <MicOff className="w-5 h-5" /> : <Mic className="w-5 h-5" />}
              </button>
              <div className="flex-1 relative">
                <input
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  placeholder={isListening ? "I'm listening..." : "Ask Kichu for rice, oils..."}
                  className="w-full bg-gray-50 border-none rounded-2xl px-5 py-3.5 text-sm font-bold text-gray-800 placeholder:text-gray-400 focus:ring-2 focus:ring-[#0B5D3B] transition-all shadow-inner"
                />
              </div>
              <button
                type="submit"
                disabled={!input.trim() || isThinking}
                className="w-12 h-12 bg-gradient-to-br from-[#0B5D3B] to-[#064e3b] text-white rounded-2xl flex items-center justify-center shadow-lg active:scale-90 transition-all disabled:opacity-40"
              >
                <Send className="w-5 h-5" />
              </button>
            </form>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
