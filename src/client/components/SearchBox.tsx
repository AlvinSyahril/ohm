import React, { useEffect, useRef, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { Clock, Search, X } from 'lucide-react';
import { useShallow } from 'zustand/react/shallow';
import { usePlayerStore } from '../store/usePlayerStore';
import { popoverVariants } from '../utils/motion';

/**
 * Search with debounced typeahead, recent searches on empty focus,
 * full keyboard support and a "/" shortcut.
 */
export const SearchBox: React.FC = () => {
  const {
    searchQuery,
    performSearch,
    clearSearch,
    recentSearches,
    removeRecentSearch,
    clearRecentSearches,
  } = usePlayerStore(
    useShallow((s) => ({
      searchQuery: s.searchQuery,
      performSearch: s.performSearch,
      clearSearch: s.clearSearch,
      recentSearches: s.recentSearches,
      removeRecentSearch: s.removeRecentSearch,
      clearRecentSearches: s.clearRecentSearches,
    }))
  );

  const [input, setInput] = useState('');
  const [suggestions, setSuggestions] = useState<string[]>([]);
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(-1);
  const inputRef = useRef<HTMLInputElement>(null);
  const wrapRef = useRef<HTMLDivElement>(null);
  const committed = useRef('');

  // Keep the field in step with searches started elsewhere
  useEffect(() => {
    committed.current = searchQuery;
    setInput(searchQuery);
    setOpen(false);
  }, [searchQuery]);

  // Debounced, abortable suggestions
  useEffect(() => {
    const q = input.trim();
    if (q === committed.current.trim() || q.length < 2) {
      setSuggestions([]);
      return;
    }
    const ctrl = new AbortController();
    const timer = setTimeout(async () => {
      try {
        const res = await fetch(`/api/search/suggestions?q=${encodeURIComponent(q)}`, {
          signal: ctrl.signal,
        });
        if (!res.ok) return;
        const data = (await res.json()) as { suggestions?: string[] };
        setSuggestions(data.suggestions ?? []);
        setActive(-1);
        setOpen(true);
      } catch {
        // Aborted or offline: typeahead is a nicety, never an error
      }
    }, 200);
    return () => {
      clearTimeout(timer);
      ctrl.abort();
    };
  }, [input]);

  // Close on outside click
  useEffect(() => {
    const onDown = (e: MouseEvent) => {
      if (wrapRef.current && !wrapRef.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', onDown);
    return () => document.removeEventListener('mousedown', onDown);
  }, []);

  // "/" or Ctrl/Cmd+K focuses search from anywhere
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const tag = (e.target as HTMLElement)?.tagName;
      const isCtrlK = (e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k';
      if (isCtrlK) {
        e.preventDefault();
        inputRef.current?.focus();
        inputRef.current?.select();
        return;
      }
      if (
        e.key === '/' &&
        !e.shiftKey &&
        !e.ctrlKey &&
        !e.metaKey &&
        !e.altKey &&
        tag !== 'INPUT' &&
        tag !== 'TEXTAREA' &&
        tag !== 'SELECT'
      ) {
        e.preventDefault();
        inputRef.current?.focus();
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  const run = (q: string) => {
    const query = q.trim();
    if (!query) return;
    committed.current = query;
    setInput(query);
    setOpen(false);
    setSuggestions([]);
    performSearch(query);
  };

  const clear = () => {
    committed.current = '';
    setInput('');
    setSuggestions([]);
    if (searchQuery) clearSearch();
    inputRef.current?.focus();
  };

  const showingRecent = open && input.trim().length < 2 && recentSearches.length > 0;
  const showingSuggestions = open && suggestions.length > 0 && input.trim().length >= 2;
  const items = showingSuggestions ? suggestions : showingRecent ? recentSearches : [];
  const showList = items.length > 0;

  const onKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'ArrowDown' && items.length) {
      e.preventDefault();
      setOpen(true);
      setActive((i) => (i + 1) % items.length);
    } else if (e.key === 'ArrowUp' && items.length) {
      e.preventDefault();
      setActive((i) => (i <= 0 ? items.length - 1 : i - 1));
    } else if (e.key === 'Escape') {
      if (open) setOpen(false);
      else if (input) clear();
      else inputRef.current?.blur();
    }
  };

  return (
    <div ref={wrapRef} className="electron-no-drag relative w-full max-w-[420px]">
      <form
        role="search"
        onSubmit={(e) => {
          e.preventDefault();
          run(active >= 0 && items[active] ? items[active] : input);
        }}
        className="relative"
      >
        <Search className="w-5 h-5 text-ink-2 absolute left-4 top-1/2 -translate-y-1/2 pointer-events-none" />
        <input
          ref={inputRef}
          type="text"
          role="combobox"
          aria-expanded={showList}
          aria-controls="search-suggestions"
          aria-autocomplete="list"
          aria-activedescendant={active >= 0 ? `suggestion-${active}` : undefined}
          value={input}
          onChange={(e) => {
            setInput(e.target.value);
            setActive(-1);
            setOpen(true);
          }}
          onFocus={() => setOpen(true)}
          onKeyDown={onKeyDown}
          placeholder="Search songs, albums, artists..."
          aria-label="Search"
          className="w-full h-11 pl-12 pr-11 text-sm bg-raised hover:bg-hover focus:bg-hover rounded-full text-ink placeholder:text-ink-3 transition-[background-color,box-shadow] focus:ring-2 focus:ring-ink"
        />
        <AnimatePresence>
          {input ? (
            <motion.button
              type="button"
              onClick={clear}
              aria-label="Clear search"
              initial={{ opacity: 0, scale: 0.7 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.7 }}
              transition={{ duration: 0.14 }}
              className="absolute right-3 top-1/2 -translate-y-1/2 w-7 h-7 flex items-center justify-center rounded-full text-ink-2 hover:text-ink"
            >
              <X className="w-4 h-4" />
            </motion.button>
          ) : (
            <kbd
              aria-hidden
              className="hidden sm:inline-flex items-center justify-center px-1.5 h-5 text-[11px] font-medium text-ink-3 bg-surface border border-line rounded-sm absolute right-3.5 top-1/2 -translate-y-1/2 pointer-events-none"
            >
              /
            </kbd>
          )}
        </AnimatePresence>
      </form>

      <AnimatePresence>
        {showList && (
          <motion.ul
            id="search-suggestions"
            role="listbox"
            variants={popoverVariants}
            initial="hidden"
            animate="show"
            exit="exit"
            style={{ transformOrigin: 'top left' }}
            className="electron-no-drag absolute left-0 right-0 top-full mt-2 z-50 bg-raised border border-line rounded-lg p-1 shadow-2xl"
          >
            {showingRecent && (
              <li className="px-3 pt-1.5 pb-1 flex items-center justify-between text-xs font-medium text-ink-3">
                <span>Recent searches</span>
                <button
                  type="button"
                  onMouseDown={(e) => {
                    e.preventDefault();
                    clearRecentSearches();
                    setOpen(false);
                  }}
                  className="hover:text-ink transition-colors"
                >
                  Clear
                </button>
              </li>
            )}
            {items.map((s, i) => (
              <li
                key={s}
                id={`suggestion-${i}`}
                role="option"
                aria-selected={i === active}
                onMouseEnter={() => setActive(i)}
                onMouseDown={(e) => {
                  e.preventDefault();
                  run(s);
                }}
                className={`h-10 px-3 rounded-md flex items-center gap-3 text-sm cursor-pointer transition-colors ${
                  i === active ? 'bg-white/10 text-ink' : 'text-ink-2'
                }`}
              >
                {showingRecent ? (
                  <Clock className="w-4 h-4 shrink-0 text-ink-3" />
                ) : (
                  <Search className="w-4 h-4 shrink-0" />
                )}
                <span className="truncate flex-1">{s}</span>
                {showingRecent && (
                  <button
                    type="button"
                    aria-label={`Remove ${s} from recent searches`}
                    onMouseDown={(e) => {
                      e.preventDefault();
                      e.stopPropagation();
                      removeRecentSearch(s);
                    }}
                    className="w-6 h-6 rounded-full flex items-center justify-center text-ink-3 hover:text-ink"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                )}
              </li>
            ))}
          </motion.ul>
        )}
      </AnimatePresence>
    </div>
  );
};
