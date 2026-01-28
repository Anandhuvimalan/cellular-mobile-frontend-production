'use client';

import { useEffect, useRef, useState } from 'react';
import { colorsAPI } from '@/lib/api';
import type { Color } from '@/types';
import { FiEdit, FiTrash, FiPlus } from 'react-icons/fi';
import TableSearchBar from '@/components/TableSearchBar';
import { useMultiSelect } from '@/hooks/useMultiSelect';
import BulkActionBar from '@/components/BulkActionBar';
import { formatDate } from '@/lib/date';
import { useAutoRefresh } from '@/hooks/useAutoRefresh';
import FullScreenLoader from '@/components/FullScreenLoader';
import { HoverBorderGradient } from '@/components/ui/hover-border-gradient';
import { showToast } from '@/lib/toast';
import { ConfirmDialog } from '@/components/ConfirmDialog';

export default function ColorsPage() {
  const [colors, setColors] = useState<Color[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const formRef = useRef<HTMLDivElement>(null);
  const [confirmState, setConfirmState] = useState({
    open: false,
    ids: [] as number[],
    title: '',
    message: '',
  });
  const [confirmLoading, setConfirmLoading] = useState(false);

  const {
    selectedIds,
    toggleSelect,
    toggleSelectAll,
    clearSelection,
    removeSelection,
    isSelected,
    isAllSelected,
  } = useMultiSelect();

  const [formData, setFormData] = useState({
    name: '',
    hex_code: '',
  });

  useEffect(() => {
    fetchColors();
  }, []);

  const fetchColors = async () => {
    try {
      const response = await colorsAPI.list(searchTerm);
      setColors(response.data);
    } catch (error) {
      console.error('Failed to fetch colors:', error);
      setColors([]);
    } finally {
      setLoading(false);
    }
  };
  useAutoRefresh(fetchColors);

  useEffect(() => {
    const timer = setTimeout(() => {
      fetchColors();
    }, 300);
    return () => clearTimeout(timer);
  }, [searchTerm]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      if (editingId) {
        await colorsAPI.update(editingId, formData);
        showToast.success('Color updated successfully!');
      } else {
        await colorsAPI.create(formData);
        showToast.success('Color created successfully!');
      }
      setShowForm(false);
      setEditingId(null);
      fetchColors();
      setFormData({ name: '', hex_code: '' });
    } catch (error: any) {
      console.error('Color save error:', error);
      const errorMessage = error.response?.data
        ? JSON.stringify(error.response.data, null, 2)
        : error.message || 'Failed to save color';
      showToast.error(`Failed to save color:\n${errorMessage}`);
    }
  };

  const handleEdit = (color: Color) => {
    setFormData({
      name: color.name,
      hex_code: color.hex_code || '',
    });
    setEditingId(color.id);
    setShowForm(true);
    setTimeout(() => {
      formRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }, 100);
  };

  const handleDelete = async (id: number) => {
    openDeleteDialog([id], 'Are you sure you want to delete this color?');
  };

  const handleBulkDelete = async () => {
    openDeleteDialog(
      selectedIds,
      `Are you sure you want to delete ${selectedIds.length} color(s)?`
    );
  };

  const openDeleteDialog = (ids: number[], message: string) => {
    if (ids.length === 0) return;
    setConfirmState({
      open: true,
      ids,
      title: ids.length === 1 ? 'Delete Color' : 'Delete Colors',
      message,
    });
  };

  const handleConfirmDelete = async () => {
    const ids = confirmState.ids;
    if (ids.length === 0) return;
    setConfirmLoading(true);
    try {
      if (ids.length === 1) {
        await colorsAPI.delete(ids[0]);
        showToast.success('Color deleted successfully!');
      } else {
        await colorsAPI.bulkDelete(ids);
        showToast.success('Colors deleted successfully!');
      }
      removeSelection(ids);
      fetchColors();
    } catch (error: any) {
      console.error('Color deletion error:', error);
      const errorMessage = error.response?.data?.error || error.response?.data?.detail || 'Failed to delete color';
      showToast.error(errorMessage);
    } finally {
      setConfirmLoading(false);
      setConfirmState({ open: false, ids: [], title: '', message: '' });
    }
  };

  if (loading) {
    return <FullScreenLoader label="Loading colors" />;
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-3xl font-bold text-slate-900 dark:text-slate-100">Colors</h1>
          <p className="text-slate-700 dark:text-slate-300">Manage product color options</p>
        </div>
        <HoverBorderGradient
          as="button"
          onClick={() => {
            setShowForm(!showForm);
            if (showForm) {
              setEditingId(null);
              setFormData({ name: '', hex_code: '' });
            }
          }}
          className="bg-white/90 dark:bg-transparent text-slate-900 dark:text-slate-100"
        >
          <FiPlus className="h-4 w-4" />
          {showForm ? 'Cancel' : 'Add Color'}
        </HoverBorderGradient>
      </div>

      {showForm && (
        <div ref={formRef} className="rounded-2xl border border-slate-200/80 dark:border-white/10 bg-white/90 dark:bg-transparent p-6 text-slate-900 dark:text-slate-100 shadow-lg dark:shadow-[0_20px_60px_rgba(2,6,23,0.45)]">
          <h2 className="text-xl font-semibold mb-4">
            {editingId ? 'Edit Color' : 'Create New Color'}
          </h2>
          <form onSubmit={handleSubmit} className="grid grid-cols-2 gap-4">
            <div>
              <label htmlFor="name" className="block text-sm font-medium mb-1">Color Name *</label>
              <input id="name" name="name"
                type="text"
                className="input"
                value={formData.name}
                autoComplete="name"
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                required
                placeholder="e.g. Midnight Black"
              />
            </div>

            <div>
              <label htmlFor="hex_code" className="block text-sm font-medium mb-1">Hex Code</label>
              <div className="flex space-x-2">
                <input id="hex_code" name="hex_code"
                  type="text"
                  className="input flex-1"
                  value={formData.hex_code}
                  autoComplete="off"
                onChange={(e) => setFormData({ ...formData, hex_code: e.target.value })}
                  placeholder="e.g. #000000"
                  maxLength={7}
                />
                <input id="color_picker"
                  name="color_picker"
                  type="color"
                  className="w-12 h-10 border rounded cursor-pointer"
                  value={formData.hex_code || '#000000'}
                  onChange={(e) => setFormData({ ...formData, hex_code: e.target.value })}
                />
              </div>
              <p className="text-xs text-slate-600 dark:text-slate-400 mt-1">Optional - Use color picker or enter hex code</p>
            </div>

            <div className="col-span-2">
              <HoverBorderGradient
                as="button"
                type="submit"
                className="w-full justify-center bg-white/90 dark:bg-transparent text-slate-900 dark:text-slate-100"
              >
                {editingId ? 'Update Color' : 'Create Color'}
              </HoverBorderGradient>
            </div>
          </form>
        </div>
      )}

      <div className="rounded-2xl border border-slate-200/80 dark:border-white/10 bg-white/90 dark:bg-transparent p-6 text-slate-900 dark:text-slate-100 shadow-lg dark:shadow-[0_20px_60px_rgba(2,6,23,0.45)]">
        <div className="mb-4">
          <TableSearchBar
            onSearch={setSearchTerm}
            placeholder="Search colors by name..."
            className="rounded-2xl border border-slate-200/80 dark:border-white/10 bg-slate-50 dark:bg-transparent p-4"
          />
        </div>
        <div className="overflow-x-auto scrollbar-hide rounded-2xl border border-slate-200/80 dark:border-white/10 bg-white dark:bg-transparent">
          <table className="table table-frost">
            <thead>
              <tr>
                <th className="w-12">
                  <input name="rowSelect"
                    type="checkbox"
                    checked={isAllSelected(colors.map(c => c.id))}
                    onChange={() => toggleSelectAll(colors.map(c => c.id))}
                  />
                </th>
                <th>Preview</th>
                <th>Name</th>
                <th>Hex Code</th>
                <th>Created At</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {colors.map((color) => (
                <tr key={color.id} className={isSelected(color.id) ? 'bg-slate-50 dark:bg-transparent' : ''}>
                  <td>
                    <input name="rowSelect"
                      type="checkbox"
                      checked={isSelected(color.id)}
                      onChange={() => toggleSelect(color.id)}
                    />
                  </td>
                  <td>
                    {color.hex_code && (
                      <div
                        className="w-8 h-8 rounded border border-gray-300"
                        style={{ backgroundColor: color.hex_code }}
                        title={color.hex_code}
                      />
                    )}
                  </td>
                  <td className="font-medium">{color.name}</td>
                  <td>
                    {color.hex_code ? (
                      <span className="font-mono text-sm">{color.hex_code}</span>
                    ) : (
                      <span className="text-gray-600 dark:text-gray-400">-</span>
                    )}
                  </td>
                  <td>{formatDate(color.created_at)}</td>
                  <td>
                    <div className="flex space-x-2">
                      <button
                        onClick={() => handleEdit(color)}
                        className="text-indigo-700 dark:text-indigo-300 hover:text-indigo-600 dark:hover:text-indigo-200"
                        title="Edit Color"
                      >
                        <FiEdit size={18} />
                      </button>
                      <button
                        onClick={() => handleDelete(color.id)}
                        className="text-rose-700 dark:text-rose-300 hover:text-rose-600 dark:hover:text-rose-200"
                        title="Delete Color"
                      >
                        <FiTrash size={18} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>

          {colors.length === 0 && (
            <div className="text-center py-12 text-slate-600 dark:text-slate-400">
              No colors found. Add your first color to get started.
            </div>
          )}
        </div>
      </div>

      <BulkActionBar
        selectedCount={selectedIds.length}
        onDelete={handleBulkDelete}
        onCancel={clearSelection}
      />

      <ConfirmDialog
        isOpen={confirmState.open}
        title={confirmState.title}
        message={confirmState.message}
        confirmText="Delete"
        variant="danger"
        loading={confirmLoading}
        onConfirm={handleConfirmDelete}
        onCancel={() => setConfirmState({ open: false, ids: [], title: '', message: '' })}
      />
    </div>
  );
}
