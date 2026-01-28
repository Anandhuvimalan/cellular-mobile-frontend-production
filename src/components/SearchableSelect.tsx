'use client';

import { useState, useRef, useEffect, type CSSProperties } from 'react';
import { FiChevronDown, FiSearch, FiX, FiPlus } from 'react-icons/fi';
import { HoverBorderGradient } from '@/components/ui/hover-border-gradient';

interface Option {
  value: string | number;
  label: string;
  subLabel?: string;
  searchText?: string;
}

interface SearchableSelectProps {
  options: Option[];
  value: string | number;
  onChange: (value: string | number) => void;
  placeholder?: string;
  label?: string;
  required?: boolean;
  disabled?: boolean;
  className?: string;
  onAddNew?: (searchTerm: string) => void;
  addNewLabel?: string;
}

export default function SearchableSelect({
  options,
  value,
  onChange,
  placeholder = 'Select an option',
  label,
  required = false,
  disabled = false,
  className = '',
  onAddNew,
  addNewLabel = 'Add New',
}: SearchableSelectProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [highlightedIndex, setHighlightedIndex] = useState(0);
  const wrapperRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const optionsRef = useRef<HTMLDivElement>(null);

  // Filter options based on search term
  const filteredOptions = options.filter((option) => {
    const searchLower = searchTerm.toLowerCase().trim();
    if (!searchLower) return true;

    const haystack = [
      option.label,
      option.subLabel,
      option.searchText,
    ]
      .filter(Boolean)
      .join(' ')
      .toLowerCase();

    const tokens = searchLower.split(/\s+/).filter(Boolean);
    return tokens.every((token) => haystack.includes(token));
  });

  // Get selected option
  const selectedOption = options.find((opt) => opt.value === value);

  // Close dropdown when clicking outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (wrapperRef.current && !wrapperRef.current.contains(event.target as Node)) {
        setIsOpen(false);
        setSearchTerm('');
      }
    }

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Focus input when dropdown opens
  useEffect(() => {
    if (isOpen && inputRef.current) {
      inputRef.current.focus();
    }
  }, [isOpen]);

  // Scroll to highlighted option
  useEffect(() => {
    if (optionsRef.current && isOpen) {
      const highlightedElement = optionsRef.current.children[highlightedIndex] as HTMLElement;
      if (highlightedElement) {
        highlightedElement.scrollIntoView({ block: 'nearest' });
      }
    }
  }, [highlightedIndex, isOpen]);

  // Handle keyboard navigation
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (!isOpen && (e.key === 'Enter' || e.key === ' ' || e.key === 'ArrowDown')) {
      e.preventDefault();
      setIsOpen(true);
      return;
    }

    if (!isOpen) return;

    switch (e.key) {
      case 'ArrowDown':
        e.preventDefault();
        setHighlightedIndex((prev) =>
          prev < filteredOptions.length - 1 ? prev + 1 : prev
        );
        break;
      case 'ArrowUp':
        e.preventDefault();
        setHighlightedIndex((prev) => (prev > 0 ? prev - 1 : 0));
        break;
      case 'Enter':
        e.preventDefault();
        if (filteredOptions[highlightedIndex]) {
          handleSelect(filteredOptions[highlightedIndex].value);
        }
        break;
      case 'Escape':
        e.preventDefault();
        setIsOpen(false);
        setSearchTerm('');
        break;
    }
  };

  const handleSelect = (optionValue: string | number) => {
    onChange(optionValue);
    setIsOpen(false);
    setSearchTerm('');
    setHighlightedIndex(0);
  };

  const handleClear = (e: React.MouseEvent) => {
    e.stopPropagation();
    onChange('');
    setSearchTerm('');
  };

  return (
    <div className={`relative ${className}`}>
      {label && (
        <span className="block text-sm font-medium text-slate-700 dark:text-slate-400 mb-1">
          {label} {required && <span className="text-rose-500">*</span>}
        </span>
      )}

      <div ref={wrapperRef} className="relative">
        <div
          className={`
            input flex items-center justify-between cursor-pointer gap-3 border-slate-200 dark:border-white/10 bg-white dark:bg-white/5 text-slate-900 dark:text-slate-100
            ${disabled ? 'bg-slate-100 dark:bg-white/5 text-slate-500 cursor-not-allowed' : 'hover:bg-slate-50 dark:hover:bg-white/10'}
            ${isOpen ? 'ring-2 ring-sky-400/30' : ''}
          `}
          onClick={() => !disabled && setIsOpen(!isOpen)}
          onKeyDown={handleKeyDown}
          tabIndex={disabled ? -1 : 0}
        >
          <span className={selectedOption ? 'text-slate-900 dark:text-slate-100' : 'text-slate-500 dark:text-slate-400'}>
            {selectedOption ? (
              <div>
                <div>{selectedOption.label}</div>
                {selectedOption.subLabel && (
                  <div className="text-xs text-slate-600 dark:text-slate-400">{selectedOption.subLabel}</div>
                )}
              </div>
            ) : (
              placeholder
            )}
          </span>
          <div className="flex items-center space-x-2">
            {value && !disabled && (
              <button
                type="button"
                onClick={handleClear}
                className="text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200"
              >
                <FiX size={16} />
              </button>
            )}
            <FiChevronDown
              className={`transition-transform ${isOpen ? 'transform rotate-180' : ''}`}
              size={20}
            />
          </div>
        </div>

        {isOpen && !disabled && (
          <div className="absolute z-50 w-full mt-2 rounded-2xl border border-slate-200 dark:border-white/10 bg-white dark:bg-slate-950/95 shadow-2xl backdrop-blur max-h-80 overflow-hidden">
            <div className="p-2 border-b border-slate-200 dark:border-white/10">
              <div className="relative">
                <FiSearch className="absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-500 dark:text-slate-400 pointer-events-none" size={16} />
                <input name="searchTerm"
                  ref={inputRef}
                  type="text"
                  className="input w-full pr-3 py-2 border-slate-200 dark:border-white/10 bg-slate-50 dark:bg-white/5 text-slate-900 dark:text-slate-100"
                  style={{ paddingLeft: '2.5rem' }}
                  placeholder="Type to search..."
                  value={searchTerm}
                  onChange={(e) => {
                    setSearchTerm(e.target.value);
                    setHighlightedIndex(0);
                  }}
                  onKeyDown={handleKeyDown}
                />
              </div>
            </div>

            <div ref={optionsRef} className="max-h-60 overflow-y-auto scrollbar-hide">
              {filteredOptions.length > 0 ? (
                filteredOptions.map((option, index) => (
                  <div
                    key={option.value}
                    className={`
                      px-4 py-2 cursor-pointer transition-colors
                      ${index === highlightedIndex ? 'bg-slate-100 dark:bg-white/10' : ''}
                      ${value === option.value ? 'bg-slate-100 dark:bg-white/10' : ''}
                      hover:bg-slate-50 dark:hover:bg-white/5
                    `}
                    onClick={() => handleSelect(option.value)}
                    onMouseEnter={() => setHighlightedIndex(index)}
                  >
                    <div className="font-medium text-slate-900 dark:text-slate-100">{option.label}</div>
                    {option.subLabel && (
                      <div className="text-sm text-slate-600 dark:text-slate-400">{option.subLabel}</div>
                    )}
                  </div>
                ))
              ) : (
                <div className="px-4 py-4">
                  <div className="text-center text-slate-600 dark:text-slate-400 mb-3 text-sm">
                    No results found for "{searchTerm}"
                  </div>
                  {onAddNew && searchTerm.trim() && (
                    <HoverBorderGradient
                      as="button"
                      type="button"
                      containerClassName="w-full"
                      className="w-full justify-center bg-white dark:bg-slate-950/70 text-slate-900 dark:text-slate-100"
                      onClick={() => {
                        onAddNew(searchTerm.trim());
                        setIsOpen(false);
                        setSearchTerm('');
                      }}
                    >
                      <FiPlus size={14} />
                      {addNewLabel}: "{searchTerm.trim()}"
                    </HoverBorderGradient>
                  )}
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
