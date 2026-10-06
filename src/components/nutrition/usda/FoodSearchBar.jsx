import React from 'react';
import { Search, X, Loader2 } from 'lucide-react';

export default function FoodSearchBar({ query, onChange, onClear, isSearching, placeholder = 'Search foods' }) {
  return (
    <div className="relative flex items-center">
      <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground pointer-events-none" />
      <input
        type="text"
        value={query}
        onChange={e => onChange(e.target.value)}
        placeholder={placeholder}
        className="w-full h-11 pl-10 pr-12 rounded-md border border-input bg-card text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring transition-shadow"
      />
      <div className="absolute right-2 flex items-center gap-1">
        {isSearching && <Loader2 className="w-4 h-4 text-muted-foreground animate-spin" />}
        {query && !isSearching && (
          <button onClick={onClear} className="w-7 h-7 flex items-center justify-center rounded-md hover:bg-accent transition-colors">
            <X className="w-3.5 h-3.5 text-muted-foreground" />
          </button>
        )}
      </div>
      {isSearching && (
        <p className="absolute -bottom-5 left-0 text-xs text-muted-foreground">Searching</p>
      )}
    </div>
  );
}