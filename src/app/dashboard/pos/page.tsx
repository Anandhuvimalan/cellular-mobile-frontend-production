'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { salesAPI, customersAPI, stockBatchesAPI, shopsAPI, subStocksAPI } from '@/lib/api';
import { useAuth } from '@/context/AuthContext';
import type { Customer, StockBatch, Shop, IMEINumber, SubStock } from '@/types';
import { FiShoppingCart, FiTrash, FiSearch, FiPlus, FiMinus, FiPrinter, FiTruck, FiX } from 'react-icons/fi';
import SearchableSelect from '@/components/SearchableSelect';
import { showToast } from '@/lib/toast';

interface CartItem {
  stock_batch_id: number;
  batch_number: string;
  product_name: string;
  condition: string;
  unit_price: number;
  gst_rate: number;
  quantity: number;
  imei?: string;
  is_imei_tracked: boolean;
  available_quantity: number;
}

export default function POSPage() {
  const { user } = useAuth();
  const router = useRouter();
  const [cart, setCart] = useState<CartItem[]>([]);
  const [batches, setBatches] = useState<StockBatch[]>([]);
  const [filteredBatches, setFilteredBatches] = useState<StockBatch[]>([]);
  const [shops, setShops] = useState<Shop[]>([]);
  const [subStocks, setSubStocks] = useState<SubStock[]>([]);
  const [selectedShop, setSelectedShop] = useState<number | string>('');
  const [searchTerm, setSearchTerm] = useState('');
  const [customerPhone, setCustomerPhone] = useState('');
  const [customerName, setCustomerName] = useState('');
  const [customerEmail, setCustomerEmail] = useState('');
  const [customerGstin, setCustomerGstin] = useState('');
  const [customerAddress, setCustomerAddress] = useState('');
  const [stateCode, setStateCode] = useState('32');
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null);
  const [paymentMethod, setPaymentMethod] = useState<string>('cash');
  const [paymentReference, setPaymentReference] = useState('');
  const [discount, setDiscount] = useState('0');
  const [transportCharge, setTransportCharge] = useState('0');
  const [loadingCharge, setLoadingCharge] = useState('0');
  const [notes, setNotes] = useState('');
  const [reverseCharge, setReverseCharge] = useState<'yes' | 'no' | ''>('');
  const [vehicleNo, setVehicleNo] = useState('');
  const [placeOfSupply, setPlaceOfSupply] = useState('');
  const [consigneeName, setConsigneeName] = useState('');
  const [consigneeAddress, setConsigneeAddress] = useState('');
  const [loading, setLoading] = useState(false);

  // Filter states
  const [selectedCondition, setSelectedCondition] = useState<string>('');
  const [selectedBrand, setSelectedBrand] = useState<string>('');
  const [selectedVariant, setSelectedVariant] = useState<string>('');
  const [selectedColor, setSelectedColor] = useState<string>('');
  const [selectedCategory, setSelectedCategory] = useState<string>('');
  const [lastSaleId, setLastSaleId] = useState<number | null>(null);
  const [lastSaleAmount, setLastSaleAmount] = useState<number>(0);
  const [lastSaleItemCount, setLastSaleItemCount] = useState<number>(0);
  const [showBillSummary, setShowBillSummary] = useState(false);
  const [showImeiModal, setShowImeiModal] = useState(false);
  const [imeiBatch, setImeiBatch] = useState<StockBatch | null>(null);
  const [imeiOptions, setImeiOptions] = useState<IMEINumber[]>([]);
  const [imeiSearch, setImeiSearch] = useState('');
  const [selectedImei, setSelectedImei] = useState('');
  const [loadingImeis, setLoadingImeis] = useState(false);

  useEffect(() => {
    fetchShops();
    fetchSubStocks();
  }, []);

  useEffect(() => {
    if (user?.role === 'admin' || !user?.shop) {
      router.replace('/dashboard');
    }
  }, [router, user]);

  if (user?.role === 'admin' || !user?.shop) {
    return (
      <div className="text-center py-12">
        Point of Sale requires an assigned shop.
      </div>
    );
  }

  // Auto-select user's shop ONLY for sub-stock managers
  useEffect(() => {
    if (user?.role === 'sub_stock_manager' && user?.shop && shops.length > 0) {
      setSelectedShop(user.shop);
    }
  }, [user, shops]);

  useEffect(() => {
    if (searchTerm && selectedShop) {
      fetchBatches();
    }
  }, [searchTerm, selectedShop]); // Don't add subStocks to avoid infinite loop

  // Apply filters whenever batches or filter selections change
  useEffect(() => {
    let filtered = batches;

    if (selectedCondition) {
      filtered = filtered.filter(b => b.condition === selectedCondition);
    }
    if (selectedBrand) {
      filtered = filtered.filter(b => b.product_brand_name === selectedBrand);
    }
    if (selectedVariant) {
      filtered = filtered.filter(b => b.product_variant_name === selectedVariant);
    }
    if (selectedColor) {
      filtered = filtered.filter(b => b.product_color_name === selectedColor);
    }
    if (selectedCategory) {
      filtered = filtered.filter(b => b.product_category_name === selectedCategory);
    }

    setFilteredBatches(filtered);
  }, [batches, selectedCondition, selectedBrand, selectedVariant, selectedColor, selectedCategory]);

  const fetchShops = async () => {
    try {
      const response = await shopsAPI.list();
      setShops(response.data);
      // DO NOT auto-select shop for admins
      // Sub-stock managers get their shop auto-selected in useEffect above
    } catch (error) {
      console.error('Failed to fetch shops:', error);
    }
  };

  const fetchSubStocks = async () => {
    try {
      const response = await subStocksAPI.list();
      setSubStocks(response.data);
    } catch (error) {
      console.error('Failed to fetch sub-stocks:', error);
    }
  };

  const fetchBatches = async () => {
    try {
      const response = await stockBatchesAPI.list(searchTerm);

      // CRITICAL FILTER: Only show batches that have sub-stock in the current shop
      // This ensures POS only shows products physically available in the shop
      const batchesWithStock = response.data.filter(batch => {
        // Check if this batch has sub-stock in the selected shop with quantity > 0
        const subStock = subStocks.find(
          ss => ss.stock_batch === batch.id && ss.shop === Number(selectedShop)
        );

        // Only return true if sub-stock exists AND has quantity > 0
        return subStock && subStock.quantity > 0;
      });

      setBatches(batchesWithStock);
      console.log(`Filtered ${response.data.length} batches to ${batchesWithStock.length} with stock in shop`);
    } catch (error) {
      console.error('Failed to fetch batches:', error);
    }
  };

  const addBatchToCart = (batch: StockBatch, imei?: string) => {
    const subStock = subStocks.find(
      ss => ss.stock_batch === batch.id && ss.shop === Number(selectedShop)
    );
    const shopQuantity = subStock?.quantity || 0;

    if (shopQuantity <= 0) {
      showToast.info('This product is not available in the selected shop');
      return;
    }

    const newItem: CartItem = {
      stock_batch_id: batch.id,
      batch_number: batch.batch_number,
      product_name: batch.product_name || 'Unknown Product',
      condition: batch.condition_display || batch.condition,
      unit_price: parseFloat(batch.selling_price),
      gst_rate: parseFloat(batch.gst_rate || '0'),
      quantity: 1,
      imei,
      is_imei_tracked: batch.product_is_imei_tracked || false,
      available_quantity: shopQuantity,
    };

    setCart((prev) => {
      if (imei && prev.some(item => item.stock_batch_id === batch.id && item.imei === imei)) {
        showToast.info('This IMEI is already in the cart');
        return prev;
      }
      return [...prev, newItem];
    });
  };

  const openImeiSelector = async (batch: StockBatch) => {
    if (!selectedShop) {
      showToast.info('Please select a shop first');
      return;
    }

    setShowImeiModal(true);
    setImeiBatch(batch);
    setImeiOptions([]);
    setSelectedImei('');
    setImeiSearch('');
    setLoadingImeis(true);

    try {
      const response = await stockBatchesAPI.getIMEINumbers(batch.id, {
        shop: Number(selectedShop),
        location: 'shop',
      });

      const selectedIMEIs = cart
        .filter(item => item.stock_batch_id === batch.id && item.imei)
        .map(item => item.imei);

      const availableIMEIs = response.data.filter(
        (imeiObj: IMEINumber) =>
          imeiObj.status === 'in_sub_stock' && !selectedIMEIs.includes(imeiObj.imei)
      );

      setImeiOptions(availableIMEIs);

      if (availableIMEIs.length === 0) {
        showToast.info('No IMEI numbers available in this shop for this batch');
      }
    } catch (error) {
      console.error('Failed to fetch IMEI numbers:', error);
      showToast.error('Failed to load IMEI numbers. Please try again.');
      setImeiOptions([]);
    } finally {
      setLoadingImeis(false);
    }
  };

  const closeImeiModal = () => {
    setShowImeiModal(false);
    setImeiBatch(null);
    setImeiOptions([]);
    setSelectedImei('');
    setImeiSearch('');
    setLoadingImeis(false);
  };

  const confirmImeiSelection = () => {
    if (!imeiBatch) {
      return;
    }
    if (!selectedImei) {
      showToast.info('Select an IMEI to continue');
      return;
    }
    addBatchToCart(imeiBatch, selectedImei);
    closeImeiModal();
  };

  const handleSearchCustomer = async () => {
    if (!customerPhone.trim()) {
      showToast.info('Please enter a phone number');
      return;
    }

    try {
      const response = await customersAPI.searchByPhone(customerPhone);
      setSelectedCustomer(response.data);
      setCustomerName(response.data.name);
      setCustomerEmail(response.data.email || '');
      setCustomerGstin(response.data.gstin || '');
      setCustomerAddress(response.data.address || '');
      showToast.info(`Customer found: ${response.data.name}`);
    } catch (error: any) {
      if (error.response?.status === 404) {
        setSelectedCustomer(null);
        setCustomerName('');
        setCustomerEmail('');
        setCustomerGstin('');
        setCustomerAddress('');
        const createNew = confirm('Customer not found. Do you want to create a new customer with this phone number?');
        if (createNew) {
          const name = prompt('Enter customer name:');
          if (name) {
            setCustomerName(name);
          }
        }
      } else {
        console.error('Error searching customer:', error);
        showToast.error('Failed to search customer');
      }
    }
  };

  const addToCart = async (batch: StockBatch) => {
    if (batch.product_is_imei_tracked) {
      await openImeiSelector(batch);
      return;
    }
    // Check if already in cart (non-IMEI tracked only)
    const existingItem = cart.find(item => item.stock_batch_id === batch.id && !item.imei);
    if (existingItem) {
      updateQuantity(batch.id, existingItem.quantity + 1);
      return;
    }
    addBatchToCart(batch);
  };

  const updateQuantity = (batchId: number, newQuantity: number) => {
    const item = cart.find(i => i.stock_batch_id === batchId);
    if (!item) return;

    if (newQuantity > item.available_quantity) {
      showToast.info(`Only ${item.available_quantity} units available`);
      return;
    }

    if (newQuantity < 1) {
      removeFromCart(batchId);
      return;
    }

    setCart(cart.map(item =>
      item.stock_batch_id === batchId ? { ...item, quantity: newQuantity } : item
    ));
  };

  const removeFromCart = (batchId: number, imei?: string) => {
    setCart(cart.filter(item => {
      if (item.stock_batch_id !== batchId) {
        return true;
      }
      if (item.is_imei_tracked) {
        if (!imei) {
          return true;
        }
        return item.imei !== imei;
      }
      return false;
    }));
  };

  const calculateSubtotal = () => {
    return cart.reduce((sum, item) => {
      const itemAmount = item.unit_price * item.quantity;
      const itemGst = (itemAmount * item.gst_rate) / (100 + item.gst_rate);
      return sum + (itemAmount - itemGst);
    }, 0);
  };

  const calculateTotalGST = () => {
    return cart.reduce((sum, item) => {
      const itemAmount = item.unit_price * item.quantity;
      const itemGst = (itemAmount * item.gst_rate) / (100 + item.gst_rate);
      return sum + itemGst;
    }, 0);
  };

  const calculateGrandTotal = () => {
    const subtotal = calculateSubtotal();
    const gst = calculateTotalGST();
    const discountAmount = parseFloat(discount) || 0;
    const transport = parseFloat(transportCharge) || 0;
    const loadingChrg = parseFloat(loadingCharge) || 0;
    return subtotal + gst - discountAmount + transport + loadingChrg;
  };

  const handleSubmitSale = async () => {
    if (!selectedShop) {
      showToast.info('Please select a shop');
      return;
    }

    if (cart.length === 0) {
      showToast.info('Cart is empty. Add items to create a sale.');
      return;
    }

    if (!customerName.trim()) {
      showToast.info('Please enter customer name or search by phone');
      return;
    }

    if (!customerPhone.trim() && !selectedCustomer) {
      showToast.info('Please enter customer phone number');
      return;
    }

    if (!customerEmail.trim()) {
      showToast.info('Please enter customer email');
      return;
    }

    if (!customerGstin.trim()) {
      showToast.info('Please enter customer GSTIN');
      return;
    }

    if (!reverseCharge) {
      showToast.info('Please select reverse charge (yes or no)');
      return;
    }

    setLoading(true);
    try {
      const saleData = {
        shop: parseInt(selectedShop as string),
        customer_name: customerName,
        customer_phone: customerPhone || undefined,
        customer_email: customerEmail.trim(),
        customer_gstin: customerGstin.trim(),
        customer_address: customerAddress || undefined,
        customer: selectedCustomer?.id,
        state_code: stateCode || '32',
        items: cart.map(item => {
          const itemData: any = {
            stock_batch: item.stock_batch_id,
            quantity: item.quantity,
          };
          // Only include IMEI if it's defined
          if (item.imei) {
            itemData.imei = item.imei;
          }
          return itemData;
        }),
        payment_method: paymentMethod,
        payment_reference: paymentReference || undefined,
        discount: discount || '0',
        reverse_charge: reverseCharge === 'yes',
        vehicle_no: vehicleNo || undefined,
        place_of_supply: placeOfSupply || undefined,
        consignee_name: consigneeName || undefined,
        consignee_address: consigneeAddress || undefined,
        transport_charge: transportCharge || '0',
        loading_charge: loadingCharge || '0',
        notes: notes || undefined,
      };

      const response = await salesAPI.create(saleData);

      // Store sale details for bill summary
      const finalTotal = calculateGrandTotal();
      const itemCount = cart.length;
      setLastSaleId(response.data.id);
      setLastSaleAmount(finalTotal);
      setLastSaleItemCount(itemCount);
      setShowBillSummary(true);

      // Auto-open print window immediately after sale completion
      const printWindow = window.open(`/dashboard/sales/${response.data.id}?autoprint=1`, '_blank', 'noopener,noreferrer');
      printWindow?.focus();

      // CRITICAL: Refresh sub-stocks to update available quantities
      await fetchSubStocks();

      // Force re-fetch batches if there's a search term
      if (searchTerm) {
        await fetchBatches();
      }

      // Reset form but keep sale info visible
      setCart([]);
      setCustomerPhone('');
      setCustomerName('');
      setCustomerEmail('');
      setCustomerGstin('');
      setCustomerAddress('');
      setStateCode('32');
      setSelectedCustomer(null);
      setPaymentMethod('cash');
      setPaymentReference('');
      setDiscount('0');
      setTransportCharge('0');
      setLoadingCharge('0');
      setNotes('');
      setReverseCharge('');
      setVehicleNo('');
      setPlaceOfSupply('');
      setConsigneeName('');
      setConsigneeAddress('');
      setSearchTerm('');
      setBatches([]); // Clear batches to force re-search
    } catch (error: any) {
      console.error('Failed to create sale:', error);
      const errorMessage = error.response?.data
        ? JSON.stringify(error.response.data, null, 2)
        : 'Failed to create sale';
      showToast.error(`Error creating sale:\n${errorMessage}`);
    } finally {
      setLoading(false);
    }
  };

  const conditionOptions = [
    { value: '', label: 'All Conditions' },
    ...Array.from(
      new Map(
        batches
          .map((batch) => [
            batch.condition,
            batch.condition_display || batch.condition,
          ] as [string, string])
          .filter(([value]) => Boolean(value))
      ).entries()
    ).map(([value, label]) => ({ value, label })),
  ];

  const brandOptions = [
    { value: '', label: 'All Brands' },
    ...Array.from(new Set(batches.map((batch) => batch.product_brand_name).filter(Boolean))).map((brand) => ({
      value: brand as string,
      label: brand as string,
    })),
  ];

  const variantOptions = [
    { value: '', label: 'All Variants' },
    ...Array.from(new Set(batches.map((batch) => batch.product_variant_name).filter(Boolean))).map((variant) => ({
      value: variant as string,
      label: variant as string,
    })),
  ];

  const colorOptions = [
    { value: '', label: 'All Colors' },
    ...Array.from(new Set(batches.map((batch) => batch.product_color_name).filter(Boolean))).map((color) => ({
      value: color as string,
      label: color as string,
    })),
  ];

  const categoryOptions = [
    { value: '', label: 'All Categories' },
    ...Array.from(new Set(batches.map((batch) => batch.product_category_name).filter(Boolean))).map((category) => ({
      value: category as string,
      label: category as string,
    })),
  ];

  const paymentOptions = [
    { value: 'cash', label: 'Cash' },
    { value: 'upi', label: 'UPI' },
    { value: 'bank_transfer', label: 'Net Banking' },
    { value: 'card', label: 'Card' },
  ];

  const filteredImeiOptions = imeiOptions.filter((imei) =>
    imei.imei.toLowerCase().includes(imeiSearch.toLowerCase())
  );

  return (
    <div className="space-y-6">
      {/* Bill Success Modal */}
      {showBillSummary && lastSaleId && (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4">
          <div className="rounded-2xl border border-slate-200/80 dark:border-white/10 bg-white dark:bg-transparent shadow-[0_20px_60px_rgba(2,6,23,0.65)] max-w-md w-full p-6 text-slate-900 dark:text-slate-100">
            <div className="text-center mb-6">
              <div className="mx-auto flex items-center justify-center h-12 w-12 rounded-full bg-emerald-100 dark:bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 mb-4">
                <svg className="h-6 w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7"></path>
                </svg>
              </div>
              <h3 className="text-lg font-semibold text-slate-900 dark:text-slate-100 mb-2">Sale Completed Successfully!</h3>
              <p className="text-sm text-slate-600 dark:text-slate-400">The transaction has been processed and stock updated.</p>
            </div>

            <div className="space-y-3 mb-6">
              <div className="rounded-xl border border-slate-200/80 dark:border-white/10 bg-slate-50 dark:bg-transparent p-4">
                <div className="flex justify-between items-center mb-2">
                  <span className="text-sm text-slate-600 dark:text-slate-400">Total Amount:</span>
                  <span className="text-xl font-bold text-emerald-700 dark:text-emerald-300">Rs {lastSaleAmount.toFixed(2)}</span>
                </div>
                <div className="flex justify-between items-center text-sm">
                  <span className="text-slate-600 dark:text-slate-400">Items:</span>
                  <span className="font-semibold">{lastSaleItemCount} item(s)</span>
                </div>
              </div>
            </div>

            <div className="space-y-3">
              <button
                onClick={() => {
                  const printWindow = window.open(`/dashboard/sales/${lastSaleId}?autoprint=1`, '_blank', 'noopener,noreferrer');
                  printWindow?.focus();
                  setShowBillSummary(false);
                  setLastSaleId(null);
                }}
                className="btn btn-primary w-full flex items-center justify-center"
              >
                <FiPrinter className="mr-2" />
                View & Print Bill
              </button>
              <button
                onClick={() => {
                  setShowBillSummary(false);
                  setLastSaleId(null);
                }}
                className="btn btn-outline w-full"
              >
                Continue Selling
              </button>
            </div>
          </div>
        </div>
      )}

      {showImeiModal && imeiBatch && (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4">
          <div className="rounded-2xl border border-slate-200/80 dark:border-white/10 bg-white dark:bg-transparent shadow-[0_20px_60px_rgba(2,6,23,0.65)] max-w-lg w-full p-6 text-slate-900 dark:text-slate-100">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h3 className="text-lg font-semibold">Select IMEI</h3>
                <p className="text-sm text-slate-600 dark:text-slate-400">
                  {imeiBatch.product_name} · {imeiBatch.batch_number}
                </p>
              </div>
              <button
                type="button"
                onClick={closeImeiModal}
                className="text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-100 transition-colors"
              >
                <FiX />
              </button>
            </div>

            <div className="space-y-3">
              <input
                type="text"
                className="input text-sm"
                placeholder="Search IMEI..."
                value={imeiSearch}
                onChange={(e) => setImeiSearch(e.target.value)}
              />
              <div className="flex items-center justify-between text-xs text-slate-500">
                <span>{loadingImeis ? 'Loading IMEIs...' : `${filteredImeiOptions.length} available`}</span>
                {selectedImei && (
                  <span className="font-mono text-emerald-700 dark:text-emerald-200">{selectedImei}</span>
                )}
              </div>
              <div className="max-h-56 overflow-y-auto scrollbar-hide rounded-xl border border-slate-200/80 dark:border-white/10 bg-slate-50 dark:bg-black/40 p-3 space-y-2">
                {loadingImeis && (
                  <p className="text-xs text-slate-500">Loading IMEIs...</p>
                )}
                {!loadingImeis && filteredImeiOptions.length === 0 && (
                  <p className="text-xs text-slate-500">
                    {imeiOptions.length === 0 ? 'No IMEIs available for this batch.' : 'No IMEIs match your search.'}
                  </p>
                )}
                {!loadingImeis && filteredImeiOptions.map((imei) => (
                  <button
                    key={imei.id}
                    type="button"
                    onClick={() => setSelectedImei(imei.imei)}
                    className={`w-full flex items-center justify-between rounded-lg border px-3 py-2 text-left text-xs transition ${
                      selectedImei === imei.imei
                        ? 'border-emerald-400 bg-emerald-50 text-emerald-700 dark:border-emerald-400/50 dark:bg-emerald-500/10 dark:text-emerald-200'
                        : 'border-slate-200/80 bg-white/80 text-slate-700 hover:bg-slate-100 dark:border-white/10 dark:bg-black/30 dark:text-slate-200 dark:hover:bg-white/5'
                    }`}
                  >
                    <span className="font-mono">{imei.imei}</span>
                    {selectedImei === imei.imei && (
                      <span className="text-[10px] font-semibold uppercase tracking-wide">Selected</span>
                    )}
                  </button>
                ))}
              </div>
            </div>

            <div className="mt-5 flex justify-end gap-2">
              <button
                type="button"
                onClick={closeImeiModal}
                className="rounded-full border border-slate-200/70 px-4 py-2 text-sm text-slate-600 hover:text-slate-900 dark:border-white/10 dark:text-slate-300 dark:hover:text-slate-100"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={confirmImeiSelection}
                disabled={loadingImeis || !selectedImei}
                className="rounded-full bg-emerald-600 px-4 py-2 text-sm font-semibold text-white hover:bg-emerald-500 disabled:cursor-not-allowed disabled:opacity-60"
              >
                Add to Cart
              </button>
            </div>
          </div>
        </div>
      )}

      <div className="relative overflow-hidden rounded-3xl border border-slate-200/70 dark:border-white/10 bg-gradient-to-br from-amber-50 via-white to-sky-50 dark:from-slate-900 dark:via-slate-950 dark:to-slate-900 p-6 shadow-xl">
        <div className="absolute -right-16 -top-16 h-40 w-40 rounded-full bg-amber-200/40 blur-3xl dark:bg-amber-400/10" />
        <div className="absolute -left-20 -bottom-16 h-48 w-48 rounded-full bg-sky-200/40 blur-3xl dark:bg-sky-400/10" />
        <div className="relative flex flex-wrap items-center justify-between gap-6">
          <div>
            <p className="text-[11px] uppercase tracking-[0.35em] text-slate-600 dark:text-slate-400">Point of Sale</p>
            <h1 className="mt-2 text-3xl font-semibold text-slate-900 dark:text-slate-100">Sell & Checkout</h1>
            <p className="mt-2 text-sm text-slate-700 dark:text-slate-300">Search shop inventory, build a cart, and print invoices</p>
          </div>
          <div className="flex flex-wrap items-center gap-3">
            <div className="rounded-2xl border border-slate-200/70 dark:border-white/10 bg-white/80 dark:bg-white/5 px-4 py-3 shadow-sm">
              <p className="text-xs text-slate-500 dark:text-slate-400">Cart Items</p>
              <p className="text-lg font-semibold text-slate-900 dark:text-slate-100">{cart.length}</p>
            </div>
            <div className="rounded-2xl border border-emerald-200/70 dark:border-emerald-400/20 bg-emerald-50/80 dark:bg-emerald-500/10 px-4 py-3 shadow-sm">
              <p className="text-xs text-emerald-600 dark:text-emerald-300">Grand Total</p>
              <p className="text-lg font-semibold text-emerald-700 dark:text-emerald-200">Rs {calculateGrandTotal().toFixed(2)}</p>
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 2xl:grid-cols-[1.45fr_1fr] gap-6">
      {/* Left Column - Product Search & Cart */}
      <div className="space-y-6">
        {/* Shop Selection */}
        {user?.role === 'sub_stock_manager' ? (
          // Show current shop as read-only for sub-stock managers
          <div className="rounded-2xl border border-slate-200/80 dark:border-white/10 bg-white/90 dark:bg-transparent p-6 text-slate-900 dark:text-slate-100 shadow-lg dark:shadow-[0_20px_60px_rgba(2,6,23,0.45)]">
            <h2 className="text-xl font-semibold mb-4">Current Shop</h2>
            <div className="rounded-xl border border-slate-200/80 dark:border-white/10 bg-slate-50 dark:bg-transparent p-4">
              <p className="text-lg font-semibold text-slate-900 dark:text-slate-100">{user?.shop_name || 'Your Shop'}</p>
              <p className="text-sm text-slate-600 dark:text-slate-400">All sales will be recorded to this shop</p>
            </div>
          </div>
        ) : (
          // Show shop selector for admins
          <div className="rounded-2xl border border-slate-200/80 dark:border-white/10 bg-white/90 dark:bg-transparent p-6 text-slate-900 dark:text-slate-100 shadow-lg dark:shadow-[0_20px_60px_rgba(2,6,23,0.45)]">
            <h2 className="text-xl font-semibold mb-4">Select Shop</h2>
            <SearchableSelect
              label="Shop"
              placeholder="Select shop..."
              required
              value={selectedShop}
              onChange={(value) => setSelectedShop(value)}
              options={shops.map(shop => ({
                value: shop.id,
                label: shop.name,
                subLabel: shop.code,
              }))}
            />
          </div>
        )}

        {/* Product Search */}
        <div className="rounded-2xl border border-slate-200/80 dark:border-white/10 bg-white/90 dark:bg-transparent p-6 text-slate-900 dark:text-slate-100 shadow-lg dark:shadow-[0_20px_60px_rgba(2,6,23,0.45)]">
          <h2 className="text-xl font-semibold mb-4 flex items-center">
            <FiSearch className="mr-2" />
            Search Products
          </h2>
          <input id="searchTerm" name="searchTerm"
            type="text"
            className="input mb-4"
            placeholder="Search by product name, batch number, brand..."
            value={searchTerm}
            autoComplete="off"
                onChange={(e) => setSearchTerm(e.target.value)}
            disabled={!selectedShop}
          />

          {!selectedShop && (
            <p className="text-slate-600 dark:text-slate-400 text-sm">Please select a shop first</p>
          )}

          {selectedShop && searchTerm && (
            <>
              {/* Filters */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mb-4 rounded-xl border border-slate-200/80 dark:border-white/10 bg-slate-50 dark:bg-transparent p-4">
                <SearchableSelect
                  label="Condition"
                  placeholder="All conditions"
                  value={selectedCondition}
                  onChange={(value) => setSelectedCondition(String(value))}
                  options={conditionOptions}
                />

                <SearchableSelect
                  label="Brand"
                  placeholder="All brands"
                  value={selectedBrand}
                  onChange={(value) => setSelectedBrand(String(value))}
                  options={brandOptions}
                />

                <SearchableSelect
                  label="Variant"
                  placeholder="All variants"
                  value={selectedVariant}
                  onChange={(value) => setSelectedVariant(String(value))}
                  options={variantOptions}
                />

                <SearchableSelect
                  label="Color"
                  placeholder="All colors"
                  value={selectedColor}
                  onChange={(value) => setSelectedColor(String(value))}
                  options={colorOptions}
                />

                <div className="md:col-span-2">
                  <SearchableSelect
                    label="Category"
                    placeholder="All categories"
                    value={selectedCategory}
                    onChange={(value) => setSelectedCategory(String(value))}
                    options={categoryOptions}
                  />
                </div>
              </div>

              <div className="max-h-96 overflow-y-auto space-y-2">
                {filteredBatches.map(batch => {
                  // Get shop's sub-stock quantity for this batch
                  const subStock = subStocks.find(
                    ss => ss.stock_batch === batch.id && ss.shop === Number(selectedShop)
                  );
                  const shopQuantity = subStock?.quantity || 0;

                  return (
                    <div
                      key={batch.id}
                      className="rounded-xl border border-slate-200/80 dark:border-white/10 bg-slate-50 dark:bg-transparent p-3 transition hover:bg-white/10 cursor-pointer"
                      onClick={() => addToCart(batch)}
                    >
                      <div className="flex justify-between items-start">
                        <div className="flex-1">
                          <h3 className="font-semibold">{batch.product_name}</h3>
                          <div className="flex flex-wrap gap-2 mt-1">
                            {batch.product_variant_name && (
                              <span className="text-xs rounded-full border border-sky-400 dark:border-sky-400/30 bg-sky-100 dark:bg-sky-500/15 px-2 py-0.5 text-sky-700 dark:text-sky-200">
                                {batch.product_variant_name}
                              </span>
                            )}
                            {batch.product_color_name && (
                              <span className="text-xs rounded-full border border-violet-400 dark:border-violet-400/30 bg-violet-100 dark:bg-violet-500/15 px-2 py-0.5 text-violet-700 dark:text-violet-200">
                                {batch.product_color_name}
                              </span>
                            )}
                            {batch.product_brand_name && (
                              <span className="text-xs rounded-full border border-slate-200/80 dark:border-white/10 bg-slate-50 dark:bg-transparent px-2 py-0.5 text-slate-700 dark:text-slate-200">
                                {batch.product_brand_name}
                              </span>
                            )}
                            <span className="text-xs rounded-full border border-emerald-400 dark:border-emerald-400/30 bg-emerald-100 dark:bg-emerald-500/15 px-2 py-0.5 text-emerald-700 dark:text-emerald-200">
                              {batch.condition_display}
                            </span>
                          </div>
                          <p className="text-sm text-slate-700 dark:text-slate-300 mt-1">
                            Batch: {batch.batch_number}
                          </p>
                          <p className="text-sm text-slate-600 dark:text-slate-400">
                            Available in shop: {shopQuantity} units
                          </p>
                        </div>
                        <div className="text-right ml-3">
                          <p className="text-lg font-bold text-emerald-700 dark:text-emerald-300">
                            Rs {parseFloat(batch.selling_price).toFixed(2)}
                          </p>
                          <p className="text-xs text-slate-600 dark:text-slate-400">+ {batch.gst_rate}% GST</p>
                        </div>
                      </div>
                    </div>
                  );
                })}
                {filteredBatches.length === 0 && batches.length > 0 && (
                  <p className="text-slate-600 dark:text-slate-400 text-center py-4">No products match the selected filters</p>
                )}
                {batches.length === 0 && (
                  <p className="text-slate-600 dark:text-slate-400 text-center py-4">No products found</p>
                )}
              </div>
            </>
          )}
        </div>

        {/* Cart */}
        <div className="rounded-2xl border border-slate-200/80 dark:border-white/10 bg-white/90 dark:bg-transparent p-6 text-slate-900 dark:text-slate-100 shadow-lg dark:shadow-[0_20px_60px_rgba(2,6,23,0.45)]">
          <h2 className="text-xl font-semibold mb-4 flex items-center">
            <FiShoppingCart className="mr-2" />
            Cart ({cart.length} items)
          </h2>
          {cart.length === 0 ? (
            <p className="text-slate-600 dark:text-slate-400 text-center py-8">Cart is empty</p>
          ) : (
            <div className="space-y-3">
              {cart.map((item) => (
                <div key={`${item.stock_batch_id}-${item.imei || ''}`} className="rounded-xl border border-slate-200/80 dark:border-white/10 bg-slate-50 dark:bg-transparent p-3">
                  <div className="flex justify-between items-start mb-2">
                    <div className="flex-1">
                      <h3 className="font-semibold">{item.product_name}</h3>
                      <p className="text-sm text-slate-700 dark:text-slate-300">
                        {item.batch_number} | {item.condition}
                      </p>
                      {item.imei && (
                        <p className="text-xs text-slate-600 dark:text-slate-400">IMEI: {item.imei}</p>
                      )}
                    </div>
                    <button
                      onClick={() => removeFromCart(item.stock_batch_id, item.imei)}
                      className="text-rose-700 dark:text-rose-300 hover:text-rose-600 dark:hover:text-rose-200"
                    >
                      <FiTrash size={18} />
                    </button>
                  </div>
                  <div className="flex justify-between items-center">
                    <div className="flex items-center space-x-2">
                      {!item.is_imei_tracked && (
                        <>
                          <button
                            onClick={() => updateQuantity(item.stock_batch_id, item.quantity - 1)}
                            className="btn btn-sm btn-outline"
                          >
                            <FiMinus />
                          </button>
                          <span className="w-12 text-center font-semibold">{item.quantity}</span>
                          <button
                            onClick={() => updateQuantity(item.stock_batch_id, item.quantity + 1)}
                            className="btn btn-sm btn-outline"
                          >
                            <FiPlus />
                          </button>
                        </>
                      )}
                      {item.is_imei_tracked && (
                        <span className="text-sm text-slate-700 dark:text-slate-300">Qty: {item.quantity}</span>
                      )}
                    </div>
                    <div className="text-right">
                      <p className="font-bold">
                        Rs {(item.unit_price * item.quantity).toFixed(2)}
                      </p>
                      <p className="text-xs text-slate-600 dark:text-slate-400">Rs {item.unit_price.toFixed(2)} each</p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Right Column - Customer & Payment */}
      <div className="space-y-6">
        {/* Customer Details */}
        <div className="rounded-2xl border border-slate-200/80 dark:border-white/10 bg-white/90 dark:bg-transparent p-6 text-slate-900 dark:text-slate-100 shadow-lg dark:shadow-[0_20px_60px_rgba(2,6,23,0.45)]">
          <h2 className="text-xl font-semibold mb-4">Customer Details</h2>
          <div className="space-y-3">
            <div>
              <label htmlFor="customerPhone" className="block text-sm font-medium mb-1">Phone Number *</label>
              <div className="flex space-x-2">
                <input id="customerPhone" name="customerPhone"
                  type="tel"
                  className="input flex-1"
                  placeholder="Enter phone number"
                  value={customerPhone}
                  autoComplete="tel"
                onChange={(e) => setCustomerPhone(e.target.value)}
                />
                <button
                  onClick={handleSearchCustomer}
                  className="btn btn-outline"
                  title="Search Customer"
                >
                  <FiSearch />
                </button>
              </div>
            </div>

            <div>
              <label htmlFor="customerName" className="block text-sm font-medium mb-1">Customer Name *</label>
              <input id="customerName" name="customerName"
                type="text"
                className="input bg-slate-50 dark:bg-transparent dark:bg-transparent"
                placeholder="Enter name or search by phone"
                value={customerName}
                autoComplete="name"
                onChange={(e) => setCustomerName(e.target.value)}
                required
              />
            </div>

            <div>
              <label htmlFor="customerEmail" className="block text-sm font-medium mb-1">Customer Email *</label>
              <input
                id="customerEmail"
                name="customerEmail"
                type="email"
                className="input bg-slate-50 dark:bg-transparent dark:bg-transparent"
                placeholder="name@example.com"
                value={customerEmail}
                autoComplete="email"
                onChange={(e) => setCustomerEmail(e.target.value)}
                required
              />
            </div>

            <div>
              <label htmlFor="customerGstin" className="block text-sm font-medium mb-1">Customer GSTIN *</label>
              <input
                id="customerGstin"
                name="customerGstin"
                type="text"
                className="input bg-slate-50 dark:bg-transparent dark:bg-transparent"
                placeholder="GSTIN"
                value={customerGstin}
                onChange={(e) => setCustomerGstin(e.target.value)}
                required
              />
            </div>

              <div>
                <label htmlFor="customerAddress" className="block text-sm font-medium mb-1">Customer Address</label>
                <textarea id="customerAddress" name="customerAddress"
                  className="input bg-slate-50 dark:bg-transparent dark:bg-transparent"
                  rows={2}
                  placeholder="Enter customer address (optional)"
                  value={customerAddress}
                  onChange={(e) => setCustomerAddress(e.target.value)}
                />
              </div>
              <div>
                <label htmlFor="stateCode" className="block text-sm font-medium mb-1">State Code</label>
                <input
                  id="stateCode"
                  name="stateCode"
                  type="text"
                  className="input"
                  placeholder="32"
                  value={stateCode}
                  onChange={(event) => setStateCode(event.target.value)}
                />
              </div>

            {selectedCustomer && (
              <div className="rounded-xl border border-slate-200/80 dark:border-white/10 bg-slate-50 dark:bg-transparent p-3 text-sm">
                <p className="font-semibold text-slate-900 dark:text-slate-100">Existing Customer</p>
                <p className="text-slate-700 dark:text-slate-300">
                  {selectedCustomer.customer_type === 'business' ? 'Business' : 'Individual'}
                </p>
                {selectedCustomer.email && (
                  <p className="text-slate-600 dark:text-slate-400">{selectedCustomer.email}</p>
                )}
                {selectedCustomer.gstin && (
                  <p className="text-slate-600 dark:text-slate-400">GSTIN: {selectedCustomer.gstin}</p>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Delivery & Tax */}
        <div className="rounded-2xl border border-slate-200/80 dark:border-white/10 bg-white/90 dark:bg-transparent p-6 text-slate-900 dark:text-slate-100 shadow-lg dark:shadow-[0_20px_60px_rgba(2,6,23,0.45)]">
          <h2 className="text-xl font-semibold mb-4 flex items-center">
            <FiTruck className="mr-2" />
            Delivery & Tax
          </h2>
          <div className="space-y-3">
            <div className="rounded-xl border border-slate-200/80 dark:border-white/10 bg-slate-50 dark:bg-transparent p-4">
              <div>
                <p className="text-sm font-semibold text-slate-900 dark:text-slate-100">Reverse Charge *</p>
                <p className="text-xs text-slate-600 dark:text-slate-400">Tax is payable on reverse charge</p>
              </div>
              <div className="mt-3 flex gap-4 text-sm">
                <label className="flex items-center gap-2">
                  <input
                    id="reverseChargeYes"
                    name="reverseCharge"
                    type="radio"
                    className="h-4 w-4 accent-emerald-600"
                    checked={reverseCharge === 'yes'}
                    onChange={() => setReverseCharge('yes')}
                  />
                  Yes
                </label>
                <label className="flex items-center gap-2">
                  <input
                    id="reverseChargeNo"
                    name="reverseCharge"
                    type="radio"
                    className="h-4 w-4 accent-emerald-600"
                    checked={reverseCharge === 'no'}
                    onChange={() => setReverseCharge('no')}
                  />
                  No
                </label>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <div>
                <label htmlFor="vehicleNo" className="block text-sm font-medium mb-1">Vehicle No</label>
                <input
                  id="vehicleNo"
                  name="vehicleNo"
                  type="text"
                  className="input"
                  placeholder="KL-07-AB-1234"
                  value={vehicleNo}
                  onChange={(event) => setVehicleNo(event.target.value)}
                />
              </div>
              <div>
                <label htmlFor="placeOfSupply" className="block text-sm font-medium mb-1">Place of Supply</label>
                <input
                  id="placeOfSupply"
                  name="placeOfSupply"
                  type="text"
                  className="input"
                  placeholder="State / City"
                  value={placeOfSupply}
                  onChange={(event) => setPlaceOfSupply(event.target.value)}
                />
              </div>
            </div>

            <div className="rounded-xl border border-slate-200/80 dark:border-white/10 bg-slate-50 dark:bg-transparent p-4">
              <label htmlFor="consigneeName" className="block text-sm font-medium mb-1">Consignee Name</label>
              <input
                id="consigneeName"
                name="consigneeName"
                type="text"
                className="input"
                placeholder="Shipped to name"
                value={consigneeName}
                onChange={(event) => setConsigneeName(event.target.value)}
              />
              <label htmlFor="consigneeAddress" className="block text-sm font-medium mb-1 mt-3">Consignee Address</label>
              <textarea
                id="consigneeAddress"
                name="consigneeAddress"
                className="input"
                rows={2}
                placeholder="Shipped to address"
                value={consigneeAddress}
                onChange={(event) => setConsigneeAddress(event.target.value)}
              />
            </div>
          </div>
        </div>

        {/* Payment Details */}
        <div className="rounded-2xl border border-slate-200/80 dark:border-white/10 bg-white/90 dark:bg-transparent p-6 text-slate-900 dark:text-slate-100 shadow-lg dark:shadow-[0_20px_60px_rgba(2,6,23,0.45)]">
          <h2 className="text-xl font-semibold mb-4">Payment Details</h2>
          <div className="space-y-3">
            <SearchableSelect
              label="Payment Method"
              placeholder="Select payment method..."
              required
              value={paymentMethod}
              onChange={(value) => setPaymentMethod(String(value))}
              options={paymentOptions}
            />

            {(paymentMethod !== 'cash') && (
              <div>
                <label htmlFor="paymentReference" className="block text-sm font-medium mb-1">Reference Number</label>
                <input id="paymentReference" name="paymentReference"
                  type="text"
                  className="input"
                  placeholder="Transaction/Reference ID"
                  value={paymentReference}
                  autoComplete="off"
                onChange={(e) => setPaymentReference(e.target.value)}
                />
              </div>
            )}

            <div>
              <label htmlFor="discount" className="block text-sm font-medium mb-1">Discount (Rs)</label>
              <input id="discount" name="discount"
                type="number"
                step="0.01"
                min="0"
                className="input"
                value={discount}
                onChange={(e) => setDiscount(e.target.value)}
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label htmlFor="transportCharge" className="block text-sm font-medium mb-1">Transport Charge (Rs)</label>
                <input id="transportCharge" name="transportCharge"
                  type="number"
                  step="0.01"
                  min="0"
                  className="input"
                  placeholder="0.00"
                  value={transportCharge}
                  onChange={(e) => setTransportCharge(e.target.value)}
                />
              </div>
              <div>
                <label htmlFor="loadingCharge" className="block text-sm font-medium mb-1">Loading Charge (Rs)</label>
                <input id="loadingCharge" name="loadingCharge"
                  type="number"
                  step="0.01"
                  min="0"
                  className="input"
                  placeholder="0.00"
                  value={loadingCharge}
                  onChange={(e) => setLoadingCharge(e.target.value)}
                />
              </div>
            </div>

            <div>
              <label htmlFor="notes" className="block text-sm font-medium mb-1">Notes</label>
              <textarea id="notes" name="notes"
                className="input"
                rows={3}
                placeholder="Optional notes about this sale"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
              />
            </div>
          </div>
        </div>

        {/* Bill Summary */}
        <div className="rounded-2xl border border-slate-200/80 dark:border-white/10 bg-white/90 dark:bg-transparent p-6 text-slate-900 dark:text-slate-100 shadow-lg dark:shadow-[0_20px_60px_rgba(2,6,23,0.45)]">
          <h2 className="text-xl font-semibold mb-4">Bill Summary</h2>
          <div className="space-y-2 text-sm">
            <div className="flex justify-between">
              <span>Subtotal:</span>
              <span>Rs {calculateSubtotal().toFixed(2)}</span>
            </div>
            <div className="flex justify-between">
              <span>GST:</span>
              <span>Rs {calculateTotalGST().toFixed(2)}</span>
            </div>
            {parseFloat(discount) > 0 && (
              <div className="flex justify-between text-rose-700 dark:text-rose-300">
                <span>Discount:</span>
                <span>- Rs {parseFloat(discount).toFixed(2)}</span>
              </div>
            )}
            {parseFloat(transportCharge) > 0 && (
              <div className="flex justify-between">
                <span>Transport Charge:</span>
                <span>Rs {parseFloat(transportCharge).toFixed(2)}</span>
              </div>
            )}
            {parseFloat(loadingCharge) > 0 && (
              <div className="flex justify-between">
                <span>Loading Charge:</span>
                <span>Rs {parseFloat(loadingCharge).toFixed(2)}</span>
              </div>
            )}
            <div className="border-t pt-2 flex justify-between text-lg font-bold">
              <span>Grand Total:</span>
              <span className="text-emerald-700 dark:text-emerald-300">Rs {calculateGrandTotal().toFixed(2)}</span>
            </div>
          </div>

          <button
            onClick={handleSubmitSale}
            disabled={
              loading
              || cart.length === 0
              || !selectedShop
              || !customerName.trim()
              || (!customerPhone.trim() && !selectedCustomer)
              || !customerEmail.trim()
              || !customerGstin.trim()
              || !reverseCharge
            }
            className="btn btn-primary w-full mt-4 flex items-center justify-center"
          >
            <FiPrinter className="mr-2" />
            {loading ? 'Processing...' : 'Complete Sale & Print'}
          </button>
        </div>
      </div>
    </div>
    </div>
  );
}
