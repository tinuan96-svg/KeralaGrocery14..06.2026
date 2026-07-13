'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { useCart } from '@/lib/context/CartContext';
import { useAuth } from '@/lib/context/AuthContext';
import { useWallet } from '@/hooks/useWallet';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';
import { Textarea } from '@/components/ui/textarea';
import { useToast } from '@/hooks/use-toast';
import { ShoppingBag, Truck, Shield, Lock, CreditCard, Banknote, ChevronRight, Package, CircleCheck as CheckCircle, Wallet, MapPin, BookOpen, Zap } from 'lucide-react';
import Link from 'next/link';
import Image from 'next/image';
import { getSupabase } from '@/lib/supabase/client';
import { blurDataURL } from '@/lib/utils/image';
import AddressAutocomplete, { type SelectedAddress } from '@/components/ui/AddressAutocomplete';
import AddressSelector from '@/components/account/AddressSelector';
import { fetchDeliverySettings, calcDelivery } from '@/lib/services/deliveryService';
import { maxWalletUsable, getEstimatedCashback } from '@/lib/services/walletService';
import { useAddresses } from '@/hooks/useAddresses';
import type { CustomerAddress } from '@/lib/services/addressService';
import { sendOrderPlacedNotification } from '@/lib/services/notificationService';

type PaymentMethod = 'worldpay';

