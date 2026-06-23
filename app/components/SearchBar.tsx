"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { ChevronDownIcon, MagnifyingGlassIcon } from "@heroicons/react/24/outline";

type ProductSearchItem = {
  id: string;
  name: string;
  price?: string;
  category?: string;
  image_url?: string;
  about?: string;
  description?: string;
};

interface Props {
  categories?: string[];
  variant?: "desktop" | "mobile";
  onNavigate?: () => void;
}

const normalize = (value?: string) => (value || "").trim().toLowerCase();

export default function SearchBar({ categories = [], variant = "desktop", onNavigate }: Props) {
  const [query, setQuery] = useState("");
  const [selected, setSelected] = useState("All Categories");
  const [categoryOpen, setCategoryOpen] = useState(false);
  const [resultsOpen, setResultsOpen] = useState(false);
  const [products, setProducts] = useState<ProductSearchItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const containerRef = useRef<HTMLDivElement | null>(null);

  const isMobile = variant === "mobile";
  const hasSearchIntent = query.trim().length > 0 || selected !== "All Categories";

  useEffect(() => {
    const onDoc = (e: MouseEvent) => {
      if (!containerRef.current) return;
      if (!containerRef.current.contains(e.target as Node)) {
        setCategoryOpen(false);
        setResultsOpen(false);
      }
    };

    document.addEventListener("click", onDoc);
    return () => document.removeEventListener("click", onDoc);
  }, []);

  useEffect(() => {
    let mounted = true;

    const loadProducts = async () => {
      setLoading(true);
      setError(null);

      try {
        const res = await fetch("/api/admin/products", { cache: "no-store" });
        if (!res.ok) throw new Error("Could not load products");
        const data = await res.json();
        if (mounted) setProducts(Array.isArray(data) ? data : []);
      } catch (err) {
        if (mounted) setError(err instanceof Error ? err.message : "Could not load products");
      } finally {
        if (mounted) setLoading(false);
      }
    };

    loadProducts();

    return () => {
      mounted = false;
    };
  }, []);

  const filteredProducts = useMemo(() => {
    const search = normalize(query);
    const category = selected === "All Categories" ? "" : normalize(selected);

    return products
      .filter((product) => {
        const matchesCategory = !category || normalize(product.category) === category;
        if (!matchesCategory) return false;

        if (!search) return true;

        const searchable = [
          product.name,
          product.category,
          product.about,
          product.description,
        ]
          .map(normalize)
          .join(" ");

        return searchable.includes(search);
      })
      .slice(0, 8);
  }, [products, query, selected]);

  const handleSelect = (cat: string) => {
    setSelected(cat);
    setCategoryOpen(false);
    setResultsOpen(true);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setResultsOpen(true);
  };

  const wrapperClass = isMobile
    ? "flex-1 min-w-0 text-gray-600"
    : "hidden min-w-0 flex-1 justify-center text-gray-600 sm:flex mx-4 lg:mx-6";

  return (
    <div className={wrapperClass}>
      <form onSubmit={handleSubmit} className="w-full max-w-xl min-w-0">
        <div ref={containerRef} className="relative">
          <div className="flex h-11 items-center overflow-hidden rounded-full border border-gray-300 bg-white shadow-sm transition focus-within:border-yellow-500 focus-within:ring-2 focus-within:ring-yellow-100">
            <button
              type="button"
              onClick={() => setCategoryOpen((value) => !value)}
              aria-haspopup="listbox"
              aria-expanded={categoryOpen}
              className="flex h-full max-w-[44%] items-center gap-2 border-r border-gray-200 bg-gray-50 px-3 text-gray-700 transition hover:bg-gray-100 sm:max-w-none sm:px-4"
            >
              <span className="grid h-4 w-4 flex-none grid-cols-2 gap-0.5 text-yellow-700" aria-hidden="true">
                <span className="rounded-[1px] bg-current" />
                <span className="rounded-[1px] bg-current" />
                <span className="rounded-[1px] bg-current" />
                <span className="rounded-[1px] bg-current" />
              </span>
              <span className="min-w-0 truncate text-xs font-medium sm:text-sm">{selected}</span>
              <ChevronDownIcon className="h-4 w-4 flex-none text-gray-500" />
            </button>

            <div className="flex h-full min-w-0 flex-1 items-center">
              <input
                type="search"
                value={query}
                onChange={(e) => {
                  setQuery(e.target.value);
                  setResultsOpen(true);
                }}
                onFocus={() => setResultsOpen(true)}
                placeholder="Search products..."
                aria-label="Search products"
                className="h-full min-w-0 flex-1 bg-transparent px-3 text-sm text-gray-900 placeholder-gray-400 focus:outline-none sm:px-4"
              />

              <button
                type="submit"
                aria-label="Search products"
                className="mr-1.5 flex h-9 w-9 flex-none items-center justify-center rounded-full bg-gray-900 text-white transition hover:bg-gray-800"
              >
                <MagnifyingGlassIcon className="h-4 w-4" />
              </button>
            </div>
          </div>

          {categoryOpen && (
            <div role="listbox" className="absolute left-0 z-50 mt-2 max-h-72 w-64 overflow-auto rounded-lg border border-gray-200 bg-white py-1 shadow-lg">
              <button
                type="button"
                onClick={() => handleSelect("All Categories")}
                className={`w-full px-4 py-2 text-left text-sm hover:bg-gray-50 ${selected === "All Categories" ? "bg-gray-50 font-semibold" : ""}`}
              >
                All Categories
              </button>
              {categories.map((category) => (
                <button
                  key={category}
                  type="button"
                  onClick={() => handleSelect(category)}
                  className={`w-full px-4 py-2 text-left text-sm hover:bg-gray-50 ${selected === category ? "bg-gray-50 font-semibold" : ""}`}
                >
                  {category}
                </button>
              ))}
            </div>
          )}

          {resultsOpen && hasSearchIntent && (
            <div className="absolute left-0 right-0 z-40 mt-2 overflow-hidden rounded-lg border border-gray-200 bg-white shadow-xl">
              <div className="max-h-96 overflow-auto py-2">
                {loading && <p className="px-4 py-3 text-sm text-gray-500">Searching products...</p>}
                {!loading && error && <p className="px-4 py-3 text-sm text-red-600">{error}</p>}
                {!loading && !error && filteredProducts.length === 0 && (
                  <p className="px-4 py-3 text-sm text-gray-500">No matching products found.</p>
                )}
                {!loading && !error && filteredProducts.map((product) => (
                  <Link
                    key={product.id}
                    href={`/products/${product.id}`}
                    onClick={() => {
                      setResultsOpen(false);
                      onNavigate?.();
                    }}
                    className="flex items-center gap-3 px-4 py-3 transition hover:bg-yellow-50"
                  >
                    <div className="h-12 w-12 flex-none overflow-hidden rounded-md bg-gray-100">
                      {product.image_url ? (
                        <img src={product.image_url} alt={product.name} className="h-full w-full object-cover" />
                      ) : (
                        <div className="flex h-full w-full items-center justify-center text-xs font-semibold text-gray-400">MV</div>
                      )}
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-semibold text-gray-900">{product.name}</p>
                      <p className="mt-0.5 truncate text-xs text-gray-500">{product.category || "Uncategorized"}</p>
                    </div>
                    {product.price && <span className="flex-none text-xs font-semibold text-yellow-700">{product.price}</span>}
                  </Link>
                ))}
              </div>
            </div>
          )}
        </div>
      </form>
    </div>
  );
}
