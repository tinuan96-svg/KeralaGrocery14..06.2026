'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Plus, Loader as Loader2, Image as ImageIcon, Search, Check, X } from 'lucide-react';
import type { Category, Brand } from '@/lib/types/database';
import { useRouter } from 'next/navigation';
import { createProduct, createCategory } from '@/lib/actions/products';
import { getSupabase } from '@/lib/supabase/client';

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const BUCKET_BATCH = 100;

interface AddProductFormProps {
  categories: Category[];
  brands: Brand[];
}

interface BucketImage {
  name: string;
  url: string;
}

function bucketUrl(name: string) {
  return `${SUPABASE_URL}/storage/v1/object/public/product-images/${encodeURIComponent(name)}`;
}

async function listAllBucketImages(): Promise<BucketImage[]> {
  const supabase = getSupabase();
  const all: BucketImage[] = [];
  let offset = 0;
  while (true) {
    const { data, error } = await supabase.storage
      .from('product-images')
      .list('', { limit: BUCKET_BATCH, offset, sortBy: { column: 'name', order: 'asc' } });
    if (error || !data || data.length === 0) break;
    all.push(
      ...data
        .filter(f => f.name !== '.emptyFolderPlaceholder')
        .map(f => ({ name: f.name, url: bucketUrl(f.name) }))
    );
    if (data.length < BUCKET_BATCH) break;
    offset += BUCKET_BATCH;
  }
  return all;
}

