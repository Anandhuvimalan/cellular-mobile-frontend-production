'use client';

import { FiTrash, FiX } from 'react-icons/fi';

interface BulkActionBarProps {
  selectedCount: number;
  onDelete: () => void;
  onCancel: () => void;
}

export default function BulkActionBar({
  selectedCount,
  onDelete,
  onCancel,
}: BulkActionBarProps) {
  if (selectedCount === 0) return null;

  return (
    <div className="fixed bottom-8 left-1/2 transform -translate-x-1/2 z-50">
      <div className="bg-slate-900/90 text-white px-6 py-4 rounded-2xl shadow-2xl border border-white/10 backdrop-blur flex items-center gap-4">
        <span className="font-medium">
          {selectedCount} item{selectedCount !== 1 ? 's' : ''} selected
        </span>
        <button
          onClick={onDelete}
          className="flex items-center gap-2 px-4 py-2 bg-rose-500 hover:bg-rose-600 rounded-xl transition text-sm font-semibold"
        >
          <FiTrash />
          Delete Selected
        </button>
        <button
          onClick={onCancel}
          className="flex items-center gap-2 px-4 py-2 bg-white/10 hover:bg-white/20 rounded-xl transition text-sm font-semibold"
        >
          <FiX />
          Cancel
        </button>
      </div>
    </div>
  );
}
