'use client';

import { useState, useEffect, useCallback } from 'react';
import { X, Search, Loader2, Image as ImageIcon, Check } from 'lucide-react';
import { getSupabase } from '@/lib/supabase/client';

const BUCKET = 'product-images';
const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!;

interface StorageFile {
  name: string;
  url: string;
  created_at: string;
}

interface Props {
  onSelect: (url: string, filename: string) => void;
  onClose: () => void;
}

export default function MediaPicker({ onSelect, onClose }: Props) {
  const [files, setFiles] = useState<StorageFile[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [selectedUrl, setSelectedUrl] = useState<string | null>(null);
  const [selectedName, setSelectedName] = useState<string | null>(null);

  const loadFiles = useCallback(async () => {
    setLoading(true);
    try {
      const supabase = getSupabase();

      // List files in 'uploads/' and directly in bucket root
      const [uploadsRes, rootRes] = await Promise.all([
        supabase.storage.from(BUCKET).list('uploads', { limit: 100, sortBy: { column: 'created_at', order: 'desc' } }),
        supabase.storage.from(BUCKET).list('', { limit: 100, sortBy: { column: 'created_at', order: 'desc' } })
      ]);

      const allFiles: StorageFile[] = [];

      if (uploadsRes.data) {
        uploadsRes.data
          .filter(f => f.name !== '.emptyFolderPlaceholder' && !f.id?.includes('folder'))
          .forEach(f => {
            allFiles.push({
              name: f.name,
              url: `${SUPABASE_URL}/storage/v1/object/public/${BUCKET}/uploads/${f.name}`,
              created_at: f.created_at
            });
          });
      }

      if (rootRes.data) {
        rootRes.data
          .filter(f => f.name !== '.emptyFolderPlaceholder' && !f.id?.includes('folder') && f.name !== 'uploads')
          .forEach(f => {
            allFiles.push({
              name: f.name,
              url: `${SUPABASE_URL}/storage/v1/object/public/${BUCKET}/${f.name}`,
              created_at: f.created_at
            });
          });
      }

      // Sort by newest
      allFiles.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
      setFiles(allFiles);
    } catch (err) {
      console.error('Failed to load media:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadFiles();
  }, [loadFiles]);

  const filtered = files.filter(f =>
    f.name.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-4xl max-h-[85vh] flex flex-col overflow-hidden">

        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
          <div>
            <h3 className="text-lg font-bold text-gray-900">Select from Media</h3>
            <p className="text-xs text-gray-500">Pick an existing image from storage</p>
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 transition-colors p-1">
            <X className="w-6 h-6" />
          </button>
        </div>

        {/* Search */}
        <div className="px-6 py-3 bg-gray-50 border-b border-gray-100">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              type="text"
              placeholder="Search images by name..."
              value={search}
              onChange={e => setSearch(e.target.value)}
              className="w-full pl-10 pr-4 py-2 text-sm bg-white border border-gray-200 rounded-xl focus:outline-none focus:border-green-500 focus:ring-2 focus:ring-green-500/20 transition-all"
            />
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6">
          {loading ? (
            <div className="h-64 flex flex-col items-center justify-center gap-3 text-gray-400">
              <Loader2 className="w-10 h-10 animate-spin text-green-600" />
              <p className="text-sm font-medium">Loading media library...</p>
            </div>
          ) : filtered.length === 0 ? (
            <div className="h-64 flex flex-col items-center justify-center gap-2 text-gray-400">
              <ImageIcon className="w-12 h-12 opacity-20" />
              <p className="text-sm font-medium">{search ? 'No matches found' : 'Media library is empty'}</p>
            </div>
          ) : (
            <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-6 gap-4">
              {filtered.map((file) => (
                <button
                  key={file.url}
                  onClick={() => {
                    setSelectedUrl(file.url);
                    setSelectedName(file.name);
                  }}
                  className={`group relative aspect-square rounded-xl overflow-hidden border-2 transition-all ${
                    selectedUrl === file.url
                      ? 'border-green-500 ring-4 ring-green-500/10'
                      : 'border-transparent hover:border-gray-200'
                  }`}
                >
                  <img
                    src={file.url}
                    alt={file.name}
                    className="w-full h-full object-cover transition-transform group-hover:scale-105"
                    loading="lazy"
                  />
                  {selectedUrl === file.url && (
                    <div className="absolute inset-0 bg-green-500/20 flex items-center justify-center">
                      <div className="bg-green-500 text-white rounded-full p-1 shadow-lg">
                        <Check className="w-4 h-4" />
                      </div>
                    </div>
                  )}
                  <div className="absolute inset-x-0 bottom-0 bg-black/60 p-1 opacity-0 group-hover:opacity-100 transition-opacity">
                    <p className="text-[10px] text-white truncate text-center">{file.name}</p>
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-gray-100 flex items-center justify-between bg-gray-50">
          <div className="text-sm text-gray-500">
            {selectedName ? (
              <span className="flex items-center gap-1.5">
                <Check className="w-4 h-4 text-green-600" />
                Selected: <span className="font-semibold text-gray-900">{selectedName}</span>
              </span>
            ) : (
              'Select an image to continue'
            )}
          </div>
          <div className="flex gap-3">
            <button
              onClick={onClose}
              className="px-5 py-2 text-sm font-medium text-gray-600 hover:text-gray-900 transition-colors"
            >
              Cancel
            </button>
            <button
              disabled={!selectedUrl}
              onClick={() => selectedUrl && selectedName && onSelect(selectedUrl, selectedName)}
              className="px-6 py-2 text-sm font-bold text-white bg-green-600 hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed rounded-xl shadow-lg shadow-green-600/20 transition-all active:scale-95"
            >
              Select Image
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
