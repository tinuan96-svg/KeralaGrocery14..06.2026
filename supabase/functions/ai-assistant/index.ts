import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey",
};

// Kerala dish to ingredient search keywords mapping
// Each dish maps to a list of ingredient search terms that will be looked up in the products table
const DISH_INGREDIENTS: Record<string, string[]> = {
  // ... existing mappings ...
};

const DISH_COMBOS: Record<string, { suggested: string; reason: string }> = {
  "appam": { suggested: "vegetable stew or egg roast", reason: "These are the most traditional side dishes for fluffy Appams." },
  "puttu": { suggested: "kadala curry or banana", reason: "Puttu and Kadala is the ultimate Kerala breakfast combination!" },
  "idiyappam": { suggested: "chicken stew or sweetened coconut milk", reason: "Idiyappam pairs perfectly with a light, creamy curry." },
  "porotta": { suggested: "beef ularthiyathu or chicken curry", reason: "You haven't lived until you've tried Malabar Porotta with Beef!" },
  "pathiri": { suggested: "mutton curry or fish mulakittathu", reason: "Pathiri is best enjoyed with a spicy, thin gravy." },
  "idli": { suggested: "sambar and coconut chutney", reason: "The classic healthy South Indian breakfast trio." },
  "dosa": { suggested: "sambar and tomato chutney", reason: "Crispy Dosa needs a flavorful Sambar and tangy chutney." },
};

function findDishKey(query: string): string | null {
  const lower = query.toLowerCase().trim();

  // Direct match
  if (DISH_INGREDIENTS[lower]) return lower;

  // Partial match - check if any dish key is contained in the query
  for (const key of Object.keys(DISH_INGREDIENTS)) {
    if (lower.includes(key)) return key;
  }

  // Check if query contains any key words
  for (const key of Object.keys(DISH_INGREDIENTS)) {
    const keyWords = key.split(' ');
    if (keyWords.length > 1 && keyWords.every((w: string) => lower.includes(w))) return key;
  }

  return null;
}

async function searchProducts(supabase: any, query: string, limit: number = 10) {
  let { data, error } = await supabase.rpc('search_products_fuzzy', {
    search_query: query,
    limit_val: limit,
  });

  // Fallback to ILIKE search
  if (error || !data || data.length === 0) {
    const fallback = await supabase
      .from('products')
      .select('id, name, slug, price, stock, brand, image_url, image_main, short_description')
      .ilike('name', `%${query}%`)
      .eq('is_deleted', false)
      .eq('approval_status', 'approved')
      .eq('visibility_status', 'visible')
      .gt('price', 0)
      .limit(limit);

    if (!fallback.error && fallback.data && fallback.data.length > 0) {
      data = fallback.data;
      error = null;
    }
  }

  if (error) throw error;
  return data || [];
}

