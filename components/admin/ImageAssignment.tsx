'use client';

import { useState, useEffect, useCallback } from 'react';
import { getSupabase } from '@/lib/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useRouter } from 'next/navigation';

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const BUCKET = 'product-images';

interface StorageImage {
  name: string;
  url: string;
}

interface ProductWithoutImage {
  id: string;
  name: string;
  slug: string;
}

export default function ImageAssignment() {
  const router = useRouter();
  const [images, setImages] = useState<StorageImage[]>([]);
  const [products, setProducts] = useState<ProductWithoutImage[]>([]);
  const [selectedImage, setSelectedImage] = useState<StorageImage | null>(null);
  const [selectedProduct, setSelectedProduct] = useState<ProductWithoutImage | null>(null);
  const [assigning, setAssigning] = useState(false);
  const [loading, setLoading] = useState(true);
  const [successMessage, setSuccessMessage] = useState('');

  const load = useCallback(async () => {
    setLoading(true);
    const supabase = getSupabase();

    const [{ data: storageFiles }, { data: productsData }] = await Promise.all([
      supabase.storage.from(BUCKET).list('uploads', { limit: 200, sortBy: { column: 'created_at', order: 'desc' } }),
      supabase.from('products').select('id, name, slug').is('image_url', null).order('name'),
    ]);

    if (storageFiles) {
      setImages(
        storageFiles
          .filter((f) => f.name !== '.emptyFolderPlaceholder')
          .map((f) => ({
            name: f.name,
            url: `${SUPABASE_URL}/storage/v1/object/public/${BUCKET}/uploads/${f.name}`,
          }))
      );
    }

    if (productsData) setProducts(productsData);
    setLoading(false);
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const handleAssign = async () => {
    if (!selectedImage || !selectedProduct) return;
    setAssigning(true);

    try {
      const supabase = getSupabase();
      const { error } = await supabase
        .from('products')
        .update({ image_url: selectedImage.url })
        .eq('id', selectedProduct.id);

      if (error) throw error;

      setSuccessMessage(`Assigned "${selectedImage.name}" to "${selectedProduct.name}"`);
      setSelectedImage(null);
      setSelectedProduct(null);
      await load();
      router.refresh();
      setTimeout(() => setSuccessMessage(''), 4000);
    } catch (err) {
      console.error('Assignment failed:', err);
    } finally {
      setAssigning(false);
    }
  };

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Image Assignment</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-sm text-muted-foreground">Loading images and products...</div>
        </CardContent>
      </Card>
    );
  }

  if (products.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Image Assignment</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-sm text-green-600 font-medium">All products have images assigned.</div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-3">
          Image Assignment
          <Badge variant="secondary">{products.length} products need images</Badge>
          <Badge variant="outline">{images.length} images available</Badge>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        {successMessage && (
          <div className="bg-green-50 border border-green-200 text-green-800 text-sm px-4 py-3 rounded-lg">
            {successMessage}
          </div>
        )}

        <div className="flex flex-col lg:flex-row gap-6">
          <div className="flex-1 min-w-0">
            <h3 className="text-sm font-semibold mb-3 text-muted-foreground uppercase tracking-wide">
              Step 1 — Pick an image
            </h3>
            <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 gap-2 max-h-[420px] overflow-y-auto pr-1">
              {images.map((img) => (
                <button
                  key={img.name}
                  onClick={() => setSelectedImage(selectedImage?.name === img.name ? null : img)}
                  className={`relative aspect-square rounded-lg overflow-hidden border-2 transition-all focus:outline-none ${
                    selectedImage?.name === img.name
                      ? 'border-orange-500 ring-2 ring-orange-300'
                      : 'border-transparent hover:border-gray-300'
                  }`}
                >
                  <img
                    src={img.url}
                    alt={img.name}
                    className="w-full h-full object-cover"
                    loading="lazy"
                  />
                  {selectedImage?.name === img.name && (
                    <div className="absolute inset-0 bg-orange-500/20 flex items-center justify-center">
                      <div className="bg-orange-500 text-white rounded-full w-6 h-6 flex items-center justify-center text-xs font-bold">
                        ✓
                      </div>
                    </div>
                  )}
                </button>
              ))}
            </div>
            {selectedImage && (
              <p className="text-xs text-muted-foreground mt-2 truncate">
                Selected: {selectedImage.name}
              </p>
            )}
          </div>

          <div className="flex-1 min-w-0">
            <h3 className="text-sm font-semibold mb-3 text-muted-foreground uppercase tracking-wide">
              Step 2 — Pick a product
            </h3>
            <div className="flex flex-col gap-1.5 max-h-[420px] overflow-y-auto pr-1">
              {products.map((product) => (
                <button
                  key={product.id}
                  onClick={() =>
                    setSelectedProduct(selectedProduct?.id === product.id ? null : product)
                  }
                  className={`w-full text-left px-3 py-2.5 rounded-lg border text-sm transition-all focus:outline-none ${
                    selectedProduct?.id === product.id
                      ? 'border-orange-500 bg-orange-50 text-orange-900 font-medium ring-1 ring-orange-300'
                      : 'border-gray-200 hover:border-gray-300 hover:bg-gray-50'
                  }`}
                >
                  {product.name}
                </button>
              ))}
            </div>
          </div>
        </div>

        <div className="flex items-center gap-4 pt-2 border-t">
          <div className="flex-1 text-sm text-muted-foreground">
            {selectedImage && selectedProduct ? (
              <span>
                Assign <strong>{selectedImage.name}</strong> to <strong>{selectedProduct.name}</strong>
              </span>
            ) : (
              <span>Select an image and a product to assign</span>
            )}
          </div>
          <Button
            onClick={handleAssign}
            disabled={!selectedImage || !selectedProduct || assigning}
            className="bg-orange-500 hover:bg-orange-600 text-white"
          >
            {assigning ? 'Assigning...' : 'Assign Image'}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
