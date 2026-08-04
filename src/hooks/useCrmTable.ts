import { useCallback, useEffect, useMemo, useState } from "react";

/** Debounces a rapidly changing value (search boxes etc.). */
export function useDebouncedValue<T>(value: T, delay = 250): T {
  const [debounced, setDebounced] = useState(value);
  useEffect(() => {
    const t = setTimeout(() => setDebounced(value), delay);
    return () => clearTimeout(t);
  }, [value, delay]);
  return debounced;
}

export type SortState = { id: string; dir: "asc" | "desc" } | null;

/**
 * Shared search / filter / sort / pagination / selection state for CRM tables.
 * Filters are a plain record so each module declares its own keys.
 */
export function useCrmTable<F extends Record<string, string>>(initialFilters: F, pageSize = 10) {
  const [search, setSearch] = useState("");
  const [filters, setFiltersState] = useState<F>(initialFilters);
  const [sort, setSort] = useState<SortState>(null);
  const [page, setPage] = useState(0);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);

  const debouncedSearch = useDebouncedValue(search);

  const setFilter = useCallback((key: keyof F, value: string) => {
    setFiltersState((prev) => ({ ...prev, [key]: value }));
    setPage(0);
  }, []);

  const reset = useCallback(() => {
    setSearch("");
    setFiltersState(initialFilters);
    setSort(null);
    setPage(0);
    setSelectedIds([]);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const onSearchChange = useCallback((v: string) => {
    setSearch(v);
    setPage(0);
  }, []);

  const isDirty = useMemo(
    () => search !== "" || Object.keys(initialFilters).some((k) => filters[k] !== initialFilters[k]),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [search, filters],
  );

  return {
    search,
    debouncedSearch,
    setSearch: onSearchChange,
    filters,
    setFilter,
    sort,
    setSort,
    page,
    setPage,
    pageSize,
    selectedIds,
    setSelectedIds,
    reset,
    isDirty,
  };
}

/** Unique, sorted, non-empty values of a field — used to build filter options. */
export function useFacet<T>(rows: T[], pick: (row: T) => string | null | undefined) {
  return useMemo(
    () =>
      Array.from(
        new Set(rows.map(pick).filter((v): v is string => Boolean(v && v.trim()))),
      ).sort((a, b) => a.localeCompare(b)),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [rows],
  );
}

/** Slice rows for the current page, clamping the page index. */
export function paginate<T>(rows: T[], page: number, pageSize: number) {
  const pageCount = Math.max(1, Math.ceil(rows.length / pageSize));
  const current = Math.min(page, pageCount - 1);
  return { pageRows: rows.slice(current * pageSize, current * pageSize + pageSize), current, pageCount };
}
