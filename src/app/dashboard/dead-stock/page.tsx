'use client';

import { useEffect, useState } from 'react';
import { stockBatchesAPI, shopsAPI } from '@/lib/api';
import type { DeadStockBatch, Shop, IMEINumber } from '@/types';
import { useAutoRefresh } from '@/hooks/useAutoRefresh';
import TableSearchBar from '@/components/TableSearchBar';
import FullScreenLoader from '@/components/FullScreenLoader';
import { showToast } from '@/lib/toast';
import { formatDate, formatDateTime } from '@/lib/date';
import { FiX } from 'react-icons/fi';
import { useAuth } from '@/context/AuthContext';
import SearchableSelect from '@/components/SearchableSelect';

export default function DeadStockPage() {
  const { user } = useAuth();
  const [deadStock, setDeadStock] = useState<DeadStockBatch[]>([]);
  const [loading, setLoading] = useState(true);
  const [days, setDays] = useState('90');
  const [hours, setHours] = useState('0');
  const [minutes, setMinutes] = useState('0');
  const [searchTerm, setSearchTerm] = useState('');
  const [shops, setShops] = useState<Shop[]>([]);
  const [selectedShop, setSelectedShop] = useState<string>('');
  const [showClearanceModal, setShowClearanceModal] = useState(false);
  const [showWriteOffModal, setShowWriteOffModal] = useState(false);
  const [selectedBatch, setSelectedBatch] = useState<DeadStockBatch | null>(null);
  const [clearancePrice, setClearancePrice] = useState('');
  const [writeOffQty, setWriteOffQty] = useState('');
  const [writeOffNotes, setWriteOffNotes] = useState('');
  const [writeOffShop, setWriteOffShop] = useState<string>('');
  const [selectedImeis, setSelectedImeis] = useState<string[]>([]);
  const [imeiSearch, setImeiSearch] = useState('');
  const [availableImeis, setAvailableImeis] = useState<IMEINumber[]>([]);
  const [loadingImeis, setLoadingImeis] = useState(false);

  const fetchDeadStock = async () => {
    try {
      const parsedDays = Number.parseInt(days, 10);
      const parsedHours = Number.parseInt(hours, 10);
      const parsedMinutes = Number.parseInt(minutes, 10);
      const safeDays = Number.isFinite(parsedDays) ? parsedDays : 0;
      const safeHours = Number.isFinite(parsedHours) ? parsedHours : 0;
      const safeMinutes = Number.isFinite(parsedMinutes) ? parsedMinutes : 0;
      const shopId = user?.role === 'sub_stock_manager'
        ? user.shop
        : (selectedShop ? Number.parseInt(selectedShop, 10) : undefined);
      const response = await stockBatchesAPI.deadStock({
        days: safeDays,
        hours: safeHours,
        minutes: safeMinutes,
        shop: Number.isFinite(shopId as number) ? (shopId as number) : undefined,
      });
      setDeadStock(response.data);
    } catch (error) {
      console.error('Failed to fetch dead stock:', error);
      setDeadStock([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDeadStock();
  }, []);

  useAutoRefresh(fetchDeadStock);

  useEffect(() => {
    if (user?.role === 'sub_stock_manager' && user?.shop) {
      setSelectedShop(String(user.shop));
    }
  }, [user]);

  useEffect(() => {
    const loadShops = async () => {
      if (user?.role === 'sub_stock_manager') {
        return;
      }
      try {
        const response = await shopsAPI.list();
        setShops(response.data);
      } catch (error) {
        console.error('Failed to load shops:', error);
        setShops([]);
      }
    };
    void loadShops();
  }, [user]);

  useEffect(() => {
    const timer = setTimeout(() => {
      fetchDeadStock();
    }, 300);
    return () => clearTimeout(timer);
  }, [days, hours, minutes, selectedShop]);

  useEffect(() => {
    if (!showWriteOffModal || !selectedBatch?.product_is_imei_tracked) {
      setAvailableImeis([]);
      return;
    }
    if (user?.role !== 'sub_stock_manager' && !writeOffShop) {
      setAvailableImeis([]);
      return;
    }

    const location = writeOffShop === 'main' ? 'main' : 'shop';
    const shopParam = writeOffShop && writeOffShop !== 'main'
      ? Number.parseInt(writeOffShop, 10)
      : undefined;

    const loadImeis = async () => {
      setLoadingImeis(true);
      setSelectedImeis([]);
      setImeiSearch('');
      try {
        const response = await stockBatchesAPI.getIMEINumbers(selectedBatch.id, {
          location,
          shop: shopParam,
        });
        setAvailableImeis(response.data);
      } catch (error) {
        console.error('Failed to load IMEI numbers:', error);
        setAvailableImeis([]);
      } finally {
        setLoadingImeis(false);
      }
    };

    void loadImeis();
  }, [showWriteOffModal, selectedBatch, writeOffShop, user]);

  const filtered = deadStock.filter((item) => {
    if (!searchTerm) return true;
    const term = searchTerm.toLowerCase();
    return (
      item.product_name?.toLowerCase().includes(term) ||
      item.batch_number.toLowerCase().includes(term)
    );
  });

  const totalValue = filtered.reduce((sum, item) => sum + (item.stock_value || 0), 0);
  const canManageBatches = ['super_admin', 'admin', 'main_inventory_manager', 'sub_stock_manager'].includes(user?.role || '');
  const showShopFilter = user?.role !== 'sub_stock_manager';
  const shopOptions = [
    { value: '', label: 'All Shops' },
    ...shops.map((shop) => ({
      value: String(shop.id),
      label: shop.name,
      subLabel: shop.code,
    })),
  ];
  const writeOffShopOptions = [
    { value: '', label: 'Select location' },
    { value: 'main', label: 'Main Stock' },
    ...shops.map((shop) => ({
      value: String(shop.id),
      label: shop.name,
      subLabel: shop.code,
    })),
  ];
  const remainingLabel = user?.role === 'sub_stock_manager' || selectedShop
    ? 'Remaining (Shop)'
    : 'Remaining (All)';

  const isImeiTracked = Boolean(selectedBatch?.product_is_imei_tracked);
  const imeiCount = isImeiTracked ? selectedImeis.length : 0;
  const availableImeiValues = availableImeis.map((imei) => imei.imei);
  const filteredImeis = availableImeis.filter((imei) => (
    imei.imei.toLowerCase().includes(imeiSearch.toLowerCase())
  ));
  const writeOffLocationLabel = writeOffShop === 'main'
    ? 'Main stock'
    : (shops.find((shop) => String(shop.id) === writeOffShop)?.name || 'Selected shop');

  const toggleImeiSelection = (imei: string) => {
    setSelectedImeis((prev) => (
      prev.includes(imei) ? prev.filter((item) => item !== imei) : [...prev, imei]
    ));
  };

  const selectFilteredImeis = () => {
    const filteredValues = filteredImeis.map((imei) => imei.imei);
    setSelectedImeis((prev) => Array.from(new Set([...prev, ...filteredValues])));
  };

  const clearSelectedImeis = () => {
    setSelectedImeis([]);
  };

  const markDead = async (batch: DeadStockBatch) => {
    try {
      await stockBatchesAPI.markDead(batch.id);
      showToast.success('Batch marked as dead stock.');
      fetchDeadStock();
    } catch (error) {
      console.error('Failed to mark dead stock:', error);
      const errorMessage = (error as any)?.response?.data?.error
        || (error as any)?.response?.data?.detail
        || 'Failed to update stock status.';
      showToast.error(errorMessage);
    }
  };

  const openClearanceModal = (batch: DeadStockBatch) => {
    setSelectedBatch(batch);
    setClearancePrice(batch.selling_price);
    setShowClearanceModal(true);
  };

  const applyClearancePrice = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedBatch) return;

    const price = parseFloat(clearancePrice || '0');
    if (price <= 0) {
      showToast.info('Enter a valid clearance price.');
      return;
    }

    try {
      await stockBatchesAPI.setClearance(selectedBatch.id, {
        selling_price: clearancePrice,
      });
      showToast.success('Clearance price applied.');
      setShowClearanceModal(false);
      setSelectedBatch(null);
      fetchDeadStock();
    } catch (error) {
      console.error('Failed to apply clearance price:', error);
      const errorMessage = (error as any)?.response?.data?.error
        || (error as any)?.response?.data?.detail
        || 'Failed to update clearance price.';
      showToast.error(errorMessage);
    }
  };

  const openWriteOffModal = (batch: DeadStockBatch) => {
    setSelectedBatch(batch);
    setWriteOffQty(batch.remaining_stock.toString());
    setWriteOffNotes('');
    setSelectedImeis([]);
    setImeiSearch('');
    setAvailableImeis([]);
    const defaultShop = user?.role === 'sub_stock_manager' && user?.shop
      ? String(user.shop)
      : selectedShop;
    setWriteOffShop(defaultShop);
    setShowWriteOffModal(true);
  };

  const applyWriteOff = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedBatch) return;

    const quantity = parseInt(writeOffQty || '0', 10);
    const imeiList = isImeiTracked ? selectedImeis : [];

    if (isImeiTracked) {
      if (imeiList.length === 0) {
        showToast.info('Select IMEI numbers to write off.');
        return;
      }
      if (new Set(imeiList).size !== imeiList.length) {
        showToast.info('Duplicate IMEI numbers detected.');
        return;
      }
    } else if (quantity <= 0) {
      showToast.info('Enter a valid write-off quantity.');
      return;
    }

    try {
      if (user?.role !== 'sub_stock_manager' && !writeOffShop) {
        showToast.info('Select Main Stock or a shop to write off from.');
        return;
      }
      const payload: { quantity?: number; notes?: string; shop?: number; imei_list?: string[] } = {
        notes: writeOffNotes,
      };
      if (isImeiTracked) {
        payload.imei_list = imeiList;
        payload.quantity = imeiList.length;
      } else {
        payload.quantity = quantity;
      }
      if (writeOffShop && writeOffShop !== 'main') {
        payload.shop = Number.parseInt(writeOffShop, 10);
      }
      await stockBatchesAPI.writeOff(selectedBatch.id, payload);
      showToast.success('Write-off recorded.');
      setShowWriteOffModal(false);
      setSelectedBatch(null);
      fetchDeadStock();
    } catch (error) {
      console.error('Failed to write off stock:', error);
      const errorMessage = (error as any)?.response?.data?.error
        || (error as any)?.response?.data?.detail
        || 'Failed to write off stock.';
      showToast.error(errorMessage);
    }
  };

  if (loading) {
    return <FullScreenLoader label="Loading dead stock" />;
  }

  return (
    <div className="space-y-6">
      <div className="section-header">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <p className="text-[11px] uppercase tracking-[0.3em] text-slate-600 dark:text-slate-400">Inventory Health</p>
            <h1 className="text-3xl font-semibold text-slate-900 dark:text-slate-100">Dead Stock</h1>
            <p className="text-slate-700 dark:text-slate-300">Review and act on slow-moving inventory</p>
          </div>
          <div className="rounded-2xl border border-rose-200/60 bg-rose-50 px-4 py-2 text-sm text-rose-800 dark:border-rose-500/30 dark:bg-rose-500/10 dark:text-rose-200">
            Total Value: Rs {totalValue.toFixed(2)}
          </div>
        </div>
      </div>

      <div className="flex flex-wrap items-center justify-between gap-4">
        <TableSearchBar
          value={searchTerm}
          onChange={(value) => setSearchTerm(value)}
          placeholder="Search by product or batch..."
        />
        <div className="flex flex-wrap items-end gap-4 text-sm text-slate-700 dark:text-slate-300">
          {showShopFilter && (
            <div className="min-w-[200px]">
              <SearchableSelect
                label="Shop"
                placeholder="All shops"
                value={selectedShop}
                onChange={(value) => setSelectedShop(String(value))}
                options={shopOptions}
              />
            </div>
          )}
          <div className={`flex flex-wrap items-end gap-3 ${showShopFilter ? 'pt-5' : ''}`}>
            <span className="font-medium">Time without sales</span>
            <div className="flex items-center gap-2">
              <input
                id="dead_stock_days"
                type="number"
                min="0"
                className="input w-20"
                value={days}
                onChange={(e) => setDays(e.target.value)}
                aria-label="Days without sales"
              />
              <span className="text-xs text-slate-500">days</span>
            </div>
            <div className="flex items-center gap-2">
              <input
                id="dead_stock_hours"
                type="number"
                min="0"
                max="23"
                className="input w-20"
                value={hours}
                onChange={(e) => setHours(e.target.value)}
                aria-label="Hours without sales"
              />
              <span className="text-xs text-slate-500">hours</span>
            </div>
            <div className="flex items-center gap-2">
              <input
                id="dead_stock_minutes"
                type="number"
                min="0"
                max="59"
                className="input w-20"
                value={minutes}
                onChange={(e) => setMinutes(e.target.value)}
                aria-label="Minutes without sales"
              />
              <span className="text-xs text-slate-500">minutes</span>
            </div>
          </div>
        </div>
      </div>

      <div className="table-card">
        <table className="table">
          <thead>
            <tr>
              <th>Product</th>
              <th>Batch</th>
              <th>Condition</th>
              <th>{remainingLabel}</th>
              <th>Last Sold</th>
              <th>Days</th>
              <th>Value</th>
              <th>Status</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map((item) => (
              <tr key={item.id}>
                <td className="font-medium">{item.product_name}</td>
                <td>{item.batch_number}</td>
                <td>{item.condition_display || item.condition}</td>
                <td>{item.remaining_stock}</td>
                <td>{item.last_sold_at ? formatDateTime(item.last_sold_at) : formatDate(item.purchase_date)}</td>
                <td>{item.days_since_last_sale}</td>
                <td>Rs {item.stock_value.toFixed(2)}</td>
                <td>
                  <span className={`badge ${
                    item.stock_status === 'clearance'
                      ? 'badge-warning'
                      : item.stock_status === 'dead'
                        ? 'badge-danger'
                        : 'badge-success'
                  }`}>
                    {item.stock_status || 'active'}
                  </span>
                </td>
                <td>
                  {canManageBatches ? (
                    <div className="flex flex-wrap gap-2">
                      <button
                        type="button"
                        onClick={() => markDead(item)}
                        className="rounded-full border border-rose-400/70 bg-rose-100 px-3 py-1 text-xs font-semibold text-rose-700 transition hover:bg-rose-200 dark:border-rose-400/30 dark:bg-rose-500/15 dark:text-rose-200"
                      >
                        Mark Dead
                      </button>
                      <button
                        type="button"
                        onClick={() => openClearanceModal(item)}
                        className="rounded-full border border-amber-400/70 bg-amber-100 px-3 py-1 text-xs font-semibold text-amber-700 transition hover:bg-amber-200 dark:border-amber-400/30 dark:bg-amber-500/15 dark:text-amber-200"
                      >
                        Clearance
                      </button>
                      <button
                        type="button"
                        onClick={() => openWriteOffModal(item)}
                        className="rounded-full border border-slate-400/70 bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-700 transition hover:bg-slate-200 dark:border-slate-400/30 dark:bg-slate-500/15 dark:text-slate-200"
                      >
                        Write Off
                      </button>
                    </div>
                  ) : (
                    <span className="text-xs text-slate-500">No actions</span>
                  )}
                </td>
              </tr>
            ))}
            {filtered.length === 0 && (
              <tr>
                <td colSpan={9} className="text-center text-slate-500">
                  No dead stock found.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {showClearanceModal && selectedBatch && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4">
          <div className="rounded-2xl border border-slate-200/80 dark:border-white/10 bg-white dark:bg-transparent w-full max-w-lg p-6 text-slate-900 dark:text-slate-100 shadow-[0_20px_60px_rgba(2,6,23,0.65)]">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h2 className="text-xl font-semibold">Set Clearance Price</h2>
                <p className="text-sm text-slate-600 dark:text-slate-400">{selectedBatch.product_name}</p>
              </div>
              <button
                type="button"
                onClick={() => setShowClearanceModal(false)}
                className="text-slate-600 dark:text-slate-400 hover:text-slate-200 transition-colors"
              >
                <FiX />
              </button>
            </div>
            <form onSubmit={applyClearancePrice} className="space-y-4">
              <div>
                <label htmlFor="clearance_price" className="block text-sm font-medium mb-1">Clearance Price *</label>
                <input
                  id="clearance_price"
                  type="number"
                  min="0"
                  step="0.01"
                  className="input"
                  value={clearancePrice}
                  onChange={(e) => setClearancePrice(e.target.value)}
                  required
                />
              </div>
              <div className="flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setShowClearanceModal(false)}
                  className="rounded-full border border-slate-200/70 px-4 py-2 text-sm text-slate-600 hover:text-slate-900 dark:border-white/10 dark:text-slate-300 dark:hover:text-slate-100"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="rounded-full bg-amber-600 px-4 py-2 text-sm font-semibold text-white hover:bg-amber-500"
                >
                  Apply Price
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {showWriteOffModal && selectedBatch && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4">
          <div className="rounded-2xl border border-slate-200/80 dark:border-white/10 bg-white dark:bg-transparent w-full max-w-lg p-6 text-slate-900 dark:text-slate-100 shadow-[0_20px_60px_rgba(2,6,23,0.65)]">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h2 className="text-xl font-semibold">Write Off Stock</h2>
                <p className="text-sm text-slate-600 dark:text-slate-400">{selectedBatch.product_name}</p>
              </div>
              <button
                type="button"
                onClick={() => setShowWriteOffModal(false)}
                className="text-slate-600 dark:text-slate-400 hover:text-slate-200 transition-colors"
              >
                <FiX />
              </button>
            </div>
            <form onSubmit={applyWriteOff} className="space-y-4">
              {!isImeiTracked && (
                <div>
                  <label htmlFor="writeoff_qty" className="block text-sm font-medium mb-1">Quantity *</label>
                  <input
                    id="writeoff_qty"
                    type="number"
                    min="1"
                    className="input"
                    value={writeOffQty}
                    onChange={(e) => setWriteOffQty(e.target.value)}
                    required
                  />
                </div>
              )}
              {user?.role !== 'sub_stock_manager' && (
                <SearchableSelect
                  label="Write off from"
                  placeholder="Main stock"
                  value={writeOffShop}
                  onChange={(value) => setWriteOffShop(String(value))}
                  options={writeOffShopOptions}
                />
              )}
              {user?.role !== 'sub_stock_manager' && (
                <p className="text-xs text-slate-500">
                  {isImeiTracked
                    ? 'Select main stock or a shop to load available IMEIs.'
                    : 'Main stock write-off reduces warehouse stock only. Choose a shop to write off shop stock.'}
                </p>
              )}
              {isImeiTracked && (
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <label className="block text-sm font-medium">Select IMEIs *</label>
                    <span className="text-xs text-slate-500">Selected: {imeiCount}</span>
                  </div>
                  <input
                    type="text"
                    className="input text-sm"
                    placeholder="Search IMEI..."
                    value={imeiSearch}
                    onChange={(e) => setImeiSearch(e.target.value)}
                  />
                  <div className="flex items-center justify-between text-xs text-slate-500">
                    <span>
                      {loadingImeis ? 'Loading IMEIs...' : `${filteredImeis.length} shown in ${writeOffLocationLabel}`}
                    </span>
                    <div className="flex items-center gap-3">
                      <button
                        type="button"
                        onClick={selectFilteredImeis}
                        className="font-semibold text-emerald-700 hover:text-emerald-600 dark:text-emerald-200 dark:hover:text-emerald-100"
                      >
                        {imeiSearch ? 'Select filtered' : 'Select all'}
                      </button>
                      <button
                        type="button"
                        onClick={clearSelectedImeis}
                        className="font-semibold text-slate-600 hover:text-slate-900 dark:text-slate-300 dark:hover:text-slate-100"
                      >
                        Clear
                      </button>
                    </div>
                  </div>
                  <div className="max-h-36 overflow-y-auto scrollbar-hide rounded-lg border border-slate-200/80 dark:border-white/10 bg-slate-50 dark:bg-black/40 p-3 space-y-2">
                    {loadingImeis && (
                      <p className="text-xs text-slate-500">Loading IMEIs...</p>
                    )}
                    {!loadingImeis && filteredImeis.length === 0 && (
                      <p className="text-xs text-slate-500">
                        {availableImeiValues.length === 0
                          ? 'No IMEIs available for this location.'
                          : 'No IMEIs match your search.'}
                      </p>
                    )}
                    {!loadingImeis && filteredImeis.map((imei) => {
                      const isSelected = selectedImeis.includes(imei.imei);
                      return (
                        <button
                          key={imei.id}
                          type="button"
                          onClick={() => toggleImeiSelection(imei.imei)}
                          className={`w-full flex items-center justify-between rounded-lg border px-3 py-2 text-left text-xs transition ${
                            isSelected
                              ? 'border-emerald-400 bg-emerald-50 text-emerald-700 dark:border-emerald-400/50 dark:bg-emerald-500/10 dark:text-emerald-200'
                              : 'border-slate-200/80 bg-white/80 text-slate-700 hover:bg-slate-100 dark:border-white/10 dark:bg-black/30 dark:text-slate-200 dark:hover:bg-white/5'
                          }`}
                        >
                          <span className="font-mono">{imei.imei}</span>
                          {isSelected && (
                            <span className="text-[10px] font-semibold uppercase tracking-wide">Selected</span>
                          )}
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}
              <div>
                <label htmlFor="writeoff_notes" className="block text-sm font-medium mb-1">Notes</label>
                <textarea
                  id="writeoff_notes"
                  className="input"
                  value={writeOffNotes}
                  onChange={(e) => setWriteOffNotes(e.target.value)}
                />
              </div>
              <p className="text-xs text-slate-500">
                {isImeiTracked
                  ? 'Write-offs remove the selected IMEIs from the chosen location.'
                  : 'Write-offs remove quantity from main stock. For shop stock, adjust via transfers first.'}
              </p>
              <div className="flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setShowWriteOffModal(false)}
                  className="rounded-full border border-slate-200/70 px-4 py-2 text-sm text-slate-600 hover:text-slate-900 dark:border-white/10 dark:text-slate-300 dark:hover:text-slate-100"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="rounded-full bg-slate-800 px-4 py-2 text-sm font-semibold text-white hover:bg-slate-700"
                >
                  Write Off
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
