'use client';

import { useState, useRef, useEffect } from 'react';
import { Bot, X, Send, ShoppingCart, Loader2, User, Sparkles } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { useCart, useCartData } from '@/lib/context/CartContext';
import { useAuth } from '@/lib/context/AuthContext';
import { useWallet } from '@/hooks/useWallet';
import { usePathname, useSearchParams } from 'next/navigation';
import { getSupabase } from '@/lib/supabase/client';
import Image from 'next/image';
import Link from 'next/link';

interface Message {
  role: 'user' | 'assistant';
  content: string;
}

const SUGGESTIONS = [
  "Where is my order?",
  "Delivery charges?",
  "Spices for Fish Curry?",
  "Matta Rice in stock?",
  "How does the Wallet work?"
];

interface Action {
  type: 'RECOMMEND_PRODUCT' | 'RECOMMEND_RECIPE';
  product?: any;
  recipe?: any;
}

export default function AiAssistant() {
  const [isOpen, setIsOpen] = useState(false);
  const [nudge, setNudge] = useState<string | null>(null);

  const { user, profile } = useAuth();
  const { wallet } = useWallet();
  const { addToCart } = useCart();
  const { cartCount, cartTotal } = useCartData();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const isAdmin = !!(user?.app_metadata?.is_admin);

  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [recommendedProducts, setRecommendedProducts] = useState<any[]>([]);
  const [recommendedRecipes, setRecommendedRecipes] = useState<any[]>([]);
  const scrollRef = useRef<HTMLDivElement>(null);

  // Relationship-focused Greeting Logic
  useEffect(() => {
    const hour = new Date().getHours();
    const timeGreeting = hour < 12 ? 'Good morning' : hour < 17 ? 'Good afternoon' : 'Good evening';
    const name = profile?.name?.split(' ')[0] || 'friend';

    let initialMsg = '';
    if (user) {
      initialMsg = `${timeGreeting}, ${name}! 👋 Welcome back. I'm here to help you find your kitchen essentials or check on your recent orders. What's on your mind?`;
    } else {
      initialMsg = `Namaste! 👋 I'm your Kerala Grocery guide. Looking to bring a "Taste of Home" to your kitchen today? I can help you find authentic products and traditional recipes.`;
    }

    setMessages([{ role: 'assistant', content: initialMsg }]);
  }, [user, profile]);

  // Interaction Monitor Logic
  useEffect(() => {
    if (isAdmin || isOpen) {
      setNudge(null);
      return;
    }

    const name = profile?.name?.split(' ')[0] || 'there';
    const timers: ReturnType<typeof setTimeout>[] = [];

    // --- Path Based Nudges (Relationship focused) ---

    if (pathname.includes('order-success') || pathname.includes('payment-success')) {
      setNudge(`We're so grateful for your support, ${name}! ❤️ Your order is in safe hands and we'll start packing it with care right away.`);
      return;
    }

    if (pathname.includes('failed') || pathname.includes('error')) {
      setNudge(`I'm so sorry about that issue, ${name}. 🛠️ Don't worry, your cart is safe. I can help you finish your order!`);
      return;
    }

    // --- Loyalty/Relationship Nudges ---
    if (wallet && wallet.balance > 2 && pathname === '/') {
      setNudge(`Hi ${name}, did you know you have £${Number(wallet.balance).toFixed(2)} in your wallet? 🎁 Use it to save on your favorite spices today!`);
    }

    // --- Order Updates ---
    if (user && pathname === '/') {
       const fetchLastOrder = async () => {
         const supabase = getSupabase();
         const { data } = await supabase
           .from('orders')
           .select('order_number, order_status')
           .eq('user_id', user.id)
           .neq('order_status', 'delivered')
           .neq('order_status', 'cancelled')
           .order('created_at', { ascending: false })
           .limit(1)
           .maybeSingle();

         if (data) {
           setNudge(`Good news ${name}! Your order #${data.order_number} is ${data.order_status.toUpperCase()}. 🚚 Bringing a taste of home to you!`);
         }
       };
       fetchLastOrder();
    }

    // Nudge 1: Cart is empty but user has been on site for a while
    if (cartCount === 0 && pathname === '/') {
      const t = setTimeout(() => {
        setNudge(`Looking for something special, ${name}? I can find authentic Kerala brands for you! 🥥`);
      }, 20000);
      timers.push(t);
    }

    return () => timers.forEach(clearTimeout);
  }, [cartCount, cartTotal, isAdmin, isOpen, pathname, user, profile, wallet]);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages, isLoading]);

  const processMessage = async (text: string) => {
    if (!text.trim() || isLoading) return;

    const userMessage: Message = { role: 'user', content: text };
    setMessages(prev => [...prev, userMessage]);
    setInput('');
    setIsLoading(true);

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
            user_role: isAdmin ? 'admin' : 'customer',
            user_name: profile?.name || user?.email?.split('@')[0],
            wallet_balance: wallet?.balance || 0,
            cart_count: cartCount || 0
          }
        })
      });

      const data = await response.json();

      if (!response.ok || data.error) {
        throw new Error(data.error || `Error ${response.status}`);
      }

      if (data.message) {
        setMessages(prev => [...prev, { role: 'assistant', content: data.message.content }]);
      }

      if (data.actions) {
        const prods = data.actions.filter((a: any) => a.type === 'RECOMMEND_PRODUCT').map((a: any) => a.product);
        const recs = data.actions.filter((a: any) => a.type === 'RECOMMEND_RECIPE').map((a: any) => a.recipe);
        setRecommendedProducts(prods);
        setRecommendedRecipes(recs);
      }
    } catch (error) {
      console.error('AI Error:', error);
      setMessages(prev => [...prev, {
        role: 'assistant',
        content: isAdmin
          ? "I'm having trouble connecting to my brain right now. 🧠 Please ensure your OpenAI API Key is correctly configured in your Supabase Edge Function secrets."
          : "I'm having a little trouble thinking right now. 🛍️ Please try again in a moment or browse our products using the menu!"
      }]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSend = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    processMessage(input);
  };

  const handleSuggestionClick = (suggestion: string) => processMessage(suggestion);

  if (isAdmin) return null;

  return (
    <>
      {/* Interaction Nudge */}
      <AnimatePresence>
        {nudge && (
          <motion.div
            initial={{ opacity: 0, scale: 0.8, x: 20 }}
            animate={{ opacity: 1, scale: 1, x: 0 }}
            exit={{ opacity: 0, scale: 0.8, x: 20 }}
            className="fixed bottom-40 right-6 z-50 max-w-[200px] bg-white border border-green-100 rounded-2xl shadow-xl p-3 text-[11px] font-medium text-gray-800 leading-snug"
          >
            <div className="relative">
              {nudge}
              <button
                onClick={() => setNudge(null)}
                className="absolute -top-4 -right-4 w-6 h-6 bg-gray-100 rounded-full flex items-center justify-center text-gray-400 hover:bg-gray-200 hover:text-gray-600 transition-colors"
              >
                <X className="w-3 h-3" />
              </button>
              <div className="absolute top-full right-4 w-3 h-3 bg-white border-r border-b border-green-50 rotate-45 -mt-1.5" />
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Floating Toggle Button */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="fixed bottom-24 right-6 z-50 w-14 h-14 bg-gradient-to-br from-emerald-500 to-[#0B5D3B] text-white rounded-full shadow-[0_10px_40px_rgba(11,93,59,0.3)] flex items-center justify-center hover:scale-110 active:scale-95 transition-all group"
      >
        {isOpen ? (
          <X className="w-6 h-6" />
        ) : (
          <div className="relative flex items-center justify-center">
            <span className="text-3xl animate-float-slow">👩‍💼</span>
            <span className="absolute -top-1 -right-2 text-sm animate-pulse">✨</span>
          </div>
        )}
        <span className="absolute -top-1 -right-1 flex h-4 w-4">
          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-yellow-400 opacity-75"></span>
          <span className="relative inline-flex rounded-full h-4 w-4 bg-yellow-500 text-[10px] items-center justify-center font-bold text-green-950">AI</span>
        </span>
      </button>

      {/* Chat Window */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: 20, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 20, scale: 0.95 }}
            className="fixed bottom-40 right-6 z-50 w-[350px] sm:w-[400px] h-[550px] bg-white rounded-[2.5rem] shadow-2xl border border-green-100 flex flex-col overflow-hidden"
          >
            {/* Header */}
            <div className="bg-[#0B5D3B] p-6 text-white flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-white/20 rounded-2xl flex items-center justify-center">
                  <span className="text-2xl">👩‍💼</span>
                </div>
                <div>
                  <h3 className="font-bold text-sm">Personal Guide</h3>
                  <div className="flex items-center gap-1.5 mt-0.5">
                    <span className="w-2 h-2 bg-emerald-400 rounded-full animate-pulse" />
                    <span className="text-[10px] text-green-100 font-medium">Online</span>
                  </div>
                </div>
              </div>
              <button onClick={() => setIsOpen(false)} className="hover:bg-white/10 p-2 rounded-xl transition-colors">
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Messages */}
            <div ref={scrollRef} className="flex-1 overflow-y-auto p-5 space-y-4 bg-gray-50">
              {messages.map((msg, i) => (
                <div key={i} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                  <div className={`max-w-[85%] p-3.5 rounded-2xl text-sm whitespace-pre-wrap ${
                    msg.role === 'user'
                      ? 'bg-[#0B5D3B] text-white rounded-tr-none font-medium'
                      : 'bg-white border border-gray-100 text-gray-800 rounded-tl-none shadow-sm'
                  }`}>
                    {msg.content.split('\n').map((line, idx) => {
                      const parts = line.split(/(\*\*.*?\*\*)/g);
                      return (
                        <p key={idx} className={idx > 0 ? 'mt-1' : ''}>
                          {parts.map((part, pIdx) => {
                            if (part.startsWith('**') && part.endsWith('**')) {
                              return <strong key={pIdx} className="font-black">{part.slice(2, -2)}</strong>;
                            }
                            return part;
                          })}
                        </p>
                      );
                    })}
                  </div>
                </div>
              ))}
              {isLoading && (
                <div className="flex justify-start">
                  <div className="bg-white border border-gray-100 p-4 rounded-2xl rounded-tl-none shadow-sm flex gap-1">
                    <span className="w-1.5 h-1.5 bg-green-600 rounded-full animate-bounce" />
                    <span className="w-1.5 h-1.5 bg-green-600 rounded-full animate-bounce [animation-delay:0.2s]" />
                    <span className="w-1.5 h-1.5 bg-green-600 rounded-full animate-bounce [animation-delay:0.4s]" />
                  </div>
                </div>
              )}
            </div>

            {/* AI Product/Recipe Recommendations Tray */}
            <AnimatePresence>
              {(recommendedProducts.length > 0 || recommendedRecipes.length > 0) && (
                <motion.div
                  initial={{ y: 50, opacity: 0 }}
                  animate={{ y: 0, opacity: 1 }}
                  className="bg-white border-t border-green-50 p-4 flex gap-3 overflow-x-auto scrollbar-hide relative"
                >
                  {recommendedProducts.map((p) => (
                    <div key={p.id} className="flex-shrink-0 w-32 bg-gray-50 rounded-2xl p-2 border border-gray-100 relative group">
                      <div className="relative h-20 w-full mb-1">
                        <Image
                          src={p.image_main || p.image_url || '/placeholder.webp'}
                          alt={p.name} fill
                          className="object-contain"
                        />
                      </div>
                      <p className="text-[10px] font-bold text-gray-800 truncate mb-1">{p.name}</p>
                      <div className="flex items-center justify-between">
                        <span className="text-[10px] font-black text-[#0B5D3B]">£{Number(p.price).toFixed(2)}</span>
                        <button
                          onClick={() => addToCart({
                            id: p.id,
                            name: p.name,
                            price: p.price,
                            slug: p.slug,
                            image_url: p.image_main || p.image_url
                          })}
                          className="w-6 h-6 bg-[#0B5D3B] text-white rounded-lg flex items-center justify-center active:scale-90 transition-all"
                        >
                          <ShoppingCart className="w-3 h-3" />
                        </button>
                      </div>
                    </div>
                  ))}

                  {recommendedRecipes.map((r) => (
                    <Link
                      key={r.slug}
                      href={`/recipes/${r.slug}`}
                      className="flex-shrink-0 w-32 bg-[#f4faf6] rounded-2xl p-2 border border-green-100 relative group"
                      onClick={() => setIsOpen(false)}
                    >
                      <div className="w-8 h-8 rounded-lg bg-white flex items-center justify-center mb-1 shadow-sm">
                        <Sparkles className="w-4 h-4 text-green-600" />
                      </div>
                      <p className="text-[10px] font-bold text-green-900 line-clamp-2 mb-1">{r.title}</p>
                      <span className="text-[8px] font-bold text-green-600 uppercase">{r.difficulty}</span>
                    </Link>
                  ))}

                  <button
                    onClick={() => { setRecommendedProducts([]); setRecommendedRecipes([]); }}
                    className="absolute top-1 right-1 bg-gray-200/50 rounded-full p-0.5 hover:bg-gray-300 transition-colors"
                  >
                    <X className="w-3 h-3 text-gray-500" />
                  </button>
                </motion.div>
              )}
            </AnimatePresence>

            {/* Suggestions */}
            {!isLoading && messages.length < 4 && (
              <div className="px-4 py-2 bg-gray-50 flex gap-2 overflow-x-auto scrollbar-hide border-t border-gray-100">
                {SUGGESTIONS.map((s) => (
                  <button
                    key={s}
                    onClick={() => handleSuggestionClick(s)}
                    className="flex-shrink-0 px-3 py-1.5 bg-white border border-green-100 rounded-full text-[10px] font-bold text-[#0B5D3B] hover:bg-green-50 transition-colors shadow-sm"
                  >
                    {s}
                  </button>
                ))}
              </div>
            )}

            {/* Input area */}
            <div className="p-4 bg-white border-t border-gray-100">
              <form onSubmit={handleSend} className="flex items-center gap-2">
                <div className="flex-1 relative">
                  <input
                    value={input}
                    onChange={(e) => setInput(e.target.value)}
                    placeholder="Ask for spices, rice, etc..."
                    className="w-full bg-gray-50 border-none rounded-2xl px-4 py-3 text-sm focus:ring-2 focus:ring-[#0B5D3B] transition-all"
                  />
                  <Sparkles className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-emerald-500/50" />
                </div>
                <button
                  type="submit"
                  disabled={!input.trim() || isLoading}
                  className="w-11 h-11 bg-[#0B5D3B] text-white rounded-2xl flex items-center justify-center disabled:opacity-50 transition-all active:scale-95"
                >
                  <Send className="w-5 h-5" />
                </button>
              </form>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
