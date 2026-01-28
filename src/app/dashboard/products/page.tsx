'use client';

import { useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { productsAPI, categoriesAPI, brandsAPI, variantsAPI, colorsAPI, conditionsAPI, sourcesAPI, stockBatchesAPI, gstSlabsAPI, subStocksAPI, shopsAPI } from '@/lib/api';
import { useAuth } from '@/context/AuthContext';
import type { Product, Category, Brand, Variant, Color, Condition, Source, GSTSlab, StockBatch, SubStock, Shop } from '@/types';
import { FiEdit, FiTrash, FiPlus, FiPackage, FiEye, FiX, FiFilter, FiInfo, FiAlertCircle, FiArrowRight, FiDollarSign, FiUploadCloud } from 'react-icons/fi';
import SearchableSelect from '@/components/SearchableSelect';
import TableSearchBar from '@/components/TableSearchBar';
import { useMultiSelect } from '@/hooks/useMultiSelect';
import BulkActionBar from '@/components/BulkActionBar';
import { useAutoRefresh } from '@/hooks/useAutoRefresh';
import { formatDate } from '@/lib/date';
import { showToast } from '@/lib/toast';
import QuickAddModal from '@/components/QuickAddModal';
import FullScreenLoader from '@/components/FullScreenLoader';
import { HoverBorderGradient } from '@/components/ui/hover-border-gradient';
import { ConfirmDialog } from '@/components/ConfirmDialog';

export default function ProductsPage() {
  const router = useRouter();
  const { user } = useAuth();
  const [products, setProducts] = useState<Product[]>([]);
  const [filteredProducts, setFilteredProducts] = useState<Product[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [brands, setBrands] = useState<Brand[]>([]);
  const [variants, setVariants] = useState<Variant[]>([]);
  const [colors, setColors] = useState<Color[]>([]);
  const [conditions, setConditions] = useState<Condition[]>([]);
  const [sources, setSources] = useState<Source[]>([]);
  const [gstSlabs, setGstSlabs] = useState<GSTSlab[]>([]);
  const [shops, setShops] = useState<Shop[]>([]);
  const [subStocks, setSubStocks] = useState<SubStock[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [showStockModal, setShowStockModal] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [showDetailsModal, setShowDetailsModal] = useState(false);
  const [productBatches, setProductBatches] = useState<StockBatch[]>([]);
  const [loadingBatches, setLoadingBatches] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [editableBatches, setEditableBatches] = useState<StockBatch[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(25);
  const [priceRangesByProduct, setPriceRangesByProduct] = useState<Record<number, { min: number; max: number }>>({});
  const formRef = useRef<HTMLDivElement>(null);
  const [confirmState, setConfirmState] = useState({
    open: false,
    ids: [] as number[],
    title: '',
    message: '',
  });
  const [confirmLoading, setConfirmLoading] = useState(false);

  // Quick Add Modal states
  const [showCategoryModal, setShowCategoryModal] = useState(false);
  const [showBrandModal, setShowBrandModal] = useState(false);
  const [showVariantModal, setShowVariantModal] = useState(false);
  const [showColorModal, setShowColorModal] = useState(false);
  const [showConditionModal, setShowConditionModal] = useState(false);
  const [showSourceModal, setShowSourceModal] = useState(false);
  const [quickAddInitialValue, setQuickAddInitialValue] = useState('');

  // View toggle: 'current_shop' | 'all_shops' | 'main'
  // Default to 'all_shops' if user has no shop assigned, otherwise 'current_shop'
  const [viewMode, setViewMode] = useState<'current_shop' | 'all_shops' | 'main'>(
    user?.shop ? 'current_shop' : 'all_shops'
  );

  // Split by price toggle
  const [splitByPrice, setSplitByPrice] = useState(false);
  const [allStockBatches, setAllStockBatches] = useState<StockBatch[]>([]);

  // Filter states
  const [selectedCondition, setSelectedCondition] = useState<string>('');
  const [selectedBrand, setSelectedBrand] = useState<string>('');
  const [selectedVariant, setSelectedVariant] = useState<string>('');
  const [selectedColor, setSelectedColor] = useState<string>('');
  const [selectedCategory, setSelectedCategory] = useState<string>('');
  const [selectedProductCondition, setSelectedProductCondition] = useState<string>(''); // For product condition filter
  const [selectedShop, setSelectedShop] = useState<string>('');

  // Product availability suggestions
  const [availabilitySuggestions, setAvailabilitySuggestions] = useState<{
    mainStock: number;
    shops: { shopId: number; shopName: string; count: number }[];
  } | null>(null);

  const [stockFormData, setStockFormData] = useState({
    batch_number: '',
    purchased_quantity: '',
    total_purchase_amount: '',
    selling_price: '',
    condition: 'fresh',
    source: 'distributor',
    gst_slab: '',
    update_existing_price: false,
    is_interstate: false,
    purchase_date: new Date().toISOString().split('T')[0],
    supplier_name: '',
    invoice_number: '',
    initial_payment_amount: '',
    initial_payment_method: '',
    initial_payment_reference: '',
    notes: '',
    imei_list: [] as string[],
    distributions: [] as { shop: string | number; quantity: string; imei_list: string[] }[],
  });

  const [autoAllocate, setAutoAllocate] = useState(false);

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
    hsn_code: string;
    is_imei_tracked: boolean;
    category: string | number;
    brand: string | number;
    variant: string | number;
    color: string | number;
    description: string;
  }>({
    name: '',
    hsn_code: '',
    is_imei_tracked: false,
    category: '',
    brand: '',
    variant: '',
    color: '',
    description: '',
  });

  useEffect(() => {
    fetchData();
  }, []);

  useEffect(() => {
    applyFilters();
  }, [products, searchTerm, selectedBrand, selectedVariant, selectedColor, selectedCategory, selectedProductCondition, viewMode, subStocks, selectedShop]);

  // Helper function to get stock locations for a product
  const getProductStockLocations = (product: Product) => {
    const locations: {
      mainStock: number;
      shopStocks: { shopId: number; shopName: string; quantity: number }[];
    } = {
      mainStock: 0,
      shopStocks: [],
    };

    const shopStockMap = new Map<number, { shopName: string; quantity: number }>();

    if (product.stock_by_condition && product.stock_by_condition.length > 0) {
      product.stock_by_condition.forEach((condition) => {
        locations.mainStock += condition.main_stock || 0;
        condition.shops?.forEach((shop) => {
          const existing = shopStockMap.get(shop.shop_id);
          if (existing) {
            existing.quantity += shop.quantity;
          } else {
            shopStockMap.set(shop.shop_id, {
              shopName: shop.shop_name,
              quantity: shop.quantity,
            });
          }
        });
      });

      locations.shopStocks = Array.from(shopStockMap.entries()).map(([shopId, data]) => ({
        shopId,
        shopName: data.shopName,
        quantity: data.quantity,
      }));
      return locations;
    }

    // Fallback: derive from sub-stocks (older data shape)
    const productSubStocks = subStocks.filter((ss) => ss.product_name === product.name);
    let totalShopQty = 0;
    productSubStocks.forEach((ss) => {
      const existing = shopStockMap.get(ss.shop);
      totalShopQty += ss.quantity;
      if (existing) {
        existing.quantity += ss.quantity;
      } else {
        shopStockMap.set(ss.shop, {
          shopName: ss.shop_name || 'Unknown Shop',
          quantity: ss.quantity,
        });
      }
    });

    const totalStock = product.total_stock || 0;
    locations.mainStock = Math.max(0, totalStock - totalShopQty);

    locations.shopStocks = Array.from(shopStockMap.entries()).map(([shopId, data]) => ({
      shopId,
      shopName: data.shopName,
      quantity: data.quantity,
    }));

    return locations;
  };

  type ConditionStock = NonNullable<Product['stock_by_condition']>[number];

  const getConditionStock = (product: Product, condition: string): ConditionStock | undefined => {
    return product.stock_by_condition?.find((stock) => stock.condition === condition);
  };

  const getConditionShopQty = (
    conditionStock: ConditionStock | undefined,
    shopId?: number
  ) => {
    if (!conditionStock || !shopId) return 0;
    return conditionStock.shops?.find((shop) => shop.shop_id === shopId)?.quantity || 0;
  };

  const getProductStockValue = (product: Product & { _splitPrice?: number; _splitStock?: number }) => {
    if (splitByPrice && product._splitPrice !== undefined && product._splitStock !== undefined) {
      return product._splitPrice * product._splitStock;
    }

    if (allStockBatches.length === 0) {
      return null;
    }

    let productBatches = allStockBatches.filter((batch) => batch.product === product.id);
    if (selectedProductCondition) {
      productBatches = productBatches.filter((batch) => batch.condition === selectedProductCondition);
    }

    if (productBatches.length === 0) {
      return null;
    }

    if (viewMode === 'main') {
      return productBatches.reduce((sum, batch) => {
        return sum + batch.available_quantity * parseFloat(batch.selling_price || '0');
      }, 0);
    }

    const batchMap = new Map(productBatches.map((batch) => [batch.id, batch]));
    let relevantSubStocks = subStocks.filter((ss) => batchMap.has(ss.stock_batch));

    if (viewMode === 'current_shop' && user?.shop) {
      relevantSubStocks = relevantSubStocks.filter((ss) => ss.shop === user.shop);
    } else if (viewMode === 'all_shops' && selectedShop) {
      relevantSubStocks = relevantSubStocks.filter((ss) => ss.shop === parseInt(selectedShop));
    }

    return relevantSubStocks.reduce((sum, subStock) => {
      const batch = batchMap.get(subStock.stock_batch);
      if (!batch) return sum;
      return sum + subStock.quantity * parseFloat(batch.selling_price || '0');
    }, 0);
  };

  const applyFilters = () => {
    let filtered = [...products];

    // Apply all filters first
    // Text search
    if (searchTerm) {
      const term = searchTerm.toLowerCase();
      filtered = filtered.filter(
        (product) =>
          product.name?.toLowerCase().includes(term) ||
          product.brand_name?.toLowerCase().includes(term) ||
          product.variant_name?.toLowerCase().includes(term) ||
          product.hsn_code?.toLowerCase().includes(term)
      );
    }

    // Brand filter
    if (selectedBrand) {
      filtered = filtered.filter((p) => p.brand_name === selectedBrand);
    }

    // Variant filter
    if (selectedVariant) {
      filtered = filtered.filter((p) => p.variant_name === selectedVariant);
    }

    // Color filter
    if (selectedColor) {
      filtered = filtered.filter((p) => p.color_name === selectedColor);
    }

    // Category filter
    if (selectedCategory) {
      filtered = filtered.filter((p) => p.category_name === selectedCategory);
    }

    // Save filtered products before applying shop/view filters
    const productsMatchingFilters = [...filtered];

    // View mode and shop filtering
    if (viewMode === 'current_shop') {
      // Current shop view - show only products in user's shop
      const currentShopId = user?.shop;

      if (currentShopId) {
        filtered = filtered.filter((product) => {
          const conditionStock = selectedProductCondition
            ? getConditionStock(product, selectedProductCondition)
            : undefined;
          if (selectedProductCondition && !conditionStock) {
            return false;
          }

          const locations = getProductStockLocations(product);
          const currentShopQty = selectedProductCondition
            ? getConditionShopQty(conditionStock, currentShopId)
            : (locations.shopStocks.find((shop) => shop.shopId === currentShopId)?.quantity || 0);

          return currentShopQty > 0;
        });

        // Calculate suggestions if no products found in current shop
        if (filtered.length === 0 && productsMatchingFilters.length > 0) {
          const suggestions = {
            mainStock: 0,
            shops: [] as { shopId: number; shopName: string; count: number }[],
          };

          const shopCountMap = new Map<number, { shopName: string; count: number }>();

          productsMatchingFilters.forEach((product) => {
            const conditionStock = selectedProductCondition
              ? getConditionStock(product, selectedProductCondition)
              : undefined;
            if (selectedProductCondition && !conditionStock) {
              return;
            }

            const locations = getProductStockLocations(product);
            const mainQty = selectedProductCondition
              ? (conditionStock?.main_stock || 0)
              : locations.mainStock;

            // Count main stock
            if (mainQty > 0) {
              suggestions.mainStock += 1;
            }

            // Count shop stocks (excluding current shop)
            const shopsForSuggestions = selectedProductCondition
              ? (conditionStock?.shops || []).map((shop) => ({
                shopId: shop.shop_id,
                shopName: shop.shop_name,
                quantity: shop.quantity,
              }))
              : locations.shopStocks;

            shopsForSuggestions.forEach((shop) => {
              if (shop.shopId !== currentShopId && shop.quantity > 0) {
                const existing = shopCountMap.get(shop.shopId);
                if (existing) {
                  existing.count += 1;
                } else {
                  shopCountMap.set(shop.shopId, {
                    shopName: shop.shopName,
                    count: 1,
                  });
                }
              }
            });
          });

          suggestions.shops = Array.from(shopCountMap.entries())
            .map(([shopId, data]) => ({ shopId, ...data }))
            .sort((a, b) => b.count - a.count);

          setAvailabilitySuggestions(suggestions);
        } else {
          setAvailabilitySuggestions(null);
        }
      }
    } else if (viewMode === 'all_shops') {
      // All shops view
      if (selectedShop) {
        // Specific shop selected - filter by that shop
        filtered = filtered.filter((product) => {
          const conditionStock = selectedProductCondition
            ? getConditionStock(product, selectedProductCondition)
            : undefined;
          if (selectedProductCondition && !conditionStock) {
            return false;
          }

          const shopId = parseInt(selectedShop);
          const locations = getProductStockLocations(product);
          const shopQty = selectedProductCondition
            ? getConditionShopQty(conditionStock, shopId)
            : (locations.shopStocks.find((shop) => shop.shopId === shopId)?.quantity || 0);

          return shopQty > 0;
        });
      } else if (selectedProductCondition) {
        // Condition filter applied - only show products with that condition
        filtered = filtered.filter((product) => {
          const conditionStock = getConditionStock(product, selectedProductCondition);
          return conditionStock !== undefined;
        });
      }
      // If no shop and no condition selected, show ALL products (including those with 0 stock)
      setAvailabilitySuggestions(null);
    } else {
      // Main stock view - show products with main stock only
      filtered = filtered.filter((product) => {
        const conditionStock = selectedProductCondition
          ? getConditionStock(product, selectedProductCondition)
          : undefined;
        if (selectedProductCondition && !conditionStock) {
          return false;
        }

        const locations = getProductStockLocations(product);
        const mainQty = selectedProductCondition
          ? (conditionStock?.main_stock || 0)
          : locations.mainStock;

        return mainQty > 0;
      });
      setAvailabilitySuggestions(null);
    }

    setFilteredProducts(filtered);
  };

  const loadSupportingData = async () => {
    const results = await Promise.allSettled([
      categoriesAPI.list(),
      brandsAPI.list(),
      variantsAPI.list(),
      colorsAPI.list(),
      conditionsAPI.list(),
      sourcesAPI.list(),
      gstSlabsAPI.list(),
      shopsAPI.list(),
      stockBatchesAPI.list(),
    ]);

    const [
      categoriesRes,
      brandsRes,
      variantsRes,
      colorsRes,
      conditionsRes,
      sourcesRes,
      gstSlabsRes,
      shopsRes,
      stockBatchesRes,
    ] = results;

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

    if (stockBatchesRes.status === 'fulfilled') {
      setPriceRangesByProduct(buildPriceRanges(stockBatchesRes.value.data));
      setAllStockBatches(stockBatchesRes.value.data);
    } else {
      setPriceRangesByProduct({});
      setAllStockBatches([]);
    }
  };

  const fetchData = async () => {
    try {
      const [productsRes, subStocksRes] = await Promise.all([
        productsAPI.list(),
        subStocksAPI.list(),
      ]);

      setProducts(productsRes.data);
      setSubStocks(subStocksRes.data);
    } catch (error) {
      console.error('Failed to fetch data:', error);
      setProducts([]);
      setSubStocks([]);
    } finally {
      setLoading(false);
    }

  };
  useAutoRefresh(fetchData);

  useEffect(() => {
    void loadSupportingData();
  }, []);

  const fetchProducts = async (useSearch: boolean = true) => {
    try {
      const response = await productsAPI.list(useSearch ? searchTerm : '');
      setProducts(response.data);
    } catch (error) {
      console.error('Failed to fetch products:', error);
      setProducts([]);
    }
  };

  const fetchSubStocks = async () => {
    try {
      const response = await subStocksAPI.list();
      setSubStocks(response.data);
    } catch (error) {
      console.error('Failed to fetch sub-stocks:', error);
      setSubStocks([]);
    }
  };

  const buildPriceRanges = (batches: StockBatch[]) => {
    const ranges: Record<number, { min: number; max: number }> = {};
    batches.forEach((batch) => {
      const price = Number.parseFloat(batch.selling_price as string);
      if (!Number.isFinite(price)) return;
      const productId =
        typeof batch.product === 'object' && batch.product
          ? (batch.product as { id?: number }).id
          : batch.product;
      if (!productId) return;
      const current = ranges[productId];
      if (!current) {
        ranges[productId] = { min: price, max: price };
        return;
      }
      if (price < current.min) current.min = price;
      if (price > current.max) current.max = price;
    });
    return ranges;
  };

  const fetchPriceRanges = async () => {
    try {
      const response = await stockBatchesAPI.list();
      setPriceRangesByProduct(buildPriceRanges(response.data));
      setAllStockBatches(response.data);
    } catch (error) {
      console.error('Failed to fetch price ranges:', error);
      setPriceRangesByProduct({});
      setAllStockBatches([]);
    }
  };

  // Function to expand products by individual selling prices
  const getProductsByPrice = (productList: Product[]) => {
    if (!splitByPrice) {
      return productList;
    }

    console.log('=== SPLIT BY PRICE LOGIC ===');
    console.log('Input products:', productList.length);
    console.log('Stock batches loaded:', allStockBatches.length);
    console.log('Sub-stocks loaded:', subStocks.length);

    if (allStockBatches.length === 0) {
      console.warn('No stock batches available - showing products normally');
      return productList;
    }

    type ExpandedProduct = Product & {
      _splitPrice?: number;
      _splitCondition?: string;
      _splitStock?: number;
    };

    const expandedProducts: ExpandedProduct[] = [];

    productList.forEach((product) => {
      // Get all batches for this product, respecting condition filter
      const productBatches = allStockBatches.filter((batch) => {
        if (batch.product !== product.id) return false;

        // Respect condition filter if applied
        if (selectedProductCondition && batch.condition !== selectedProductCondition) {
          return false;
        }

        return true;
      });

      console.log(`Product: "${product.name}" → ${productBatches.length} batches (condition filter: ${selectedProductCondition || 'none'})`);

      if (productBatches.length === 0) {
        // No batches - skip this product in split mode (don't show products with no stock)
        return;
      }

      // Create a map of batch ID to batch info
      const batchMap = new Map(productBatches.map(b => [b.id, b]));
      const batchIds = Array.from(batchMap.keys());

      // Get sub-stocks for these batches (filtered by current view mode)
      let relevantSubStocks = subStocks.filter(ss => batchIds.includes(ss.stock_batch));

      // Filter by view mode
      if (viewMode === 'current_shop' && user?.shop) {
        relevantSubStocks = relevantSubStocks.filter(ss => ss.shop === user.shop);
      } else if (viewMode === 'all_shops') {
        if (selectedShop) {
          relevantSubStocks = relevantSubStocks.filter(ss => ss.shop === parseInt(selectedShop));
        }
        // If no specific shop selected, include all shops
      } else if (viewMode === 'main') {
        // Main stock - use batch.available_quantity instead
        relevantSubStocks = [];
      }

      console.log(`  → ${relevantSubStocks.length} sub-stocks for current view`);

      // Group by BOTH selling price AND condition (and color/variant if they differ)
      // Key format: "price_condition_variant_color"
      const priceConditionMap = new Map<string, {
        price: number;
        condition: string;
        stock: number;
        variant?: string;
        color?: string;
      }>();

      if (viewMode === 'main') {
        // For main stock, use batch available_quantity
        productBatches.forEach((batch) => {
          const price = parseFloat(batch.selling_price);
          const condition = batch.condition;
          const stock = batch.available_quantity;

          // Create unique key combining price + condition
          const key = `${price}_${condition}`;

          if (!priceConditionMap.has(key)) {
            priceConditionMap.set(key, { price, condition, stock: 0 });
          }
          priceConditionMap.get(key)!.stock += stock;
        });
      } else {
        // For shop views, use sub-stock quantities
        relevantSubStocks.forEach((subStock) => {
          const batch = batchMap.get(subStock.stock_batch);
          if (!batch) return;

          const price = parseFloat(batch.selling_price);
          const condition = batch.condition;

          // Create unique key combining price + condition
          const key = `${price}_${condition}`;

          if (!priceConditionMap.has(key)) {
            priceConditionMap.set(key, { price, condition, stock: 0 });
          }
          priceConditionMap.get(key)!.stock += subStock.quantity;
        });
      }

      // Sort by price first, then by condition
      const sortedEntries = Array.from(priceConditionMap.values()).sort((a, b) => {
        if (a.price !== b.price) return a.price - b.price;
        return a.condition.localeCompare(b.condition);
      });

      console.log(`  → Splitting into ${sortedEntries.length} price+condition combinations:`);

      // Create a row for each unique price+condition combination
      sortedEntries.forEach(({ price, condition, stock }) => {
        console.log(`    • ₹${price} (${condition}) - ${stock} units`);

        expandedProducts.push({
          ...product,
          _splitPrice: price,
          _splitCondition: condition,
          _splitStock: stock,
        });
      });
    });

    console.log(`\nFinal output: ${expandedProducts.length} rows (from ${productList.length} products)`);
    console.log('=== END SPLIT LOGIC ===\n');

    return expandedProducts;
  };

  // Get the display products (either split or normal)
  const displayProducts = getProductsByPrice(filteredProducts);
  const totalDisplayCount = displayProducts.length;
  const totalPages = Math.max(1, Math.ceil(totalDisplayCount / pageSize));
  const pageStart = totalDisplayCount === 0 ? 0 : (currentPage - 1) * pageSize;
  const pageEnd = Math.min(pageStart + pageSize, totalDisplayCount);
  const pageLabelStart = totalDisplayCount === 0 ? 0 : pageStart + 1;
  const paginatedProducts = displayProducts.slice(pageStart, pageEnd);
  const paginatedIds = Array.from(new Set(paginatedProducts.map((product) => product.id)));

  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm, selectedBrand, selectedVariant, selectedColor, selectedCategory, selectedProductCondition, viewMode, selectedShop, splitByPrice, pageSize]);

  useEffect(() => {
    if (currentPage > totalPages) {
      setCurrentPage(totalPages);
    }
  }, [currentPage, totalPages]);

  const scrollToForm = () => {
    setTimeout(() => {
      formRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }, 100);
  };

  useEffect(() => {
    const timer = setTimeout(() => {
      fetchProducts();
    }, 300);
    return () => clearTimeout(timer);
  }, [searchTerm]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const submitData = {
        name: formData.name,
        hsn_code: formData.hsn_code,
        is_imei_tracked: formData.is_imei_tracked,
        category: formData.category ? parseInt(formData.category as string) : undefined,
        brand: formData.brand ? parseInt(formData.brand as string) : undefined,
        variant: formData.variant ? parseInt(formData.variant as string) : undefined,
        color: formData.color ? parseInt(formData.color as string) : undefined,
        description: formData.description,
      };

      console.log('Submitting product data:', submitData);
      const response = editingId
        ? await productsAPI.update(editingId, submitData)
        : await productsAPI.create(submitData);

      if (editingId) {
        showToast.success('Product updated successfully!');
      } else {
        showToast.success('Product created successfully!');
        // Switch to 'all_shops' view to show newly created product (which has no stock yet)
        setViewMode('all_shops');
      }
      setShowForm(false);
      setEditingId(null);
      setFormData({
        name: '',
        hsn_code: '',
        is_imei_tracked: false,
        category: '',
        brand: '',
        variant: '',
        color: '',
        description: '',
      });
      // Clear any active filters to ensure new product is visible
      setSearchTerm('');
      setSelectedBrand('');
      setSelectedVariant('');
      setSelectedColor('');
      setSelectedCategory('');
      setSelectedProductCondition('');
      setSelectedShop('');
      await fetchProducts(false);
    } catch (error: any) {
      const errorData = error.response?.data;
      const nonFieldError = Array.isArray(errorData?.non_field_errors) ? errorData.non_field_errors[0] : null;
      if (error.response?.status === 400 && nonFieldError) {
        showToast.error(nonFieldError);
        return;
      }
      console.error('Product save error:', error);
      const errorMessage = errorData?.detail || error.message || 'Failed to save product';
      showToast.error(`Failed to save product:\n${errorMessage}`);
    }
  };

  const handleEdit = (product: Product) => {
    setFormData({
      name: product.name,
      hsn_code: product.hsn_code,
      is_imei_tracked: product.is_imei_tracked,
      category: product.category || '',
      brand: product.brand || '',
      variant: product.variant || '',
      color: product.color || '',
      description: product.description || '',
    });
    setEditingId(product.id);
    setShowForm(true);
    scrollToForm();
  };

  const handleEditWithBatches = async (product: Product & { _splitPrice?: number; _splitCondition?: string }) => {
    setSelectedProduct(product);
    setFormData({
      name: product.name,
      hsn_code: product.hsn_code,
      is_imei_tracked: product.is_imei_tracked,
      category: product.category || '',
      brand: product.brand || '',
      variant: product.variant || '',
      color: product.color || '',
      description: product.description || '',
    });
    setEditingId(product.id);
    setLoadingBatches(true);
    setShowEditModal(true);

    try {
      // Fetch all stock batches for this product
      const response = await stockBatchesAPI.list();
      let filteredBatches = response.data.filter((batch: StockBatch) => batch.product === product.id);

      // If split price is active and we have split price data, filter batches by price and condition
      if (splitByPrice && product._splitPrice !== undefined && product._splitCondition !== undefined) {
        filteredBatches = filteredBatches.filter((batch: StockBatch) =>
          parseFloat(batch.selling_price) === product._splitPrice &&
          batch.condition === product._splitCondition
        );
      }

      setEditableBatches(filteredBatches);
    } catch (error) {
      console.error('Failed to fetch product batches:', error);
      setEditableBatches([]);
    } finally {
      setLoadingBatches(false);
    }
  };

  // Update batch field
  const updateBatchField = (batchId: number, field: keyof StockBatch, value: any) => {
    setEditableBatches((prev) =>
      prev.map((batch) =>
        batch.id === batchId ? { ...batch, [field]: value } : batch
      )
    );
  };

  // Bulk update selling price for all displayed batches
  const bulkUpdatePrice = (newPrice: string) => {
    if (!newPrice || parseFloat(newPrice) <= 0) {
      showToast.info('Please enter a valid price');
      return;
    }
    setEditableBatches((prev) =>
      prev.map((batch) => ({ ...batch, selling_price: newPrice }))
    );
  };

  // Save product and batches
  const handleSaveProductAndBatches = async () => {
    if (!editingId) return;

    try {
      // Update product details
      await productsAPI.update(editingId, {
        name: formData.name,
        hsn_code: formData.hsn_code,
        is_imei_tracked: formData.is_imei_tracked,
        category: formData.category ? parseInt(formData.category.toString()) : undefined,
        brand: formData.brand ? parseInt(formData.brand.toString()) : undefined,
        variant: formData.variant ? parseInt(formData.variant.toString()) : undefined,
        color: formData.color ? parseInt(formData.color.toString()) : undefined,
        description: formData.description,
      });

      // Update each modified batch
      const batchUpdatePromises = editableBatches.map((batch) =>
        stockBatchesAPI.update(batch.id, {
          batch_number: batch.batch_number,
          selling_price: batch.selling_price,
          supplier_name: batch.supplier_name,
          invoice_number: batch.invoice_number,
          condition: batch.condition,
          source: batch.source,
          purchase_date: batch.purchase_date,
          notes: batch.notes,
        })
      );

      await Promise.all(batchUpdatePromises);

      showToast.success('Product and batches updated successfully!');
      setShowEditModal(false);
      setEditingId(null);
      setEditableBatches([]);
      await Promise.all([fetchProducts(false), fetchPriceRanges()]);
    } catch (error: any) {
      console.error('Update error:', error);
      const errorMessage = error.response?.data
        ? JSON.stringify(error.response.data, null, 2)
        : 'Failed to update product and batches';
      showToast.error(`Failed to update:\n${errorMessage}`);
    }
  };

  const handleViewDetails = async (product: Product & { _splitPrice?: number; _splitCondition?: string; _splitStock?: number }) => {
    setSelectedProduct(product);
    setLoadingBatches(true);
    setShowDetailsModal(true);

    try {
      // Fetch all stock batches for this product
      const response = await stockBatchesAPI.list();
      let filteredBatches = response.data.filter((batch: StockBatch) => batch.product === product.id);

      // If split price is active and we have split price data, filter batches by price and condition
      if (splitByPrice && product._splitPrice !== undefined && product._splitCondition !== undefined) {
        filteredBatches = filteredBatches.filter((batch: StockBatch) =>
          parseFloat(batch.selling_price) === product._splitPrice &&
          batch.condition === product._splitCondition
        );
      }

      setProductBatches(filteredBatches);
    } catch (error) {
      console.error('Failed to fetch product batches:', error);
      setProductBatches([]);
    } finally {
      setLoadingBatches(false);
    }
  };

  const handleDelete = async (id: number) => {
    openDeleteDialog(
      [id],
      'Are you sure you want to delete this product? This will also delete all associated stock batches, IMEI numbers, sub-stocks, and stock requests.'
    );
  };

  const handleBulkDelete = async () => {
    openDeleteDialog(
      selectedIds,
      `Are you sure you want to delete ${selectedIds.length} product(s)? This will cascade delete all stock batches, IMEI numbers, sub-stocks, and stock requests.`
    );
  };

  const openDeleteDialog = (ids: number[], message: string) => {
    if (ids.length === 0) return;
    setConfirmState({
      open: true,
      ids,
      title: ids.length === 1 ? 'Delete Product' : 'Delete Products',
      message,
    });
  };

  const handleConfirmDelete = async () => {
    const ids = confirmState.ids;
    if (ids.length === 0) return;
    setConfirmLoading(true);
    try {
      if (ids.length === 1) {
        await productsAPI.delete(ids[0]);
        showToast.success('Product deleted successfully!');
      } else {
        await productsAPI.bulkDelete(ids);
        showToast.success('Products deleted successfully!');
      }
      removeSelection(ids);
      await fetchProducts(false);
    } catch (error: any) {
      console.error('Product deletion error:', error);
      const errorMessage = error.response?.data?.error || error.response?.data?.detail || 'Failed to delete product';
      showToast.error(`Failed to delete product:\n${errorMessage}`);
    } finally {
      setConfirmLoading(false);
      setConfirmState({ open: false, ids: [], title: '', message: '' });
    }
  };

  const handleOpenStockModal = async (product: Product & { _splitPrice?: number; _splitCondition?: string }) => {
    setSelectedProduct(product);

    // Fetch existing batches for this product to auto-fill data
    try {
      const response = await stockBatchesAPI.list();
      const productBatches = response.data.filter((batch: StockBatch) => batch.product === product.id);

      let autoFillData: any = {
        batch_number: `BATCH-${Date.now()}`,
        purchased_quantity: '',
        total_purchase_amount: '',
        selling_price: '',
        condition: selectedProductCondition || 'fresh',
        source: 'distributor',
        gst_slab: '',
        update_existing_price: false,
        is_interstate: false,
        purchase_date: new Date().toISOString().split('T')[0],
        supplier_name: '',
        invoice_number: '',
        initial_payment_amount: '',
        initial_payment_method: '',
        initial_payment_reference: '',
        notes: '',
        imei_list: [] as string[],
        distributions: [] as { shop: string | number; quantity: string; imei_list: string[] }[],
      };

      if (productBatches.length > 0) {
        // Sort by purchase_date descending to get most recent batch
        const sortedBatches = [...productBatches].sort(
          (a, b) => new Date(b.purchase_date).getTime() - new Date(a.purchase_date).getTime()
        );
        const mostRecentBatch = sortedBatches[0];

        // Auto-fill from most recent batch
        autoFillData = {
          ...autoFillData,
          supplier_name: mostRecentBatch.supplier_name || '',
          gst_slab: mostRecentBatch.gst_slab.toString(),
          is_interstate: mostRecentBatch.is_interstate,
          source: mostRecentBatch.source || 'distributor',
        };

        // If split price is active and we have split condition, use that
        if (product._splitCondition) {
          autoFillData.condition = product._splitCondition;
        } else if (selectedProductCondition) {
          autoFillData.condition = selectedProductCondition;
        } else {
          // Use most common condition from existing batches
          const conditionCounts = productBatches.reduce((acc: any, batch) => {
            acc[batch.condition] = (acc[batch.condition] || 0) + 1;
            return acc;
          }, {});
          const mostCommonCondition = Object.entries(conditionCounts).sort((a: any, b: any) => b[1] - a[1])[0]?.[0];
          autoFillData.condition = mostCommonCondition || 'fresh';
        }

        // Suggest selling price based on most recent batch with same condition
        const samConditionBatch = sortedBatches.find(b => b.condition === autoFillData.condition);
        if (samConditionBatch) {
          autoFillData.selling_price = samConditionBatch.selling_price;
        } else if (product._splitPrice) {
          // If from split price view, use that price
          autoFillData.selling_price = product._splitPrice.toString();
        }
      }

      setStockFormData(autoFillData);
    } catch (error) {
      console.error('Failed to fetch batches for auto-fill:', error);
      // Fallback to basic data if fetch fails
      setStockFormData({
        batch_number: `BATCH-${Date.now()}`,
        purchased_quantity: '',
        total_purchase_amount: '',
        selling_price: product._splitPrice?.toString() || '',
        condition: product._splitCondition || selectedProductCondition || 'fresh',
        source: 'distributor',
        gst_slab: '',
        update_existing_price: false,
        is_interstate: false,
        purchase_date: new Date().toISOString().split('T')[0],
        supplier_name: '',
        invoice_number: '',
        initial_payment_amount: '',
        initial_payment_method: '',
        initial_payment_reference: '',
        notes: '',
        imei_list: [] as string[],
        distributions: [] as { shop: string | number; quantity: string; imei_list: string[] }[],
      });
    }

    setShowStockModal(true);
  };

  // Distribution helper functions
  const addDistributionRow = () => {
    setStockFormData((prev) => ({
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
    setStockFormData((prev) => {
      const updated = [...prev.distributions];
      updated[index] = { ...updated[index], ...updates };
      return { ...prev, distributions: updated };
    });
  };

  const removeDistributionRow = (index: number) => {
    setStockFormData((prev) => {
      const updated = prev.distributions.filter((_, i) => i !== index);
      return { ...prev, distributions: updated };
    });
  };

  const autoAllocateDistributions = () => {
    const activeShops = shops.filter((shop) => shop.is_active);
    if (!activeShops.length) {
      showToast.info('No active shops available for distribution.');
      return;
    }
    const purchasedQty = parseInt(stockFormData.purchased_quantity || '0');
    if (!purchasedQty || purchasedQty < 1) {
      showToast.info('Enter a purchased quantity before auto allocation.');
      return;
    }

    const baseQty = Math.floor(purchasedQty / activeShops.length);
    const remainder = purchasedQty % activeShops.length;
    const masterImeis = stockFormData.imei_list.filter(Boolean);
    const imeiAvailable = selectedProduct?.is_imei_tracked && masterImeis.length === purchasedQty;
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

    setStockFormData((prev) => ({ ...prev, distributions: allocations }));
  };

  // Calculate distribution quantities
  const purchasedQuantity = parseInt(stockFormData.purchased_quantity || '0') || 0;
  const allocatedQuantity = stockFormData.distributions.reduce((sum, dist) => {
    const qty = parseInt(dist.quantity || '0');
    return sum + (Number.isNaN(qty) ? 0 : qty);
  }, 0);
  const remainingQuantity = purchasedQuantity - allocatedQuantity;

  const getLastSellingPrice = () => {
    if (!selectedProduct) return null;
    const condition = stockFormData.condition || 'fresh';
    const candidates = allStockBatches
      .filter((batch) => batch.product === selectedProduct.id && batch.condition === condition)
      .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
    return candidates.length ? parseFloat(candidates[0].selling_price) : null;
  };
  const lastSellingPrice = getLastSellingPrice();

  useEffect(() => {
    if (!selectedProduct || stockFormData.selling_price) return;
    if (lastSellingPrice !== null) {
      setStockFormData((prev) => {
        if (prev.selling_price) return prev;
        return { ...prev, selling_price: lastSellingPrice.toFixed(2) };
      });
    }
  }, [selectedProduct, stockFormData.condition, lastSellingPrice]);

  // Auto-allocate effect
  useEffect(() => {
    if (autoAllocate && purchasedQuantity > 0 && shops.length > 0) {
      autoAllocateDistributions();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [autoAllocate, stockFormData.purchased_quantity, stockFormData.imei_list]);

  const handleAddStock = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedProduct) return;

    const cleanedImeis = stockFormData.imei_list.map((imei) => imei.trim()).filter((imei) => imei !== '');
    const purchasedQty = parseInt(stockFormData.purchased_quantity);
    const initialPaymentRaw = parseFloat(stockFormData.initial_payment_amount || '0');
    const initialPaymentAmount = Number.isFinite(initialPaymentRaw) ? initialPaymentRaw : 0;

    if (initialPaymentAmount > 0 && !stockFormData.initial_payment_method) {
      showToast.info('Payment method is required when initial payment is provided.');
      return;
    }
    if (stockFormData.initial_payment_method && initialPaymentAmount <= 0) {
      showToast.info('Initial payment amount must be greater than zero when payment method is set.');
      return;
    }

    // Validate distributions if provided
    const normalizedDistributions: { shopId: number; quantity: number; imei_list: string[] }[] = [];

    if (stockFormData.distributions.length > 0) {
      // Check for incomplete rows
      const incompleteRows = stockFormData.distributions.filter(
        (dist) => (dist.shop && !dist.quantity) || (!dist.shop && dist.quantity)
      );
      if (incompleteRows.length > 0) {
        showToast.info('Each distribution row must have both shop and quantity specified.');
        return;
      }

      // Normalize and validate distributions
      for (const dist of stockFormData.distributions) {
        if (!dist.shop || !dist.quantity) continue;

        const shopId = typeof dist.shop === 'string' ? parseInt(dist.shop) : dist.shop;
        const quantity = parseInt(dist.quantity);
        const imeiList = dist.imei_list.map((imei) => imei.trim()).filter(Boolean);

        normalizedDistributions.push({ shopId, quantity, imei_list: imeiList });
      }

      // Check total allocated quantity doesn't exceed purchased quantity
      const allocatedQuantity = normalizedDistributions.reduce((sum, dist) => sum + dist.quantity, 0);
      if (allocatedQuantity > purchasedQty) {
        showToast.info(`Allocated quantity (${allocatedQuantity}) exceeds purchased quantity (${purchasedQty}).`);
        return;
      }

      // Validate that IMEI count in each allocation matches the quantity for that allocation
      for (const dist of normalizedDistributions) {
        if (dist.imei_list.length > 0 && dist.imei_list.length !== dist.quantity) {
          showToast.info(`Shop allocation IMEI count (${dist.imei_list.length}) must match allocated quantity (${dist.quantity}).`);
          return;
        }
      }

      // Check for duplicate shops
      const shopIds = normalizedDistributions.map((dist) => dist.shopId);
      const uniqueShopIds = new Set(shopIds);
      if (uniqueShopIds.size !== shopIds.length) {
        showToast.info('Each shop can only appear once in the distribution list.');
        return;
      }

      // IMEI validation for distributed products
      if (selectedProduct.is_imei_tracked) {
        const distributionImeis = normalizedDistributions.flatMap((dist) => dist.imei_list);

        // Check for duplicates across distributions if any IMEIs provided
        if (distributionImeis.length > 0) {
          const uniqueImeis = new Set(distributionImeis);
          if (uniqueImeis.size !== distributionImeis.length) {
            showToast.info('Duplicate IMEIs found across shop distributions.');
            return;
          }
        }

        // Auto-fill master IMEI list from distributions if all IMEIs are allocated
        if (cleanedImeis.length === 0 && distributionImeis.length > 0) {
          if (distributionImeis.length === purchasedQty) {
            // All purchased items are distributed with IMEIs, use distribution IMEIs as master list
            cleanedImeis.push(...distributionImeis);
          } else {
            showToast.info('Master IMEI list is required when some IMEIs stay in main stock.');
            return;
          }
        }

        // If distribution has IMEIs, they must be in master list
        if (distributionImeis.length > 0) {
          const masterSet = new Set(cleanedImeis);
          const missing = distributionImeis.filter((imei) => !masterSet.has(imei));
          if (missing.length) {
            showToast.info('Some distributed IMEIs are not in the master IMEI list.');
            return;
          }
        }
      }
    }

    // Validate IMEI count for IMEI-tracked products
    if (selectedProduct.is_imei_tracked) {
      if (cleanedImeis.length !== purchasedQty) {
        showToast.info(`IMEI count (${cleanedImeis.length}) must match purchased quantity (${purchasedQty})`);
        return;
      }
    }

    try {
      const submitData: any = {
        batch_number: stockFormData.batch_number,
        product: selectedProduct.id,
        gst_slab: parseInt(stockFormData.gst_slab),
        purchased_quantity: purchasedQty,
        total_purchase_amount: parseFloat(stockFormData.total_purchase_amount),
        condition: stockFormData.condition || selectedProductCondition || 'fresh',
        source: stockFormData.source || 'distributor',
        update_existing_price: stockFormData.update_existing_price,
        is_interstate: stockFormData.is_interstate,
        purchase_date: stockFormData.purchase_date,
        supplier_name: stockFormData.supplier_name,
        invoice_number: stockFormData.invoice_number,
        notes: stockFormData.notes,
        imei_list: cleanedImeis,
        ...(stockFormData.selling_price
          ? { selling_price: parseFloat(stockFormData.selling_price) }
          : {}),
      };

      // Add distributions if present
      if (normalizedDistributions.length > 0) {
        submitData.distributions = normalizedDistributions.map((dist) => ({
          shop: dist.shopId,
          quantity: dist.quantity,
          imei_list: dist.imei_list,
        }));
      }

      if (initialPaymentAmount > 0) {
        submitData.initial_payment_amount = initialPaymentAmount;
        submitData.initial_payment_method = stockFormData.initial_payment_method;
        submitData.initial_payment_reference = stockFormData.initial_payment_reference;
      }

      await stockBatchesAPI.create(submitData);
      showToast.success('Stock added successfully!');
      setShowStockModal(false);
      setStockFormData({
        batch_number: '',
        purchased_quantity: '',
        total_purchase_amount: '',
        selling_price: '',
        condition: 'fresh',
        source: 'distributor',
        gst_slab: '',
        update_existing_price: false,
        is_interstate: false,
        purchase_date: new Date().toISOString().split('T')[0],
        supplier_name: '',
        invoice_number: '',
        initial_payment_amount: '',
        initial_payment_method: '',
        initial_payment_reference: '',
        notes: '',
        imei_list: [],
        distributions: [],
      });
      setAutoAllocate(false);
      await Promise.all([fetchProducts(false), fetchPriceRanges(), fetchSubStocks()]);
    } catch (error: any) {
      console.error('Add stock error:', error);
      const errorMessage = error.response?.data
        ? JSON.stringify(error.response.data, null, 2)
        : 'Failed to add stock';
      showToast.error(`Failed to add stock:\n${errorMessage}`);
    }
  };

  // Quick Add handlers
  const handleQuickAddCategory = async (data: any) => {
    const response = await categoriesAPI.create(data);
    setCategories([...categories, response.data]);
    setFormData({ ...formData, category: response.data.id });
    showToast.success('Category added successfully!');
  };

  const handleQuickAddBrand = async (data: any) => {
    const response = await brandsAPI.create(data);
    setBrands([...brands, response.data]);
    setFormData({ ...formData, brand: response.data.id });
    showToast.success('Brand added successfully!');
  };

  const handleQuickAddVariant = async (data: any) => {
    const response = await variantsAPI.create(data);
    setVariants([...variants, response.data]);
    setFormData({ ...formData, variant: response.data.id });
    showToast.success('Variant added successfully!');
  };

  const handleQuickAddColor = async (data: any) => {
    const response = await colorsAPI.create(data);
    setColors([...colors, response.data]);
    setFormData({ ...formData, color: response.data.id });
    showToast.success('Color added successfully!');
  };

  const handleQuickAddCondition = async (data: any) => {
    const response = await conditionsAPI.create(data);
    setConditions([...conditions, response.data]);
    setStockFormData((prev) => ({ ...prev, condition: response.data.name }));
    showToast.success('Condition added successfully!');
  };

  const handleQuickAddSource = async (data: any) => {
    const response = await sourcesAPI.create(data);
    setSources([...sources, response.data]);
    setStockFormData((prev) => ({ ...prev, source: response.data.name }));
    showToast.success('Source added successfully!');
  };

  if (loading) {
    return <FullScreenLoader label="Loading products" />;
  }

  const formatConditionLabel = (value: string) =>
    value.replace(/_/g, ' ').replace(/\b\w/g, (char) => char.toUpperCase());
  const formatSourceLabel = (value: string) =>
    value.replace(/_/g, ' ').replace(/\b\w/g, (char) => char.toUpperCase());
  const formatPaymentMethod = (value: string) =>
    value.replace(/_/g, ' ').replace(/\b\w/g, (char) => char.toUpperCase());
  const conditionColorMap: Record<string, string> = {
    fresh: 'border-emerald-400 dark:border-emerald-400/30 bg-emerald-100 dark:bg-emerald-500/15 text-emerald-700 dark:text-emerald-200',
    second_hand: 'border-sky-400 dark:border-sky-400/30 bg-sky-100 dark:bg-sky-500/15 text-sky-700 dark:text-sky-200',
    refurbished: 'border-indigo-400 dark:border-indigo-400/30 bg-indigo-100 dark:bg-indigo-500/15 text-indigo-700 dark:text-indigo-200',
    open_box: 'border-amber-400 dark:border-amber-400/30 bg-amber-100 dark:bg-amber-500/15 text-amber-700 dark:text-amber-200',
    exchange: 'border-orange-400 dark:border-orange-400/30 bg-orange-100 dark:bg-orange-500/15 text-orange-700 dark:text-orange-200',
    damaged: 'border-rose-400 dark:border-rose-400/30 bg-rose-100 dark:bg-rose-500/15 text-rose-700 dark:text-rose-200',
  };
  const getConditionLabel = (value: string) => formatConditionLabel(value);
  const getConditionColor = (value: string) =>
    conditionColorMap[value] || 'border-slate-400/30 bg-slate-50 dark:bg-transparent text-slate-700 dark:text-slate-200';

  const conditionOptions = [
    { value: '', label: 'All Conditions' },
    ...conditions.map((condition) => ({
      value: condition.name,
      label: formatConditionLabel(condition.name),
      subLabel: condition.description || undefined,
    })),
  ];

  const conditionSelectOptions = [
    { value: '', label: 'Select Condition' },
    ...conditions.map((condition) => ({
      value: condition.name,
      label: formatConditionLabel(condition.name),
      subLabel: condition.description || undefined,
    })),
  ];

  const sourceSelectOptions = [
    { value: '', label: 'Select Source' },
    ...sources.map((source) => ({
      value: source.name,
      label: formatSourceLabel(source.name),
      subLabel: source.description || undefined,
    })),
  ];

  const paymentMethodOptions = [
    { value: '', label: 'Select method' },
    { value: 'cash', label: 'Cash' },
    { value: 'upi', label: 'UPI' },
    { value: 'bank_transfer', label: 'Net Banking' },
    { value: 'card', label: 'Card' },
  ];

  const brandOptions = [
    { value: '', label: 'All Brands' },
    ...Array.from(new Set(products.map((p) => p.brand_name).filter(Boolean))).map((brand) => ({
      value: brand as string,
      label: brand as string,
    })),
  ];

  const variantOptions = [
    { value: '', label: 'All Variants' },
    ...Array.from(new Set(products.map((p) => p.variant_name).filter(Boolean))).map((variant) => ({
      value: variant as string,
      label: variant as string,
    })),
  ];

  const colorOptions = [
    { value: '', label: 'All Colors' },
    ...Array.from(new Set(products.map((p) => p.color_name).filter(Boolean))).map((color) => ({
      value: color as string,
      label: color as string,
    })),
  ];

  const categoryOptions = [
    { value: '', label: 'All Categories' },
    ...Array.from(new Set(products.map((p) => p.category_name).filter(Boolean))).map((category) => ({
      value: category as string,
      label: category as string,
    })),
  ];

  const shopOptions = [
    { value: '', label: 'All Shops' },
    ...shops.map((shop) => ({
      value: shop.id.toString(),
      label: shop.name,
    })),
  ];

  const editCategoryOptions = [
    { value: '', label: 'Select Category' },
    ...categories.map((cat) => ({ value: cat.id, label: cat.name })),
  ];

  const editBrandOptions = [
    { value: '', label: 'Select Brand' },
    ...brands.map((brand) => ({ value: brand.id, label: brand.name })),
  ];

  const editVariantOptions = [
    { value: '', label: 'Select Variant' },
    ...variants.map((variant) => ({ value: variant.id, label: variant.name })),
  ];

  const editColorOptions = [
    { value: '', label: 'Select Color' },
    ...colors.map((color) => ({ value: color.id, label: color.name })),
  ];

  const batchConditionOptions = conditionSelectOptions.filter((option) => option.value !== '');

  const batchSourceOptions = sourceSelectOptions.filter((option) => option.value !== '');

  return (
    <>
      <div className="space-y-6">
        <div className="section-header section-header-plain">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div>
              <p className="text-[11px] uppercase tracking-[0.3em] text-slate-600 dark:text-slate-400">Inventory Nexus</p>
              <h1 className="text-3xl font-semibold text-slate-900 dark:text-slate-100">Products</h1>
              <p className="text-slate-700 dark:text-slate-300">
                {user?.role === 'sub_stock_manager'
                  ? 'View products and check stock availability'
                  : 'Manage your product catalog'
                }
              </p>
              <p className="text-sm text-slate-600 dark:text-slate-400">
                Total products: {products.length}
              </p>
            </div>
            {/* Only show Add Product button for non-sub-stock managers */}
            {user?.role !== 'sub_stock_manager' && (
              <div className="flex flex-wrap items-center gap-2">
                <HoverBorderGradient
                  as="button"
                  onClick={() => router.push('/dashboard/products/bulk-add')}
                  className="!bg-emerald-600 !text-white hover:!bg-emerald-500 dark:!bg-emerald-500/80 dark:!text-emerald-50 shadow-lg hover:shadow-emerald-500/25 transition-all duration-300 transform hover:-translate-y-0.5"
                >
                  <div className="flex items-center gap-2 px-1">
                    <FiUploadCloud className="h-4 w-4" />
                    <span className="font-semibold tracking-wide">Bulk Add</span>
                  </div>
                </HoverBorderGradient>
                <HoverBorderGradient
                  as="button"
                  onClick={() => {
                    setShowForm(!showForm);
                    if (showForm) {
                      setEditingId(null);
                      setFormData({
                        name: '',
                        hsn_code: '',
                        is_imei_tracked: false,
                        category: '',
                        brand: '',
                        variant: '',
                        color: '',
                        description: '',
                      });
                    }
                  }}
                  className={showForm ? 'bg-slate-100 text-slate-900 dark:bg-transparent dark:text-slate-200' : 'bg-white/90 dark:bg-transparent text-slate-900 dark:text-slate-100'}
                >
                  <FiPlus className="h-4 w-4" />
                  {showForm ? 'Cancel' : 'Add Product'}
                </HoverBorderGradient>
              </div>
            )}
          </div>
        </div>

        {showForm && (
          <div ref={formRef} className="card mb-6 border-slate-200/80 dark:border-white/10 bg-white/90 dark:bg-transparent text-slate-900 dark:text-slate-100 shadow-lg dark:shadow-[0_20px_60px_rgba(2,6,23,0.45)]">
            <h2 className="text-xl font-semibold mb-4">
              {editingId ? 'Edit Product' : 'Create New Product'}
            </h2>
            <form onSubmit={handleSubmit} className="grid grid-cols-2 gap-4">
              <div>
                <label htmlFor="name" className="block text-sm font-medium mb-1">Product Name *</label>
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
                <label htmlFor="hsn_code" className="block text-sm font-medium mb-1">HSN Code</label>
                <input id="hsn_code" name="hsn_code"
                  type="text"
                  className="input"
                  value={formData.hsn_code}
                  autoComplete="off"
                  onChange={(e) => setFormData({ ...formData, hsn_code: e.target.value })}
                  placeholder="Optional"
                />
              </div>


              <SearchableSelect
                label="Category"
                placeholder="Search and select category..."
                value={formData.category}
                onChange={(value) => setFormData({ ...formData, category: value })}
                options={[
                  { value: '', label: 'No Category' },
                  ...categories.map((cat) => ({
                    value: cat.id,
                    label: cat.name,
                    subLabel: cat.description || undefined,
                  })),
                ]}
                onAddNew={(searchTerm) => {
                  setQuickAddInitialValue(searchTerm);
                  setShowCategoryModal(true);
                }}
                addNewLabel="Add Category"
              />

              <SearchableSelect
                label="Brand"
                placeholder="Search and select brand..."
                value={formData.brand}
                onChange={(value) => setFormData({ ...formData, brand: value })}
                options={[
                  { value: '', label: 'No Brand' },
                  ...brands.map((brand) => ({
                    value: brand.id,
                    label: brand.name,
                    subLabel: brand.description || undefined,
                  })),
                ]}
                onAddNew={(searchTerm) => {
                  setQuickAddInitialValue(searchTerm);
                  setShowBrandModal(true);
                }}
                addNewLabel="Add Brand"
              />

              <SearchableSelect
                label="Variant"
                placeholder="Search and select variant..."
                value={formData.variant}
                onChange={(value) => setFormData({ ...formData, variant: value })}
                options={[
                  { value: '', label: 'No Variant' },
                  ...variants.map((variant) => ({
                    value: variant.id,
                    label: variant.name,
                    subLabel: variant.description || undefined,
                  })),
                ]}
                onAddNew={(searchTerm) => {
                  setQuickAddInitialValue(searchTerm);
                  setShowVariantModal(true);
                }}
                addNewLabel="Add Variant"
              />

              <SearchableSelect
                label="Color"
                placeholder="Search and select color..."
                value={formData.color}
                onChange={(value) => setFormData({ ...formData, color: value })}
                options={[
                  { value: '', label: 'No Color' },
                  ...colors.map((color) => ({
                    value: color.id,
                    label: color.name,
                    subLabel: color.hex_code || undefined,
                  })),
                ]}
                onAddNew={(searchTerm) => {
                  setQuickAddInitialValue(searchTerm);
                  setShowColorModal(true);
                }}
                addNewLabel="Add Color"
              />

              <div className="flex items-center">
                <input
                  type="checkbox"
                  id="is_imei_tracked"
                  checked={formData.is_imei_tracked}
                  onChange={(e) => setFormData({ ...formData, is_imei_tracked: e.target.checked })}
                  className="mr-2"
                />
                <label htmlFor="is_imei_tracked" className="text-sm font-medium">
                  Enable IMEI Tracking
                </label>
              </div>

              <div className="col-span-2">
                <label htmlFor="description" className="block text-sm font-medium mb-1">Description</label>
                <textarea id="description" name="description"
                  className="input"
                  rows={3}
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                />
              </div>

              <div className="col-span-2">
                <HoverBorderGradient as="button" type="submit" className="w-full justify-center bg-white/90 dark:bg-transparent text-slate-900 dark:text-slate-100">
                  {editingId ? 'Update Product' : 'Create Product'}
                </HoverBorderGradient>
              </div>
            </form>
          </div>
        )}

        <div className="card border-slate-200/80 dark:border-white/10 bg-white/90 dark:bg-transparent text-slate-900 dark:text-slate-100 shadow-lg dark:shadow-[0_20px_60px_rgba(2,6,23,0.45)]">
          {/* View Mode Toggle */}
          <div className="mb-4 pb-4 border-b border-slate-200/80 dark:border-white/10">
            <div className="flex items-center justify-between gap-4">
              <div>
                <h3 className="text-sm font-semibold mb-2 text-slate-700 dark:text-slate-200">Stock View</h3>
                <div className="flex gap-2">
                  {/* Only show Current Shop button if user has a shop assigned */}
                  {user?.shop && (
                    <button
                      onClick={() => setViewMode('current_shop')}
                      className={`px-4 py-2 rounded-lg text-sm font-medium transition ${viewMode === 'current_shop'
                        ? 'bg-slate-900 text-white border border-slate-900 dark:bg-white/10 dark:text-white dark:border-white/30'
                        : 'bg-slate-50 text-slate-700 border border-slate-200/80 hover:bg-white dark:bg-white/5 dark:text-slate-200 dark:border-white/10 dark:hover:bg-white/10'
                        }`}
                    >
                      Current Shop
                    </button>
                  )}
                  <button
                    onClick={() => setViewMode('all_shops')}
                    className={`px-4 py-2 rounded-lg text-sm font-medium transition ${viewMode === 'all_shops'
                      ? 'bg-slate-900 text-white border border-slate-900 dark:bg-white/10 dark:text-white dark:border-white/30'
                      : 'bg-slate-50 text-slate-700 border border-slate-200/80 hover:bg-white dark:bg-white/5 dark:text-slate-200 dark:border-white/10 dark:hover:bg-white/10'
                      }`}
                  >
                    All Shops
                  </button>
                  <button
                    onClick={() => setViewMode('main')}
                    className={`px-4 py-2 rounded-lg text-sm font-medium transition ${viewMode === 'main'
                      ? 'bg-slate-900 text-white border border-slate-900 dark:bg-white/10 dark:text-white dark:border-white/30'
                      : 'bg-slate-50 text-slate-700 border border-slate-200/80 hover:bg-white dark:bg-white/5 dark:text-slate-200 dark:border-white/10 dark:hover:bg-white/10'
                      }`}
                  >
                    Main Stock
                  </button>
                </div>

                {/* Split by Price Toggle */}
                <div className="mt-3">
                  <button
                    onClick={() => setSplitByPrice(!splitByPrice)}
                    className={`px-4 py-2 rounded-lg text-sm font-medium transition flex items-center gap-2 ${splitByPrice
                      ? 'bg-emerald-600 text-white border border-emerald-600 hover:bg-emerald-500 dark:bg-transparent dark:text-emerald-200 dark:border-emerald-400/40 dark:hover:bg-emerald-500/10'
                      : 'bg-slate-50 dark:bg-transparent text-slate-700 dark:text-slate-200 border border-slate-200/80 dark:border-white/10 hover:bg-white/10'
                      }`}
                    title={splitByPrice ? 'Show normal view' : 'Split products by individual selling prices'}
                  >
                    <FiDollarSign size={16} />
                    {splitByPrice ? 'Price Split: ON' : 'Split by Price'}
                  </button>
                  {splitByPrice && (
                    <p className="text-xs text-amber-700 dark:text-amber-200/90 mt-1">
                      Showing products split by individual prices ({allStockBatches.length} batches loaded)
                    </p>
                  )}
                </div>
              </div>

              {/* Shop Selector for All Shops View */}
              {viewMode === 'all_shops' && (
                <div className="flex-1 max-w-xs">
                  <SearchableSelect
                    label="Select Shop"
                    value={selectedShop}
                    onChange={(value) => setSelectedShop(String(value))}
                    options={shopOptions}
                  />
                </div>
              )}

              {/* Current View Indicator */}
              <div className="text-sm">
                {viewMode === 'current_shop' ? (
                  <div className="rounded-2xl border border-slate-200/80 dark:border-white/10 bg-slate-50 dark:bg-transparent px-4 py-2 text-slate-700 dark:text-slate-200">
                    <span className="flex items-center">
                      <FiPackage className="mr-2" />
                      <span>Viewing: <strong>{user?.shop_name || 'Your Shop'}</strong></span>
                    </span>
                  </div>
                ) : viewMode === 'all_shops' ? (
                  <div className="rounded-2xl border border-slate-200/80 dark:border-white/10 bg-slate-50 dark:bg-transparent px-4 py-2 text-slate-700 dark:text-slate-200">
                    <span className="flex items-center">
                      <FiPackage className="mr-2" />
                      {selectedShop ? (
                        <span>Viewing: <strong>{shops.find(s => s.id.toString() === selectedShop)?.name}</strong></span>
                      ) : (
                        <span>Viewing <strong>All Shops</strong></span>
                      )}
                    </span>
                  </div>
                ) : (
                  <div className="rounded-2xl border border-slate-200/80 dark:border-white/10 bg-slate-50 dark:bg-transparent px-4 py-2 text-slate-700 dark:text-slate-200">
                    <span className="flex items-center">
                      <FiPackage className="mr-2" />
                      <span>Viewing <strong>Main Warehouse</strong></span>
                    </span>
                  </div>
                )}
              </div>
            </div>

            {/* Helpful tip */}
            {viewMode === 'current_shop' && (
              <div className="mt-4 rounded-2xl border border-slate-200/80 dark:border-white/10 bg-slate-50 dark:bg-transparent p-4 shadow-sm">
                <div className="flex items-start gap-3">
                  <div className="mt-0.5 rounded-full bg-amber-100 dark:bg-amber-500/15 p-2 text-amber-700 dark:text-amber-200">
                    <FiInfo size={16} />
                  </div>
                  <div>
                    <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-amber-700 dark:text-amber-200/80">
                      Quick tip
                    </p>
                    <p className="mt-1 text-sm text-amber-800 dark:text-amber-100/90">
                      {user?.role === 'sub_stock_manager'
                        ? 'If products are not in your shop, we will show where they are available. Use "Main Stock" to browse warehouse inventory and request transfers.'
                        : 'If products are not in your shop, we will show where they are available. Use "All Shops" to browse other branches or "Main Stock" to request transfers.'}
                    </p>
                  </div>
                </div>
              </div>
            )}
          </div>

          <div className="mb-4">
            <TableSearchBar
              onSearch={setSearchTerm}
              placeholder="Search products by name, HSN code, category, brand, variant..."
              className="rounded-2xl border border-slate-200/80 dark:border-white/10 bg-slate-50 dark:bg-transparent p-4"
            />
          </div>

          {/* Filters */}
          <div className="mb-4 rounded-2xl border border-slate-200/80 dark:border-white/10 bg-slate-50 dark:bg-transparent p-4">
            <div className="mb-3 flex items-center">
              <FiFilter className="mr-2 text-slate-700 dark:text-slate-300" />
              <h4 className="text-sm font-semibold text-slate-700 dark:text-slate-200">Filters</h4>
            </div>
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-5">
              <SearchableSelect
                value={selectedProductCondition}
                onChange={(value) => setSelectedProductCondition(String(value))}
                options={conditionOptions}
              />
              <SearchableSelect
                value={selectedBrand}
                onChange={(value) => setSelectedBrand(String(value))}
                options={brandOptions}
              />
              <SearchableSelect
                value={selectedVariant}
                onChange={(value) => setSelectedVariant(String(value))}
                options={variantOptions}
              />
              <SearchableSelect
                value={selectedColor}
                onChange={(value) => setSelectedColor(String(value))}
                options={colorOptions}
              />
              <SearchableSelect
                value={selectedCategory}
                onChange={(value) => setSelectedCategory(String(value))}
                options={categoryOptions}
              />
            </div>
            {(selectedProductCondition || selectedBrand || selectedVariant || selectedColor || selectedCategory) && (
              <button
                onClick={() => {
                  setSelectedProductCondition('');
                  setSelectedBrand('');
                  setSelectedVariant('');
                  setSelectedColor('');
                  setSelectedCategory('');
                }}
                className="mt-3 text-sm text-sky-700 dark:text-sky-300 hover:text-sky-600 dark:hover:text-sky-200"
              >
                Clear all filters
              </button>
            )}
          </div>

          <div className="card overflow-hidden">
            <div className="overflow-x-auto scrollbar-hide">
              <table className="table table-frost min-w-full">
                <thead>
                  <tr>
                    {/* Hide checkbox column for sub-stock managers */}
                    {user?.role !== 'sub_stock_manager' && (
                      <th className="w-12">
                        <input name="rowSelect"
                          type="checkbox"
                          checked={isAllSelected(paginatedIds)}
                          onChange={() => toggleSelectAll(paginatedIds)}
                        />
                      </th>
                    )}
                    <th>Name</th>
                    <th>HSN Code</th>
                    <th>Price Range</th>
                    <th>Category</th>
                    <th>Brand</th>
                    <th>Variant</th>
                    <th>Color</th>
                    <th>IMEI</th>
                    <th>Stock</th>
                    <th>Stock Value</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {paginatedProducts.map((product, index) => {
                    const uniqueKey = splitByPrice && product._splitPrice
                      ? `${product.id}_${product._splitPrice}_${product._splitCondition}_${index}`
                      : product.id;

                    return (
                      <tr key={uniqueKey} className={isSelected(product.id) ? 'bg-slate-50 dark:bg-transparent' : ''}>
                        {/* Hide checkbox column for sub-stock managers */}
                        {user?.role !== 'sub_stock_manager' && (
                          <td>
                            <input name="rowSelect"
                              type="checkbox"
                              checked={isSelected(product.id)}
                              onChange={() => toggleSelect(product.id)}
                            />
                          </td>
                        )}
                        <td className="font-medium">
                          {product.name}
                          {splitByPrice && product._splitCondition && (
                            <span className={`ml-2 rounded-full border px-2 py-0.5 text-xs ${getConditionColor(product._splitCondition)}`}>
                              {product._splitCondition.replace('_', ' ')}
                            </span>
                          )}
                        </td>
                        <td>{product.hsn_code}</td>
                        <td>
                          {splitByPrice && product._splitPrice !== undefined ? (
                            <span className="text-emerald-700 dark:text-emerald-300 font-semibold text-base">₹{product._splitPrice.toFixed(2)}</span>
                          ) : (
                            priceRangesByProduct[product.id] ? (
                              priceRangesByProduct[product.id].min === priceRangesByProduct[product.id].max ? (
                                <span className="text-emerald-700 dark:text-emerald-300 font-semibold">₹{priceRangesByProduct[product.id].min.toFixed(2)}</span>
                              ) : (
                                <span className="text-sm">
                                  ₹{priceRangesByProduct[product.id].min.toFixed(2)} - ₹{priceRangesByProduct[product.id].max.toFixed(2)}
                                </span>
                              )
                            ) : (
                              <span className="text-slate-600 dark:text-slate-400">-</span>
                            )
                          )}
                        </td>
                        <td>{product.category_name || '-'}</td>
                        <td>{product.brand_name || '-'}</td>
                        <td>{product.variant_name || '-'}</td>
                        <td>
                          {product.color_name ? (
                            <span className="text-sm">{product.color_name}</span>
                          ) : (
                            <span className="text-slate-600 dark:text-slate-400">-</span>
                          )}
                        </td>
                        <td>
                          {product.is_imei_tracked ? (
                            <span className="badge badge-success text-xs">✓</span>
                          ) : (
                            <span className="text-slate-600 dark:text-slate-400">-</span>
                          )}
                        </td>
                        <td>
                          {(() => {
                            // If in split mode and we have split stock, show it
                            if (splitByPrice && product._splitStock !== undefined) {
                              return (
                                <div className="text-center">
                                  <span className={`font-semibold text-base ${product._splitStock === 0 ? 'text-slate-600 dark:text-slate-400' : product._splitStock < 5 ? 'text-orange-600' : 'text-emerald-700 dark:text-emerald-300'}`}>
                                    {product._splitStock}
                                  </span>
                                </div>
                              );
                            }

                            // Normal stock display logic
                            const locations = getProductStockLocations(product);

                            // If condition filter is applied, show condition-specific stock
                            if (selectedProductCondition) {
                              const conditionStock = getConditionStock(product, selectedProductCondition);

                              // Determine quantity based on view mode
                              let quantity = 0;
                              let label = '';

                              if (viewMode === 'main') {
                                // Main stock only
                                quantity = conditionStock?.main_stock || 0;
                                label = 'Main Stock';
                              } else if (viewMode === 'current_shop') {
                                // Current shop only - use per-shop condition data
                                const currentShopId = user?.shop;
                                quantity = getConditionShopQty(conditionStock, currentShopId);
                                label = 'Your Shop';
                              } else {
                                // All shops view
                                if (selectedShop) {
                                  const targetShopId = parseInt(selectedShop);
                                  quantity = getConditionShopQty(conditionStock, targetShopId);
                                  label = 'This Shop';
                                } else {
                                  quantity = conditionStock?.shop_stock || 0;
                                  label = 'All Shops';
                                }
                              }

                              const conditionLabel = getConditionLabel(selectedProductCondition || 'fresh');

                              return (
                                <div className={viewMode === 'current_shop' ? 'min-w-[150px]' : undefined}>
                                  <span className={`font-semibold ${quantity < 10 ? 'text-rose-700 dark:text-rose-300' : 'text-emerald-700 dark:text-emerald-300'}`}>
                                    {quantity}
                                  </span>
                                  <p className="text-xs text-slate-600 dark:text-slate-400">{conditionLabel} - {label}</p>
                                  {conditionStock?.avg_price && (
                                    <p className="text-xs text-slate-600 dark:text-slate-400">
                                      Avg: ₹{parseFloat(conditionStock.avg_price).toFixed(0)}
                                    </p>
                                  )}
                                  {viewMode === 'current_shop' && quantity === 0 && (
                                    (() => {
                                      const currentShopId = user?.shop;
                                      const otherShops = conditionStock?.shops?.filter(
                                        (shop) => shop.shop_id !== currentShopId && shop.quantity > 0
                                      ) || [];
                                      const mainQty = conditionStock?.main_stock || 0;

                                      if (otherShops.length === 0 && mainQty === 0) {
                                        return null;
                                      }

                                      return (
                                        <div className="mt-1 text-xs">
                                          {mainQty > 0 && (
                                            <p className="text-sky-300">
                                              * ✓ {mainQty} in Main Stock
                                            </p>
                                          )}
                                          {otherShops.slice(0, 2).map((shop) => (
                                            <p key={shop.shop_id} className="text-sky-300">
                                              ✓ {shop.quantity} in {shop.shop_name}
                                            </p>
                                          ))}
                                          {otherShops.length > 2 && (
                                            <p className="text-slate-600 dark:text-slate-400">
                                              +{otherShops.length - 2} more shops
                                            </p>
                                          )}
                                        </div>
                                      );
                                    })()
                                  )}
                                </div>
                              );
                            }

                            if (viewMode === 'main') {
                              // Main stock view - show total main stock
                              return (
                                <div>
                                  <span className={`font-semibold ${locations.mainStock < 10 ? 'text-rose-700 dark:text-rose-300' : 'text-emerald-700 dark:text-emerald-300'}`}>
                                    {locations.mainStock}
                                  </span>
                                  <p className="text-xs text-slate-600 dark:text-slate-400">Main Stock</p>
                                </div>
                              );
                            } else if (viewMode === 'current_shop') {
                              // Current shop view - show user's shop stock
                              const currentShopId = user?.shop;

                              const currentShopStock = locations.shopStocks.find(
                                (s) => s.shopId === currentShopId
                              );

                              const otherShops = locations.shopStocks.filter(
                                (s) => s.shopId !== currentShopId && s.quantity > 0
                              );

                              return (
                                <div className="min-w-[150px]">
                                  {currentShopStock && currentShopStock.quantity > 0 ? (
                                    <div>
                                      <span className={`font-semibold ${currentShopStock.quantity < 5 ? 'text-orange-600' : 'text-emerald-700 dark:text-emerald-300'}`}>
                                        {currentShopStock.quantity}
                                      </span>
                                      <p className="text-xs text-slate-600 dark:text-slate-400">In your shop</p>
                                    </div>
                                  ) : (
                                    <div>
                                      <span className="font-semibold text-rose-300">0</span>
                                      <p className="text-xs text-slate-600 dark:text-slate-400">Not in shop</p>

                                      {/* Suggestions */}
                                      {(otherShops.length > 0 || locations.mainStock > 0) && (
                                        <div className="mt-1 text-xs">
                                          {locations.mainStock > 0 && (
                                            <p className="text-sky-300">
                                              * ✓ {locations.mainStock} in Main Stock
                                            </p>
                                          )}
                                          {otherShops.slice(0, 2).map((shop) => (
                                            <p key={shop.shopId} className="text-sky-300">
                                              * {shop.quantity} in {shop.shopName}
                                            </p>
                                          ))}
                                          {otherShops.length > 2 && (
                                            <p className="text-slate-600 dark:text-slate-400">
                                              +{otherShops.length - 2} more shops
                                            </p>
                                          )}
                                        </div>
                                      )}
                                    </div>
                                  )}
                                </div>
                              );
                            } else {
                              // All shops view - show selected shop stock or all shops
                              const targetShopId = selectedShop ? parseInt(selectedShop) : null;

                              if (targetShopId) {
                                const shopStock = locations.shopStocks.find(
                                  (s) => s.shopId === targetShopId
                                );

                                return (
                                  <div>
                                    <span className={`font-semibold ${shopStock && shopStock.quantity > 0
                                      ? shopStock.quantity < 5 ? 'text-orange-600' : 'text-emerald-700 dark:text-emerald-300'
                                      : 'text-rose-300'
                                      }`}>
                                      {shopStock?.quantity || 0}
                                    </span>
                                    <p className="text-xs text-slate-600 dark:text-slate-400">In this shop</p>
                                  </div>
                                );
                              } else {
                                // Show total across all shops with breakdown
                                const totalInShops = locations.shopStocks.reduce((sum, s) => sum + s.quantity, 0);
                                const shopsWithStock = locations.shopStocks.filter(s => s.quantity > 0);

                                return (
                                  <div className="min-w-[180px]">
                                    <div>
                                      <span className={`font-semibold ${totalInShops < 10 ? 'text-rose-700 dark:text-rose-300' : 'text-emerald-700 dark:text-emerald-300'}`}>
                                        {totalInShops}
                                      </span>
                                      <span className="text-xs text-slate-600 dark:text-slate-400 ml-1">total</span>
                                    </div>

                                    {/* Show breakdown of shops */}
                                    {shopsWithStock.length > 0 && (
                                      <div className="mt-1 text-xs space-y-0.5">
                                        {shopsWithStock.slice(0, 3).map((shop) => (
                                          <p key={shop.shopId} className="text-sky-300">
                                            * {shop.quantity} in {shop.shopName}
                                          </p>
                                        ))}
                                        {shopsWithStock.length > 3 && (
                                          <p className="text-slate-600 dark:text-slate-400">
                                            +{shopsWithStock.length - 3} more shops
                                          </p>
                                        )}
                                      </div>
                                    )}
                                  </div>
                                );
                              }
                            }
                          })()}
                        </td>
                        <td>
                          {(() => {
                            const stockValue = getProductStockValue(product);
                            if (stockValue === null || Number.isNaN(stockValue)) {
                              return <span className="text-slate-600 dark:text-slate-400">-</span>;
                            }
                            return (
                              <span className="font-semibold text-slate-800 dark:text-slate-200">
                                &#8377;{stockValue.toFixed(2)}
                              </span>
                            );
                          })()}
                        </td>
                        <td>
                          <div className="flex flex-wrap gap-2">
                            <button
                              onClick={() => handleViewDetails(product)}
                              className="inline-flex items-center gap-2 rounded-full border border-slate-200/80 dark:border-white/10 bg-slate-50 dark:bg-transparent px-3 py-1 text-xs font-semibold text-slate-900 dark:text-slate-100 transition hover:bg-white/10"
                              title="View Details"
                            >
                              <FiEye size={14} />
                              View
                            </button>
                            {/* Hide edit/delete buttons for sub-stock managers */}
                            {user?.role !== 'sub_stock_manager' && (
                              <>
                                <button
                                  onClick={() => handleOpenStockModal(product)}
                                  className="inline-flex items-center gap-2 rounded-full border border-emerald-400 dark:border-emerald-400/30 bg-emerald-100 dark:bg-emerald-500/15 px-3 py-1 text-xs font-semibold text-emerald-700 dark:text-emerald-200 transition hover:bg-emerald-200 dark:hover:bg-emerald-500/25"
                                  title="Add Stock"
                                >
                                  <FiPackage size={14} />
                                  Stock
                                </button>
                                <button
                                  onClick={() => splitByPrice ? handleEditWithBatches(product) : handleEdit(product)}
                                  className="inline-flex items-center gap-2 rounded-full border border-sky-400 dark:border-sky-400/30 bg-sky-100 dark:bg-sky-500/15 px-3 py-1 text-xs font-semibold text-sky-700 dark:text-sky-200 transition hover:bg-sky-200 dark:hover:bg-sky-500/25"
                                  title={splitByPrice ? "Edit Product & Batches" : "Edit Product"}
                                >
                                  <FiEdit size={14} />
                                  Edit
                                </button>
                                <button
                                  onClick={() => handleDelete(product.id)}
                                  className="inline-flex items-center gap-2 rounded-full border border-rose-400 dark:border-rose-400/30 bg-rose-100 dark:bg-rose-500/15 px-3 py-1 text-xs font-semibold text-rose-700 dark:text-rose-200 transition hover:bg-rose-200 dark:hover:bg-rose-500/25"
                                  title="Delete Product"
                                >
                                  <FiTrash size={14} />
                                  Delete
                                </button>
                              </>
                            )}
                          </div>
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          </div>

          {totalDisplayCount > 0 && (
            <div className="flex flex-wrap items-center justify-between gap-3 border-t border-slate-200/80 dark:border-white/10 bg-slate-50 dark:bg-transparent px-4 py-3 text-sm text-slate-600 dark:text-slate-300">
              <span>
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

          {displayProducts.length === 0 && (
            <div className="py-12 text-center text-slate-700 dark:text-slate-300">
              {splitByPrice && filteredProducts.length > 0 ? (
                <div className="text-slate-700 dark:text-slate-300">
                  <FiInfo className="inline-block mb-2" size={32} />
                  <p className="mb-2 font-medium">No products can be split by price</p>
                  <p className="text-sm text-slate-600 dark:text-slate-400">Products need stock batches with different selling prices to be split.</p>
                  <button
                    onClick={() => setSplitByPrice(false)}
                    className="mt-4 text-sky-700 dark:text-sky-300 hover:text-sky-600 dark:hover:text-sky-200 text-sm font-medium"
                  >
                    Turn off price split mode
                  </button>
                </div>
              ) : products.length === 0 ? (
                <div className="text-slate-700 dark:text-slate-300">
                  <p className="mb-2">No products found. Add your first product to get started.</p>
                </div>
              ) : viewMode === 'current_shop' && availabilitySuggestions ? (
                <div>
                  <div className="mx-auto max-w-3xl rounded-2xl border border-slate-200/80 dark:border-white/10 bg-slate-950/70 p-6 shadow-lg backdrop-blur">
                    <div className="flex flex-col gap-4">
                      <div className="flex items-start gap-3 rounded-xl border border-slate-200/80 dark:border-white/10 bg-slate-50 dark:bg-transparent p-4 text-amber-800 dark:text-amber-100 shadow-sm">
                        <div className="mt-0.5 text-amber-700 dark:text-amber-200">
                          <FiAlertCircle size={20} />
                        </div>
                        <div>
                          <p className="text-sm font-semibold">No products found in your shop</p>
                          <p className="mt-1 text-xs text-amber-700 dark:text-amber-100/80">
                            Your search matched products, but they are not currently available in your shop.
                          </p>
                        </div>
                      </div>

                      <div>
                        <h3 className="text-lg font-semibold text-slate-900 dark:text-slate-100">
                          Suggested inventory sources
                        </h3>
                        <p className="mt-1 text-xs text-slate-600 dark:text-slate-400">
                          Jump to the nearest location with available stock.
                        </p>
                      </div>

                      <div className="space-y-3">
                        {/* Main Stock */}
                        {availabilitySuggestions.mainStock > 0 && (
                          <div className="rounded-2xl border border-slate-200/80 dark:border-white/10 bg-slate-50 dark:bg-transparent p-4 shadow-sm">
                            <div className="flex items-center justify-between">
                              <div className="flex items-center">
                                <div className="rounded-full bg-emerald-100 dark:bg-emerald-500/15 p-2 mr-3 text-emerald-700 dark:text-emerald-200">
                                  <FiPackage size={20} />
                                </div>
                                <div>
                                  <p className="font-semibold text-slate-900 dark:text-slate-100">Main Warehouse</p>
                                  <p className="text-xs text-slate-600 dark:text-slate-400">Central inventory</p>
                                </div>
                              </div>
                              <div className="text-right">
                                <p className="text-2xl font-bold text-emerald-700 dark:text-emerald-200">
                                  {availabilitySuggestions.mainStock}
                                </p>
                                <p className="text-xs text-slate-600 dark:text-slate-400">products</p>
                              </div>
                            </div>
                            <button
                              onClick={() => setViewMode('main')}
                              className="mt-3 w-full inline-flex items-center justify-center gap-2 rounded-xl bg-emerald-500/80 px-4 py-2 text-sm font-semibold text-white transition hover:bg-emerald-500"
                            >
                              * View in Main Stock
                              <FiArrowRight size={16} />
                            </button>
                          </div>
                        )}

                        {/* Other Shops */}
                        {availabilitySuggestions.shops.slice(0, 3).map((shop) => (
                          <div key={shop.shopId} className="rounded-2xl border border-slate-200/80 dark:border-white/10 bg-slate-50 dark:bg-transparent p-4 shadow-sm">
                            <div className="flex items-center justify-between">
                              <div className="flex items-center">
                                <div className="rounded-full bg-sky-100 dark:bg-sky-500/15 p-2 mr-3 text-sky-700 dark:text-sky-200">
                                  <FiPackage size={20} />
                                </div>
                                <div>
                                  <p className="font-semibold text-slate-900 dark:text-slate-100">{shop.shopName}</p>
                                  <p className="text-xs text-slate-600 dark:text-slate-400">Branch location</p>
                                </div>
                              </div>
                              <div className="text-right">
                                <p className="text-2xl font-bold text-sky-700 dark:text-sky-200">
                                  {shop.count}
                                </p>
                                <p className="text-xs text-slate-600 dark:text-slate-400">products</p>
                              </div>
                            </div>
                            <button
                              onClick={() => {
                                setViewMode('all_shops');
                                setSelectedShop(shop.shopId.toString());
                              }}
                              className="mt-3 w-full inline-flex items-center justify-center gap-2 rounded-xl bg-sky-500/80 px-4 py-2 text-sm font-semibold text-white transition hover:bg-sky-500"
                            >
                              View {shop.shopName} Inventory
                              <FiArrowRight size={16} />
                            </button>
                          </div>
                        ))}

                        {availabilitySuggestions.shops.length > 3 && (
                          <p className="text-xs text-slate-600 dark:text-slate-400 mt-2">
                            + {availabilitySuggestions.shops.length - 3} more shop(s) have these products
                          </p>
                        )}
                      </div>

                      <div className="mt-2 text-xs text-slate-600 dark:text-slate-400">
                        Use any button above to view products and request stock transfers.
                      </div>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="text-slate-600 dark:text-slate-400">
                  <p className="mb-2">No products match your current filters.</p>
                  <button
                    onClick={() => {
                      setSelectedBrand('');
                      setSelectedVariant('');
                      setSelectedColor('');
                      setSelectedCategory('');
                      setSearchTerm('');
                    }}
                    className="text-sky-700 dark:text-sky-300 hover:text-sky-600 dark:hover:text-sky-200 text-sm font-medium"
                  >
                    Clear all filters
                  </button>
                </div>
              )}
            </div>
          )}

          {/* Hide bulk action bar for sub-stock managers */}
          {
            user?.role !== 'sub_stock_manager' && (
              <BulkActionBar
                selectedCount={selectedIds.length}
                onDelete={handleBulkDelete}
                onCancel={clearSelection}
              />
            )
          }

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

          {
            showStockModal && selectedProduct && (
              <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4">
                <div className="rounded-2xl border border-slate-200/80 dark:border-white/10 bg-slate-950/90 p-6 text-slate-900 dark:text-slate-100 shadow-[0_20px_60px_rgba(2,6,23,0.65)] w-full max-w-3xl max-h-[85vh] overflow-y-auto scrollbar-hide">
                  <div className="flex justify-between items-center mb-4">
                    <div>
                      <h2 className="text-xl font-semibold">Add Stock for {selectedProduct.name}</h2>
                      {stockFormData.supplier_name && (
                        <p className="text-xs text-emerald-400 mt-1">
                          <FiInfo className="inline mr-1" />
                          Some fields auto-filled from previous batches
                        </p>
                      )}
                    </div>
                    <button
                      onClick={() => setShowStockModal(false)}
                      className="text-slate-600 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 transition-colors"
                    >
                      <FiX size={20} />
                    </button>
                  </div>

                  <form onSubmit={handleAddStock} className="grid grid-cols-2 gap-4">
                    <div>
                      <label htmlFor="batch_number" className="block text-sm font-medium mb-1">Batch Number *</label>
                      <input id="batch_number" name="batch_number"
                        type="text"
                        className="input"
                        value={stockFormData.batch_number}
                        autoComplete="off"
                        onChange={(e) => setStockFormData({ ...stockFormData, batch_number: e.target.value })}
                        required
                      />
                    </div>

                    <div>
                      <label htmlFor="purchased_quantity" className="block text-sm font-medium mb-1">Quantity *</label>
                      <input id="purchased_quantity" name="purchased_quantity"
                        type="number"
                        className="input"
                        value={stockFormData.purchased_quantity}
                        onChange={(e) => setStockFormData({ ...stockFormData, purchased_quantity: e.target.value })}
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
                        value={stockFormData.total_purchase_amount}
                        onChange={(e) => setStockFormData({ ...stockFormData, total_purchase_amount: e.target.value })}
                        required
                      />
                      {stockFormData.total_purchase_amount && stockFormData.purchased_quantity && parseInt(stockFormData.purchased_quantity) > 0 && (
                        <p className="mt-1 text-xs text-emerald-400 flex items-center gap-1">
                          <FiDollarSign className="flex-shrink-0" />
                          <span>Unit Cost: ₹{(parseFloat(stockFormData.total_purchase_amount) / parseInt(stockFormData.purchased_quantity)).toFixed(2)}</span>
                        </p>
                      )}
                    </div>

                    <div>
                      <label htmlFor="selling_price" className="block text-sm font-medium mb-1">Selling Price (Rs)</label>
                      <input id="selling_price" name="selling_price"
                        type="number"
                        step="0.01"
                        className="input"
                        value={stockFormData.selling_price}
                        onChange={(e) => setStockFormData({ ...stockFormData, selling_price: e.target.value })}
                        placeholder="Auto-calc if empty"
                      />
                      <p className="mt-1 text-xs text-slate-600 dark:text-slate-400 flex items-start gap-1">
                        <FiInfo className="flex-shrink-0 mt-0.5" />
                        <span>Leave empty for auto-calculation based on cost + GST, or enter a custom price. System will apply markup based on pricing method if configured.</span>
                      </p>
                      {lastSellingPrice !== null && (
                        <p className="text-xs text-slate-600 dark:text-slate-400 mt-1">
                          Last selling price for this condition: Rs {lastSellingPrice.toFixed(2)}
                        </p>
                      )}
                      {lastSellingPrice !== null && (
                        <div className="flex items-center mt-2">
                          <input
                            type="checkbox"
                            id="update_existing_price"
                            checked={stockFormData.update_existing_price}
                            onChange={(e) => setStockFormData({ ...stockFormData, update_existing_price: e.target.checked })}
                            className="mr-2"
                          />
                          <label htmlFor="update_existing_price" className="text-sm font-medium">
                            Update selling price for available stock
                          </label>
                        </div>
                      )}
                    </div>

                    <div>
                      <SearchableSelect
                        label="Condition *"
                        value={stockFormData.condition}
                        onChange={(value) => setStockFormData({ ...stockFormData, condition: String(value) })}
                        options={conditionSelectOptions}
                        onAddNew={(searchTerm) => {
                          setQuickAddInitialValue(searchTerm);
                          setShowConditionModal(true);
                        }}
                        addNewLabel="Add Condition"
                      />
                    </div>

                    <div>
                      <SearchableSelect
                        label="Source *"
                        value={stockFormData.source}
                        onChange={(value) => setStockFormData({ ...stockFormData, source: String(value) })}
                        options={sourceSelectOptions}
                        onAddNew={(searchTerm) => {
                          setQuickAddInitialValue(searchTerm);
                          setShowSourceModal(true);
                        }}
                        addNewLabel="Add Source"
                      />
                    </div>

                    <div>
                      <SearchableSelect
                        label="GST Slab *"
                        value={stockFormData.gst_slab}
                        onChange={(value) => setStockFormData({ ...stockFormData, gst_slab: String(value) })}
                        options={[
                          { value: '', label: 'Select GST Slab' },
                          ...gstSlabs.map((slab) => ({
                            value: slab.id.toString(),
                            label: `${slab.rate}% GST`,
                          })),
                        ]}
                      />
                    </div>

                    <div>
                      <label htmlFor="purchase_date" className="block text-sm font-medium mb-1">Purchase Date *</label>
                      <input id="purchase_date" name="purchase_date"
                        type="date"
                        className="input"
                        value={stockFormData.purchase_date}
                        onChange={(e) => setStockFormData({ ...stockFormData, purchase_date: e.target.value })}
                        required
                      />
                    </div>

                    <div>
                      <label htmlFor="supplier_name" className="block text-sm font-medium mb-1">Supplier Name</label>
                      <input id="supplier_name" name="supplier_name"
                        type="text"
                        className="input"
                        value={stockFormData.supplier_name}
                        autoComplete="organization"
                        onChange={(e) => setStockFormData({ ...stockFormData, supplier_name: e.target.value })}
                      />
                    </div>

                    <div>
                      <label htmlFor="invoice_number" className="block text-sm font-medium mb-1">Invoice Number</label>
                      <input id="invoice_number" name="invoice_number"
                        type="text"
                        className="input"
                        value={stockFormData.invoice_number}
                        autoComplete="off"
                        onChange={(e) => setStockFormData({ ...stockFormData, invoice_number: e.target.value })}
                      />
                    </div>

                    <div>
                      <label htmlFor="initial_payment_amount" className="block text-sm font-medium mb-1">Initial Payment Amount</label>
                      <input
                        id="initial_payment_amount"
                        name="initial_payment_amount"
                        type="number"
                        min="0"
                        step="0.01"
                        className="input"
                        value={stockFormData.initial_payment_amount}
                        onChange={(e) => setStockFormData({ ...stockFormData, initial_payment_amount: e.target.value })}
                      />
                    </div>

                    <div>
                      <SearchableSelect
                        label="Initial Payment Method"
                        value={stockFormData.initial_payment_method}
                        onChange={(value) => setStockFormData({ ...stockFormData, initial_payment_method: String(value) })}
                        options={paymentMethodOptions}
                      />
                    </div>

                    <div className="col-span-2">
                      <label htmlFor="initial_payment_reference" className="block text-sm font-medium mb-1">Initial Payment Reference</label>
                      <input
                        id="initial_payment_reference"
                        name="initial_payment_reference"
                        type="text"
                        className="input"
                        value={stockFormData.initial_payment_reference}
                        autoComplete="off"
                        onChange={(e) => setStockFormData({ ...stockFormData, initial_payment_reference: e.target.value })}
                      />
                    </div>

                    <div className="flex items-center col-span-2">
                      <input
                        type="checkbox"
                        id="is_interstate_stock"
                        checked={stockFormData.is_interstate}
                        onChange={(e) => setStockFormData({ ...stockFormData, is_interstate: e.target.checked })}
                        className="mr-2"
                      />
                      <label htmlFor="is_interstate_stock" className="text-sm font-medium">
                        Interstate Purchase (Use IGST)
                      </label>
                    </div>

                    <div className="col-span-2">
                      <label htmlFor="notes" className="block text-sm font-medium mb-1">Notes</label>
                      <textarea id="notes" name="notes"
                        className="input"
                        rows={3}
                        value={stockFormData.notes}
                        onChange={(e) => setStockFormData({ ...stockFormData, notes: e.target.value })}
                      />
                    </div>

                    {selectedProduct.is_imei_tracked && (
                      <div className="col-span-2" key="product-imei-section">
                        <label htmlFor="imei_list" className="block text-sm font-medium mb-1">
                          IMEI Numbers <span className="text-red-400">*</span>
                        </label>
                        <textarea id="imei_list"
                          key="product-imei-textarea"
                          name="imei_list"
                          className="input"
                          rows={8}
                          placeholder="Enter IMEI numbers here OR in shop allocations below (one per line)"
                          value={stockFormData.imei_list.join('\n')}
                          onChange={(e) => {
                            const imeis = e.target.value.split('\n');
                            setStockFormData((prev) => ({ ...prev, imei_list: imeis }));
                          }}
                        />
                        <div className="mt-1 space-y-1">
                          <p className="text-sm text-slate-600 dark:text-slate-400">
                            Entered: {stockFormData.imei_list.filter(Boolean).length} IMEI numbers
                            {stockFormData.purchased_quantity && ` (Required: ${stockFormData.purchased_quantity})`}
                          </p>
                          <p className="text-xs text-emerald-400 flex items-start gap-1">
                            <FiInfo className="flex-shrink-0 mt-0.5" />
                            <span><strong>Note:</strong> You can enter all IMEIs here, OR allocate them in shop allocations below. If all purchased quantity is allocated to shops with IMEIs, this field can be left empty.</span>
                          </p>
                        </div>
                      </div>
                    )}

                    {/* Shop Distribution Section */}
                    <div className="col-span-2 border-t border-slate-200/80 dark:border-white/10 pt-4 mt-4">
                      <h3 className="text-sm font-semibold mb-3 text-slate-700 dark:text-slate-200">
                        Initial Shop Distribution (Optional)
                      </h3>

                      <div className="space-y-3 mb-3">
                        {/* Auto Split Controls */}
                        <div className="flex items-center gap-4">
                          <label className="flex items-center gap-2 text-sm">
                            <input
                              type="checkbox"
                              checked={autoAllocate}
                              onChange={(e) => setAutoAllocate(e.target.checked)}
                              className="rounded"
                            />
                            <span>Keep allocations equal across active shops</span>
                          </label>
                          <button
                            type="button"
                            onClick={autoAllocateDistributions}
                            className="btn btn-sm btn-outline"
                          >
                            Auto Split Equally
                          </button>
                          <button
                            type="button"
                            onClick={addDistributionRow}
                            className="btn btn-sm btn-primary"
                          >
                            <FiPlus className="inline mr-1" />
                            Add Shop Allocation
                          </button>
                        </div>

                        {/* Distribution Rows */}
                        {stockFormData.distributions.map((dist, index) => (
                          <div key={index} className="bg-slate-50 dark:bg-transparent p-3 rounded-lg">
                            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4 items-start">
                              {/* Shop Select */}
                              <div className="col-span-5">
                                <SearchableSelect
                                  label="Shop"
                                  value={dist.shop ? String(dist.shop) : ''}
                                  onChange={(value) =>
                                    updateDistributionRow(index, { shop: value })
                                  }
                                  options={[
                                    { value: '', label: 'Select Shop' },
                                    ...shops
                                      .filter((shop) => shop.is_active)
                                      .map((shop) => ({
                                        value: shop.id.toString(),
                                        label: shop.name,
                                      })),
                                  ]}
                                />
                              </div>

                              {/* Quantity Input */}
                              <div className="col-span-1">
                                <label className="block text-xs font-medium mb-1">Quantity</label>
                                <input
                                  type="number"
                                  value={dist.quantity}
                                  onChange={(e) =>
                                    updateDistributionRow(index, { quantity: e.target.value })
                                  }
                                  className="input input-sm w-full"
                                  min="1"
                                />
                              </div>

                              {/* IMEI Input (if product is IMEI tracked) */}
                              {selectedProduct?.is_imei_tracked && (
                                <div className="col-span-1">
                                  <label className="block text-xs font-medium mb-1">
                                    IMEIs ({dist.imei_list.length})
                                  </label>
                                  <textarea
                                    value={dist.imei_list.join(', ')}
                                    onChange={(e) => {
                                      const imeis = e.target.value
                                        .split(',')
                                        .map((s) => s.trim())
                                        .filter(Boolean);
                                      updateDistributionRow(index, { imei_list: imeis });
                                    }}
                                    className="input input-sm w-full font-mono text-xs"
                                    rows={1}
                                    placeholder="IMEI1, IMEI2, ..."
                                  />
                                </div>
                              )}

                              {/* Remove Button */}
                              <div className={selectedProduct?.is_imei_tracked ? 'col-span-1' : 'col-span-4'}>
                                <label className="block text-xs font-medium mb-1 opacity-0">Remove</label>
                                <button
                                  type="button"
                                  onClick={() => removeDistributionRow(index)}
                                  className="btn btn-sm btn-error w-full"
                                  title="Remove this distribution"
                                >
                                  <FiX />
                                </button>
                              </div>
                            </div>
                          </div>
                        ))}

                        {/* Quantity Tracking */}
                        {stockFormData.distributions.length > 0 && (
                          <div className="bg-slate-50 dark:bg-transparent p-3 rounded-lg text-sm">
                            <div className="flex justify-between items-center">
                              <span>Purchased: <strong>{purchasedQuantity}</strong></span>
                              <span>Allocated: <strong>{allocatedQuantity}</strong></span>
                              <span className={remainingQuantity < 0 ? 'text-rose-400' : 'text-emerald-400'}>
                                Remaining: <strong>{remainingQuantity}</strong>
                              </span>
                            </div>
                            {remainingQuantity < 0 && (
                              <p className="text-rose-400 text-xs mt-2">
                                ⚠ Allocated quantity exceeds purchased quantity!
                              </p>
                            )}
                          </div>
                        )}
                      </div>
                    </div>

                    <div className="col-span-2 flex space-x-3">
                      <HoverBorderGradient
                        as="button"
                        type="submit"
                        className="bg-white/90 dark:bg-transparent text-slate-900 dark:text-slate-100"
                      >
                        Add Stock
                      </HoverBorderGradient>
                      <button
                        type="button"
                        onClick={() => setShowStockModal(false)}
                        className="btn btn-outline"
                      >
                        Cancel
                      </button>
                    </div>
                  </form>
                </div>
              </div>
            )
          }

          {/* Product Details Modal */}
          {
            showDetailsModal && selectedProduct && (
              <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4">
                <div className="rounded-2xl border border-slate-200/80 dark:border-white/10 bg-slate-950/90 w-full max-w-5xl max-h-[85vh] overflow-y-auto scrollbar-hide text-slate-900 dark:text-slate-100 shadow-[0_20px_60px_rgba(2,6,23,0.65)]">
                  {/* Modal Header */}
                  <div className="sticky top-0 bg-slate-950/95 border-b border-slate-200/80 dark:border-white/10 px-6 py-4 flex justify-between items-center">
                    <div>
                      <h2 className="text-2xl font-bold text-slate-900 dark:text-slate-100">{selectedProduct.name}</h2>
                      <p className="text-sm text-slate-700 dark:text-slate-300">
                        {splitByPrice && (selectedProduct as any)._splitPrice !== undefined && (selectedProduct as any)._splitCondition !== undefined
                          ? `Batches filtered by Price: ₹${(selectedProduct as any)._splitPrice.toFixed(2)} | Condition: ${(selectedProduct as any)._splitCondition.replace('_', ' ')}`
                          : 'Complete product inventory details'
                        }
                      </p>
                    </div>
                    <button
                      onClick={() => setShowDetailsModal(false)}
                      className="text-slate-600 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 transition-colors"
                    >
                      <FiX size={24} />
                    </button>
                  </div>

                  <div className="p-6">
                    {/* Product Basic Info */}
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
                      <div className="bg-slate-50 dark:bg-transparent p-4 rounded-lg">
                        <p className="text-xs text-slate-600 dark:text-slate-400 mb-1">HSN Code</p>
                        <p className="font-semibold">{selectedProduct.hsn_code || 'N/A'}</p>
                      </div>
                      <div className="bg-slate-50 dark:bg-transparent p-4 rounded-lg">
                        <p className="text-xs text-slate-600 dark:text-slate-400 mb-1">Category</p>
                        <p className="font-semibold">{selectedProduct.category_name || 'N/A'}</p>
                      </div>
                      <div className="bg-slate-50 dark:bg-transparent p-4 rounded-lg">
                        <p className="text-xs text-slate-600 dark:text-slate-400 mb-1">Brand</p>
                        <p className="font-semibold">{selectedProduct.brand_name || 'N/A'}</p>
                      </div>
                      <div className="bg-slate-50 dark:bg-transparent p-4 rounded-lg">
                        <p className="text-xs text-slate-600 dark:text-slate-400 mb-1">Variant</p>
                        <p className="font-semibold">{selectedProduct.variant_name || 'N/A'}</p>
                      </div>
                      <div className="bg-slate-50 dark:bg-transparent p-4 rounded-lg">
                        <p className="text-xs text-slate-600 dark:text-slate-400 mb-1">Color</p>
                        <p className="font-semibold">{selectedProduct.color_name || 'N/A'}</p>
                      </div>
                      <div className="bg-slate-50 dark:bg-transparent p-4 rounded-lg">
                        <p className="text-xs text-slate-600 dark:text-slate-400 mb-1">IMEI Tracked</p>
                        <p className="font-semibold">{selectedProduct.is_imei_tracked ? 'Yes' : 'No'}</p>
                      </div>
                      <div className="bg-slate-50 dark:bg-transparent p-4 rounded-lg">
                        <p className="text-xs text-slate-600 dark:text-slate-400 mb-1">Total Stock</p>
                        <p className="font-semibold text-lg">{selectedProduct.total_stock || 0} units</p>
                      </div>
                    </div>

                    {/* Loading State */}
                    {loadingBatches && (
                      <div className="text-center py-12">
                        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mx-auto"></div>
                        <p className="text-slate-600 dark:text-slate-400 mt-4">Loading stock batches...</p>
                      </div>
                    )}

                    {/* Stock Batches by Condition */}
                    {!loadingBatches && productBatches.length === 0 && (
                      <div className="text-center py-12 bg-slate-50 dark:bg-transparent rounded-lg">
                        <FiPackage size={48} className="mx-auto text-slate-600 dark:text-slate-400 mb-4" />
                        <p className="text-slate-600 dark:text-slate-400">No stock batches found for this product</p>
                        <HoverBorderGradient
                          as="button"
                          onClick={() => {
                            setShowDetailsModal(false);
                            handleOpenStockModal(selectedProduct);
                          }}
                          className="mt-4 bg-white/90 dark:bg-transparent text-slate-900 dark:text-slate-100"
                        >
                          <FiPackage className="h-4 w-4" />
                          Add Stock Batch
                        </HoverBorderGradient>
                      </div>
                    )}

                    {!loadingBatches && productBatches.length > 0 && (
                      <>
                        {/* Summary Cards */}
                        <div className="mb-6">
                          <h3 className="text-lg font-semibold mb-3">Stock Summary by Condition</h3>
                          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
                            {(() => {
                              const order = conditions.map((item) => item.name);
                              const summaryConditions = Array.from(new Set(productBatches.map((batch) => batch.condition)))
                                .sort((a, b) => {
                                  const ai = order.indexOf(a);
                                  const bi = order.indexOf(b);
                                  if (ai === -1 && bi === -1) return a.localeCompare(b);
                                  if (ai === -1) return 1;
                                  if (bi === -1) return -1;
                                  return ai - bi;
                                });

                              return summaryConditions.map((condition) => {
                                const conditionBatches = productBatches.filter((batch) => batch.condition === condition);
                                const totalQty = conditionBatches.reduce((sum, batch) => sum + batch.available_quantity, 0);
                                if (totalQty === 0) return null;

                                return (
                                  <div key={condition} className={`p-3 rounded-lg border ${getConditionColor(condition)}`}>
                                    <p className="text-xs font-medium mb-1">{getConditionLabel(condition)}</p>
                                    <p className="text-2xl font-bold">{totalQty}</p>
                                    <p className="text-xs">{conditionBatches.length} batch{conditionBatches.length !== 1 ? 'es' : ''}</p>
                                  </div>
                                );
                              });
                            })()}
                          </div>
                        </div>

                        {/* Detailed Batches Table */}
                        <div>
                          <h3 className="text-lg font-semibold mb-3">All Stock Batches</h3>
                          <div className="overflow-x-auto">
                            <table className="table">
                              <thead>
                                <tr>
                                  <th>Batch #</th>
                                  <th>Condition</th>
                                  <th>Source</th>
                                  <th>Purchased</th>
                                  <th>Available</th>
                                  <th>Cost/Unit</th>
                                  <th>Selling Price</th>
                                  <th>Profit/Unit</th>
                                  <th>Margin %</th>
                                  <th>Purchase Date</th>
                                  {selectedProduct.is_imei_tracked && <th>IMEI Info</th>}
                                </tr>
                              </thead>
                              <tbody>
                                {productBatches.map((batch) => {
                                  const profitPerUnit = parseFloat(batch.selling_price) - parseFloat(batch.unit_purchase_price);
                                  const profitMargin = (profitPerUnit / parseFloat(batch.unit_purchase_price)) * 100;

                                  return (
                                    <tr key={batch.id}>
                                      <td className="font-mono text-sm">{batch.batch_number}</td>
                                      <td>
                                        <span className={`rounded-full border px-2 py-1 text-xs font-medium ${getConditionColor(batch.condition)}`}>
                                          {getConditionLabel(batch.condition)}
                                        </span>
                                      </td>
                                      <td className="text-sm">{formatSourceLabel(batch.source)}</td>
                                      <td className="text-center">{batch.purchased_quantity}</td>
                                      <td className="text-center font-semibold">{batch.available_quantity}</td>
                                      <td className="text-sm">₹{parseFloat(batch.unit_purchase_price).toFixed(2)}</td>
                                      <td className="text-sm font-semibold text-emerald-700 dark:text-emerald-300">₹{parseFloat(batch.selling_price).toFixed(2)}</td>
                                      <td className={`text-sm font-semibold ${profitPerUnit >= 0 ? 'text-emerald-700 dark:text-emerald-300' : 'text-rose-700 dark:text-rose-300'}`}>
                                        ₹{profitPerUnit.toFixed(2)}
                                      </td>
                                      <td className={`text-sm font-semibold ${profitMargin >= 0 ? 'text-emerald-700 dark:text-emerald-300' : 'text-rose-700 dark:text-rose-300'}`}>
                                        {profitMargin.toFixed(1)}%
                                      </td>
                                      <td className="text-sm">{formatDate(batch.purchase_date)}</td>
                                      {selectedProduct.is_imei_tracked && (
                                        <td className="text-xs">
                                          {batch.imei_numbers && batch.imei_numbers.length > 0 ? (
                                            <div className="max-w-xs">
                                              <details className="cursor-pointer">
                                                <summary className="text-blue-400 hover:text-blue-300">
                                                  {batch.imei_numbers.length} IMEI{batch.imei_numbers.length > 1 ? 's' : ''}
                                                </summary>
                                                <div className="mt-2 space-y-1 max-h-32 overflow-y-auto bg-slate-50 dark:bg-transparent p-2 rounded">
                                                  {batch.imei_numbers.map((imei: any, idx: number) => {
                                                    // Format status for display
                                                    const statusLabels: Record<string, { text: string; color: string }> = {
                                                      'sold': { text: 'Sold', color: 'text-rose-400' },
                                                      'reserved': { text: 'Reserved', color: 'text-orange-400' },
                                                      'damaged': { text: 'Damaged', color: 'text-red-500' },
                                                      'defective': { text: 'Defective', color: 'text-red-500' },
                                                      'returned': { text: 'Returned', color: 'text-yellow-400' },
                                                    };

                                                    // Only show status for exceptional cases (not normal stock states)
                                                    const showStatus = imei.status &&
                                                      imei.status !== 'in_main_stock' &&
                                                      imei.status !== 'in_sub_stock' &&
                                                      imei.status !== 'available';

                                                    return (
                                                      <div key={idx} className="font-mono text-xs border-b border-slate-200/80 dark:border-white/10 pb-1">
                                                        {imei.imei || imei.imei_number}
                                                        {showStatus && (
                                                          <span className={`ml-2 font-semibold ${statusLabels[imei.status]?.color || 'text-amber-400'}`}>
                                                            ({statusLabels[imei.status]?.text || imei.status.replace('_', ' ')})
                                                          </span>
                                                        )}
                                                      </div>
                                                    );
                                                  })}
                                                </div>
                                              </details>
                                            </div>
                                          ) : (
                                            <span className="text-slate-600 dark:text-slate-400">No IMEI</span>
                                          )}
                                        </td>
                                      )}
                                    </tr>
                                  );
                                })}
                              </tbody>
                              <tfoot>
                                <tr className="bg-slate-50 dark:bg-transparent font-semibold">
                                  <td colSpan={3}>TOTALS</td>
                                  <td className="text-center">
                                    {productBatches.reduce((sum, b) => sum + b.purchased_quantity, 0)}
                                  </td>
                                  <td className="text-center text-lg">
                                    {productBatches.reduce((sum, b) => sum + b.available_quantity, 0)}
                                  </td>
                                  <td colSpan={selectedProduct.is_imei_tracked ? 6 : 5}></td>
                                </tr>
                              </tfoot>
                            </table>
                          </div>
                        </div>
                      </>
                    )}
                  </div>
                </div>
              </div>
            )
          }

          {/* Enhanced Edit Product & Batches Modal */}
          {
            showEditModal && selectedProduct && (
              <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4">
                <div className="card w-full max-w-5xl max-h-[85vh] overflow-y-auto scrollbar-hide text-slate-900 dark:text-slate-100 shadow-[0_20px_60px_rgba(2,6,23,0.65)]">
                  {/* Modal Header */}
                  <div className="sticky top-0 bg-slate-950/95 border-b border-slate-200/80 dark:border-white/10 px-6 py-4 flex flex-wrap justify-between items-center gap-4 z-10">
                    <div>
                      <h2 className="text-2xl font-bold text-slate-900 dark:text-slate-100">Edit Product & Batches</h2>
                      <p className="text-sm text-slate-700 dark:text-slate-300 leading-relaxed max-w-2xl">
                        {splitByPrice && (selectedProduct as any)._splitPrice !== undefined
                          ? `Editing batches for Price: ₹${(selectedProduct as any)._splitPrice.toFixed(2)} | Condition: ${(selectedProduct as any)._splitCondition?.replace('_', ' ')}`
                          : 'Update product details and batch information'
                        }
                      </p>
                    </div>
                    <button
                      onClick={() => {
                        setShowEditModal(false);
                        setEditingId(null);
                        setEditableBatches([]);
                      }}
                      className="text-slate-600 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 transition-colors"
                    >
                      <FiX size={24} />
                    </button>
                  </div>

                  <div className="p-6 space-y-8">
                    {/* Product Details Section */}
                    <div className="bg-slate-50 dark:bg-transparent p-6 rounded-2xl border border-slate-200/80 dark:border-white/10">
                      <h3 className="text-lg font-semibold mb-4 text-emerald-400">Product Details</h3>
                      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
                        <div>
                          <label className="block text-sm font-medium mb-1">Product Name *</label>
                          <input
                            type="text"
                            className="input w-full"
                            value={formData.name}
                            onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                            required
                          />
                        </div>
                        <div>
                          <label className="block text-sm font-medium mb-1">HSN Code *</label>
                          <input
                            type="text"
                            className="input w-full"
                            value={formData.hsn_code}
                            onChange={(e) => setFormData({ ...formData, hsn_code: e.target.value })}
                            required
                          />
                        </div>
                        <div>
                          <SearchableSelect
                            label="Category"
                            value={formData.category}
                            onChange={(value) => setFormData({ ...formData, category: value })}
                            options={editCategoryOptions}
                          />
                        </div>
                        <div>
                          <SearchableSelect
                            label="Brand"
                            value={formData.brand}
                            onChange={(value) => setFormData({ ...formData, brand: value })}
                            options={editBrandOptions}
                          />
                        </div>
                        <div>
                          <SearchableSelect
                            label="Variant"
                            value={formData.variant}
                            onChange={(value) => setFormData({ ...formData, variant: value })}
                            options={editVariantOptions}
                          />
                        </div>
                        <div>
                          <SearchableSelect
                            label="Color"
                            value={formData.color}
                            onChange={(value) => setFormData({ ...formData, color: value })}
                            options={editColorOptions}
                          />
                        </div>
                        <div className="md:col-span-2 xl:col-span-3">
                          <label className="flex items-center gap-2 text-sm">
                            <input
                              type="checkbox"
                              checked={formData.is_imei_tracked}
                              onChange={(e) => setFormData({ ...formData, is_imei_tracked: e.target.checked })}
                              className="rounded"
                            />
                            <span>IMEI Tracked Product</span>
                          </label>
                        </div>
                      </div>
                    </div>

                    {/* Batches Section */}
                    {loadingBatches ? (
                      <div className="text-center py-12">
                        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mx-auto"></div>
                        <p className="text-slate-600 dark:text-slate-400 mt-4">Loading batches...</p>
                      </div>
                    ) : (
                      <div className="bg-slate-50 dark:bg-transparent p-6 rounded-2xl border border-slate-200/80 dark:border-white/10">
                        <div className="flex flex-wrap justify-between items-center gap-3 mb-4">
                          <h3 className="text-lg font-semibold text-slate-900 dark:text-slate-100">Stock Batches ({editableBatches.length})</h3>
                          {splitByPrice && editableBatches.length > 0 && (
                            <div className="flex flex-wrap items-center gap-3">
                              <label className="text-sm text-slate-700 dark:text-slate-300">Bulk Update Price:</label>
                              <input
                                type="number"
                                step="0.01"
                                className="input input-sm w-36"
                                placeholder="New Price"
                                onKeyPress={(e) => {
                                  if (e.key === 'Enter') {
                                    bulkUpdatePrice((e.target as HTMLInputElement).value);
                                    (e.target as HTMLInputElement).value = '';
                                  }
                                }}
                              />
                              <button
                                type="button"
                                onClick={(e) => {
                                  const input = (e.currentTarget.previousElementSibling as HTMLInputElement);
                                  bulkUpdatePrice(input.value);
                                  input.value = '';
                                }}
                                className="btn btn-sm btn-primary"
                              >
                                <FiDollarSign className="inline mr-1" />
                                Apply to All
                              </button>
                            </div>
                          )}
                        </div>

                        {editableBatches.length === 0 ? (
                          <p className="text-center text-slate-600 dark:text-slate-400 py-8">No batches found for this product</p>
                        ) : (
                          <div className="space-y-3">
                            {editableBatches.map((batch) => {
                              const profitPerUnit = parseFloat(batch.selling_price) - parseFloat(batch.unit_purchase_price);
                              const profitMargin = (profitPerUnit / parseFloat(batch.unit_purchase_price)) * 100;

                              return (
                                <div key={batch.id} className="card p-5">
                                  <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
                                    {/* Batch Number */}
                                    <div className="col-span-1">
                                      <label className="block text-xs font-medium mb-1 text-slate-600 dark:text-slate-400">Batch Number</label>
                                      <input
                                        type="text"
                                        className="input input-sm w-full font-mono"
                                        value={batch.batch_number}
                                        onChange={(e) => updateBatchField(batch.id, 'batch_number', e.target.value)}
                                      />
                                    </div>

                                    {/* Condition */}
                                    <div className="col-span-1">
                                      <label className="block text-xs font-medium mb-1 text-slate-600 dark:text-slate-400">Condition</label>
                                      <SearchableSelect
                                        value={batch.condition}
                                        onChange={(value) => updateBatchField(batch.id, 'condition', String(value))}
                                        options={batchConditionOptions}
                                        className="text-sm"
                                        onAddNew={(searchTerm) => {
                                          setQuickAddInitialValue(searchTerm);
                                          setShowConditionModal(true);
                                        }}
                                        addNewLabel="Add Condition"
                                      />
                                    </div>

                                    {/* Selling Price */}
                                    <div className="col-span-1">
                                      <label className="block text-xs font-medium mb-1 text-slate-600 dark:text-slate-400">Selling Price</label>
                                      <input
                                        type="number"
                                        step="0.01"
                                        className="input input-sm w-full font-semibold"
                                        value={batch.selling_price}
                                        onChange={(e) => updateBatchField(batch.id, 'selling_price', e.target.value)}
                                      />
                                    </div>

                                    {/* Cost & Profit Display */}
                                    <div className="col-span-1">
                                      <label className="block text-xs font-medium mb-1 text-slate-600 dark:text-slate-400">Cost/Unit</label>
                                      <div className="text-sm py-1">₹{parseFloat(batch.unit_purchase_price).toFixed(2)}</div>
                                    </div>

                                    <div className="col-span-1">
                                      <label className="block text-xs font-medium mb-1 text-slate-600 dark:text-slate-400">Profit (Margin)</label>
                                      <div className={`text-sm py-1 font-semibold ${profitPerUnit >= 0 ? 'text-emerald-700 dark:text-emerald-300' : 'text-rose-700 dark:text-rose-300'}`}>
                                        ₹{profitPerUnit.toFixed(2)} ({profitMargin.toFixed(1)}%)
                                      </div>
                                    </div>

                                    {/* Second Row */}
                                    <div className="col-span-1">
                                      <label className="block text-xs font-medium mb-1 text-slate-600 dark:text-slate-400">Supplier</label>
                                      <input
                                        type="text"
                                        className="input input-sm w-full"
                                        value={batch.supplier_name || ''}
                                        onChange={(e) => updateBatchField(batch.id, 'supplier_name', e.target.value)}
                                      />
                                    </div>

                                    <div className="col-span-1">
                                      <label className="block text-xs font-medium mb-1 text-slate-600 dark:text-slate-400">Invoice Number</label>
                                      <input
                                        type="text"
                                        className="input input-sm w-full"
                                        value={batch.invoice_number || ''}
                                        onChange={(e) => updateBatchField(batch.id, 'invoice_number', e.target.value)}
                                      />
                                    </div>

                                    <div className="col-span-1">
                                      <label className="block text-xs font-medium mb-1 text-slate-600 dark:text-slate-400">Initial Payment</label>
                                      {batch.initial_payment_amount ? (
                                        <div className="text-sm py-1">
                                          Rs {Number.parseFloat(String(batch.initial_payment_amount)).toFixed(2)}
                                        </div>
                                      ) : (
                                        <div className="text-sm py-1 text-slate-500 dark:text-slate-400">-</div>
                                      )}
                                      {batch.initial_payment_method && (
                                        <div className="text-xs text-slate-600 dark:text-slate-400">
                                          {formatPaymentMethod(batch.initial_payment_method)}
                                          {batch.initial_payment_reference ? ` • ${batch.initial_payment_reference}` : ''}
                                        </div>
                                      )}
                                    </div>

                                    <div className="col-span-1">
                                      <label className="block text-xs font-medium mb-1 text-slate-600 dark:text-slate-400">Source</label>
                                      <SearchableSelect
                                        value={batch.source}
                                        onChange={(value) => updateBatchField(batch.id, 'source', String(value))}
                                        options={batchSourceOptions}
                                        className="text-sm"
                                        onAddNew={(searchTerm) => {
                                          setQuickAddInitialValue(searchTerm);
                                          setShowSourceModal(true);
                                        }}
                                        addNewLabel="Add Source"
                                      />
                                    </div>

                                    <div className="col-span-1">
                                      <label className="block text-xs font-medium mb-1 text-slate-600 dark:text-slate-400">Purchase Date</label>
                                      <input
                                        type="date"
                                        className="input input-sm w-full"
                                        value={batch.purchase_date}
                                        onChange={(e) => updateBatchField(batch.id, 'purchase_date', e.target.value)}
                                      />
                                    </div>

                                    <div className="col-span-1">
                                      <label className="block text-xs font-medium mb-1 text-slate-600 dark:text-slate-400">Quantities</label>
                                      <div className="text-sm py-1">
                                        <span className="text-slate-600 dark:text-slate-400">Purchased:</span> {batch.purchased_quantity}
                                        {' | '}
                                        <span className="text-emerald-700 dark:text-emerald-300 font-semibold">Available:</span> {batch.available_quantity}
                                      </div>
                                    </div>

                                    {/* Notes */}
                                    <div className="md:col-span-2 xl:col-span-3">
                                      <label className="block text-xs font-medium mb-1 text-slate-600 dark:text-slate-400">Notes</label>
                                      <textarea
                                        className="input input-sm w-full"
                                        rows={2}
                                        value={batch.notes || ''}
                                        onChange={(e) => updateBatchField(batch.id, 'notes', e.target.value)}
                                        placeholder="Optional notes..."
                                      />
                                    </div>
                                  </div>
                                </div>
                              );
                            })}
                          </div>
                        )}
                      </div>
                    )}

                    {/* Action Buttons */}
                    <div className="flex justify-end gap-3 pt-4 border-t border-slate-200/80 dark:border-white/10">
                      <button
                        type="button"
                        onClick={() => {
                          setShowEditModal(false);
                          setEditingId(null);
                          setEditableBatches([]);
                        }}
                        className="btn btn-outline"
                      >
                        Cancel
                      </button>
                      <button
                        type="button"
                        onClick={handleSaveProductAndBatches}
                        className="btn btn-primary"
                        disabled={loadingBatches}
                      >
                        <FiEdit className="inline mr-2" />
                        Save All Changes
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            )
          }

          {/* Quick Add Modals */}
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
      </div>
    </>
  );
}
