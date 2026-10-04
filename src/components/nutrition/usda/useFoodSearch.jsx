import { useState, useEffect, useRef } from 'react';
import { db } from '@/api/supabaseClient';
import { readSearchCache, writeSearchCache } from '@/lib/nutritionUtils';

export function useFoodSearch() {
  const [query, setQuery] = useState('');
  const [debouncedQuery, setDebouncedQuery] = useState('');
  const [results, setResults] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [hasError, setHasError] = useState(false);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const debounceRef = useRef(null);
  const PAGE_SIZE = 20;

  // Debounce
  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => setDebouncedQuery(query), 400);
    return () => clearTimeout(debounceRef.current);
  }, [query]);

  // Fetch
  useEffect(() => {
    setPage(1);
    if (debouncedQuery.length < 2) {
      setResults([]);
      setHasError(false);
      setTotal(0);
      return;
    }
    doSearch(debouncedQuery, 1);
   
  }, [debouncedQuery]);

  async function doSearch(q, pageNum) {
    const cacheKey = `${q.toLowerCase()}_${pageNum}`;
    const cached = readSearchCache()[cacheKey];
    if (cached) {
      if (pageNum === 1) setResults(cached.foods);
      else setResults(prev => [...prev, ...cached.foods]);
      setTotal(cached.total);
      return;
    }

    setIsLoading(true);
    setHasError(false);
    try {
      const res = await db.functions.invoke('searchFoods', {
        query: q,
        pageSize: PAGE_SIZE,
        dataType: 'Survey (FNDDS),SR Legacy,Foundation,Branded',
      });
      const raw = res.data?.foods || [];
      const foods = raw.map(f => ({
        id: f.usda_fdc_id,
        name: f.name,
        brand: f.brand || '',
        category: f.category || '',
        calories: f.calories || 0,
        protein: f.protein_g || 0,
        carbs: f.carbs_g || 0,
        fats: f.fats_g || 0,
        fiber: f.micronutrients?.fiber_g || 0,
        sugar: f.micronutrients?.sugar_g || 0,
        sodium: f.sodium_mg || 0,
        serving_size: f.serving_size || '100g',
        source: 'usda',
      }));
      const totalHits = res.data?.total || foods.length;
      writeSearchCache(cacheKey, { foods, total: totalHits });
      if (pageNum === 1) setResults(foods);
      else setResults(prev => [...prev, ...foods]);
      setTotal(totalHits);
    } catch {
      setHasError(true);
    } finally {
      setIsLoading(false);
    }
  }

  function loadMore() {
    const nextPage = page + 1;
    setPage(nextPage);
    doSearch(debouncedQuery, nextPage);
  }

  function clear() {
    setQuery('');
    setDebouncedQuery('');
    setResults([]);
    setHasError(false);
    setTotal(0);
    setPage(1);
  }

  return {
    query, setQuery, results, isLoading, hasError,
    total, hasMore: results.length < total, loadMore, clear,
    isSearching: query.length >= 2 && isLoading,
    showEmpty: debouncedQuery.length >= 2 && !isLoading && !hasError && results.length === 0,
  };
}