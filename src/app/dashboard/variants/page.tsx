'use client';

import { useEffect, useRef, useState } from 'react';
import { variantsAPI } from '@/lib/api';
import type { Variant } from '@/types';
import { FiPlus, FiEdit, FiTrash } from 'react-icons/fi';
import TableSearchBar from '@/components/TableSearchBar';
import { useMultiSelect } from '@/hooks/useMultiSelect';
import BulkActionBar from '@/components/BulkActionBar';
import { useAutoRefresh } from '@/hooks/useAutoRefresh';
import { formatDate } from '@/lib/date';
import FullScreenLoader from '@/components/FullScreenLoader';
import { HoverBorderGradient } from '@/components/ui/hover-border-gradient';
import { showToast } from '@/lib/toast';
import { ConfirmDialog } from '@/components/ConfirmDialog';

export default function VariantsPage() {
  const [variants, setVariants] = useState<Variant[]>([]);
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
    description: '',
  });

  useEffect(() => {
    fetchVariants();
  }, []);

  const fetchVariants = async () => {
    try {
      const response = await variantsAPI.list(searchTerm);
      setVariants(response.data);
    } catch (error) {
      console.error('Failed to fetch variants:', error);
      setVariants([]);
    } finally {
      setLoading(false);
    }
  };
  useAutoRefresh(fetchVariants);

  useEffect(() => {
    const timer = setTimeout(() => {
      fetchVariants();
    }, 300);
    return () => clearTimeout(timer);
  }, [searchTerm]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      console.log('Submitting variant data:', formData);
      if (editingId) {
        await variantsAPI.update(editingId, formData);
        showToast.success('Variant updated successfully!');
      } else {
        await variantsAPI.create(formData);
        showToast.success('Variant created successfully!');
      }
      setShowForm(false);
      setEditingId(null);
      setFormData({ name: '', description: '' });
      fetchVariants();
    } catch (error: any) {
      console.error('Variant save error:', error);
      if (error.response?.status === 403) {
        showToast.error('Permission denied. Only Main Inventory Managers and Super Admins can manage variants.');
      } else if (error.response?.data) {
        const errorMessage = typeof error.response.data === 'object'
          ? JSON.stringify(error.response.data, null, 2)
          : error.response.data;
        showToast.error(`Failed to save variant:\n${errorMessage}`);
      } else {
        showToast.error('Failed to save variant. Please check your connection and try again.');
      }
    }
  };

  const handleEdit = (variant: Variant) => {
    setFormData({
      name: variant.name,
      description: variant.description || '',
    });
    setEditingId(variant.id);
    setShowForm(true);
    setTimeout(() => {
      formRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }, 100);
  };

  const handleDelete = async (id: number) => {
    openDeleteDialog([id], 'Are you sure you want to delete this variant?');
  };

  const handleBulkDelete = async () => {
    openDeleteDialog(
      selectedIds,
      `Are you sure you want to delete ${selectedIds.length} variant${selectedIds.length === 1 ? '' : 's'}?`
    );
  };

  const openDeleteDialog = (ids: number[], message: string) => {
    if (ids.length === 0) return;
    setConfirmState({
      open: true,
      ids,
      title: ids.length === 1 ? 'Delete Variant' : 'Delete Variants',
      message,
    });
  };

  const handleConfirmDelete = async () => {
    const ids = confirmState.ids;
    if (ids.length === 0) return;
    setConfirmLoading(true);
    try {
      if (ids.length === 1) {
        await variantsAPI.delete(ids[0]);
        showToast.success('Variant deleted successfully!');
      } else {
        await variantsAPI.bulkDelete(ids);
        showToast.success('Variants deleted successfully!');
      }
      removeSelection(ids);
      fetchVariants();
    } catch (error: any) {
      console.error('Bulk delete error:', error);
      showToast.error(error.response?.data?.detail || 'Failed to delete variant');
    } finally {
      setConfirmLoading(false);
      setConfirmState({ open: false, ids: [], title: '', message: '' });
    }
  };

  const handleCancel = () => {
    setShowForm(false);
    setEditingId(null);
    setFormData({ name: '', description: '' });
  };

  if (loading) {
    return <FullScreenLoader label="Loading variants" />;
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-3xl font-bold text-slate-900 dark:text-slate-100">Variants</h1>
          <p className="text-slate-700 dark:text-slate-300">Manage product variants</p>
        </div>
        <HoverBorderGradient
          as="button"
          onClick={() => setShowForm(!showForm)}
          className="bg-white/90 dark:bg-transparent text-slate-900 dark:text-slate-100"
        >
          <FiPlus className="h-4 w-4" />
          {showForm ? 'Cancel' : 'Add Variant'}
        </HoverBorderGradient>
      </div>

      {showForm && (
        <div ref={formRef} className="rounded-2xl border border-slate-200/80 dark:border-white/10 bg-white/90 dark:bg-transparent p-6 text-slate-900 dark:text-slate-100 shadow-lg dark:shadow-[0_20px_60px_rgba(2,6,23,0.45)]">
          <h2 className="text-xl font-semibold mb-4">
            {editingId ? 'Edit Variant' : 'Create New Variant'}
          </h2>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label htmlFor="name" className="block text-sm font-medium mb-1">Name *</label>
              <input id="name" name="name"
                type="text"
                className="input"
                value={formData.name}
                autoComplete="name"
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                required
                placeholder="e.g. 128GB Black, 256GB Blue"
              />
            </div>

            <div>
              <label htmlFor="description" className="block text-sm font-medium mb-1">Description</label>
              <textarea id="description" name="description"
                className="input"
                rows={3}
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                placeholder="Enter variant description"
              />
            </div>

            <div className="flex space-x-3">
              <HoverBorderGradient
                as="button"
                type="submit"
                className="bg-white/90 dark:bg-transparent text-slate-900 dark:text-slate-100"
              >
                {editingId ? 'Update' : 'Create'} Variant
              </HoverBorderGradient>
              <button type="button" onClick={handleCancel} className="btn btn-outline">
                Cancel
              </button>
            </div>
          </form>
        </div>
      )}

      <div className="rounded-2xl border border-slate-200/80 dark:border-white/10 bg-white/90 dark:bg-transparent p-6 text-slate-900 dark:text-slate-100 shadow-lg dark:shadow-[0_20px_60px_rgba(2,6,23,0.45)]">
        <div className="mb-4">
          <TableSearchBar
            onSearch={setSearchTerm}
            placeholder="Search variants by name or description..."
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
                    checked={isAllSelected(variants.map(v => v.id))}
                    onChange={() => toggleSelectAll(variants.map(v => v.id))}
                  />
                </th>
                <th>ID</th>
                <th>Name</th>
                <th>Description</th>
                <th>Created At</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {variants.map((variant) => (
                <tr key={variant.id} className={isSelected(variant.id) ? 'bg-slate-50 dark:bg-transparent' : ''}>
                  <td>
                    <input name="rowSelect"
                      type="checkbox"
                      checked={isSelected(variant.id)}
                      onChange={() => toggleSelect(variant.id)}
                    />
                  </td>
                  <td>{variant.id}</td>
                  <td className="font-medium">{variant.name}</td>
                  <td>{variant.description || '-'}</td>
                  <td>{formatDate(variant.created_at)}</td>
                  <td>
                    <div className="flex space-x-2">
                      <button
                        onClick={() => handleEdit(variant)}
                        className="text-indigo-700 dark:text-indigo-300 hover:text-indigo-600 dark:hover:text-indigo-200"
                      >
                        <FiEdit size={18} />
                      </button>
                      <button
                        onClick={() => handleDelete(variant.id)}
                        className="text-rose-700 dark:text-rose-300 hover:text-rose-600 dark:hover:text-rose-200"
                      >
                        <FiTrash size={18} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>

          {variants.length === 0 && (
            <div className="text-center py-12 text-slate-600 dark:text-slate-400">
              No variants found. Create your first variant to get started.
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
