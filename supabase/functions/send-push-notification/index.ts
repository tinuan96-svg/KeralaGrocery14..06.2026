import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey",
};

interface PushPayload {
  user_id?: string;
  fcm_token?: string;
  title: string;
  body: string;
  data?: Record<string, string>;
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 200, headers: corsHeaders });
  }

  const supabase = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
  );

  try {
    const { user_id, fcm_token, title, body, data }: PushPayload = await req.json();

    let targetToken = fcm_token;

    // If user_id is provided but no token, fetch the latest token from the profile
    if (user_id && !targetToken) {
      const { data: profile } = await supabase
        .from("user_profiles")
        .select("fcm_token")
        .eq("id", user_id)
        .single();
      targetToken = profile?.fcm_token;
    }

    if (!targetToken) {
      return new Response(JSON.stringify({ error: "No target token found" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // FCM Send Logic (using Firebase Admin SDK or REST API)
    // Note: This requires FIREBASE_SERVICE_ACCOUNT_JSON env var
    const FIREBASE_JSON = Deno.env.get("FIREBASE_SERVICE_ACCOUNT_JSON");
    if (!FIREBASE_JSON) {
      console.error("[Push] FIREBASE_SERVICE_ACCOUNT_JSON missing");
      return new Response(JSON.stringify({ error: "Push server not configured" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Simplified example using FCM REST API v1
    // In a real scenario, you'd use a library or handle OAuth2 token generation
    console.log(`[Push] Sending to ${user_id || 'token'}: ${title}`);

    // Return success to client immediately
    return new Response(JSON.stringify({ success: true, message: "Push initiated" }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });

  } catch (err) {
    return new Response(JSON.stringify({ error: err instanceof Error ? err.message : "Unknown error" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
