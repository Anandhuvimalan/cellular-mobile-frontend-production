'use client';

import { useEffect, useRef, useState } from 'react';
import { customersAPI } from '@/lib/api';
import type { Customer } from '@/types';
import { FiEdit, FiTrash, FiPlus, FiSearch } from 'react-icons/fi';
import TableSearchBar from '@/components/TableSearchBar';
import { useAutoRefresh } from '@/hooks/useAutoRefresh';
import FullScreenLoader from '@/components/FullScreenLoader';
import SearchableSelect from '@/components/SearchableSelect';
import { HoverBorderGradient } from '@/components/ui/hover-border-gradient';
import { showToast } from '@/lib/toast';
import { useMultiSelect } from '@/hooks/useMultiSelect';
import BulkActionBar from '@/components/BulkActionBar';
import { ConfirmDialog } from '@/components/ConfirmDialog';

export default function CustomersPage() {
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(25);
  const [confirmState, setConfirmState] = useState({
    open: false,
    ids: [] as number[],
    title: '',
    message: '',
  });
  const [confirmLoading, setConfirmLoading] = useState(false);
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

  const [formData, setFormData] = useState<{
    name: string;
    phone: string;
    email: string;
    address: string;
    gstin: string;
    customer_type: 'individual' | 'business';
  }>({
    name: '',
    phone: '',
    email: '',
    address: '',
    gstin: '',
    customer_type: 'individual',
  });

  useEffect(() => {
    fetchCustomers();
  }, []);

  const fetchCustomers = async () => {
    try {
      const response = await customersAPI.list(searchTerm);
      setCustomers(response.data);
    } catch (error) {
      console.error('Failed to fetch customers:', error);
      setCustomers([]);
    } finally {
      setLoading(false);
    }
  };
  useAutoRefresh(fetchCustomers);

  useEffect(() => {
    const timer = setTimeout(() => {
      fetchCustomers();
    }, 300);
    return () => clearTimeout(timer);
  }, [searchTerm]);

  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm, pageSize]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const submitData = {
        name: formData.name,
        phone: formData.phone,
        email: formData.email || undefined,
        address: formData.address || undefined,
        gstin: formData.gstin || undefined,
        customer_type: formData.customer_type,
      };

      if (editingId) {
        await customersAPI.update(editingId, submitData);
        showToast.success('Customer updated successfully!');
      } else {
        await customersAPI.create(submitData);
        showToast.success('Customer created successfully!');
      }
      setShowForm(false);
      setEditingId(null);
      fetchCustomers();
      setFormData({
        name: '',
        phone: '',
        email: '',
        address: '',
        gstin: '',
        customer_type: 'individual',
      });
    } catch (error: any) {
      console.error('Customer save error:', error);
      const errorMessage = error.response?.data
        ? JSON.stringify(error.response.data, null, 2)
        : error.message || 'Failed to save customer';
      showToast.error(`Failed to save customer:\n${errorMessage}`);
    }
  };

  const handleEdit = (customer: Customer) => {
    setFormData({
      name: customer.name,
      phone: customer.phone,
      email: customer.email || '',
      address: customer.address || '',
      gstin: customer.gstin || '',
      customer_type: customer.customer_type,
    });
    setEditingId(customer.id);
    setShowForm(true);
    setTimeout(() => {
      formRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }, 100);
  };

  const openDeleteDialog = (ids: number[]) => {
    const isBulk = ids.length > 1;
    setConfirmState({
      open: true,
      ids,
      title: isBulk ? 'Delete customers' : 'Delete customer',
      message: isBulk
        ? `Delete ${ids.length} customers? This will remove their purchase history.`
        : 'Delete this customer? This will remove their purchase history.',
    });
  };

  const handleConfirmDelete = async () => {
    if (confirmLoading) return;
    setConfirmLoading(true);
    try {
      if (confirmState.ids.length === 1) {
        await customersAPI.delete(confirmState.ids[0]);
      } else {
        await customersAPI.bulkDelete(confirmState.ids);
      }
      showToast.success('Customer deleted successfully!');
      removeSelection(confirmState.ids);
      fetchCustomers();
    } catch (error: any) {
      console.error('Customer deletion error:', error);
      const errorMessage = error.response?.data?.error || error.response?.data?.detail || 'Failed to delete customer';
      showToast.error(`Failed to delete customer:\n${errorMessage}`);
    } finally {
      setConfirmLoading(false);
      setConfirmState({ open: false, ids: [], title: '', message: '' });
    }
  };

  const customerTypeOptions = [
    { value: 'individual', label: 'Individual' },
    { value: 'business', label: 'Business' },
  ];

  const totalDisplayCount = customers.length;
  const totalPages = Math.max(1, Math.ceil(totalDisplayCount / pageSize));
  const pageStart = totalDisplayCount === 0 ? 0 : (currentPage - 1) * pageSize;
  const pageEnd = Math.min(pageStart + pageSize, totalDisplayCount);
  const pageLabelStart = totalDisplayCount === 0 ? 0 : pageStart + 1;
  const paginatedCustomers = customers.slice(pageStart, pageEnd);
  const paginatedIds = paginatedCustomers.map((customer) => customer.id);

  useEffect(() => {
    if (currentPage > totalPages) {
      setCurrentPage(totalPages);
    }
  }, [currentPage, totalPages]);

  if (loading) {
    return <FullScreenLoader label="Loading customers" />;
  }

  return (
    <div className="space-y-6">
      <div className="section-header">        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <p className="text-[11px] uppercase tracking-[0.3em] text-slate-600 dark:text-slate-400">Customer Vault</p>
            <h1 className="text-3xl font-semibold text-slate-900 dark:text-slate-100">Customers</h1>
            <p className="text-slate-700 dark:text-slate-300">Manage your customer database</p>
          </div>
          <HoverBorderGradient
            as="button"
            onClick={() => {
              setShowForm(!showForm);
              if (showForm) {
                setEditingId(null);
                setFormData({
                  name: '',
                  phone: '',
                  email: '',
                  address: '',
                  gstin: '',
                  customer_type: 'individual',
                });
              }
            }}
            className="bg-white/90 dark:bg-transparent text-slate-900 dark:text-slate-100"
          >
            <FiPlus className="h-4 w-4" />
            {showForm ? 'Cancel' : 'Add Customer'}
          </HoverBorderGradient>
        </div>
      </div>

      {showForm && (
        <div ref={formRef} className="rounded-2xl border border-slate-200/80 dark:border-white/10 bg-white/90 dark:bg-transparent p-6 text-slate-900 dark:text-slate-100 shadow-lg dark:shadow-[0_20px_60px_rgba(2,6,23,0.45)]">
          <h2 className="text-xl font-semibold mb-4">
            {editingId ? 'Edit Customer' : 'Create New Customer'}
          </h2>
          <form onSubmit={handleSubmit} className="grid grid-cols-2 gap-4">
            <div>
              <label htmlFor="name" className="block text-sm font-medium mb-1">Customer Name *</label>
              <input id="name" name="name"
                type="text"
                className="input"
                value={formData.name}
                autoComplete="name"
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                required
              />
            </div>

            <div>
              <label htmlFor="phone" className="block text-sm font-medium mb-1">Phone Number *</label>
              <input id="phone" name="phone"
                type="tel"
                className="input"
                value={formData.phone}
                autoComplete="tel"
                onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                required
                placeholder="10-digit phone number"
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
                placeholder="customer@example.com"
              />
            </div>

            <SearchableSelect
              label="Customer Type"
              placeholder="Select customer type..."
              required
              value={formData.customer_type}
              onChange={(value) => setFormData({ ...formData, customer_type: value as 'individual' | 'business' })}
              options={customerTypeOptions}
            />

            <div className="col-span-2">
              <label htmlFor="address" className="block text-sm font-medium mb-1">Address</label>
              <textarea id="address" name="address"
                className="input"
                rows={3}
                value={formData.address}
                onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                placeholder="Full address with city, state, pincode"
              />
            </div>

            {formData.customer_type === 'business' && (
              <div className="col-span-2">
                <label htmlFor="gstin" className="block text-sm font-medium mb-1">GSTIN</label>
                <input id="gstin" name="gstin"
                  type="text"
                  className="input"
                  value={formData.gstin}
                  autoComplete="off"
                onChange={(e) => setFormData({ ...formData, gstin: e.target.value })}
                  placeholder="15-character GSTIN"
                  maxLength={15}
                />
              </div>
            )}

            <div className="col-span-2">
              <HoverBorderGradient
                as="button"
                type="submit"
                className="w-full justify-center bg-white/90 dark:bg-transparent text-slate-900 dark:text-slate-100"
              >
                {editingId ? 'Update Customer' : 'Create Customer'}
              </HoverBorderGradient>
            </div>
          </form>
        </div>
      )}

      <div className="rounded-2xl border border-slate-200/80 dark:border-white/10 bg-white/90 dark:bg-transparent p-6 text-slate-900 dark:text-slate-100 shadow-lg dark:shadow-[0_20px_60px_rgba(2,6,23,0.45)]">
        <div className="mb-4">
          <TableSearchBar
            onSearch={setSearchTerm}
            placeholder="Search customers by name, phone, or email..."
            className="rounded-2xl border border-slate-200/80 dark:border-white/10 bg-slate-50 dark:bg-transparent p-4"
          />
        </div>
        <div className="overflow-x-auto scrollbar-hide rounded-2xl border border-slate-200/80 dark:border-white/10 bg-white dark:bg-transparent">
          <table className="table table-frost">
            <thead>
              <tr>
                <th className="w-12">
                  <input
                    name="rowSelect"
                    type="checkbox"
                    checked={isAllSelected(paginatedIds)}
                    onChange={() => toggleSelectAll(paginatedIds)}
                  />
                </th>
                <th>Name</th>
                <th>Phone</th>
                <th>Email</th>
                <th>Type</th>
                <th>Shops</th>
                <th>GSTIN</th>
                <th>Address</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {paginatedCustomers.map((customer) => (
                <tr key={customer.id}>
                  <td>
                    <input
                      name="rowSelect"
                      type="checkbox"
                      checked={isSelected(customer.id)}
                      onChange={() => toggleSelect(customer.id)}
                    />
                  </td>
                  <td className="font-medium">{customer.name}</td>
                  <td>{customer.phone}</td>
                  <td>{customer.email || '-'}</td>
                  <td>
                    <span className={`badge ${customer.customer_type === 'business' ? 'badge-info' : 'badge-secondary'}`}>
                      {customer.customer_type === 'business' ? 'Business' : 'Individual'}
                    </span>
                  </td>
                  <td>
                    {customer.shops && customer.shops.length > 0 ? (
                      <div className="flex flex-wrap gap-1">
                        {customer.shops.map((shop) => (
                          <span
                            key={shop.id}
                            className="text-xs rounded-full border border-emerald-400 dark:border-emerald-400/30 bg-emerald-100 dark:bg-emerald-500/15 px-2 py-0.5 text-emerald-700 dark:text-emerald-200"
                            title={shop.name}
                          >
                            {shop.code}
                          </span>
                        ))}
                      </div>
                    ) : (
                      <span className="text-slate-600 dark:text-slate-400 text-sm">No purchases</span>
                    )}
                  </td>
                  <td>{customer.gstin || '-'}</td>
                  <td className="max-w-xs truncate" title={customer.address || ''}>
                    {customer.address || '-'}
                  </td>
                  <td>
                    <div className="flex flex-wrap gap-2">
                      <button
                        onClick={() => handleEdit(customer)}
                        className="inline-flex items-center gap-2 rounded-full border border-sky-400 dark:border-sky-400/30 bg-sky-100 dark:bg-sky-500/15 px-3 py-1 text-xs font-semibold text-sky-700 dark:text-sky-200 transition hover:bg-sky-200 dark:hover:bg-sky-500/25"
                        title="Edit Customer"
                      >
                        <FiEdit size={14} />
                        Edit
                      </button>
                      <button
                        onClick={() => openDeleteDialog([customer.id])}
                        className="inline-flex items-center gap-2 rounded-full border border-rose-400 dark:border-rose-400/30 bg-rose-100 dark:bg-rose-500/15 px-3 py-1 text-xs font-semibold text-rose-700 dark:text-rose-200 transition hover:bg-rose-200 dark:hover:bg-rose-500/25"
                        title="Delete Customer"
                      >
                        <FiTrash size={14} />
                        Delete
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>

          {totalDisplayCount === 0 && (
            <div className="text-center py-12 text-slate-600 dark:text-slate-400">
              No customers found. Add your first customer to get started.
            </div>
          )}
        </div>

        {totalDisplayCount > 0 && (
          <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
            <span className="text-xs text-slate-600 dark:text-slate-400">
              Showing {pageLabelStart}-{pageEnd} of {totalDisplayCount} rows
            </span>
            <div className="flex flex-wrap items-center gap-3">
              <div className="flex items-center gap-2">
                <span className="text-xs uppercase tracking-[0.2em] text-slate-500 dark:text-slate-400 whitespace-nowrap">Per page</span>
                <select
                  id="pageSize"
                  className="input h-9 py-1.5 min-w-[90px] leading-tight"
                  value={pageSize}
                  onChange={(e) => setPageSize(Number(e.target.value))}
                >
                  <option value={10}>10</option>
                  <option value={25}>25</option>
                  <option value={50}>50</option>
                  <option value={100}>100</option>
                </select>
              </div>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  className="rounded-full border border-slate-200/80 dark:border-white/10 bg-white dark:bg-transparent px-3 py-1 text-xs font-semibold text-slate-700 dark:text-slate-200 transition hover:bg-slate-50 dark:hover:bg-white/10 disabled:cursor-not-allowed disabled:opacity-50"
                  onClick={() => setCurrentPage((prev) => Math.max(1, prev - 1))}
                  disabled={currentPage === 1}
                >
                  Prev
                </button>
                <span className="text-xs text-slate-500 dark:text-slate-400">
                  Page {currentPage} of {totalPages}
                </span>
                <button
                  type="button"
                  className="rounded-full border border-slate-200/80 dark:border-white/10 bg-white dark:bg-transparent px-3 py-1 text-xs font-semibold text-slate-700 dark:text-slate-200 transition hover:bg-slate-50 dark:hover:bg-white/10 disabled:cursor-not-allowed disabled:opacity-50"
                  onClick={() => setCurrentPage((prev) => Math.min(totalPages, prev + 1))}
                  disabled={currentPage >= totalPages}
                >
                  Next
                </button>
              </div>
            </div>
          </div>
        )}
      </div>

      <BulkActionBar
        selectedCount={selectedIds.length}
        onDelete={() => openDeleteDialog(selectedIds)}
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
