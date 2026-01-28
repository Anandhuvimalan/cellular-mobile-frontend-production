'use client';

import { useEffect, useState } from 'react';
import { subStocksAPI } from '@/lib/api';
import type { SubStock } from '@/types';
import { FiAlertCircle, FiTrash } from 'react-icons/fi';
import { useAutoRefresh } from '@/hooks/useAutoRefresh';
import { formatDate } from '@/lib/date';
import FullScreenLoader from '@/components/FullScreenLoader';
import TableSearchBar from '@/components/TableSearchBar';
import { useMultiSelect } from '@/hooks/useMultiSelect';
import BulkActionBar from '@/components/BulkActionBar';
import { ConfirmDialog } from '@/components/ConfirmDialog';
import { showToast } from '@/lib/toast';

export default function SubStocksPage() {
  const [subStocks, setSubStocks] = useState<SubStock[]>([]);
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
    fetchSubStocks();
  }, []);

  const fetchSubStocks = async () => {
    try {
      const response = await subStocksAPI.list();
      setSubStocks(response.data);
    } catch (error) {
      console.error('Failed to fetch sub stocks:', error);
      setSubStocks([]);
    } finally {
      setLoading(false);
    }
  };
  useAutoRefresh(fetchSubStocks);

  const lowStockItems = subStocks.filter((item) => item.is_low_stock);
  const normalizedTerm = searchTerm.trim().toLowerCase();
  const filteredSubStocks = normalizedTerm
    ? subStocks.filter((item) => {
        const haystack = [
          item.shop_name,
          item.product_name,
          item.batch_number,
          item.quantity,
          item.reorder_level,
        ]
          .filter(Boolean)
          .map((value) => String(value).toLowerCase());
        return haystack.some((value) => value.includes(normalizedTerm));
      })
    : subStocks;

  const totalDisplayCount = filteredSubStocks.length;
  const totalPages = Math.max(1, Math.ceil(totalDisplayCount / pageSize));
  const pageStart = totalDisplayCount === 0 ? 0 : (currentPage - 1) * pageSize;
  const pageEnd = Math.min(pageStart + pageSize, totalDisplayCount);
  const pageLabelStart = totalDisplayCount === 0 ? 0 : pageStart + 1;
  const paginatedSubStocks = filteredSubStocks.slice(pageStart, pageEnd);
  const paginatedIds = paginatedSubStocks.map((item) => item.id);

  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm, pageSize]);

  useEffect(() => {
    if (currentPage > totalPages) {
      setCurrentPage(totalPages);
    }
  }, [currentPage, totalPages]);

  if (loading) {
    return <FullScreenLoader label="Loading sub-stocks" />;
  }

  const openDeleteDialog = (ids: number[]) => {
    const isBulk = ids.length > 1;
    setConfirmState({
      open: true,
      ids,
      title: isBulk ? 'Delete sub-stocks' : 'Delete sub-stock',
      message: isBulk
        ? `Delete ${ids.length} sub-stock records? This cannot be undone.`
        : 'Delete this sub-stock record? This cannot be undone.',
    });
  };

  const handleConfirmDelete = async () => {
    if (confirmLoading) return;
    setConfirmLoading(true);
    try {
      if (confirmState.ids.length === 1) {
        await subStocksAPI.delete(confirmState.ids[0]);
      } else {
        await subStocksAPI.bulkDelete(confirmState.ids);
      }
      showToast.success('Sub-stock deleted successfully.');
      removeSelection(confirmState.ids);
      fetchSubStocks();
    } catch (error: any) {
      console.error('Sub-stock deletion error:', error);
      const errorMessage = error.response?.data?.error || error.response?.data?.detail || 'Failed to delete sub-stock';
      showToast.error(`Failed to delete sub-stock:\n${errorMessage}`);
    } finally {
      setConfirmLoading(false);
      setConfirmState({ open: false, ids: [], title: '', message: '' });
    }
  };

  return (
    <div className="space-y-6">
      <div className="section-header">        <div>
          <p className="text-[11px] uppercase tracking-[0.3em] text-slate-600 dark:text-slate-400">Stock Grid</p>
          <h1 className="text-3xl font-semibold text-slate-900 dark:text-slate-100">Sub-Stock (Shop Inventory)</h1>
          <p className="text-slate-700 dark:text-slate-300">View stock levels across all shops</p>
        </div>
      </div>

      {lowStockItems.length > 0 && (
        <div className="rounded-2xl border border-rose-400 dark:border-rose-400/30 bg-rose-100 dark:bg-rose-500/10 px-4 py-3 text-rose-700 dark:text-rose-200 mb-6 flex items-start">
          <FiAlertCircle className="mr-2 mt-1 flex-shrink-0" size={20} />
          <div>
            <p className="font-semibold">Low Stock Alert!</p>
            <p className="text-sm">
              {lowStockItems.length} item{lowStockItems.length > 1 ? 's' : ''} below reorder level
            </p>
          </div>
        </div>
      )}

      <div className="rounded-2xl border border-slate-200/80 dark:border-white/10 bg-white/90 dark:bg-transparent p-6 text-slate-900 dark:text-slate-100 shadow-lg dark:shadow-[0_20px_60px_rgba(2,6,23,0.45)]">
        <div className="mb-4">
          <TableSearchBar
            onSearch={setSearchTerm}
            placeholder="Search sub-stock by shop, product, batch..."
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
                <th>Shop</th>
                <th>Product</th>
                <th>Batch Number</th>
                <th>Quantity</th>
                <th>Reorder Level</th>
                <th>Selling Price</th>
                <th>Status</th>
                <th>Last Updated</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {paginatedSubStocks.map((subStock) => (
                <tr key={subStock.id} className={subStock.is_low_stock ? 'bg-rose-500/10' : ''}>
                  <td>
                    <input
                      name="rowSelect"
                      type="checkbox"
                      checked={isSelected(subStock.id)}
                      onChange={() => toggleSelect(subStock.id)}
                    />
                  </td>
                  <td className="font-medium">{subStock.shop_name}</td>
                  <td>{subStock.product_name}</td>
                  <td>{subStock.batch_number}</td>
                  <td>
                    <span className={subStock.is_low_stock ? 'text-rose-700 dark:text-rose-300 font-bold' : 'font-medium'}>
                      {subStock.quantity}
                    </span>
                  </td>
                  <td>{subStock.reorder_level}</td>
                  <td>Rs {parseFloat(subStock.selling_price || '0').toFixed(2)}</td>
                  <td>
                    {subStock.is_low_stock ? (
                      <span className="badge badge-danger flex items-center w-fit">
                        <FiAlertCircle className="mr-1" size={14} />
                        Low Stock
                      </span>
                    ) : subStock.quantity === 0 ? (
                      <span className="badge badge-danger">Out of Stock</span>
                    ) : (
                      <span className="badge badge-success">In Stock</span>
                    )}
                  </td>
                  <td>{formatDate(subStock.updated_at)}</td>
                  <td>
                    <button
                      onClick={() => openDeleteDialog([subStock.id])}
                      className="inline-flex items-center gap-2 rounded-full border border-rose-400 dark:border-rose-400/30 bg-rose-100 dark:bg-rose-500/15 px-3 py-1 text-xs font-semibold text-rose-700 dark:text-rose-200 transition hover:bg-rose-200 dark:hover:bg-rose-500/25"
                      title="Delete Sub-Stock"
                    >
                      <FiTrash size={14} />
                      Delete
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>

          {totalDisplayCount === 0 && (
            <div className="text-center py-12 text-slate-600 dark:text-slate-400">
              No sub-stock items found. Stock will appear here once distributed to shops.
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

      <div className="mt-6 grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="rounded-2xl border border-slate-200/80 dark:border-white/10 bg-white/90 dark:bg-transparent p-6 text-slate-900 dark:text-slate-100 shadow-lg dark:shadow-[0_20px_60px_rgba(2,6,23,0.45)]">
          <h3 className="text-lg font-semibold mb-2">Total Items</h3>
          <p className="text-3xl font-bold text-sky-700 dark:text-sky-300">{subStocks.length}</p>
        </div>
        <div className="rounded-2xl border border-slate-200/80 dark:border-white/10 bg-white/90 dark:bg-transparent p-6 text-slate-900 dark:text-slate-100 shadow-lg dark:shadow-[0_20px_60px_rgba(2,6,23,0.45)]">
          <h3 className="text-lg font-semibold mb-2">Low Stock Items</h3>
          <p className="text-3xl font-bold text-rose-700 dark:text-rose-300">{lowStockItems.length}</p>
        </div>
        <div className="rounded-2xl border border-slate-200/80 dark:border-white/10 bg-white/90 dark:bg-transparent p-6 text-slate-900 dark:text-slate-100 shadow-lg dark:shadow-[0_20px_60px_rgba(2,6,23,0.45)]">
          <h3 className="text-lg font-semibold mb-2">Total Quantity</h3>
          <p className="text-3xl font-bold text-emerald-700 dark:text-emerald-300">
            {subStocks.reduce((sum, item) => sum + item.quantity, 0)}
          </p>
        </div>
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
