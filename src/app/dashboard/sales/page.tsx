'use client';

import { useEffect, useMemo, useState } from 'react';
import { salesAPI } from '@/lib/api';
import type { Sale } from '@/types';
import { FiEye, FiPrinter, FiCalendar, FiDollarSign, FiTrendingUp, FiShoppingBag, FiX } from 'react-icons/fi';
import TableSearchBar from '@/components/TableSearchBar';
import { useAutoRefresh } from '@/hooks/useAutoRefresh';
import { formatDate, formatTime } from '@/lib/date';
import FullScreenLoader from '@/components/FullScreenLoader';
import { showToast } from '@/lib/toast';

export default function SalesPage() {
  const [sales, setSales] = useState<Sale[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(25);
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [showReport, setShowReport] = useState(false);
  const [reportData, setReportData] = useState<any>(null);

  useEffect(() => {
    fetchSales();
  }, []);

  const fetchSales = async () => {
    try {
      const response = await salesAPI.list(searchTerm);
      setSales(response.data);
    } catch (error) {
      console.error('Failed to fetch sales:', error);
      setSales([]);
    } finally {
      setLoading(false);
    }
  };

  useAutoRefresh(() => {
    fetchSales();
  });

  const fetchSalesReport = async () => {
    if (!startDate || !endDate) {
      showToast.info('Please select both start and end dates');
      return;
    }

    try {
      const response = await salesAPI.salesReport({
        start_date: startDate,
        end_date: endDate,
      });
      setReportData(response.data);
      setShowReport(true);
    } catch (error) {
      console.error('Failed to fetch sales report:', error);
      showToast.error('Failed to generate report');
    }
  };

  useEffect(() => {
    const timer = setTimeout(() => {
      fetchSales();
    }, 300);
    return () => clearTimeout(timer);
  }, [searchTerm]);

  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm, pageSize]);

  const salesSummary = useMemo(() => {
    const totalSales = sales.length;
    const totalRevenue = sales.reduce((sum, sale) => (
      sum + Number.parseFloat(sale.grand_total || '0')
    ), 0);
    const totalProfit = sales.reduce((sum, sale) => (
      sum + (sale.items || []).reduce((itemSum, item) => (
        itemSum + Number.parseFloat(item.total_profit || '0')
      ), 0)
    ), 0);
    const avgSaleValue = totalSales > 0 ? totalRevenue / totalSales : 0;

    return {
      totalSales,
      totalRevenue,
      totalProfit,
      avgSaleValue,
    };
  }, [sales]);

  const handleViewInvoice = (saleId: number) => {
    window.open(`/dashboard/sales/${saleId}`, '_blank');
  };

  const totalDisplayCount = sales.length;
  const totalPages = Math.max(1, Math.ceil(totalDisplayCount / pageSize));
  const pageStart = totalDisplayCount === 0 ? 0 : (currentPage - 1) * pageSize;
  const pageEnd = Math.min(pageStart + pageSize, totalDisplayCount);
  const pageLabelStart = totalDisplayCount === 0 ? 0 : pageStart + 1;
  const paginatedSales = sales.slice(pageStart, pageEnd);

  useEffect(() => {
    if (currentPage > totalPages) {
      setCurrentPage(totalPages);
    }
  }, [currentPage, totalPages]);

  if (loading) {
    return <FullScreenLoader label="Loading sales" />;
  }


  return (
    <div className="space-y-6">
      <div className="section-header">        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <p className="text-[11px] uppercase tracking-[0.3em] text-slate-600 dark:text-slate-400">Sales Intelligence</p>
            <h1 className="text-3xl font-semibold text-slate-900 dark:text-slate-100">Sales History</h1>
            <p className="text-slate-700 dark:text-slate-300">View and manage all sales transactions</p>
          </div>
        </div>
      </div>

      {/* Sales Summary */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="rounded-2xl border border-slate-200/80 dark:border-white/10 bg-white/90 dark:bg-transparent p-5 text-slate-900 dark:text-slate-100 shadow-lg dark:shadow-[0_20px_60px_rgba(2,6,23,0.45)]">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs uppercase tracking-wider text-slate-600 dark:text-slate-400">Total Sales</p>
              <h3 className="text-2xl font-semibold">{salesSummary.totalSales}</h3>
            </div>
            <div className="flex h-11 w-11 items-center justify-center rounded-full bg-sky-500/20 text-sky-300">
              <FiShoppingBag size={22} />
            </div>
          </div>
        </div>

          <div className="rounded-2xl border border-slate-200/80 dark:border-white/10 bg-white/90 dark:bg-transparent p-5 text-slate-900 dark:text-slate-100 shadow-lg dark:shadow-[0_20px_60px_rgba(2,6,23,0.45)]">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs uppercase tracking-wider text-slate-600 dark:text-slate-400">Total Revenue</p>
                <h3 className="text-2xl font-semibold">Rs {salesSummary.totalRevenue.toFixed(2)}</h3>
              </div>
              <div className="flex h-11 w-11 items-center justify-center rounded-full bg-emerald-100 dark:bg-emerald-500/20 text-emerald-700 dark:text-emerald-300">
                <FiDollarSign size={22} />
              </div>
            </div>
          </div>

          <div className="rounded-2xl border border-slate-200/80 dark:border-white/10 bg-white/90 dark:bg-transparent p-5 text-slate-900 dark:text-slate-100 shadow-lg dark:shadow-[0_20px_60px_rgba(2,6,23,0.45)]">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs uppercase tracking-wider text-slate-600 dark:text-slate-400">Total Profit</p>
                <h3 className="text-2xl font-semibold">Rs {salesSummary.totalProfit.toFixed(2)}</h3>
              </div>
              <div className="flex h-11 w-11 items-center justify-center rounded-full bg-violet-500/20 text-violet-300">
                <FiTrendingUp size={22} />
              </div>
            </div>
          </div>

          <div className="rounded-2xl border border-slate-200/80 dark:border-white/10 bg-white/90 dark:bg-transparent p-5 text-slate-900 dark:text-slate-100 shadow-lg dark:shadow-[0_20px_60px_rgba(2,6,23,0.45)]">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs uppercase tracking-wider text-slate-600 dark:text-slate-400">Avg Sale Value</p>
                <h3 className="text-2xl font-semibold">
                  Rs {salesSummary.avgSaleValue.toFixed(2)}
                </h3>
              </div>
              <div className="flex h-11 w-11 items-center justify-center rounded-full bg-amber-500/20 text-amber-300">
                <FiCalendar size={22} />
              </div>
            </div>
          </div>
        </div>

      {/* Sales Report Generator */}
      <div className="rounded-2xl border border-slate-200/80 dark:border-white/10 bg-white/90 dark:bg-transparent p-6 text-slate-900 dark:text-slate-100 shadow-lg dark:shadow-[0_20px_60px_rgba(2,6,23,0.45)]">
        <h2 className="text-xl font-semibold mb-4">Generate Sales Report</h2>
        <div className="grid grid-cols-3 gap-4">
          <div>
            <label htmlFor="startDate" className="block text-sm font-medium mb-1">Start Date</label>
            <input id="startDate" name="startDate"
              type="date"
              className="input"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
            />
          </div>
          <div>
            <label htmlFor="endDate" className="block text-sm font-medium mb-1">End Date</label>
            <input id="endDate" name="endDate"
              type="date"
              className="input"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
            />
          </div>
          <div className="flex items-end">
            <button
              onClick={fetchSalesReport}
              className="btn btn-primary w-full"
            >
              Generate Report
            </button>
          </div>
        </div>
      </div>

      {/* Report Display */}
      {showReport && reportData && (
        <div className="rounded-2xl border border-slate-200/80 dark:border-white/10 bg-white/90 dark:bg-transparent p-6 text-slate-900 dark:text-slate-100 shadow-lg dark:shadow-[0_20px_60px_rgba(2,6,23,0.45)]">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-xl font-semibold">Sales Report</h2>
            <button
              onClick={() => setShowReport(false)}
              className="text-slate-600 dark:text-slate-400 hover:text-slate-200 transition-colors"
              aria-label="Close report"
            >
              <FiX />
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
            <div className="rounded-xl border border-slate-200/80 dark:border-white/10 bg-slate-50 dark:bg-transparent p-4">
              <p className="text-xs uppercase tracking-wider text-slate-600 dark:text-slate-400">Total Sales</p>
              <p className="text-2xl font-semibold text-slate-900 dark:text-slate-100">{reportData.total_sales}</p>
            </div>
            <div className="rounded-xl border border-slate-200/80 dark:border-white/10 bg-slate-50 dark:bg-transparent p-4">
              <p className="text-xs uppercase tracking-wider text-slate-600 dark:text-slate-400">Total Revenue</p>
              <p className="text-2xl font-semibold text-emerald-700 dark:text-emerald-300">Rs {parseFloat(reportData.total_revenue).toFixed(2)}</p>
            </div>
            <div className="rounded-xl border border-slate-200/80 dark:border-white/10 bg-slate-50 dark:bg-transparent p-4">
              <p className="text-xs uppercase tracking-wider text-slate-600 dark:text-slate-400">Total Profit</p>
              <p className="text-2xl font-semibold text-violet-300">Rs {parseFloat(reportData.total_profit).toFixed(2)}</p>
            </div>
          </div>

          {/* Daily Breakdown */}
          {reportData.daily_breakdown && reportData.daily_breakdown.length > 0 && (
            <div className="mb-6">
              <h3 className="font-semibold mb-3">Daily Breakdown</h3>
              <div className="overflow-x-auto scrollbar-hide rounded-2xl border border-slate-200/80 dark:border-white/10 bg-white dark:bg-transparent">
                <table className="table table-frost">
                  <thead>
                    <tr>
                      <th className="px-4 py-2 text-left">Date</th>
                      <th className="px-4 py-2 text-right">Sales Count</th>
                      <th className="px-4 py-2 text-right">Revenue</th>
                      <th className="px-4 py-2 text-right">Profit</th>
                    </tr>
                  </thead>
                  <tbody>
                    {reportData.daily_breakdown.map((day: any, index: number) => (
                      <tr key={index}>
                        <td className="px-4 py-2">{formatDate(day.date)}</td>
                        <td className="px-4 py-2 text-right">{day.sales_count}</td>
                        <td className="px-4 py-2 text-right text-emerald-700 dark:text-emerald-300">Rs {parseFloat(day.revenue).toFixed(2)}</td>
                        <td className="px-4 py-2 text-right text-violet-300">Rs {parseFloat(day.profit).toFixed(2)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* Top Products */}
          {reportData.top_products && reportData.top_products.length > 0 && (
            <div>
              <h3 className="font-semibold mb-3">Top Selling Products</h3>
              <div className="overflow-x-auto scrollbar-hide rounded-2xl border border-slate-200/80 dark:border-white/10 bg-white dark:bg-transparent">
                <table className="table table-frost">
                  <thead>
                    <tr>
                      <th className="px-4 py-2 text-left">Product</th>
                      <th className="px-4 py-2 text-right">Quantity Sold</th>
                      <th className="px-4 py-2 text-right">Revenue</th>
                    </tr>
                  </thead>
                  <tbody>
                    {reportData.top_products.map((product: any, index: number) => (
                      <tr key={index}>
                        <td className="px-4 py-2">{product.product_name}</td>
                        <td className="px-4 py-2 text-right font-semibold">{product.quantity_sold}</td>
                        <td className="px-4 py-2 text-right text-emerald-700 dark:text-emerald-300">Rs {parseFloat(product.revenue).toFixed(2)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Sales Table */}
      <div className="rounded-2xl border border-slate-200/80 dark:border-white/10 bg-white/90 dark:bg-transparent p-6 text-slate-900 dark:text-slate-100 shadow-lg dark:shadow-[0_20px_60px_rgba(2,6,23,0.45)]">
        <div className="mb-4">
          <TableSearchBar
            onSearch={setSearchTerm}
            placeholder="Search sales by invoice number, customer name, phone..."
          />
        </div>
        <div className="overflow-x-auto scrollbar-hide rounded-2xl border border-slate-200/80 dark:border-white/10 bg-white dark:bg-transparent">
          <table className="table table-frost">
            <thead>
              <tr>
                <th>Invoice #</th>
                <th>Date & Time</th>
                <th>Customer</th>
                <th>Items</th>
                <th>Payment Method</th>
                <th>Grand Total</th>
                <th>Status</th>
                <th>Sold By</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {paginatedSales.map((sale) => (
                <tr key={sale.id}>
                  <td className="font-medium">{sale.invoice_number}</td>
                  <td>
                    <div className="text-sm">
                      <div>{formatDate(sale.sale_date)}</div>
                      <div className="text-slate-600 dark:text-slate-400">{formatTime(sale.sale_date)}</div>
                    </div>
                  </td>
                  <td>
                    <div className="text-sm">
                      <div className="font-medium">{sale.customer_name}</div>
                      {sale.customer_phone && (
                        <div className="text-slate-600 dark:text-slate-400">{sale.customer_phone}</div>
                      )}
                    </div>
                  </td>
                  <td>{sale.items?.length || 0} items</td>
                  <td>
                    <span className="badge badge-info text-xs capitalize">
                      {sale.payment_method.replace('_', ' ')}
                    </span>
                  </td>
                  <td className="font-bold text-emerald-700 dark:text-emerald-300">
                    Rs {parseFloat(sale.grand_total).toFixed(2)}
                  </td>
                  <td>
                    <span className={`badge text-xs ${
                      sale.payment_status === 'paid' ? 'badge-success' :
                      sale.payment_status === 'partial' ? 'badge-warning' :
                      'badge-danger'
                    }`}>
                      {sale.payment_status.toUpperCase()}
                    </span>
                  </td>
                  <td className="text-sm">{sale.sold_by_name}</td>
                  <td>
                    <div className="flex flex-wrap gap-2">
                      <button
                        onClick={() => handleViewInvoice(sale.id)}
                        className="inline-flex items-center gap-2 rounded-full border border-slate-200/80 dark:border-white/10 bg-slate-50 dark:bg-transparent px-3 py-1 text-xs font-semibold text-slate-900 dark:text-slate-100 transition hover:bg-white/10"
                        title="View Invoice"
                      >
                        <FiEye size={14} />
                        View
                      </button>
                      <button
                        onClick={() => handleViewInvoice(sale.id)}
                        className="inline-flex items-center gap-2 rounded-full border border-emerald-400 dark:border-emerald-400/30 bg-emerald-100 dark:bg-emerald-500/15 px-3 py-1 text-xs font-semibold text-emerald-700 dark:text-emerald-200 transition hover:bg-emerald-200 dark:hover:bg-emerald-500/25"
                        title="Print Invoice"
                      >
                        <FiPrinter size={14} />
                        Print
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>

          {totalDisplayCount === 0 && (
            <div className="text-center py-12 text-slate-600 dark:text-slate-400">
              No sales found. Create your first sale from the POS page.
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
    </div>
  );
}
