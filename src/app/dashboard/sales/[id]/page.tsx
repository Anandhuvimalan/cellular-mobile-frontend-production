'use client';

import { useEffect, useMemo, useState } from 'react';
import { useParams, useSearchParams } from 'next/navigation';
import { companyProfileAPI, salesAPI } from '@/lib/api';
import type { CompanyProfile, Sale } from '@/types';
import { FiPrinter, FiX } from 'react-icons/fi';
import { formatDate, formatDateTime } from '@/lib/date';

const getMediaBase = () => {
  const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000/api';
  return apiUrl.replace(/\/api\/?$/, '');
};

const buildMediaUrl = (path?: string | null) => {
  if (!path) return '';
  if (path.startsWith('http')) return path;
  return `${getMediaBase()}${path}`;
};

export default function BillPage() {
  const params = useParams();
  const searchParams = useSearchParams();
  const autoPrint = searchParams?.get('autoprint') === '1';
  const [sale, setSale] = useState<Sale | null>(null);
  const [loading, setLoading] = useState(true);
  const [companyProfile, setCompanyProfile] = useState<CompanyProfile | null>(null);
  const [profileLoaded, setProfileLoaded] = useState(false);
  const [logoLoaded, setLogoLoaded] = useState(false);
  const [logoError, setLogoError] = useState(false);
  const [autoPrintTriggered, setAutoPrintTriggered] = useState(false);

  const logoUrl = useMemo(() => buildMediaUrl(companyProfile?.logo || null), [companyProfile?.logo]);
  const logoReady = !logoUrl || logoLoaded || logoError;

  useEffect(() => {
    if (params.id) {
      setLoading(true);
      fetchBill();
      fetchCompanyProfile();
    }
  }, [params.id]);

  useEffect(() => {
    if (!logoUrl) {
      setLogoLoaded(false);
      setLogoError(false);
      return;
    }
    setLogoLoaded(false);
    setLogoError(false);
  }, [logoUrl]);

  const fetchBill = async () => {
    try {
      const response = await salesAPI.invoice(Number(params.id));
      setSale(response.data);
    } catch (error) {
      console.error('Failed to fetch bill:', error);
      setSale(null);
    } finally {
      setLoading(false);
    }
  };

  const fetchCompanyProfile = async () => {
    setProfileLoaded(false);
    try {
      const response = await companyProfileAPI.get();
      setCompanyProfile(response.data);
    } catch (error) {
      console.error('Failed to fetch company profile:', error);
      setCompanyProfile(null);
    } finally {
      setProfileLoaded(true);
    }
  };

  const triggerPrint = (afterPrint?: () => void) => {
    const originalTitle = document.title;
    document.title = '';
    const handleAfterPrint = () => {
      document.title = originalTitle;
      window.removeEventListener('afterprint', handleAfterPrint);
      if (afterPrint) afterPrint();
    };
    window.addEventListener('afterprint', handleAfterPrint);
    window.print();
  };

  const handlePrint = () => {
    triggerPrint();
  };

  useEffect(() => {
    if (!autoPrint || !sale || !profileLoaded || !logoReady || autoPrintTriggered) return;
    setAutoPrintTriggered(true);

    const timer = setTimeout(() => {
      triggerPrint(() => window.close());
    }, 300);

    return () => {
      clearTimeout(timer);
    };
  }, [autoPrint, sale, profileLoaded, logoReady, autoPrintTriggered]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mx-auto"></div>
          <p className="text-slate-600 dark:text-slate-400 mt-4">Loading bill...</p>
        </div>
      </div>
    );
  }

  if (!sale) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <p className="text-red-500 text-xl">Bill not found</p>
          <button onClick={() => window.close()} className="btn btn-primary mt-4">
            Close
          </button>
        </div>
      </div>
    );
  }

  // Calculate CGST and SGST from total GST
  const calculateGSTBreakdown = (item: any) => {
    const totalGST = parseFloat(item.gst_amount);
    const gstRate = parseFloat(item.gst_rate);
    // Assuming domestic transaction, split GST equally into CGST and SGST
    const cgst = totalGST / 2;
    const sgst = totalGST / 2;
    const cgstRate = gstRate / 2;
    const sgstRate = gstRate / 2;
    return { cgst, sgst, cgstRate, sgstRate };
  };

  const shopContact = [
    sale.shop_phone ? `Phone: ${sale.shop_phone}` : null,
    sale.shop_email ? `Email: ${sale.shop_email}` : null,
  ].filter((value): value is string => Boolean(value)).join(' | ');

  return (
    <>
      {/* Print Controls - Hidden when printing */}
      <div className="no-print fixed top-4 right-4 z-50 flex items-center gap-3 rounded-2xl border border-slate-200/70 dark:border-white/10 bg-white/90 dark:bg-slate-900/80 px-4 py-3 shadow-xl backdrop-blur">
        <button
          onClick={handlePrint}
          className="inline-flex items-center gap-2 rounded-xl bg-emerald-600 px-4 py-2 text-sm font-semibold text-white shadow-lg transition hover:bg-emerald-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-400 focus-visible:ring-offset-2 focus-visible:ring-offset-white dark:focus-visible:ring-offset-slate-900"
        >
          <FiPrinter />
          Print Bill
        </button>
        <button
          onClick={() => window.close()}
          className="inline-flex items-center gap-2 rounded-xl border border-slate-200 dark:border-white/20 bg-white px-4 py-2 text-sm font-semibold text-slate-700 shadow transition hover:-translate-y-0.5 hover:bg-slate-100 dark:bg-slate-900 dark:text-slate-100 dark:hover:bg-white/10"
        >
          <FiX />
          Close
        </button>
      </div>

      {/* Bill Container */}
      <div className="min-h-screen bg-gradient-to-br from-slate-100 via-white to-emerald-50 dark:from-slate-950 dark:via-slate-900 dark:to-slate-950 p-6 sm:p-8 print:p-0 print:bg-white print:min-h-0">
        <div className="max-w-[210mm] mx-auto rounded-2xl bg-white dark:bg-slate-950 border border-slate-300 dark:border-slate-700 print:border print:border-black shadow-2xl print:shadow-none bill-text print:rounded-none">
          {/* Header */}
          <div className="border-b border-slate-300 dark:border-slate-700 print:border-black p-4">
            <div className="flex flex-wrap items-start justify-between gap-4">
              <div className="flex items-center gap-4">
                <div className="relative flex h-14 w-14 items-center justify-center rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900">
                  <span className="text-xl font-bold text-slate-700 dark:text-slate-200">C</span>
                  {logoUrl && !logoError && (
                    <img
                      src={logoUrl}
                      alt="Company logo"
                      className={`absolute inset-0 m-auto h-12 w-12 object-contain transition-opacity ${logoLoaded ? 'opacity-100' : 'opacity-0'}`}
                      onLoad={() => setLogoLoaded(true)}
                      onError={() => setLogoError(true)}
                    />
                  )}
                </div>
                <div>
                  <h1 className="text-2xl font-semibold tracking-wide text-slate-900 dark:text-slate-100">
                    {sale.shop_name || 'Shop'}
                  </h1>
                  {sale.shop_address && (
                    <p className="text-[11px] text-slate-600 dark:text-slate-300">{sale.shop_address}</p>
                  )}
                  {shopContact && (
                    <p className="text-[10px] text-slate-600 dark:text-slate-300">{shopContact}</p>
                  )}
                </div>
              </div>
              <div className="text-right">
                <h2 className="text-sm font-semibold uppercase tracking-wider border border-slate-300 dark:border-slate-600 print:border-black px-4 py-1 text-slate-900 dark:text-slate-100">
                  GST INV - 1
                </h2>
                <p className="text-[10px] mt-1 text-slate-600 dark:text-slate-300">(Original for Recipient)</p>
              </div>
            </div>
          </div>

          {/* Invoice Info & Customer Details */}
          <div className="grid grid-cols-2 border-b border-slate-300 dark:border-slate-700 print:border-black">
            {/* Left Column - Invoice Details */}
            <div className="border-r border-slate-300 dark:border-slate-700 print:border-black p-3">
              <table className="w-full text-[11px]">
                <tbody>
                  <tr>
                    <td className="py-1 font-semibold w-32">Invoice Number:</td>
                    <td className="py-1">{sale.invoice_number}</td>
                  </tr>
                  <tr>
                    <td className="py-1 font-semibold">Invoice Date:</td>
                    <td className="py-1">{formatDate(sale.sale_date)}</td>
                  </tr>
                  <tr>
                    <td className="py-1 font-semibold">GST Number:</td>
                    <td className="py-1">32EMRPK5012B1ZG</td>
                  </tr>
                </tbody>
              </table>
            </div>

            {/* Right Column - Tax Info */}
            <div className="p-3">
              <table className="w-full text-[11px]">
                <tbody>
                  <tr>
                    <td className="py-1 font-semibold w-40 whitespace-nowrap">Tax is Payable on Reverse Charge:</td>
                    <td className="py-1 pl-3">
                      {sale.reverse_charge === undefined ? '-' : sale.reverse_charge ? 'Yes' : 'No'}
                    </td>
                  </tr>
                  <tr>
                    <td className="py-1 font-semibold">Vehicle No:</td>
                    <td className="py-1">{sale.vehicle_no || '-'}</td>
                  </tr>
                  <tr>
                    <td className="py-1 font-semibold">Date and Time of Supply:</td>
                    <td className="py-1">{formatDateTime(sale.sale_date)}</td>
                  </tr>
                  <tr>
                    <td className="py-1 font-semibold">Place of Supply:</td>
                    <td className="py-1">{sale.place_of_supply || '-'}</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>

          {/* Receiver & Consignee Details */}
          <div className="grid grid-cols-2 border-b border-slate-300 dark:border-slate-700 print:border-black">
            {/* Receiver Details */}
            <div className="border-r border-slate-300 dark:border-slate-700 print:border-black p-3">
              <h3 className="font-bold text-sm mb-2">Details of Receiver (Billed to)</h3>
              <table className="w-full text-[11px]">
                <tbody>
                  <tr>
                    <td className="py-1 font-semibold w-24">Name:</td>
                    <td className="py-1">{sale.customer_name || 'Walk-in Customer'}</td>
                  </tr>
                  <tr>
                    <td className="py-1 font-semibold">Address:</td>
                    <td className="py-1 break-words whitespace-normal">{sale.customer_address || '-'}</td>
                  </tr>
                  <tr>
                    <td className="py-1 font-semibold">State:</td>
                    <td className="py-1">Kerala</td>
                    <td className="py-1 font-semibold">State Code:</td>
                    <td className="py-1">{sale.state_code || '32'}</td>
                  </tr>
                  <tr>
                    <td className="py-1 font-semibold">Mobile No:</td>
                    <td className="py-1">{sale.customer_phone || ''}</td>
                  </tr>
                  <tr>
                    <td className="py-1 font-semibold">Email:</td>
                    <td className="py-1">{sale.customer_email || '-'}</td>
                  </tr>
                  <tr>
                    <td className="py-1 font-semibold">GST NO:</td>
                    <td className="py-1">{sale.customer_gstin || '-'}</td>
                  </tr>
                </tbody>
              </table>
            </div>

            {/* Consignee Details */}
            <div className="p-3">
              <h3 className="font-bold text-sm mb-2">Details of Consignee (Shipped to)</h3>
              <table className="w-full text-[11px]">
                <tbody>
                  <tr>
                    <td className="py-1 font-semibold w-24">Name:</td>
                    <td className="py-1">{sale.consignee_name || '-'}</td>
                  </tr>
                  <tr>
                    <td className="py-1 font-semibold">Address:</td>
                    <td className="py-1 break-words whitespace-normal">{sale.consignee_address || '-'}</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>

          {/* Items Table */}
          <div className="border-b border-slate-300 dark:border-slate-700 print:border-black">
            <table className="w-full text-[11px]">
              <thead className="text-[10px] uppercase tracking-wide text-slate-700 dark:text-slate-200">
                <tr className="bg-slate-100 dark:bg-slate-900 print:bg-gray-300 border-b border-slate-300 dark:border-slate-700 print:border-black">
                  <th className="border-r border-slate-300 dark:border-slate-700 print:border-black py-2 px-2 text-center w-12">Sl.No</th>
                  <th className="border-r border-slate-300 dark:border-slate-700 print:border-black py-2 px-2 text-left">Description of Goods</th>
                  <th className="border-r border-slate-300 dark:border-slate-700 print:border-black py-2 px-1 text-center w-16">HSN Code</th>
                  <th className="border-r border-slate-300 dark:border-slate-700 print:border-black py-2 px-1 text-center w-12">Qty</th>
                  <th className="border-r border-slate-300 dark:border-slate-700 print:border-black py-2 px-1 text-center w-16">UOM</th>
                  <th className="border-r border-slate-300 dark:border-slate-700 print:border-black py-2 px-1 text-right w-20">Unit Price</th>
                  <th className="border-r border-slate-300 dark:border-slate-700 print:border-black py-2 px-1 text-center w-20">Cash Discount</th>
                  <th className="border-r border-slate-300 dark:border-slate-700 print:border-black py-2 px-1 text-right w-24">Taxable Value</th>
                  <th className="border-r border-slate-300 dark:border-slate-700 print:border-black py-2 px-1 text-center" colSpan={2}>CGST</th>
                  <th className="border-r border-slate-300 dark:border-slate-700 print:border-black py-2 px-1 text-center" colSpan={2}>SGST</th>
                  <th className="py-2 px-1 text-right w-24">Total</th>
                </tr>
                <tr className="bg-slate-100 dark:bg-slate-900 print:bg-gray-300 border-b border-slate-300 dark:border-slate-700 print:border-black text-[10px]">
                  <th colSpan={8} className="border-r border-slate-300 dark:border-slate-700 print:border-black"></th>
                  <th className="border-r border-slate-300 dark:border-slate-700 print:border-black py-1 px-1 text-center">%</th>
                  <th className="border-r border-slate-300 dark:border-slate-700 print:border-black py-1 px-1 text-center">Amt</th>
                  <th className="border-r border-slate-300 dark:border-slate-700 print:border-black py-1 px-1 text-center">%</th>
                  <th className="border-r border-slate-300 dark:border-slate-700 print:border-black py-1 px-1 text-center">Amt</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {sale.items && sale.items.map((item, index) => {
                  const { cgst, sgst, cgstRate, sgstRate } = calculateGSTBreakdown(item);
                  const taxableValue = parseFloat(item.total_amount) - parseFloat(item.gst_amount);
                  const discountPerUnit = 0; // Can be calculated if needed

                  return (
                    <tr key={index} className="border-b border-slate-200 dark:border-slate-700">
                      <td className="border-r border-slate-200 dark:border-slate-700 py-2 px-2 text-center align-top">{index + 1}</td>
                      <td className="border-r border-slate-200 dark:border-slate-700 py-2 px-2 align-top break-normal whitespace-normal hyphens-none">
                        <div className="font-semibold">{item.product_name}</div>
                        {item.condition && (
                          <div className="text-[10px] text-slate-600 dark:text-slate-300">
                            Condition: {item.condition.replace('_', ' ')}
                          </div>
                        )}
                        {item.imei && (
                          <div className="text-[10px] text-slate-600 dark:text-slate-300 font-medium">IMEI: {item.imei}</div>
                        )}
                      </td>
                      <td className="border-r border-slate-200 dark:border-slate-700 py-2 px-1 text-center align-top">-</td>
                      <td className="border-r border-slate-200 dark:border-slate-700 py-2 px-1 text-center align-top">{item.quantity}</td>
                      <td className="border-r border-slate-200 dark:border-slate-700 py-2 px-1 text-center align-top">Nos</td>
                      <td className="border-r border-slate-200 dark:border-slate-700 py-2 px-1 text-right align-top">
                        {parseFloat(item.unit_price).toFixed(2)}
                      </td>
                      <td className="border-r border-slate-200 dark:border-slate-700 py-2 px-1 text-center align-top">0</td>
                      <td className="border-r border-slate-200 dark:border-slate-700 py-2 px-1 text-right align-top font-semibold">
                        {taxableValue.toFixed(2)}
                      </td>
                      <td className="border-r border-slate-200 dark:border-slate-700 py-2 px-1 text-center align-top">
                        {cgstRate.toFixed(2)}%
                      </td>
                      <td className="border-r border-slate-200 dark:border-slate-700 py-2 px-1 text-right align-top">
                        {cgst.toFixed(2)}
                      </td>
                      <td className="border-r border-slate-200 dark:border-slate-700 py-2 px-1 text-center align-top">
                        {sgstRate.toFixed(2)}%
                      </td>
                      <td className="border-r border-slate-200 dark:border-slate-700 py-2 px-1 text-right align-top">
                        {sgst.toFixed(2)}
                      </td>
                      <td className="py-2 px-1 text-right align-top font-semibold">
                        {parseFloat(item.total_amount).toFixed(2)}
                      </td>
                    </tr>
                  );
                })}
                {/* Empty Row */}
                <tr className="border-b border-slate-300 dark:border-slate-700 print:border-black">
                  <td className="border-r border-slate-200 dark:border-slate-700 py-1 px-2 text-center">E&OE</td>
                  <td className="border-r border-slate-200 dark:border-slate-700 py-1 px-2"></td>
                  <td className="border-r border-slate-200 dark:border-slate-700 py-1 px-1 text-center">1</td>
                  <td className="border-r border-slate-200 dark:border-slate-700 py-1 px-1 text-center"></td>
                  <td className="border-r border-slate-200 dark:border-slate-700 py-1 px-1 text-center"></td>
                  <td className="border-r border-slate-200 dark:border-slate-700 py-1 px-1 text-right">0</td>
                  <td className="border-r border-slate-200 dark:border-slate-700 py-1 px-1 text-center">0</td>
                  <td className="border-r border-slate-200 dark:border-slate-700 py-1 px-1 text-right">0</td>
                  <td className="border-r border-slate-200 dark:border-slate-700 py-1 px-1 text-center"></td>
                  <td className="border-r border-slate-200 dark:border-slate-700 py-1 px-1 text-right">0</td>
                  <td className="border-r border-slate-200 dark:border-slate-700 py-1 px-1 text-center"></td>
                  <td className="border-r border-slate-200 dark:border-slate-700 py-1 px-1 text-right">0</td>
                  <td className="py-1 px-1 text-right">0</td>
                </tr>
              </tbody>
            </table>
          </div>

          {/* Totals Section */}
          <div className="grid grid-cols-2 border-b border-slate-300 dark:border-slate-700 print:border-black">
            <div className="border-r border-slate-300 dark:border-slate-700 print:border-black p-3">
              {/* Left side can show additional info */}
            </div>
            <div className="p-3">
              <table className="w-full text-[11px]">
                <tbody>
                  {sale.discount && parseFloat(sale.discount) > 0 && (
                    <tr className="border-b border-slate-200 dark:border-slate-700">
                      <td className="py-1"></td>
                      <td className="py-1 text-right font-semibold">Discount:</td>
                      <td className="py-1 text-right w-24 text-rose-600">
                        - Rs {parseFloat(sale.discount).toFixed(2)}
                      </td>
                    </tr>
                  )}
                  <tr className="border-b border-slate-200 dark:border-slate-700">
                    <td className="py-1"></td>
                    <td className="py-1 text-right font-semibold">Transport Charge:</td>
                    <td className="py-1 text-right w-24">
                      Rs {sale.transport_charge ? parseFloat(sale.transport_charge).toFixed(2) : '0.00'}
                    </td>
                  </tr>
                  <tr className="border-b border-slate-200 dark:border-slate-700">
                    <td className="py-1"></td>
                    <td className="py-1 text-right font-semibold">Loading Charge:</td>
                    <td className="py-1 text-right">
                      Rs {sale.loading_charge ? parseFloat(sale.loading_charge).toFixed(2) : '0.00'}
                    </td>
                  </tr>
                  <tr className="border-b-2 border-slate-400 dark:border-slate-600 print:border-black">
                    <td className="py-2"></td>
                    <td className="py-2 text-right font-bold text-sm">Grand Total:</td>
                    <td className="py-2 text-right font-bold text-sm">
                      Rs {parseFloat(sale.grand_total).toFixed(2)}
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>

          {/* Terms and Conditions */}
          <div className="border-b border-slate-300 dark:border-slate-700 print:border-black p-3">
            <p className="text-[11px] font-semibold mb-2">
              Certified that the Particulars given above are true and correct and the amount indicated
            </p>
            <ol className="text-[10px] space-y-0.5 list-decimal list-inside text-slate-700 dark:text-slate-300">
              <li>
                i) Represent the price actually charged and that there is no flow additional consideration directly or
                indirectly from the buyer or
              </li>
              <li>ii) in provincial is said/some consideration directly or indirectly from the buyer</li>
              <li className="font-semibold">Terms of Sale</li>
              <li>1. Goods once sold will not be taken back or exchanged</li>
              <li>2. Seller is not responsible for any loss or damaged of goods in transit</li>
              <li>3. Buyer undertakes to submit prescribed ST declaration to sender on demand.</li>
              <li>Disputed if any will be subject to seller court jurisdiction.</li>
            </ol>
          </div>

          {/* Signature Section */}
          <div className="p-4">
            <div className="flex justify-end">
              <div className="text-center">
                <p className="text-sm font-semibold mb-8">For {sale.shop_name || 'Shop'}</p>
                <div className="border-t border-slate-300 dark:border-slate-700 print:border-black pt-1">
                  <p className="text-xs font-semibold">Authorised Signatory</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Print Styles */}
      <style jsx global>{`
        @media print {
          .no-print {
            display: none !important;
          }

          html, body {
            background: white !important;
            margin: 0 !important;
            padding: 0 !important;
            width: 210mm !important;
            height: auto !important;
            overflow: visible !important;
          }

          .bill-text,
          .bill-text td,
          .bill-text th {
            word-break: normal !important;
            overflow-wrap: normal !important;
            hyphens: none !important;
          }

          * {
            print-color-adjust: exact;
            -webkit-print-color-adjust: exact;
            overflow: visible !important;
          }

          /* Remove all scrollbars */
          *::-webkit-scrollbar {
            display: none !important;
          }

          /* Ensure the bill container takes full page without scroll */
          .min-h-screen {
            min-height: 0 !important;
            height: auto !important;
          }

          .max-w-\\[210mm\\] {
            max-width: 100% !important;
            margin: 0 !important;
            border: 1px solid black !important;
          }

          @page {
            margin: 10mm;
            size: A4 portrait;
          }
        }

        .bill-text {
          font-family: "Times New Roman", Times, serif;
          font-size: 11px;
          line-height: 1.4;
          font-variant-numeric: tabular-nums;
          color: #111827;
        }

        .dark .bill-text {
          color: #e2e8f0;
        }
      `}</style>
    </>
  );
}
