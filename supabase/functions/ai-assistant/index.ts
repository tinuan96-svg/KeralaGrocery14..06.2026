import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey",
};

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 200, headers: corsHeaders });
  }

  try {
    const { messages, context } = await req.json();
    const openAiKey = Deno.env.get("OPENAI_API_KEY");

    if (!openAiKey) {
      return new Response(JSON.stringify({ error: "OpenAI API Key not configured" }), { status: 500, headers: corsHeaders });
    }

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    const isAdmin = context?.user_role === 'admin';
    const userName = context?.user_name || 'Customer';

    // 1. Initial request to OpenAI
    const response = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${openAiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "gpt-4o-mini",
        messages: [
          {
            role: "system",
            content: `You are the Kerala Grocery AI Assistant.
            CURRENT USER: ${userName} (Role: ${context?.user_role || 'guest'})
            USER CONTEXT: Wallet Balance: £${context?.wallet_balance || 0}, Cart Items: ${context?.cart_count || 0}.

            GOALS:
            - Customers: Help them shop, check order status, explain wallet benefits, and share recipes.
            - Admins: Act as a Business Analyst. Provide sales summaries and inventory alerts.

            FORMATTING RULES:
            - NEVER use long, blocky paragraphs.
            - Use bullet points (•) for lists.
            - Use **bold** for product names, prices, or key numbers.
            - Add a blank line between sections.

            KNOWLEDGE BASE:
            - Delivery: Next-day for orders before 6 PM. Free over £45.
            - Loyalty: Earn cashback on every card payment. Spend up to 50% of balance per order.

            ADMIN ONLY TOOLS:
            - Use "get_business_stats" when the admin asks for sales, totals, or order summaries.

            CUSTOMER TOOLS:
            - Use "search_inventory" for products.
            - Use "get_order_status" for tracking (ask for Order #).
            - Use "get_recipes" for cooking ideas.`
          },
          ...messages
        ],
        tools: [
          {
            type: "function",
            function: {
              name: "search_inventory",
              description: "Search for Kerala grocery products",
              parameters: { type: "object", properties: { query: { type: "string" } }, required: ["query"] }
            }
          },
          {
            type: "function",
            function: {
              name: "get_order_status",
              description: "Check order status",
              parameters: {
                type: "object",
                properties: { order_number: { type: "string" }, contact_info: { type: "string" } },
                required: ["order_number", "contact_info"]
              }
            }
          },
          {
            type: "function",
            function: {
              name: "get_business_stats",
              description: "ADMIN ONLY: Get summary of sales and orders for today",
              parameters: { type: "object", properties: { timeframe: { type: "string", enum: ["today", "yesterday", "week"] } } }
            }
          }
        ],
        tool_choice: "auto"
      })
    });

    const data = await response.json();
    if (data.error) throw new Error(`OpenAI Error: ${data.error.message}`);

    const message = data.choices[0].message;

    // 2. Handle Tool Calls
    if (message.tool_calls) {
      const toolMessages = [...messages, message];
      let actions: any[] = [];

      for (const toolCall of message.tool_calls) {
        const functionName = toolCall.function.name;
        const args = JSON.parse(toolCall.function.arguments);
        let toolResult;

        if (functionName === "search_inventory") {
          const { data: p } = await supabase.rpc('search_products_fuzzy', { search_query: args.query, limit_val: 5 });
          toolResult = p || [];
          actions = (p || []).map((p: any) => ({ type: 'RECOMMEND_PRODUCT', product: p }));
        } else if (functionName === "get_order_status") {
          const { data: o } = await supabase.from('orders').select('*').eq('order_number', args.order_number).maybeSingle();
          toolResult = o || { error: "Not found" };
        } else if (functionName === "get_business_stats" && isAdmin) {
          const { data: stats } = await supabase.from('orders')
            .select('total')
            .eq('payment_status', 'paid')
            .gte('created_at', new Date().toISOString().split('T')[0]);

          const totalRevenue = stats?.reduce((s, x) => s + Number(x.total), 0) || 0;
          toolResult = { order_count: stats?.length || 0, revenue: totalRevenue };
        }

        toolMessages.push({ role: "tool", tool_call_id: toolCall.id, content: JSON.stringify(toolResult) });
      }

      const finalResponse = await fetch("https://api.openai.com/v1/chat/completions", {
        method: "POST",
        headers: { "Authorization": `Bearer ${openAiKey}`, "Content-Type": "application/json" },
        body: JSON.stringify({ model: "gpt-4o-mini", messages: toolMessages })
      });

      const finalData = await finalResponse.json();
      return new Response(JSON.stringify({ message: finalData.choices[0].message, actions }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    return new Response(JSON.stringify({ message }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });

  } catch (err) {
    return new Response(JSON.stringify({ error: err.message }), { status: 500, headers: corsHeaders });
  }
});
