"use client";

import React, { useState } from 'react';
import { Button } from './Button';
import { Badge } from './Badge';
import { 
  ChevronLeft, 
  ChevronRight, 
  ChevronsLeft, 
  ChevronsRight,
  ArrowUp,
  ArrowDown,
  Search,
  Filter,
  Download
} from 'lucide-react';

export interface Column<T> {
  key: string;
  label: string;
  sortable?: boolean;
  render?: (value: any, row: T) => React.ReactNode;
  width?: string;
}

export interface DataTableProps<T> {
  data: T[];
  columns: Column<T>[];
  loading?: boolean;
  pagination?: {
    page: number;
    pageSize: number;
    total: number;
    onPageChange: (page: number) => void;
    onPageSizeChange: (pageSize: number) => void;
  };
  sorting?: {
    column: string | null;
    direction: 'asc' | 'desc';
    onSort: (column: string) => void;
  };
  selection?: {
    selectedRows: Set<string>;
    onSelectRow: (id: string) => void;
    onSelectAll: () => void;
    getRowId: (row: T) => string;
  };
  onRowClick?: (row: T) => void;
  emptyMessage?: string;
  actions?: React.ReactNode;
}

export function DataTable<T extends Record<string, any>>({
  data,
  columns,
  loading = false,
  pagination,
  sorting,
  selection,
  onRowClick,
  emptyMessage = 'No data available',
  actions
}: DataTableProps<T>) {
  const [searchQuery, setSearchQuery] = useState('');

  const filteredData = searchQuery
    ? data.filter(row =>
        Object.values(row).some(value =>
          String(value).toLowerCase().includes(searchQuery.toLowerCase())
        )
      )
    : data;

  const totalPages = pagination ? Math.ceil(pagination.total / pagination.pageSize) : 1;

  return (
    <div className="space-y-4">
      {/* Table Controls */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <input
              type="text"
              placeholder="Search..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10 pr-4 py-2 bg-card border border-border rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-nexora-primary"
            />
          </div>
          {selection && selection.selectedRows.size > 0 && (
            <Badge className="bg-nexora-primary/10 text-nexora-primary">
              {selection.selectedRows.size} selected
            </Badge>
          )}
        </div>
        <div className="flex items-center gap-2">
          {actions}
          <Button variant="outline" size="sm">
            <Filter className="h-4 w-4 mr-2" />
            Filter
          </Button>
          <Button variant="outline" size="sm">
            <Download className="h-4 w-4 mr-2" />
            Export
          </Button>
        </div>
      </div>

      {/* Table */}
      <div className="border border-border rounded-lg overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-bg-elevated border-b border-border">
              <tr>
                {selection && (
                  <th className="px-4 py-3 text-left w-12">
                    <input
                      type="checkbox"
                      checked={selection.selectedRows.size === data.length && data.length > 0}
                      onChange={selection.onSelectAll}
                      className="w-4 h-4 rounded border-border"
                    />
                  </th>
                )}
                {columns.map((column) => (
                  <th
                    key={column.key}
                    className={`px-4 py-3 text-left text-sm font-semibold text-foreground ${
                      column.width || ''
                    }`}
                  >
                    {column.sortable && sorting ? (
                      <button
                        onClick={() => sorting.onSort(column.key)}
                        className="flex items-center gap-2 hover:text-nexora-primary transition-colors"
                      >
                        {column.label}
                        {sorting.column === column.key && (
                          sorting.direction === 'asc' ? (
                            <ArrowUp className="h-4 w-4" />
                          ) : (
                            <ArrowDown className="h-4 w-4" />
                          )
                        )}
                      </button>
                    ) : (
                      column.label
                    )}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={columns.length + (selection ? 1 : 0)} className="px-4 py-8 text-center">
                    <div className="flex items-center justify-center">
                      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-nexora-primary"></div>
                    </div>
                  </td>
                </tr>
              ) : filteredData.length === 0 ? (
                <tr>
                  <td colSpan={columns.length + (selection ? 1 : 0)} className="px-4 py-8 text-center text-muted-foreground">
                    {emptyMessage}
                  </td>
                </tr>
              ) : (
                filteredData.map((row, rowIndex) => {
                  const rowId = selection ? selection.getRowId(row) : String(rowIndex);
                  const isSelected = selection?.selectedRows.has(rowId);

                  return (
                    <tr
                      key={rowId}
                      onClick={() => onRowClick?.(row)}
                      className={`
                        border-b border-border last:border-0
                        transition-all duration-200
                        ${onRowClick ? 'cursor-pointer' : ''}
                        ${isSelected ? 'bg-nexora-primary/5' : 'hover:bg-bg-elevated/50'}
                        group
                      `}
                    >
                      {selection && (
                        <td className="px-4 py-3">
                          <input
                            type="checkbox"
                            checked={isSelected}
                            onChange={(e) => {
                              e.stopPropagation();
                              selection.onSelectRow(rowId);
                            }}
                            className="w-4 h-4 rounded border-border"
                          />
                        </td>
                      )}
                      {columns.map((column) => (
                        <td key={column.key} className="px-4 py-3 text-sm text-foreground">
                          {column.render
                            ? column.render(row[column.key], row)
                            : String(row[column.key] || '-')}
                        </td>
                      ))}
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Pagination */}
      {pagination && (
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <span>Rows per page:</span>
            <select
              value={pagination.pageSize}
              onChange={(e) => pagination.onPageSizeChange(Number(e.target.value))}
              className="bg-card border border-border rounded-md px-2 py-1 text-sm"
            >
              <option value={10}>10</option>
              <option value={25}>25</option>
              <option value={50}>50</option>
              <option value={100}>100</option>
            </select>
            <span>
              Showing {Math.min((pagination.page - 1) * pagination.pageSize + 1, pagination.total)} to{' '}
              {Math.min(pagination.page * pagination.pageSize, pagination.total)} of {pagination.total}
            </span>
          </div>

          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => pagination.onPageChange(1)}
              disabled={pagination.page === 1}
            >
              <ChevronsLeft className="h-4 w-4" />
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => pagination.onPageChange(pagination.page - 1)}
              disabled={pagination.page === 1}
            >
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <span className="text-sm text-muted-foreground">
              Page {pagination.page} of {totalPages}
            </span>
            <Button
              variant="outline"
              size="sm"
              onClick={() => pagination.onPageChange(pagination.page + 1)}
              disabled={pagination.page === totalPages}
            >
              <ChevronRight className="h-4 w-4" />
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => pagination.onPageChange(totalPages)}
              disabled={pagination.page === totalPages}
            >
              <ChevronsRight className="h-4 w-4" />
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
