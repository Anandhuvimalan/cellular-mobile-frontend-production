'use client';

import { useEffect, useState } from 'react';
import { purchaseInvoicesAPI, purchasePaymentsAPI } from '@/lib/api';
import type { PurchaseInvoice } from '@/types';
import { useAutoRefresh } from '@/hooks/useAutoRefresh';
import TableSearchBar from '@/components/TableSearchBar';
import FullScreenLoader from '@/components/FullScreenLoader';
import { showToast } from '@/lib/toast';
import { formatDate } from '@/lib/date';
import { FiDollarSign, FiX } from 'react-icons/fi';

export default function PurchaseInvoicesPage() {
  const [invoices, setInvoices] = useState<PurchaseInvoice[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [showDueOnly, setShowDueOnly] = useState(true);
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(25);
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [selectedInvoice, setSelectedInvoice] = useState<PurchaseInvoice | null>(null);
  const [paymentData, setPaymentData] = useState<{
    amount: string;
    method: 'cash' | 'card' | 'upi' | 'bank_transfer' | '';
    reference: string;
    notes: string;
  }>({
    amount: '',
    method: '',
    reference: '',
    notes: '',
  });

  const fetchInvoices = async () => {
    try {
      const response = await purchaseInvoicesAPI.list(searchTerm);
      setInvoices(response.data);
    } catch (error) {
      console.error('Failed to fetch purchase invoices:', error);
      setInvoices([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchInvoices();
  }, []);

  useAutoRefresh(fetchInvoices);

  useEffect(() => {
    const timer = setTimeout(() => {
      fetchInvoices();
    }, 300);
    return () => clearTimeout(timer);
  }, [searchTerm, showDueOnly]);

  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm, showDueOnly, pageSize]);

  const visibleInvoices = showDueOnly
    ? invoices.filter((inv) => parseFloat(inv.balance_due || '0') > 0)
    : invoices;

  const totalDue = visibleInvoices.reduce((sum, inv) => sum + parseFloat(inv.balance_due || '0'), 0);
  const totalDisplayCount = visibleInvoices.length;
  const totalPages = Math.max(1, Math.ceil(totalDisplayCount / pageSize));
  const pageStart = totalDisplayCount === 0 ? 0 : (currentPage - 1) * pageSize;
  const pageEnd = Math.min(pageStart + pageSize, totalDisplayCount);
  const pageLabelStart = totalDisplayCount === 0 ? 0 : pageStart + 1;
  const paginatedInvoices = visibleInvoices.slice(pageStart, pageEnd);

  useEffect(() => {
    if (currentPage > totalPages) {
      setCurrentPage(totalPages);
    }
  }, [currentPage, totalPages]);

  const openPaymentModal = (invoice: PurchaseInvoice) => {
    setSelectedInvoice(invoice);
    setPaymentData({
      amount: '',
      method: '',
      reference: '',
      notes: '',
    });
    setShowPaymentModal(true);
  };

  const handlePaymentSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!selectedInvoice) return;

    const amount = parseFloat(paymentData.amount || '0');
    if (amount <= 0) {
      showToast.info('Enter a valid payment amount.');
      return;
    }
    if (!paymentData.method) {
      showToast.info('Select a payment method.');
      return;
    }
    const balance = parseFloat(selectedInvoice.balance_due || '0');
    if (amount > balance) {
      showToast.info('Payment exceeds the current balance due.');
      return;
    }

    try {
      await purchasePaymentsAPI.create({
        purchase_invoice: selectedInvoice.id,
        payment_method: paymentData.method,
        amount: paymentData.amount,
        reference_number: paymentData.reference,
        notes: paymentData.notes,
      });
      showToast.success('Payment recorded successfully.');
      setShowPaymentModal(false);
      setSelectedInvoice(null);
      fetchInvoices();
    } catch (error) {
      console.error('Failed to record payment:', error);
      showToast.error('Failed to record payment.');
    }
  };

  if (loading) {
    return <FullScreenLoader label="Loading purchase invoices" />;
  }

  return (
    <div className="space-y-6">
      <div className="section-header">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <p className="text-[11px] uppercase tracking-[0.3em] text-slate-600 dark:text-slate-400">Supplier Payments</p>
            <h1 className="text-3xl font-semibold text-slate-900 dark:text-slate-100">Purchase Invoices</h1>
            <p className="text-slate-700 dark:text-slate-300">Track supplier balances and partial payments</p>
          </div>
          <div className="flex items-center gap-3">
            <div className="rounded-2xl border border-amber-200/60 bg-amber-50 px-4 py-2 text-sm text-amber-800 dark:border-amber-500/30 dark:bg-amber-500/10 dark:text-amber-200">
              Total Due: Rs {totalDue.toFixed(2)}
            </div>
          </div>
        </div>
      </div>

      <div className="flex flex-wrap items-center justify-between gap-4">
        <TableSearchBar
          value={searchTerm}
          onChange={(value) => setSearchTerm(value)}
          placeholder="Search invoices by number or supplier..."
        />
        <label className="flex items-center gap-2 text-sm text-slate-700 dark:text-slate-300">
          <input
            type="checkbox"
            checked={showDueOnly}
            onChange={(e) => setShowDueOnly(e.target.checked)}
          />
          Show due only
        </label>
      </div>

      <div className="table-card">
        <table className="table">
          <thead>
            <tr>
              <th>Invoice</th>
              <th>Supplier</th>
              <th>Date</th>
              <th>Total</th>
              <th>Paid</th>
              <th>Balance</th>
              <th>Status</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {paginatedInvoices.map((invoice) => {
              const balance = parseFloat(invoice.balance_due || '0');
              return (
                <tr key={invoice.id}>
                  <td className="font-medium">{invoice.invoice_number}</td>
                  <td>{invoice.supplier_name || '-'}</td>
                  <td>{formatDate(invoice.invoice_date)}</td>
                  <td>Rs {parseFloat(invoice.total_amount || '0').toFixed(2)}</td>
                  <td>Rs {parseFloat(invoice.amount_paid || '0').toFixed(2)}</td>
                  <td className={balance > 0 ? 'text-rose-600 font-semibold' : 'text-emerald-600 font-semibold'}>
                    Rs {balance.toFixed(2)}
                  </td>
                  <td>
                    <span className={`badge ${
                      invoice.status === 'paid'
                        ? 'badge-success'
                        : invoice.status === 'partial'
                          ? 'badge-warning'
                          : 'badge-danger'
                    }`}>
                      {invoice.status}
                    </span>
                  </td>
                  <td>
                    <button
                      type="button"
                      onClick={() => openPaymentModal(invoice)}
                      className="inline-flex items-center gap-2 rounded-full border border-emerald-400/70 bg-emerald-100 px-3 py-1 text-xs font-semibold text-emerald-700 transition hover:bg-emerald-200 dark:border-emerald-400/30 dark:bg-emerald-500/15 dark:text-emerald-200"
                      disabled={balance <= 0}
                      title={balance <= 0 ? 'Invoice paid' : 'Add payment'}
                    >
                      <FiDollarSign size={14} />
                      Add Payment
                    </button>
                  </td>
                </tr>
              );
            })}
            {totalDisplayCount === 0 && (
              <tr>
                <td colSpan={8} className="text-center text-slate-500">
                  No purchase invoices found.
                </td>
              </tr>
            )}
          </tbody>
        </table>
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

      {showPaymentModal && selectedInvoice && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4">
          <div className="rounded-2xl border border-slate-200/80 dark:border-white/10 bg-white dark:bg-transparent w-full max-w-lg p-6 text-slate-900 dark:text-slate-100 shadow-[0_20px_60px_rgba(2,6,23,0.65)]">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h2 className="text-xl font-semibold">Add Payment</h2>
                <p className="text-sm text-slate-600 dark:text-slate-400">
                  Invoice {selectedInvoice.invoice_number} - Balance Rs {parseFloat(selectedInvoice.balance_due || '0').toFixed(2)}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setShowPaymentModal(false)}
                className="text-slate-600 dark:text-slate-400 hover:text-slate-200 transition-colors"
              >
                <FiX />
              </button>
            </div>
            <form onSubmit={handlePaymentSubmit} className="space-y-4">
              <div>
                <label htmlFor="payment_amount" className="block text-sm font-medium mb-1">Amount *</label>
                <input
                  id="payment_amount"
                  type="number"
                  min="0"
                  step="0.01"
                  className="input"
                  value={paymentData.amount}
                  onChange={(e) => setPaymentData({ ...paymentData, amount: e.target.value })}
                  required
                />
              </div>
              <div>
                <label htmlFor="payment_method" className="block text-sm font-medium mb-1">Payment Method *</label>
                <select
                  id="payment_method"
                  className="input"
                  value={paymentData.method}
                  onChange={(e) =>
                    setPaymentData({ ...paymentData, method: e.target.value as typeof paymentData.method })
                  }
                  required
                >
                  <option value="">Select method</option>
                  <option value="cash">Cash</option>
                  <option value="card">Card</option>
                  <option value="upi">UPI</option>
                  <option value="bank_transfer">Bank Transfer</option>
                </select>
              </div>
              <div>
                <label htmlFor="payment_reference" className="block text-sm font-medium mb-1">Reference</label>
                <input
                  id="payment_reference"
                  type="text"
                  className="input"
                  value={paymentData.reference}
                  onChange={(e) => setPaymentData({ ...paymentData, reference: e.target.value })}
                />
              </div>
              <div>
                <label htmlFor="payment_notes" className="block text-sm font-medium mb-1">Notes</label>
                <textarea
                  id="payment_notes"
                  className="input"
                  value={paymentData.notes}
                  onChange={(e) => setPaymentData({ ...paymentData, notes: e.target.value })}
                />
              </div>
              <div className="flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setShowPaymentModal(false)}
                  className="rounded-full border border-slate-200/70 px-4 py-2 text-sm text-slate-600 hover:text-slate-900 dark:border-white/10 dark:text-slate-300 dark:hover:text-slate-100"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="rounded-full bg-emerald-600 px-4 py-2 text-sm font-semibold text-white hover:bg-emerald-500"
                >
                  Save Payment
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
