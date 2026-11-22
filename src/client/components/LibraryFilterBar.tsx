import React from 'react';
import { Search, X } from 'lucide-react';

export interface SortChoice<T extends string> {
  id: T;
  label: string;
}

interface LibraryFilterBarProps<T extends string> {
  filter: string;
  onFilterChange: (value: string) => void;
  placeholder: string;
  sort: T;
  sortOptions: SortChoice<T>[];
  onSortChange: (value: T) => void;
}

/**
 * Shared search + sort bar for library collection grids (Albums, Artists).
 */
export function LibraryFilterBar<T extends string>({
  filter,
  onFilterChange,
  placeholder,
  sort,
  sortOptions,
  onSortChange,
}: LibraryFilterBarProps<T>) {
  return (
    <div className="flex flex-wrap items-center justify-between gap-3 mb-6">
      <div className="relative w-full sm:w-64">
        <Search className="w-4 h-4 text-ink-3 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
        <input
          type="text"
          value={filter}
          onChange={(e) => onFilterChange(e.target.value)}
          placeholder={placeholder}
          aria-label={placeholder}
          className="w-full h-9 pl-9 pr-8 text-sm bg-raised hover:bg-hover focus:bg-hover rounded-md text-ink placeholder:text-ink-3 transition-colors focus:ring-1 focus:ring-ink-2"
        />
        {filter && (
          <button
            type="button"
            onClick={() => onFilterChange('')}
            aria-label="Clear filter"
            className="absolute right-2 top-1/2 -translate-y-1/2 w-6 h-6 flex items-center justify-center rounded-full text-ink-3 hover:text-ink"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        )}
      </div>

      <div className="h-9 flex items-center gap-1 p-1 rounded-md bg-raised">
        {sortOptions.map((opt) => (
          <button
            key={opt.id}
            type="button"
            onClick={() => onSortChange(opt.id)}
            className={`h-7 px-2.5 rounded-sm text-xs font-medium transition-colors ${
              sort === opt.id ? 'bg-hover text-ink' : 'text-ink-2 hover:text-ink'
            }`}
          >
            {opt.label}
          </button>
        ))}
      </div>
    </div>
  );
}
