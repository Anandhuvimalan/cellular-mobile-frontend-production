'use client';

import { create } from 'zustand';
import {
    categoriesAPI,
    brandsAPI,
    variantsAPI,
    colorsAPI,
    conditionsAPI,
    sourcesAPI,
    shopsAPI,
    productsAPI,
    stockBatchesAPI,
    customersAPI,
    dashboardAPI,
    subStocksAPI,
} from '@/lib/api';
import type {
    Category,
    Brand,
    Variant,
    Color,
    Condition,
    Source,
    Shop,
    Product,
    StockBatch,
    Customer,
    DashboardStats,
    SubStock,
    User,
} from '@/types';

export type PreloadStatus = 'idle' | 'loading' | 'complete' | 'error';

export interface PreloadStep {
    id: string;
    label: string;
    status: 'pending' | 'loading' | 'complete' | 'error';
}

interface DataStoreState {
    // Preload state
    preloadStatus: PreloadStatus;
    preloadProgress: number;
    preloadError: string | null;
    preloadSteps: PreloadStep[];
    isPreloaded: boolean;

    // Cached data
    categories: Category[];
    brands: Brand[];
    variants: Variant[];
    colors: Color[];
    conditions: Condition[];
    sources: Source[];
    shops: Shop[];
    products: Product[];
    stockBatches: StockBatch[];
    customers: Customer[];
    subStocks: SubStock[];
    dashboardStats: DashboardStats | null;

    // Actions
    preloadAll: (user: User) => Promise<void>;
    resetPreload: () => void;
    refreshData: (key: keyof Pick<DataStoreState, 'categories' | 'brands' | 'variants' | 'colors' | 'conditions' | 'sources' | 'shops' | 'products' | 'stockBatches' | 'customers' | 'subStocks'>) => Promise<void>;
}

const createInitialSteps = (user: User): PreloadStep[] => {
    const steps: PreloadStep[] = [
        { id: 'categories', label: 'Loading categories...', status: 'pending' },
        { id: 'brands', label: 'Loading brands...', status: 'pending' },
        { id: 'variants', label: 'Loading variants...', status: 'pending' },
        { id: 'colors', label: 'Loading colors...', status: 'pending' },
        { id: 'conditions', label: 'Loading conditions...', status: 'pending' },
        { id: 'sources', label: 'Loading sources...', status: 'pending' },
    ];

    // Role-based steps
    if (['super_admin'].includes(user.role)) {
        steps.push({ id: 'shops', label: 'Loading shops...', status: 'pending' });
    }

    steps.push({ id: 'products', label: 'Loading products...', status: 'pending' });

    if (['super_admin', 'main_inventory_manager'].includes(user.role)) {
        steps.push({ id: 'stockBatches', label: 'Loading stock batches...', status: 'pending' });
    }

    if (['super_admin', 'admin', 'main_inventory_manager', 'sub_stock_manager'].includes(user.role)) {
        steps.push({ id: 'customers', label: 'Loading customers...', status: 'pending' });
    }

    if (['super_admin', 'main_inventory_manager', 'sub_stock_manager'].includes(user.role) && user.shop) {
        steps.push({ id: 'subStocks', label: 'Loading sub-stocks...', status: 'pending' });
    }

    steps.push({ id: 'dashboard', label: 'Loading dashboard...', status: 'pending' });

    return steps;
};

