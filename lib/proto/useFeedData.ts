"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { Article } from "./types";
import { mapFeedItemToArticle, FeedApiItem } from "./mapArticle";

export type UseArticlesOptions = {
  /** Optional free-text search — forwarded to /api/feed's `q` param. */
  q?: string;
  /** How many raw items to request per page from /api/feed (server clamps to 60). */
  pageSize?: number;
  /**
   * Optional client-side filter applied to each mapped Article (e.g. a
   * taxonomy category the DB itself doesn't index). When set and a fetched
   * page yields zero NEW matching items but the API still has more pages
   * (`hasMore`), the hook automatically chains into the next page (up to
   * `maxAutoChain` times) instead of leaving the caller looking at a
   * suspiciously-short or empty list after one tap.
   */
  filter?: (article: Article) => boolean;
  maxAutoChain?: number;
  /** Set false to hold off fetching (e.g. waiting on a prerequisite). */
  enabled?: boolean;
};

export type UseArticlesResult = {
  articles: Article[];
  loading: boolean;
  loadingMore: boolean;
  hasMore: boolean;
  error: string | null;
  /** Fetch the next page and append. No-op while already loading. */
  loadMore: () => void;
  /** Reset and refetch from scratch (e.g. on filter/q change). */
  refresh: () => void;
};

/**
 * Cursor-paginated fetch of real feed data (papers + news) from /api/feed,
 * mapped into the `Article` shape app/[locale]/feedapp's components expect.
 * Used by feed/trending/search/stack pages instead of the old static
 * `ARTICLES` import from lib/proto/mockData.ts.
 */
export function useArticles({ q, pageSize = 24, filter, maxAutoChain = 4, enabled = true }: UseArticlesOptions = {}): UseArticlesResult {
  const [articles, setArticles] = useState<Article[]>([]);
  const [loading, setLoading] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [hasMore, setHasMore] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const cursorRef = useRef<string | null>(null);
  const seenIdsRef = useRef<Set<string>>(new Set());
  const inFlightRef = useRef(false);
  const requestIdRef = useRef(0);

  const fetchOnePage = useCallback(
    async (reset: boolean, myRequestId: number, chain: number): Promise<void> => {
      const params = new URLSearchParams({ limit: String(pageSize) });
      if (!reset && cursorRef.current) params.set("cursor", cursorRef.current);
      if (q) params.set("q", q);

      const res = await fetch(`/api/feed?${params.toString()}`);
      if (requestIdRef.current !== myRequestId) return; // superseded by a newer refresh/query change
      if (!res.ok) throw new Error(`feed fetch failed: ${res.status}`);
      const data: { items: FeedApiItem[]; nextCursor: string | null; hasMore: boolean } = await res.json();

      cursorRef.current = data.nextCursor;
      const apiHasMore = !!data.hasMore && !!data.nextCursor;
      setHasMore(apiHasMore);

      const mapped = data.items.map(mapFeedItemToArticle).filter((a) => {
        if (seenIdsRef.current.has(a.id)) return false;
        seenIdsRef.current.add(a.id);
        return true;
      });
      const finalItems = filter ? mapped.filter(filter) : mapped;

      if (finalItems.length > 0 || !apiHasMore || chain >= maxAutoChain) {
        setArticles((prev) => (reset ? finalItems : [...prev, ...finalItems]));
        return;
      }
      // Filtered page came up empty but more pages exist — chain automatically
      // rather than surfacing a dead-looking "no results" for a narrow filter.
      await fetchOnePage(false, myRequestId, chain + 1);
    },
    [pageSize, q, filter, maxAutoChain]
  );

  const runFetch = useCallback(
    (reset: boolean) => {
      if (inFlightRef.current) return;
      inFlightRef.current = true;
      const myRequestId = reset ? ++requestIdRef.current : requestIdRef.current;
      if (reset) {
        cursorRef.current = null;
        seenIdsRef.current = new Set();
        setArticles([]);
        setHasMore(true);
        setError(null);
      }
      (reset ? setLoading : setLoadingMore)(true);
      fetchOnePage(reset, myRequestId, 0)
        .catch((e) => {
          if (requestIdRef.current === myRequestId) setError(e instanceof Error ? e.message : "failed to load feed");
        })
        .finally(() => {
          inFlightRef.current = false;
          setLoading(false);
          setLoadingMore(false);
        });
    },
    [fetchOnePage]
  );

  useEffect(() => {
    if (!enabled) return;
    runFetch(true);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [q, filter, enabled]);

  const loadMore = useCallback(() => {
    if (!hasMore || inFlightRef.current) return;
    runFetch(false);
  }, [hasMore, runFetch]);

  const refresh = useCallback(() => runFetch(true), [runFetch]);

  return { articles, loading, loadingMore, hasMore, error, loadMore, refresh };
}