async function findRecipeIngredients(supabase: any, dishName: string) {
  const dishKey = findDishKey(dishName);

  if (!dishKey) {
    return { found: false, dish: dishName, ingredients: [], products: [] };
  }

  const ingredientTerms = DISH_INGREDIENTS[dishKey];
  const allProducts: any[] = [];
  const seenIds = new Set<string>();

  for (const term of ingredientTerms) {
    const products = await searchProducts(supabase, term, 5);
    for (const p of products) {
      if (!seenIds.has(p.id)) {
        seenIds.add(p.id);
        allProducts.push(p);
      }
    }
  }

  return {
    found: true,
    dish: dishKey,
    ingredients: ingredientTerms,
    products: allProducts,
  };
}

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
      content: `You are Kichu, the exclusive Kerala Grocery Personal Shopping Guide for KeralaGrocery.com.

      YOUR PERSONALITY:
      - You are warm, empathetic, and communal. You speak as a friend who cares about the customer's family and the "Taste of Home".
      - Use friendly terms like "${userName}".
      - You are proud of Kerala's heritage. Use phrases like "Authentic Malabar flavors", "Traditional recipes", and "Just like back home".

      STRICT BUSINESS RULES:
      - NEVER mention, refer to, or recommend other businesses, websites, or competitors.
      - You ONLY represent KeralaGrocery.com.
      - If a product is not found, suggest looking for a related category or similar items available on OUR website.
      - Never say "I'm having a technical issue." Instead, say "I couldn't find that specific item in our current stock right now, but let's look at some other traditional favorites!"
      - Always keep the customer engaged on KeralaGrocery.com.

      USER CONTEXT: Wallet: £${context?.wallet_balance || 0}, Cart: ${context?.cart_count || 0} items.

      GOALS:
      - Build a relationship, not just a sale. If they ask for a product, talk about how it's used in Kerala kitchens.
      - Help shop, track orders, and troubleshoot with a "We are here for you" attitude.
      - Proactively suggest related items (e.g., if they ask for rice, suggest traditional pickles or sambar mix).
      - When a customer asks about cooking a specific Kerala dish (e.g., "I want to make sambar", "how to make fish curry", "ingredients for puttu"), ALWAYS call find_recipe_ingredients with the dish name. This will return all available ingredients on our site with product cards and a bulk add-to-cart option.
      - When asked about delivery, free shipping thresholds, or business info, call get_site_settings to provide accurate, up-to-date information.
      - Proactively suggest meal combos (e.g., if searching for Appam, mention Vegetable Stew or Egg Roast) using the DISH_COMBOS data provided to you.
      - If a specific product requested is out of stock or not found, proactively search for and suggest a reasonable substitute (e.g. suggesting different brands or a larger size).

      SEARCH INVENTORY INSTRUCTIONS (CRITICAL):
      - When a customer asks about ANY product (e.g., "matta rice", "coconut oil", "spices"), you MUST call search_inventory with the product name as the query.
      - Use simple, direct search terms. For example, if the customer says "matta rice", use "matta rice" as the query.
      - If the customer mentions a broad category like "rice" or "snacks", search for that term.
      - ALWAYS search before responding about products. Never say a product is unavailable without searching first.
      - When products are found, mention them by name and price in your response, and the product cards will appear automatically.
      - When a customer asks about making a Kerala dish, call find_recipe_ingredients. The ingredient products will appear as cards with a bulk "Add All to Cart" button.

      FORMATTING RULES (STRICT):
      1. Use plenty of line breaks between different thoughts.
      2. ALWAYS use bullet points (starting with -) when listing multiple items, products, or steps.
      3. Use **Bold** for product names, prices, or key terms.
      4. Keep paragraphs short (max 2-3 sentences).
      5. Use emojis sparingly but warmly to add personality.

      TOOLS:
      1. search_inventory (Search for Kerala grocery products by name or keyword)
      2. find_recipe_ingredients (Find all available ingredients for a Kerala dish on our site - use when customer wants to cook a specific dish)
      3. get_order_status (Check order status by order number and contact info)
      4. get_recipes (Find traditional Kerala recipes)
      5. get_site_settings (Get information about shipping, free delivery thresholds, return policy, and delivery areas)
      6. get_dish_combos (Get traditional dish combinations and meal ideas)`
    };

    const response = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${openAiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "gpt-4o-mini",
        stream: false,
        messages: [systemMessage, ...messages],
        tools: [
          {
            type: "function",
            function: {
              name: "search_inventory",
              description: "Search for Kerala grocery products by name, keyword, or category. Always call this when a customer asks about any product or type of product.",
              parameters: { type: "object", properties: { query: { type: "string", description: "The product name or keyword to search for, e.g. 'matta rice' or 'coconut oil'" } }, required: ["query"] }
            }
          },
          {
            type: "function",
            function: {
              name: "find_recipe_ingredients",
              description: "Find all available ingredients for a specific Kerala dish on our website. Use this when a customer wants to cook a Kerala dish (e.g., sambar, fish curry, puttu, biryani, payasam, appam, idli). Returns ingredient product cards with a bulk add-to-cart button.",
              parameters: { type: "object", properties: { dish: { type: "string", description: "The Kerala dish name, e.g. 'sambar', 'fish curry', 'puttu', 'chicken biryani', 'payasam'" } }, required: ["dish"] }
            }
          },
          {
            type: "function",
            function: {
              name: "get_order_status",
              description: "Check the status of a customer's order",
              parameters: {
                type: "object",
                properties: { order_number: { type: "string" }, contact_info: { type: "string", description: "Customer email or phone number" } },
                required: ["order_number", "contact_info"]
              }
            }
          },
          {
            type: "function",
            function: {
              name: "get_recipes",
              description: "Find traditional Kerala recipes by keyword",
              parameters: { type: "object", properties: { query: { type: "string" } }, required: ["query"] }
            }
          },
          {
            type: "function",
            function: {
              name: "get_site_settings",
              description: "Get current store settings like shipping thresholds, delivery times, and delivery areas.",
              parameters: { type: "object", properties: {} }
            }
          },
          {
            type: "function",
            function: {
              name: "get_dish_combos",
              description: "Get traditional Kerala meal combinations and side dish suggestions.",
              parameters: { type: "object", properties: {} }
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

    if (message.tool_calls && message.tool_calls.length > 0) {
      const toolMessages = [...messages, message];
      let actions: any[] = [];

      for (const toolCall of message.tool_calls) {
        const functionName = toolCall.function.name;
        const args = JSON.parse(toolCall.function.arguments);
        let toolResult;

        try {
          if (functionName === "search_inventory") {
            const products = await searchProducts(supabase, args.query, 10);

            toolResult = products.map((item: any) => ({
              id: item.id,
              name: item.name,
              price: `£${Number(item.price || 0).toFixed(2)}`,
              stock: (item.stock || 0) > 0 ? `${item.stock} in stock` : 'Out of Stock',
              brand: item.brand || 'Authentic Kerala',
            }));

            if (products.length > 0) {
              actions.push(...products.map((p: any) => ({ type: 'RECOMMEND_PRODUCT', product: p })));
            } else {
              toolResult = { message: "No products found matching your search. Please try different keywords." };
            }
          } else if (functionName === "find_recipe_ingredients") {
            const result = await findRecipeIngredients(supabase, args.dish);

            if (result.found && result.products.length > 0) {
              toolResult = {
                dish: result.dish,
                ingredients: result.ingredients,
                products_found: result.products.length,
                products: result.products.map((p: any) => ({
                  id: p.id,
                  name: p.name,
                  price: `£${Number(p.price || 0).toFixed(2)}`,
                  stock: (p.stock || 0) > 0 ? 'In Stock' : 'Out of Stock',
                }))
              };

              actions.push({
                type: 'RECIPE_INGREDIENTS',
                dish: result.dish,
                ingredients: result.ingredients,
                products: result.products
              });
            } else if (result.found && result.products.length === 0) {
              toolResult = { message: `I know the ingredients for ${result.dish}, but unfortunately none of them are currently in stock. Please check back soon!` };
            } else {
              toolResult = { message: `I don't have a recipe mapping for "${args.dish}" yet. Try asking about popular dishes like sambar, fish curry, puttu, appam, biryani, payasam, or chicken curry.` };
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
            actions.push(...(r || []).map((r: any) => ({ type: 'RECOMMEND_RECIPE', recipe: r })));
          } else if (functionName === "get_site_settings") {
            const { data: s, error: sErr } = await supabase.from('site_settings').select('*').eq('id', 1).single();
            if (sErr) throw sErr;
            toolResult = s;
          } else if (functionName === "get_dish_combos") {
            toolResult = DISH_COMBOS;
          }
        } catch (toolErr: any) {
          console.error(`Tool Execution Error (${functionName}):`, toolErr.message);
          toolResult = { error: `Internal tool error: ${toolErr.message}` };
        }

        toolMessages.push({ role: "tool", tool_call_id: toolCall.id, content: JSON.stringify(toolResult) });
      }

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