export const useDataStore = create<DataStoreState>((set, get) => ({
    // Initial state
    preloadStatus: 'idle',
    preloadProgress: 0,
    preloadError: null,
    preloadSteps: [],
    isPreloaded: false,

    categories: [],
    brands: [],
    variants: [],
    colors: [],
    conditions: [],
    sources: [],
    shops: [],
    products: [],
    stockBatches: [],
    customers: [],
    subStocks: [],
    dashboardStats: null,

    preloadAll: async (user: User) => {
        console.log('[DataStore] preloadAll called for user:', user.username, user.role);

        const steps = createInitialSteps(user);
        const totalSteps = steps.length;
        let completedSteps = 0;

        console.log('[DataStore] Total steps to load:', totalSteps, steps.map(s => s.id));

        set({
            preloadStatus: 'loading',
            preloadProgress: 0,
            preloadError: null,
            preloadSteps: steps,
        });

        const updateStep = (stepId: string, status: PreloadStep['status']) => {
            console.log(`[DataStore] Step ${stepId} -> ${status}`);
            set((state) => ({
                preloadSteps: state.preloadSteps.map((s) =>
                    s.id === stepId ? { ...s, status } : s
                ),
            }));
        };

        const incrementProgress = () => {
            completedSteps++;
            const progress = Math.round((completedSteps / totalSteps) * 100);
            console.log(`[DataStore] Progress: ${progress}% (${completedSteps}/${totalSteps})`);
            set({ preloadProgress: progress });
        };

        try {
            // Load core data first (parallel)
            const coreLoaders = [
                { id: 'categories', loader: () => categoriesAPI.list() },
                { id: 'brands', loader: () => brandsAPI.list() },
                { id: 'variants', loader: () => variantsAPI.list() },
                { id: 'colors', loader: () => colorsAPI.list() },
                { id: 'conditions', loader: () => conditionsAPI.list() },
                { id: 'sources', loader: () => sourcesAPI.list() },
            ];

            // Execute core loaders in parallel
            for (const { id, loader } of coreLoaders) {
                updateStep(id, 'loading');
            }

            const coreResults = await Promise.allSettled(
                coreLoaders.map(({ loader }) => loader())
            );

            // Process core results
            coreLoaders.forEach(({ id }, index) => {
                const result = coreResults[index];
                if (result.status === 'fulfilled') {
                    const data = result.value.data;
                    set({ [id]: data } as any);
                    updateStep(id, 'complete');
                } else {
                    updateStep(id, 'error');
                    console.error(`Failed to load ${id}:`, result.reason);
                }
                incrementProgress();
            });

            // Load shops if super_admin
            if (['super_admin'].includes(user.role)) {
                updateStep('shops', 'loading');
                try {
                    const res = await shopsAPI.list();
                    set({ shops: res.data });
                    updateStep('shops', 'complete');
                } catch (e) {
                    updateStep('shops', 'error');
                    console.error('Failed to load shops:', e);
                }
                incrementProgress();
            }

            // Load products
            updateStep('products', 'loading');
            try {
                const res = await productsAPI.list();
                set({ products: res.data });
                updateStep('products', 'complete');
            } catch (e) {
                updateStep('products', 'error');
                console.error('Failed to load products:', e);
            }
            incrementProgress();

            // Load stock batches
            if (['super_admin', 'main_inventory_manager'].includes(user.role)) {
                updateStep('stockBatches', 'loading');
                try {
                    const res = await stockBatchesAPI.list();
                    set({ stockBatches: res.data });
                    updateStep('stockBatches', 'complete');
                } catch (e) {
                    updateStep('stockBatches', 'error');
                    console.error('Failed to load stock batches:', e);
                }
                incrementProgress();
            }

            // Load customers
            if (['super_admin', 'admin', 'main_inventory_manager', 'sub_stock_manager'].includes(user.role)) {
                updateStep('customers', 'loading');
                try {
                    const res = await customersAPI.list();
                    set({ customers: res.data });
                    updateStep('customers', 'complete');
                } catch (e) {
                    updateStep('customers', 'error');
                    console.error('Failed to load customers:', e);
                }
                incrementProgress();
            }

            // Load sub-stocks
            if (['super_admin', 'main_inventory_manager', 'sub_stock_manager'].includes(user.role) && user.shop) {
                updateStep('subStocks', 'loading');
                try {
                    const res = await subStocksAPI.list();
                    set({ subStocks: res.data });
                    updateStep('subStocks', 'complete');
                } catch (e) {
                    updateStep('subStocks', 'error');
                    console.error('Failed to load sub-stocks:', e);
                }
                incrementProgress();
            }

            // Load dashboard stats
            updateStep('dashboard', 'loading');
            try {
                const res = await dashboardAPI.stats();
                set({ dashboardStats: res.data });
                updateStep('dashboard', 'complete');
            } catch (e) {
                updateStep('dashboard', 'error');
                console.error('Failed to load dashboard stats:', e);
            }
            incrementProgress();

            set({ preloadStatus: 'complete', preloadProgress: 100, isPreloaded: true });

            // Store in sessionStorage to skip on refresh
            sessionStorage.setItem('app_preloaded', 'true');
        } catch (error: any) {
            set({
                preloadStatus: 'error',
                preloadError: error.message || 'Failed to preload data',
            });
        }
    },

    resetPreload: () => {
        sessionStorage.removeItem('app_preloaded');
        set({
            preloadStatus: 'idle',
            preloadProgress: 0,
            preloadError: null,
            preloadSteps: [],
            isPreloaded: false,
            categories: [],
            brands: [],
            variants: [],
            colors: [],
            conditions: [],
            sources: [],
            shops: [],
            products: [],
            stockBatches: [],
            customers: [],
            subStocks: [],
            dashboardStats: null,
        });
    },

    refreshData: async (key) => {
        const apiMap: Record<string, () => Promise<any>> = {
            categories: () => categoriesAPI.list(),
            brands: () => brandsAPI.list(),
            variants: () => variantsAPI.list(),
            colors: () => colorsAPI.list(),
            conditions: () => conditionsAPI.list(),
            sources: () => sourcesAPI.list(),
            shops: () => shopsAPI.list(),
            products: () => productsAPI.list(),
            stockBatches: () => stockBatchesAPI.list(),
            customers: () => customersAPI.list(),
            subStocks: () => subStocksAPI.list(),
        };

        const loader = apiMap[key];
        if (loader) {
            try {
                const res = await loader();
                set({ [key]: res.data } as any);
            } catch (e) {
                console.error(`Failed to refresh ${key}:`, e);
            }
        }
    },
}));
