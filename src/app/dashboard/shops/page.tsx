'use client';

import { useEffect, useRef, useState } from 'react';
import { shopsAPI } from '@/lib/api';
import type { Shop } from '@/types';
import { FiPlus, FiEdit, FiTrash, FiMapPin } from 'react-icons/fi';
import TableSearchBar from '@/components/TableSearchBar';
import { useMultiSelect } from '@/hooks/useMultiSelect';
import BulkActionBar from '@/components/BulkActionBar';
import { useAutoRefresh } from '@/hooks/useAutoRefresh';
import FullScreenLoader from '@/components/FullScreenLoader';
import { HoverBorderGradient } from '@/components/ui/hover-border-gradient';

import { showToast } from '@/lib/toast';
export default function ShopsPage() {
  const [shops, setShops] = useState<Shop[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const formRef = useRef<HTMLDivElement>(null);

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
    code: '',
    address: '',
    phone: '',
    email: '',
    is_active: true,
  });

  useEffect(() => {
    fetchShops();
  }, []);

  const fetchShops = async () => {
    try {
      const response = await shopsAPI.list(searchTerm);
      setShops(response.data);
    } catch (error) {
      console.error('Failed to fetch shops:', error);
      setShops([]);
    } finally {
      setLoading(false);
    }
  };
  useAutoRefresh(fetchShops);

  useEffect(() => {
    const timer = setTimeout(() => {
      fetchShops();
    }, 300);
    return () => clearTimeout(timer);
  }, [searchTerm]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      if (editingId) {
        await shopsAPI.update(editingId, formData);
      } else {
        await shopsAPI.create(formData);
      }
      setShowForm(false);
      setEditingId(null);
      setFormData({
        name: '',
        code: '',
        address: '',
        phone: '',
        email: '',
        is_active: true,
      });
      fetchShops();
    } catch (error: any) {
      showToast.error(error.response?.data?.detail || 'Failed to save shop');
    }
  };

  const handleEdit = (shop: Shop) => {
    setFormData({
      name: shop.name,
      code: shop.code,
      address: shop.address,
      phone: shop.phone || '',
      email: shop.email || '',
      is_active: shop.is_active,
    });
    setEditingId(shop.id);
    setShowForm(true);
    setTimeout(() => {
      formRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }, 100);
  };

  const handleDelete = async (id: number) => {
    if (confirm('Are you sure you want to delete this shop? This will also delete all associated sub-stocks, stock requests, and stock transfers.')) {
      try {
        await shopsAPI.delete(id);
        showToast.success('Shop deleted successfully!');
        removeSelection([id]);
        fetchShops();
      } catch (error: any) {
        const errorMessage = error.response?.data?.error || error.response?.data?.detail || 'Failed to delete shop';
        showToast.error(`Failed to delete shop:\n${errorMessage}`);
      }
    }
  };

  const handleBulkDelete = async () => {
    if (confirm(`Are you sure you want to delete ${selectedIds.length} shop${selectedIds.length === 1 ? '' : 's'}? This will cascade delete all sub-stocks, stock requests, and stock transfers.`)) {
      try {
        await shopsAPI.bulkDelete(selectedIds);
        showToast.success('Shops deleted successfully!');
        removeSelection(selectedIds);
        fetchShops();
      } catch (error: any) {
        console.error('Bulk delete error:', error);
        showToast.error('Failed to delete some shops. Check console for details.');
      }
    }
  };

  const handleCancel = () => {
    setShowForm(false);
    setEditingId(null);
    setFormData({
      name: '',
      code: '',
      address: '',
      phone: '',
      email: '',
      is_active: true,
    });
  };

  if (loading) {
    return <FullScreenLoader label="Loading shops" />;
  }

  return (
    <div className="space-y-6">
      <div className="section-header">        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <p className="text-[11px] uppercase tracking-[0.3em] text-slate-600 dark:text-slate-400">Store Network</p>
            <h1 className="text-3xl font-semibold text-slate-900 dark:text-slate-100">Shops</h1>
            <p className="text-slate-700 dark:text-slate-300">Manage retail locations and branches</p>
          </div>
          <HoverBorderGradient
            as="button"
            onClick={() => setShowForm(!showForm)}
            className="bg-white/90 dark:bg-transparent text-slate-900 dark:text-slate-100"
          >
            <FiPlus className="h-4 w-4" />
            {showForm ? 'Cancel' : 'Add Shop'}
          </HoverBorderGradient>
        </div>
      </div>

      {showForm && (
        <div ref={formRef} className="rounded-2xl border border-slate-200/80 dark:border-white/10 bg-white/90 dark:bg-transparent p-6 text-slate-900 dark:text-slate-100 shadow-lg dark:shadow-[0_20px_60px_rgba(2,6,23,0.45)]">
          <h2 className="text-xl font-semibold mb-4">
            {editingId ? 'Edit Shop' : 'Create New Shop'}
          </h2>
          <form onSubmit={handleSubmit} className="grid grid-cols-2 gap-4">
            <div>
              <label htmlFor="name" className="block text-sm font-medium mb-1">Shop Name *</label>
              <input id="name" name="name"
                type="text"
                className="input"
                value={formData.name}
                autoComplete="name"
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                required
                placeholder="e.g. Main Store - Downtown"
              />
            </div>

            <div>
              <label htmlFor="code" className="block text-sm font-medium mb-1">Shop Code *</label>
              <input id="code" name="code"
                type="text"
                className="input"
                value={formData.code}
                autoComplete="off"
                onChange={(e) => setFormData({ ...formData, code: e.target.value })}
                required
                placeholder="e.g. MS-DT-001"
                disabled={!!editingId}
              />
            </div>

            <div className="col-span-2">
              <label htmlFor="address" className="block text-sm font-medium mb-1">Address *</label>
              <textarea id="address" name="address"
                className="input"
                rows={3}
                value={formData.address}
                onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                required
                placeholder="Enter complete address"
              />
            </div>

            <div>
              <label htmlFor="phone" className="block text-sm font-medium mb-1">Phone</label>
              <input id="phone" name="phone"
                type="tel"
                className="input"
                value={formData.phone}
                autoComplete="tel"
                onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                placeholder="e.g. 9876543210"
              />
            </div>

            <div>
              <label htmlFor="email" className="block text-sm font-medium mb-1">Email</label>
              <input id="email" name="email"
                type="email"
                className="input"
                value={formData.email}
                autoComplete="email"
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                placeholder="e.g. shop@example.com"
              />
            </div>

            <div className="col-span-2 flex items-center">
              <input
                type="checkbox"
                id="is_active"
                checked={formData.is_active}
                onChange={(e) => setFormData({ ...formData, is_active: e.target.checked })}
                className="mr-2"
              />
              <label htmlFor="is_active" className="text-sm font-medium">
                Active
              </label>
            </div>

            <div className="col-span-2 flex space-x-3">
              <HoverBorderGradient
                as="button"
                type="submit"
                className="bg-white/90 dark:bg-transparent text-slate-900 dark:text-slate-100"
              >
                {editingId ? 'Update' : 'Create'} Shop
              </HoverBorderGradient>
              <button type="button" onClick={handleCancel} className="btn btn-outline">
                Cancel
              </button>
            </div>
          </form>
        </div>
      )}

      {shops.length > 0 && (
        <div className="rounded-2xl border border-slate-200/80 dark:border-white/10 bg-white/90 dark:bg-transparent p-6 text-slate-900 dark:text-slate-100 shadow-lg dark:shadow-[0_20px_60px_rgba(2,6,23,0.45)]">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center flex-1 max-w-xl">
              <TableSearchBar
                onSearch={setSearchTerm}
                placeholder="Search shops by name, code, address, phone..."
                className="flex-1"
              />
            </div>
            <div className="ml-4">
              <button
                onClick={() => toggleSelectAll(shops.map(s => s.id))}
                className="btn btn-outline text-sm"
              >
                {isAllSelected(shops.map(s => s.id)) ? 'Deselect All' : 'Select All'}
              </button>
            </div>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-6">
        {shops.map((shop) => (
          <div
            key={shop.id}
            className={`rounded-2xl border border-slate-200/80 dark:border-white/10 bg-white/90 dark:bg-transparent p-5 text-slate-900 dark:text-slate-100 shadow-[0_20px_60px_rgba(2,6,23,0.35)] ${
              isSelected(shop.id) ? 'ring-2 ring-sky-400/40' : ''
            }`}
          >
            <div className="flex justify-between items-start mb-4">
              <div className="flex items-center">
                <input name="rowSelect"
                  type="checkbox"
                  checked={isSelected(shop.id)}
                  onChange={() => toggleSelect(shop.id)}
                  className="mr-3"
                />
                <div className="bg-sky-500/20 text-sky-300 rounded-full p-3 mr-3">
                  <FiMapPin size={24} />
                </div>
                <div>
                  <h3 className="text-lg font-semibold">{shop.name}</h3>
                  <p className="text-sm text-slate-600 dark:text-slate-400">Code: {shop.code}</p>
                </div>
              </div>
              {shop.is_active ? (
                <span className="badge badge-success">Active</span>
              ) : (
                <span className="badge badge-danger">Inactive</span>
              )}
            </div>

            <div className="space-y-2 mb-4">
              <p className="text-sm text-slate-700 dark:text-slate-300">
                <strong>Address:</strong> {shop.address}
              </p>
              {shop.phone && (
                <p className="text-sm text-slate-700 dark:text-slate-300">
                  <strong>Phone:</strong> {shop.phone}
                </p>
              )}
              {shop.email && (
                <p className="text-sm text-slate-700 dark:text-slate-300">
                  <strong>Email:</strong> {shop.email}
                </p>
              )}
            </div>

            <div className="flex space-x-2 pt-3 border-t border-slate-200/80 dark:border-white/10">
              <button
                onClick={() => handleEdit(shop)}
                className="flex-1 btn btn-outline text-sm py-2"
              >
                <FiEdit className="inline mr-1" />
                Edit
              </button>
              <button
                onClick={() => handleDelete(shop.id)}
                className="flex-1 btn btn-danger text-sm py-2"
              >
                <FiTrash className="inline mr-1" />
                Delete
              </button>
            </div>
          </div>
        ))}
      </div>

      {shops.length === 0 && (
        <div className="rounded-2xl border border-slate-200/80 dark:border-white/10 bg-white/90 dark:bg-transparent p-12 text-center text-slate-600 dark:text-slate-400 shadow-[0_20px_60px_rgba(2,6,23,0.35)]">
          No shops found. Create your first shop to get started.
        </div>
      )}

      <BulkActionBar
        selectedCount={selectedIds.length}
        onDelete={handleBulkDelete}
        onCancel={clearSelection}
      />
    </div>
  );
}
