'use client';

import { useState, useRef, useEffect, useCallback } from 'react';
import { Input } from '@/components/ui/input';
import { MapPin, Loader as Loader2, Search } from 'lucide-react';

interface AddressSuggestion {
  address: string;
  url: string;
  id: string;
}

interface FullAddress {
  postcode: string;
  line_1: string;
  line_2: string;
  line_3: string;
  line_4: string;
  town_or_city: string;
  county: string;
  country: string;
}

export interface SelectedAddress {
  address: string;
  city: string;
  postcode: string;
  county: string;
}

interface AddressAutocompleteProps {
  value: string;
  onAddressSelect: (address: SelectedAddress) => void;
  onChange?: (value: string) => void;
  placeholder?: string;
  className?: string;
  id?: string;
  name?: string;
}

const SUPABASE_ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const getBase = () => process.env.NEXT_PUBLIC_SUPABASE_URL ?? '';

export default function AddressAutocomplete({
  value,
  onAddressSelect,
  onChange,
  placeholder = 'Start typing your address...',
  className = '',
  id,
  name,
}: AddressAutocompleteProps) {
  const [suggestions, setSuggestions] = useState<AddressSuggestion[]>([]);
  const [isOpen, setIsOpen] = useState(false);
  const [isSearching, setIsSearching] = useState(false);
  const [isLoadingAddress, setIsLoadingAddress] = useState(false);
  const [highlightIndex, setHighlightIndex] = useState(-1);
  const wrapperRef = useRef<HTMLDivElement>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout>>();
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (wrapperRef.current && !wrapperRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const fetchSuggestions = useCallback(async (term: string) => {
    if (term.length < 2) {
      setSuggestions([]);
      setIsOpen(false);
      return;
    }

    setIsSearching(true);
    try {
      const url = `${getBase()}/functions/v1/address-lookup?action=autocomplete&term=${encodeURIComponent(term)}`;
      const res = await fetch(url, {
        headers: {
          Authorization: `Bearer ${SUPABASE_ANON_KEY}`,
          'Content-Type': 'application/json',
        },
      });
      const data = await res.json();
      if (data.suggestions && data.suggestions.length > 0) {
        setSuggestions(data.suggestions);
        setIsOpen(true);
        setHighlightIndex(-1);
      } else {
        setSuggestions([]);
        setIsOpen(false);
      }
    } catch (err) {
      console.error('Address autocomplete error:', err);
      setSuggestions([]);
    } finally {
      setIsSearching(false);
    }
  }, []);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    onChange?.(val);

    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      fetchSuggestions(val);
    }, 300);
  };

  const selectSuggestion = async (suggestion: AddressSuggestion) => {
    setIsOpen(false);
    setIsLoadingAddress(true);
    setSuggestions([]);

    try {
      const url = `${getBase()}/functions/v1/address-lookup?action=get&id=${encodeURIComponent(suggestion.id)}`;
      const res = await fetch(url, {
        headers: {
          Authorization: `Bearer ${SUPABASE_ANON_KEY}`,
          'Content-Type': 'application/json',
        },
      });
      const data: FullAddress = await res.json();

      const addressLines = [data.line_1, data.line_2, data.line_3, data.line_4]
        .filter(Boolean)
        .join(', ');

      onAddressSelect({
        address: addressLines || suggestion.address,
        city: data.town_or_city || '',
        postcode: data.postcode || '',
        county: data.county || '',
      });
    } catch (err) {
      console.error('Address get error:', err);
      onAddressSelect({
        address: suggestion.address,
        city: '',
        postcode: '',
        county: '',
      });
    } finally {
      setIsLoadingAddress(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (!isOpen || suggestions.length === 0) return;

    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setHighlightIndex((prev) => (prev < suggestions.length - 1 ? prev + 1 : 0));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setHighlightIndex((prev) => (prev > 0 ? prev - 1 : suggestions.length - 1));
    } else if (e.key === 'Enter' && highlightIndex >= 0) {
      e.preventDefault();
      selectSuggestion(suggestions[highlightIndex]);
    } else if (e.key === 'Escape') {
      setIsOpen(false);
    }
  };

  return (
    <div ref={wrapperRef} className="relative">
      <div className="relative">
        <Input
          ref={inputRef}
          id={id}
          name={name}
          value={value}
          onChange={handleInputChange}
          onKeyDown={handleKeyDown}
          onFocus={() => {
            if (suggestions.length > 0) setIsOpen(true);
          }}
          placeholder={placeholder}
          className={`pr-10 ${className}`}
          autoComplete="off"
        />
        <div className="absolute right-3 top-1/2 -translate-y-1/2">
          {isSearching || isLoadingAddress ? (
            <Loader2 className="w-4 h-4 text-gray-400 animate-spin" />
          ) : (
            <Search className="w-4 h-4 text-gray-400" />
          )}
        </div>
      </div>

      {isOpen && suggestions.length > 0 && (
        <div className="absolute z-50 mt-1 w-full bg-white border border-gray-200 rounded-xl shadow-lg overflow-hidden">
          <div className="px-3 py-2 border-b border-gray-100 bg-gray-50">
            <p className="text-[10px] font-medium text-gray-400 uppercase tracking-wider">
              Select your address
            </p>
          </div>
          <ul className="max-h-60 overflow-y-auto py-1">
            {suggestions.map((suggestion, i) => (
              <li key={suggestion.id}>
                <button
                  type="button"
                  className={`w-full flex items-start gap-2.5 px-3 py-2.5 text-left transition-colors ${
                    i === highlightIndex
                      ? 'bg-green-50 text-green-900'
                      : 'text-gray-700 hover:bg-gray-50'
                  }`}
                  onClick={() => selectSuggestion(suggestion)}
                  onMouseEnter={() => setHighlightIndex(i)}
                >
                  <MapPin className={`w-4 h-4 mt-0.5 flex-shrink-0 ${
                    i === highlightIndex ? 'text-green-600' : 'text-gray-400'
                  }`} />
                  <span className="text-sm leading-snug">{suggestion.address}</span>
                </button>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
