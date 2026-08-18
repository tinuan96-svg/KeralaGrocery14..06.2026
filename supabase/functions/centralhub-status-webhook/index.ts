import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-centralhub-signature",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
    );

    const signature = req.headers.get("x-centralhub-signature");
    const bodyText = await req.text();

    // In production, verify HMAC signature here using CENTRALHUB_WEBHOOK_SECRET
    // For now, we process the payload
    const payload = JSON.parse(bodyText);

    // 1. Log and Deduplicate
    const { error: insertError } = await supabase
      .from('centralhub_webhook_events')
      .insert({
        external_event_id: payload.event_id,
        raw_payload: payload
      });

    // If duplicate event_id, return 200 OK immediately
    if (insertError?.code === '23505') {
      return new Response(JSON.stringify({ message: "Duplicate event" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200
      });
    }

    if (insertError) throw insertError;

    // 2. Map Status & Update Order
    // Using the map_centralhub_status function in the DB
    const { data: localStatus, error: mapError } = await supabase
      .rpc('map_centralhub_status', { p_external_status: payload.status });

    if (mapError) throw mapError;

    const { error: updateError } = await supabase
      .from('orders')
      .update({
        order_status: localStatus,
        updated_at: new Date().toISOString()
      })
      .eq('centralhub_order_id', payload.order_id);

    if (updateError) throw updateError;

    // 3. Mark event as processed
    await supabase
      .from('centralhub_webhook_events')
      .update({
        process_status: 'processed',
        processed_at: new Date().toISOString()
      })
      .eq('external_event_id', payload.event_id);

    return new Response(JSON.stringify({ success: true }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 200,
    });

  } catch (err) {
    const errorMsg = err instanceof Error ? err.message : String(err);
    console.error(`[webhook-error] ${errorMsg}`);
    return new Response(JSON.stringify({ error: errorMsg }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 400,
    });
  }
});
