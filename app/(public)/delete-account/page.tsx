'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Trash2, ShieldCheck, Clock, Mail, LogIn, CircleCheck as CheckCircle2, TriangleAlert as AlertTriangle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import { useAuth } from '@/lib/context/AuthContext';
import { getSupabase } from '@/lib/supabase/client';
import { useToast } from '@/hooks/use-toast';

export default function DeleteAccountPage() {
  const { user, loading } = useAuth();
  const { toast } = useToast();
  const router = useRouter();
  const [submitted, setSubmitted] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const handleRequestDeletion = async () => {
    if (!user) return;
    setSubmitting(true);
    try {
      const supabase = getSupabase();
      const { error } = await supabase
        .from('account_deletion_requests')
        .insert({
          user_id: user.id,
          email: user.email ?? '',
          status: 'pending',
        });

      if (error) throw error;
      setSubmitted(true);
    } catch (err) {
      console.error('Deletion request error:', err);
      toast({
        title: 'Request failed',
        description: 'Please email privacy@keralagrocery.com to request account deletion.',
        variant: 'destructive',
      });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b border-gray-200">
        <div className="max-w-2xl mx-auto px-4 py-5 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2">
            <span className="text-xl font-bold text-green-700">Kerala Groceries</span>
            <span className="text-xs text-gray-400 font-normal">by Tasty Kerala Ltd</span>
          </Link>
        </div>
      </div>

      <div className="max-w-2xl mx-auto px-4 py-10 space-y-8">

        {/* Page title */}
        <div>
          <div className="flex items-center gap-3 mb-2">
            <div className="w-10 h-10 bg-red-100 rounded-full flex items-center justify-center flex-shrink-0">
              <Trash2 className="h-5 w-5 text-red-600" />
            </div>
            <h1 className="text-2xl font-bold text-gray-900">Request Account Deletion</h1>
          </div>
          <p className="text-gray-500 text-sm ml-[52px]">
            Kerala Groceries &mdash; operated by Tasty Kerala Ltd
          </p>
        </div>

        {submitted ? (
          <Card className="p-8 border-green-200 bg-green-50 text-center space-y-4">
            <CheckCircle2 className="h-12 w-12 text-green-600 mx-auto" />
            <h2 className="text-xl font-bold text-green-800">Request Received</h2>
            <p className="text-green-700 text-sm leading-relaxed">
              Your account deletion request has been submitted. We will process it within <strong>30 days</strong> and send a confirmation to <strong>{user?.email}</strong>.
            </p>
            <Button variant="outline" className="mt-2" onClick={() => router.push('/')}>
              Return to Home
            </Button>
          </Card>
        ) : (
          <>
            {/* Steps */}
            <Card className="p-6 space-y-5">
              <h2 className="font-semibold text-gray-900 text-base">How to request account deletion</h2>

              <div className="space-y-4">
                <Step number={1} title="Sign in to your account">
                  Log in at{' '}
                  <Link href="/account" className="text-green-700 underline underline-offset-2">
                    keralagrocery.com/account
                  </Link>{' '}
                  using your email address or phone number.
                </Step>

                <Step number={2} title="Open Account Settings">
                  Scroll to the <strong>Delete Account</strong> section at the bottom of the account page.
                </Step>

                <Step number={3} title="Submit the deletion request">
                  Click <strong>&quot;Request Account Deletion&quot;</strong> and confirm. Your request is logged immediately.
                </Step>

                <Step number={4} title="We process your request">
                  We will delete your personal data within <strong>30 days</strong> and send a confirmation email to your registered address.
                </Step>
              </div>

              <Separator />

              <p className="text-xs text-gray-500">
                Alternatively, you can submit your request directly below if you are already signed in.
              </p>
            </Card>

            {/* Data retention notice */}
            <Card className="p-6 space-y-4">
              <div className="flex items-center gap-2 mb-1">
                <ShieldCheck className="h-4 w-4 text-gray-600" />
                <h2 className="font-semibold text-gray-900 text-base">What data is deleted and what is kept</h2>
              </div>

              <div className="space-y-3 text-sm text-gray-700 leading-relaxed">
                <DataRow
                  label="Deleted within 30 days"
                  items={[
                    'Name, email address, phone number',
                    'Delivery addresses',
                    'Login credentials and authentication tokens',
                    'Wallet balance and cashback history',
                    'Wishlist and browsing history',
                  ]}
                  deleted
                />
                <DataRow
                  label="Retained for legal compliance"
                  items={[
                    'Order records — retained for up to 7 years (UK tax and consumer law)',
                    'Payment transaction records — retained for up to 7 years (HMRC requirements)',
                    'Anonymised analytics data (no personal identifiers)',
                  ]}
                  deleted={false}
                />
              </div>
            </Card>

            {/* Email option */}
            <Card className="p-6 flex items-start gap-4">
              <div className="w-9 h-9 bg-blue-50 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5">
                <Mail className="h-4 w-4 text-blue-600" />
              </div>
              <div>
                <p className="font-semibold text-gray-900 text-sm mb-1">Prefer to request by email?</p>
                <p className="text-sm text-gray-600 leading-relaxed">
                  Email us at{' '}
                  <a href="mailto:privacy@keralagrocery.com" className="text-green-700 underline underline-offset-2">
                    privacy@keralagrocery.com
                  </a>{' '}
                  with the subject line <strong>&quot;Account Deletion Request&quot;</strong> and your registered email address. We will respond within 30 days.
                </p>
              </div>
            </Card>

            {/* Inline action for signed-in users */}
            <Card className="p-6">
              {loading ? (
                <p className="text-sm text-gray-500 text-center py-2">Loading...</p>
              ) : user ? (
                <div className="space-y-3">
                  <div className="flex items-center gap-2 text-sm text-gray-700">
                    <CheckCircle2 className="h-4 w-4 text-green-600 flex-shrink-0" />
                    <span>Signed in as <strong>{user.email}</strong></span>
                  </div>
                  <AlertDialog>
                    <AlertDialogTrigger asChild>
                      <Button
                        variant="outline"
                        className="w-full text-red-600 hover:text-red-700 hover:bg-red-50 border-red-200"
                        disabled={submitting}
                      >
                        <Trash2 className="mr-2 h-4 w-4" />
                        {submitting ? 'Submitting...' : 'Submit Deletion Request Now'}
                      </Button>
                    </AlertDialogTrigger>
                    <AlertDialogContent>
                      <AlertDialogHeader>
                        <AlertDialogTitle>Confirm account deletion request</AlertDialogTitle>
                        <AlertDialogDescription asChild>
                          <div className="space-y-3 text-sm">
                            <p>This will submit a GDPR right-to-erasure request for:</p>
                            <p className="font-medium text-gray-900">{user.email}</p>
                            <ul className="list-disc pl-4 space-y-1 text-gray-600">
                              <li>Your personal data will be deleted within 30 days</li>
                              <li>Order and financial records are retained for legal compliance</li>
                              <li>A confirmation email will be sent to your address</li>
                            </ul>
                          </div>
                        </AlertDialogDescription>
                      </AlertDialogHeader>
                      <AlertDialogFooter>
                        <AlertDialogCancel>Cancel</AlertDialogCancel>
                        <AlertDialogAction
                          onClick={handleRequestDeletion}
                          className="bg-red-600 hover:bg-red-700 text-white"
                        >
                          Yes, request deletion
                        </AlertDialogAction>
                      </AlertDialogFooter>
                    </AlertDialogContent>
                  </AlertDialog>
                </div>
              ) : (
                <div className="space-y-3 text-center">
                  <div className="flex items-center gap-2 justify-center text-sm text-gray-500 mb-1">
                    <AlertTriangle className="h-4 w-4 text-amber-500" />
                    <span>You are not signed in</span>
                  </div>
                  <p className="text-xs text-gray-500">Sign in to submit your request instantly, or email us using the address above.</p>
                  <Button asChild className="bg-green-700 hover:bg-green-800 text-white">
                    <Link href="/account">
                      <LogIn className="mr-2 h-4 w-4" />
                      Sign In
                    </Link>
                  </Button>
                </div>
              )}
            </Card>

            {/* Timeline */}
            <Card className="p-6 flex items-start gap-4">
              <div className="w-9 h-9 bg-amber-50 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5">
                <Clock className="h-4 w-4 text-amber-600" />
              </div>
              <div>
                <p className="font-semibold text-gray-900 text-sm mb-1">Processing timeline</p>
                <p className="text-sm text-gray-600 leading-relaxed">
                  We process all deletion requests within <strong>30 days</strong> as required by the UK General Data Protection Regulation (UK GDPR). You will receive an email confirmation once your account has been deleted.
                </p>
              </div>
            </Card>
          </>
        )}

        <p className="text-xs text-center text-gray-400 pb-4">
          Kerala Groceries &bull; Tasty Kerala Ltd &bull;{' '}
          <Link href="/privacy" className="underline">Privacy Policy</Link>
          {' '}&bull;{' '}
          <a href="mailto:privacy@keralagrocery.com" className="underline">privacy@keralagrocery.com</a>
        </p>
      </div>
    </div>
  );
}

function Step({ number, title, children }: { number: number; title: string; children: React.ReactNode }) {
  return (
    <div className="flex gap-4">
      <div className="w-7 h-7 rounded-full bg-green-700 text-white text-xs font-bold flex items-center justify-center flex-shrink-0 mt-0.5">
        {number}
      </div>
      <div>
        <p className="font-semibold text-gray-900 text-sm mb-0.5">{title}</p>
        <p className="text-sm text-gray-600 leading-relaxed">{children}</p>
      </div>
    </div>
  );
}

function DataRow({ label, items, deleted }: { label: string; items: string[]; deleted: boolean }) {
  return (
    <div>
      <p className={`font-semibold mb-1.5 ${deleted ? 'text-red-700' : 'text-amber-700'}`}>{label}</p>
      <ul className="space-y-1 pl-4">
        {items.map((item) => (
          <li key={item} className="flex items-start gap-2">
            <span className={`mt-1.5 w-1.5 h-1.5 rounded-full flex-shrink-0 ${deleted ? 'bg-red-400' : 'bg-amber-400'}`} />
            {item}
          </li>
        ))}
      </ul>
    </div>
  );
}
