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
    const { messages } = await req.json();
    const openAiKey = Deno.env.get("OPENAI_API_KEY");

    if (!openAiKey) {
      return new Response(JSON.stringify({ error: "OpenAI API Key not configured" }), { status: 500, headers: corsHeaders });
    }

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

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
            content: `You are the Kerala Grocery AI Shopping Assistant.
            Your goal is to help users find authentic Kerala products and help them build their shopping cart.
            Use the "search_inventory" tool whenever a user asks for a product.
            If a user wants to buy something, recommend the best match from the search results and tell them you can add it to their cart.
            Always be polite, helpful, and use a friendly "taste of home" tone.
            Mention benefits of Kerala products like authenticity and health.
            When search results are found, provide the product names and prices clearly.`
          },
          ...messages
        ],
        tools: [
          {
            type: "function",
            function: {
              name: "search_inventory",
              description: "Search for Kerala grocery products in the store inventory",
              parameters: {
                type: "object",
                properties: {
                  query: { type: "string", description: "The product name or category to search for (e.g. 'Matta rice', 'spices')" }
                },
                required: ["query"]
              }
            }
          }
        ],
        tool_choice: "auto"
      })
    });

    const data = await response.json();
    const message = data.choices[0].message;

    // 2. Handle Tool Calls if any
    if (message.tool_calls) {
      const toolCall = message.tool_calls[0];
      if (toolCall.function.name === "search_inventory") {
        const { query } = JSON.parse(toolCall.function.arguments);

        // Use our fuzzy search RPC
        const { data: products } = await supabase.rpc('search_products_fuzzy', {
          search_query: query,
          limit_val: 5
        });

        // Second call to OpenAI with tool results
        const finalResponse = await fetch("https://api.openai.com/v1/chat/completions", {
          method: "POST",
          headers: {
            "Authorization": `Bearer ${openAiKey}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            model: "gpt-4o-mini",
            messages: [
              ...messages,
              message,
              {
                role: "tool",
                tool_call_id: toolCall.id,
                content: JSON.stringify(products || [])
              }
            ]
          })
        });

        const finalData = await finalResponse.json();
        return new Response(JSON.stringify({
          message: finalData.choices[0].message,
          actions: (products || []).map((p: any) => ({ type: 'RECOMMEND_PRODUCT', product: p }))
        }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
      }
    }

    return new Response(JSON.stringify({ message }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });

  } catch (err) {
    return new Response(JSON.stringify({ error: err.message }), { status: 500, headers: corsHeaders });
  }
});
