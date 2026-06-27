'use client';

import { useRef, useState, useCallback, ReactNode } from 'react';

interface PullToRefreshProps {
  onRefresh: () => Promise<void>;
  children: ReactNode;
  threshold?: number;
}

/**
 * Wraps content with a native-feeling pull-to-refresh gesture.
 * Works on both iOS WKWebView and web browsers.
 */
export function PullToRefresh({ onRefresh, children, threshold = 72 }: PullToRefreshProps) {
  const [pullDistance, setPullDistance] = useState(0);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const startY = useRef(0);
  const pulling = useRef(false);

  const handleTouchStart = useCallback((e: React.TouchEvent) => {
    if (window.scrollY === 0) {
      startY.current = e.touches[0].clientY;
      pulling.current = true;
    }
  }, []);

  const handleTouchMove = useCallback((e: React.TouchEvent) => {
    if (!pulling.current || isRefreshing) return;
    const dy = Math.max(0, e.touches[0].clientY - startY.current);
    // Apply rubber-band resistance
    setPullDistance(Math.min(dy * 0.45, threshold * 1.4));
  }, [isRefreshing, threshold]);

  const handleTouchEnd = useCallback(async () => {
    if (!pulling.current) return;
    pulling.current = false;

    if (pullDistance >= threshold) {
      setIsRefreshing(true);
      setPullDistance(threshold * 0.6);
      try {
        await onRefresh();
      } finally {
        setIsRefreshing(false);
        setPullDistance(0);
      }
    } else {
      setPullDistance(0);
    }
  }, [pullDistance, threshold, onRefresh]);

  const showIndicator = pullDistance > 8 || isRefreshing;
  const progress = Math.min(pullDistance / threshold, 1);

  return (
    <div
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
      className="relative"
    >
      {/* Pull indicator */}
      {showIndicator && (
        <div
          className="absolute left-1/2 z-50 flex -translate-x-1/2 items-center justify-center"
          style={{
            top: -44 + pullDistance,
            transition: isRefreshing ? 'none' : 'top 0.1s ease-out',
          }}
        >
          <div className="flex h-9 w-9 items-center justify-center rounded-full bg-white shadow-lg">
            {isRefreshing ? (
              <svg
                className="h-5 w-5 animate-spin text-green-700"
                fill="none"
                viewBox="0 0 24 24"
              >
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="3" />
                <path
                  className="opacity-75"
                  fill="currentColor"
                  d="M4 12a8 8 0 018-8v4l3-3-3-3v4a10 10 0 100 10l-1.4-1.4A8 8 0 014 12z"
                />
              </svg>
            ) : (
              <svg
                className="h-5 w-5 text-green-700"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                strokeWidth={2.5}
                style={{
                  transform: `rotate(${progress * 180}deg)`,
                  transition: 'transform 0.1s ease-out',
                  opacity: 0.4 + progress * 0.6,
                }}
              >
                <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
              </svg>
            )}
          </div>
        </div>
      )}

      {/* Content */}
      <div
        style={{
          transform: pullDistance > 0 ? `translateY(${pullDistance}px)` : undefined,
          transition: isRefreshing || pullDistance === 0 ? 'transform 0.25s ease-out' : 'none',
        }}
      >
        {children}
      </div>
    </div>
  );
}
