import React from 'react';
import { Search, X } from 'lucide-react';

export default function RefSearchBar({ value, onChange, placeholder = 'Search' }) {
  return (
    <div className="relative">
      <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground pointer-events-none" />
      <input
        type="text"
        value={value}
        onChange={e => onChange(e.target.value)}
        placeholder={placeholder}
        className="w-full h-9 pl-9 pr-8 rounded-md border border-input bg-card text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring"
      />
      {value && (
        <button onClick={() => onChange('')} aria-label="Clear search"
          className="touch-compact absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground">
          <X className="w-3.5 h-3.5" />
        </button>
      )}
    </div>
  );
}
