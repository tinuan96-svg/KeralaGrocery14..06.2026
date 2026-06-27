'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card } from '@/components/ui/card';
import { useAuth } from '@/lib/context/AuthContext';
import { useToast } from '@/hooks/use-toast';
import { getSupabase } from '@/lib/supabase/client';
import { User, MapPin, Mail, Phone } from 'lucide-react';
import AddressAutocomplete, { type SelectedAddress } from '@/components/ui/AddressAutocomplete';

interface UserProfile {
  name: string;
  email: string;
  phone: string;
  address: string;
  city: string;
  postcode: string;
}

export default function UserProfileForm() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [profile, setProfile] = useState<UserProfile>({
    name: '',
    email: '',
    phone: '',
    address: '',
    city: '',
    postcode: '',
  });

  useEffect(() => {
    if (user) {
      loadUserProfile();
    }
  }, [user]);

  const loadUserProfile = async () => {
    try {
      const supabase = getSupabase();
      const { data, error } = await supabase
        .from('user_profiles')
        .select('*')
        .eq('id', user?.id)
        .maybeSingle();

      if (error) throw error;

      const realEmail = (e: string | null | undefined) =>
        e && !e.includes('@keralagrocery.phone') ? e : '';

      if (data) {
        setProfile({
          name: data.name || '',
          email: realEmail(data.email) || realEmail(user?.email) || '',
          phone: data.phone || user?.phone || '',
          address: data.address || '',
          city: data.city || '',
          postcode: data.postcode || '',
        });
      } else {
        setProfile({
          name: '',
          email: realEmail(user?.email) || '',
          phone: user?.phone || '',
          address: '',
          city: '',
          postcode: '',
        });
      }
    } catch (error) {
      console.error('Error loading profile:', error);
    } finally {
      setLoading(false);
    }
  };

  const validatePostcode = (postcode: string): boolean => {
    const ukPostcodeRegex = /^[A-Z]{1,2}\d{1,2}[A-Z]?\s?\d[A-Z]{2}$/i;
    return ukPostcodeRegex.test(postcode.trim());
  };

  const handleAddressSelect = (selected: SelectedAddress) => {
    setProfile((prev) => ({
      ...prev,
      address: selected.address,
      city: selected.city || prev.city,
      postcode: selected.postcode || prev.postcode,
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!profile.name.trim()) {
      toast({
        title: 'Validation Error',
        description: 'Please enter your full name',
        variant: 'destructive',
      });
      return;
    }

    if (!profile.address.trim()) {
      toast({
        title: 'Validation Error',
        description: 'Please enter your street address',
        variant: 'destructive',
      });
      return;
    }

    if (!profile.city.trim()) {
      toast({
        title: 'Validation Error',
        description: 'Please enter your city',
        variant: 'destructive',
      });
      return;
    }

    if (!profile.postcode.trim()) {
      toast({
        title: 'Validation Error',
        description: 'Please enter your postcode',
        variant: 'destructive',
      });
      return;
    }

    if (!validatePostcode(profile.postcode)) {
      toast({
        title: 'Invalid Postcode',
        description: 'Please enter a valid UK postcode (e.g., SW1A 1AA)',
        variant: 'destructive',
      });
      return;
    }

    setSaving(true);

    try {
      const supabase = getSupabase();
      const { error } = await supabase
        .from('user_profiles')
        .upsert({
          id: user?.id,
          name: profile.name,
          email: profile.email,
          phone: profile.phone,
          address: profile.address,
          city: profile.city,
          postcode: profile.postcode.toUpperCase(),
          updated_at: new Date().toISOString(),
        });

      if (error) throw error;

      toast({
        title: 'Profile updated',
        description: 'Your information has been saved successfully.',
      });
    } catch (error: any) {
      console.error('Error saving profile:', error);
      toast({
        title: 'Error',
        description: error.message || 'Failed to save profile',
        variant: 'destructive',
      });
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <Card className="p-6">
        <p className="text-gray-600">Loading profile...</p>
      </Card>
    );
  }

  return (
    <Card className="p-6">
      <div className="flex items-center gap-2 mb-6">
        <User className="h-5 w-5 text-gray-600" />
        <h2 className="text-xl font-bold">Personal Information</h2>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="grid sm:grid-cols-2 gap-4">
          <div>
            <Label htmlFor="name">Full Name</Label>
            <Input
              id="name"
              type="text"
              placeholder="John Doe"
              value={profile.name}
              onChange={(e) => setProfile({ ...profile, name: e.target.value })}
              required
              className="mt-1"
            />
          </div>

          <div>
            <Label htmlFor="email">Email</Label>
            <div className="relative mt-1">
              <Mail className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
              <Input
                id="email"
                type="email"
                placeholder="john@example.com"
                value={profile.email}
                onChange={(e) => setProfile({ ...profile, email: e.target.value })}
                className="pl-10"
                readOnly
              />
            </div>
          </div>
        </div>

        <div>
          <Label htmlFor="phone">Phone Number</Label>
          <div className="relative mt-1">
            <Phone className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
            <Input
              id="phone"
              type="tel"
              placeholder="+44 7700 900000"
              value={profile.phone}
              onChange={(e) => setProfile({ ...profile, phone: e.target.value })}
              className="pl-10"
              readOnly
            />
          </div>
        </div>

        <div className="pt-4">
          <div className="flex items-center gap-2 mb-4">
            <MapPin className="h-5 w-5 text-gray-600" />
            <h3 className="font-semibold">Delivery Address</h3>
          </div>

          <div className="space-y-4">
            <div>
              <Label htmlFor="address">Street Address</Label>
              <AddressAutocomplete
                id="address"
                name="address"
                value={profile.address}
                onChange={(val) => setProfile((prev) => ({ ...prev, address: val }))}
                onAddressSelect={handleAddressSelect}
                placeholder="Start typing your address..."
                className="mt-1"
              />
            </div>

            <div className="grid sm:grid-cols-2 gap-4">
              <div>
                <Label htmlFor="city">City</Label>
                <Input
                  id="city"
                  type="text"
                  placeholder="London"
                  value={profile.city}
                  onChange={(e) => setProfile({ ...profile, city: e.target.value })}
                  required
                  className="mt-1"
                />
              </div>

              <div>
                <Label htmlFor="postcode">Postcode</Label>
                <Input
                  id="postcode"
                  type="text"
                  placeholder="SW1A 1AA"
                  value={profile.postcode}
                  onChange={(e) => setProfile({ ...profile, postcode: e.target.value.toUpperCase() })}
                  required
                  className="mt-1"
                  maxLength={8}
                />
                <p className="text-xs text-gray-500 mt-1">UK postcode format (e.g., SW1A 1AA)</p>
              </div>
            </div>
          </div>
        </div>

        <Button
          type="submit"
          disabled={saving}
          className="w-full bg-green-600 hover:bg-green-700 text-white"
        >
          {saving ? 'Saving...' : 'Save Profile'}
        </Button>
      </form>
    </Card>
  );
}
