'use client';

import { useEffect, useMemo, useState } from 'react';
import { dashboardAPI } from '@/lib/api';
import { useAuth } from '@/context/AuthContext';
import { useDataStore } from '@/stores/dataStore';
import type { Product } from '@/types';
import { FiDollarSign, FiTrendingUp, FiShoppingCart, FiPercent, FiUsers, FiTag, FiBarChart2 } from 'react-icons/fi';
import { useAutoRefresh } from '@/hooks/useAutoRefresh';
import SearchableSelect from '@/components/SearchableSelect';
import FullScreenLoader from '@/components/FullScreenLoader';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  ArcElement,
  RadialLinearScale,
  Filler,
  Tooltip,
  Legend,
} from 'chart.js';
import ChartDataLabels from 'chartjs-plugin-datalabels';
import type { ChartData, ChartOptions } from 'chart.js';
import { Bar, Chart, Doughnut, Line, PolarArea } from 'react-chartjs-2';

interface KPIs {
  total_sales: number;
  total_revenue: number;
  total_profit: number;
  total_discount: number;
  avg_order_value: number;
  profit_margin: number;
  total_customers: number;
  new_customers: number;
}

interface AnalyticsData {
  period: string;
  start_date: string;
  end_date: string;
  kpis: KPIs;
  shop_sales: Array<{
    shop__name: string;
    sales_count: number;
    revenue: number;
    profit: number;
  }>;
  sales_trend: Array<{
    period: string;
    sales_count: number;
    revenue: number;
    profit: number;
  }>;
  top_products: Array<{
    stock_batch__product__name: string;
    quantity_sold: number;
    revenue: number;
    profit: number;
  }>;
  payment_methods: Array<{
    payment_method: string;
    count: number;
    total: number;
  }>;
}

interface Shop {
  id: number;
  name: string;
}

interface AdvancedAnalyticsData {
  period: string;
  start_date: string;
  end_date: string;
  breakdowns: {
    by_category: Array<{
      category_name: string;
      units_sold: number;
      revenue: number;
      profit: number;
      sales_count: number;
    }>;
    by_brand: Array<{
      brand_name: string;
      units_sold: number;
      revenue: number;
      profit: number;
      sales_count: number;
    }>;
    by_condition: Array<{
      condition: string;
      units_sold: number;
      revenue: number;
      profit: number;
      sales_count: number;
    }>;
    by_source: Array<{
      source: string;
      units_sold: number;
      revenue: number;
      profit: number;
      sales_count: number;
    }>;
    by_variant: Array<{
      variant_name: string;
      units_sold: number;
      revenue: number;
      profit: number;
      sales_count: number;
    }>;
    by_shop: Array<{
      shop_name: string;
      units_sold: number;
      revenue: number;
      profit: number;
      sales_count: number;
    }>;
  };
}

