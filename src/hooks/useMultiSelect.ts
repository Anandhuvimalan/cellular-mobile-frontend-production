import { useState } from 'react';

export function useMultiSelect() {
  const [selectedIds, setSelectedIds] = useState<number[]>([]);

  const toggleSelect = (id: number) => {
    setSelectedIds(prev =>
      prev.includes(id)
        ? prev.filter(selectedId => selectedId !== id)
        : [...prev, id]
    );
  };

  const toggleSelectAll = (ids: number[]) => {
    setSelectedIds(prev =>
      prev.length === ids.length ? [] : ids
    );
  };

  const clearSelection = () => {
    setSelectedIds([]);
  };

  const removeSelection = (ids: number[]) => {
    if (ids.length === 0) return;
    const idsToRemove = new Set(ids);
    setSelectedIds(prev => prev.filter((id) => !idsToRemove.has(id)));
  };

  const isSelected = (id: number) => selectedIds.includes(id);

  const isAllSelected = (ids: number[]) =>
    ids.length > 0 && selectedIds.length === ids.length;

  return {
    selectedIds,
    toggleSelect,
    toggleSelectAll,
    clearSelection,
    removeSelection,
    isSelected,
    isAllSelected,
  };
}
