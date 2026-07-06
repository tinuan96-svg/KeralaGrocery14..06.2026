'use client';

import { useState } from 'react';
import { getSupabase } from '@/lib/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  RefreshCw, CircleCheck as CheckCircle, CircleAlert as AlertCircle,
  MessageSquare, Shield, Send, Phone, Key,
} from 'lucide-react';

interface ConfigStatus {
  account_sid_set: boolean;
  auth_token_set: boolean;
  service_sid_set: boolean;
  service_sid_valid: boolean;
  service_sid_prefix: string;
  whatsapp_number_set: boolean;
}

interface TestResult {
  success: boolean;
  message: string;
  detail?: string;
}

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const ANON_KEY     = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

async function getAuthHeader(): Promise<string> {
  const supabase = getSupabase();
  const { data: { session } } = await supabase.auth.getSession();
  return `Bearer ${session?.access_token ?? ANON_KEY}`;
}

// ── Status badge ──────────────────────────────────────────────────────────────
function StatusBadge({ ok, label }: { ok: boolean; label: string }) {
  return (
    <div className={`flex items-center gap-2 px-4 py-3 rounded-xl border ${
      ok ? 'bg-emerald-500/10 border-emerald-500/30' : 'bg-red-500/10 border-red-500/30'
    }`}>
      {ok
        ? <CheckCircle className="w-4 h-4 text-emerald-400 flex-shrink-0" />
        : <AlertCircle className="w-4 h-4 text-red-400 flex-shrink-0" />}
      <span className={`text-sm font-medium ${ok ? 'text-emerald-300' : 'text-red-300'}`}>{label}</span>
    </div>
  );
}

// ── Test result card ──────────────────────────────────────────────────────────
function ResultCard({ result }: { result: TestResult | null }) {
  if (!result) return null;
  return (
    <div className={`rounded-xl border px-4 py-3 mt-3 ${
      result.success
        ? 'bg-emerald-500/10 border-emerald-500/30'
        : 'bg-red-500/10 border-red-500/30'
    }`}>
      <div className="flex items-start gap-2">
        {result.success
          ? <CheckCircle className="w-4 h-4 text-emerald-400 mt-0.5 flex-shrink-0" />
          : <AlertCircle className="w-4 h-4 text-red-400 mt-0.5 flex-shrink-0" />}
        <div>
          <p className={`text-sm font-medium ${result.success ? 'text-emerald-300' : 'text-red-300'}`}>
            {result.message}
          </p>
          {result.detail && (
            <p className="text-xs text-gray-400 mt-1 font-mono break-all">{result.detail}</p>
          )}
        </div>
      </div>
    </div>
  );
}

