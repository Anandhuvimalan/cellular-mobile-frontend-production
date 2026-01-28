'use client';

import { useEffect, useState } from 'react';
import { useDataStore } from '@/stores/dataStore';
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
    SubStock,
} from '@/types';

/**
 * Hook that provides cached data from the Zustand store (preloaded on login).
 * Falls back to API fetch if store is empty.
 */
export function useCachedData() {
    const {
        isPreloaded,
        products: storeProducts,
        categories: storeCategories,
        brands: storeBrands,
        variants: storeVariants,
        colors: storeColors,
        conditions: storeConditions,
        sources: storeSources,
        shops: storeShops,
        stockBatches: storeStockBatches,
        customers: storeCustomers,
        subStocks: storeSubStocks,
        refreshData,
    } = useDataStore();

    const [products, setProducts] = useState<Product[]>(storeProducts);
    const [categories, setCategories] = useState<Category[]>(storeCategories);
    const [brands, setBrands] = useState<Brand[]>(storeBrands);
    const [variants, setVariants] = useState<Variant[]>(storeVariants);
    const [colors, setColors] = useState<Color[]>(storeColors);
    const [conditions, setConditions] = useState<Condition[]>(storeConditions);
    const [sources, setSources] = useState<Source[]>(storeSources);
    const [shops, setShops] = useState<Shop[]>(storeShops);
    const [stockBatches, setStockBatches] = useState<StockBatch[]>(storeStockBatches);
    const [customers, setCustomers] = useState<Customer[]>(storeCustomers);
    const [subStocks, setSubStocks] = useState<SubStock[]>(storeSubStocks);
    const [loading, setLoading] = useState(!isPreloaded);

    // Sync from store when it's preloaded
    useEffect(() => {
        if (isPreloaded) {
            setProducts(storeProducts);
            setCategories(storeCategories);
            setBrands(storeBrands);
            setVariants(storeVariants);
            setColors(storeColors);
            setConditions(storeConditions);
            setSources(storeSources);
            setShops(storeShops);
            setStockBatches(storeStockBatches);
            setCustomers(storeCustomers);
            setSubStocks(storeSubStocks);
            setLoading(false);
        }
    }, [
        isPreloaded,
        storeProducts,
        storeCategories,
        storeBrands,
        storeVariants,
        storeColors,
        storeConditions,
        storeSources,
        storeShops,
        storeStockBatches,
        storeCustomers,
        storeSubStocks,
    ]);

    // Fallback: fetch if store wasn't preloaded
    useEffect(() => {
        if (isPreloaded) return;

        const fetchAll = async () => {
            setLoading(true);
            try {
                const [
                    productsRes,
                    categoriesRes,
                    brandsRes,
                    variantsRes,
                    colorsRes,
                    conditionsRes,
                    sourcesRes,
                ] = await Promise.all([
                    productsAPI.list(),
                    categoriesAPI.list(),
                    brandsAPI.list(),
                    variantsAPI.list(),
                    colorsAPI.list(),
                    conditionsAPI.list(),
                    sourcesAPI.list(),
                ]);

                setProducts(productsRes.data);
                setCategories(categoriesRes.data);
                setBrands(brandsRes.data);
                setVariants(variantsRes.data);
                setColors(colorsRes.data);
                setConditions(conditionsRes.data);
                setSources(sourcesRes.data);
            } catch (error) {
                console.error('Failed to fetch data:', error);
            } finally {
                setLoading(false);
            }
        };

        fetchAll();
    }, [isPreloaded]);

    const refresh = async (key: 'products' | 'categories' | 'brands' | 'variants' | 'colors' | 'conditions' | 'sources' | 'shops' | 'stockBatches' | 'customers' | 'subStocks') => {
        await refreshData(key);
        // Re-sync local state from store
        const store = useDataStore.getState();
        const stateMap: Record<string, [any, React.Dispatch<React.SetStateAction<any>>]> = {
            products: [store.products, setProducts],
            categories: [store.categories, setCategories],
            brands: [store.brands, setBrands],
            variants: [store.variants, setVariants],
            colors: [store.colors, setColors],
            conditions: [store.conditions, setConditions],
            sources: [store.sources, setSources],
            shops: [store.shops, setShops],
            stockBatches: [store.stockBatches, setStockBatches],
            customers: [store.customers, setCustomers],
            subStocks: [store.subStocks, setSubStocks],
        };
        const [data, setter] = stateMap[key];
        setter(data);
    };

    return {
        products,
        categories,
        brands,
        variants,
        colors,
        conditions,
        sources,
        shops,
        stockBatches,
        customers,
        subStocks,
        loading,
        isPreloaded,
        refresh,
    };
}
