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

    const userName = context?.user_name || 'friend';
    const systemMessage = {
      role: "system",
      content: `You are Kichu, the exclusive Kerala Grocery Personal Shopping Guide.

      YOUR PERSONALITY:
      - You are warm, empathetic, and communal. You speak as a friend who cares about the customer's family and the "Taste of Home".
      - Use friendly terms like "${userName}".
      - You are proud of Kerala's heritage. Use phrases like "Authentic Malabar flavors", "Traditional recipes", and "Just like back home".

      STRICT BUSINESS RULES:
      - NEVER mention, refer to, or recommend other businesses, websites, or competitors (e.g., Amazon, Walmart, local stores, etc.).
      - You ONLY represent KeralaGrocery.com.
      - If a product is not found in the inventory, suggest looking for a related category or similar items available on OUR website.
      - Never say "I'm having a technical issue." Instead, say "I couldn't find that specific item in our current stock right now, but let's look at some other traditional favorites!"
      - Always keep the customer engaged on KeralaGrocery.com.

      USER CONTEXT: Wallet: £${context?.wallet_balance || 0}, Cart: ${context?.cart_count || 0} items.

      GOALS:
      - Build a relationship, not just a sale. If they ask for a product, talk about how it's used in Kerala kitchens.
      - Help shop, track orders, and troubleshoot with a "We are here for you" attitude.
      - Proactively suggest related items (e.g., if they ask for rice, suggest traditional pickles or sambar mix) to help them complete their traditional meal.

      FORMATTING RULES (STRICT):
      1. Use plenty of line breaks between different thoughts.
      2. ALWAYS use bullet points (starting with -) when listing multiple items, products, or steps.
      3. Use **Bold** for product names, prices, or key terms.
      4. Keep paragraphs short (max 2-3 sentences).
      5. Avoid "wall of text" or "story" style blocks.
      6. Use emojis sparingly but warmly to add personality.

      TOOLS:
      1. search_inventory (Products)
      2. get_order_status (Tracking)
      3. get_recipes (Ideas)`
    };

    // 1. Initial request to OpenAI
    console.log("Requesting tool choice from OpenAI...");
    const response = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${openAiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "gpt-4o-mini",
        stream: false,
        messages: [
          systemMessage,
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
              name: "get_recipes",
              description: "Find traditional Kerala recipes",
              parameters: { type: "object", properties: { query: { type: "string" } }, required: ["query"] }
            }
          }
        ],
        tool_choice: "auto"
      })
    });

    if (!response.ok) {
      const errorBody = await response.text();
      console.error("OpenAI Tool Choice Error:", errorBody);
      return new Response(JSON.stringify({ error: `OpenAI Initial Error: ${response.status} ${errorBody}` }), { status: response.status, headers: corsHeaders });
    }

    const data = await response.json();
    if (!data.choices || data.choices.length === 0) {
      throw new Error("No choices returned from OpenAI");
    }

    const message = data.choices[0].message;

    // 2. Handle Tool Calls
    if (message.tool_calls && message.tool_calls.length > 0) {
      console.log(`Executing ${message.tool_calls.length} tool calls...`);
      const toolMessages = [...messages, message];
      let actions: any[] = [];

      for (const toolCall of message.tool_calls) {
        const functionName = toolCall.function.name;
        const args = JSON.parse(toolCall.function.arguments);
        let toolResult;

        try {
          if (functionName === "search_inventory") {
            console.log(`Searching inventory for: ${args.query}`);
            let { data: p, error: pErr } = await supabase.rpc('search_products_fuzzy', { search_query: args.query, limit_val: 5 });

            // Fallback to basic search if RPC fails or returns nothing
            if (pErr || !p || p.length === 0) {
              console.log("Fuzzy search returned no results or failed, trying basic search...");
              const { data: fallbackData, error: fallbackErr } = await supabase
                .from('products')
                .select('id, name, slug, price, stock, brand, image_url, image_main')
                .ilike('name', `%${args.query}%`)
                .eq('is_deleted', false)
                .limit(5);

              if (!fallbackErr && fallbackData && fallbackData.length > 0) {
                p = fallbackData;
                pErr = null;
              }
            }

            if (pErr) throw pErr;

            const products = p || [];
            toolResult = products.map((item: any) => ({
              id: item.id,
              name: item.name,
              price: `£${Number(item.price || 0).toFixed(2)}`,
              stock: (item.stock || 0) > 0 ? `${item.stock} in stock` : 'Out of Stock',
              brand: item.brand || 'Authentic Kerala',
              category: item.category || 'Grocery'
            }));

            // Only add to actions if products were actually found
            if (products.length > 0) {
              actions.push(...products.map((p: any) => ({ type: 'RECOMMEND_PRODUCT', product: p })));
            } else {
              toolResult = { message: "No products found matching your search. Please try different keywords." };
            }
          } else if (functionName === "get_order_status") {
            const contact = String(args.contact_info || '').trim().toLowerCase();
            const { data: o, error: oErr } = await supabase
              .from('orders')
              .select('id, order_number, order_status, total, created_at, customer_email, customer_phone')
              .eq('order_number', args.order_number)
              .maybeSingle();

            if (oErr) throw oErr;

            if (o && (o.customer_email.toLowerCase().includes(contact) || o.customer_phone.includes(contact))) {
              toolResult = {
                order_number: o.order_number,
                status: o.order_status,
                total: `£${Number(o.total).toFixed(2)}`,
                date: new Date(o.created_at).toLocaleDateString()
              };
              actions.push({ type: 'ORDER_INFO', order: o });
            } else {
              toolResult = { error: "Order not found or contact information does not match." };
            }
          } else if (functionName === "get_recipes") {
            const { data: r, error: rErr } = await supabase.from('recipes')
              .select('*')
              .or(`title.ilike.%${args.query}%,description.ilike.%${args.query}%`)
              .limit(3);

            if (rErr) throw rErr;

            toolResult = r || [];
            actions.push(...(r || []).map(r => ({ type: 'RECOMMEND_RECIPE', recipe: r })));
          }
        } catch (toolErr: any) {
          console.error(`Tool Execution Error (${functionName}):`, toolErr.message);
          toolResult = { error: `Internal tool error: ${toolErr.message}` };
        }

        toolMessages.push({ role: "tool", tool_call_id: toolCall.id, content: JSON.stringify(toolResult) });
      }

      console.log("Finalizing response with tool results...");
      const finalResponse = await fetch("https://api.openai.com/v1/chat/completions", {
        method: "POST",
        headers: { "Authorization": `Bearer ${openAiKey}`, "Content-Type": "application/json" },
        body: JSON.stringify({
          model: "gpt-4o-mini",
          messages: [systemMessage, ...toolMessages],
          stream: false
        })
      });

      if (!finalResponse.ok) {
        const errorBody = await finalResponse.text();
        console.error("OpenAI Final Response Error:", errorBody);
        return new Response(JSON.stringify({ error: `OpenAI Final Error: ${finalResponse.status} ${errorBody}` }), { status: finalResponse.status, headers: corsHeaders });
      }

      const finalData = await finalResponse.json();
      return new Response(JSON.stringify({ message: finalData.choices[0].message, actions }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    return new Response(JSON.stringify({ message }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });

  } catch (err) {
    return new Response(JSON.stringify({ error: err.message }), { status: 500, headers: corsHeaders });
  }
});
