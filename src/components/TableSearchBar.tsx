'use client';

import { useState, type CSSProperties } from 'react';
import { FiSearch, FiX } from 'react-icons/fi';

interface TableSearchBarProps {
  onSearch?: (term: string) => void;
  value?: string;
  onChange?: (value: string) => void;
  placeholder?: string;
  className?: string;
}

export default function TableSearchBar({
  onSearch,
  value,
  onChange,
  placeholder = 'Search...',
  className = '',
}: TableSearchBarProps) {
  const isControlled = typeof value === 'string' && typeof onChange === 'function';
  const [searchTerm, setSearchTerm] = useState(value ?? '');
  const currentValue = isControlled ? value : searchTerm;

  const handleSearch = (value: string) => {
    if (isControlled) {
      onChange?.(value);
    } else {
      setSearchTerm(value);
    }
    onSearch?.(value);
  };

  const handleClear = () => {
    handleSearch('');
  };

  return (
    <div className={`relative ${className}`}>
      <div className="relative">
        <FiSearch className="absolute left-4 top-1/2 transform -translate-y-1/2 text-slate-400 pointer-events-none" size={18} />
        <input name="searchTerm"
          type="text"
          className="input w-full pr-10"
          style={{ paddingLeft: '3rem' }}
          placeholder={placeholder}
          value={currentValue}
          onChange={(e) => handleSearch(e.target.value)}
        />
        {currentValue && (
          <button
            onClick={handleClear}
            className="absolute right-3 top-1/2 transform -translate-y-1/2 text-slate-400 hover:text-slate-600"
          >
            <FiX size={18} />
          </button>
        )}
      </div>
    </div>
  );
}