export default function SmsDiagnosticsPage() {
  const [config, setConfig]       = useState<ConfigStatus | null>(null);
  const [loadingConfig, setLoadingConfig] = useState(false);

  const [testPhone, setTestPhone] = useState('');
  const [testCode, setTestCode]   = useState('');
  const [sendResult, setSendResult]     = useState<TestResult | null>(null);
  const [verifyResult, setVerifyResult] = useState<TestResult | null>(null);
  const [sending, setSending]     = useState(false);
  const [verifying, setVerifying] = useState(false);
  const [otpSent, setOtpSent]     = useState(false);

  // ── Load config diagnostics ───────────────────────────────────────────────
  const loadConfig = async () => {
    setLoadingConfig(true);
    try {
      const authHeader = await getAuthHeader();

      // Call send-otp with a dummy phone to probe config; we intercept the
      // error response to extract config details without actually sending.
      const res = await fetch(`${SUPABASE_URL}/functions/v1/send-otp`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: authHeader },
        body: JSON.stringify({ phone: '__config_check__' }),
      });
      const data = await res.json();

      // Parse the error message to determine which secrets are misconfigured
      const isMissingSid    = data.error?.includes('TWILIO_VERIFY_SERVICE_SID') && data.error?.includes('Missing');
      const isInvalidSid    = data.error?.includes('invalid') || data.received_prefix !== undefined;
      const prefix          = data.received_prefix ?? '';

      setConfig({
        account_sid_set:    !data.error?.includes('TWILIO_ACCOUNT_SID'),
        auth_token_set:     !data.error?.includes('TWILIO_AUTH_TOKEN'),
        service_sid_set:    !isMissingSid,
        service_sid_valid:  !isInvalidSid && !isMissingSid,
        service_sid_prefix: prefix || (isInvalidSid ? 'invalid' : 'VA…'),
        whatsapp_number_set: true, // can't probe this without sending
      });
    } catch (err) {
      console.error('Config check failed:', err);
    } finally {
      setLoadingConfig(false);
    }
  };

  // ── Send OTP test ─────────────────────────────────────────────────────────
  const handleSendOtp = async () => {
    if (!testPhone) return;
    setSending(true);
    setSendResult(null);
    setVerifyResult(null);
    setOtpSent(false);
    try {
      const authHeader = await getAuthHeader();
      const res = await fetch(`${SUPABASE_URL}/functions/v1/send-otp`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: authHeader },
        body: JSON.stringify({ phone: testPhone }),
      });
      const data = await res.json();
      if (res.ok && data.success) {
        setSendResult({ success: true, message: `OTP sent successfully. Status: ${data.status}` });
        setOtpSent(true);
      } else {
        setSendResult({
          success: false,
          message: data.error || 'Failed to send OTP',
          detail: data.hint || data.received_prefix ? `Service SID prefix received: "${data.received_prefix}"` : undefined,
        });
      }
    } catch (err) {
      setSendResult({ success: false, message: err instanceof Error ? err.message : 'Network error' });
    } finally {
      setSending(false);
    }
  };

  // ── Verify OTP test ───────────────────────────────────────────────────────
  const handleVerifyOtp = async () => {
    if (!testPhone || !testCode) return;
    setVerifying(true);
    setVerifyResult(null);
    try {
      const authHeader = await getAuthHeader();
      const res = await fetch(`${SUPABASE_URL}/functions/v1/verify-otp`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: authHeader },
        body: JSON.stringify({ phone: testPhone, token: testCode }),
      });
      const data = await res.json();
      if (res.ok && data.success) {
        setVerifyResult({ success: true, message: 'OTP verified successfully. User session created.' });
      } else {
        setVerifyResult({
          success: false,
          message: data.error || 'Verification failed',
          detail: data.received_prefix ? `Service SID prefix: "${data.received_prefix}"` : undefined,
        });
      }
    } catch (err) {
      setVerifyResult({ success: false, message: err instanceof Error ? err.message : 'Network error' });
    } finally {
      setVerifying(false);
    }
  };

  // ── Test invalid OTP ──────────────────────────────────────────────────────
  const handleTestInvalidOtp = async () => {
    if (!testPhone) { setVerifyResult({ success: false, message: 'Enter a phone number first' }); return; }
    setVerifying(true);
    setVerifyResult(null);
    try {
      const authHeader = await getAuthHeader();
      const res = await fetch(`${SUPABASE_URL}/functions/v1/verify-otp`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: authHeader },
        body: JSON.stringify({ phone: testPhone, token: '000000' }),
      });
      const data = await res.json();
      // Expect this to fail with "Invalid or expired"
      if (!res.ok) {
        setVerifyResult({ success: true, message: `Correctly rejected invalid OTP: "${data.error}"` });
      } else {
        setVerifyResult({ success: false, message: 'WARNING: Invalid OTP was accepted — check Twilio Verify config' });
      }
    } catch (err) {
      setVerifyResult({ success: false, message: err instanceof Error ? err.message : 'Network error' });
    } finally {
      setVerifying(false);
    }
  };

  const allConfigOk = config &&
    config.account_sid_set &&
    config.auth_token_set &&
    config.service_sid_set &&
    config.service_sid_valid;

  return (
    <div className="min-h-screen bg-gray-950 text-white p-4 sm:p-6 max-w-2xl">

      {/* Header */}
      <div className="mb-6">
        <h1 className="text-xl sm:text-2xl font-bold">SMS / OTP Diagnostics</h1>
        <p className="text-gray-400 text-sm mt-1">Diagnose and test Twilio Verify configuration</p>
      </div>

      {/* ── Root Cause Banner ── */}
      <div className="bg-amber-950/50 border border-amber-700/60 rounded-2xl p-4 mb-6">
        <div className="flex gap-3">
          <AlertCircle className="w-5 h-5 text-amber-400 flex-shrink-0 mt-0.5" />
          <div>
            <p className="text-sm font-bold text-amber-300 mb-1">Root Cause: Invalid Verify Service SID</p>
            <p className="text-xs text-amber-200/80 leading-relaxed">
              The error <code className="bg-amber-900/60 px-1 rounded">/v2/Services/00/Verifications was not found</code> means
              {' '}<code className="bg-amber-900/60 px-1 rounded">TWILIO_VERIFY_SERVICE_SID</code> is set to{' '}
              <code className="bg-amber-900/60 px-1 rounded">"00"</code> — a placeholder, not a real SID.
              A valid Verify Service SID starts with <strong className="text-amber-300">VA</strong> and is 34 characters long
              (e.g. <code className="bg-amber-900/60 px-1 rounded">VAxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx</code>).
            </p>
            <div className="mt-3 bg-amber-900/40 rounded-xl px-3 py-2 text-xs text-amber-100 space-y-1">
              <p className="font-semibold">To fix:</p>
              <p>1. Go to <strong>Twilio Console → Verify → Services</strong></p>
              <p>2. Create a service (or open an existing one)</p>
              <p>3. Copy the Service SID starting with <strong>VA…</strong></p>
              <p>4. Update the <code className="bg-amber-900/60 px-1 rounded">TWILIO_VERIFY_SERVICE_SID</code> secret in Supabase with this value</p>
            </div>
          </div>
        </div>
      </div>

      {/* ── Section 1: Config Check ── */}
      <div className="bg-gray-900 border border-gray-800 rounded-2xl p-5 mb-5">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <Shield className="w-4 h-4 text-gray-400" />
            <h2 className="text-sm font-bold">Configuration Status</h2>
          </div>
          <Button size="sm" variant="outline" onClick={loadConfig} disabled={loadingConfig}
            className="border-gray-700 text-gray-300 hover:bg-gray-800 text-xs">
            <RefreshCw className={`w-3.5 h-3.5 mr-1.5 ${loadingConfig ? 'animate-spin' : ''}`} />
            Check Config
          </Button>
        </div>

        {config ? (
          <div className="space-y-2">
            <StatusBadge ok={config.account_sid_set} label="TWILIO_ACCOUNT_SID — set" />
            <StatusBadge ok={config.auth_token_set}  label="TWILIO_AUTH_TOKEN — set" />
            <StatusBadge ok={config.service_sid_set} label="TWILIO_VERIFY_SERVICE_SID — set" />
            <div className={`flex items-center gap-2 px-4 py-3 rounded-xl border ${
              config.service_sid_valid
                ? 'bg-emerald-500/10 border-emerald-500/30'
                : 'bg-red-500/10 border-red-500/30'
            }`}>
              {config.service_sid_valid
                ? <CheckCircle className="w-4 h-4 text-emerald-400 flex-shrink-0" />
                : <AlertCircle className="w-4 h-4 text-red-400 flex-shrink-0" />}
              <div>
                <p className={`text-sm font-medium ${config.service_sid_valid ? 'text-emerald-300' : 'text-red-300'}`}>
                  Verify Service SID format — {config.service_sid_valid ? 'valid (starts with VA)' : 'INVALID'}
                </p>
                {!config.service_sid_valid && config.service_sid_prefix && (
                  <p className="text-xs text-red-400 mt-0.5 font-mono">
                    Current prefix: <strong>&quot;{config.service_sid_prefix}&quot;</strong> — must be &quot;VA&quot;
                  </p>
                )}
              </div>
            </div>

            {allConfigOk && (
              <div className="flex items-center gap-2 bg-emerald-500/10 border border-emerald-500/30 rounded-xl px-4 py-3 mt-1">
                <CheckCircle className="w-4 h-4 text-emerald-400" />
                <p className="text-sm font-semibold text-emerald-300">All Twilio credentials look correct</p>
              </div>
            )}
          </div>
        ) : (
          <p className="text-sm text-gray-500 text-center py-4">
            Click &ldquo;Check Config&rdquo; to probe credentials
          </p>
        )}
      </div>

      {/* ── Section 2: Send OTP Test ── */}
      <div className="bg-gray-900 border border-gray-800 rounded-2xl p-5 mb-5">
        <div className="flex items-center gap-2 mb-4">
          <Send className="w-4 h-4 text-gray-400" />
          <h2 className="text-sm font-bold">Send OTP Test</h2>
        </div>

        <div className="space-y-3">
          <div>
            <Label className="text-xs text-gray-400 mb-1 block">Phone number (E.164 format)</Label>
            <div className="flex gap-2">
              <div className="relative flex-1">
                <Phone className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
                <Input
                  type="tel"
                  value={testPhone}
                  onChange={e => { setTestPhone(e.target.value); setOtpSent(false); }}
                  placeholder="+447911123456"
                  className="pl-9 bg-gray-800 border-gray-700 text-white focus:border-green-500 h-10"
                />
              </div>
              <Button onClick={handleSendOtp} disabled={sending || !testPhone}
                className="bg-green-600 hover:bg-green-700 text-white h-10 px-5 font-semibold">
                {sending ? <RefreshCw className="w-4 h-4 animate-spin" /> : 'Send OTP'}
              </Button>
            </div>
          </div>
          <ResultCard result={sendResult} />
        </div>
      </div>

      {/* ── Section 3: Verify OTP Test ── */}
      <div className="bg-gray-900 border border-gray-800 rounded-2xl p-5 mb-5">
        <div className="flex items-center gap-2 mb-4">
          <Key className="w-4 h-4 text-gray-400" />
          <h2 className="text-sm font-bold">Verify OTP Test</h2>
          {otpSent && (
            <span className="ml-auto text-xs text-green-400 font-medium flex items-center gap-1">
              <CheckCircle className="w-3 h-3" /> OTP sent — enter code below
            </span>
          )}
        </div>

        <div className="space-y-3">
          <div>
            <Label className="text-xs text-gray-400 mb-1 block">6-digit OTP code received</Label>
            <div className="flex gap-2">
              <Input
                type="text"
                maxLength={6}
                value={testCode}
                onChange={e => setTestCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
                placeholder="123456"
                className="bg-gray-800 border-gray-700 text-white focus:border-green-500 h-10 font-mono text-lg tracking-widest w-40"
              />
              <Button onClick={handleVerifyOtp} disabled={verifying || !testPhone || testCode.length < 6}
                className="bg-blue-600 hover:bg-blue-700 text-white h-10 px-5 font-semibold">
                {verifying ? <RefreshCw className="w-4 h-4 animate-spin" /> : 'Verify'}
              </Button>
              <Button onClick={handleTestInvalidOtp} disabled={verifying || !testPhone}
                variant="outline"
                className="border-gray-700 text-gray-300 hover:bg-gray-800 h-10 px-4 text-xs">
                Test Invalid
              </Button>
            </div>
          </div>
          <ResultCard result={verifyResult} />
        </div>
      </div>

      {/* ── Section 4: Test Guide ── */}
      <div className="bg-gray-900 border border-gray-800 rounded-2xl p-5">
        <div className="flex items-center gap-2 mb-4">
          <MessageSquare className="w-4 h-4 text-gray-400" />
          <h2 className="text-sm font-bold">Test Checklist</h2>
        </div>
        <div className="space-y-2 text-sm">
          {[
            { label: 'Send OTP',       desc: 'Enter a real phone number and click Send OTP — you should receive an SMS within 10 seconds' },
            { label: 'Verify OTP',     desc: 'Enter the 6-digit code from the SMS and click Verify — should return success' },
            { label: 'Invalid OTP',    desc: 'Click "Test Invalid" with any phone — should be rejected with "Invalid or expired"' },
            { label: 'Expired OTP',    desc: 'Wait 10 minutes then try verifying the same code — should return "expired"' },
          ].map(t => (
            <div key={t.label} className="flex gap-3 px-4 py-3 bg-gray-800 rounded-xl">
              <span className="text-xs font-bold text-green-400 w-24 flex-shrink-0">{t.label}</span>
              <span className="text-xs text-gray-400">{t.desc}</span>
            </div>
          ))}
        </div>
      </div>

    </div>
  );
}
