'use client';

import { useState, useEffect, useRef, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useAuth } from '@/lib/context/AuthContext';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';
import { InputOTP, InputOTPGroup, InputOTPSlot } from '@/components/ui/input-otp';
import { useToast } from '@/hooks/use-toast';
import { Phone, Clock, CircleCheck as CheckCircle2, ShieldCheck } from 'lucide-react';

const OTP_TTL = 60;

function toE164(raw: string): string {
  const cleaned = raw.replace(/\D/g, '');
  if (raw.startsWith('+')) return '+' + cleaned;
  if (cleaned.startsWith('07') && cleaned.length === 11) return '+44' + cleaned.slice(1);
  if (cleaned.startsWith('44')) return '+' + cleaned;
  return '+44' + cleaned;
}

type Step = 'phone' | 'otp' | 'done';

function CompleteProfileContent() {
  const { user, profile, loading, signInWithPhoneOtp, verifyPhoneOtp, markPhoneVerified, saveProfile, refreshProfile } = useAuth();
  const router = useRouter();
  const searchParams = useSearchParams();
  const { toast } = useToast();

  const returnTo = searchParams.get('returnTo') || '/account';

  const [step, setStep] = useState<Step>('phone');
  const [phoneInput, setPhoneInput] = useState('');
  const [sentPhone, setSentPhone] = useState('');
  const [otp, setOtp] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const [countdown, setCountdown] = useState(0);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const hasPrefilled = useRef(false);
  const isExpired = countdown === 0 && sentPhone !== '';

  function startCountdown() {
    if (timerRef.current) clearInterval(timerRef.current);
    setCountdown(OTP_TTL);
    timerRef.current = setInterval(() => {
      setCountdown(prev => {
        if (prev <= 1) { clearInterval(timerRef.current!); return 0; }
        return prev - 1;
      });
    }, 1000);
  }
  useEffect(() => () => { if (timerRef.current) clearInterval(timerRef.current); }, []);

  // Pre-fill phone from profile exactly once after auth resolves.
  // Using a ref guard prevents subsequent profile reference changes (caused by
  // onAuthStateChange TOKEN_REFRESHED / SIGNED_IN re-firing applySession) from
  // overwriting whatever the user has already typed into the field.
  useEffect(() => {
    if (!loading && !hasPrefilled.current) {
      hasPrefilled.current = true;
      if (profile?.phone && !profile.phone_verified) {
        setPhoneInput(profile.phone);
      }
    }
  }, [loading, profile]);

  // Already verified — send them on
  useEffect(() => {
    if (!loading && user) {
      const isAdmin = !!(user?.app_metadata?.is_admin);
      if (isAdmin || profile?.phone_verified) {
        router.replace(returnTo);
      }
    }
  }, [loading, user, profile, returnTo, router]);

  // Not logged in — send to account (which shows login)
  useEffect(() => {
    if (!loading && !user) {
      router.replace('/account');
    }
  }, [loading, user, router]);

  const handleSendOtp = async () => {
    if (!phoneInput.trim()) {
      toast({ title: 'Phone required', description: 'Enter your UK phone number', variant: 'destructive' });
      return;
    }
    const e164 = toE164(phoneInput.trim());
    setSubmitting(true);
    try {
      console.log('SEND PHONE:', e164);
      const { error } = await signInWithPhoneOtp(e164);
      if (error) {
        toast({ title: 'Failed to send code', description: error.message, variant: 'destructive' });
        return;
      }
      setSentPhone(e164);
      setOtp('');
      startCountdown();
      setStep('otp');
      toast({ title: 'Code sent!', description: `Verification code sent to ${e164}` });
    } catch {
      toast({ title: 'Error', description: 'Something went wrong. Please try again.', variant: 'destructive' });
    } finally {
      setSubmitting(false);
    }
  };

  const handleResend = async () => {
    if (countdown > 0) return;
    const e164 = toE164(phoneInput.trim());
    setSubmitting(true);
    try {
      console.log('SEND PHONE (resend):', e164);
      const { error } = await signInWithPhoneOtp(e164);
      if (error) {
        toast({ title: 'Failed to resend', description: error.message, variant: 'destructive' });
        return;
      }
      setSentPhone(e164);
      setOtp('');
      startCountdown();
      toast({ title: 'New code sent!', description: `Sent to ${e164}` });
    } catch {
      toast({ title: 'Error', description: 'Something went wrong.', variant: 'destructive' });
    } finally {
      setSubmitting(false);
    }
  };

  const handleVerifyOtp = async () => {
    if (otp.length !== 6) {
      toast({ title: 'Enter the 6-digit code', variant: 'destructive' });
      return;
    }
    if (isExpired) {
      toast({ title: 'Code expired', description: 'Please request a new one.', variant: 'destructive' });
      return;
    }
    setSubmitting(true);
    try {
      console.log('VERIFY PHONE:', sentPhone);
      const { error } = await verifyPhoneOtp(sentPhone, otp);
      if (error) {
        const msg = error.message?.toLowerCase() ?? '';
        toast({
          title: 'Verification failed',
          description: msg.includes('expired') || msg.includes('invalid')
            ? 'Code expired. Please request a new one.'
            : error.message,
          variant: 'destructive',
        });
        return;
      }

      // Persist verified phone to user_profiles
      const { error: profileErr } = await markPhoneVerified(sentPhone);
      if (profileErr) {
        toast({ title: 'Could not save phone', description: profileErr.message, variant: 'destructive' });
        return;
      }

      setStep('done');
      toast({ title: 'Phone verified!', description: 'Your number has been confirmed.' });
      setTimeout(() => router.replace(returnTo), 1500);
    } catch {
      toast({ title: 'Error', description: 'Something went wrong. Please try again.', variant: 'destructive' });
    } finally {
      setSubmitting(false);
    }
  };

  // Show loading screen while auth is resolving OR while profile fetch is in-flight
  // (profile === undefined). This prevents the phone form from flashing briefly for
  // users who are already verified but whose profile hasn't settled yet.
  if (loading || (user && profile === undefined)) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p className="text-gray-500 text-sm">Loading…</p>
      </div>
    );
  }

  // Profile settled and phone is verified (or user is admin) — redirect is imminent.
  if (!loading && user && (profile?.phone_verified || !!(user?.app_metadata?.is_admin))) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p className="text-gray-500 text-sm">Redirecting…</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center px-4 py-16">
      <div className="w-full max-w-md">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-green-100 mb-4">
            <ShieldCheck className="h-8 w-8 text-green-600" />
          </div>
          <h1 className="text-2xl font-bold text-gray-900">Verify Your Phone</h1>
          <p className="mt-2 text-sm text-gray-500">
            Required for order notifications and account security
          </p>
        </div>

        <Card className="p-6 shadow-sm">

          {/* Step: phone input */}
          {step === 'phone' && (
            <div className="space-y-5">
              <div>
                <Label htmlFor="phone" className="text-sm font-medium">UK Phone Number</Label>
                <div className="mt-1.5 relative">
                  <Phone className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400 pointer-events-none" />
                  <Input
                    id="phone"
                    type="tel"
                    placeholder="07700 900000"
                    value={phoneInput}
                    onChange={e => setPhoneInput(e.target.value)}
                    onKeyDown={e => e.key === 'Enter' && handleSendOtp()}
                    className="pl-10"
                    autoFocus
                  />
                </div>
                <p className="mt-1 text-xs text-gray-400">Auto-formatted to +44…</p>
              </div>

              <Button
                onClick={handleSendOtp}
                disabled={submitting || !phoneInput.trim()}
                className="w-full bg-green-600 hover:bg-green-700 text-white h-11"
              >
                {submitting ? 'Sending…' : 'Send Verification Code'}
              </Button>
            </div>
          )}

          {/* Step: OTP entry */}
          {step === 'otp' && (
            <div className="space-y-5">
              <div className="text-center">
                <p className="text-sm text-gray-600">
                  Code sent to <span className="font-semibold text-gray-800">{sentPhone}</span>
                </p>
                <button
                  onClick={() => { setStep('phone'); setOtp(''); setSentPhone(''); if (timerRef.current) clearInterval(timerRef.current); setCountdown(0); }}
                  className="mt-1 text-xs text-gray-400 hover:text-gray-600 underline"
                >
                  Change number
                </button>
              </div>

              <div className="flex justify-center">
                <InputOTP
                  maxLength={6}
                  value={otp}
                  onChange={setOtp}
                  disabled={isExpired || submitting}
                >
                  <InputOTPGroup>
                    <InputOTPSlot index={0} />
                    <InputOTPSlot index={1} />
                    <InputOTPSlot index={2} />
                    <InputOTPSlot index={3} />
                    <InputOTPSlot index={4} />
                    <InputOTPSlot index={5} />
                  </InputOTPGroup>
                </InputOTP>
              </div>

              {/* Countdown */}
              <div className="flex items-center justify-center gap-1.5 text-sm min-h-5">
                {countdown > 0 ? (
                  <>
                    <Clock className="h-3.5 w-3.5 text-gray-400" />
                    <span className="text-gray-500">
                      Expires in <span className="font-semibold tabular-nums text-gray-700">{countdown}s</span>
                    </span>
                  </>
                ) : (
                  <span className="text-red-500 font-medium">Code expired. Request a new one.</span>
                )}
              </div>

              <Button
                onClick={handleVerifyOtp}
                disabled={otp.length !== 6 || isExpired || submitting}
                className="w-full bg-green-600 hover:bg-green-700 text-white h-11 disabled:opacity-50"
              >
                {submitting ? 'Verifying…' : isExpired ? 'Code Expired' : 'Verify Code'}
              </Button>

              <div className="text-center">
                <button
                  onClick={handleResend}
                  disabled={countdown > 0 || submitting}
                  className="text-sm text-green-600 hover:text-green-700 font-medium disabled:text-gray-400 disabled:cursor-not-allowed transition-colors"
                >
                  {countdown > 0 ? `Resend in ${countdown}s` : 'Resend code'}
                </button>
              </div>
            </div>
          )}

          {/* Step: done */}
          {step === 'done' && (
            <div className="py-6 text-center space-y-3">
              <CheckCircle2 className="h-12 w-12 text-green-500 mx-auto" />
              <p className="font-semibold text-gray-800">Phone verified!</p>
              <p className="text-sm text-gray-500">Redirecting you now…</p>
            </div>
          )}
        </Card>

        {/* Trust note */}
        {step !== 'done' && (
          <p className="mt-4 text-center text-xs text-gray-400">
            We use your number only for order and delivery notifications.
          </p>
        )}
      </div>
    </div>
  );
}

export default function CompleteProfilePage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen flex items-center justify-center">
        <p className="text-gray-500 text-sm">Loading…</p>
      </div>
    }>
      <CompleteProfileContent />
    </Suspense>
  );
}
