'use client';

import { useState, useEffect, useCallback } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Package, MapPin, LogOut, Mail, Phone, Trash2, ShieldCheck } from 'lucide-react';
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
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useToast } from '@/hooks/use-toast';
import LoginForm from '@/components/auth/LoginForm';
import UserProfileForm from '@/components/user/UserProfileForm';
import { getSupabase } from '@/lib/supabase/client';
import BuyItAgain from '@/components/product/BuyItAgain';

export default function AccountPage() {
  const { user, profile, loading, signOut } = useAuth();
  const router = useRouter();
  const { toast } = useToast();
  const [orders, setOrders] = useState<any[]>([]);
  const [loadingOrders, setLoadingOrders] = useState(true);
  const [userProfile, setUserProfile] = useState<any>(null);

  // Admin users bypass phone-verification onboarding — they are set up outside
  // the normal signup flow and may never have a user_profiles row.
  const isAdmin = !!(user?.app_metadata?.is_admin);

  // First-time Google OAuth users have a valid session but no profile row yet.
  // Send them to complete-profile so they set up their phone number before
  // reaching the account dashboard. Admins are exempt.
  useEffect(() => {
    if (!loading && user && !isAdmin && profile === null) {
      console.log('[Auth] AccountPage: authenticated user has no profile — redirecting to /complete-profile');
      router.replace('/complete-profile?returnTo=/account');
    }
  }, [loading, user, isAdmin, profile, router]);

  const fetchRecentOrders = useCallback(async () => {
    try {
      const supabase = getSupabase();
      const { data, error } = await supabase
        .from('orders')
        .select('*')
        .eq('user_id', user?.id)
        .order('created_at', { ascending: false })
        .limit(3);

      if (error) throw error;

      const ordersWithItems = await Promise.all(
        (data || []).map(async (order) => {
          const { data: items } = await supabase
            .from('order_items')
            .select('*')
            .eq('order_id', order.id);

          return {
            id: order.id,
            orderNumber: order.order_number,
            date: order.created_at,
            total: order.total,
            status: order.order_status,
            items: items?.length || 0,
          };
        })
      );

      setOrders(ordersWithItems);
    } catch (error) {
      console.error('Error fetching orders:', error);
    } finally {
      setLoadingOrders(false);
    }
  }, [user?.id]);

  const fetchUserProfile = useCallback(async () => {
    try {
      const supabase = getSupabase();
      const { data, error } = await supabase
        .from('user_profiles')
        .select('*')
        .eq('id', user?.id)
        .maybeSingle();

      if (error) throw error;
      setUserProfile(data);
    } catch (error) {
      console.error('Error fetching user profile:', error);
    }
  }, [user?.id]);

  useEffect(() => {
    if (user) {
      fetchRecentOrders();
      fetchUserProfile();
    }
  }, [user, fetchRecentOrders, fetchUserProfile]);

  const handleLogout = async () => {
    await signOut();
    toast({
      title: 'Logged out',
      description: 'You have been successfully logged out.',
    });
    router.push('/');
  };

  const handleRequestDeletion = async () => {
    try {
      const supabase = getSupabase();
      const { error } = await supabase
        .from('account_deletion_requests')
        .insert({
          user_id: user?.id,
          email: user?.email ?? '',
          status: 'pending',
        });

      if (error) throw error;

      toast({
        title: 'Deletion request submitted',
        description: 'We will process your request within 30 days and email you at ' + (user?.email ?? 'your registered address') + '.',
      });
    } catch (err) {
      console.error('Deletion request error:', err);
      toast({
        title: 'Request failed',
        description: 'Please email admin@keralagrocery.com to request account deletion.',
        variant: 'destructive',
      });
    }
  };

  const displayEmail = userProfile?.email && !userProfile.email.includes('@keralagrocery.phone')
    ? userProfile.email
    : user?.email && !user.email.includes('@keralagrocery.phone')
    ? user.email
    : '';
  const displayPhone = userProfile?.phone || user?.phone || '';
  const displayName = userProfile?.name || userProfile?.display_name || (displayEmail ? displayEmail.split('@')[0] : 'User');
  const mockUser = {
    name: displayName,
    email: displayEmail,
    phone: displayPhone,
    joinedDate: user?.created_at ? new Date(user.created_at).toLocaleDateString('en-GB', { month: 'long', year: 'numeric' }) : 'Recently',
  };

  if (loading || (user && !isAdmin && profile === undefined)) {
    // Auth still loading OR profile fetch in-flight — show spinner to prevent
    // premature redirect decisions (e.g., profile=null spuriously before fetch settles).
    return (
      <div className="container mx-auto px-4 py-16">
        <div className="max-w-md mx-auto text-center">
          <p className="text-gray-600">Loading...</p>
        </div>
      </div>
    );
  }

  // Profile settled and confirmed no row — redirect is imminent, show placeholder.
  if (user && !isAdmin && profile === null) {
    console.log('[Auth] AccountPage: authenticated user has no profile row — redirecting to /complete-profile');
    return (
      <div className="container mx-auto px-4 py-16">
        <div className="max-w-md mx-auto text-center">
          <p className="text-gray-600">Setting up your account...</p>
        </div>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="max-w-md mx-auto">
          <LoginForm />
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <h1 className="text-3xl font-bold mb-8">My Account</h1>

      <div className="grid lg:grid-cols-3 gap-6">
        <div className="lg:col-span-1 space-y-6">
          <UserProfileForm />
          <Card className="p-6">
            <div className="flex flex-col items-center text-center mb-6">
              <div className="w-24 h-24 bg-gradient-to-br from-green-500 to-green-600 rounded-full flex items-center justify-center text-white text-3xl font-bold mb-4">
                {mockUser.name.charAt(0)}
              </div>
              <h2 className="text-xl font-bold">{mockUser.name}</h2>
              <p className="text-gray-600 text-sm mt-1">Customer since {mockUser.joinedDate}</p>
            </div>

            <div className="space-y-3">
              <div className="flex items-center gap-3 text-sm">
                <Mail className="h-4 w-4 text-gray-400" />
                <span className="text-gray-600">{mockUser.email}</span>
              </div>
              <div className="flex items-center gap-3 text-sm">
                <Phone className="h-4 w-4 text-gray-400" />
                <span className="text-gray-600">{mockUser.phone}</span>
              </div>
            </div>

          </Card>

          <Card className="p-6">
            <div className="flex items-center gap-2 mb-4">
              <MapPin className="h-5 w-5 text-gray-600" />
              <h3 className="font-semibold">Delivery Address</h3>
            </div>

            {userProfile?.address ? (
              <div className="bg-gray-50 rounded-lg p-4 mb-4">
                <p className="text-sm text-gray-600">
                  {userProfile.address}<br />
                  {userProfile.city}<br />
                  {userProfile.postcode}
                </p>
              </div>
            ) : (
              <div className="bg-orange-50 border border-orange-200 rounded-lg p-4 mb-4">
                <p className="text-sm text-orange-800">
                  No delivery address saved yet.
                </p>
              </div>
            )}

            <Button
              variant="outline"
              className="w-full"
              onClick={() => {
                const profileForm = document.querySelector('#name');
                profileForm?.scrollIntoView({ behavior: 'smooth', block: 'center' });
              }}
            >
              {userProfile?.address ? 'Edit Address' : 'Add Address'}
            </Button>
          </Card>

          {user?.app_metadata?.is_admin && (
            <Button variant="outline" className="w-full justify-start text-green-700 hover:text-green-800 hover:bg-green-50 border-green-200 font-semibold" asChild>
              <Link href="/admin">
                <ShieldCheck className="mr-2 h-4 w-4" />
                Admin Panel
              </Link>
            </Button>
          )}

          <Button
            onClick={handleLogout}
            variant="outline"
            className="w-full justify-start text-red-600 hover:text-red-700 hover:bg-red-50 border-red-200"
          >
            <LogOut className="mr-2 h-4 w-4" />
            Logout
          </Button>

          {/* Danger zone */}
          <Card className="p-5 border-red-100">
            <h3 className="text-sm font-semibold text-gray-900 mb-1">Delete Account</h3>
            <p className="text-xs text-gray-500 mb-4 leading-relaxed">
              Submit a GDPR erasure request. We will delete your personal data within 30 days.
              Order and financial records may be retained for legal compliance.
            </p>
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button
                  variant="outline"
                  size="sm"
                  className="w-full text-red-600 hover:text-red-700 hover:bg-red-50 border-red-200"
                >
                  <Trash2 className="mr-2 h-3.5 w-3.5" />
                  Request Account Deletion
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>Request account deletion?</AlertDialogTitle>
                  <AlertDialogDescription className="space-y-2">
                    <span className="block">
                      This will submit a GDPR right-to-erasure request. We will:
                    </span>
                    <ul className="list-disc pl-4 space-y-1 text-sm">
                      <li>Process your request within 30 days</li>
                      <li>Delete your personal data and account</li>
                      <li>Email confirmation to <strong>{user?.email}</strong></li>
                    </ul>
                    <span className="block text-xs text-gray-500 mt-2">
                      Order and financial records may be retained for legal compliance (up to 7 years).
                    </span>
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
          </Card>
        </div>

        <div className="lg:col-span-2 space-y-6">
          <BuyItAgain />
          <Card className="p-6">
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center gap-2">
                <Package className="h-5 w-5 text-gray-600" />
                <h2 className="text-xl font-bold">Recent Orders</h2>
              </div>
              <Button variant="link" asChild>
                <Link href="/orders">View All</Link>
              </Button>
            </div>

            <div className="space-y-4">
              {loadingOrders ? (
                <p className="text-gray-600 text-center py-8">Loading orders...</p>
              ) : orders.length === 0 ? (
                <div className="text-center py-12">
                  <Package className="h-16 w-16 text-gray-300 mx-auto mb-4" />
                  <p className="text-gray-600 mb-4">No orders yet</p>
                  <Link href="/products">
                    <Button>Start Shopping</Button>
                  </Link>
                </div>
              ) : (
                orders.map((order) => (
                <Card key={order.id} className="p-4 hover:shadow-md transition-shadow">
                  <div className="flex justify-between items-start mb-3">
                    <div>
                      <p className="font-semibold text-lg">{order.orderNumber}</p>
                      <p className="text-sm text-gray-600">
                        {new Date(order.date).toLocaleDateString('en-GB', {
                          day: 'numeric',
                          month: 'long',
                          year: 'numeric',
                        })}
                      </p>
                    </div>
                    <Badge
                      variant={
                        order.status === 'Delivered'
                          ? 'default'
                          : order.status === 'Processing'
                          ? 'secondary'
                          : 'outline'
                      }
                      className={
                        order.status === 'Delivered'
                          ? 'bg-green-100 text-green-700 hover:bg-green-100'
                          : order.status === 'Processing'
                          ? 'bg-blue-100 text-blue-700 hover:bg-blue-100'
                          : 'bg-orange-100 text-orange-700 hover:bg-orange-100'
                      }
                    >
                      {order.status}
                    </Badge>
                  </div>

                  <div className="flex justify-between items-center">
                    <div className="text-sm text-gray-600">
                      {order.items} {order.items === 1 ? 'item' : 'items'}
                    </div>
                    <div className="flex items-center gap-4">
                      <span className="text-lg font-bold text-green-600">
                        £{order.total.toFixed(2)}
                      </span>
                      <Button variant="outline" size="sm">
                        View Details
                      </Button>
                    </div>
                  </div>
                </Card>
              ))
              )}
            </div>
          </Card>

          <Card className="p-6">
            <h2 className="text-xl font-bold mb-4">Quick Actions</h2>
            <div className="grid sm:grid-cols-2 gap-4">
              <Button variant="outline" className="h-auto py-4 flex-col gap-2">
                <Package className="h-6 w-6" />
                <span>Track Order</span>
              </Button>
              <Button variant="outline" className="h-auto py-4 flex-col gap-2" asChild>
                <Link href="/account/addresses">
                  <MapPin className="h-6 w-6" />
                  <span>Address Book</span>
                </Link>
              </Button>
              <Button variant="outline" className="h-auto py-4 flex-col gap-2" asChild>
                <Link href="/products">
                  <svg className="h-6 w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 3h2l.4 2M7 13h10l4-8H5.4M7 13L5.4 5M7 13l-2.293 2.293c-.63.63-.184 1.707.707 1.707H17m0 0a2 2 0 100 4 2 2 0 000-4zm-8 2a2 2 0 11-4 0 2 2 0 014 0z" />
                  </svg>
                  <span>Continue Shopping</span>
                </Link>
              </Button>
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
}