const inlineDataLabels = {
  id: 'inlineDataLabels',
  afterDatasetsDraw(chart: any) {
    const { ctx, data, chartArea, options } = chart;
    if (!ctx || !data?.datasets?.length) return;
    ctx.save();
    ctx.font = '600 10px "Segoe UI", sans-serif';
    const defaultColor = options?.plugins?.inlineDataLabels?.color || '#e2e8f0';
    const isHorizontal = chart.options.indexAxis === 'y';

    data.datasets.forEach((dataset: any, datasetIndex: number) => {
      const meta = chart.getDatasetMeta(datasetIndex);
      if (meta.type !== 'bar' || meta.hidden) return;
      if (dataset?.datalabels?.display === false) return;
      const formatter = dataset?.datalabels?.formatter;
      const color = dataset?.datalabels?.color || defaultColor;
      ctx.fillStyle = color;

      meta.data.forEach((element: any, index: number) => {
        const value = dataset.data?.[index];
        if (value === null || value === undefined) return;
        const label = typeof formatter === 'function' ? formatter(value) : String(value);
        if (isHorizontal) {
          const x = Math.min(chartArea.right - 6, element.x + 8);
          const y = element.y + 3;
          ctx.textAlign = 'left';
          ctx.textBaseline = 'middle';
          ctx.fillText(label, x, y);
        } else {
          const x = element.x;
          const y = Math.max(chartArea.top + 12, element.y - 6);
          ctx.textAlign = 'center';
          ctx.textBaseline = 'bottom';
          ctx.fillText(label, x, y);
        }
      });
    });

    ctx.restore();
  },
};

ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  ArcElement,
  RadialLinearScale,
  Filler,
  Tooltip,
  Legend,
  ChartDataLabels,
  inlineDataLabels
);
export default function DashboardPage() {
  const { user } = useAuth();

  // Use preloaded data from store for instant load
  const { shops: storeShops, products: storeProducts } = useDataStore();

  const [analytics, setAnalytics] = useState<AnalyticsData | null>(null);
  const [prevAnalytics, setPrevAnalytics] = useState<AnalyticsData | null>(null);
  const [advancedAnalytics, setAdvancedAnalytics] = useState<AdvancedAnalyticsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [isDark, setIsDark] = useState(false);
  const [performanceMetric, setPerformanceMetric] = useState<'revenue' | 'profit' | 'orders'>('revenue');
  const [prevLoading, setPrevLoading] = useState(false);

  // Filters
  const [period, setPeriod] = useState('month');
  const [shopId, setShopId] = useState('');
  const [productId, setProductId] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');

  // Auto-set shop for sub-stock managers
  useEffect(() => {
    if (user?.role === 'sub_stock_manager' && user?.shop) {
      setShopId(user.shop.toString());
    }
  }, [user]);

  useEffect(() => {
    fetchAnalytics();
    fetchAdvancedAnalytics({ background: false });
  }, [period, shopId, productId, startDate, endDate]);

  const fetchAnalytics = async (options?: { background?: boolean }) => {
    const isBackground = Boolean(options?.background && analytics);
    try {
      if (isBackground) {
        setIsRefreshing(true);
      } else {
        setLoading(true);
      }
      const params: any = { period };
      if (shopId) params.shop_id = shopId;
      if (productId) params.product_id = productId;
      if (period === 'custom') {
        if (startDate) params.start_date = startDate;
        if (endDate) params.end_date = endDate;
      }

      const response = await dashboardAPI.analytics(params);
      setAnalytics(response.data);
    } catch (error) {
      console.error('Failed to fetch analytics:', error);
    } finally {
      if (isBackground) {
        setIsRefreshing(false);
      } else {
        setLoading(false);
      }
    }
  };

  useAutoRefresh(() => {
    fetchAnalytics({ background: true });
  }, { intervalMs: 30000 });

  // Use store data - no API call needed!
  const shops = storeShops;
  const products = storeProducts;

  const fetchAdvancedAnalytics = async (options?: { background?: boolean }) => {
    const isBackground = Boolean(options?.background && advancedAnalytics);
    try {
      if (isBackground) {
        setIsRefreshing(true);
      }
      const params: any = { period };
      if (shopId) params.shop_id = shopId;
      if (period === 'custom') {
        if (startDate) params.start_date = startDate;
        if (endDate) params.end_date = endDate;
      }

      const response = await dashboardAPI.advancedAnalytics(params);
      setAdvancedAnalytics(response.data);
    } catch (error) {
      console.error('Failed to fetch advanced analytics:', error);
    } finally {
      if (isBackground) {
        setIsRefreshing(false);
      }
    }
  };

  const toDate = (value?: string) => {
    if (!value) return null;
    const parsed = new Date(value);
    return Number.isNaN(parsed.getTime()) ? null : parsed;
  };

  const formatDateISO = (date: Date) => date.toISOString().split('T')[0];

  useEffect(() => {
    if (!analytics?.start_date || !analytics?.end_date) return;
    const start = toDate(analytics.start_date);
    const end = toDate(analytics.end_date);
    if (!start || !end) return;

    const lengthMs = end.getTime() - start.getTime();
    const daysCount = Math.floor(lengthMs / (1000 * 60 * 60 * 24)) + 1;
    const prevEnd = new Date(start);
    prevEnd.setDate(prevEnd.getDate() - 1);
    const prevStart = new Date(prevEnd);
    prevStart.setDate(prevStart.getDate() - (daysCount - 1));

    const fetchPrev = async () => {
      try {
        setPrevLoading(true);
        const params: any = {
          period: 'custom',
          start_date: formatDateISO(prevStart),
          end_date: formatDateISO(prevEnd),
        };
        if (shopId) params.shop_id = shopId;
        if (productId) params.product_id = productId;
        const response = await dashboardAPI.analytics(params);
        setPrevAnalytics(response.data);
      } catch (error) {
        console.error('Failed to fetch previous analytics:', error);
        setPrevAnalytics(null);
      } finally {
        setPrevLoading(false);
      }
    };

    fetchPrev();
  }, [analytics?.start_date, analytics?.end_date, productId, shopId]);

  useEffect(() => {
    const updateTheme = () => {
      if (typeof document !== 'undefined') {
        setIsDark(document.documentElement.classList.contains('dark'));
      }
    };

    updateTheme();
    if (typeof document === 'undefined') return;

    const observer = new MutationObserver(updateTheme);
    observer.observe(document.documentElement, { attributes: true, attributeFilter: ['class'] });

    return () => observer.disconnect();
  }, []);

  const formatCurrency = (value: number) =>
    `₹${value.toLocaleString('en-IN', { maximumFractionDigits: 0 })}`;
  const formatAxisCurrency = (value: number | string) => formatCurrency(Number(value));
  const formatPerformanceValue = (value: number | string) => (
    performanceMetric === 'orders'
      ? Number(value).toLocaleString('en-IN')
      : formatCurrency(Number(value))
  );

  // Dynamic chart colors based on theme
  const chartText = isDark ? '#e2e8f0' : '#334155';
  const chartGrid = isDark ? 'rgba(148, 163, 184, 0.25)' : 'rgba(148, 163, 184, 0.15)';
  const chartTooltipBg = isDark ? 'rgba(2, 6, 23, 0.9)' : 'rgba(255, 255, 255, 0.95)';

  const salesTrendLabels = analytics?.sales_trend?.map((item) => item.period) || [];
  const formatTrendLabel = (value: string) => {
    const parsed = toDate(value);
    if (!parsed) return value;
    if (period === 'day') return parsed.toLocaleDateString('en-IN', { day: '2-digit', month: 'short' });
    if (period === 'week') return parsed.toLocaleDateString('en-IN', { day: '2-digit', month: 'short' });
    if (period === 'month' || period === 'quarter') return parsed.toLocaleDateString('en-IN', { month: 'short', year: '2-digit' });
    if (period === 'year') return parsed.getFullYear().toString();
    return parsed.toLocaleDateString('en-IN', { day: '2-digit', month: 'short' });
  };

  const performanceMetricLabel = performanceMetric === 'orders'
    ? 'Orders'
    : performanceMetric.charAt(0).toUpperCase() + performanceMetric.slice(1);
  const currentTrendSeries = analytics?.sales_trend?.map((item) => {
    if (performanceMetric === 'orders') return item.sales_count;
    if (performanceMetric === 'profit') return item.profit;
    return item.revenue;
  }) || [];

  const previousTrendSeries = prevAnalytics?.sales_trend?.map((item) => {
    if (performanceMetric === 'orders') return item.sales_count;
    if (performanceMetric === 'profit') return item.profit;
    return item.revenue;
  }) || [];

  const alignedPreviousSeries = salesTrendLabels.map((_, index) => previousTrendSeries[index] ?? null);

  const currentTotal = currentTrendSeries.reduce((sum, value) => sum + (value || 0), 0);
  const previousTotal = alignedPreviousSeries.reduce((sum, value) => sum + (value || 0), 0);
  const delta = currentTotal - previousTotal;
  const deltaPct = previousTotal ? (delta / previousTotal) * 100 : 0;

  const salesTrendData = useMemo(() => ({
    labels: salesTrendLabels.map(formatTrendLabel),
    datasets: [
      {
        label: `Current ${performanceMetricLabel}`,
        data: currentTrendSeries,
        borderColor: '#10b981',
        backgroundColor: 'rgba(16,185,129,0.15)',
        tension: 0.35,
        fill: true,
        pointRadius: 3,
      },
      {
        label: `Previous ${performanceMetricLabel}`,
        data: alignedPreviousSeries,
        borderColor: '#64748b',
        backgroundColor: 'rgba(100,116,139,0.1)',
        borderDash: [6, 4],
        tension: 0.35,
        pointRadius: 3,
      },
    ],
  }), [salesTrendLabels, currentTrendSeries, alignedPreviousSeries, performanceMetricLabel, period]);

  const salesTrendOptions = useMemo(() => ({
    responsive: true,
    maintainAspectRatio: false,
    interaction: { mode: 'index' as const, intersect: false },
    plugins: {
      legend: { labels: { color: chartText } },
      tooltip: {
        backgroundColor: chartTooltipBg,
        titleColor: chartText,
        bodyColor: chartText,
        borderColor: chartGrid,
        borderWidth: 1,
      },
      datalabels: { display: false },
    },
    scales: {
      x: {
        ticks: { color: chartText },
        grid: {
          display: false,
          drawBorder: true,
          borderColor: 'rgba(148, 163, 184, 0.5)',
          borderWidth: 2
        }
      },
      y: {
        ticks: { color: chartText, callback: (value: number | string) => formatPerformanceValue(value) },
        grid: {
          display: false,
          drawBorder: true,
          borderColor: 'rgba(148, 163, 184, 0.5)',
          borderWidth: 2
        },
      },
    },
  }), [chartGrid, chartText, chartTooltipBg, formatPerformanceValue]);

  const revenueVsProfitData = useMemo<ChartData<'bar' | 'line', number[], string>>(() => ({
    labels: salesTrendLabels.map(formatTrendLabel),
    datasets: [
      {
        type: 'bar' as const,
        label: 'Revenue',
        data: analytics?.sales_trend?.map((item) => item.revenue) || [],
        backgroundColor: 'rgba(59,130,246,0.5)',
        borderColor: '#3b82f6',
        datalabels: {
          anchor: 'end' as const,
          align: 'end' as const,
          offset: 6,
          formatter: (value: number) => formatCurrency(value),
        },
      },
      {
        type: 'bar' as const,
        label: 'Profit',
        data: analytics?.sales_trend?.map((item) => item.profit) || [],
        backgroundColor: 'rgba(16,185,129,0.5)',
        borderColor: '#10b981',
        datalabels: {
          anchor: 'end' as const,
          align: 'end' as const,
          offset: 6,
          formatter: (value: number) => formatCurrency(value),
        },
      },
      {
        type: 'line' as const,
        label: 'Margin %',
        data: analytics?.sales_trend?.map((item) => {
          if (!item.revenue) return 0;
          return (item.profit / item.revenue) * 100;
        }) || [],
        borderColor: '#f59e0b',
        backgroundColor: 'rgba(245,158,11,0.25)',
        yAxisID: 'y1',
        tension: 0.35,
        datalabels: { display: false },
      },
    ],
  }), [analytics?.sales_trend, salesTrendLabels, formatTrendLabel]);

  const revenueVsProfitOptions = useMemo<ChartOptions<'bar' | 'line'>>(() => ({
    responsive: true,
    maintainAspectRatio: false,
    interaction: { mode: 'index' as const, intersect: false },
    plugins: {
      legend: { labels: { color: chartText } },
      tooltip: {
        backgroundColor: chartTooltipBg,
        titleColor: chartText,
        bodyColor: chartText,
        borderColor: chartGrid,
        borderWidth: 1,
      },
      datalabels: { display: false }, // Disable - using inlineDataLabels instead
    },
    scales: {
      x: {
        ticks: { color: chartText, maxRotation: 0, autoSkip: true },
        grid: {
          display: false,
          drawBorder: true,
          borderColor: 'rgba(148, 163, 184, 0.5)',
          borderWidth: 2
        },
      },
      y: {
        ticks: { color: chartText, callback: (value: string | number) => formatAxisCurrency(value) },
        grid: {
          display: false,
          drawBorder: true,
          borderColor: 'rgba(148, 163, 184, 0.5)',
          borderWidth: 2
        },
      },
      y1: {
        position: 'right',
        ticks: {
          color: chartText,
          callback: (value: string | number) => `${value}%`,
        },
        grid: {
          display: false,
          drawBorder: true,
          borderColor: 'rgba(148, 163, 184, 0.5)',
          borderWidth: 2
        },
      },
    },
  }), [chartGrid, chartText, chartTooltipBg, formatAxisCurrency]);

  const shopPerformanceData = useMemo(() => ({
    labels: analytics?.shop_sales?.map((shop) => shop.shop__name) || [],
    datasets: [
      {
        label: performanceMetricLabel,
        data: analytics?.shop_sales?.map((shop) => {
          if (performanceMetric === 'orders') return shop.sales_count;
          if (performanceMetric === 'profit') return shop.profit;
          return shop.revenue;
        }) || [],
        backgroundColor: 'rgba(139,92,246,0.6)',
        datalabels: {
          anchor: 'end' as const,
          align: 'right' as const,
          offset: 6,
          formatter: (value: number) => formatPerformanceValue(value),
        },
      },
    ],
  }), [analytics?.shop_sales, performanceMetric, performanceMetricLabel, formatPerformanceValue]);

  const shopPerformanceOptions = useMemo(() => ({
    responsive: true,
    maintainAspectRatio: false,
    indexAxis: 'y' as const,
    interaction: { mode: 'index' as const, intersect: false },
    plugins: {
      legend: { labels: { color: chartText } },
      tooltip: {
        backgroundColor: chartTooltipBg,
        titleColor: chartText,
        bodyColor: chartText,
        borderColor: chartGrid,
        borderWidth: 1,
      },
      datalabels: { display: false }, // Disable - using inlineDataLabels instead
    },
    scales: {
      x: {
        ticks: {
          color: chartText,
          callback: (value: number | string) => (
            performanceMetric === 'orders'
              ? Number(value).toLocaleString('en-IN')
              : formatAxisCurrency(value)
          ),
        },
        grid: {
          display: false,
          drawBorder: true,
          borderColor: 'rgba(148, 163, 184, 0.5)',
          borderWidth: 2,
        },
      },
      y: {
        ticks: { color: chartText },
        grid: {
          display: false,
          drawBorder: true,
          borderColor: 'rgba(148, 163, 184, 0.5)',
          borderWidth: 2,
        },
      },
    },
  }), [chartGrid, chartText, chartTooltipBg, formatAxisCurrency, performanceMetric]);

  const topProductsData = useMemo(() => ({
    labels: analytics?.top_products?.map((item) => item.stock_batch__product__name) || [],
    datasets: [
      {
        label: performanceMetricLabel,
        data: analytics?.top_products?.map((item) => {
          if (performanceMetric === 'orders') return item.quantity_sold;
          if (performanceMetric === 'profit') return item.profit;
          return item.revenue;
        }) || [],
        backgroundColor: 'rgba(251,191,36,0.6)',
        datalabels: {
          anchor: 'end' as const,
          align: 'right' as const,
          offset: 6,
          formatter: (value: number) => formatPerformanceValue(value),
        },
      },
    ],
  }), [analytics?.top_products, performanceMetric, performanceMetricLabel, formatPerformanceValue]);

  const topProductsOptions = useMemo(() => ({
    responsive: true,
    maintainAspectRatio: false,
    indexAxis: 'y' as const,
    interaction: { mode: 'index' as const, intersect: false },
    plugins: {
      legend: { labels: { color: chartText } },
      tooltip: {
        backgroundColor: chartTooltipBg,
        titleColor: chartText,
        bodyColor: chartText,
        borderColor: chartGrid,
        borderWidth: 1,
      },
      datalabels: { display: false }, // Disable - using inlineDataLabels instead
    },
    scales: {
      x: {
        ticks: {
          color: chartText,
          callback: (value: number | string) => (
            performanceMetric === 'orders'
              ? Number(value).toLocaleString('en-IN')
              : formatAxisCurrency(value)
          ),
        },
        grid: {
          display: false,
          drawBorder: true,
          borderColor: 'rgba(148, 163, 184, 0.5)',
          borderWidth: 2,
        },
      },
      y: {
        ticks: { color: chartText },
        grid: {
          display: false,
          drawBorder: true,
          borderColor: 'rgba(148, 163, 184, 0.5)',
          borderWidth: 2,
        },
      },
    },
  }), [chartGrid, chartText, chartTooltipBg, formatAxisCurrency, performanceMetric]);

  const paymentMethodsData = useMemo(() => ({
    labels: analytics?.payment_methods?.map((item) => item.payment_method) || [],
    datasets: [
      {
        data: analytics?.payment_methods?.map((item) => item.count) || [],
        backgroundColor: ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6'],
        borderWidth: 0,
      },
    ],
  }), [analytics?.payment_methods]);

  const paymentMethodsOptions = useMemo(() => ({
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        labels: { color: chartText },
        position: 'bottom' as const,
      },
      tooltip: {
        backgroundColor: chartTooltipBg,
        titleColor: chartText,
        bodyColor: chartText,
        borderColor: chartGrid,
        borderWidth: 1,
        callbacks: {
          label: (context: any) => {
            const index = context.dataIndex ?? 0;
            const method = analytics?.payment_methods?.[index];
            if (!method) return context.label || '';
            const count = Number(method.count || 0);
            const total = Number(method.total || 0);
            return `${context.label}: ${count} sales (${formatCurrency(total)})`;
          },
        },
      },
      datalabels: {
        color: isDark ? '#fff' : '#1e293b',
        font: {
          weight: 'bold' as const,
          size: 14,
        },
        formatter: (value: number, context: any) => {
          const dataset = context.chart.data.datasets[0];
          const total = (dataset.data as number[]).reduce((acc: number, val: number) => acc + val, 0);
          const percentage = ((value / total) * 100).toFixed(1);
          return `${percentage}%\n${value} sales`;
        },
      },
    },
  }), [analytics?.payment_methods, chartGrid, chartText, chartTooltipBg, formatCurrency, isDark]);

  const isInitialLoading = loading && !analytics;
  const isUpdating = isRefreshing || prevLoading;

  if (isInitialLoading) {
    return <FullScreenLoader label="Loading analytics" />;
  }

  const periodOptions = [
    { value: 'day', label: 'Today' },
    { value: 'week', label: 'Last 7 Days' },
    { value: 'month', label: 'Last 30 Days' },
    { value: 'quarter', label: 'Last 90 Days (Quarter)' },
    { value: 'year', label: 'Last 365 Days (Year)' },
    { value: 'custom', label: 'Custom Range' },
  ];

  const trendOptions = [
    { value: 'revenue', label: 'Revenue' },
    { value: 'profit', label: 'Profit' },
    { value: 'orders', label: 'Orders' },
  ];

  const shopOptions = [
    { value: '', label: 'All Shops' },
    ...shops.map((shop) => ({ value: shop.id.toString(), label: shop.name })),
  ];

  const productOptions = [
    { value: '', label: 'All Products' },
    ...products.map((product) => ({ value: product.id.toString(), label: product.name })),
  ];

  const kpiCards = [
    {
      title: 'Total Sales',
      value: analytics?.kpis.total_sales || 0,
      icon: FiShoppingCart,
      accent: 'border-sky-400/40',
      lightGradient: 'from-sky-50 to-blue-50',
      valueColor: 'text-sky-600 dark:text-sky-200',
      iconColor: 'text-sky-500 dark:text-sky-200',
    },
    {
      title: 'Total Revenue',
      value: formatCurrency(analytics?.kpis.total_revenue || 0),
      icon: FiDollarSign,
      accent: 'border-emerald-400/40',
      lightGradient: 'from-emerald-50 to-teal-50',
      valueColor: 'text-emerald-600 dark:text-emerald-200',
      iconColor: 'text-emerald-500 dark:text-emerald-200',
    },
    {
      title: 'Total Profit',
      value: formatCurrency(analytics?.kpis.total_profit || 0),
      icon: FiTrendingUp,
      accent: 'border-teal-400/40',
      lightGradient: 'from-teal-50 to-cyan-50',
      valueColor: 'text-teal-600 dark:text-teal-200',
      iconColor: 'text-teal-500 dark:text-teal-200',
    },
    {
      title: 'Profit Margin',
      value: `${(analytics?.kpis.profit_margin || 0).toFixed(1)}%`,
      icon: FiPercent,
      accent: 'border-amber-400/40',
      lightGradient: 'from-amber-50 to-yellow-50',
      valueColor: 'text-amber-600 dark:text-amber-200',
      iconColor: 'text-amber-500 dark:text-amber-200',
    },
    {
      title: 'Avg Order Value',
      value: formatCurrency(analytics?.kpis.avg_order_value || 0),
      icon: FiDollarSign,
      accent: 'border-indigo-400/40',
      lightGradient: 'from-indigo-50 to-purple-50',
      valueColor: 'text-indigo-600 dark:text-indigo-200',
      iconColor: 'text-indigo-500 dark:text-indigo-200',
    },
    {
      title: 'Total Customers',
      value: analytics?.kpis.total_customers || 0,
      icon: FiUsers,
      accent: 'border-rose-400/40',
      subtitle: `${analytics?.kpis.new_customers || 0} new`,
      lightGradient: 'from-rose-50 to-pink-50',
      valueColor: 'text-rose-600 dark:text-rose-200',
      iconColor: 'text-rose-500 dark:text-rose-200',
    },
    {
      title: 'Discount Given',
      value: formatCurrency(analytics?.kpis.total_discount || 0),
      icon: FiTag,
      accent: 'border-orange-400/40',
      lightGradient: 'from-orange-50 to-amber-50',
      valueColor: 'text-orange-600 dark:text-orange-200',
      iconColor: 'text-orange-500 dark:text-orange-200',
    },
  ];

  return (
    <div className="space-y-8">
      {/* Premium Header Section */}
      <div className="flex flex-col gap-8 lg:flex-row lg:items-end lg:justify-between">
        <div className="space-y-3">
          <div className="inline-flex items-center gap-2 rounded-full border border-sky-500/30 bg-sky-500/10 px-3 py-1 text-xs font-semibold text-sky-600 dark:text-sky-300 backdrop-blur-sm">
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-sky-500 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-sky-500"></span>
            </span>
            Real-time Analytics
          </div>
          <h1 className="text-4xl font-bold tracking-tight text-slate-900 dark:text-white">Analytics Command Center</h1>
          <p className="max-w-lg text-base text-slate-600 dark:text-slate-400">
            Real-time business intelligence with advanced data visualization and actionable insights across all metrics.
          </p>
          <div className="flex flex-wrap items-center gap-3 pt-1">
            <div className="inline-flex items-center gap-2 rounded-lg border border-slate-200 dark:border-white/10 bg-slate-50 dark:bg-white/5 px-3 py-2 text-xs font-medium text-slate-700 dark:text-slate-300">
              <FiBarChart2 className="h-4 w-4" />
              {analytics?.start_date} to {analytics?.end_date}
            </div>
            {isUpdating && (
              <div className="inline-flex items-center gap-2 rounded-lg border border-emerald-500/30 dark:border-emerald-400/20 bg-emerald-50 dark:bg-emerald-500/10 px-3 py-2 text-xs font-medium text-emerald-700 dark:text-emerald-200">
                <span className="h-2 w-2 animate-pulse rounded-full bg-emerald-500 dark:bg-emerald-400" />
                Live update in progress
              </div>
            )}
          </div>
        </div>

        {/* Key Metrics Summary Cards */}
        <div className="grid w-full max-w-sm gap-3 lg:max-w-md">
          <div className="rounded-xl border border-sky-500/20 bg-gradient-to-br from-sky-50 to-blue-50 dark:from-sky-500/10 dark:to-blue-500/10 p-4">
            <p className="text-xs font-semibold uppercase tracking-wide text-sky-600 dark:text-sky-300">Revenue</p>
            <p className="mt-3 text-2xl font-bold text-sky-900 dark:text-sky-100">{formatCurrency(analytics?.kpis.total_revenue || 0)}</p>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="rounded-xl border border-emerald-500/20 bg-gradient-to-br from-emerald-50 to-teal-50 dark:from-emerald-500/10 dark:to-teal-500/10 p-4">
              <p className="text-xs font-semibold uppercase tracking-wide text-emerald-600 dark:text-emerald-300">Profit</p>
              <p className="mt-2 text-lg font-bold text-emerald-900 dark:text-emerald-100">{formatCurrency(analytics?.kpis.total_profit || 0)}</p>
            </div>
            <div className="rounded-xl border border-amber-500/20 bg-gradient-to-br from-amber-50 to-orange-50 dark:from-amber-500/10 dark:to-orange-500/10 p-4">
              <p className="text-xs font-semibold uppercase tracking-wide text-amber-600 dark:text-amber-300">Orders</p>
              <p className="mt-2 text-lg font-bold text-amber-900 dark:text-amber-100">{analytics?.kpis.total_sales || 0}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Advanced Filters Card */}
      <div className="card text-slate-900 dark:text-slate-100">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h2 className="text-xl font-bold text-slate-900 dark:text-slate-100">Filters & Controls</h2>
            <p className="mt-1 text-sm text-slate-600 dark:text-slate-400">Refine analysis by time period, metrics, and store performance</p>
          </div>
        </div>
        <div className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-2 md:grid-cols-6">
          {/* Period Filter */}
          <div>
            <SearchableSelect
              label="Time Period"
              value={period}
              onChange={(value) => setPeriod(String(value))}
              options={periodOptions}
            />
          </div>

          <div>
            <SearchableSelect
              label="Performance Metric"
              value={performanceMetric}
              onChange={(value) => setPerformanceMetric(value as 'revenue' | 'profit' | 'orders')}
              options={trendOptions}
            />
          </div>

          {/* Shop Filter - Only for Admins */}
          {user?.role !== 'sub_stock_manager' && (
            <div>
              <SearchableSelect
                label="Shop"
                value={shopId}
                onChange={(value) => setShopId(String(value))}
                options={shopOptions}
              />
            </div>
          )}

          <div>
            <SearchableSelect
              label="Product"
              value={productId}
              onChange={(value) => setProductId(String(value))}
              options={productOptions}
            />
          </div>

          {/* Custom Date Range */}
          {period === 'custom' && (
            <>
              <div>
                <label htmlFor="dashboard-start-date" className="block text-xs font-semibold uppercase tracking-wide text-slate-600 dark:text-slate-400">Start Date</label>
                <input
                  id="dashboard-start-date"
                  name="startDate"
                  type="date"
                  className="input mt-2"
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                />
              </div>
              <div>
                <label htmlFor="dashboard-end-date" className="block text-xs font-semibold uppercase tracking-wide text-slate-600 dark:text-slate-400">End Date</label>
                <input
                  id="dashboard-end-date"
                  name="endDate"
                  type="date"
                  className="input mt-2"
                  value={endDate}
                  onChange={(e) => setEndDate(e.target.value)}
                />
              </div>
            </>
          )}
        </div>
      </div>

      {/* Premium KPI Cards Grid */}
      <div className="grid grid-cols-1 gap-5 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
        {kpiCards.map((kpi, index) => (
          <div
            key={index}
            className="group relative overflow-hidden rounded-xl border border-slate-200/50 dark:border-white/5 bg-gradient-to-br from-white to-slate-50 dark:from-slate-900/40 dark:to-slate-950/40 p-5 shadow-sm transition-all duration-300 hover:shadow-xl hover:border-slate-300 dark:hover:border-white/10 hover:-translate-y-1"
          >
            {/* Background accent glow */}
            <div className={`absolute -inset-px rounded-xl opacity-0 transition duration-300 group-hover:opacity-100 ${kpi.accent}`} style={{ backgroundImage: `linear-gradient(135deg, ${kpi.accent}, transparent)`, zIndex: -1 }} />
            
            {/* Top accent bar */}
            <div className={`absolute inset-x-0 top-0 h-1 bg-gradient-to-r ${kpi.accent}`}></div>
            
            <div className="flex items-start justify-between gap-4">
              <div className="flex-1">
                <p className="text-xs font-bold uppercase tracking-widest text-slate-600 dark:text-slate-400">{kpi.title}</p>
                <p className={`mt-3 text-3xl font-bold ${kpi.valueColor}`}>{kpi.value}</p>
                {kpi.subtitle && (
                  <p className="mt-2 text-xs font-medium text-slate-600 dark:text-slate-400">{kpi.subtitle}</p>
                )}
              </div>
              <div className={`rounded-2xl bg-gradient-to-br ${kpi.lightGradient} dark:from-white/5 dark:to-transparent border border-slate-200/50 dark:border-white/10 p-4 shadow-sm`}>
                <kpi.icon className={`h-8 w-8 ${kpi.iconColor}`} />
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Advanced Analytics Grid */}
      <div className="space-y-6">
        {/* Row 1: Sales Trend & Revenue vs Profit */}
        <div className="grid grid-cols-1 gap-6 xl:grid-cols-2">
          {/* Sales Trend */}
          <div className="card text-slate-900 dark:text-slate-100">
            <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <h2 className="text-xl font-bold text-slate-900 dark:text-slate-100">Trend Analysis</h2>
                <p className="mt-2 text-sm text-slate-600 dark:text-slate-400">
                  Current vs previous period {performanceMetricLabel}
                </p>
              </div>
              <div className="rounded-xl border border-sky-500/30 bg-gradient-to-br from-sky-50 to-blue-50 dark:from-sky-500/10 dark:to-blue-500/5 px-5 py-3 text-sm">
                <div className="font-bold text-sky-900 dark:text-sky-100">
                  {performanceMetric === 'orders' ? currentTotal.toLocaleString('en-IN') : formatCurrency(currentTotal)}
                </div>
                <div className={`mt-2 text-xs font-semibold ${delta >= 0 ? 'text-emerald-600 dark:text-emerald-300' : 'text-rose-600 dark:text-rose-300'}`}>
                  {delta >= 0 ? '↑' : '↓'} {performanceMetric === 'orders' ? delta.toLocaleString('en-IN') : formatCurrency(Math.abs(delta))} ({Math.abs(deltaPct).toFixed(1)}%)
                </div>
              </div>
            </div>
            <div>
              {!analytics?.sales_trend?.length ? (
                <div className="flex items-center justify-center rounded-lg bg-slate-50 dark:bg-white/5 py-16">
                  <p className="text-slate-600 dark:text-slate-400 text-sm">No sales data available</p>
                </div>
              ) : (
                <div className="w-full rounded-lg bg-slate-50/50 dark:bg-white/5 p-4">
                  <div className="h-[360px]">
                    <Line data={salesTrendData} options={salesTrendOptions} />
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Revenue vs Profit */}
          <div className="card text-slate-900 dark:text-slate-100">
            <div className="mb-6">
              <h2 className="text-xl font-bold text-slate-900 dark:text-slate-100">Revenue vs Profit Analysis</h2>
              <p className="mt-2 text-sm text-slate-600 dark:text-slate-400">Margin efficiency with profit trends</p>
            </div>
            <div>
              {!analytics?.sales_trend?.length ? (
                <div className="flex items-center justify-center rounded-lg bg-slate-50 dark:bg-white/5 py-16">
                  <p className="text-slate-600 dark:text-slate-400 text-sm">No comparison data available</p>
                </div>
              ) : (
                <div className="w-full rounded-lg bg-slate-50/50 dark:bg-white/5 p-4">
                  <div className="h-[360px]">
                    <Chart type="bar" data={revenueVsProfitData} options={revenueVsProfitOptions} />
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Row 2: Shop Performance & Top Products */}
        <div className="grid grid-cols-1 gap-6 xl:grid-cols-2">
          {/* Shop Performance */}
          <div className="card text-slate-900 dark:text-slate-100">
            <div className="mb-6">
              <h2 className="text-xl font-bold text-slate-900 dark:text-slate-100">Shop Performance</h2>
              <p className="mt-2 text-sm text-slate-600 dark:text-slate-400">{performanceMetricLabel} by location</p>
            </div>
            <div>
              {!analytics?.shop_sales?.length ? (
                <div className="flex items-center justify-center rounded-lg bg-slate-50 dark:bg-white/5 py-16">
                  <p className="text-slate-600 dark:text-slate-400 text-sm">No shop data available</p>
                </div>
              ) : (
                <div className="w-full rounded-lg bg-slate-50/50 dark:bg-white/5 p-4">
                  <div className="h-[360px]">
                    <Bar data={shopPerformanceData} options={shopPerformanceOptions} />
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Top Products */}
          <div className="card text-slate-900 dark:text-slate-100">
            <div className="mb-6">
              <h2 className="text-xl font-bold text-slate-900 dark:text-slate-100">Top Products by {performanceMetricLabel}</h2>
              <p className="mt-2 text-sm text-slate-600 dark:text-slate-400">Best selling items by {performanceMetricLabel.toLowerCase()}</p>
            </div>
            <div>
              {!analytics?.top_products?.length ? (
                <div className="flex items-center justify-center rounded-lg bg-slate-50 dark:bg-white/5 py-16">
                  <p className="text-slate-600 dark:text-slate-400 text-sm">No product data available</p>
                </div>
              ) : (
                <div className="w-full rounded-lg bg-slate-50/50 dark:bg-white/5 p-4">
                  <div className="h-[360px]">
                    <Bar data={topProductsData} options={topProductsOptions} />
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Row 3: Payment Methods & Condition Analysis */}
        <div className="grid grid-cols-1 gap-6 xl:grid-cols-2">
          {/* Payment Methods */}
          <div className="card text-slate-900 dark:text-slate-100">
            <div className="mb-6">
              <h2 className="text-xl font-bold text-slate-900 dark:text-slate-100">Payment Methods Distribution</h2>
              <p className="mt-2 text-sm text-slate-600 dark:text-slate-400">Customer transactions by payment method</p>
            </div>
            <div>
              {!analytics?.payment_methods?.length ? (
                <div className="flex items-center justify-center rounded-lg bg-slate-50 dark:bg-white/5 py-16">
                  <p className="text-slate-600 dark:text-slate-400 text-sm">No payment data available</p>
                </div>
              ) : (
                <div className="w-full rounded-lg bg-slate-50/50 dark:bg-white/5 p-4 flex justify-center">
                  <div className="h-[360px] w-full">
                    <Doughnut data={paymentMethodsData} options={paymentMethodsOptions} />
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Condition Breakdown */}
          <div className="card text-slate-900 dark:text-slate-100">
            <div className="mb-3">
              <h2 className="text-lg font-bold text-slate-900 dark:text-slate-100">Condition Analysis</h2>
              <p className="text-xs text-slate-600 dark:text-slate-400 mt-1">{performanceMetricLabel} breakdown by product condition</p>
            </div>
            <div className="mt-2">
              {!advancedAnalytics?.breakdowns?.by_condition?.length ? (
                <div className="text-center py-12 bg-slate-50 dark:bg-transparent rounded-lg">
                  <p className="text-slate-600 dark:text-slate-400 text-sm">No condition data</p>
                </div>
              ) : (
                <div className="w-full rounded-lg bg-white/5 p-3 flex justify-center">
                  <div className="h-[360px] w-full">
                    <PolarArea
                      data={{
                        labels: advancedAnalytics.breakdowns.by_condition.map((item) => item.condition),
                        datasets: [
                          {
                            label: performanceMetricLabel,
                            data: advancedAnalytics.breakdowns.by_condition.map((item) => {
                              if (performanceMetric === 'orders') return item.units_sold;
                              if (performanceMetric === 'profit') return item.profit;
                              return item.revenue;
                            }),
                            backgroundColor: [
                              'rgba(59,130,246,0.7)',
                              'rgba(16,185,129,0.7)',
                              'rgba(245,158,11,0.7)',
                              'rgba(239,68,68,0.7)',
                              'rgba(139,92,246,0.7)',
                              'rgba(236,72,153,0.7)'
                            ],
                            borderColor: ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899'],
                            borderWidth: 2,
                          },
                        ],
                      }}
                      options={{
                        responsive: true,
                        maintainAspectRatio: false,
                        plugins: {
                          legend: {
                            labels: { color: chartText },
                            position: 'bottom' as const,
                          },
                          tooltip: {
                            backgroundColor: chartTooltipBg,
                            titleColor: chartText,
                            bodyColor: chartText,
                            borderColor: chartGrid,
                            borderWidth: 1,
                            callbacks: {
                              label: function (context: any) {
                                const label = context.label || '';
                                const value = context.parsed.r;
                                const formattedValue = performanceMetric === 'orders'
                                  ? value.toLocaleString('en-IN')
                                  : formatCurrency(value);
                                return `${label}: ${formattedValue}`;
                              }
                            }
                          },
                          datalabels: {
                            color: isDark ? '#fff' : '#1e293b',
                            font: {
                              weight: 'bold' as const,
                              size: 13,
                            },
                            formatter: (value: number, context: any) => {
                              const dataset = context.chart.data.datasets[0];
                              const total = (dataset.data as number[]).reduce((acc: number, val: number) => acc + val, 0);
                              const percentage = ((value / total) * 100).toFixed(1);
                              return `${percentage}%`;
                            },
                          },
                        },
                        scales: {
                          r: {
                            ticks: {
                              color: chartText,
                              backdropColor: 'transparent',
                            },
                            grid: {
                              color: 'rgba(148, 163, 184, 0.2)',
                            },
                          },
                        },
                      } as any}
                    />
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Row 4: Category & Brand Analysis (2 Columns) */}
        <div className="grid grid-cols-1 xl:grid-cols-2 gap-5">
          {/* Category Breakdown */}
          <div className="card text-slate-900 dark:text-slate-100">
            <div className="mb-3">
              <h2 className="text-lg font-bold text-slate-900 dark:text-slate-100">Category Analysis</h2>
              <p className="text-xs text-slate-600 dark:text-slate-400 mt-1">{performanceMetricLabel} breakdown by product category</p>
            </div>
            <div className="mt-2">
              {!advancedAnalytics?.breakdowns?.by_category?.length ? (
                <div className="text-center py-12 bg-slate-50 dark:bg-transparent rounded-lg">
                  <p className="text-slate-600 dark:text-slate-400 text-sm">No category data</p>
                </div>
              ) : (
                <div className="w-full rounded-lg bg-slate-50 dark:bg-transparent p-3">
                  <div className="h-[360px]">
                    <Bar
                      data={{
                        labels: advancedAnalytics.breakdowns.by_category.map((item) => item.category_name || 'Unknown'),
                        datasets: [
                          {
                            label: performanceMetricLabel,
                            data: advancedAnalytics.breakdowns.by_category.map((item) => {
                              if (performanceMetric === 'orders') return item.units_sold;
                              if (performanceMetric === 'profit') return item.profit;
                              return item.revenue;
                            }),
                            backgroundColor: 'rgba(59,130,246,0.6)',
                            datalabels: {
                              anchor: 'end' as const,
                              align: 'end' as const,
                              offset: 6,
                              formatter: (value: number) => formatPerformanceValue(value),
                            },
                          } as any,
                        ],
                      }}
                      options={{
                        responsive: true,
                        maintainAspectRatio: false,
                        plugins: {
                          legend: { labels: { color: chartText } },
                          tooltip: {
                            backgroundColor: chartTooltipBg,
                            titleColor: chartText,
                            bodyColor: chartText,
                            borderColor: chartGrid,
                            borderWidth: 1,
                          },
                          datalabels: { display: false }, // Disable - using inlineDataLabels instead
                        },
                        scales: {
                          x: {
                            ticks: { color: chartText },
                            grid: {
                              display: false,
                              drawBorder: true,
                              borderColor: 'rgba(148, 163, 184, 0.5)',
                              borderWidth: 2,
                            },
                          },
                          y: {
                            ticks: {
                              color: chartText,
                              callback: (value: number | string) => (
                                performanceMetric === 'orders'
                                  ? Number(value).toLocaleString('en-IN')
                                  : formatAxisCurrency(value)
                              ),
                            },
                            grid: {
                              display: false,
                              drawBorder: true,
                              borderColor: 'rgba(148, 163, 184, 0.5)',
                              borderWidth: 2,
                            },
                          },
                        },
                      } as any}
                    />
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Brand Breakdown */}
          <div className="card text-slate-900 dark:text-slate-100">
            <div className="mb-3">
              <h2 className="text-lg font-bold text-slate-900 dark:text-slate-100">Brand Analysis</h2>
              <p className="text-xs text-slate-600 dark:text-slate-400 mt-1">{performanceMetricLabel} breakdown by brand</p>
            </div>
            <div className="mt-2">
              {!advancedAnalytics?.breakdowns?.by_brand?.length ? (
                <div className="text-center py-12 bg-slate-50 dark:bg-transparent rounded-lg">
                  <p className="text-slate-600 dark:text-slate-400 text-sm">No brand data</p>
                </div>
              ) : (
                <div className="w-full rounded-lg bg-slate-50 dark:bg-transparent p-3">
                  <div className="h-[360px]">
                    <Bar
                      data={{
                        labels: advancedAnalytics.breakdowns.by_brand.map((item) => item.brand_name || 'Unknown'),
                        datasets: [
                          {
                            label: performanceMetricLabel,
                            data: advancedAnalytics.breakdowns.by_brand.map((item) => {
                              if (performanceMetric === 'orders') return item.units_sold;
                              if (performanceMetric === 'profit') return item.profit;
                              return item.revenue;
                            }),
                            backgroundColor: 'rgba(16,185,129,0.6)',
                            datalabels: {
                              anchor: 'end' as const,
                              align: 'right' as const,
                              offset: 6,
                              formatter: (value: number) => formatPerformanceValue(value),
                            },
                          } as any,
                        ],
                      }}
                      options={{
                        responsive: true,
                        maintainAspectRatio: false,
                        indexAxis: 'y' as const,
                        plugins: {
                          legend: { labels: { color: chartText } },
                          tooltip: {
                            backgroundColor: chartTooltipBg,
                            titleColor: chartText,
                            bodyColor: chartText,
                            borderColor: chartGrid,
                            borderWidth: 1,
                          },
                          datalabels: { display: false }, // Disable - using inlineDataLabels instead
                        },
                        scales: {
                          x: {
                            ticks: {
                              color: chartText,
                              callback: (value: number | string) => (
                                performanceMetric === 'orders'
                                  ? Number(value).toLocaleString('en-IN')
                                  : formatAxisCurrency(value)
                              ),
                            },
                            grid: {
                              display: false,
                              drawBorder: true,
                              borderColor: 'rgba(148, 163, 184, 0.5)',
                              borderWidth: 2,
                            },
                          },
                          y: {
                            ticks: { color: chartText },
                            grid: {
                              display: false,
                              drawBorder: true,
                              borderColor: 'rgba(148, 163, 184, 0.5)',
                              borderWidth: 2,
                            },
                          },
                        },
                      } as any}
                    />
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Additional Analytics Tables */}
      <div className="grid grid-cols-1 xl:grid-cols-2 gap-5 mt-5">
        {/* Top Products Table */}
        <div className="card text-slate-900 dark:text-slate-100">
          <div className="mb-3">
            <h2 className="text-lg font-bold text-slate-900 dark:text-slate-100">Top Products Snapshot</h2>
            <p className="text-xs text-slate-600 dark:text-slate-400 mt-1">Quick overview of top performers by {performanceMetricLabel.toLowerCase()}</p>
          </div>
          <div className="mt-3 overflow-x-auto">
            {analytics?.top_products?.length ? (
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b-2 border-slate-200 dark:border-white/10">
                    <th className="pb-2 text-left text-xs font-bold text-slate-900 dark:text-slate-200">Product</th>
                    <th className="pb-2 text-right text-xs font-bold text-slate-900 dark:text-slate-200">
                      {performanceMetric === 'orders' ? 'Units' : performanceMetricLabel}
                    </th>
                  </tr>
                </thead>
                <tbody className="text-slate-900 dark:text-slate-200">
                  {analytics.top_products.slice(0, 5).map((product, idx) => (
                    <tr key={product.stock_batch__product__name} className="border-b border-slate-200 dark:border-white/10 hover:bg-slate-50 dark:hover:bg-white/5 transition-colors">
                      <td className="py-2.5 font-medium text-xs">
                        <div className="flex items-center gap-2">
                          <span className="inline-flex items-center justify-center w-5 h-5 rounded-full border border-emerald-500/40 dark:border-emerald-400/30 bg-emerald-100 dark:bg-emerald-500/15 text-xs font-bold text-emerald-700 dark:text-emerald-200">
                            {idx + 1}
                          </span>
                          <span className="truncate">{product.stock_batch__product__name}</span>
                        </div>
                      </td>
                      <td className="py-2.5 text-right font-semibold text-sky-700 dark:text-sky-200">
                        {performanceMetric === 'orders'
                          ? product.quantity_sold
                          : performanceMetric === 'profit'
                            ? formatCurrency(product.profit)
                            : formatCurrency(product.revenue)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            ) : (
              <div className="text-center py-8 bg-slate-50 dark:bg-transparent rounded-lg">
                <p className="text-slate-600 dark:text-slate-400 text-sm">No product performance available</p>
              </div>
            )}
          </div>
        </div>

        {/* Shop Sales Summary Table */}
        <div className="card text-slate-900 dark:text-slate-100">
          <div className="mb-3">
            <h2 className="text-lg font-bold text-slate-900 dark:text-slate-100">Shop Sales Summary</h2>
            <p className="text-xs text-slate-600 dark:text-slate-400 mt-1">Store-wise performance breakdown by {performanceMetricLabel.toLowerCase()}</p>
          </div>
          <div className="mt-3 overflow-x-auto">
            {analytics?.shop_sales?.length ? (
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b-2 border-slate-200 dark:border-white/10">
                    <th className="pb-2 text-left text-xs font-bold text-slate-900 dark:text-slate-200">Shop</th>
                    <th className="pb-2 text-right text-xs font-bold text-slate-900 dark:text-slate-200">
                      {performanceMetric === 'orders' ? 'Sales' : performanceMetricLabel}
                    </th>
                  </tr>
                </thead>
                <tbody className="text-slate-900 dark:text-slate-200">
                  {analytics.shop_sales.slice(0, 5).map((shop, idx) => (
                    <tr key={shop.shop__name} className="border-b border-slate-200 dark:border-white/10 hover:bg-slate-50 dark:hover:bg-white/5 transition-colors">
                      <td className="py-2.5 font-medium text-xs">
                        <div className="flex items-center gap-2">
                          <span className="inline-flex items-center justify-center w-5 h-5 rounded-full border border-sky-500/40 dark:border-sky-400/30 bg-sky-100 dark:bg-sky-500/15 text-xs font-bold text-sky-700 dark:text-sky-200">
                            {idx + 1}
                          </span>
                          <span className="truncate">{shop.shop__name}</span>
                        </div>
                      </td>
                      <td className="py-2.5 text-right font-semibold text-sky-700 dark:text-sky-200">
                        {performanceMetric === 'orders'
                          ? shop.sales_count
                          : performanceMetric === 'profit'
                            ? formatCurrency(shop.profit)
                            : formatCurrency(shop.revenue)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            ) : (
              <div className="text-center py-8 bg-slate-50 dark:bg-transparent rounded-lg">
                <p className="text-slate-600 dark:text-slate-400 text-sm">No shop sales data available</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}






