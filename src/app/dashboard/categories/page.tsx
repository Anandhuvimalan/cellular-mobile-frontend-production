'use client';

import { useEffect, useRef, useState } from 'react';
import { categoriesAPI } from '@/lib/api';
import type { Category } from '@/types';
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

export default function CategoriesPage() {
  const [categories, setCategories] = useState<Category[]>([]);
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
    fetchCategories();
  }, []);

  const fetchCategories = async () => {
    try {
      const response = await categoriesAPI.list(searchTerm);
      setCategories(response.data);
    } catch (error) {
      console.error('Failed to fetch categories:', error);
      setCategories([]);
    } finally {
      setLoading(false);
    }
  };
  useAutoRefresh(fetchCategories);

  useEffect(() => {
    const timer = setTimeout(() => {
      fetchCategories();
    }, 300);
    return () => clearTimeout(timer);
  }, [searchTerm]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      console.log('Submitting category data:', formData);
      const response = editingId
        ? await categoriesAPI.update(editingId, formData)
        : await categoriesAPI.create(formData);

      if (editingId) {
        setCategories((prev) =>
          prev.map((category) => (category.id === editingId ? response.data : category))
        );
        showToast.success('Category updated successfully!');
      } else {
        setCategories((prev) => [...prev, response.data]);
        showToast.success('Category created successfully!');
      }
      setShowForm(false);
      setEditingId(null);
      setFormData({ name: '', description: '' });
      void fetchCategories();
    } catch (error: any) {
      console.error('Category save error:', error);
      if (error.response?.status === 403) {
        showToast.error('Permission denied. Only Main Inventory Managers and Super Admins can manage categories.');
      } else if (error.response?.data) {
        const errorMessage = typeof error.response.data === 'object'
          ? JSON.stringify(error.response.data, null, 2)
          : error.response.data;
        showToast.error(`Failed to save category: ${errorMessage}`);
      } else {
        showToast.error('Failed to save category. Please check your connection and try again.');
      }
    }
  };

  const handleEdit = (category: Category) => {
    setFormData({
      name: category.name,
      description: category.description || '',
    });
    setEditingId(category.id);
    setShowForm(true);
    setTimeout(() => {
      formRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }, 100);
  };

  const handleDelete = async (id: number) => {
    openDeleteDialog(
      [id],
      'Are you sure you want to delete this category?'
    );
  };

  const handleBulkDelete = async () => {
    openDeleteDialog(
      selectedIds,
      `Are you sure you want to delete ${selectedIds.length} categor${selectedIds.length === 1 ? 'y' : 'ies'}?`
    );
  };

  const openDeleteDialog = (ids: number[], message: string) => {
    if (ids.length === 0) return;
    setConfirmState({
      open: true,
      ids,
      title: ids.length === 1 ? 'Delete Category' : 'Delete Categories',
      message,
    });
  };

  const handleConfirmDelete = async () => {
    const ids = confirmState.ids;
    if (ids.length === 0) return;
    setConfirmLoading(true);
    try {
      if (ids.length === 1) {
        await categoriesAPI.delete(ids[0]);
        setCategories((prev) => prev.filter((category) => category.id !== ids[0]));
        showToast.success('Category deleted successfully!');
      } else {
        await categoriesAPI.bulkDelete(ids);
        setCategories((prev) => prev.filter((category) => !ids.includes(category.id)));
        showToast.success(`${ids.length} categor${ids.length === 1 ? 'y' : 'ies'} deleted successfully!`);
      }
      removeSelection(ids);
      fetchCategories();
    } catch (error: any) {
      console.error('Delete error:', error);
      showToast.error(error.response?.data?.detail || 'Failed to delete category');
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
    return <FullScreenLoader label="Loading categories" />;
  }

  return (
    <div className="space-y-6">
      <div className="section-header">        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <p className="text-[11px] uppercase tracking-[0.3em] text-slate-600 dark:text-slate-400">Catalog Control</p>
            <h1 className="text-3xl font-semibold text-slate-900 dark:text-slate-100">Categories</h1>
            <p className="text-slate-700 dark:text-slate-300">Manage product categories</p>
          </div>
          <HoverBorderGradient
            as="button"
            onClick={() => setShowForm(!showForm)}
            className="bg-white/90 dark:bg-transparent text-slate-900 dark:text-slate-100"
          >
            <FiPlus className="h-4 w-4" />
            {showForm ? 'Cancel' : 'Add Category'}
          </HoverBorderGradient>
        </div>
      </div>

      {showForm && (
        <div ref={formRef} className="rounded-2xl border border-slate-200/80 dark:border-white/10 bg-white/90 dark:bg-transparent p-6 text-slate-900 dark:text-slate-100 shadow-lg dark:shadow-[0_20px_60px_rgba(2,6,23,0.45)]">
          <h2 className="text-xl font-semibold mb-4">
            {editingId ? 'Edit Category' : 'Create New Category'}
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
                placeholder="Enter category name"
              />
            </div>

            <div>
              <label htmlFor="description" className="block text-sm font-medium mb-1">Description</label>
              <textarea id="description" name="description"
                className="input"
                rows={3}
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                placeholder="Enter category description"
              />
            </div>

            <div className="flex space-x-3">
              <HoverBorderGradient
                as="button"
                type="submit"
                className="bg-white/90 dark:bg-transparent text-slate-900 dark:text-slate-100"
              >
                {editingId ? 'Update' : 'Create'} Category
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
            placeholder="Search categories by name or description..."
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
                    checked={isAllSelected(categories.map(c => c.id))}
                    onChange={() => toggleSelectAll(categories.map(c => c.id))}
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
              {categories.map((category) => (
                <tr key={category.id} className={isSelected(category.id) ? 'bg-slate-50 dark:bg-transparent' : ''}>
                  <td>
                    <input name="rowSelect"
                      type="checkbox"
                      checked={isSelected(category.id)}
                      onChange={() => toggleSelect(category.id)}
                    />
                  </td>
                  <td>{category.id}</td>
                  <td className="font-medium">{category.name}</td>
                  <td>{category.description || '-'}</td>
                  <td>{formatDate(category.created_at)}</td>
                  <td>
                    <div className="flex space-x-2">
                      <button
                        onClick={() => handleEdit(category)}
                        className="text-indigo-700 dark:text-indigo-300 hover:text-indigo-600 dark:hover:text-indigo-200"
                      >
                        <FiEdit size={18} />
                      </button>
                      <button
                        onClick={() => handleDelete(category.id)}
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

          {categories.length === 0 && (
            <div className="text-center py-12 text-slate-600 dark:text-slate-400">
              No categories found. Create your first category to get started.
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
