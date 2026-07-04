'use client';

import { useState, useEffect, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { useAuth } from '@/lib/context/AuthContext';
import { useToast } from '@/hooks/use-toast';
import Image from 'next/image';
import { Mail, Phone, Chrome, Clock, Apple } from 'lucide-react';
import { InputOTP, InputOTPGroup, InputOTPSlot } from '@/components/ui/input-otp';

// ── Types ────────────────────────────────────────────────────────────────────

type AuthMode = 'select' | 'email' | 'phone' | 'verify-otp';

const OTP_TTL = 60;

// ── Utils ────────────────────────────────────────────────────────────────────

function toE164(raw: string): string {
  const cleaned = raw.replace(/\D/g, '');
  if (raw.startsWith('+')) return '+' + cleaned;
  if (cleaned.startsWith('07') && cleaned.length === 11) return '+44' + cleaned.slice(1);
  if (cleaned.startsWith('44')) return '+' + cleaned;
  return '+44' + cleaned;
}

// ── Component ────────────────────────────────────────────────────────────────

export default function LoginForm() {
  const { signIn, signUp, signInWithGoogle, signInWithApple, signInWithPhoneOtp, verifyPhoneOtp, saveProfile, markPhoneVerified } = useAuth();
  const { toast } = useToast();

  const [mode, setMode] = useState<AuthMode>('select');
  const [isLogin, setIsLogin] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Email/password fields
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

  // Pending signup data — held until phone verified
  const [pendingSignup, setPendingSignup] = useState<{ name: string; email: string; password: string } | null>(null);
  const [agreedToTerms, setAgreedToTerms] = useState(false);

  // Phone OTP
  const [phoneInput, setPhoneInput] = useState('');
  const [sentPhone, setSentPhone] = useState('');
  const [otp, setOtp] = useState('');

  // Countdown
  const [countdown, setCountdown] = useState(0);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
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

  // ── Google ──────────────────────────────────────────────────────────────────
  const handleGoogleLogin = async () => {
    setIsSubmitting(true);
    try {
      const { error } = await signInWithGoogle();
      if (error) toast({ title: 'Google login failed', description: error.message, variant: 'destructive' });
    } catch {
      toast({ title: 'Error', description: 'Something went wrong. Please try again.', variant: 'destructive' });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleAppleLogin = async () => {
    setIsSubmitting(true);
    try {
      const { error } = await signInWithApple();
      if (error) toast({ title: 'Apple login failed', description: error.message, variant: 'destructive' });
    } catch {
      toast({ title: 'Error', description: 'Something went wrong. Please try again.', variant: 'destructive' });
    } finally {
      setIsSubmitting(false);
    }
  };

  // ── Email/password submit ────────────────────────────────────────────────────
  const handleEmailSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isLogin) {
      // Login: just sign in directly
      setIsSubmitting(true);
      try {
        const { error } = await signIn(email, password);
        if (error) {
          toast({ title: 'Login failed', description: error.message || 'Invalid credentials', variant: 'destructive' });
        } else {
          toast({ title: 'Welcome back!' });
        }
      } catch {
        toast({ title: 'Error', description: 'Something went wrong.', variant: 'destructive' });
      } finally {
        setIsSubmitting(false);
      }
      return;
    }

    // Signup: create account directly, save profile
    if (!name.trim()) {
      toast({ title: 'Name required', description: 'Please enter your full name', variant: 'destructive' });
      return;
    }
    if (!agreedToTerms) {
      toast({ title: 'Agreement required', description: 'Please agree to our Terms & Conditions and Privacy Policy', variant: 'destructive' });
      return;
    }

    setIsSubmitting(true);
    try {
      const { error: signUpErr } = await signUp(email, password);
      if (signUpErr) {
        toast({ title: 'Signup failed', description: signUpErr.message, variant: 'destructive' });
        return;
      }
      await saveProfile({
        name: name.trim(),
        email,
        phone: phoneInput.trim() ? toE164(phoneInput.trim()) : null,
        phone_verified: false,
      });
      toast({ title: 'Account created!', description: 'Welcome to Kerala Grocery UK.' });
    } catch {
      toast({ title: 'Error', description: 'Something went wrong.', variant: 'destructive' });
    } finally {
      setIsSubmitting(false);
    }
  };

  // ── Phone-only send OTP (pure phone login) ──────────────────────────────────
  const handleSendOtp = async () => {
    if (!phoneInput.trim()) {
      toast({ title: 'Phone required', description: 'Please enter your phone number', variant: 'destructive' });
      return;
    }
    if (countdown > 0 && sentPhone) {
      toast({ title: 'Please wait', description: `You can resend in ${countdown}s`, variant: 'destructive' });
      return;
    }
    const e164 = toE164(phoneInput.trim());
    setIsSubmitting(true);
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
      setMode('verify-otp');
      toast({ title: 'Code sent!', description: `Verification code sent to ${e164}` });
    } catch {
      toast({ title: 'Error', description: 'Something went wrong.', variant: 'destructive' });
    } finally {
      setIsSubmitting(false);
    }
  };

  // ── Resend ──────────────────────────────────────────────────────────────────
  const handleResend = async () => {
    if (countdown > 0) return;
    const e164 = toE164(phoneInput.trim());
    setIsSubmitting(true);
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
      setIsSubmitting(false);
    }
  };

  // ── Verify OTP ──────────────────────────────────────────────────────────────
  const handleVerifyOtp = async () => {
    if (otp.length !== 6) {
      toast({ title: 'Enter the 6-digit code', variant: 'destructive' });
      return;
    }
    if (isExpired) {
      toast({ title: 'Code expired', description: 'Please request a new one.', variant: 'destructive' });
      return;
    }

    setIsSubmitting(true);
    try {
      console.log('VERIFY PHONE:', sentPhone);
      const { error } = await verifyPhoneOtp(sentPhone, otp);
      if (error) {
        const msg = error.message?.toLowerCase() ?? '';
        toast({
          title: 'Verification failed',
          description: msg.includes('expired') || msg.includes('invalid')
            ? 'Code expired. Please request a new one.'
            : error.message || 'Invalid verification code',
          variant: 'destructive',
        });
        return;
      }

      // If this was a signup flow: create the account now, then save profile
      if (pendingSignup) {
        const { error: signUpErr } = await signUp(pendingSignup.email, pendingSignup.password);
        if (signUpErr) {
          toast({ title: 'Account creation failed', description: signUpErr.message, variant: 'destructive' });
          return;
        }
        await saveProfile({
          name: pendingSignup.name,
          email: pendingSignup.email,
          phone: sentPhone,
          phone_verified: true,
        });
        setPendingSignup(null);
        toast({ title: 'Account created!', description: 'Welcome to Kerala Grocery UK.' });
      } else {
        // Pure phone login — mark phone verified on profile
        await markPhoneVerified(sentPhone);
        toast({ title: 'Welcome!', description: 'Phone verified successfully.' });
      }
    } catch {
      toast({ title: 'Error', description: 'Something went wrong.', variant: 'destructive' });
    } finally {
      setIsSubmitting(false);
    }
  };

  // ── Render: select ──────────────────────────────────────────────────────────
  if (mode === 'select') {
    return (
      <Card className="p-8">
        <div className="text-center mb-6">
          <Image src="/logo_KG_Trans.png" alt="Kerala Groceries UK" width={80} height={80} className="rounded-2xl mx-auto mb-4 object-contain" />
          <h1 className="text-2xl font-bold mb-2">Welcome</h1>
          <p className="text-gray-600">Sign in to Kerala Grocery UK</p>
        </div>
        <div className="space-y-3">
          <Button onClick={handleAppleLogin} disabled={isSubmitting} variant="outline" className="w-full h-12 text-base font-medium bg-black text-white hover:bg-black/90">
            <Apple className="mr-2 h-5 w-5 fill-current" />
            Continue with Apple
          </Button>
          <Button onClick={handleGoogleLogin} disabled={isSubmitting} variant="outline" className="w-full h-12 text-base font-medium">
            <Chrome className="mr-2 h-5 w-5" />
            Continue with Google
          </Button>
          <Button onClick={() => setMode('phone')} variant="outline" className="w-full h-12 text-base font-medium">
            <Phone className="mr-2 h-5 w-5" />
            Continue with Phone
          </Button>
          <Button onClick={() => setMode('email')} variant="outline" className="w-full h-12 text-base font-medium">
            <Mail className="mr-2 h-5 w-5" />
            Continue with Email
          </Button>
        </div>
        <p className="mt-6 text-center text-sm text-gray-600">
          By continuing, you agree to our Terms of Service and Privacy Policy
        </p>
      </Card>
    );
  }

  // ── Render: email / signup ──────────────────────────────────────────────────
  if (mode === 'email') {
    return (
      <Card className="p-8">
        <div className="text-center mb-6">
          <Image src="/logo_KG_Trans.png" alt="Kerala Groceries UK" width={64} height={64} className="rounded-2xl mx-auto mb-4 object-contain" />
          <h1 className="text-2xl font-bold mb-2">{isLogin ? 'Welcome Back' : 'Create Account'}</h1>
          <p className="text-gray-600">{isLogin ? 'Sign in with your email' : 'Sign up with email'}</p>
        </div>

        <form onSubmit={handleEmailSubmit} className="space-y-4">
          {!isLogin && (
            <div>
              <Label htmlFor="name">Full Name</Label>
              <Input
                id="name"
                type="text"
                placeholder="Your name"
                value={name}
                onChange={e => setName(e.target.value)}
                required
                className="mt-1"
              />
            </div>
          )}
          <div>
            <Label htmlFor="email">Email</Label>
            <Input
              id="email"
              type="email"
              placeholder="your@email.com"
              value={email}
              onChange={e => setEmail(e.target.value)}
              required
              className="mt-1"
            />
          </div>
          <div>
            <Label htmlFor="password">Password</Label>
            <Input
              id="password"
              type="password"
              placeholder="••••••••"
              value={password}
              onChange={e => setPassword(e.target.value)}
              required
              className="mt-1"
            />
          </div>
          {!isLogin && (
            <div>
              <Label htmlFor="signup-phone">UK Phone Number <span className="text-gray-400 font-normal">(optional)</span></Label>
              <Input
                id="signup-phone"
                type="tel"
                placeholder="07700 900000"
                value={phoneInput}
                onChange={e => setPhoneInput(e.target.value)}
                className="mt-1"
              />
              <p className="text-xs text-gray-500 mt-1">For order notifications. Auto-formatted to +44…</p>
            </div>
          )}
          {!isLogin && (
            <label className="flex items-start gap-2.5 cursor-pointer">
              <input
                type="checkbox"
                checked={agreedToTerms}
                onChange={e => setAgreedToTerms(e.target.checked)}
                className="mt-0.5 h-4 w-4 rounded border-gray-300 text-green-600 accent-green-600 cursor-pointer flex-shrink-0"
              />
              <span className="text-xs text-gray-600 leading-relaxed">
                I agree to the{' '}
                <a href="/terms" target="_blank" rel="noopener noreferrer" className="text-green-600 hover:underline font-medium">
                  Terms &amp; Conditions
                </a>{' '}
                and{' '}
                <a href="/privacy" target="_blank" rel="noopener noreferrer" className="text-green-600 hover:underline font-medium">
                  Privacy Policy
                </a>
              </span>
            </label>
          )}
          <Button
            type="submit"
            className="w-full bg-green-600 hover:bg-green-700 text-white"
            disabled={isSubmitting || (!isLogin && !agreedToTerms)}
          >
            {isSubmitting
              ? 'Please wait…'
              : isLogin
              ? 'Sign In'
              : 'Create Account'}
          </Button>
        </form>

        <div className="mt-6 text-center space-y-3">
          <button onClick={() => { setIsLogin(!isLogin); setName(''); setPhoneInput(''); setAgreedToTerms(false); }} className="text-sm text-green-600 hover:text-green-700 font-medium">
            {isLogin ? "Don't have an account? Sign up" : 'Already have an account? Sign in'}
          </button>
          <div>
            <Separator className="my-4" />
            <button onClick={() => setMode('select')} className="text-sm text-gray-600 hover:text-gray-700">
              Back to login options
            </button>
          </div>
        </div>
      </Card>
    );
  }

  // ── Render: phone input ─────────────────────────────────────────────────────
  if (mode === 'phone') {
    return (
      <Card className="p-8">
        <div className="text-center mb-6">
          <Image src="/logo_KG_Trans.png" alt="Kerala Groceries UK" width={64} height={64} className="rounded-2xl mx-auto mb-4 object-contain" />
          <h1 className="text-2xl font-bold mb-2">Phone Verification</h1>
          <p className="text-gray-600">Enter your UK phone number to continue</p>
        </div>
        <div className="space-y-4">
          <div>
            <Label htmlFor="phone">Phone Number</Label>
            <Input
              id="phone"
              type="tel"
              placeholder="07700 900000"
              value={phoneInput}
              onChange={e => setPhoneInput(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && handleSendOtp()}
              className="mt-1"
            />
            <p className="text-xs text-gray-500 mt-1">Auto-formatted to +44…</p>
          </div>
          <Button
            onClick={handleSendOtp}
            disabled={isSubmitting || !phoneInput.trim()}
            className="w-full bg-green-600 hover:bg-green-700 text-white"
          >
            {isSubmitting ? 'Sending…' : 'Send Verification Code'}
          </Button>
        </div>
        <div className="mt-6 text-center">
          <Separator className="my-4" />
          <button onClick={() => setMode('select')} className="text-sm text-gray-600 hover:text-gray-700">
            Back to login options
          </button>
        </div>
      </Card>
    );
  }

  // ── Render: verify OTP ──────────────────────────────────────────────────────
  if (mode === 'verify-otp') {
    const canVerify = otp.length === 6 && !isExpired && !isSubmitting;
    const canResend = countdown === 0 && !isSubmitting;

    return (
      <Card className="p-8">
        <div className="text-center mb-6">
          <Image src="/logo_KG_Trans.png" alt="Kerala Groceries UK" width={64} height={64} className="rounded-2xl mx-auto mb-4 object-contain" />
          <h1 className="text-2xl font-bold mb-2">Enter Verification Code</h1>
          <p className="text-gray-600 text-sm">
            Code sent to <span className="font-semibold text-gray-800">{sentPhone}</span>
          </p>
          {pendingSignup && (
            <p className="mt-1 text-xs text-gray-400">Verifying your phone before creating your account</p>
          )}
        </div>

        <div className="space-y-5">
          <div className="flex justify-center">
            <InputOTP maxLength={6} value={otp} onChange={setOtp} disabled={isExpired || isSubmitting}>
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
            disabled={!canVerify}
            className="w-full bg-green-600 hover:bg-green-700 text-white disabled:opacity-50"
          >
            {isSubmitting ? 'Verifying…' : isExpired ? 'Code Expired' : 'Verify Code'}
          </Button>

          <div className="text-center">
            <button
              onClick={handleResend}
              disabled={!canResend}
              className="text-sm text-green-600 hover:text-green-700 font-medium disabled:text-gray-400 disabled:cursor-not-allowed transition-colors"
            >
              {countdown > 0 ? `Resend in ${countdown}s` : 'Resend verification code'}
            </button>
          </div>
        </div>

        <div className="mt-6 text-center">
          <Separator className="my-4" />
          <button
            onClick={() => {
              setMode(pendingSignup ? 'email' : 'phone');
              setOtp('');
              setSentPhone('');
              setPendingSignup(null);
              if (timerRef.current) clearInterval(timerRef.current);
              setCountdown(0);
            }}
            className="text-sm text-gray-600 hover:text-gray-700"
          >
            {pendingSignup ? 'Back to signup' : 'Change phone number'}
          </button>
        </div>
      </Card>
    );
  }

  // Fallback: reset to select mode if somehow an unknown mode is reached
  return (
    <Card className="p-8 text-center">
      <p className="text-gray-500 text-sm">Loading sign in...</p>
    </Card>
  );
}
