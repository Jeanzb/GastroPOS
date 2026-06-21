import { useState } from 'react';
import {
  type ColumnDef,
  type OnChangeFn,
  type RowData,
  type SortingState,
  flexRender,
  getCoreRowModel,
  getSortedRowModel,
  useReactTable,
} from '@tanstack/react-table';
import { ArrowDown, ArrowUp, ChevronLeft, ChevronRight, ChevronsUpDown } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { cn } from '@/lib/utils';

declare module '@tanstack/react-table' {
  interface ColumnMeta<TData extends RowData, TValue> {
    headClassName?: string;
    cellClassName?: string;
  }
}

export interface DataTablePagination {
  /** Zero-based current page index. */
  pageIndex: number;
  pageCount: number;
  total: number;
  pageSize: number;
  onPageChange: (pageIndex: number) => void;
}

interface DataTableProps<TData, TValue> {
  columns: ColumnDef<TData, TValue>[];
  data: TData[];
  isLoading?: boolean;
  emptyMessage?: string;
  pagination?: DataTablePagination;
  sorting?: SortingState;
  onSortingChange?: OnChangeFn<SortingState>;
  manualSorting?: boolean;
}

const HEADER = 'text-[10.5px] font-bold uppercase tracking-[0.06em] text-[#9A9286]';

export function DataTable<TData, TValue>({
  columns,
  data,
  isLoading = false,
  emptyMessage = 'Sin resultados.',
  pagination,
  sorting,
  onSortingChange,
  manualSorting = false,
}: DataTableProps<TData, TValue>) {
  const [internalSorting, setInternalSorting] = useState<SortingState>([]);
  const activeSorting = sorting ?? internalSorting;

  const table = useReactTable({
    data,
    columns,
    state: { sorting: activeSorting },
    onSortingChange: onSortingChange ?? setInternalSorting,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: manualSorting ? undefined : getSortedRowModel(),
    manualPagination: true,
    manualSorting,
    pageCount: pagination?.pageCount ?? -1,
  });

  const rows = table.getRowModel().rows;

  return (
    <div className="overflow-hidden rounded-2xl border border-border bg-card">
      <Table>
        <TableHeader>
          {table.getHeaderGroups().map((headerGroup) => (
            <TableRow
              key={headerGroup.id}
              className="border-b border-border bg-surface-quiet/60 hover:bg-surface-quiet/60"
            >
              {headerGroup.headers.map((header) => {
                const canSort = header.column.getCanSort();
                const sorted = header.column.getIsSorted();
                const ariaSort =
                  sorted === 'asc' ? 'ascending' : sorted === 'desc' ? 'descending' : 'none';

                return (
                  <TableHead
                    key={header.id}
                    aria-sort={canSort ? ariaSort : undefined}
                    className={cn(
                      'h-11 px-[18px]',
                      HEADER,
                      header.column.columnDef.meta?.headClassName,
                    )}
                  >
                    {header.isPlaceholder ? null : canSort ? (
                      <button
                        type="button"
                        onClick={header.column.getToggleSortingHandler()}
                        aria-label={`Ordenar por ${String(header.column.columnDef.header)}`}
                        className="inline-flex items-center gap-1 uppercase tracking-[0.06em] transition-colors hover:text-foreground"
                      >
                        {flexRender(header.column.columnDef.header, header.getContext())}
                        {sorted === 'asc' ? (
                          <ArrowUp className="size-3" />
                        ) : sorted === 'desc' ? (
                          <ArrowDown className="size-3" />
                        ) : (
                          <ChevronsUpDown className="size-3 opacity-50" />
                        )}
                      </button>
                    ) : (
                      flexRender(header.column.columnDef.header, header.getContext())
                    )}
                  </TableHead>
                );
              })}
            </TableRow>
          ))}
        </TableHeader>
        <TableBody>
          {isLoading
            ? Array.from({ length: pagination?.pageSize ?? 8 }, (_, index) => (
                <TableRow key={`skeleton-${index}`} className="border-b border-[#F2ECE3]">
                  <TableCell colSpan={columns.length} className="px-[18px] py-[14px]">
                    <Skeleton className="h-5 w-full" />
                  </TableCell>
                </TableRow>
              ))
            : null}

          {!isLoading && rows.length === 0 ? (
            <TableRow>
              <TableCell
                colSpan={columns.length}
                className="px-[18px] py-12 text-center text-sm text-muted-foreground"
              >
                {emptyMessage}
              </TableCell>
            </TableRow>
          ) : null}

          {!isLoading
            ? rows.map((row) => (
                <TableRow
                  key={row.id}
                  className="border-b border-[#F2ECE3] hover:bg-surface-quiet/40"
                >
                  {row.getVisibleCells().map((cell) => (
                    <TableCell
                      key={cell.id}
                      className={cn(
                        'px-[18px] py-[13px]',
                        cell.column.columnDef.meta?.cellClassName,
                      )}
                    >
                      {flexRender(cell.column.columnDef.cell, cell.getContext())}
                    </TableCell>
                  ))}
                </TableRow>
              ))
            : null}
        </TableBody>
      </Table>

      {pagination ? (
        <div className="flex flex-wrap items-center justify-between gap-3 border-t border-border px-[18px] py-3">
          <p className="nums text-xs text-muted-foreground">
            {pagination.total === 0
              ? 'Sin registros'
              : `Pagina ${pagination.pageIndex + 1} de ${Math.max(1, pagination.pageCount)} - ${pagination.total} registros`}
          </p>
          <div className="flex items-center gap-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              disabled={pagination.pageIndex <= 0 || isLoading}
              onClick={() => pagination.onPageChange(pagination.pageIndex - 1)}
            >
              <ChevronLeft className="size-4" />
              Anterior
            </Button>
            <Button
              type="button"
              variant="outline"
              size="sm"
              disabled={pagination.pageIndex >= pagination.pageCount - 1 || isLoading}
              onClick={() => pagination.onPageChange(pagination.pageIndex + 1)}
            >
              Siguiente
              <ChevronRight className="size-4" />
            </Button>
          </div>
        </div>
      ) : null}
    </div>
  );
}
