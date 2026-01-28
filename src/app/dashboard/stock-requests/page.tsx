'use client';

import { useEffect, useState } from 'react';
import { stockRequestsAPI, stockBatchesAPI, shopsAPI } from '@/lib/api';
import { useAuth } from '@/context/AuthContext';
import type { StockRequest, StockBatch, Shop } from '@/types';
import { FiPlus, FiCheck, FiX, FiSearch, FiTrash } from 'react-icons/fi';
import SearchableSelect from '@/components/SearchableSelect';
import { useAutoRefresh } from '@/hooks/useAutoRefresh';
import { formatDate } from '@/lib/date';
import FullScreenLoader from '@/components/FullScreenLoader';
import { showToast } from '@/lib/toast';
import TableSearchBar from '@/components/TableSearchBar';
import { useMultiSelect } from '@/hooks/useMultiSelect';
import BulkActionBar from '@/components/BulkActionBar';
import { ConfirmDialog } from '@/components/ConfirmDialog';

export default function StockRequestsPage() {
  const { user } = useAuth();
  const [requests, setRequests] = useState<StockRequest[]>([]);
  const [batches, setBatches] = useState<StockBatch[]>([]);
  const [filteredBatches, setFilteredBatches] = useState<StockBatch[]>([]);
  const [shops, setShops] = useState<Shop[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [loading, setLoading] = useState(true);
  const [requestSearchTerm, setRequestSearchTerm] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(25);
  const [confirmState, setConfirmState] = useState({
    open: false,
    ids: [] as number[],
    title: '',
    message: '',
  });
  const [confirmLoading, setConfirmLoading] = useState(false);

  // Search and filter states
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCondition, setSelectedCondition] = useState<string>('');
  const [selectedBrand, setSelectedBrand] = useState<string>('');
  const [selectedVariant, setSelectedVariant] = useState<string>('');
  const [selectedColor, setSelectedColor] = useState<string>('');
  const [selectedCategory, setSelectedCategory] = useState<string>('');

  const [formData, setFormData] = useState({
    shop: '',
    stock_batch: '',
    requested_quantity: '',
    notes: '',
  });

  const [approvalData, setApprovalData] = useState({
    requestId: 0,
    approved: true,
    rejection_reason: '',
  });
  const [showApprovalModal, setShowApprovalModal] = useState(false);

  const {
    selectedIds,
    toggleSelect,
    toggleSelectAll,
    clearSelection,
    removeSelection,
    isSelected,
    isAllSelected,
  } = useMultiSelect();

  useEffect(() => {
    fetchData();
  }, []);

  // Apply filters whenever batches or filter selections change
  useEffect(() => {
    let filtered = batches.filter((batch) => batch.available_quantity > 0);

    // Text search
    if (searchTerm) {
      const term = searchTerm.toLowerCase();
      filtered = filtered.filter(
        (batch) =>
          batch.product_name?.toLowerCase().includes(term) ||
          batch.batch_number.toLowerCase().includes(term) ||
          batch.product_brand_name?.toLowerCase().includes(term)
      );
    }

    // Condition filter
    if (selectedCondition) {
      filtered = filtered.filter((b) => b.condition === selectedCondition);
    }

    // Brand filter
    if (selectedBrand) {
      filtered = filtered.filter((b) => b.product_brand_name === selectedBrand);
    }

    // Variant filter
    if (selectedVariant) {
      filtered = filtered.filter((b) => b.product_variant_name === selectedVariant);
    }

    // Color filter
    if (selectedColor) {
      filtered = filtered.filter((b) => b.product_color_name === selectedColor);
    }

    // Category filter
    if (selectedCategory) {
      filtered = filtered.filter((b) => b.product_category_name === selectedCategory);
    }

    setFilteredBatches(filtered);
  }, [batches, searchTerm, selectedCondition, selectedBrand, selectedVariant, selectedColor, selectedCategory]);

  const loadSupportingData = async () => {
    const results = await Promise.allSettled([
      stockBatchesAPI.list(),
      shopsAPI.list(),
    ]);

    const [batchesRes, shopsRes] = results;

    if (batchesRes.status === 'fulfilled') {
      setBatches(batchesRes.value.data);
    } else {
      setBatches([]);
    }

    if (shopsRes.status === 'fulfilled') {
      setShops(shopsRes.value.data);
    } else {
      setShops([]);
    }
  };

  const fetchData = async () => {
    try {
      const requestsRes = await stockRequestsAPI.list();
      setRequests(requestsRes.data);
    } catch (error) {
      console.error('Failed to fetch data:', error);
      setRequests([]);
    } finally {
      setLoading(false);
    }

    void loadSupportingData();
  };
  useAutoRefresh(fetchData);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const submitData: any = {
        stock_batch: parseInt(formData.stock_batch as string),
        requested_quantity: parseInt(formData.requested_quantity),
        notes: formData.notes,
      };

      // Only include shop if user is not a sub_stock_manager
      if (user?.role !== 'sub_stock_manager' && formData.shop) {
        submitData.shop = parseInt(formData.shop as string);
      }

      console.log('Submitting stock request data:', submitData);
      await stockRequestsAPI.create(submitData);
      setShowForm(false);
      fetchData();
      setFormData({
        shop: '',
        stock_batch: '',
        requested_quantity: '',
        notes: '',
      });
      showToast.success('Stock request created successfully');
    } catch (error: any) {
      console.error('Stock request creation error:', error);
      const errorMessage = error.response?.data
        ? JSON.stringify(error.response.data, null, 2)
        : error.message || 'Failed to create stock request';
      showToast.error(`Failed to create stock request:\n${errorMessage}`);
    }
  };

  const handleApprovalSubmit = async () => {
    try {
      await stockRequestsAPI.approve(approvalData.requestId, {
        approved: approvalData.approved,
        rejection_reason: approvalData.rejection_reason,
      });
      setShowApprovalModal(false);
      fetchData();
      showToast.info(approvalData.approved ? 'Request approved and stock transferred' : 'Request rejected');
    } catch (error: any) {
      showToast.error(error.response?.data?.error || 'Failed to process request');
    }
  };

  const openApprovalModal = (requestId: number, approved: boolean) => {
    setApprovalData({ requestId, approved, rejection_reason: '' });
    setShowApprovalModal(true);
  };

  const canCreateRequest = user?.role === 'sub_stock_manager' || user?.role === 'super_admin';
  const canApprove = user?.role === 'main_inventory_manager' || user?.role === 'super_admin';
  const canDelete = Boolean(user);

  const normalizedRequestTerm = requestSearchTerm.trim().toLowerCase();
  const filteredRequests = normalizedRequestTerm
    ? requests.filter((request) => {
        const haystack = [
          request.id,
          request.shop_name,
          request.product_name,
          request.batch_number,
          request.requested_by_name,
          request.approved_by_name,
          request.status,
          request.rejection_reason,
        ]
          .filter(Boolean)
          .map((value) => String(value).toLowerCase());
        return haystack.some((value) => value.includes(normalizedRequestTerm));
      })
    : requests;

  const totalDisplayCount = filteredRequests.length;
  const totalPages = Math.max(1, Math.ceil(totalDisplayCount / pageSize));
  const pageStart = totalDisplayCount === 0 ? 0 : (currentPage - 1) * pageSize;
  const pageEnd = Math.min(pageStart + pageSize, totalDisplayCount);
  const pageLabelStart = totalDisplayCount === 0 ? 0 : pageStart + 1;
  const paginatedRequests = filteredRequests.slice(pageStart, pageEnd);
  const paginatedIds = paginatedRequests.map((request) => request.id);

  useEffect(() => {
    setCurrentPage(1);
  }, [requestSearchTerm, pageSize]);

  useEffect(() => {
    if (currentPage > totalPages) {
      setCurrentPage(totalPages);
    }
  }, [currentPage, totalPages]);

  if (loading) {
    return <FullScreenLoader label="Loading stock requests" />;
  }

  const openDeleteDialog = (ids: number[]) => {
    const isBulk = ids.length > 1;
    setConfirmState({
      open: true,
      ids,
      title: isBulk ? 'Delete stock requests' : 'Delete stock request',
      message: isBulk
        ? `Delete ${ids.length} stock requests? This cannot be undone.`
        : 'Delete this stock request? This cannot be undone.',
    });
  };

  const handleConfirmDelete = async () => {
    if (confirmLoading) return;
    setConfirmLoading(true);
    try {
      if (confirmState.ids.length === 1) {
        await stockRequestsAPI.delete(confirmState.ids[0]);
      } else {
        await stockRequestsAPI.bulkDelete(confirmState.ids);
      }
      showToast.success('Stock request deleted successfully.');
      removeSelection(confirmState.ids);
      fetchData();
    } catch (error: any) {
      console.error('Stock request deletion error:', error);
      const errorMessage = error.response?.data?.error || error.response?.data?.detail || 'Failed to delete request';
      showToast.error(`Failed to delete request:\n${errorMessage}`);
    } finally {
      setConfirmLoading(false);
      setConfirmState({ open: false, ids: [], title: '', message: '' });
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-3xl font-bold text-slate-900 dark:text-slate-100">Stock Requests</h1>
          <p className="text-slate-700 dark:text-slate-300">Manage stock distribution requests</p>
        </div>
        {canCreateRequest && (
          <button
            onClick={() => setShowForm(!showForm)}
            className="btn btn-primary flex items-center"
          >
            <FiPlus className="mr-2" />
            {showForm ? 'Cancel' : 'Request Stock'}
          </button>
        )}
      </div>

      {showForm && (
        <div className="rounded-2xl border border-slate-200/80 dark:border-white/10 bg-white/90 dark:bg-transparent p-6 text-slate-900 dark:text-slate-100 shadow-lg dark:shadow-[0_20px_60px_rgba(2,6,23,0.45)]">
          <h2 className="text-xl font-semibold mb-4">Create Stock Request</h2>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              {user?.role !== 'sub_stock_manager' && (
                <SearchableSelect
                  label="Shop"
                  placeholder="Search and select shop..."
                  required
                  value={formData.shop}
                  onChange={(value) => setFormData({ ...formData, shop: value as string })}
                  options={shops.map((shop) => ({
                    value: shop.id,
                    label: shop.name,
                    subLabel: `Code: ${shop.code} | ${shop.address}`,
                  }))}
                />
              )}
            </div>

            {/* Search and Filter Section */}
            <div className="border rounded-lg p-4 bg-slate-50 dark:bg-transparent">
              <h3 className="text-sm font-semibold mb-3 flex items-center">
                <FiSearch className="mr-2" />
                Search & Filter Stock Batches
              </h3>

              {/* Search Bar */}
              <input id="searchTerm" name="searchTerm"
                type="text"
                className="input mb-3"
                placeholder="Search by product name, batch number, brand..."
                value={searchTerm}
                autoComplete="off"
                onChange={(e) => setSearchTerm(e.target.value)}
              />

              {/* Filters */}
              <div className="grid grid-cols-3 gap-2">
                <select id="selectedCondition" name="selectedCondition"
                  className="input text-sm"
                  value={selectedCondition}
                  onChange={(e) => setSelectedCondition(e.target.value)}
                >
                  <option value="">All Conditions</option>
                  {Array.from(new Set(batches.map((b) => b.condition))).map((condition) => (
                    <option key={condition} value={condition}>
                      {batches.find((b) => b.condition === condition)?.condition_display || condition}
                    </option>
                  ))}
                </select>

                <select id="selectedBrand" name="selectedBrand"
                  className="input text-sm"
                  value={selectedBrand}
                  onChange={(e) => setSelectedBrand(e.target.value)}
                >
                  <option value="">All Brands</option>
                  {Array.from(new Set(batches.map((b) => b.product_brand_name).filter(Boolean))).map(
                    (brand) => (
                      <option key={brand} value={brand}>
                        {brand}
                      </option>
                    )
                  )}
                </select>

                <select id="selectedVariant" name="selectedVariant"
                  className="input text-sm"
                  value={selectedVariant}
                  onChange={(e) => setSelectedVariant(e.target.value)}
                >
                  <option value="">All Variants</option>
                  {Array.from(new Set(batches.map((b) => b.product_variant_name).filter(Boolean))).map(
                    (variant) => (
                      <option key={variant} value={variant}>
                        {variant}
                      </option>
                    )
                  )}
                </select>

                <select id="selectedColor" name="selectedColor"
                  className="input text-sm"
                  value={selectedColor}
                  onChange={(e) => setSelectedColor(e.target.value)}
                >
                  <option value="">All Colors</option>
                  {Array.from(new Set(batches.map((b) => b.product_color_name).filter(Boolean))).map(
                    (color) => (
                      <option key={color} value={color}>
                        {color}
                      </option>
                    )
                  )}
                </select>

                <select id="selectedCategory" name="selectedCategory"
                  className="input text-sm col-span-2"
                  value={selectedCategory}
                  onChange={(e) => setSelectedCategory(e.target.value)}
                >
                  <option value="">All Categories</option>
                  {Array.from(new Set(batches.map((b) => b.product_category_name).filter(Boolean))).map(
                    (category) => (
                      <option key={category} value={category}>
                        {category}
                      </option>
                    )
                  )}
                </select>
              </div>

              {/* Batch Selection */}
              <div className="mt-4">
                <label htmlFor="requested_quantity" className="block text-sm font-medium mb-2">
                  Select Stock Batch * ({filteredBatches.length} available)
                </label>
                <div className="max-h-64 overflow-y-auto space-y-2 border rounded p-2 bg-white">
                  {filteredBatches.map((batch) => (
                    <div
                      key={batch.id}
                      onClick={() => setFormData({ ...formData, stock_batch: batch.id.toString() })}
                      className={`border rounded p-3 cursor-pointer transition ${
                        formData.stock_batch === batch.id.toString()
                          ? 'bg-slate-50 dark:bg-transparent border-blue-500'
                          : 'hover:bg-slate-50 dark:bg-transparent'
                      }`}
                    >
                      <div className="flex justify-between items-start">
                        <div className="flex-1">
                          <h4 className="font-semibold">{batch.product_name}</h4>
                          <div className="flex flex-wrap gap-2 mt-1">
                            {batch.product_variant_name && (
                              <span className="text-xs bg-blue-100 text-blue-800 px-2 py-0.5 rounded">
                                {batch.product_variant_name}
                              </span>
                            )}
                            {batch.product_color_name && (
                              <span className="text-xs bg-purple-100 text-purple-800 px-2 py-0.5 rounded">
                                {batch.product_color_name}
                              </span>
                            )}
                            {batch.product_brand_name && (
                              <span className="text-xs bg-gray-100 dark:bg-gray-800 text-slate-900 dark:text-slate-100 px-2 py-0.5 rounded">
                                {batch.product_brand_name}
                              </span>
                            )}
                            <span className="text-xs bg-green-100 text-green-800 px-2 py-0.5 rounded">
                              {batch.condition_display}
                            </span>
                          </div>
                          <p className="text-sm text-slate-700 dark:text-slate-300 mt-1">Batch: {batch.batch_number}</p>
                          <p className="text-sm text-slate-600 dark:text-slate-400">Available: {batch.available_quantity} units</p>
                        </div>
                        <div className="text-right ml-3">
                          <p className="text-lg font-bold text-green-600">
                            ₹{parseFloat(batch.selling_price).toFixed(2)}
                          </p>
                        </div>
                      </div>
                    </div>
                  ))}
                  {filteredBatches.length === 0 && (
                    <p className="text-slate-600 dark:text-slate-400 text-center py-4">
                      No batches available matching your filters
                    </p>
                  )}
                </div>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label htmlFor="requested_quantity" className="block text-sm font-medium mb-1">Requested Quantity *</label>
                <input id="requested_quantity" name="requested_quantity"
                  type="number"
                  className="input"
                  value={formData.requested_quantity}
                  onChange={(e) => setFormData({ ...formData, requested_quantity: e.target.value })}
                  required
                  min="1"
                  max={
                    formData.stock_batch
                      ? batches.find((b) => b.id === parseInt(formData.stock_batch))?.available_quantity
                      : undefined
                  }
                />
                {formData.stock_batch && (
                  <p className="text-xs text-slate-600 dark:text-slate-400 mt-1">
                    Max available:{' '}
                    {batches.find((b) => b.id === parseInt(formData.stock_batch))?.available_quantity} units
                  </p>
                )}
              </div>

              <div>
                <label htmlFor="notes" className="block text-sm font-medium mb-1">Notes</label>
                <textarea id="notes" name="notes"
                  className="input"
                  rows={3}
                  value={formData.notes}
                  onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                />
              </div>
            </div>

            <div>
              <button
                type="submit"
                className="btn btn-primary"
                disabled={!formData.stock_batch || !formData.requested_quantity}
              >
                Submit Request
              </button>
            </div>
          </form>
        </div>
      )}

      <div className="rounded-2xl border border-slate-200/80 dark:border-white/10 bg-white/90 dark:bg-transparent p-6 text-slate-900 dark:text-slate-100 shadow-lg dark:shadow-[0_20px_60px_rgba(2,6,23,0.45)]">
        <div className="mb-4">
          <TableSearchBar
            onSearch={setRequestSearchTerm}
            placeholder="Search requests by shop, product, batch, or status..."
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
                <th>Request ID</th>
                <th>Shop</th>
                <th>Product</th>
                <th>Batch</th>
                <th>Quantity</th>
                <th>Requested By</th>
                <th>Requested Date</th>
                <th>Status</th>
                {(canApprove || canDelete) && <th>Actions</th>}
              </tr>
            </thead>
            <tbody>
              {paginatedRequests.map((request) => (
                <tr key={request.id}>
                  <td>
                    <input
                      name="rowSelect"
                      type="checkbox"
                      checked={isSelected(request.id)}
                      onChange={() => toggleSelect(request.id)}
                    />
                  </td>
                  <td className="font-medium">#{request.id}</td>
                  <td>{request.shop_name}</td>
                  <td>{request.product_name}</td>
                  <td>{request.batch_number}</td>
                  <td>{request.requested_quantity}</td>
                  <td>{request.requested_by_name}</td>
                  <td>{formatDate(request.requested_at)}</td>
                  <td>
                    {request.status === 'pending' && (
                      <span className="badge badge-warning">Pending</span>
                    )}
                    {request.status === 'approved' && (
                      <span className="badge badge-success">Approved</span>
                    )}
                    {request.status === 'rejected' && (
                      <span className="badge badge-danger">Rejected</span>
                    )}
                  </td>
                  {(canApprove || canDelete) && (
                    <td>
                      <div className="flex flex-wrap items-center gap-2">
                        {canApprove && request.status === 'pending' && (
                          <>
                            <button
                              onClick={() => openApprovalModal(request.id, true)}
                              className="btn btn-secondary flex items-center text-sm py-1 px-2"
                            >
                              <FiCheck className="mr-1" />
                              Approve
                            </button>
                            <button
                              onClick={() => openApprovalModal(request.id, false)}
                              className="btn btn-danger flex items-center text-sm py-1 px-2"
                            >
                              <FiX className="mr-1" />
                              Reject
                            </button>
                          </>
                        )}
                        {canApprove && request.status === 'approved' && (
                          <span className="text-sm text-slate-600 dark:text-slate-400">
                            Approved by {request.approved_by_name}
                          </span>
                        )}
                        {canApprove && request.status === 'rejected' && (
                          <span className="text-sm text-slate-600 dark:text-slate-400">
                            Rejected: {request.rejection_reason}
                          </span>
                        )}
                        {canDelete && (
                          <button
                            onClick={() => openDeleteDialog([request.id])}
                            className="btn btn-outline flex items-center text-sm py-1 px-2"
                          >
                            <FiTrash className="mr-1" />
                            Delete
                          </button>
                        )}
                      </div>
                    </td>
                  )}
                </tr>
              ))}
            </tbody>
          </table>

          {totalDisplayCount === 0 && (
            <div className="text-center py-12 text-slate-600 dark:text-slate-400">
              No stock requests found.
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

      {showApprovalModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-md w-full">
            <h3 className="text-xl font-semibold mb-4">
              {approvalData.approved ? 'Approve' : 'Reject'} Stock Request
            </h3>

            {!approvalData.approved && (
              <div className="mb-4">
                <label htmlFor="rejection_reason" className="block text-sm font-medium mb-1">Rejection Reason *</label>
                <textarea id="rejection_reason" name="rejection_reason"
                  className="input"
                  rows={3}
                  value={approvalData.rejection_reason}
                  onChange={(e) =>
                    setApprovalData({ ...approvalData, rejection_reason: e.target.value })
                  }
                  required
                />
              </div>
            )}

            <div className="flex space-x-3">
              <button
                onClick={handleApprovalSubmit}
                className={`btn ${approvalData.approved ? 'btn-secondary' : 'btn-danger'} flex-1`}
                disabled={!approvalData.approved && !approvalData.rejection_reason}
              >
                Confirm
              </button>
              <button
                onClick={() => setShowApprovalModal(false)}
                className="btn btn-outline flex-1"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

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
