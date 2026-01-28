'use client';

import { useState } from 'react';
import Link from 'next/link';
import { FiArrowLeft, FiUploadCloud } from 'react-icons/fi';
import { stockBatchesAPI } from '@/lib/api';
import { showToast } from '@/lib/toast';
import { HoverBorderGradient } from '@/components/ui/hover-border-gradient';

type UploadResult = {
  total_rows: number;
  created: number;
  skipped: number;
  errors: Array<{ row: number; message: string }>;
};

export default function BulkAddStockBatchesPage() {
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const [result, setResult] = useState<UploadResult | null>(null);

  const handleUpload = async () => {
    if (!selectedFile) {
      showToast.info('Please choose a CSV or XLSX file to upload.');
      return;
    }

    setUploading(true);
    setResult(null);

    try {
      const response = await stockBatchesAPI.bulkUpload(selectedFile);
      setResult(response.data);
      showToast.success('Bulk upload completed.');
    } catch (error: any) {
      const errorMessage = error.response?.data?.error || error.response?.data?.detail || 'Failed to upload file.';
      showToast.error(errorMessage);
    } finally {
      setUploading(false);
    }
  };

  const columns = [
    'batch number (required)',
    'product name (required)',
    'hsn code',
    'category name',
    'category description',
    'brand name',
    'brand description',
    'color name',
    'hex code',
    'variant name',
    'variant description',
    'is imei tracked',
    'gst slab',
    'purchased quantity',
    'total purchase amount',
    'unit purchase price',
    'selling price',
    'condition',
    'source',
    'purchase date',
    'is interstate',
    'supplier name',
    'invoice number',
    'notes',
    'imei list',
    'shop columns (use shop name)',
    'payment status (paid/installment)',
    'payment amount',
    'payment method',
    'payment reference',
  ];

  return (
    <div className="space-y-6">
      <div className="section-header section-header-plain">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <p className="text-[11px] uppercase tracking-[0.3em] text-slate-600 dark:text-slate-400">Inventory Nexus</p>
            <h1 className="text-3xl font-semibold text-slate-900 dark:text-slate-100">Bulk Add Stock Batches</h1>
            <p className="text-slate-700 dark:text-slate-300">
              Upload a CSV or Excel file to create products, stock batches, and shop allocations in one go.
            </p>
          </div>
          <Link
            href="/dashboard/stock-batches"
            className="inline-flex items-center gap-2 text-sm font-semibold text-slate-700 dark:text-slate-200 hover:text-slate-900 dark:hover:text-white"
          >
            <FiArrowLeft />
            Back to Stock Batches
          </Link>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-[1.2fr_0.8fr] gap-6">
        <div className="card border-slate-200/80 dark:border-white/10 bg-white/90 dark:bg-transparent text-slate-900 dark:text-slate-100 shadow-lg">
          <div className="flex items-start justify-between gap-4 mb-4">
            <div>
              <h2 className="text-xl font-semibold">File Format</h2>
              <p className="text-sm text-slate-600 dark:text-slate-400">
                Use the column names below. Columns are case-insensitive and can be in any order.
              </p>
            </div>
            <div className="rounded-full border border-emerald-200/70 dark:border-emerald-400/30 bg-emerald-50 dark:bg-emerald-500/10 px-3 py-1 text-xs font-semibold text-emerald-700 dark:text-emerald-200">
              CSV or XLSX
            </div>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-sm text-slate-700 dark:text-slate-300">
            {columns.map((column) => (
              <div key={column} className="rounded-lg border border-slate-200/80 dark:border-white/10 bg-slate-50 dark:bg-transparent px-3 py-2">
                {column}
              </div>
            ))}
          </div>
          <div className="mt-4 rounded-xl border border-slate-200/80 dark:border-white/10 bg-slate-50 dark:bg-transparent p-4 text-sm text-slate-600 dark:text-slate-300 space-y-2">
            <p className="font-semibold text-slate-800 dark:text-slate-100">Import rules</p>
            <p>
              If the product does not exist, it is created using product name, HSN, and any category/brand/variant/color details.
            </p>
            <p>
              Purchased quantity can be skipped when IMEI list or shop columns are provided. Purchase date defaults to today.
            </p>
            <p>
              For GST, provide <span className="font-semibold">gst slab (rate)</span> (example: 18% or 5%).
            </p>
            <p>
              IMEI lists accept space or newline separated values. If the product is IMEI tracked, IMEI count must match the quantity.
            </p>
            <p>
              For shop allocation, add a column for each shop using the shop name as the column header.
              Put space-separated IMEIs in the shop column (example: <span className="font-semibold">Shop 1</span> has
              <span className="font-semibold"> 12345 67890</span>).
            </p>
            <p>
              Payment fields are optional. When provided, a payment is recorded against the purchase invoice.
            </p>
            <p>
              Use <span className="font-semibold">payment status</span> as <span className="font-semibold">paid</span> or
              <span className="font-semibold"> installment</span>. For <span className="font-semibold">paid</span>, the
              payment amount is set to the total purchase amount automatically.
            </p>
            <p>
              For <span className="font-semibold">installment</span>, set payment amount to the paid amount now. Use
              <span className="font-semibold"> 0</span> to record no payment yet.
            </p>
            <p>
              When payment amount is <span className="font-semibold">0</span>, leave payment method and reference empty.
            </p>
          </div>
        </div>

        <div className="space-y-6">
          <div className="card border-slate-200/80 dark:border-white/10 bg-white/90 dark:bg-transparent text-slate-900 dark:text-slate-100 shadow-lg">
            <h2 className="text-xl font-semibold mb-3">Upload File</h2>
            <div className="rounded-2xl border border-dashed border-slate-200/80 dark:border-white/15 bg-slate-50 dark:bg-transparent p-6 text-center">
              <FiUploadCloud className="mx-auto h-10 w-10 text-slate-400" />
              <p className="mt-3 text-sm text-slate-600 dark:text-slate-400">
                Choose a CSV or XLSX file to import stock batches.
              </p>
              <input
                id="bulk-upload-file"
                type="file"
                accept=".csv,.xlsx"
                className="hidden"
                onChange={(e) => {
                  const file = e.target.files?.[0] || null;
                  setSelectedFile(file);
                  setResult(null);
                }}
              />
              <label
                htmlFor="bulk-upload-file"
                className="mt-4 inline-flex cursor-pointer items-center justify-center gap-2 rounded-full border border-slate-200/80 bg-white px-4 py-2 text-sm font-semibold text-slate-700 transition hover:bg-slate-100 dark:border-white/10 dark:bg-white/5 dark:text-slate-200 dark:hover:bg-white/10"
              >
                Choose File
              </label>
              <p className="mt-2 text-xs text-slate-500 dark:text-slate-400">
                {selectedFile ? selectedFile.name : 'No file selected'}
              </p>
            </div>
            <HoverBorderGradient
              as="button"
              type="button"
              containerClassName="mt-4 w-full"
              className="w-full justify-center border border-emerald-500/60 bg-emerald-600 text-white shadow-lg shadow-emerald-500/20 hover:bg-emerald-500 dark:bg-emerald-500/80 dark:text-emerald-50"
              onClick={handleUpload}
              disabled={uploading}
            >
              {uploading ? 'Uploading...' : 'Upload Stock Batches'}
            </HoverBorderGradient>
          </div>

          {result && (
            <div className="card border-emerald-200/60 dark:border-emerald-400/20 bg-emerald-50 dark:bg-emerald-500/10 p-4 text-sm text-emerald-900 dark:text-emerald-100 shadow-lg">
              <p>
                Total rows processed: <strong>{result.total_rows}</strong>
              </p>
              <p>
                Created: <strong>{result.created}</strong> | Skipped: <strong>{result.skipped}</strong>
              </p>
              {result.errors?.length > 0 && (
                <div className="mt-3 text-amber-700 dark:text-amber-200">
                  <p className="font-semibold">Rows with issues:</p>
                  <ul className="mt-1 space-y-1">
                    {result.errors.slice(0, 5).map((error) => (
                      <li key={`${error.row}-${error.message}`}>
                        Row {error.row}: {error.message}
                      </li>
                    ))}
                    {result.errors.length > 5 && (
                      <li>+{result.errors.length - 5} more</li>
                    )}
                  </ul>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
