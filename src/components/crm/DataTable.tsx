import { Fragment, type ReactNode } from "react";
import { ArrowDown, ArrowUp, ChevronsUpDown } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { EmptyState, LoadingSkeleton } from "@/components/crm/CrmPrimitives";
import { cn } from "@/lib/utils";

export type DataTableColumn<T> = {
  id: string;
  header: ReactNode;
  cell: (row: T) => ReactNode;
  /** Value used for client-side sorting; omit to disable sorting on this column. */
  sortValue?: (row: T) => string | number;
  align?: "left" | "right";
  className?: string;
  headClassName?: string;
};

export type SortState = { id: string; dir: "asc" | "desc" } | null;

export function sortRows<T>(rows: T[], columns: DataTableColumn<T>[], sort: SortState): T[] {
  if (!sort) return rows;
  const col = columns.find((c) => c.id === sort.id);
  if (!col?.sortValue) return rows;
  const factor = sort.dir === "asc" ? 1 : -1;
  return [...rows].sort((a, b) => {
    const av = col.sortValue!(a);
    const bv = col.sortValue!(b);
    if (typeof av === "number" && typeof bv === "number") return (av - bv) * factor;
    return String(av).localeCompare(String(bv)) * factor;
  });
}

export function toggleSort(current: SortState, id: string): SortState {
  if (current?.id !== id) return { id, dir: "asc" };
  if (current.dir === "asc") return { id, dir: "desc" };
  return null;
}

export function DataTable<T>({
  rows,
  columns,
  getRowId,
  isLoading,
  onRowClick,
  sort,
  onSortChange,
  selectedIds,
  onSelectionChange,
  emptyTitle = "Nothing to show",
  emptyDescription = "Try a different search or filter.",
  emptyAction,
  page,
  pageSize = 10,
  totalCount,
  onPageChange,
}: {
  rows: T[];
  columns: DataTableColumn<T>[];
  getRowId: (row: T) => string;
  isLoading?: boolean;
  onRowClick?: (row: T) => void;
  sort?: SortState;
  onSortChange?: (s: SortState) => void;
  selectedIds?: string[];
  onSelectionChange?: (ids: string[]) => void;
  emptyTitle?: string;
  emptyDescription?: string;
  emptyAction?: ReactNode;
  page?: number;
  pageSize?: number;
  totalCount?: number;
  onPageChange?: (p: number) => void;
}) {
  if (isLoading) return <LoadingSkeleton variant="table" rows={pageSize > 8 ? 8 : pageSize} />;
  if (rows.length === 0)
    return <EmptyState title={emptyTitle} description={emptyDescription} action={emptyAction} />;

  const selectable = Boolean(selectedIds && onSelectionChange);
  const ids = rows.map(getRowId);
  const allSelected = selectable && ids.length > 0 && ids.every((id) => selectedIds!.includes(id));

  const total = totalCount ?? rows.length;
  const pageCount = Math.max(1, Math.ceil(total / pageSize));
  const showPager = page !== undefined && onPageChange !== undefined && total > pageSize;

  return (
    <div className="space-y-4">
      <div className="overflow-x-auto rounded-xl border border-border bg-card">
        <Table>
          <TableHeader>
            <TableRow>
              {selectable && (
                <TableHead className="w-10">
                  <Checkbox
                    checked={allSelected}
                    aria-label="Select all rows"
                    onCheckedChange={(v) =>
                      onSelectionChange!(
                        v
                          ? Array.from(new Set([...(selectedIds ?? []), ...ids]))
                          : (selectedIds ?? []).filter((id) => !ids.includes(id)),
                      )
                    }
                  />
                </TableHead>
              )}
              {columns.map((col) => {
                const sortable = Boolean(col.sortValue && onSortChange);
                const active = sort?.id === col.id;
                return (
                  <TableHead
                    key={col.id}
                    className={cn(col.align === "right" && "text-right", col.headClassName)}
                  >
                    {sortable ? (
                      <button
                        type="button"
                        className="inline-flex items-center gap-1 whitespace-nowrap hover:text-foreground"
                        onClick={() => onSortChange!(toggleSort(sort ?? null, col.id))}
                      >
                        {col.header}
                        {active ? (
                          sort!.dir === "asc" ? (
                            <ArrowUp className="h-3 w-3" />
                          ) : (
                            <ArrowDown className="h-3 w-3" />
                          )
                        ) : (
                          <ChevronsUpDown className="h-3 w-3 opacity-40" />
                        )}
                      </button>
                    ) : (
                      <span className="whitespace-nowrap">{col.header}</span>
                    )}
                  </TableHead>
                );
              })}
            </TableRow>
          </TableHeader>
          <TableBody>
            {rows.map((row) => {
              const id = getRowId(row);
              return (
                <TableRow
                  key={id}
                  className={cn(onRowClick && "cursor-pointer")}
                  tabIndex={onRowClick ? 0 : undefined}
                  onClick={onRowClick ? () => onRowClick(row) : undefined}
                  onKeyDown={
                    onRowClick
                      ? (e) => {
                          if (e.key === "Enter") onRowClick(row);
                        }
                      : undefined
                  }
                >
                  {selectable && (
                    <TableCell onClick={(e) => e.stopPropagation()}>
                      <Checkbox
                        checked={selectedIds!.includes(id)}
                        aria-label="Select row"
                        onCheckedChange={(v) =>
                          onSelectionChange!(
                            v
                              ? [...selectedIds!, id]
                              : selectedIds!.filter((x) => x !== id),
                          )
                        }
                      />
                    </TableCell>
                  )}
                  {columns.map((col) => (
                    <TableCell
                      key={col.id}
                      className={cn(col.align === "right" && "text-right", col.className)}
                    >
                      {col.cell(row)}
                    </TableCell>
                  ))}
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </div>

      {showPager && (
        <div className="flex flex-wrap items-center justify-between gap-3 text-sm text-muted-foreground">
          <span>
            Showing {page! * pageSize + 1}–{Math.min(total, (page! + 1) * pageSize)} of {total}
          </span>
          <div className="flex items-center gap-2">
            <Button
              size="sm"
              variant="outline"
              disabled={page === 0}
              onClick={() => onPageChange!(page! - 1)}
            >
              Previous
            </Button>
            <span>
              Page {page! + 1} of {pageCount}
            </span>
            <Button
              size="sm"
              variant="outline"
              disabled={page! + 1 >= pageCount}
              onClick={() => onPageChange!(page! + 1)}
            >
              Next
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}

export const Cell = Fragment;
