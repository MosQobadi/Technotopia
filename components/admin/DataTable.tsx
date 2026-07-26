"use client";

import { useEffect, useRef, useState, type Key, type ReactNode } from "react";
import {
  Chip,
  ListBox,
  ListBoxItem,
  Pagination,
  SearchField,
  Select,
  Table,
} from "@heroui/react";

export interface DataTableColumn<T> {
  key: keyof T & string;
  label: string;
  render?: (row: T) => ReactNode;
}

export interface DataTableFilterOption {
  label: string;
  value: string;
}

export interface DataTableFilter {
  label: string;
  value: string;
  options: DataTableFilterOption[];
  onChange: (value: string) => void;
}

export interface DataTableProps<T extends { id: string }> {
  columns: DataTableColumn<T>[];
  rows: T[];
  searchPlaceholder?: string;
  onSearch?: (query: string) => void;
  searchDebounceMs?: number;
  filters?: DataTableFilter[];
  page: number;
  pageSize: number;
  total: number;
  onPageChange: (page: number) => void;
  emptyMessage?: string;
  /** Accessible name for the table; not visible on screen. */
  "aria-label": string;
}

const STATUS_PILL_COLOR: Record<string, "success" | "danger" | "warning" | "accent"> = {
  active: "success",
  instock: "success",
  delivered: "success",
  paid: "success",
  inactive: "danger",
  outofstock: "danger",
  cancelled: "danger",
  pending: "warning",
  lowstock: "warning",
  sending: "accent",
  sent: "accent",
};

function normalizeStatus(value: string) {
  return value.toLowerCase().replace(/[\s_-]/g, "");
}

export function StatusPill({ value }: { value: string }) {
  const color = STATUS_PILL_COLOR[normalizeStatus(value)] ?? "default";
  return (
    <Chip color={color} variant="soft" size="sm">
      {value}
    </Chip>
  );
}

const ALL_FILTER_VALUE = "__all__";

function DataTableFilterSelect({ filter }: { filter: DataTableFilter }) {
  return (
    <Select
      value={filter.value === "" ? ALL_FILTER_VALUE : filter.value}
      onChange={(key: Key | null) => {
        const next = key === null || key === ALL_FILTER_VALUE ? "" : String(key);
        filter.onChange(next);
      }}
      aria-label={filter.label}
    >
      <Select.Trigger>
        <Select.Value />
        <Select.Indicator />
      </Select.Trigger>
      <Select.Popover>
        <ListBox>
          <ListBoxItem id={ALL_FILTER_VALUE}>{filter.label}</ListBoxItem>
          {filter.options.map((option) => (
            <ListBoxItem key={option.value} id={option.value}>
              {option.label}
            </ListBoxItem>
          ))}
        </ListBox>
      </Select.Popover>
    </Select>
  );
}

export function DataTable<T extends { id: string }>({
  columns,
  rows,
  searchPlaceholder = "Search...",
  onSearch,
  searchDebounceMs = 300,
  filters,
  page,
  pageSize,
  total,
  onPageChange,
  emptyMessage = "No results found.",
  "aria-label": ariaLabel,
}: DataTableProps<T>) {
  const [searchValue, setSearchValue] = useState("");
  const debounceRef = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);

  useEffect(() => {
    return () => clearTimeout(debounceRef.current);
  }, []);

  function handleSearchChange(value: string) {
    setSearchValue(value);
    if (!onSearch) return;
    clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => onSearch(value), searchDebounceMs);
  }

  const totalPages = Math.max(1, Math.ceil(total / pageSize));
  const rangeStart = total === 0 ? 0 : (page - 1) * pageSize + 1;
  const rangeEnd = Math.min(page * pageSize, total);

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-center gap-3">
        {onSearch && (
          <SearchField
            value={searchValue}
            onChange={handleSearchChange}
            aria-label="Search"
            className="max-w-xs flex-1"
          >
            <SearchField.Group>
              <SearchField.SearchIcon />
              <SearchField.Input placeholder={searchPlaceholder} />
              <SearchField.ClearButton />
            </SearchField.Group>
          </SearchField>
        )}
        {filters?.map((filter) => <DataTableFilterSelect key={filter.label} filter={filter} />)}
      </div>

      <Table.Root>
        <Table.ScrollContainer>
          <Table.Content aria-label={ariaLabel}>
            <Table.Header columns={columns}>
              {(column) => (
                <Table.Column key={column.key} isRowHeader={column.key === columns[0]?.key}>
                  {column.label}
                </Table.Column>
              )}
            </Table.Header>
            <Table.Body items={rows} renderEmptyState={() => emptyMessage}>
              {(row) => (
                <Table.Row key={row.id} columns={columns}>
                  {(column) => (
                    <Table.Cell key={column.key}>
                      {column.render ? column.render(row) : String(row[column.key] ?? "")}
                    </Table.Cell>
                  )}
                </Table.Row>
              )}
            </Table.Body>
          </Table.Content>
        </Table.ScrollContainer>
      </Table.Root>

      <div className="flex items-center justify-between">
        <Pagination.Summary className="text-muted text-sm">
          {total === 0 ? "0 results" : `${rangeStart}-${rangeEnd} of ${total}`}
        </Pagination.Summary>
        <Pagination>
          <Pagination.Content>
            <Pagination.Item>
              <Pagination.Previous
                isDisabled={page <= 1}
                onPress={() => onPageChange(page - 1)}
              >
                <Pagination.PreviousIcon />
                Previous
              </Pagination.Previous>
            </Pagination.Item>
            <Pagination.Item>
              <span className="text-muted px-2 text-sm">
                Page {page} of {totalPages}
              </span>
            </Pagination.Item>
            <Pagination.Item>
              <Pagination.Next isDisabled={page >= totalPages} onPress={() => onPageChange(page + 1)}>
                Next
                <Pagination.NextIcon />
              </Pagination.Next>
            </Pagination.Item>
          </Pagination.Content>
        </Pagination>
      </div>
    </div>
  );
}
