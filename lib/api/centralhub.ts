/**
 * CentralHub API Client
 *
 * Provides a typed, retrying, timeout-aware client for fetching products and
 * categories from the CentralHub Supabase instance via its REST API.
 *
 * Required environment variables (server-side only, never exposed to the browser):
 *   CENTRALHUB_API_URL  — base REST URL, e.g. https://xxxxx.supabase.co/rest/v1
 *   CENTRALHUB_API_KEY  — service-role or anon key for the CentralHub project
 *
 * These are consumed exclusively inside the centralhub-sync Edge Function and
 * server-side sync service. They must NEVER be prefixed with NEXT_PUBLIC_.
 */

export interface CentralHubProduct {
  id: string;
  name: string;
  slug?: string | null;
  description?: string | null;
  image_url?: string | null;
  category_id?: string | null;
  brand_id?: string | null;
  price?: number | null;
  original_price?: number | null;
  is_active?: boolean | null;
  is_deleted?: boolean | null;
  is_featured?: boolean | null;
  is_deal?: boolean | null;
  is_new_arrival?: boolean | null;
  is_bestseller?: boolean | null;
  discount_percentage?: number | null;
  sold_count?: number | null;
  rating?: number | null;
  review_count?: number | null;
  created_at?: string | null;
  updated_at?: string | null;
}

export interface CentralHubCategory {
  id: string;
  name: string;
  slug: string;
  is_active?: boolean | null;
  sort_order?: number | null;
}

export interface CentralHubFetchResult<T> {
  data: T[];
  totalCount: number;
  error: string | null;
}

interface CentralHubConfig {
  apiUrl: string;
  apiKey: string;
  timeoutMs?: number;
  maxRetries?: number;
}

const DEFAULT_TIMEOUT_MS = 15_000;
const DEFAULT_MAX_RETRIES = 3;
const PAGE_SIZE = 1000;

function delay(ms: number) {
  return new Promise(res => setTimeout(res, ms));
}

async function fetchWithRetry(
  url: string,
  headers: HeadersInit,
  timeoutMs: number,
  maxRetries: number
): Promise<Response> {
  let lastError: Error | null = null;

  for (let attempt = 0; attempt < maxRetries; attempt++) {
    try {
      const controller = new AbortController();
      const timer = setTimeout(() => controller.abort(), timeoutMs);
      try {
        const res = await fetch(url, { headers, signal: controller.signal });
        clearTimeout(timer);
        if (!res.ok) {
          throw new Error(`HTTP ${res.status}: ${res.statusText}`);
        }
        return res;
      } finally {
        clearTimeout(timer);
      }
    } catch (err) {
      lastError = err instanceof Error ? err : new Error(String(err));
      if (attempt < maxRetries - 1) {
        await delay(Math.pow(2, attempt) * 500);
      }
    }
  }
  throw lastError ?? new Error('Max retries exceeded');
}

export class CentralHubClient {
  private readonly apiUrl: string;
  private readonly headers: HeadersInit;
  private readonly timeoutMs: number;
  private readonly maxRetries: number;

  constructor(config: CentralHubConfig) {
    this.apiUrl = config.apiUrl.replace(/\/$/, '');
    this.headers = {
      apikey: config.apiKey,
      Authorization: `Bearer ${config.apiKey}`,
      'Content-Type': 'application/json',
      Prefer: 'count=exact',
    };
    this.timeoutMs = config.timeoutMs ?? DEFAULT_TIMEOUT_MS;
    this.maxRetries = config.maxRetries ?? DEFAULT_MAX_RETRIES;
  }

  /** Test that the API is reachable. Returns true on success. */
  async ping(): Promise<{ ok: boolean; error: string | null }> {
    try {
      const url = `${this.apiUrl}/products?select=id&limit=1`;
      await fetchWithRetry(url, this.headers, this.timeoutMs, 1);
      return { ok: true, error: null };
    } catch (err) {
      return { ok: false, error: err instanceof Error ? err.message : 'Connection failed' };
    }
  }

