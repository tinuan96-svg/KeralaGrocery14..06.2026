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
            Your goal is to help users find authentic Kerala products, check their order status, and answer general enquiries.

            KNOWLEDGE BASE:
            - Delivery: Next-day delivery for orders before 6 PM. Free delivery on orders over £45.
            - Delivery Areas: All across the UK (England, Scotland, Wales, Northern Ireland).
            - Support: Email admin@keralagrocery.com or call 07769867549.
            - Returns: 30-day guarantee on authentic products.
            - Company: Tasty Kerala Ltd.

            TOOLS:
            1. Use "search_inventory" when a user asks for products or categories.
            2. Use "get_order_status" when a user asks about their order status, tracking, or delivery updates.
            3. Use "get_recipes" when a user asks for cooking ideas, traditional dishes, or how to use specific ingredients.

            INSTRUCTIONS:
            - Always be polite, helpful, and use a friendly "taste of home" tone.
            - Mention benefits of Kerala products like authenticity and health.
            - When search results are found, provide the product names and prices clearly.
            - If an order is "shipped" or "delivered", provide the tracking number and courier name if available.
            - If recommending a recipe, explain why it's a great match for the customer.`
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
                  query: { type: "string", description: "The product name or category to search for" }
                },
                required: ["query"]
              }
            }
          },
          {
            type: "function",
            function: {
              name: "get_order_status",
              description: "Check the status and tracking info of a specific order",
              parameters: {
                type: "object",
                properties: {
                  order_number: { type: "string", description: "The order number (e.g. KG-12345)" },
                  contact_info: { type: "string", description: "The customer email or phone number used for the order" }
                },
                required: ["order_number", "contact_info"]
              }
            }
          },
          {
            type: "function",
            function: {
              name: "get_recipes",
              description: "Find traditional Kerala recipes and cooking guides",
              parameters: {
                type: "object",
                properties: {
                  query: { type: "string", description: "The dish name or ingredient to find recipes for" }
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
    if (data.error) throw new Error(`OpenAI Error: ${data.error.message || JSON.stringify(data.error)}`);

    if (!data.choices?.length) {
      throw new Error("OpenAI returned an empty response.");
    }

    const message = data.choices[0].message;

    // 2. Handle Tool Calls if any
    if (message.tool_calls && message.tool_calls.length > 0) {
      console.log(`Processing ${message.tool_calls.length} tool calls...`);

      const toolMessages = [
        ...messages,
        message,
      ];

      let actions: any[] = [];

      for (const toolCall of message.tool_calls) {
        const functionName = toolCall.function.name;
        const args = JSON.parse(toolCall.function.arguments);
        let toolResult;

        if (functionName === "search_inventory") {
          const { data: products } = await supabase.rpc('search_products_fuzzy', {
            search_query: args.query,
            limit_val: 5
          });
          toolResult = products || [];
          const newActions = (products || []).map((p: any) => ({ type: 'RECOMMEND_PRODUCT', product: p }));
          actions = [...actions, ...newActions];
        } else if (functionName === "get_order_status") {
          const { data: order } = await supabase
            .from('orders')
            .select('order_number, order_status, payment_status, customer_name, tracking_number, courier_name, created_at')
            .eq('order_number', args.order_number)
            .or(`customer_email.eq.${args.contact_info},customer_phone.eq.${args.contact_info}`)
            .maybeSingle();

          toolResult = order || { error: "Order not found or contact info doesn't match." };
        } else if (functionName === "get_recipes") {
          // Mock recipe results for now, matching the logic in recipeService.ts
          toolResult = [
            { title: "Authentic Kerala Fish Curry", slug: "kerala-fish-curry", difficulty: "Medium", prepTime: "15 mins" },
            { title: "Traditional Palakkadan Matta Rice", slug: "palakkadan-matta-rice-guide", difficulty: "Easy", prepTime: "5 mins" }
          ].filter(r =>
            r.title.toLowerCase().includes(args.query.toLowerCase()) ||
            args.query.toLowerCase().includes('fish') ||
            args.query.toLowerCase().includes('rice')
          );

          const newActions = toolResult.map(r => ({ type: 'RECOMMEND_RECIPE', recipe: r }));
          actions = [...actions, ...newActions];
        }

        toolMessages.push({
          role: "tool",
          tool_call_id: toolCall.id,
          content: JSON.stringify(toolResult)
        });
      }

      // Second call to OpenAI with all tool results
      const finalResponse = await fetch("https://api.openai.com/v1/chat/completions", {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${openAiKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: "gpt-4o-mini",
          messages: toolMessages
        })
      });

      const finalData = await finalResponse.json();
      if (finalData.error) throw new Error(`OpenAI Final Error: ${finalData.error.message}`);

      if (!finalData.choices?.length) {
        throw new Error("OpenAI returned an empty response after tool call.");
      }

      return new Response(JSON.stringify({
        message: finalData.choices[0].message,
        actions
      }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    return new Response(JSON.stringify({ message }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });

  } catch (err) {
    return new Response(JSON.stringify({ error: err.message }), { status: 500, headers: corsHeaders });
  }
});