export default function AddProductForm({ categories: initialCategories, brands: initialBrands }: AddProductFormProps) {
  const router = useRouter();
  const [categories, setCategories] = useState(initialCategories);
  const [brands, setBrands] = useState(initialBrands);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showNewCategoryDialog, setShowNewCategoryDialog] = useState(false);
  const [showNewBrandDialog, setShowNewBrandDialog] = useState(false);
  const [newCategoryName, setNewCategoryName] = useState('');
  const [newBrandData, setNewBrandData] = useState({ name: '', logo_url: '' });
  const [isCreatingCategory, setIsCreatingCategory] = useState(false);
  const [isCreatingBrand, setIsCreatingBrand] = useState(false);

  // Image picker state
  const [showImagePicker, setShowImagePicker] = useState(false);
  const [bucketImages, setBucketImages] = useState<BucketImage[]>([]);
  const [bucketSearch, setBucketSearch] = useState('');
  const [bucketLoading, setBucketLoading] = useState(false);
  const [selectedImageUrl, setSelectedImageUrl] = useState<string | null>(null);

  const [formData, setFormData] = useState({
    name: '',
    description: '',
    price: '',
    stock: '',
    category_id: '',
    brand_id: '',
  });

  const handleChange = (field: string, value: string) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  const openImagePicker = async () => {
    setShowImagePicker(true);
    setBucketSearch('');
    if (bucketImages.length === 0) {
      setBucketLoading(true);
      const images = await listAllBucketImages();
      setBucketImages(images);
      setBucketLoading(false);
    }
  };

  const filteredBucket = bucketSearch.trim()
    ? bucketImages.filter(img => img.name.toLowerCase().includes(bucketSearch.toLowerCase()))
    : bucketImages;

  const handleCreateCategory = async () => {
    if (!newCategoryName.trim()) return;
    setIsCreatingCategory(true);
    try {
      const slug = newCategoryName.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
      const newCategory = await createCategory({ name: newCategoryName, slug });
      setCategories((prev) => [...prev, newCategory]);
      setFormData((prev) => ({ ...prev, category_id: newCategory.id }));
      setNewCategoryName('');
      setShowNewCategoryDialog(false);
    } catch (error) {
      console.error('Error creating category:', error);
      alert('Failed to create category');
    } finally {
      setIsCreatingCategory(false);
    }
  };

  const handleCreateBrand = async () => {
    if (!newBrandData.name.trim()) return;
    setIsCreatingBrand(true);
    try {
      const slug = newBrandData.name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
      const supabase = getSupabase();
      const { data, error } = await supabase
        .from('brands')
        .insert([{ name: newBrandData.name, slug, logo_url: newBrandData.logo_url || null }])
        .select()
        .single();
      if (error) throw error;
      setBrands((prev) => [...prev, data]);
      setFormData((prev) => ({ ...prev, brand_id: data.id }));
      setNewBrandData({ name: '', logo_url: '' });
      setShowNewBrandDialog(false);
    } catch (error) {
      console.error('Error creating brand:', error);
      alert('Failed to create brand');
    } finally {
      setIsCreatingBrand(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    try {
      const slug = formData.name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
      const selectedCategory = categories.find(c => c.id === formData.category_id);
      const selectedBrand = brands.find(b => b.id === formData.brand_id);

      await createProduct({
        name: formData.name,
        slug,
        description: formData.description,
        price: parseFloat(formData.price),
        category_id: formData.category_id,
        brand_id: formData.brand_id || undefined,
        image_url: selectedImageUrl || undefined,
      });

      setFormData({ name: '', description: '', price: '', stock: '', category_id: '', brand_id: '' });
      setSelectedImageUrl(null);
      router.refresh();
      alert('Product created successfully!');
    } catch (error) {
      console.error('Error creating product:', error);
      alert('Failed to create product');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <>
      <Card>
        <CardHeader>
          <CardTitle>Add New Product</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="space-y-2">
              <Label htmlFor="name">Product Name *</Label>
              <Input
                id="name"
                value={formData.name}
                onChange={(e) => handleChange('name', e.target.value)}
                placeholder="e.g., Ponni Raw Rice"
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="description">Description</Label>
              <Textarea
                id="description"
                value={formData.description}
                onChange={(e) => handleChange('description', e.target.value)}
                placeholder="Enter product description..."
                rows={4}
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="price">Price (£) *</Label>
                <Input
                  id="price"
                  type="number"
                  step="0.01"
                  min="0"
                  value={formData.price}
                  onChange={(e) => handleChange('price', e.target.value)}
                  placeholder="0.00"
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="stock">Stock Quantity *</Label>
                <Input
                  id="stock"
                  type="number"
                  min="0"
                  value={formData.stock}
                  onChange={(e) => handleChange('stock', e.target.value)}
                  placeholder="0"
                  required
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="category">Category *</Label>
              <div className="flex gap-2">
                <Select value={formData.category_id} onValueChange={(value) => handleChange('category_id', value)} required>
                  <SelectTrigger className="flex-1">
                    <SelectValue placeholder="Select a category" />
                  </SelectTrigger>
                  <SelectContent>
                    {categories.map((category) => (
                      <SelectItem key={category.id} value={category.id}>{category.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Button type="button" variant="outline" onClick={() => setShowNewCategoryDialog(true)}>
                  <Plus className="h-4 w-4" />
                </Button>
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="brand">Brand</Label>
              <div className="flex gap-2">
                <Select value={formData.brand_id} onValueChange={(value) => handleChange('brand_id', value)}>
                  <SelectTrigger className="flex-1">
                    <SelectValue placeholder="Select a brand (optional)" />
                  </SelectTrigger>
                  <SelectContent>
                    {brands.map((brand) => (
                      <SelectItem key={brand.id} value={brand.id}>{brand.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Button type="button" variant="outline" onClick={() => setShowNewBrandDialog(true)}>
                  <Plus className="h-4 w-4" />
                </Button>
              </div>
            </div>

            {/* Image picker */}
            <div className="space-y-2">
              <Label>Product Image</Label>
              <div className="flex items-center gap-3">
                {selectedImageUrl ? (
                  <div className="relative w-16 h-16 rounded-lg overflow-hidden border border-gray-200 flex-shrink-0">
                    <img src={selectedImageUrl} alt="Selected" className="w-full h-full object-cover" />
                    <button
                      type="button"
                      onClick={() => setSelectedImageUrl(null)}
                      className="absolute top-0.5 right-0.5 bg-red-500 text-white rounded-full w-4 h-4 flex items-center justify-center"
                    >
                      <X className="w-2.5 h-2.5" />
                    </button>
                  </div>
                ) : (
                  <div className="w-16 h-16 rounded-lg bg-gray-100 border border-dashed border-gray-300 flex items-center justify-center flex-shrink-0">
                    <ImageIcon className="w-6 h-6 text-gray-300" />
                  </div>
                )}
                <Button type="button" variant="outline" onClick={openImagePicker} className="flex-1">
                  <ImageIcon className="h-4 w-4 mr-2" />
                  {selectedImageUrl ? 'Change Image' : 'Select from Library'}
                </Button>
              </div>
            </div>

            <Button type="submit" className="w-full" disabled={isSubmitting}>
              {isSubmitting ? (
                <><Loader2 className="mr-2 h-4 w-4 animate-spin" />Creating Product...</>
              ) : (
                'Create Product'
              )}
            </Button>
          </form>
        </CardContent>
      </Card>

      {/* Image Picker Modal */}
      {showImagePicker && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[88vh] flex flex-col">
            <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
              <div>
                <h2 className="font-semibold text-gray-900 text-sm">Select Product Image</h2>
                <p className="text-xs text-gray-500 mt-0.5">Choose from uploaded images</p>
              </div>
              <button onClick={() => setShowImagePicker(false)} className="text-gray-400 hover:text-gray-700">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="px-5 py-3 border-b border-gray-100">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                <input
                  type="text"
                  value={bucketSearch}
                  onChange={e => setBucketSearch(e.target.value)}
                  placeholder="Search images by filename..."
                  className="w-full pl-9 pr-4 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:border-green-500"
                  autoFocus
                />
              </div>
              <p className="text-xs text-gray-400 mt-1.5">
                {bucketLoading ? 'Loading...' : `${filteredBucket.length} image${filteredBucket.length !== 1 ? 's' : ''}`}
              </p>
            </div>

            <div className="flex-1 overflow-y-auto p-4">
              {bucketLoading ? (
                <div className="flex flex-col items-center justify-center py-16 gap-2">
                  <Loader2 className="w-6 h-6 text-gray-400 animate-spin" />
                  <p className="text-xs text-gray-400">Loading images...</p>
                </div>
              ) : filteredBucket.length === 0 ? (
                <div className="text-center py-12 text-gray-400 text-sm">No images found</div>
              ) : (
                <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 gap-2">
                  {filteredBucket.map(img => {
                    const isSelected = selectedImageUrl === img.url;
                    return (
                      <button
                        key={img.name}
                        type="button"
                        onClick={() => { setSelectedImageUrl(img.url); setShowImagePicker(false); }}
                        className={`group relative aspect-square rounded-xl overflow-hidden bg-gray-100 border-2 transition-all focus:outline-none ${
                          isSelected ? 'border-green-500 ring-2 ring-green-200' : 'border-transparent hover:border-green-400'
                        }`}
                        title={img.name}
                      >
                        <img
                          src={img.url}
                          alt={img.name}
                          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-200"
                          loading="lazy"
                          onError={e => { (e.target as HTMLImageElement).parentElement!.style.display = 'none'; }}
                        />
                        {isSelected && (
                          <div className="absolute top-1.5 right-1.5 w-5 h-5 bg-green-500 rounded-full flex items-center justify-center shadow">
                            <Check className="w-3 h-3 text-white" />
                          </div>
                        )}
                        <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/60 to-transparent px-1.5 py-1 opacity-0 group-hover:opacity-100 transition-opacity">
                          <p className="text-white text-[9px] leading-tight truncate">{img.name}</p>
                        </div>
                      </button>
                    );
                  })}
                </div>
              )}
            </div>

            <div className="px-5 py-4 border-t border-gray-100 flex justify-end">
              <button
                type="button"
                onClick={() => setShowImagePicker(false)}
                className="px-4 py-2 text-sm font-medium text-gray-600 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* New Category Dialog */}
      <Dialog open={showNewCategoryDialog} onOpenChange={setShowNewCategoryDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add New Category</DialogTitle>
            <DialogDescription>Create a new category to organize your products</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="categoryName">Category Name</Label>
              <Input
                id="categoryName"
                value={newCategoryName}
                onChange={(e) => setNewCategoryName(e.target.value)}
                placeholder="e.g., Rice & Grains"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => { setShowNewCategoryDialog(false); setNewCategoryName(''); }} disabled={isCreatingCategory}>
              Cancel
            </Button>
            <Button onClick={handleCreateCategory} disabled={isCreatingCategory}>
              {isCreatingCategory ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" />Creating...</> : 'Create Category'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* New Brand Dialog */}
      <Dialog open={showNewBrandDialog} onOpenChange={setShowNewBrandDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add New Brand</DialogTitle>
            <DialogDescription>Create a new brand for your products</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="brandName">Brand Name</Label>
              <Input
                id="brandName"
                value={newBrandData.name}
                onChange={(e) => setNewBrandData((prev) => ({ ...prev, name: e.target.value }))}
                placeholder="e.g., Kerala Spices Co"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="brandLogo">Logo URL (Optional)</Label>
              <Input
                id="brandLogo"
                type="url"
                value={newBrandData.logo_url}
                onChange={(e) => setNewBrandData((prev) => ({ ...prev, logo_url: e.target.value }))}
                placeholder="https://example.com/logo.jpg"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => { setShowNewBrandDialog(false); setNewBrandData({ name: '', logo_url: '' }); }} disabled={isCreatingBrand}>
              Cancel
            </Button>
            <Button onClick={handleCreateBrand} disabled={isCreatingBrand}>
              {isCreatingBrand ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" />Creating...</> : 'Create Brand'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