  /** Fetch ALL active, non-deleted products with pagination. */
  async fetchAllProducts(): Promise<CentralHubFetchResult<CentralHubProduct>> {
    const all: CentralHubProduct[] = [];
    let offset = 0;
    let totalCount = 0;

    try {
      while (true) {
        const url =
          `${this.apiUrl}/products` +
          `?select=id,name,slug,description,image_url,category_id,brand_id,price,original_price,` +
          `is_active,is_deleted,is_featured,is_deal,is_new_arrival,is_bestseller,` +
          `discount_percentage,created_at,updated_at` +
          `&is_deleted=eq.false&is_active=eq.true` +
          `&order=id.asc` +
          `&limit=${PAGE_SIZE}&offset=${offset}`;

        const res = await fetchWithRetry(url, this.headers, this.timeoutMs, this.maxRetries);
        const raw = await res.json();

        // Supabase REST returns count in Content-Range header: items/total
        const contentRange = res.headers.get('content-range') ?? '';
        const match = contentRange.match(/\/(\d+)/);
        if (match) totalCount = parseInt(match[1], 10);

        const batch = Array.isArray(raw) ? raw : [];
        all.push(...(batch as CentralHubProduct[]));

        if (batch.length < PAGE_SIZE) break;
        offset += PAGE_SIZE;
      }

      return { data: all, totalCount: totalCount || all.length, error: null };
    } catch (err) {
      return {
        data: all,
        totalCount: all.length,
        error: err instanceof Error ? err.message : 'Unknown error fetching products',
      };
    }
  }

  /** Fetch a single page of products (for preview / diagnostics). */
  async fetchProductsPage(
    page: number,
    pageSize = 50
  ): Promise<CentralHubFetchResult<CentralHubProduct>> {
    const offset = (page - 1) * pageSize;
    try {
      const url =
        `${this.apiUrl}/products` +
        `?select=id,name,slug,price,is_active,is_deleted,created_at` +
        `&is_deleted=eq.false&is_active=eq.true` +
        `&order=created_at.desc` +
        `&limit=${pageSize}&offset=${offset}`;

      const res = await fetchWithRetry(url, this.headers, this.timeoutMs, this.maxRetries);
      const raw = await res.json();

      const contentRange = res.headers.get('content-range') ?? '';
      const match = contentRange.match(/\/(\d+)/);
      const totalCount = match ? parseInt(match[1], 10) : 0;

      return {
        data: Array.isArray(raw) ? (raw as CentralHubProduct[]) : [],
        totalCount,
        error: null,
      };
    } catch (err) {
      return {
        data: [],
        totalCount: 0,
        error: err instanceof Error ? err.message : 'Unknown error',
      };
    }
  }

  /** Fetch all active categories. */
  async fetchCategories(): Promise<CentralHubFetchResult<CentralHubCategory>> {
    try {
      const url = `${this.apiUrl}/categories?select=id,name,slug,is_active,sort_order&is_active=eq.true&order=name.asc`;
      const res = await fetchWithRetry(url, this.headers, this.timeoutMs, this.maxRetries);
      const raw = await res.json();
      return {
        data: Array.isArray(raw) ? (raw as CentralHubCategory[]) : [],
        totalCount: Array.isArray(raw) ? raw.length : 0,
        error: null,
      };
    } catch (err) {
      return {
        data: [],
        totalCount: 0,
        error: err instanceof Error ? err.message : 'Unknown error',
      };
    }
  }
}

/**
 * Build a CentralHubClient from environment variables.
 * Must only be called in server-side or Edge Function contexts.
 */
export function createCentralHubClient(): CentralHubClient {
  const apiUrl = process.env.CENTRALHUB_API_URL;
  const apiKey = process.env.CENTRALHUB_API_KEY;

  if (!apiUrl || !apiKey) {
    throw new Error(
      'Missing CENTRALHUB_API_URL or CENTRALHUB_API_KEY environment variables. ' +
      'These must be set as server-side (non-NEXT_PUBLIC_) environment variables.'
    );
  }

  return new CentralHubClient({ apiUrl, apiKey });
}
