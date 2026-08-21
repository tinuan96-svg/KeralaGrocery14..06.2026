import "jsr:@supabase/functions-js/edge-runtime.d.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
  "Access-Control-Allow-Headers":
    "Content-Type, Authorization, X-Client-Info, Apikey",
};

// Priority: Use the API key from environment variables (set in Supabase Dashboard)
// Fallback to the hardcoded key if environment is not configured.
const API_KEY = Deno.env.get("GETADDRESS_API_KEY") || "dziaBIXFRUCSHBbv-l0vzQ51659";
const BASE_URL = "https://api.getaddress.io";

function isPostcode(term: string): boolean {
  // Simple UK Postcode regex
  const regex = /^[A-Z]{1,2}\d[A-Z\d]?\s*\d[A-Z]{2}$/i;
  return regex.test(term.trim());
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 200, headers: corsHeaders });
  }

  try {
    const url = new URL(req.url);
    const action = url.searchParams.get("action");

    if (action === "autocomplete") {
      let term = url.searchParams.get("term")?.trim() || "";
      if (term.length < 2) {
        return new Response(JSON.stringify({ suggestions: [] }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
      }

      console.log(`[address-lookup] Searching for: "${term}"`);

      // 1. Try Autocomplete (Good for partial addresses)
      const params = new URLSearchParams({
        "api-key": API_KEY,
        "top": "10"
      });

      let response = await fetch(`${BASE_URL}/autocomplete/${encodeURIComponent(term)}?${params}`, {
        headers: { "Accept": "application/json" }
      });

      if (response.ok) {
        const data = await response.json();
        if (data.suggestions && data.suggestions.length > 0) {
          return new Response(JSON.stringify(data), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
        }
      } else {
         const errText = await response.text();
         console.error(`[address-lookup] Autocomplete failed (${response.status}):`, errText);
      }

      // 2. Fallback: If Autocomplete yields no results and it looks like a postcode, try /find
      if (isPostcode(term)) {
        console.log(`[address-lookup] Trying /find fallback for postcode: ${term}`);
        const findRes = await fetch(`${BASE_URL}/find/${encodeURIComponent(term.replace(/\s+/g, ""))}?api-key=${API_KEY}`, {
          headers: { "Accept": "application/json" }
        });

        if (findRes.ok) {
          const findData = await findRes.json();
          console.log(`[address-lookup] /find returned ${findData.addresses?.length || 0} addresses`);

          // Map /find response to autocomplete format for the frontend
          const suggestions = (findData.addresses || []).map((addr: string, index: number) => ({
            id: `find-${term.replace(/\s+/g, "")}-${index}`,
            address: addr.split(',').filter(Boolean).join(', '),
            postcode: findData.postcode
          }));

          return new Response(JSON.stringify({ suggestions }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
        } else {
          const errText = await findRes.text();
          console.error(`[address-lookup] /find failed (${findRes.status}):`, errText);
          return new Response(JSON.stringify({ suggestions: [], error: "Postcode search failed", status: findRes.status }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
        }
      }

      return new Response(JSON.stringify({ suggestions: [] }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    if (action === "get") {
      const id = url.searchParams.get("id") || "";

      // Handle synthetic IDs from /find fallback
      if (id.startsWith("find-")) {
        const parts = id.split("-");
        const postcode = parts[1];
        const index = parseInt(parts[2]);

        const findRes = await fetch(`${BASE_URL}/find/${postcode}?api-key=${API_KEY}`, {
          headers: { "Accept": "application/json" }
        });

        if (findRes.ok) {
          const findData = await findRes.json();
          const addrStr = findData.addresses[index];
          const addrParts = addrStr.split(",").map((s: string) => s.trim());

          return new Response(JSON.stringify({
            line_1: addrParts[0] || "",
            line_2: addrParts[1] || "",
            line_3: addrParts[2] || "",
            town_or_city: findData.town_or_city || addrParts[addrParts.length - 1] || "",
            postcode: findData.postcode,
            county: findData.county || "",
            country: "United Kingdom"
          }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
        }
      }

      // Standard /get flow
      const response = await fetch(`${BASE_URL}/get/${encodeURIComponent(id)}?api-key=${API_KEY}`, {
        headers: { "Accept": "application/json" }
      });

      if (!response.ok) {
        const errText = await response.text();
        console.error(`[address-lookup] Get details failed (${response.status}):`, errText);
        return new Response(JSON.stringify({ error: "Failed to retrieve address" }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
      }

      const data = await response.json();
      return new Response(JSON.stringify(data), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    return new Response(JSON.stringify({ error: "Invalid action" }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  } catch (err) {
    console.error("address-lookup error:", err);
    return new Response(JSON.stringify({ error: "Internal server error" }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }
});
