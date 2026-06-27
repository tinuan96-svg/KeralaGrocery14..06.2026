import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2";
import { JWT } from "npm:google-auth-library";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey",
};

interface PushRequest {
  user_id?: string;
  fcm_token?: string;
  title: string;
  body: string;
  data?: Record<string, string>;
}

/**
 * Get Google OAuth2 Access Token for FCM v1
 */
async function getAccessToken(serviceAccount: any): Promise<string> {
  const jwt = new JWT({
    email: serviceAccount.client_email,
    key: serviceAccount.private_key,
    scopes: ["https://www.googleapis.com/auth/cloud-platform"],
  });
  const tokens = await jwt.authorize();
  if (!tokens.access_token) throw new Error("Failed to get access token");
  return tokens.access_token;
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 200, headers: corsHeaders });
  }

  try {
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    const { user_id, fcm_token, title, body, data }: PushRequest = await req.json();

    let targetToken = fcm_token;

    // 1. Resolve FCM token from user_id if not provided
    if (!targetToken && user_id) {
      const { data: profile, error: profileError } = await supabase
        .from("user_profiles")
        .select("fcm_token")
        .eq("id", user_id)
        .maybeSingle();

      if (profileError) {
        console.error("[push] Profile lookup error:", profileError);
      }
      targetToken = profile?.fcm_token;
    }

    if (!targetToken) {
      console.log(`[push] No target token for user_id=${user_id}`);
      return new Response(JSON.stringify({ success: false, error: "No FCM token found" }), {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // 2. Load Service Account and get Project ID
    const serviceAccountJson = Deno.env.get("FIREBASE_SERVICE_ACCOUNT_KEY");
    if (!serviceAccountJson) {
      console.error("[push] FIREBASE_SERVICE_ACCOUNT_KEY missing");
      return new Response(JSON.stringify({ success: false, error: "Firebase Service Account not configured" }), {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const serviceAccount = JSON.parse(serviceAccountJson);
    const projectId = serviceAccount.project_id;

    // 3. Authenticate with Google
    const accessToken = await getAccessToken(serviceAccount);

    // 4. Send via FCM v1 API
    const fcmEndpoint = `https://fcm.googleapis.com/v1/projects/${projectId}/messages:send`;

    const message = {
      message: {
        token: targetToken,
        notification: {
          title,
          body,
        },
        data: {
          ...data,
          // Ensure title/body are also in data for background handling
          title,
          body,
        },
        android: {
          priority: "high",
          notification: {
            channel_id: "kg_orders",
            sound: "default",
          }
        },
        apns: {
          payload: {
            aps: {
              sound: "default",
              badge: 1,
            }
          }
        }
      }
    };

    const res = await fetch(fcmEndpoint, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${accessToken}`,
      },
      body: JSON.stringify(message),
    });

    const result = await res.json();

    if (!res.ok) {
      console.error("[push] FCM v1 API error:", result);

      // If token is invalid/not registered, we should probably clear it from the DB
      if (result.error?.status === "NOT_FOUND" || result.error?.details?.[0]?.errorCode === "UNREGISTERED") {
        console.log(`[push] Cleaning up invalid token for user_id=${user_id}`);
        await supabase
          .from("user_profiles")
          .update({ fcm_token: null })
          .eq("fcm_token", targetToken);
      }

      return new Response(JSON.stringify({ success: false, error: result.error?.message || "FCM send failed" }), {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    console.log(`[push] Successfully sent to ${user_id || targetToken}`);
    return new Response(JSON.stringify({ success: true, message_id: result.name }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });

  } catch (err) {
    console.error("[push] Unexpected error:", err);
    return new Response(JSON.stringify({ success: false, error: err.message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
