'use client';

import { useState, useEffect } from 'react';
import { getSupabase } from '@/lib/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Plus, Trash2, Image as ImageIcon, Pencil } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import type { Banner } from '@/lib/types/database';

type BannerForm = Omit<Banner, 'id' | 'created_at'>;

const emptyForm = (): BannerForm => ({
  title: '',
  subtitle: '',
  image_url: '',
  cta_text: '',
  cta_link: '/products',
  is_active: true,
  display_order: 0,
});

export default function BannerManager() {
  const [banners, setBanners] = useState<Banner[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState<BannerForm>(emptyForm());
  const [editingId, setEditingId] = useState<string | null>(null);
  const [error, setError] = useState('');
  const { toast } = useToast();

  async function fetchBanners() {
    const supabase = getSupabase();
    const { data } = await supabase
      .from('carousel_banners')
      .select('id, title, subtitle, image_url, cta_text, cta_link, is_active, display_order, created_at')
      .order('display_order');
    setBanners((data as Banner[]) || []);
    setLoading(false);
  }

  useEffect(() => {
    fetchBanners();
  }, []);

  function handleEdit(banner: Banner) {
    setForm({
      title: banner.title,
      subtitle: banner.subtitle || '',
      image_url: banner.image_url || '',
      cta_text: banner.cta_text || '',
      cta_link: banner.cta_link || '/products',
      is_active: banner.is_active,
      display_order: banner.display_order,
    });
    setEditingId(banner.id);
    setError('');
    setShowForm(true);
  }

  function handleAddNew() {
    setForm(emptyForm());
    setEditingId(null);
    setError('');
    setShowForm(!showForm || editingId !== null ? true : !showForm);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!form.title.trim()) {
      setError('Title is required');
      return;
    }
    if (!form.image_url?.trim()) {
      setError('Image URL is required');
      return;
    }

    const payload = {
      title: form.title.trim(),
      subtitle: form.subtitle?.trim() || null,
      image_url: form.image_url.trim(),
      cta_text: form.cta_text?.trim() || null,
      cta_link: form.cta_link?.trim() || '/products',
      is_active: form.is_active,
      display_order: form.display_order,
    };

    const operation = editingId ? 'update' : 'create';

    setSaving(true);
    setError('');
    const supabase = getSupabase();

    let saveError: Error | null = null;

    if (editingId) {
      const { error: err } = await supabase
        .from('carousel_banners')
        .update(payload)
        .eq('id', editingId)
        .select()
        .single();
      if (err) {
        saveError = err;
        console.error('[BannerManager] Update error:', err);
      }
    } else {
      const { error: err } = await supabase
        .from('carousel_banners')
        .insert(payload)
        .select()
        .single();
      if (err) {
        saveError = err;
        console.error('[BannerManager] Insert error:', err);
      }
    }

    setSaving(false);

    if (saveError) {
      setError(saveError.message);
      toast({
        title: 'Save failed',
        description: saveError.message,
        variant: 'destructive',
      });
    } else {
      toast({
        title: editingId ? 'Banner updated' : 'Banner created',
        description: `"${payload.title}" has been saved successfully.`,
      });
      setForm(emptyForm());
      setEditingId(null);
      setShowForm(false);
      fetchBanners();
    }
  }

  async function toggleActive(id: string, current: boolean) {
    const supabase = getSupabase();
    await supabase.from('carousel_banners').update({ is_active: !current }).eq('id', id);
    fetchBanners();
  }

  async function deleteBanner(id: string) {
    if (!confirm('Delete this banner?')) return;
    const supabase = getSupabase();
    await supabase.from('carousel_banners').delete().eq('id', id);
    fetchBanners();
  }

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-4">
        <CardTitle className="flex items-center gap-2">
          <ImageIcon className="h-5 w-5" />
          Homepage Banners
        </CardTitle>
        <Button size="sm" onClick={handleAddNew}>
          <Plus className="h-4 w-4 mr-1" />
          Add Banner
        </Button>
      </CardHeader>

      <CardContent className="space-y-4">
        {showForm && (
          <form onSubmit={handleSubmit} className="border border-gray-200 rounded-xl p-4 space-y-3 bg-gray-50">
            <h3 className="font-semibold text-sm text-gray-700">
              {editingId ? 'Edit Banner' : 'New Banner'}
            </h3>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label className="text-xs">Title *</Label>
                <Input
                  value={form.title}
                  onChange={(e) => setForm({ ...form, title: e.target.value })}
                  placeholder="e.g. Fresh Kerala Spices"
                />
              </div>
              <div className="space-y-1">
                <Label className="text-xs">Subtitle</Label>
                <Input
                  value={form.subtitle || ''}
                  onChange={(e) => setForm({ ...form, subtitle: e.target.value })}
                  placeholder="e.g. Delivered to your door"
                />
              </div>
              <div className="space-y-1 sm:col-span-2">
                <Label className="text-xs">Image URL *</Label>
                <Input
                  value={form.image_url || ''}
                  onChange={(e) => setForm({ ...form, image_url: e.target.value })}
                  placeholder="https://..."
                />
              </div>
              <div className="space-y-1">
                <Label className="text-xs">CTA Button Text</Label>
                <Input
                  value={form.cta_text || ''}
                  onChange={(e) => setForm({ ...form, cta_text: e.target.value })}
                  placeholder="e.g. Shop Now"
                />
              </div>
              <div className="space-y-1">
                <Label className="text-xs">CTA Link</Label>
                <Input
                  value={form.cta_link || ''}
                  onChange={(e) => setForm({ ...form, cta_link: e.target.value })}
                  placeholder="/products"
                />
              </div>
              <div className="space-y-1">
                <Label className="text-xs">Display Order</Label>
                <Input
                  type="number"
                  value={form.display_order}
                  onChange={(e) => setForm({ ...form, display_order: parseInt(e.target.value) || 0 })}
                />
              </div>
            </div>

            <div className="flex items-center gap-2">
              <Switch
                checked={form.is_active}
                onCheckedChange={(v) => setForm({ ...form, is_active: v })}
              />
              <Label className="text-xs">Active (visible on homepage)</Label>
            </div>

            {error && <p className="text-xs text-red-600">{error}</p>}

            <div className="flex gap-2">
              <Button type="submit" size="sm" disabled={saving}>
                {saving ? 'Saving...' : editingId ? 'Update Banner' : 'Save Banner'}
              </Button>
              <Button
                type="button"
                size="sm"
                variant="ghost"
                onClick={() => {
                  setShowForm(false);
                  setEditingId(null);
                  setForm(emptyForm());
                  setError('');
                }}
              >
                Cancel
              </Button>
            </div>
          </form>
        )}

        {loading ? (
          <div className="space-y-2">
            {[1, 2].map((i) => (
              <div key={i} className="h-16 bg-gray-100 animate-pulse rounded-lg" />
            ))}
          </div>
        ) : banners.length === 0 ? (
          <div className="text-center py-8 text-sm text-gray-400">
            No banners yet. Add one above to display it on the homepage.
          </div>
        ) : (
          <div className="space-y-3">
            {banners.map((banner) => (
              <div key={banner.id} className="flex items-center gap-3 p-3 border border-gray-100 rounded-xl bg-white">
                {banner.image_url ? (
                  <div className="w-16 h-10 rounded overflow-hidden bg-gray-100 flex-shrink-0">
                    <img src={banner.image_url} alt={banner.title} className="w-full h-full object-cover" />
                  </div>
                ) : (
                  <div className="w-16 h-10 rounded bg-gray-100 flex items-center justify-center flex-shrink-0">
                    <ImageIcon className="h-4 w-4 text-gray-300" />
                  </div>
                )}
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-sm truncate">{banner.title}</p>
                  {banner.subtitle && (
                    <p className="text-xs text-gray-500 truncate">{banner.subtitle}</p>
                  )}
                  <p className="text-xs text-gray-400">Order: {banner.display_order}</p>
                </div>
                <Badge variant={banner.is_active ? 'default' : 'secondary'} className="text-xs flex-shrink-0">
                  {banner.is_active ? 'Active' : 'Inactive'}
                </Badge>
                <Switch
                  checked={banner.is_active}
                  onCheckedChange={() => toggleActive(banner.id, banner.is_active)}
                />
                <Button
                  size="icon"
                  variant="ghost"
                  className="h-8 w-8 text-gray-500 hover:text-gray-800 flex-shrink-0"
                  onClick={() => handleEdit(banner)}
                >
                  <Pencil className="h-4 w-4" />
                </Button>
                <Button
                  size="icon"
                  variant="ghost"
                  className="h-8 w-8 text-red-500 hover:text-red-700 flex-shrink-0"
                  onClick={() => deleteBanner(banner.id)}
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
