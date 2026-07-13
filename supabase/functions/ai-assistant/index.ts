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
            2. Use "get_order_status" when a user asks about their order status, tracking, or delivery updates. You MUST ask for their Order Number and either Phone or Email if they haven't provided it.

            INSTRUCTIONS:
            - Always be polite, helpful, and use a friendly "taste of home" tone.
            - Mention benefits of Kerala products like authenticity and health.
            - When search results are found, provide the product names and prices clearly.
            - If an order is "shipped" or "delivered", provide the tracking number and courier name if available.`
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
          }
        ],
        tool_choice: "auto"
      })
    });

    const data = await response.json();
    if (data.error) throw new Error(data.error.message || JSON.stringify(data.error));

    const message = data.choices[0].message;

    // 2. Handle Tool Calls if any
    if (message.tool_calls) {
      const toolCall = message.tool_calls[0];
      const functionName = toolCall.function.name;
      const args = JSON.parse(toolCall.function.arguments);

      let toolResult;

      if (functionName === "search_inventory") {
        const { data: products } = await supabase.rpc('search_products_fuzzy', {
          search_query: args.query,
          limit_val: 5
        });
        toolResult = products || [];
      } else if (functionName === "get_order_status") {
        // Search order by number and verify contact info
        const { data: order } = await supabase
          .from('orders')
          .select('order_number, order_status, payment_status, customer_name, tracking_number, courier_name, created_at')
          .eq('order_number', args.order_number)
          .or(`customer_email.eq.${args.contact_info},customer_phone.eq.${args.contact_info}`)
          .maybeSingle();

        toolResult = order || { error: "Order not found or contact info doesn't match." };
      }

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
              content: JSON.stringify(toolResult)
            }
          ]
        })
      });

      const finalData = await finalResponse.json();

      return new Response(JSON.stringify({
        message: finalData.choices[0].message,
        actions: functionName === "search_inventory" ? (toolResult || []).map((p: any) => ({ type: 'RECOMMEND_PRODUCT', product: p })) : []
      }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    return new Response(JSON.stringify({ message }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });

  } catch (err) {
    return new Response(JSON.stringify({ error: err.message }), { status: 500, headers: corsHeaders });
  }
});
