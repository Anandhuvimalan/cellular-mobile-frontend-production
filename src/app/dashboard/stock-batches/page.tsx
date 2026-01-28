'use client';

import { useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { stockBatchesAPI, productsAPI, gstSlabsAPI, shopsAPI, categoriesAPI, brandsAPI, variantsAPI, colorsAPI, conditionsAPI, sourcesAPI } from '@/lib/api';
import type { StockBatch, Product, GSTSlab, Shop, Category, Brand, Variant, Color, Condition, Source } from '@/types';
import { FiPlus, FiEye, FiTrash, FiEdit, FiX, FiDollarSign, FiUploadCloud } from 'react-icons/fi';
import SearchableSelect from '@/components/SearchableSelect';
import TableSearchBar from '@/components/TableSearchBar';
import { useMultiSelect } from '@/hooks/useMultiSelect';
import BulkActionBar from '@/components/BulkActionBar';
import { useAutoRefresh } from '@/hooks/useAutoRefresh';
import { formatDate } from '@/lib/date';
import FullScreenLoader from '@/components/FullScreenLoader';
import { showToast } from '@/lib/toast';
import QuickAddModal from '@/components/QuickAddModal';
import { HoverBorderGradient } from '@/components/ui/hover-border-gradient';
import { ConfirmDialog } from '@/components/ConfirmDialog';

export default function StockBatchesPage() {
  const router = useRouter();
  const [batches, setBatches] = useState<StockBatch[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [gstSlabs, setGstSlabs] = useState<GSTSlab[]>([]);
  const [shops, setShops] = useState<Shop[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [brands, setBrands] = useState<Brand[]>([]);
  const [variants, setVariants] = useState<Variant[]>([]);
  const [colors, setColors] = useState<Color[]>([]);
  const [conditions, setConditions] = useState<Condition[]>([]);
  const [sources, setSources] = useState<Source[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [showQuickAdd, setShowQuickAdd] = useState(false);
  const [showCategoryModal, setShowCategoryModal] = useState(false);
  const [showBrandModal, setShowBrandModal] = useState(false);
  const [showVariantModal, setShowVariantModal] = useState(false);
  const [showColorModal, setShowColorModal] = useState(false);
  const [showConditionModal, setShowConditionModal] = useState(false);
  const [showSourceModal, setShowSourceModal] = useState(false);
  const [quickAddInitialValue, setQuickAddInitialValue] = useState('');
  const [showViewModal, setShowViewModal] = useState(false);
  const [viewBatch, setViewBatch] = useState<StockBatch | null>(null);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(25);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [loadingEdit, setLoadingEdit] = useState(false);
  const [loadingView, setLoadingView] = useState(false);
  const [autoAllocate, setAutoAllocate] = useState(false);
  const [confirmState, setConfirmState] = useState({
    open: false,
    ids: [] as number[],
    title: '',
    message: '',
  });
  const [confirmLoading, setConfirmLoading] = useState(false);
  const [lastPayment, setLastPayment] = useState<{
    amount: string;
    method: string;
    reference: string;
  } | null>(null);
  const [paymentStatus, setPaymentStatus] = useState<'paid' | 'installment'>('installment');
  const [invoiceBalance, setInvoiceBalance] = useState<number | null>(null);
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
    batch_number: string;
    product: string | number;
    gst_slab: string | number;
    purchased_quantity: string;
    total_purchase_amount: string;
    selling_price: string;
    condition: 'fresh' | 'second_hand' | 'refurbished' | 'open_box' | 'exchange' | 'damaged' | '';
    source: 'distributor' | 'wholesaler' | 'customer' | 'other' | '';
    is_interstate: boolean;
    purchase_date: string;
    supplier_name: string;
    invoice_number: string;
    initial_payment_amount: string;
    initial_payment_method: 'cash' | 'card' | 'upi' | 'bank_transfer' | '';
    initial_payment_reference: string;
    notes: string;
    imei_list: string[];
    update_existing_price: boolean;
    distributions: {
      shop: string | number;
      quantity: string;
      imei_list: string[];
    }[];
  }>({
    batch_number: '',
    product: '',
    gst_slab: '',
    purchased_quantity: '',
    total_purchase_amount: '',
    selling_price: '',
    condition: 'fresh',
    source: 'distributor',
    is_interstate: false,
    purchase_date: new Date().toISOString().split('T')[0],
    supplier_name: '',
    invoice_number: '',
    initial_payment_amount: '',
    initial_payment_method: '',
    initial_payment_reference: '',
    notes: '',
    imei_list: [],
    update_existing_price: false,
    distributions: [],
  });
  const [quickProduct, setQuickProduct] = useState({
    name: '',
    hsn_code: '',
    is_imei_tracked: false,
    category: '',
    brand: '',
    variant: '',
    color: '',
    description: '',
  });

  const formatConditionLabel = (value: string) =>
    value.replace(/_/g, ' ').replace(/\b\w/g, (char) => char.toUpperCase());
  const formatSourceLabel = (value: string) =>
    value.replace(/_/g, ' ').replace(/\b\w/g, (char) => char.toUpperCase());
  const formatPaymentLabel = (value: string) =>
    value.replace(/_/g, ' ').replace(/\b\w/g, (char) => char.toUpperCase());

  const conditionOptions = conditions.map((condition) => ({
    value: condition.name,
    label: formatConditionLabel(condition.name),
    subLabel: condition.description || undefined,
  }));
  const sourceOptions = sources.map((source) => ({
    value: source.name,
    label: formatSourceLabel(source.name),
    subLabel: source.description || undefined,
  }));

  useEffect(() => {
    fetchData();
  }, []);

  const loadSupportingData = async () => {
    const results = await Promise.allSettled([
      productsAPI.list(),
      gstSlabsAPI.list(),
      shopsAPI.list(),
      categoriesAPI.list(),
      brandsAPI.list(),
      variantsAPI.list(),
      colorsAPI.list(),
      conditionsAPI.list(),
      sourcesAPI.list(),
    ]);

    const [
      productsRes,
      gstSlabsRes,
      shopsRes,
      categoriesRes,
      brandsRes,
      variantsRes,
      colorsRes,
      conditionsRes,
      sourcesRes,
    ] = results;

    if (productsRes.status === 'fulfilled') {
      setProducts(productsRes.value.data);
    } else {
      setProducts([]);
    }

    if (gstSlabsRes.status === 'fulfilled') {
      setGstSlabs(gstSlabsRes.value.data);
    } else {
      setGstSlabs([]);
    }

    if (shopsRes.status === 'fulfilled') {
      setShops(shopsRes.value.data);
    } else {
      setShops([]);
    }

    if (categoriesRes.status === 'fulfilled') {
      setCategories(categoriesRes.value.data);
    } else {
      setCategories([]);
    }

    if (brandsRes.status === 'fulfilled') {
      setBrands(brandsRes.value.data);
    } else {
      setBrands([]);
    }

    if (variantsRes.status === 'fulfilled') {
      setVariants(variantsRes.value.data);
    } else {
      setVariants([]);
    }

    if (colorsRes.status === 'fulfilled') {
      setColors(colorsRes.value.data);
    } else {
      setColors([]);
    }

    if (conditionsRes.status === 'fulfilled') {
      setConditions(conditionsRes.value.data);
    } else {
      setConditions([]);
    }

    if (sourcesRes.status === 'fulfilled') {
      setSources(sourcesRes.value.data);
    } else {
      setSources([]);
    }
  };

  const fetchData = async () => {
    try {
      const response = await stockBatchesAPI.list();
      setBatches(response.data);
    } catch (error) {
      console.error('Failed to fetch data:', error);
      setBatches([]);
    } finally {
      setLoading(false);
    }

    void loadSupportingData();
  };
  useAutoRefresh(fetchData);

  const fetchBatches = async () => {
    try {
      const response = await stockBatchesAPI.list(searchTerm);
      setBatches(response.data);
    } catch (error) {
      console.error('Failed to fetch batches:', error);
      setBatches([]);
    }
  };

  useEffect(() => {
    const timer = setTimeout(() => {
      fetchBatches();
    }, 300);
    return () => clearTimeout(timer);
  }, [searchTerm]);

  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm, pageSize]);

  const totalDisplayCount = batches.length;
  const totalPages = Math.max(1, Math.ceil(totalDisplayCount / pageSize));
  const pageStart = totalDisplayCount === 0 ? 0 : (currentPage - 1) * pageSize;
  const pageEnd = Math.min(pageStart + pageSize, totalDisplayCount);
  const pageLabelStart = totalDisplayCount === 0 ? 0 : pageStart + 1;
  const paginatedBatches = batches.slice(pageStart, pageEnd);
  const paginatedIds = Array.from(new Set(paginatedBatches.map((batch) => batch.id)));

  useEffect(() => {
    if (currentPage > totalPages) {
      setCurrentPage(totalPages);
    }
  }, [currentPage, totalPages]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // Validate IMEI count for IMEI-tracked products
    const selectedProduct = products.find(p => p.id === parseInt(String(formData.product)));
    const purchasedQty = parseInt(formData.purchased_quantity || '0');
    const normalizedDistributions = formData.distributions
      .map((dist) => {
        const cleanedImeis = (dist.imei_list || []).map((imei) => imei.trim()).filter((imei) => imei !== '');
        return {
          shopId: dist.shop ? parseInt(String(dist.shop)) : 0,
          quantity: dist.quantity ? parseInt(dist.quantity) : 0,
          imei_list: cleanedImeis,
        };
      })
      .filter((dist) => dist.shopId && dist.quantity > 0);

    const hasIncompleteDistribution = formData.distributions.some((dist) =>
      (dist.shop || dist.quantity) && (!dist.shop || !dist.quantity)
    );
    if (hasIncompleteDistribution) {
      showToast.info('Complete all shop distribution rows or remove them.');
      return;
    }

    const allocatedQuantity = normalizedDistributions.reduce((sum, dist) => sum + dist.quantity, 0);
    if (allocatedQuantity > purchasedQty) {
      showToast.info(`Distributed quantity (${allocatedQuantity}) exceeds purchased quantity (${purchasedQty}).`);
      return;
    }

    const shopIds = normalizedDistributions.map((dist) => dist.shopId);
    if (shopIds.length !== new Set(shopIds).size) {
      showToast.info('Each shop can only appear once in the distribution list.');
      return;
    }

    // Validate that IMEI count in each allocation matches the quantity for that allocation
    for (const dist of normalizedDistributions) {
      if (dist.imei_list.length > 0 && dist.imei_list.length !== dist.quantity) {
        showToast.info(`Shop allocation IMEI count (${dist.imei_list.length}) must match allocated quantity (${dist.quantity}).`);
        return;
      }
    }

    const distributionImeis = normalizedDistributions.flatMap((dist) => dist.imei_list);
    const cleanedMasterImeis = formData.imei_list.map((imei) => imei.trim()).filter((imei) => imei !== '');
    let finalImeiList = cleanedMasterImeis;

    if (selectedProduct?.is_imei_tracked) {
      for (const dist of normalizedDistributions) {
        if (dist.imei_list.length !== dist.quantity) {
          showToast.info(`IMEI count for a shop (${dist.imei_list.length}) must match its quantity (${dist.quantity}).`);
          return;
        }
      }

      if (distributionImeis.length) {
        const uniqueImeis = new Set(distributionImeis);
        if (uniqueImeis.size !== distributionImeis.length) {
          showToast.info('Duplicate IMEIs found across shop distributions.');
          return;
        }
      }

      if (!finalImeiList.length && distributionImeis.length) {
        if (distributionImeis.length === purchasedQty) {
          finalImeiList = distributionImeis;
        } else {
          showToast.info('Master IMEI list is required when some IMEIs stay in main stock.');
          return;
        }
      }

      if (finalImeiList.length !== purchasedQty) {
        showToast.info(`IMEI count (${finalImeiList.length}) must match purchased quantity (${purchasedQty})`);
        return;
      }
      if (distributionImeis.length) {
        const masterSet = new Set(finalImeiList);
        const missing = distributionImeis.filter((imei) => !masterSet.has(imei));
        if (missing.length) {
          showToast.info(`Some distributed IMEIs are not in the master list: ${missing.join(', ')}`);
          return;
        }
      }
    } else if (distributionImeis.length) {
      showToast.info('IMEI allocation is only allowed for IMEI-tracked products.');
      return;
    }

    try {
      const totalPurchaseAmount = parseFloat(formData.total_purchase_amount || '0');
      const resolvedPaymentAmount = paymentStatus === 'paid'
        ? (editingId ? (invoiceBalance ?? totalPurchaseAmount) : totalPurchaseAmount)
        : parseFloat(formData.initial_payment_amount || '0');

      if (paymentStatus === 'paid' && resolvedPaymentAmount <= 0 && !editingId) {
        showToast.info('Total purchase amount is required to mark as fully paid.');
        return;
      }

      if (paymentStatus === 'paid' && !formData.initial_payment_method) {
        showToast.info('Select a payment method for the full payment.');
        return;
      }

      if (paymentStatus === 'installment' && resolvedPaymentAmount > 0 && !formData.initial_payment_method) {
        showToast.info('Select a payment method for the installment payment.');
        return;
      }

      if (resolvedPaymentAmount > 0 && !formData.invoice_number) {
        showToast.info('Invoice number is required to record a payment.');
        return;
      }

      const submitData: any = {
        batch_number: formData.batch_number,
        product: parseInt(formData.product as string),
        gst_slab: parseInt(formData.gst_slab as string),
        purchased_quantity: parseInt(formData.purchased_quantity),
        total_purchase_amount: formData.total_purchase_amount,
        selling_price: formData.selling_price,
        condition: formData.condition,
        source: formData.source,
        is_interstate: formData.is_interstate,
        purchase_date: formData.purchase_date,
        supplier_name: formData.supplier_name,
        invoice_number: formData.invoice_number,
        notes: formData.notes,
        imei_list: finalImeiList,
        distributions: normalizedDistributions.map((dist) => ({
          shop: dist.shopId,
          quantity: dist.quantity,
          imei_list: dist.imei_list,
        })),
        update_existing_price: formData.update_existing_price,
      };

      if (resolvedPaymentAmount > 0) {
        if (editingId) {
          submitData.payment_amount = resolvedPaymentAmount.toString();
          submitData.payment_method = formData.initial_payment_method;
          submitData.payment_reference = formData.initial_payment_reference;
        } else {
          submitData.initial_payment_amount = resolvedPaymentAmount.toString();
          submitData.initial_payment_method = formData.initial_payment_method;
          submitData.initial_payment_reference = formData.initial_payment_reference;
        }
      }

      if (editingId) {
        await stockBatchesAPI.update(editingId, submitData);
        showToast.success('Stock batch updated successfully!');
      } else {
        await stockBatchesAPI.create(submitData);
        showToast.success('Stock batch created successfully!');
      }
      setShowForm(false);
      setEditingId(null);
      fetchBatches();
      setFormData({
        batch_number: '',
        product: '',
        gst_slab: '',
        purchased_quantity: '',
        total_purchase_amount: '',
        selling_price: '',
        condition: 'fresh',
        source: 'distributor',
        is_interstate: false,
        purchase_date: new Date().toISOString().split('T')[0],
        supplier_name: '',
        invoice_number: '',
        initial_payment_amount: '',
        initial_payment_method: '',
        initial_payment_reference: '',
        notes: '',
        imei_list: [],
        update_existing_price: false,
        distributions: [],
      });
      setLastPayment(null);
      setPaymentStatus('installment');
      setInvoiceBalance(null);
    } catch (error: any) {
      console.error('Stock batch creation error:', error);

      // Handle different types of errors
      if (error.response?.status === 403) {
        showToast.error('Permission denied. Only Admins and Main Inventory Managers can create or edit stock batches.');
      } else if (error.response?.data) {
        // Show detailed validation errors
        const errorData = error.response.data;
        if (typeof errorData === 'object') {
          const errorMessages = Object.entries(errorData)
            .map(([key, value]) => `${key}: ${Array.isArray(value) ? value.join(', ') : value}`)
            .join('\n');
          showToast.error(`Failed to create stock batch:\n\n${errorMessages}`);
        } else {
          showToast.info(errorData.detail || 'Failed to create stock batch');
        }
      } else {
        showToast.error('Failed to create stock batch. Please check your network connection and try again.');
      }
    }
  };

  const addDistributionRow = () => {
    setFormData((prev) => ({
      ...prev,
      distributions: [
        ...prev.distributions,
        { shop: '', quantity: '', imei_list: [] },
      ],
    }));
  };

  const updateDistributionRow = (
    index: number,
    updates: Partial<{ shop: string | number; quantity: string; imei_list: string[] }>
  ) => {
    setFormData((prev) => {
      const updated = [...prev.distributions];
      updated[index] = { ...updated[index], ...updates };
      return { ...prev, distributions: updated };
    });
  };

  const removeDistributionRow = (index: number) => {
    setFormData((prev) => {
      const updated = prev.distributions.filter((_, i) => i !== index);
      return { ...prev, distributions: updated };
    });
  };

  const autoAllocateDistributions = () => {
    const activeShops = shops.filter((shop) => shop.is_active);
    if (!activeShops.length) return;
    if (!purchasedQuantity || purchasedQuantity < 1) {
      showToast.info('Enter a purchased quantity before auto allocation.');
      return;
    }

    setFormData((prev) => {
      const baseQty = Math.floor(purchasedQuantity / activeShops.length);
      const remainder = purchasedQuantity % activeShops.length;
      const masterImeis = prev.imei_list.filter(Boolean);
      const imeiAvailable = formProduct?.is_imei_tracked && masterImeis.length === purchasedQuantity;
      let imeiIndex = 0;

      const allocations = activeShops.map((shop, index) => {
        const qty = baseQty + (index < remainder ? 1 : 0);
        const imei_list = imeiAvailable ? masterImeis.slice(imeiIndex, imeiIndex + qty) : [];
        imeiIndex += qty;
        return {
          shop: shop.id,
          quantity: qty ? String(qty) : '',
          imei_list,
        };
      });

      return { ...prev, distributions: allocations };
    });
  };

  const handleEdit = async (batch: StockBatch) => {
    setLoadingEdit(true);
    try {
      // Fetch full batch details with IMEI numbers
      const response = await stockBatchesAPI.get(batch.id);
      const fullBatch = response.data;

      // Extract IMEI numbers from the batch
      const imeiList = fullBatch.imei_numbers?.map(imei => imei.imei) || [];


      const lastPaymentAmount = fullBatch.initial_payment_amount ? String(fullBatch.initial_payment_amount) : '';
      const lastPaymentMethod = fullBatch.initial_payment_method || '';
      const lastPaymentReference = fullBatch.initial_payment_reference || '';
      setFormData({
        batch_number: fullBatch.batch_number,
        product: fullBatch.product,
        gst_slab: String(fullBatch.gst_slab),
        purchased_quantity: fullBatch.purchased_quantity.toString(),
        total_purchase_amount: fullBatch.total_purchase_amount,
        selling_price: fullBatch.selling_price,
        condition: fullBatch.condition as 'fresh' | 'second_hand' | 'refurbished' | 'open_box' | 'exchange' | 'damaged' | '',
        source: fullBatch.source as 'distributor' | 'wholesaler' | 'customer' | 'other' | '',
        is_interstate: fullBatch.is_interstate,
        purchase_date: fullBatch.purchase_date,
        supplier_name: fullBatch.supplier_name || '',
        invoice_number: fullBatch.invoice_number || '',
        initial_payment_amount: lastPaymentAmount,
        initial_payment_method: lastPaymentMethod,
        initial_payment_reference: lastPaymentReference,
        notes: fullBatch.notes || '',
        imei_list: imeiList,
        update_existing_price: false,
        distributions: [],
      });
      const balanceValue = fullBatch.purchase_invoice_balance
        ? parseFloat(String(fullBatch.purchase_invoice_balance))
        : null;
      setInvoiceBalance(Number.isFinite(balanceValue as number) ? balanceValue : null);
      if (balanceValue === 0) {
        setPaymentStatus('paid');
      } else {
        setPaymentStatus('installment');
      }
      if (lastPaymentAmount) {
        setLastPayment({
          amount: lastPaymentAmount,
          method: lastPaymentMethod,
          reference: lastPaymentReference,
        });
      } else {
        setLastPayment(null);
      }
      setEditingId(fullBatch.id);
      setShowForm(true);
      setTimeout(() => {
        formRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }, 100);
    } catch (error) {
      console.error('Failed to fetch batch details:', error);
      showToast.error('Failed to load batch details for editing. Please try again.');
    } finally {
      setLoadingEdit(false);
    }
  };

  const handleView = async (batch: StockBatch) => {
    setShowViewModal(true);
    setLoadingView(true);
    setViewBatch(null);
    try {
      const response = await stockBatchesAPI.get(batch.id);
      setViewBatch(response.data);
    } catch (error) {
      console.error('Failed to fetch batch details:', error);
      showToast.error('Failed to load stock batch details. Please try again.');
      setShowViewModal(false);
    } finally {
      setLoadingView(false);
    }
  };

  const closeViewModal = () => {
    setShowViewModal(false);
    setViewBatch(null);
    setLoadingView(false);
  };

  const openDeleteDialog = (ids: number[]) => {
    const isBulk = ids.length > 1;
    setConfirmState({
      open: true,
      ids,
      title: isBulk ? 'Delete stock batches' : 'Delete stock batch',
      message: isBulk
        ? `Delete ${ids.length} stock batches? This will remove related sales, transfers, and purchase records.`
        : 'Delete this stock batch? This will remove related sales, transfers, and purchase records.',
    });
  };

  const handleConfirmDelete = async () => {
    if (confirmLoading) return;
    setConfirmLoading(true);
    try {
      if (confirmState.ids.length === 1) {
        await stockBatchesAPI.delete(confirmState.ids[0]);
      } else {
        await stockBatchesAPI.bulkDelete(confirmState.ids);
      }
      showToast.success('Stock batch deleted successfully!');
      removeSelection(confirmState.ids);
      fetchBatches();
    } catch (error: any) {
      console.error('Stock batch deletion error:', error);
      const errorMessage = error.response?.data?.error || error.response?.data?.detail || 'Failed to delete stock batch';
      showToast.error(`Failed to delete stock batch:\n${errorMessage}`);
    } finally {
      setConfirmLoading(false);
      setConfirmState({ open: false, ids: [], title: '', message: '' });
    }
  };

  const handleQuickAddProduct = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const payload = {
        name: quickProduct.name,
        hsn_code: quickProduct.hsn_code,
        is_imei_tracked: quickProduct.is_imei_tracked,
        category: quickProduct.category ? parseInt(quickProduct.category, 10) : undefined,
        brand: quickProduct.brand ? parseInt(quickProduct.brand, 10) : undefined,
        variant: quickProduct.variant ? parseInt(quickProduct.variant, 10) : undefined,
        color: quickProduct.color ? parseInt(quickProduct.color, 10) : undefined,
        description: quickProduct.description,
      };
      const response = await productsAPI.create(payload);
      await fetchData();
      setFormData((prev) => ({ ...prev, product: response.data.id }));
      setShowQuickAdd(false);
      setQuickProduct({
        name: '',
        hsn_code: '',
        is_imei_tracked: false,
        category: '',
        brand: '',
        variant: '',
        color: '',
        description: '',
      });
      showToast.success('Product created successfully!');
    } catch (error: any) {
      const errorData = error.response?.data;
      const nonFieldError = Array.isArray(errorData?.non_field_errors) ? errorData.non_field_errors[0] : null;
      if (error.response?.status === 400 && nonFieldError) {
        showToast.error(nonFieldError);
        return;
      }
      console.error('Quick add product error:', error);
      const errorMessage = errorData?.detail || error.message || 'Failed to create product';
      showToast.error(`Failed to create product:\n${errorMessage}`);
    }
  };

  const handleQuickAddCategory = async (data: any) => {
    const response = await categoriesAPI.create(data);
    setCategories([...categories, response.data]);
    setQuickProduct({ ...quickProduct, category: String(response.data.id) });
    showToast.success('Category added successfully!');
  };

  const handleQuickAddBrand = async (data: any) => {
    const response = await brandsAPI.create(data);
    setBrands([...brands, response.data]);
    setQuickProduct({ ...quickProduct, brand: String(response.data.id) });
    showToast.success('Brand added successfully!');
  };

  const handleQuickAddVariant = async (data: any) => {
    const response = await variantsAPI.create(data);
    setVariants([...variants, response.data]);
    setQuickProduct({ ...quickProduct, variant: String(response.data.id) });
    showToast.success('Variant added successfully!');
  };

  const handleQuickAddColor = async (data: any) => {
    const response = await colorsAPI.create(data);
    setColors([...colors, response.data]);
    setQuickProduct({ ...quickProduct, color: String(response.data.id) });
    showToast.success('Color added successfully!');
  };

  const handleQuickAddCondition = async (data: any) => {
    const response = await conditionsAPI.create(data);
    setConditions([...conditions, response.data]);
    setFormData((prev) => ({ ...prev, condition: response.data.name as 'fresh' | 'second_hand' | 'refurbished' | 'open_box' | 'exchange' | 'damaged' | '' }));
    showToast.success('Condition added successfully!');
  };

  const handleQuickAddSource = async (data: any) => {
    const response = await sourcesAPI.create(data);
    setSources([...sources, response.data]);
    setFormData((prev) => ({ ...prev, source: response.data.name as 'distributor' | 'wholesaler' | 'customer' | 'other' | '' }));
    showToast.success('Source added successfully!');
  };

  const formProduct = products.find(p => p.id === parseInt(String(formData.product)));
  const shopOptions = shops.map((shop) => ({
    value: shop.id,
    label: shop.name,
    subLabel: shop.code ? `Code: ${shop.code}` : undefined,
    searchText: [shop.name, shop.code, shop.address].filter(Boolean).join(' '),
  }));
  const categoryOptions = [
    { value: '', label: 'No Category' },
    ...categories.map((cat) => ({
      value: String(cat.id),
      label: cat.name,
    })),
  ];
  const brandOptions = [
    { value: '', label: 'No Brand' },
    ...brands.map((brand) => ({
      value: String(brand.id),
      label: brand.name,
    })),
  ];
  const variantOptions = [
    { value: '', label: 'No Variant' },
    ...variants.map((variant) => ({
      value: String(variant.id),
      label: variant.name,
    })),
  ];
  const colorOptions = [
    { value: '', label: 'No Color' },
    ...colors.map((color) => ({
      value: String(color.id),
      label: color.name,
    })),
  ];
  const paymentMethodOptions = [
    { value: '', label: 'Select method' },
    { value: 'cash', label: 'Cash' },
    { value: 'upi', label: 'UPI' },
    { value: 'bank_transfer', label: 'Net Banking' },
    { value: 'card', label: 'Card' },
  ];
  const purchasedQuantity = parseInt(formData.purchased_quantity || '0') || 0;
  const allocatedQuantity = formData.distributions.reduce((sum, dist) => {
    const qty = parseInt(dist.quantity || '0');
    return sum + (Number.isNaN(qty) ? 0 : qty);
  }, 0);
  const remainingQuantity = purchasedQuantity - allocatedQuantity;

  const getLastSellingPrice = () => {
    if (!formData.product) return null;
    const productId = parseInt(String(formData.product));
    const condition = formData.condition || 'fresh';
    const candidates = batches
      .filter((batch) => batch.product === productId && batch.condition === condition)
      .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
    return candidates.length ? parseFloat(candidates[0].selling_price) : null;
  };
  const lastSellingPrice = getLastSellingPrice();
  const parsedTotalPurchaseAmount = parseFloat(formData.total_purchase_amount || '0');
  const displayPaidAmount = paymentStatus === 'paid'
    ? (editingId ? (invoiceBalance ?? parsedTotalPurchaseAmount) : parsedTotalPurchaseAmount)
    : 0;

  useEffect(() => {
    if (!formData.product || formData.selling_price) return;
    if (lastSellingPrice !== null) {
      setFormData((prev) => {
        if (prev.selling_price) return prev;
        return { ...prev, selling_price: lastSellingPrice.toFixed(2) };
      });
    }
  }, [formData.product, formData.condition, lastSellingPrice]);

  useEffect(() => {
    // Only run auto-allocation when the checkbox is first enabled
    // Don't continuously re-allocate to avoid interfering with IMEI input
    if (autoAllocate && purchasedQuantity > 0) {
      autoAllocateDistributions();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [autoAllocate]);

  if (loading) {
    return <FullScreenLoader label="Loading stock batches" />;
  }

  return (
    <div className="space-y-6">
      <div className="section-header">        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <p className="text-[11px] uppercase tracking-[0.3em] text-slate-600 dark:text-slate-400">Inventory Operations</p>
            <h1 className="text-3xl font-semibold text-slate-900 dark:text-slate-100">Stock Batches</h1>
            <p className="text-slate-700 dark:text-slate-300">Manage bulk purchases and inventory batches</p>
          </div>
          <div className="flex items-center gap-2">
            <HoverBorderGradient
              as="button"
              type="button"
              onClick={() => router.push('/dashboard/stock-batches/bulk-add')}
              className="!bg-emerald-600 !text-white hover:!bg-emerald-500 dark:!bg-emerald-500/80 dark:!text-emerald-50"
            >
              <FiUploadCloud className="h-4 w-4" />
              Bulk Add
            </HoverBorderGradient>
            <HoverBorderGradient
              as="button"
              type="button"
              onClick={() => setShowQuickAdd(true)}
              className="bg-white/90 dark:bg-transparent text-slate-900 dark:text-slate-100"
            >
              Quick Add Product
            </HoverBorderGradient>
            <HoverBorderGradient
              as="button"
              onClick={() => {
                const nextShow = !showForm;
                setShowForm(nextShow);
                if (nextShow) {
                  setEditingId(null);
                  setLastPayment(null);
                  setPaymentStatus('installment');
                  setInvoiceBalance(null);
                  setFormData({
                    batch_number: '',
                    product: '',
                    gst_slab: '',
                    purchased_quantity: '',
                    total_purchase_amount: '',
                    selling_price: '',
                    condition: 'fresh',
                    source: 'distributor',
                    is_interstate: false,
                    purchase_date: new Date().toISOString().split('T')[0],
                    supplier_name: '',
                    invoice_number: '',
                    initial_payment_amount: '',
                    initial_payment_method: '',
                    initial_payment_reference: '',
                    notes: '',
                    imei_list: [],
                    update_existing_price: false,
                    distributions: [],
                  });
                  return;
                }
                if (showForm) {
                  setEditingId(null);
                  setLastPayment(null);
                  setPaymentStatus('installment');
                  setInvoiceBalance(null);
                  setFormData({
                    batch_number: '',
                    product: '',
                    gst_slab: '',
                    purchased_quantity: '',
                    total_purchase_amount: '',
                    selling_price: '',
                    condition: 'fresh',
                    source: 'distributor',
                    is_interstate: false,
                    purchase_date: new Date().toISOString().split('T')[0],
                    supplier_name: '',
                    invoice_number: '',
                    initial_payment_amount: '',
                    initial_payment_method: '',
                    initial_payment_reference: '',
                    notes: '',
                    imei_list: [],
                    update_existing_price: false,
                    distributions: [],
                  });
                }
              }}
              className="bg-white/90 dark:bg-transparent text-slate-900 dark:text-slate-100"
            >
              <FiPlus className="h-4 w-4" />
              {showForm ? 'Cancel' : 'Add Stock Batch'}
            </HoverBorderGradient>
          </div>
        </div>
      </div>

      {showQuickAdd && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4">
          <div className="rounded-2xl border border-slate-200/80 dark:border-white/10 bg-white dark:bg-transparent w-full max-w-3xl max-h-[85vh] overflow-y-auto scrollbar-hide p-6 text-slate-900 dark:text-slate-100 shadow-[0_20px_60px_rgba(2,6,23,0.65)]">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h2 className="text-xl font-semibold">Quick Add Product</h2>
                <p className="text-sm text-slate-600 dark:text-slate-400">Create a product shell and continue stock entry</p>
              </div>
              <button
                type="button"
                onClick={() => setShowQuickAdd(false)}
                className="text-slate-600 dark:text-slate-400 hover:text-slate-200 transition-colors"
              >
                <FiX />
              </button>
            </div>
            <form onSubmit={handleQuickAddProduct} className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="md:col-span-2">
                <label htmlFor="name" className="block text-sm font-medium mb-1 text-slate-700 dark:text-slate-300">Product Name *</label>
                <input id="name" name="name"
                  type="text"
                  className="input"
                  value={quickProduct.name}
                  autoComplete="name"
                  onChange={(e) => setQuickProduct({ ...quickProduct, name: e.target.value })}
                  required
                />
              </div>

              <div>
                <label htmlFor="hsn_code" className="block text-sm font-medium mb-1 text-slate-700 dark:text-slate-300">HSN Code</label>
                <input id="hsn_code" name="hsn_code"
                  type="text"
                  className="input"
                  value={quickProduct.hsn_code}
                  autoComplete="off"
                  onChange={(e) => setQuickProduct({ ...quickProduct, hsn_code: e.target.value })}
                />
              </div>

              <div className="flex items-center mt-6">
                <input
                  type="checkbox"
                  id="quick_is_imei_tracked"
                  checked={quickProduct.is_imei_tracked}
                  onChange={(e) => setQuickProduct({ ...quickProduct, is_imei_tracked: e.target.checked })}
                  className="mr-2"
                />
                <label htmlFor="quick_is_imei_tracked" className="text-sm font-medium text-slate-700 dark:text-slate-300">
                  IMEI Tracked
                </label>
              </div>

              <SearchableSelect
                label="Category"
                placeholder="Select category..."
                value={quickProduct.category}
                onChange={(value) => setQuickProduct({ ...quickProduct, category: String(value) })}
                options={categoryOptions}
                onAddNew={(searchTerm) => {
                  setQuickAddInitialValue(searchTerm);
                  setShowCategoryModal(true);
                }}
                addNewLabel="Add Category"
              />

              <SearchableSelect
                label="Brand"
                placeholder="Select brand..."
                value={quickProduct.brand}
                onChange={(value) => setQuickProduct({ ...quickProduct, brand: String(value) })}
                options={brandOptions}
                onAddNew={(searchTerm) => {
                  setQuickAddInitialValue(searchTerm);
                  setShowBrandModal(true);
                }}
                addNewLabel="Add Brand"
              />

              <SearchableSelect
                label="Variant"
                placeholder="Select variant..."
                value={quickProduct.variant}
                onChange={(value) => setQuickProduct({ ...quickProduct, variant: String(value) })}
                options={variantOptions}
                onAddNew={(searchTerm) => {
                  setQuickAddInitialValue(searchTerm);
                  setShowVariantModal(true);
                }}
                addNewLabel="Add Variant"
              />

              <SearchableSelect
                label="Color"
                placeholder="Select color..."
                value={quickProduct.color}
                onChange={(value) => setQuickProduct({ ...quickProduct, color: String(value) })}
                options={colorOptions}
                onAddNew={(searchTerm) => {
                  setQuickAddInitialValue(searchTerm);
                  setShowColorModal(true);
                }}
                addNewLabel="Add Color"
              />

              <div className="md:col-span-2">
                <label htmlFor="description" className="block text-sm font-medium mb-1 text-slate-700 dark:text-slate-300">Description</label>
                <textarea id="description" name="description"
                  className="input"
                  rows={3}
                  value={quickProduct.description}
                  onChange={(e) => setQuickProduct({ ...quickProduct, description: e.target.value })}
                />
              </div>

              <div className="md:col-span-2 flex flex-wrap justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setShowQuickAdd(false)}
                  className="btn btn-outline"
                >
                  Cancel
                </button>
                <HoverBorderGradient
                  as="button"
                  type="submit"
                  className="bg-white/90 dark:bg-transparent text-slate-900 dark:text-slate-100"
                >
                  Create Product
                </HoverBorderGradient>
              </div>
            </form>
          </div>
        </div>
      )}

      {showForm && (
        <div ref={formRef} className="rounded-2xl border border-slate-200/80 dark:border-white/10 bg-white/90 dark:bg-transparent p-6 text-slate-900 dark:text-slate-100 shadow-lg dark:shadow-[0_20px_60px_rgba(2,6,23,0.45)]">
          <h2 className="text-xl font-semibold mb-4">{editingId ? 'Edit Stock Batch' : 'Create New Stock Batch'}</h2>
          {editingId && formData.imei_list.length > 0 && (
            <div className="mb-4 rounded-xl border border-slate-200/80 dark:border-white/10 bg-slate-50 dark:bg-transparent p-3">
              <p className="text-sm text-slate-700 dark:text-slate-300">
                <span className="font-semibold text-emerald-600 dark:text-emerald-200">Editing Mode:</span> {formData.imei_list.length} IMEI number(s) loaded from this batch.
                You can modify the IMEI list below.
              </p>
            </div>
          )}
          <form onSubmit={handleSubmit} className="grid grid-cols-2 gap-4">
            <div>
              <label htmlFor="batch_number" className="block text-sm font-medium mb-1">Batch Number *</label>
              <input id="batch_number" name="batch_number"
                type="text"
                className="input"
                value={formData.batch_number}
                autoComplete="off"
                onChange={(e) => setFormData({ ...formData, batch_number: e.target.value })}
                required
              />
            </div>

            <SearchableSelect
              label="Product"
              placeholder="Search and select product..."
              required
              value={formData.product}
              onChange={(value) => setFormData({ ...formData, product: value })}
              options={products.map((p) => {
                const nameBits = [
                  p.name,
                  p.variant_name,
                  p.color_name,
                  p.brand_name,
                  p.category_name,
                ].filter(Boolean);
                const detailBits = [
                  p.hsn_code && `HSN: ${p.hsn_code}`,
                  p.brand_name && `Brand: ${p.brand_name}`,
                  p.category_name && `Category: ${p.category_name}`,
                  p.variant_name && `Variant: ${p.variant_name}`,
                  p.color_name && `Color: ${p.color_name}`,
                ].filter(Boolean);
                const searchText = [
                  p.name,
                  p.category_name,
                  p.brand_name,
                  p.variant_name,
                  p.color_name,
                  p.hsn_code,
                ]
                  .filter(Boolean)
                  .join(' ');
                return {
                  value: p.id,
                  label: nameBits.join(' - '),
                  subLabel: `${detailBits.join(' | ')}${p.is_imei_tracked ? ' | IMEI Tracked' : ''}`,
                  searchText,
                };
              })}
            />

            <SearchableSelect
              label="GST Slab"
              placeholder="Search and select GST slab..."
              required
              value={formData.gst_slab}
              onChange={(value) => setFormData({ ...formData, gst_slab: String(value) })}
              options={gstSlabs.map((slab) => ({
                value: slab.id.toString(),
                label: `${slab.rate}% GST`,
                subLabel: `CGST: ${slab.cgst}% | SGST: ${slab.sgst}% | IGST: ${slab.igst}%`,
              }))}
            />

            <div>
              <label htmlFor="purchased_quantity" className="block text-sm font-medium mb-1">Purchased Quantity *</label>
              <input id="purchased_quantity" name="purchased_quantity"
                type="number"
                className="input"
                value={formData.purchased_quantity}
                onChange={(e) => setFormData({ ...formData, purchased_quantity: e.target.value })}
                required
                min="1"
              />
            </div>

            <div>
              <label htmlFor="total_purchase_amount" className="block text-sm font-medium mb-1">Total Purchase Amount (Rs) *</label>
              <input id="total_purchase_amount" name="total_purchase_amount"
                type="number"
                step="0.01"
                className="input"
                value={formData.total_purchase_amount}
                onChange={(e) => setFormData({ ...formData, total_purchase_amount: e.target.value })}
                required
              />
              {formData.total_purchase_amount && formData.purchased_quantity && parseInt(formData.purchased_quantity) > 0 && (
                <p className="mt-1 text-xs text-emerald-400 flex items-center gap-1">
                  <FiDollarSign className="flex-shrink-0" />
                  <span>Unit Cost: ₹{(parseFloat(formData.total_purchase_amount) / parseInt(formData.purchased_quantity)).toFixed(2)}</span>
                </p>
              )}
            </div>

            {/* Average Unit Price Calculator - Helper for user */}
            {formData.purchased_quantity && formData.total_purchase_amount && (
              <div className="col-span-2">
                <div className="rounded-xl border border-slate-200/80 dark:border-white/10 bg-slate-50 dark:bg-transparent p-4">
                  <div className="flex justify-between items-center">
                    <div>
                      <p className="text-sm font-medium text-slate-700 dark:text-slate-200">Average Unit Purchase Price (Cost)</p>
                      <p className="text-xs text-slate-600 dark:text-slate-400 mt-1">
                        Rs {formData.total_purchase_amount} x {formData.purchased_quantity} units
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="text-2xl font-bold text-emerald-700 dark:text-emerald-300">
                        Rs {(parseFloat(formData.total_purchase_amount) / parseFloat(formData.purchased_quantity)).toFixed(2)}
                      </p>
                      <p className="text-xs text-slate-600 dark:text-slate-400 mt-1">per unit</p>
                    </div>
                  </div>
                  <p className="text-xs text-slate-600 dark:text-slate-400 mt-2">
                    Tip: Set your selling price above this to make a profit
                  </p>
                </div>
              </div>
            )}

            <div>
              <label htmlFor="selling_price" className="block text-sm font-medium mb-1">Selling Price (Rs) *</label>
              <input id="selling_price" name="selling_price"
                type="number"
                step="0.01"
                min="0.01"
                className="input"
                value={formData.selling_price}
                onChange={(e) => setFormData({ ...formData, selling_price: e.target.value })}
                required
              />
              {lastSellingPrice !== null && (
                <p className="text-xs text-slate-600 dark:text-slate-400 mt-1">
                  Last selling price for this condition: Rs {lastSellingPrice.toFixed(2)}
                </p>
              )}
            </div>

            {lastSellingPrice !== null && (
              <div className="flex items-center">
                <input
                  type="checkbox"
                  id="update_existing_price"
                  checked={formData.update_existing_price}
                  onChange={(e) => setFormData({ ...formData, update_existing_price: e.target.checked })}
                  className="mr-2"
                />
                <label htmlFor="update_existing_price" className="text-sm font-medium">
                  Update selling price for available stock
                </label>
              </div>
            )}

            <SearchableSelect
              label="Condition"
              placeholder="Select condition..."
              required
              value={formData.condition}
              onChange={(value) => setFormData({ ...formData, condition: value as any })}
              options={conditionOptions}
              onAddNew={(searchTerm) => {
                setQuickAddInitialValue(searchTerm);
                setShowConditionModal(true);
              }}
              addNewLabel="Add Condition"
            />

            <SearchableSelect
              label="Source"
              placeholder="Select source..."
              required
              value={formData.source}
              onChange={(value) => setFormData({ ...formData, source: value as any })}
              options={sourceOptions}
              onAddNew={(searchTerm) => {
                setQuickAddInitialValue(searchTerm);
                setShowSourceModal(true);
              }}
              addNewLabel="Add Source"
            />

            <div>
              <label htmlFor="purchase_date" className="block text-sm font-medium mb-1">Purchase Date *</label>
              <input id="purchase_date" name="purchase_date"
                type="date"
                className="input"
                value={formData.purchase_date}
                onChange={(e) => setFormData({ ...formData, purchase_date: e.target.value })}
                required
              />
            </div>

            <div>
              <label htmlFor="supplier_name" className="block text-sm font-medium mb-1">Supplier Name</label>
              <input id="supplier_name" name="supplier_name"
                type="text"
                className="input"
                value={formData.supplier_name}
                autoComplete="organization"
                onChange={(e) => setFormData({ ...formData, supplier_name: e.target.value })}
              />
            </div>

            <div>
              <label htmlFor="invoice_number" className="block text-sm font-medium mb-1">Invoice Number</label>
              <input id="invoice_number" name="invoice_number"
                type="text"
                className="input"
                value={formData.invoice_number}
                autoComplete="off"
                onChange={(e) => setFormData({ ...formData, invoice_number: e.target.value })}
              />
            </div>

            <div className="col-span-2 space-y-3">
              <div>
                <p className="text-sm font-medium">Payment Status</p>
                <div className="mt-2 flex flex-wrap gap-4">
                  <label className="inline-flex items-center gap-2 text-sm">
                    <input
                      type="radio"
                      name="payment_status"
                      value="installment"
                      checked={paymentStatus === 'installment'}
                      onChange={() => {
                        setPaymentStatus('installment');
                      }}
                    />
                    Installment
                  </label>
                  <label className="inline-flex items-center gap-2 text-sm">
                    <input
                      type="radio"
                      name="payment_status"
                      value="paid"
                      checked={paymentStatus === 'paid'}
                      onChange={() => {
                        setPaymentStatus('paid');
                      }}
                    />
                    Fully Paid
                  </label>
                </div>
              </div>
              {paymentStatus === 'paid' && displayPaidAmount > 0 && (
                <p className="text-xs text-slate-600 dark:text-slate-400">
                  Full payment amount: Rs {displayPaidAmount.toFixed(2)}
                </p>
              )}
              {lastPayment && (
                <p className="text-xs text-slate-600 dark:text-slate-400">
                  Last payment: Rs {lastPayment.amount}
                  {lastPayment.method ? ` via ${formatPaymentLabel(lastPayment.method)}` : ''}
                  {lastPayment.reference ? ` (Ref: ${lastPayment.reference})` : ''}
                </p>
              )}
            </div>

            {paymentStatus === 'installment' && (
              <div>
                <label htmlFor="initial_payment_amount" className="block text-sm font-medium mb-1">
                  Payment Amount
                </label>
                <input
                  id="initial_payment_amount"
                  name="initial_payment_amount"
                  type="number"
                  min="0"
                  step="0.01"
                  className="input"
                  value={formData.initial_payment_amount}
                  onChange={(e) => setFormData({ ...formData, initial_payment_amount: e.target.value })}
                />
              </div>
            )}

            <div>
              <SearchableSelect
                label="Payment Method"
                value={formData.initial_payment_method}
                onChange={(value) => setFormData({ ...formData, initial_payment_method: String(value) as any })}
                options={paymentMethodOptions}
              />
            </div>

            <div className="col-span-2">
              <label htmlFor="initial_payment_reference" className="block text-sm font-medium mb-1">Payment Reference</label>
              <input
                id="initial_payment_reference"
                name="initial_payment_reference"
                type="text"
                className="input"
                value={formData.initial_payment_reference}
                autoComplete="off"
                onChange={(e) => setFormData({ ...formData, initial_payment_reference: e.target.value })}
              />
            </div>

            <div className="flex items-center col-span-2">
              <input
                type="checkbox"
                id="is_interstate"
                checked={formData.is_interstate}
                onChange={(e) => setFormData({ ...formData, is_interstate: e.target.checked })}
                className="mr-2"
              />
              <label htmlFor="is_interstate" className="text-sm font-medium">
                Interstate Purchase (Use IGST)
              </label>
            </div>

            <div className="col-span-2">
              <label htmlFor="notes" className="block text-sm font-medium mb-1">Notes</label>
              <textarea id="notes" name="notes"
                className="input"
                rows={3}
                value={formData.notes}
                onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
              />
            </div>

            {!editingId && (
              <div className="col-span-2">
                <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
                  <label htmlFor="shop" className="block text-sm font-medium">Initial Shop Distribution (Optional)</label>
                  <div className="flex items-center gap-2">
                    <button type="button" className="btn btn-secondary" onClick={addDistributionRow}>
                      Add Shop Allocation
                    </button>
                    <button type="button" className="btn btn-outline" onClick={autoAllocateDistributions}>
                      Auto Split Equally
                    </button>
                  </div>
                </div>

                <div className="flex items-center mt-2">
                  <input
                    type="checkbox"
                    id="auto_allocate"
                    checked={autoAllocate}
                    onChange={(e) => {
                      const next = e.target.checked;
                      setAutoAllocate(next);
                      if (next) {
                        autoAllocateDistributions();
                      }
                    }}
                    className="mr-2"
                  />
                  <label htmlFor="auto_allocate" className="text-sm text-slate-700 dark:text-slate-300">
                    Keep allocations equal across active shops
                  </label>
                </div>

                {formData.distributions.length === 0 ? (
                  <p className="text-sm text-slate-600 dark:text-slate-400 mt-2">
                    Leave empty to keep all units in main inventory.
                  </p>
                ) : (
                  <div className="space-y-4 mt-3">
                    {formData.distributions.map((dist, index) => (
                      <div key={index} className="border border-slate-200/80 dark:border-white/10 rounded-lg p-3">
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                          <SearchableSelect
                            label="Shop"
                            placeholder="Select shop..."
                            value={dist.shop}
                            onChange={(value) => updateDistributionRow(index, { shop: value })}
                            options={[
                              { value: '', label: 'Select shop' },
                              ...shopOptions,
                            ]}
                          />

                          <div>
                            <label htmlFor={`quantity-${index}`} className="block text-xs font-medium mb-1">Quantity</label>
                            <input id={`quantity-${index}`} name="quantity"
                              type="number"
                              min="1"
                              className="input"
                              value={dist.quantity}
                              onChange={(e) => updateDistributionRow(index, { quantity: e.target.value })}
                            />
                          </div>

                          <div className="flex items-end">
                            <button
                              type="button"
                              onClick={() => removeDistributionRow(index)}
                              className="text-red-600 hover:text-red-800 flex items-center"
                            >
                              <FiX className="mr-1" />
                              Remove
                            </button>
                          </div>
                        </div>

                        {formProduct?.is_imei_tracked && (
                          <div className="mt-3">
                            <label htmlFor={`distribution-imei-${index}`} className="block text-xs font-medium mb-1">IMEIs for this shop</label>
                            <textarea id={`distribution-imei-${index}`}
                              key={`dist-imei-${index}`}
                              name="distribution_imei_list"
                              className="input font-mono text-sm"
                              rows={5}
                              placeholder="One IMEI per line"
                              value={dist.imei_list.join('\n')}
                              onChange={(e) => {
                                const imeis = e.target.value.split('\n');
                                updateDistributionRow(index, { imei_list: imeis });
                              }}
                            />
                            <p className="text-xs text-slate-600 dark:text-slate-400 mt-1">
                              Entered: {dist.imei_list.filter(Boolean).length} IMEI(s)
                            </p>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                )}

                <div className="mt-3 text-sm text-slate-700 dark:text-slate-300">
                  Allocated:{' '}
                  <span className={allocatedQuantity > purchasedQuantity ? 'text-red-600 font-semibold' : 'font-semibold'}>
                    {allocatedQuantity}
                  </span>{' '}
                  / Purchased: {purchasedQuantity} | Remaining in main stock:{' '}
                  <span className={remainingQuantity < 0 ? 'text-red-600 font-semibold' : 'font-semibold'}>
                    {Math.max(remainingQuantity, 0)}
                  </span>
                </div>
              </div>
            )}

            {formData.product && formProduct?.is_imei_tracked && (
              <div className="col-span-2" key="imei-section">
                <label htmlFor="imei_list" className="block text-sm font-medium mb-1">
                  IMEI Numbers (One per line, must match purchased quantity)
                </label>
                {editingId && loadingEdit ? (
                <div className="rounded-xl border border-slate-200/80 dark:border-white/10 bg-slate-50 dark:bg-transparent p-4 text-center">
                  <p className="text-slate-700 dark:text-slate-300">Loading IMEI numbers...</p>
                </div>
              ) : (
                  <>
                    <textarea id="imei_list"
                      key="imei-textarea"
                      name="imei_list"
                      className="input font-mono text-sm"
                      rows={10}
                      placeholder="Enter IMEI numbers, one per line&#10;Example:&#10;123456789012345&#10;987654321098765"
                      value={formData.imei_list.join('\n')}
                      onChange={(e) => {
                        const imeis = e.target.value.split('\n');
                        setFormData((prev) => ({ ...prev, imei_list: imeis }));
                      }}
                    />
                    <div className="flex justify-between items-center mt-2">
                      <p className={`text-sm ${
                        formData.imei_list.filter(Boolean).length === parseInt(formData.purchased_quantity)
                          ? 'text-green-600 font-semibold'
                          : 'text-slate-600 dark:text-slate-400'
                      }`}>
                        Entered: {formData.imei_list.filter(Boolean).length} IMEI numbers
                        {formData.purchased_quantity && ` (Required: ${formData.purchased_quantity})`}
                      </p>
                      {editingId && formData.imei_list.filter(Boolean).length > 0 && (
                        <p className="text-xs text-emerald-700 dark:text-emerald-300">
                          Loaded {formData.imei_list.filter(Boolean).length} IMEI(s) from database
                        </p>
                      )}
                    </div>
                  </>
                )}
              </div>
            )}

            <div className="col-span-2">
              <HoverBorderGradient
                as="button"
                type="submit"
                className="w-full justify-center bg-white/90 dark:bg-transparent text-slate-900 dark:text-slate-100"
              >
                {editingId ? 'Update Stock Batch' : 'Create Stock Batch'}
              </HoverBorderGradient>
            </div>
          </form>
        </div>
      )}

      {showViewModal && (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4">
          <div className="rounded-2xl border border-slate-200/80 dark:border-white/10 bg-white dark:bg-transparent w-full max-w-5xl max-h-[85vh] overflow-y-auto scrollbar-hide text-slate-900 dark:text-slate-100 shadow-[0_20px_60px_rgba(2,6,23,0.65)]">
            <div className="sticky top-0 bg-white dark:bg-transparent border-b border-slate-200/80 dark:border-white/10 px-6 py-4 flex justify-between items-center">
              <div>
                <h2 className="text-xl font-semibold">Stock Batch Details</h2>
                <p className="text-sm text-slate-600 dark:text-slate-400">Complete batch record and availability</p>
              </div>
              <button
                onClick={closeViewModal}
                className="text-slate-600 dark:text-slate-400 hover:text-slate-200 transition-colors"
              >
                <FiX size={20} />
              </button>
            </div>

            <div className="p-6 space-y-6">
              {loadingView && (
                <div className="text-center py-12">
                  <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-sky-400 mx-auto"></div>
                  <p className="text-slate-600 dark:text-slate-400 mt-4">Loading batch details...</p>
                </div>
              )}

              {!loadingView && viewBatch && (
                <>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div className="bg-slate-50 dark:bg-transparent p-4 rounded-lg">
                      <p className="text-xs text-slate-600 dark:text-slate-400 mb-1">Batch Number</p>
                      <p className="font-semibold">{viewBatch.batch_number}</p>
                    </div>
                    <div className="bg-slate-50 dark:bg-transparent p-4 rounded-lg">
                      <p className="text-xs text-slate-600 dark:text-slate-400 mb-1">Product</p>
                      <p className="font-semibold">{viewBatch.product_name || 'N/A'}</p>
                    </div>
                    <div className="bg-slate-50 dark:bg-transparent p-4 rounded-lg">
                      <p className="text-xs text-slate-600 dark:text-slate-400 mb-1">Condition</p>
                      <span className="inline-flex rounded-full border border-emerald-400 dark:border-emerald-400/30 bg-emerald-100 dark:bg-emerald-500/15 px-3 py-1 text-xs font-semibold text-emerald-700 dark:text-emerald-200">
                        {viewBatch.condition_display || viewBatch.condition}
                      </span>
                    </div>
                    <div className="bg-slate-50 dark:bg-transparent p-4 rounded-lg">
                      <p className="text-xs text-slate-600 dark:text-slate-400 mb-1">Source</p>
                      <p className="font-semibold">{viewBatch.source_display || viewBatch.source}</p>
                    </div>
                    <div className="bg-slate-50 dark:bg-transparent p-4 rounded-lg">
                      <p className="text-xs text-slate-600 dark:text-slate-400 mb-1">Purchased Qty</p>
                      <p className="font-semibold">{viewBatch.purchased_quantity}</p>
                    </div>
                    <div className="bg-slate-50 dark:bg-transparent p-4 rounded-lg">
                      <p className="text-xs text-slate-600 dark:text-slate-400 mb-1">Available Qty</p>
                      <p className={`font-semibold ${viewBatch.available_quantity < 10 ? 'text-rose-700 dark:text-rose-300' : 'text-emerald-700 dark:text-emerald-300'}`}>
                        {viewBatch.available_quantity}
                      </p>
                    </div>
                    <div className="bg-slate-50 dark:bg-transparent p-4 rounded-lg">
                      <p className="text-xs text-slate-600 dark:text-slate-400 mb-1">Unit Cost</p>
                      <p className="font-semibold">Rs {parseFloat(viewBatch.unit_purchase_price).toFixed(2)}</p>
                    </div>
                    <div className="bg-slate-50 dark:bg-transparent p-4 rounded-lg">
                      <p className="text-xs text-slate-600 dark:text-slate-400 mb-1">Selling Price</p>
                      <p className="font-semibold text-emerald-700 dark:text-emerald-300">Rs {parseFloat(viewBatch.selling_price).toFixed(2)}</p>
                    </div>
                    <div className="bg-slate-50 dark:bg-transparent p-4 rounded-lg">
                      <p className="text-xs text-slate-600 dark:text-slate-400 mb-1">Profit / Unit</p>
                      <p className={`font-semibold ${viewBatch.profit_per_unit && viewBatch.profit_per_unit > 0 ? 'text-emerald-700 dark:text-emerald-300' : 'text-rose-700 dark:text-rose-300'}`}>
                        {viewBatch.profit_per_unit !== undefined ? `Rs ${viewBatch.profit_per_unit.toFixed(2)}` : 'N/A'}
                      </p>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="bg-slate-50 dark:bg-transparent p-4 rounded-lg">
                      <p className="text-xs text-slate-600 dark:text-slate-400 mb-1">Purchase Date</p>
                      <p className="font-semibold">{formatDate(viewBatch.purchase_date)}</p>
                    </div>
                    <div className="bg-slate-50 dark:bg-transparent p-4 rounded-lg">
                      <p className="text-xs text-slate-600 dark:text-slate-400 mb-1">GST Slab</p>
                      <p className="font-semibold">{viewBatch.gst_rate ? `${viewBatch.gst_rate}% GST` : 'N/A'}</p>
                    </div>
                    <div className="bg-slate-50 dark:bg-transparent p-4 rounded-lg">
                      <p className="text-xs text-slate-600 dark:text-slate-400 mb-1">Supplier</p>
                      <p className="font-semibold">{viewBatch.supplier_name || 'N/A'}</p>
                    </div>
                    <div className="bg-slate-50 dark:bg-transparent p-4 rounded-lg">
                      <p className="text-xs text-slate-600 dark:text-slate-400 mb-1">Invoice</p>
                      <p className="font-semibold">{viewBatch.invoice_number || 'N/A'}</p>
                    </div>
                  </div>

                  {viewBatch.notes && (
                    <div className="bg-slate-50 dark:bg-transparent p-4 rounded-lg">
                      <p className="text-xs text-slate-600 dark:text-slate-400 mb-1">Notes</p>
                      <p className="text-sm text-slate-700 dark:text-slate-200">{viewBatch.notes}</p>
                    </div>
                  )}

                  <div className="bg-slate-50 dark:bg-transparent p-4 rounded-lg">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-xs text-slate-600 dark:text-slate-400 mb-1">IMEI Numbers</p>
                        <p className="text-sm text-slate-700 dark:text-slate-200">
                          {viewBatch.imei_numbers?.length ? `${viewBatch.imei_numbers.length} IMEI(s)` : 'No IMEI records'}
                        </p>
                      </div>
                      {viewBatch.product_is_imei_tracked && (
                        <span className="text-xs font-semibold text-emerald-700 dark:text-emerald-200 border border-emerald-400 dark:border-emerald-400/30 bg-emerald-100 dark:bg-emerald-500/10 rounded-full px-3 py-1">
                          IMEI Tracked
                        </span>
                      )}
                    </div>
                    {viewBatch.imei_numbers && viewBatch.imei_numbers.length > 0 && (
                      <div className="mt-3 max-h-48 overflow-y-auto scrollbar-hide rounded-lg border border-slate-200/80 dark:border-white/10 bg-slate-100 dark:bg-black/40 p-3 font-mono text-xs text-slate-700 dark:text-slate-200 space-y-1">
                        {viewBatch.imei_numbers.map((imei) => (
                          <div key={imei.id} className="flex items-center justify-between">
                            <span>{imei.imei}</span>
                            <span className="text-slate-600 dark:text-slate-400">{imei.status.replace('_', ' ')}</span>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </>
              )}

              {!loadingView && !viewBatch && (
                <div className="text-center py-12 text-slate-600 dark:text-slate-400">
                  Batch details are unavailable.
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      <div className="rounded-2xl border border-slate-200/80 dark:border-white/10 bg-white/90 dark:bg-transparent p-6 text-slate-900 dark:text-slate-100 shadow-lg dark:shadow-[0_20px_60px_rgba(2,6,23,0.45)]">
        <div className="mb-4">
          <TableSearchBar
            onSearch={setSearchTerm}
            placeholder="Search batches by number, product, supplier, invoice..."
          />
        </div>
        <div className="overflow-x-auto scrollbar-hide rounded-2xl border border-slate-200/80 dark:border-white/10 bg-white dark:bg-transparent">
          <table className="table table-frost">
            <thead>
              <tr>
                <th className="w-12">
                  <input name="rowSelect"
                    type="checkbox"
                    checked={isAllSelected(paginatedIds)}
                    onChange={() => toggleSelectAll(paginatedIds)}
                  />
                </th>
                <th>Batch Number</th>
                <th>Product</th>
                <th>Condition</th>
                <th>Purchased Qty</th>
                <th>Available Qty</th>
                <th>Cost Price</th>
                <th>Selling Price</th>
                <th>Profit/Unit</th>
                <th>Purchase Date</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {paginatedBatches.map((batch) => (
                <tr key={batch.id} className={isSelected(batch.id) ? 'bg-slate-50 dark:bg-transparent' : ''}>
                  <td>
                    <input name="rowSelect"
                      type="checkbox"
                      checked={isSelected(batch.id)}
                      onChange={() => toggleSelect(batch.id)}
                    />
                  </td>
                  <td className="font-medium">{batch.batch_number}</td>
                  <td>{batch.product_name}</td>
                  <td>
                    <span className={`badge ${
                      batch.condition === 'fresh' ? 'badge-success' :
                      batch.condition === 'second_hand' ? 'badge-warning' :
                      batch.condition === 'refurbished' ? 'badge-info' :
                      'badge-secondary'
                    } text-xs`}>
                      {batch.condition_display}
                    </span>
                  </td>
                  <td>{batch.purchased_quantity}</td>
                  <td>
                    <span className={batch.available_quantity < 10 ? 'text-red-600 font-bold' : ''}>
                      {batch.available_quantity}
                    </span>
                  </td>
                  <td>Rs {parseFloat(batch.unit_purchase_price).toFixed(2)}</td>
                  <td className="text-emerald-700 dark:text-emerald-300 font-semibold">Rs {parseFloat(batch.selling_price).toFixed(2)}</td>
                  <td>
                    {batch.profit_per_unit !== undefined ? (
                      <span className={batch.profit_per_unit > 0 ? 'text-emerald-700 dark:text-emerald-300 font-semibold' : 'text-rose-700 dark:text-rose-300'}>
                        Rs {batch.profit_per_unit.toFixed(2)}
                      </span>
                    ) : '-'}
                  </td>
                  <td>{formatDate(batch.purchase_date)}</td>
                  <td>
                    <div className="flex flex-wrap gap-2">
                      <button
                        onClick={() => handleView(batch)}
                        className="inline-flex items-center gap-2 rounded-full border border-slate-200/80 dark:border-white/10 bg-slate-50 dark:bg-transparent px-3 py-1 text-xs font-semibold text-slate-900 dark:text-slate-100 transition hover:bg-white/10"
                        title="View Batch"
                      >
                        <FiEye size={14} />
                        View
                      </button>
                      <button
                        onClick={() => handleEdit(batch)}
                        className="inline-flex items-center gap-2 rounded-full border border-sky-400 dark:border-sky-400/30 bg-sky-100 dark:bg-sky-500/15 px-3 py-1 text-xs font-semibold text-sky-700 dark:text-sky-200 transition hover:bg-sky-200 dark:hover:bg-sky-500/25"
                        title="Edit Batch"
                        disabled={loadingEdit}
                      >
                        <FiEdit size={14} />
                        Edit
                      </button>
                      <button
                        onClick={() => openDeleteDialog([batch.id])}
                        className="inline-flex items-center gap-2 rounded-full border border-rose-400 dark:border-rose-400/30 bg-rose-100 dark:bg-rose-500/15 px-3 py-1 text-xs font-semibold text-rose-700 dark:text-rose-200 transition hover:bg-rose-200 dark:hover:bg-rose-500/25"
                        disabled={loadingEdit}
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
              No stock batches found. Create your first batch to get started.
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

      <QuickAddModal
        isOpen={showCategoryModal}
        onClose={() => setShowCategoryModal(false)}
        onSave={handleQuickAddCategory}
        title="Add New Category"
        initialValue={quickAddInitialValue}
        fields={[
          { name: 'name', label: 'Category Name', placeholder: 'e.g., Smartphones' },
          { name: 'description', label: 'Description', type: 'textarea', placeholder: 'Optional description', required: false },
        ]}
      />

      <QuickAddModal
        isOpen={showBrandModal}
        onClose={() => setShowBrandModal(false)}
        onSave={handleQuickAddBrand}
        title="Add New Brand"
        initialValue={quickAddInitialValue}
        fields={[
          { name: 'name', label: 'Brand Name', placeholder: 'e.g., Samsung' },
          { name: 'description', label: 'Description', type: 'textarea', placeholder: 'Optional description', required: false },
        ]}
      />

      <QuickAddModal
        isOpen={showVariantModal}
        onClose={() => setShowVariantModal(false)}
        onSave={handleQuickAddVariant}
        title="Add New Variant"
        initialValue={quickAddInitialValue}
        fields={[
          { name: 'name', label: 'Variant Name', placeholder: 'e.g., Galaxy S24 Ultra' },
          { name: 'description', label: 'Description', type: 'textarea', placeholder: 'Optional description', required: false },
        ]}
      />

      <QuickAddModal
        isOpen={showColorModal}
        onClose={() => setShowColorModal(false)}
        onSave={handleQuickAddColor}
        title="Add New Color"
        initialValue={quickAddInitialValue}
        fields={[
          { name: 'name', label: 'Color Name', placeholder: 'e.g., Titanium Gray' },
          { name: 'hex_code', label: 'Hex Code', type: 'color', placeholder: '#000000', required: false },
        ]}
      />

      <QuickAddModal
        isOpen={showConditionModal}
        onClose={() => setShowConditionModal(false)}
        onSave={handleQuickAddCondition}
        title="Add New Condition"
        initialValue={quickAddInitialValue}
        fields={[
          { name: 'name', label: 'Condition Name', placeholder: 'e.g., sealed' },
          { name: 'description', label: 'Description', type: 'textarea', placeholder: 'Optional description', required: false },
        ]}
      />

      <QuickAddModal
        isOpen={showSourceModal}
        onClose={() => setShowSourceModal(false)}
        onSave={handleQuickAddSource}
        title="Add New Source"
        initialValue={quickAddInitialValue}
        fields={[
          { name: 'name', label: 'Source Name', placeholder: 'e.g., distributor' },
          { name: 'description', label: 'Description', type: 'textarea', placeholder: 'Optional description', required: false },
        ]}
      />
    </div>
  );
}