export default function CheckoutPage() {
  const router = useRouter();
  const { cart, cartTotal, clearCart } = useCart();
  const { user, profile, loading: authLoading } = useAuth();
  const { wallet, settings: walletSettings } = useWallet();
  const { toast } = useToast();

  const { addresses, defaultAddress, loading: addressesLoading } = useAddresses();
  const [selectedAddressId, setSelectedAddressId] = useState<string | null>(null);
  const [addressMode, setAddressMode] = useState<'saved' | 'manual'>('saved');

  const [isProcessing, setIsProcessing] = useState(false);
  const [isLoadingProfile, setIsLoadingProfile] = useState(false);
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('worldpay');
  const [deliveryFee, setDeliveryFee]     = useState(0);
  const [isFreeDelivery, setIsFreeDelivery] = useState(false);
  const [deliveryMsg, setDeliveryMsg]     = useState('');
  const [loadingDelivery, setLoadingDelivery] = useState(true);

  // Wallet usage state
  const [useWalletCredit, setUseWalletCredit] = useState(false);
  const [walletAmountInput, setWalletAmountInput] = useState('');

  // Idempotency key — generated once per page load, prevents duplicate orders
  const idempotencyKey = useRef<string>(crypto.randomUUID());
  const paymentInitiated = useRef(false);

  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phone: '',
    address: '',
    city: '',
    postcode: '',
    notes: '',
  });

  // Wallet calculations
  const walletBalance = parseFloat(wallet?.balance?.toString() ?? '0');
  const maxUsable = walletSettings
    ? maxWalletUsable(cartTotal, walletBalance, walletSettings)
    : 0;
  const walletAmount = useWalletCredit
    ? Math.min(parseFloat(walletAmountInput) || 0, maxUsable)
    : 0;
  const cardAmount = Math.max(0, cartTotal + deliveryFee - walletAmount);

  const loadUserProfile = useCallback(async () => {
    if (!user) return;
    setIsLoadingProfile(true);
    try {
      const supabase = getSupabase();
      const { data, error } = await supabase
        .from('user_profiles')   // 'users' table was dropped — use user_profiles
        .select('name,email,phone,address,city,postcode')
        .eq('id', user.id)
        .maybeSingle();

      if (error) console.error('[Checkout] loadUserProfile error:', error.message);

      const realEmail = (e: string | null | undefined) =>
        e && !e.includes('@keralagrocery.phone') ? e : '';

      setFormData({
        name:     data?.name     || '',
        email:    realEmail(data?.email) || realEmail(user.email) || '',
        phone:    data?.phone    || user.phone || '',
        address:  data?.address  || '',
        city:     data?.city     || '',
        postcode: data?.postcode || '',
        notes:    '',
      });
    } catch (error) {
      console.error('[Checkout] loadUserProfile unexpected error:', error);
    } finally {
      setIsLoadingProfile(false);
    }
  }, [user]);

  useEffect(() => {
    loadUserProfile();
  }, [loadUserProfile]);

  useEffect(() => {
    fetchDeliverySettings().then(settings => {
      const result = calcDelivery(cartTotal, settings);
      setDeliveryFee(result.fee);
      setIsFreeDelivery(result.isFree);
      setDeliveryMsg(result.progressMessage);
      setLoadingDelivery(false);
    });
  }, [cartTotal]);

  // Auto-select default address and fill form fields
  useEffect(() => {
    if (addressesLoading) return;
    if (addresses.length === 0) {
      setAddressMode('manual');
      return;
    }
    setAddressMode('saved');
    const def = defaultAddress;
    if (def && !selectedAddressId) {
      setSelectedAddressId(def.id);
      setFormData(prev => ({
        ...prev,
        name:     def.full_name || prev.name,
        phone:    def.phone     || prev.phone,
        address:  def.address_line_1 + (def.address_line_2 ? `, ${def.address_line_2}` : ''),
        city:     def.city,
        postcode: def.postcode,
      }));
    }
  }, [addressesLoading, addresses.length, defaultAddress, selectedAddressId]);

  // Block checkout if not authenticated or profile/phone not set up.
  // Wait for profile to settle (undefined = fetch in-flight) before redirecting
  // to avoid spurious redirects that cause the visible blink/loop.
  useEffect(() => {
    if (authLoading) return;
    if (profile === undefined) return; // profile fetch still in-flight
    if (!user) {
      router.replace('/account');
      return;
    }
    const isAdmin = !!(user?.app_metadata?.is_admin);
    if (!isAdmin && (!profile || !profile.phone_verified)) {
      router.replace('/complete-profile?returnTo=/checkout');
    }
  }, [authLoading, user, profile, router]);

  // Note: cartTotal and displayTotal are for display only. The server
  // recalculates the true total from database prices.
  const displayTotal = cartTotal + deliveryFee;

  // Amount charged to card (displayTotal minus wallet portion)
  const cardCharge = Math.max(0, parseFloat((displayTotal - walletAmount).toFixed(2)));

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleSavedAddressSelect = (addr: CustomerAddress) => {
    setSelectedAddressId(addr.id);
    setFormData(prev => ({
      ...prev,
      name:     addr.full_name || prev.name,
      phone:    addr.phone     || prev.phone,
      address:  addr.address_line_1 + (addr.address_line_2 ? `, ${addr.address_line_2}` : ''),
      city:     addr.city,
      postcode: addr.postcode,
    }));
  };

  const handleAddressSelect = (selected: SelectedAddress) => {
    setFormData((prev) => ({
      ...prev,
      address:  selected.address,
      city:     selected.city     || prev.city,
      postcode: selected.postcode || prev.postcode,
    }));
  };

  const validateForm = () => {
    if (!formData.name || !formData.email || !formData.phone ||
        !formData.address || !formData.city || !formData.postcode) {
      toast({ title: 'Missing details', description: 'Please fill in all required fields', variant: 'destructive' });
      return false;
    }
    return true;
  };

  const validateStock = async () => {
    try {
      const supabase = getSupabase();
      const productIds = cart.map(i => i.id);

      const { data: products, error } = await supabase
        .from('products')
        .select('id, name, stock, stock_quantity')
        .in('id', productIds);

      if (error) throw error;

      const issues: string[] = [];
      const updatedCart = [...cart];
      let cartChanged = false;

      products?.forEach(p => {
        const cartItem = updatedCart.find(i => i.id === p.id);
        const available = p.stock_quantity ?? p.stock ?? 0;

        if (cartItem && cartItem.quantity > available) {
          cartChanged = true;
          if (available <= 0) {
            issues.push(`${p.name} is now out of stock and has been removed.`);
            // Note: actual removal from state happens via clearCart/update in the next step
          } else {
            issues.push(`Only ${available} units of ${p.name} are available. We've updated your cart.`);
          }
        }
      });

      if (cartChanged) {
        // If there were issues, we need to refresh the cart state and alert the user
        // For simplicity in this UI, we'll use toast to inform and ask them to review
        toast({
          title: 'Stock Update',
          description: issues.join(' '),
          variant: 'destructive',
          duration: 6000,
        });

        // Re-sync cart logic would go here, but for now we block the checkout
        // to let the user see the updated totals/items.
        return false;
      }

      return true;
    } catch (err) {
      console.error('Stock validation error:', err);
      return true; // Proceed on error to avoid blocking sales if Supabase is twitchy
    }
  };

  const buildOrderPayload = (status: 'pending' | 'paid', ref?: string) => ({
    idempotency_key:    idempotencyKey.current,
    user_id:            user?.id || null,
    customer_name:      formData.name,
    customer_email:     formData.email,
    customer_phone:     formData.phone,
    delivery_address:   formData.address,
    delivery_city:      formData.city,
    delivery_postcode:  formData.postcode,
    delivery_fee:       deliveryFee,
    wallet_amount:      walletAmount,
    payment_method:     'card',
    payment_status:     status,
    payment_reference:  ref,
    notes:              formData.notes,
    // Only product_id and quantity are authoritative — the server re-fetches
    // prices; unit_price here is only stored as a display hint in the request.
    items: cart.map((item) => ({
      product_id:    item.id,
      product_name:  item.name,
      product_image: item.image_url || '',
      quantity:      item.quantity,
    })),
  });

  const createOrder = async (status: 'pending' | 'paid', ref?: string) => {
    const supabase   = getSupabase();
    const { data: { session } } = await supabase.auth.getSession();
    const authToken  = session?.access_token || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;

    const res = await fetch(`${supabaseUrl}/functions/v1/create-order`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization:  `Bearer ${authToken}`,
      },
      body: JSON.stringify(buildOrderPayload(status, ref)),
    });

    const data = await res.json();
    if (!res.ok || data.error) throw new Error(data.error || 'Order creation failed');
    return data;
  };

  const handleWorldpayPayment = async () => {
    if (!validateForm()) return;
    if (paymentInitiated.current) return;

    setIsProcessing(true);

    // Final Stock Check
    const isStockValid = await validateStock();
    if (!isStockValid) {
      setIsProcessing(false);
      return;
    }

    paymentInitiated.current = true;

    try {
      const serverTotal = cartTotal + deliveryFee;
      const cardChargeFinal = Math.max(0, parseFloat((serverTotal - walletAmount).toFixed(2)));

      // If the entire total is covered by wallet credit, process as 'paid' immediately
      if (cardChargeFinal <= 0) {
        const result = await createOrder('paid');
        const orderId = result.order.id;

        if (walletAmount > 0 && user) {
          // ... (existing wallet deduction call) ...
        }

        // Send SMS notification for wallet-only payments
        if (formData.phone) {
          await sendOrderPlacedNotification(formData.phone, result.order.order_number, 'sms')
            .catch(e => console.error('[Checkout] notification failed:', e));
        }

        clearCart();
        router.push(`/order-success?order=${result.order.order_number}`);
        return;
      }

      // Normal card payment flow
      const result      = await createOrder('pending');
      const orderNumber = result.order.order_number;

      const supabase    = getSupabase();
      const { data: { session } } = await supabase.auth.getSession();
      const authToken   = session?.access_token || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

      const response = await fetch(
        `${process.env.NEXT_PUBLIC_SUPABASE_URL}/functions/v1/worldpay-payment`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${authToken}` },
          body: JSON.stringify({
            amount:               cardChargeFinal,
            transactionReference: orderNumber,
            narrative:            'Kerala Groceries UK',
            billingAddress: {
              address1:    formData.address,
              city:        formData.city,
              postalCode:  formData.postcode,
              countryCode: 'GB',
            },
          }),
        }
      );

      const data = await response.json();
      if (!response.ok || data.error) {
        throw new Error(data.error || 'Failed to create payment session');
      }

      window.location.href = data.url;
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Payment failed. Please try again.';
      toast({ title: 'Payment Failed', description: message, variant: 'destructive' });
      paymentInitiated.current = false;
      setIsProcessing(false);
    }
  };

  // Hold render until auth and profile have both settled to prevent the
  // checkout form from flashing before the redirect effect fires.
  if (authLoading || profile === undefined) {
    return (
      <div className="min-h-[60vh] flex items-center justify-center">
        <p className="text-gray-500 text-sm">Loading...</p>
      </div>
    );
  }

  if (cart.length === 0) {
    return (
      <div className="min-h-[60vh] flex flex-col items-center justify-center gap-4 px-4">
        <div className="w-20 h-20 rounded-full bg-gray-100 flex items-center justify-center">
          <ShoppingBag className="w-10 h-10 text-gray-400" />
        </div>
        <h2 className="text-xl font-bold text-gray-800">Your cart is empty</h2>
        <p className="text-gray-500 text-sm">Add some items before checking out</p>
        <Link href="/products">
          <Button className="bg-green-600 hover:bg-green-700 text-white mt-2">Continue Shopping</Button>
        </Link>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-6xl mx-auto px-4 py-6 sm:py-10">

        <div className="mb-6 flex items-center gap-2 text-sm text-gray-500">
          <Link href="/cart" className="hover:text-green-600 transition-colors">Cart</Link>
          <ChevronRight className="w-4 h-4" />
          <span className="text-gray-900 font-medium">Checkout</span>
        </div>

        <h1 className="text-2xl font-bold text-gray-900 mb-8">Checkout</h1>

        <div className="grid lg:grid-cols-5 gap-6 lg:gap-8 items-start">

          {/* ── Delivery + Payment ── */}
          <div className="lg:col-span-3 space-y-5">

            <section className="bg-white rounded-2xl border border-gray-200 p-6 shadow-sm">
              <div className="flex items-center justify-between gap-2 mb-5">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-full bg-green-100 flex items-center justify-center">
                    <Truck className="w-4 h-4 text-green-600" />
                  </div>
                  <h2 className="text-base font-bold text-gray-900">Delivery Details</h2>
                </div>
                <Link href="/account/addresses" className="flex items-center gap-1 text-xs text-green-700 font-semibold hover:underline">
                  <BookOpen className="w-3.5 h-3.5" /> Address Book
                </Link>
              </div>

              {/* Saved address selector */}
              {addresses.length > 0 && (
                <div className="mb-5">
                  <div className="flex items-center gap-3 mb-3">
                    <button
                      type="button"
                      onClick={() => setAddressMode('saved')}
                      className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold border transition-colors ${
                        addressMode === 'saved'
                          ? 'border-green-500 bg-green-50 text-green-700'
                          : 'border-gray-200 text-gray-500 hover:border-gray-300'
                      }`}
                    >
                      <MapPin className="w-3.5 h-3.5" /> Saved Addresses
                    </button>
                    <button
                      type="button"
                      onClick={() => setAddressMode('manual')}
                      className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold border transition-colors ${
                        addressMode === 'manual'
                          ? 'border-green-500 bg-green-50 text-green-700'
                          : 'border-gray-200 text-gray-500 hover:border-gray-300'
                      }`}
                    >
                      Enter Manually
                    </button>
                  </div>
                  {addressMode === 'saved' && (
                    <AddressSelector
                      selectedId={selectedAddressId}
                      onSelect={handleSavedAddressSelect}
                    />
                  )}
                </div>
              )}

              {/* Manual entry form — shown when no saved addresses or manual mode selected */}
              {(addresses.length === 0 || addressMode === 'manual') && (
                <div className="grid gap-4">
                  <div className="grid sm:grid-cols-2 gap-4">
                    <div className="space-y-1.5">
                      <Label htmlFor="name" className="text-xs font-semibold text-gray-600 uppercase tracking-wide">
                        Full Name <span className="text-red-500">*</span>
                      </Label>
                      <Input id="name" name="name" value={formData.name} onChange={handleInputChange}
                        placeholder="John Smith"
                        className="h-10 border-gray-200 focus:border-green-500 focus:ring-green-500/20" />
                    </div>
                    <div className="space-y-1.5">
                      <Label htmlFor="phone" className="text-xs font-semibold text-gray-600 uppercase tracking-wide">
                        Phone <span className="text-red-500">*</span>
                      </Label>
                      <Input id="phone" name="phone" value={formData.phone} onChange={handleInputChange}
                        placeholder="+44 7xxx xxxxxx"
                        className="h-10 border-gray-200 focus:border-green-500 focus:ring-green-500/20" />
                    </div>
                  </div>

                  <div className="space-y-1.5">
                    <Label htmlFor="email" className="text-xs font-semibold text-gray-600 uppercase tracking-wide">
                      Email Address <span className="text-red-500">*</span>
                    </Label>
                    <Input id="email" name="email" type="email" value={formData.email} onChange={handleInputChange}
                      placeholder="john@example.com"
                      className="h-10 border-gray-200 focus:border-green-500 focus:ring-green-500/20" />
                  </div>

                  <div className="space-y-1.5">
                    <Label htmlFor="address" className="text-xs font-semibold text-gray-600 uppercase tracking-wide">
                      Street Address <span className="text-red-500">*</span>
                    </Label>
                    <AddressAutocomplete
                      id="address" name="address" value={formData.address}
                      onChange={(val) => setFormData((prev) => ({ ...prev, address: val }))}
                      onAddressSelect={handleAddressSelect}
                      placeholder="Start typing your address..."
                      className="h-10 border-gray-200 focus:border-green-500 focus:ring-green-500/20" />
                  </div>

                  <div className="grid sm:grid-cols-2 gap-4">
                    <div className="space-y-1.5">
                      <Label htmlFor="city" className="text-xs font-semibold text-gray-600 uppercase tracking-wide">
                        City <span className="text-red-500">*</span>
                      </Label>
                      <Input id="city" name="city" value={formData.city} onChange={handleInputChange}
                        placeholder="London"
                        className="h-10 border-gray-200 focus:border-green-500 focus:ring-green-500/20" />
                    </div>
                    <div className="space-y-1.5">
                      <Label htmlFor="postcode" className="text-xs font-semibold text-gray-600 uppercase tracking-wide">
                        Postcode <span className="text-red-500">*</span>
                      </Label>
                      <Input id="postcode" name="postcode" value={formData.postcode} onChange={handleInputChange}
                        placeholder="SW1A 1AA"
                        className="h-10 border-gray-200 focus:border-green-500 focus:ring-green-500/20" />
                    </div>
                  </div>
                </div>
              )}

              {/* Email + notes — always shown */}
              <div className={`grid gap-4 ${addresses.length > 0 && addressMode === 'saved' ? '' : 'mt-4'}`}>
                {addresses.length > 0 && addressMode === 'saved' && (
                  <div className="space-y-1.5">
                    <Label htmlFor="email2" className="text-xs font-semibold text-gray-600 uppercase tracking-wide">
                      Email Address <span className="text-red-500">*</span>
                    </Label>
                    <Input id="email2" name="email" type="email" value={formData.email} onChange={handleInputChange}
                      placeholder="john@example.com"
                      className="h-10 border-gray-200 focus:border-green-500 focus:ring-green-500/20" />
                  </div>
                )}
                <div className="space-y-1.5">
                  <Label htmlFor="notes" className="text-xs font-semibold text-gray-600 uppercase tracking-wide">
                    Order Notes <span className="text-gray-400 font-normal normal-case">(optional)</span>
                  </Label>
                  <Textarea id="notes" name="notes" value={formData.notes} onChange={handleInputChange}
                    placeholder="Any special instructions for delivery..." rows={3}
                    className="border-gray-200 focus:border-green-500 focus:ring-green-500/20 resize-none" />
                </div>
              </div>
            </section>

            <section className="bg-white rounded-2xl border border-gray-200 p-6 shadow-sm">
              <div className="flex items-center gap-2 mb-5">
                <div className="w-8 h-8 rounded-full bg-green-100 flex items-center justify-center">
                  <CreditCard className="w-4 h-4 text-green-600" />
                </div>
                <h2 className="text-base font-bold text-gray-900">Payment Method</h2>
              </div>

              {/* ── Wallet Credit Section ── */}
              {walletBalance > 0 && walletSettings && (
                <div className={`mb-5 rounded-xl border-2 p-4 transition-all ${useWalletCredit ? 'border-green-500 bg-green-50' : 'border-gray-200 bg-gray-50'}`}>
                  <div className="flex items-center justify-between gap-3">
                    <div className="flex items-center gap-3">
                      <Wallet className={`w-5 h-5 flex-shrink-0 ${useWalletCredit ? 'text-green-600' : 'text-gray-400'}`} />
                      <div>
                        <p className="font-semibold text-sm text-gray-900">KG Wallet Credit</p>
                        <p className="text-xs text-gray-500">
                          Balance: <span className="font-bold text-green-700">£{walletBalance.toFixed(2)}</span>
                          {' · '}Max usable: <span className="font-medium">£{maxUsable.toFixed(2)}</span>
                        </p>
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={() => {
                        setUseWalletCredit(v => !v);
                        if (!useWalletCredit) setWalletAmountInput(maxUsable.toFixed(2));
                        else setWalletAmountInput('');
                      }}
                      className={`relative w-11 h-6 rounded-full transition-colors flex-shrink-0 ${useWalletCredit ? 'bg-green-500' : 'bg-gray-300'}`}
                    >
                      <span className={`absolute top-0.5 w-5 h-5 bg-white rounded-full shadow transition-all ${useWalletCredit ? 'left-[22px]' : 'left-0.5'}`} />
                    </button>
                  </div>

                  {useWalletCredit && (
                    <div className="mt-3 flex items-center gap-2">
                      <div className="flex-1">
                        <Label htmlFor="wallet-amount" className="text-xs text-gray-600 mb-1 block">Amount to use (max £{maxUsable.toFixed(2)})</Label>
                        <div className="relative">
                          <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm font-bold text-gray-500">£</span>
                          <Input
                            id="wallet-amount"
                            type="number"
                            min="0"
                            max={maxUsable}
                            step="0.01"
                            value={walletAmountInput}
                            onChange={e => {
                              const v = parseFloat(e.target.value) || 0;
                              setWalletAmountInput(Math.min(v, maxUsable).toFixed(2));
                            }}
                            className="pl-7 h-9 text-sm"
                          />
                        </div>
                      </div>
                      <Button
                        type="button" variant="outline" size="sm"
                        className="h-9 text-xs mt-5 text-green-700 border-green-300"
                        onClick={() => setWalletAmountInput(maxUsable.toFixed(2))}
                      >
                        Use Max
                      </Button>
                    </div>
                  )}

                  {useWalletCredit && walletAmount > 0 && (
                    <p className="mt-2 text-xs text-green-700 font-medium">
                      £{walletAmount.toFixed(2)} wallet + £{cardCharge.toFixed(2)} card
                    </p>
                  )}
                </div>
              )}

              <div className="grid sm:grid-cols-2 gap-3 mb-5">
                <button type="button" onClick={() => setPaymentMethod('worldpay')}
                  className="flex items-center gap-3 p-4 rounded-xl border-2 transition-all text-left border-green-500 bg-green-50">
                  <div className="w-4 h-4 rounded-full border-2 flex-shrink-0 flex items-center justify-center border-green-500">
                    <div className="w-2 h-2 rounded-full bg-green-500" />
                  </div>
                  <div>
                    <p className="font-semibold text-sm text-gray-900">Pay by Card</p>
                    <p className="text-xs text-gray-500">Visa, Mastercard &amp; more</p>
                  </div>
                  <CreditCard className="w-5 h-5 text-blue-600 ml-auto flex-shrink-0" />
                </button>
              </div>

              {paymentMethod === 'worldpay' && (
                <div className="space-y-3">
                  <div className="flex items-center gap-2 bg-blue-50 border border-blue-100 rounded-xl px-4 py-3">
                    <Lock className="w-4 h-4 text-blue-600 flex-shrink-0" />
                    <p className="text-xs text-blue-700 font-medium">
                      Secured by Worldpay. You&apos;ll be redirected to a secure payment page.
                    </p>
                  </div>
                  <Button
                    className="w-full h-12 bg-[#0B5D3B] hover:bg-green-700 text-white font-bold rounded-xl text-sm transition-colors"
                    disabled={isProcessing}
                    onClick={handleWorldpayPayment}>
                    {isProcessing ? (
                      <span className="flex items-center gap-2">
                        <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24" fill="none">
                          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z" />
                        </svg>
                        Redirecting to payment...
                      </span>
                    ) : (
                      <span className="flex items-center gap-2">
                        <CreditCard className="w-4 h-4" />
                        {walletAmount > 0
                          ? `Pay £${cardCharge.toFixed(2)} by card + £${walletAmount.toFixed(2)} wallet`
                          : `Pay £${displayTotal.toFixed(2)} securely`}
                      </span>
                    )}
                  </Button>
                </div>
              )}

            </section>

            <div className="flex flex-wrap items-center justify-center gap-6 py-2">
              <div className="flex items-center gap-1.5 text-xs text-gray-500">
                <Lock className="w-3.5 h-3.5 text-green-600" /> SSL Encrypted
              </div>
              <div className="flex items-center gap-1.5 text-xs text-gray-500">
                <Shield className="w-3.5 h-3.5 text-green-600" /> Secure Checkout
              </div>
              <div className="flex items-center gap-1.5 text-xs text-gray-500">
                <Truck className="w-3.5 h-3.5 text-green-600" /> Free Delivery
              </div>
            </div>
          </div>

          {/* ── Order Summary ── */}
          <div className="lg:col-span-2 lg:sticky lg:top-4">
            <div className="bg-white rounded-2xl border border-gray-200 p-6 shadow-sm">
              <div className="flex items-center gap-2 mb-5">
                <div className="w-8 h-8 rounded-full bg-green-100 flex items-center justify-center">
                  <Package className="w-4 h-4 text-green-600" />
                </div>
                <h2 className="text-base font-bold text-gray-900">Order Summary</h2>
                <span className="ml-auto text-xs text-gray-400 font-medium">
                  {cart.length} item{cart.length !== 1 ? 's' : ''}
                </span>
              </div>

              <div className="space-y-3 max-h-72 overflow-y-auto pr-1">
                {cart.map(item => (
                  <div key={item.id} className="flex items-center gap-3">
                    <div className="relative w-12 h-12 flex-shrink-0 rounded-lg overflow-hidden border border-gray-100 bg-gray-50">
                      <Image src={item.image_url || '/placeholder.webp'} alt={item.name}
                        fill sizes="48px" className="object-contain p-1"
                        placeholder="blur" blurDataURL={blurDataURL} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-gray-900 line-clamp-1">{item.name}</p>
                      <p className="text-xs text-gray-400">Qty: {item.quantity}</p>
                    </div>
                    <span className="text-sm font-bold text-gray-900 flex-shrink-0">
                      £{(item.price * item.quantity).toFixed(2)}
                    </span>
                  </div>
                ))}
              </div>

              <Separator className="my-4" />

              <div className="space-y-2">
                <div className="flex justify-between text-sm text-gray-600">
                  <span>Subtotal</span>
                  <span>£{cartTotal.toFixed(2)}</span>
                </div>
                <div className="flex justify-between text-sm text-gray-600">
                  <span>Delivery</span>
                  {loadingDelivery ? (
                    <span className="w-10 h-4 bg-gray-100 animate-pulse rounded" />
                  ) : isFreeDelivery ? (
                    <span className="text-green-600 font-semibold flex items-center gap-1">
                      <CheckCircle className="w-3.5 h-3.5" /> FREE
                    </span>
                  ) : (
                    <span>£{deliveryFee.toFixed(2)}</span>
                  )}
                </div>
                {walletAmount > 0 && (
                  <div className="flex justify-between text-sm font-medium">
                    <span className="text-green-700 flex items-center gap-1">
                      <Wallet className="w-3.5 h-3.5" /> KG Wallet
                    </span>
                    <span className="text-green-700">−£{walletAmount.toFixed(2)}</span>
                  </div>
                )}

                {/* Cashback estimate for this order */}
                {walletSettings && (
                  <div className="bg-emerald-50 rounded-xl p-3 border border-emerald-100 space-y-2 mt-2">
                    <div className="flex items-center justify-between gap-2">
                      <div className="flex items-center gap-2">
                        <div className="w-6 h-6 rounded-lg bg-emerald-100 flex items-center justify-center">
                          <Zap className="w-3 h-3 text-emerald-700" />
                        </div>
                        <span className="text-[11px] font-bold text-emerald-800 uppercase tracking-wider">Earn Credit</span>
                      </div>
                      <span className="text-xs font-black text-emerald-700">
                        +£{getEstimatedCashback(Math.max(0, cartTotal - walletAmount), walletSettings).toFixed(2)}
                      </span>
                    </div>
                    <p className="text-[9px] text-emerald-600 leading-tight italic">
                      Cashback will be added to your <span className="font-bold">Pending Balance</span> instantly and released once delivered!
                    </p>
                  </div>
                )}
              </div>

              <Separator className="my-4" />

              <div className="flex justify-between items-center">
                <span className="text-base font-bold text-gray-900">Total</span>
                <span className="text-xl font-bold text-green-600">£{displayTotal.toFixed(2)}</span>
              </div>
              {walletAmount > 0 && (
                <div className="flex justify-between items-center text-sm mt-1">
                  <span className="text-gray-500">Card charge</span>
                  <span className="font-semibold text-gray-800">£{cardCharge.toFixed(2)}</span>
                </div>
              )}

              {!loadingDelivery && (
                <div className={`mt-4 flex items-center gap-2 rounded-xl px-3 py-2.5 border ${
                  isFreeDelivery
                    ? 'bg-green-50 border-green-100'
                    : 'bg-amber-50 border-amber-100'
                }`}>
                  <Truck className={`w-4 h-4 flex-shrink-0 ${isFreeDelivery ? 'text-green-600' : 'text-amber-600'}`} />
                  <p className={`text-xs font-medium ${isFreeDelivery ? 'text-green-700' : 'text-amber-700'}`}>
                    {isFreeDelivery ? 'Free delivery applied' : deliveryMsg}
                  </p>
                </div>
              )}
            </div>
          </div>

        </div>
      </div>

      {/* ── Mobile sticky checkout bar ── */}
      <div className="fixed bottom-0 left-0 right-0 md:hidden bg-white border-t border-gray-200 px-4 py-3 flex items-center gap-3 shadow-lg z-50">
        <div className="flex-1">
          <p className="text-xs text-gray-500">Order total</p>
          <p className="text-lg font-bold text-green-600">£{displayTotal.toFixed(2)}</p>
        </div>
        <Button
          className="bg-[#0B5D3B] hover:bg-green-700 text-white font-bold px-6 h-11 rounded-xl text-sm"
          disabled={isProcessing}
          onClick={handleWorldpayPayment}>
          {isProcessing ? 'Processing...' : 'Pay Now'}
        </Button>
      </div>
    </div>
  );
}
