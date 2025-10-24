'use client';

import { useState, useEffect, useCallback, useRef } from 'react';

interface CacheEntry<T> {
  data: T;
  timestamp: number;
  dateRange: string;
  companyId?: string;
  clientId?: string;
}

interface CacheOptions {
  cacheTime?: number; // Time in milliseconds to keep cache valid (default: 5 minutes)
  staleTime?: number; // Time in milliseconds before data is considered stale (default: 2 minutes)
}

const DEFAULT_CACHE_TIME = 5 * 60 * 1000; // 5 minutes
const DEFAULT_STALE_TIME = 2 * 60 * 1000; // 2 minutes

/**
 * Custom hook for caching analytics API responses
 * Implements in-memory caching with automatic invalidation
 */
export function useAnalyticsCache<T = any>(options: CacheOptions = {}) {
  const {
    cacheTime = DEFAULT_CACHE_TIME,
    staleTime = DEFAULT_STALE_TIME
  } = options;

  // In-memory cache
  const cacheRef = useRef<Map<string, CacheEntry<T>>>(new Map());

  /**
   * Generate cache key from parameters
   */
  const generateCacheKey = useCallback((params: {
    clientId?: string;
    companyId?: string;
    dateRange: string;
    comparisonMode?: string;
  }) => {
    const { clientId, companyId, dateRange, comparisonMode } = params;
    return `${clientId || companyId || 'unknown'}_${dateRange}_${comparisonMode || 'none'}`;
  }, []);

  /**
   * Check if cache entry is still valid
   */
  const isCacheValid = useCallback((entry: CacheEntry<T>): boolean => {
    const now = Date.now();
    return (now - entry.timestamp) < cacheTime;
  }, [cacheTime]);

  /**
   * Check if cache entry is stale but still usable
   */
  const isCacheStale = useCallback((entry: CacheEntry<T>): boolean => {
    const now = Date.now();
    const age = now - entry.timestamp;
    return age >= staleTime && age < cacheTime;
  }, [staleTime, cacheTime]);

  /**
   * Get data from cache
   */
  const getCachedData = useCallback((params: {
    clientId?: string;
    companyId?: string;
    dateRange: string;
    comparisonMode?: string;
  }): { data: T | null; isStale: boolean } => {
    const key = generateCacheKey(params);
    const entry = cacheRef.current.get(key);

    if (!entry) {
      return { data: null, isStale: false };
    }

    if (!isCacheValid(entry)) {
      // Cache expired, remove it
      cacheRef.current.delete(key);
      return { data: null, isStale: false };
    }

    return {
      data: entry.data,
      isStale: isCacheStale(entry)
    };
  }, [generateCacheKey, isCacheValid, isCacheStale]);

  /**
   * Set data in cache
   */
  const setCachedData = useCallback((
    params: {
      clientId?: string;
      companyId?: string;
      dateRange: string;
      comparisonMode?: string;
    },
    data: T
  ) => {
    const key = generateCacheKey(params);
    cacheRef.current.set(key, {
      data,
      timestamp: Date.now(),
      dateRange: params.dateRange,
      companyId: params.companyId,
      clientId: params.clientId
    });
  }, [generateCacheKey]);

  /**
   * Invalidate specific cache entry
   */
  const invalidateCache = useCallback((params?: {
    clientId?: string;
    companyId?: string;
    dateRange?: string;
    comparisonMode?: string;
  }) => {
    if (!params) {
      // Invalidate all cache
      cacheRef.current.clear();
      return;
    }

    // Invalidate specific entry
    const key = generateCacheKey({
      clientId: params.clientId,
      companyId: params.companyId,
      dateRange: params.dateRange || '7d',
      comparisonMode: params.comparisonMode
    });
    cacheRef.current.delete(key);
  }, [generateCacheKey]);

  /**
   * Get cache statistics
   */
  const getCacheStats = useCallback(() => {
    const now = Date.now();
    const entries = Array.from(cacheRef.current.values());
    
    return {
      totalEntries: entries.length,
      validEntries: entries.filter(e => isCacheValid(e)).length,
      staleEntries: entries.filter(e => isCacheStale(e)).length,
      oldestEntry: entries.length > 0 
        ? Math.min(...entries.map(e => e.timestamp))
        : null
    };
  }, [isCacheValid, isCacheStale]);

  // Cleanup expired cache entries periodically
  useEffect(() => {
    const interval = setInterval(() => {
      const now = Date.now();
      const keysToDelete: string[] = [];

      cacheRef.current.forEach((entry, key) => {
        if ((now - entry.timestamp) >= cacheTime) {
          keysToDelete.push(key);
        }
      });

      keysToDelete.forEach(key => cacheRef.current.delete(key));

      if (keysToDelete.length > 0) {
        console.log(`🗑️ Cleaned up ${keysToDelete.length} expired cache entries`);
      }
    }, cacheTime); // Run cleanup when cache would expire

    return () => clearInterval(interval);
  }, [cacheTime]);

  return {
    getCachedData,
    setCachedData,
    invalidateCache,
    getCacheStats
  };
}
