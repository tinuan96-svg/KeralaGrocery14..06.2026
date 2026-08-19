'use client';

import { useState, useCallback } from 'react';
import { useToast } from '@/hooks/use-toast';
import { haptics } from '@/lib/utils/haptics';

interface AsyncActionOptions<T> {
  successMessage?: string;
  errorMessage?: string;
  onSuccess?: (data: T) => void;
  onError?: (error: string) => void;
  showSuccessToast?: boolean;
}

/**
 * A unified hook to handle async service calls with automatic:
 * 1. Loading state management
 * 2. Error catching and Toast notification
 * 3. Haptic feedback on error
 * 4. Success Toast notification (optional)
 */
export function useAsyncAction<T, Args extends any[]>(
  action: (...args: Args) => Promise<{ data?: T | null; error?: string | null } | T | void>,
  options: AsyncActionOptions<T> = {}
) {
  const [isLoading, setIsLoading] = useState(false);
  const { toast } = useToast();

  const execute = useCallback(
    async (...args: Args): Promise<T | null> => {
      setIsLoading(true);
      try {
        const result = await action(...args);

        // Handle result that follows { data, error } pattern or just data
        let data: T | null = null;
        let error: string | null = null;

        if (result && typeof result === 'object' && ('data' in result || 'error' in result)) {
          data = (result as any).data;
          error = (result as any).error;
        } else {
          data = result as T;
        }

        if (error) {
          throw new Error(error);
        }

        if (options.successMessage || options.showSuccessToast) {
          toast({
            title: 'Success',
            description: options.successMessage || 'Action completed successfully',
          });
        }

        options.onSuccess?.(data as T);
        return data;
      } catch (err: any) {
        const message = err.message || options.errorMessage || 'Something went wrong';

        haptics.notification('error');
        toast({
          variant: 'destructive',
          title: 'Error',
          description: message,
        });

        options.onError?.(message);
        return null;
      } finally {
        setIsLoading(false);
      }
    },
    [action, options, toast]
  );

  return { execute, isLoading };
}
