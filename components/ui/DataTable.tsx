"use client";
import { useMemo, useState } from "react";
import { ChevronUp, ChevronDown } from "lucide-react";
import { cn } from "@/lib/utils";

export interface Column<T> {
  key: string;
  header: string;
  render: (row: T) => React.ReactNode;
  sortValue?: (row: T) => string | number;
  className?: string;
}

interface DataTableProps<T> {
  columns: Column<T>[];
  rows: T[];
  rowKey: (row: T) => string;
  onRowClick?: (row: T) => void;
  emptyState?: React.ReactNode;
  flashRowKeys?: Set<string>;
  /** Renders a card instead of a table row below this breakpoint (mobile). */
  mobileCard?: (row: T) => React.ReactNode;
}

export function DataTable<T>({
  columns,
  rows,
  rowKey,
  onRowClick,
  emptyState,
  flashRowKeys,
  mobileCard,
}: DataTableProps<T>) {
  const [sortKey, setSortKey] = useState<string | null>(null);
  const [sortDir, setSortDir] = useState<"asc" | "desc">("asc");

  const sortedRows = useMemo(() => {
    if (!sortKey) return rows;
    const col = columns.find((c) => c.key === sortKey);
    if (!col?.sortValue) return rows;
    const sorted = [...rows].sort((a, b) => {
      const av = col.sortValue!(a);
      const bv = col.sortValue!(b);
      if (av < bv) return -1;
      if (av > bv) return 1;
      return 0;
    });
    return sortDir === "asc" ? sorted : sorted.reverse();
  }, [rows, sortKey, sortDir, columns]);

  function handleSortClick(col: Column<T>) {
    if (!col.sortValue) return;
    if (sortKey === col.key) {
      setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    } else {
      setSortKey(col.key);
      setSortDir("asc");
    }
  }

  if (rows.length === 0) {
    return <div className="py-12 text-center text-sm text-text-secondary">{emptyState ?? "No data."}</div>;
  }

  return (
    <>
      {mobileCard && (
        <div className="flex flex-col gap-2 md:hidden">
          {sortedRows.map((row) => (
            <div key={rowKey(row)} onClick={() => onRowClick?.(row)}>
              {mobileCard(row)}
            </div>
          ))}
        </div>
      )}

      <div className={cn("overflow-x-auto rounded-xl border border-border", mobileCard && "hidden md:block")}>
        <table className="w-full text-sm">
          <thead className="sticky top-0 bg-bg">
            <tr>
              {columns.map((col) => (
                <th
                  key={col.key}
                  onClick={() => handleSortClick(col)}
                  className={cn(
                    "px-4 py-3 text-left font-semibold text-text-secondary",
                    col.sortValue && "cursor-pointer select-none hover:text-text-primary"
                  )}
                >
                  <span className="inline-flex items-center gap-1">
                    {col.header}
                    {col.sortValue && sortKey === col.key && (
                      sortDir === "asc" ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />
                    )}
                  </span>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {sortedRows.map((row, i) => (
              <tr
                key={rowKey(row)}
                onClick={() => onRowClick?.(row)}
                className={cn(
                  i % 2 === 1 && "bg-bg/50",
                  onRowClick && "cursor-pointer hover:bg-bg",
                  flashRowKeys?.has(rowKey(row)) && "pl-row-flash"
                )}
              >
                {columns.map((col) => (
                  <td key={col.key} className={cn("px-4 py-3", col.className)}>
                    {col.render(row)}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </>
  );
}
