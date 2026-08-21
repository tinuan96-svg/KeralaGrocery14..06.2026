import "jsr:@supabase/functions-js/edge-runtime.d.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey",
};

// Priority: Use the API key from environment variables (set in Supabase Dashboard)
// Fallback to the hardcoded key.
const API_KEY = Deno.env.get("GETADDRESS_API_KEY") || "dziaBIXFRUCSHBbv-l0vzQ51659";
const BASE_URL = "https://api.getaddress.io";

function isPostcode(term: string): boolean {
  // Broad UK Postcode regex to catch partials and complete ones
  // Matches "E3", "E3 2GD", "SW1A 1AA", etc.
  const regex = /^[A-Z]{1,2}\d[A-Z\d]?\s*(\d[A-Z]{2})?$/i;
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

      console.log(`[address-lookup] Input: "${term}"`);

      // Strategy:
      // 1. If it's a full-looking postcode (5+ chars with space or digit), try /find first as it's more accurate
      // 2. Otherwise try /autocomplete

      const cleanTerm = term.replace(/\s+/g, "");
      const likelyFullPostcode = term.length >= 5 && /\d/.test(term);

      if (likelyFullPostcode && isPostcode(term)) {
        console.log(`[address-lookup] Detected likely postcode. Trying /find: ${cleanTerm}`);
        const findRes = await fetch(`${BASE_URL}/find/${encodeURIComponent(cleanTerm)}?api-key=${API_KEY}`, {
          headers: { "Accept": "application/json" }
        });

        if (findRes.ok) {
          const findData = await findRes.json();
          const suggestions = (findData.addresses || []).map((addr: string, index: number) => ({
            id: `find-${cleanTerm}-${index}`,
            address: addr.split(',').filter(s => s.trim()).join(', ') + `, ${findData.postcode}`,
            postcode: findData.postcode
          }));

          if (suggestions.length > 0) {
            return new Response(JSON.stringify({ suggestions }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
          }
        }
      }

      // Fallback or Primary: Autocomplete
      console.log(`[address-lookup] Trying /autocomplete: ${term}`);
      const params = new URLSearchParams({ "api-key": API_KEY, "top": "10" });
      const response = await fetch(`${BASE_URL}/autocomplete/${encodeURIComponent(term)}?${params}`, {
        headers: { "Accept": "application/json" }
      });

      if (response.ok) {
        const data = await response.json();
        return new Response(JSON.stringify(data), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
      } else {
         const errText = await response.text();
         console.error(`[address-lookup] getAddress.io error (${response.status}):`, errText);
         return new Response(JSON.stringify({ suggestions: [], error: "Lookup service error", status: response.status }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
      }
    }

    if (action === "get") {
      const id = url.searchParams.get("id") || "";
      console.log(`[address-lookup] Detail request for ID: ${id}`);

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

      const response = await fetch(`${BASE_URL}/get/${encodeURIComponent(id)}?api-key=${API_KEY}`, {
        headers: { "Accept": "application/json" }
      });

      if (response.ok) {
        const data = await response.json();
        return new Response(JSON.stringify(data), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
      }
    }

    return new Response(JSON.stringify({ error: "Invalid request" }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  } catch (err) {
    console.error("[address-lookup] Critical error:", err);
    return new Response(JSON.stringify({ error: "Internal server error" }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }
});
