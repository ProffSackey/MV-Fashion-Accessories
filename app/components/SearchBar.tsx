"use client";

import { useEffect, useRef, useState } from "react";
import { MagnifyingGlassIcon, ChevronDownIcon } from "@heroicons/react/24/outline";
import { useRouter } from "next/navigation";

interface Props {
  categories?: string[];
}

export default function SearchBar({ categories = [] }: Props) {
  const router = useRouter();
  const [query, setQuery] = useState("");
  const [selected, setSelected] = useState<string>("All Categories");
  const [open, setOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement | null>(null);
  const canSearch = query.trim().length > 0 || selected !== "All Categories";

  useEffect(() => {
    const onDoc = (e: MouseEvent) => {
      if (!containerRef.current) return;
      if (!containerRef.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("click", onDoc);
    return () => document.removeEventListener("click", onDoc);
  }, []);

  const handleSelect = (cat: string) => {
    setSelected(cat);
    setOpen(false);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!canSearch) return;

    const params = new URLSearchParams();
    if (query.trim()) params.set("q", query.trim());
    if (selected && selected !== "All Categories") params.set("category", selected);
    const href = `/search${params.toString() ? `?${params.toString()}` : ""}`;
    router.push(href);
  };

  return (
    <div className="hidden sm:flex flex-1 min-w-0 justify-center text-gray-600 mx-4 lg:mx-6">
      <form onSubmit={handleSubmit} className="w-full max-w-xl min-w-0">
        <div ref={containerRef} className="relative">
          <div className="flex items-center bg-white border border-gray-300 rounded-full overflow-hidden h-11 shadow-sm focus-within:border-yellow-500 focus-within:ring-2 focus-within:ring-yellow-100 transition">
            <button
              type="button"
              onClick={() => setOpen(!open)}
              aria-haspopup="listbox"
              className="flex items-center gap-2 px-4 h-full bg-gray-50 text-gray-700 hover:bg-gray-100 transition whitespace-nowrap border-r border-gray-200"
            >
              <svg className="h-4 w-4 text-yellow-700" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
                <rect x="3" y="3" width="8" height="8" rx="1" />
                <rect x="13" y="3" width="8" height="8" rx="1" />
                <rect x="3" y="13" width="8" height="8" rx="1" />
                <rect x="13" y="13" width="8" height="8" rx="1" />
              </svg>
              <span className="hidden md:inline text-sm font-medium">{selected}</span>
              <ChevronDownIcon className="h-4 w-4 text-gray-500" />
            </button>

            <div className="flex items-center flex-grow h-full">
              <input
                type="text"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Search products..."
                aria-label="Search products"
                className="flex-grow h-full px-4 text-sm text-gray-900 placeholder-gray-400 focus:outline-none bg-transparent"
              />

              <button
                type="submit"
                aria-label="Search"
                disabled={!canSearch}
                className="flex items-center justify-center h-9 w-9 mr-1.5 bg-gray-900 text-white rounded-full hover:bg-gray-800 transition disabled:cursor-not-allowed disabled:bg-gray-200 disabled:text-gray-400"
              >
                <MagnifyingGlassIcon className="h-4 w-4" />
              </button>
            </div>
          </div>

          {open && (
            <div role="listbox" className="absolute left-0 mt-2 w-64 bg-white border border-gray-200 rounded-lg shadow-lg z-50">
              <button type="button" onClick={() => handleSelect('All Categories')} className={`w-full text-left px-4 py-2 hover:bg-gray-50 ${selected === 'All Categories' ? 'font-semibold bg-gray-50' : ''}`}>All Categories</button>
              {categories.map((c) => (
                <button key={c} type="button" onClick={() => handleSelect(c)} className={`w-full text-left px-4 py-2 hover:bg-gray-50 ${selected === c ? 'font-semibold bg-gray-50' : ''}`}>
                  {c}
                </button>
              ))}
            </div>
          )}
        </div>
      </form>
    </div>
  );
}
