'use client';

import { useEffect, useMemo, useState } from 'react';
import { companyProfileAPI, shopsAPI } from '@/lib/api';
import type { CompanyProfile, Shop } from '@/types';
import { useAuth } from '@/context/AuthContext';
import { showToast } from '@/lib/toast';
import FullScreenLoader from '@/components/FullScreenLoader';
import { FiUploadCloud, FiSave, FiRefreshCcw, FiImage, FiMail, FiPhone } from 'react-icons/fi';

const getMediaBase = () => {
  const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000/api';
  return apiUrl.replace(/\/api\/?$/, '');
};

const buildMediaUrl = (path?: string | null) => {
  if (!path) return '';
  if (path.startsWith('http')) return path;
  return `${getMediaBase()}${path}`;
};

export default function SettingsPage() {
  const { user } = useAuth();
  const isAdmin = user?.role === 'admin' || user?.role === 'super_admin';
  const [loading, setLoading] = useState(true);
  const [companyProfile, setCompanyProfile] = useState<CompanyProfile | null>(null);
  const [logoFile, setLogoFile] = useState<File | null>(null);
  const [logoPreview, setLogoPreview] = useState<string | null>(null);
  const [shops, setShops] = useState<Shop[]>([]);
  const [shopEdits, setShopEdits] = useState<Record<number, { phone: string; email: string }>>({});
  const [savingLogo, setSavingLogo] = useState(false);
  const [savingShopId, setSavingShopId] = useState<number | null>(null);

  useEffect(() => {
    if (!user) return;
    if (!isAdmin) {
      setLoading(false);
      return;
    }

    const fetchData = async () => {
      try {
        const [companyResponse, shopsResponse] = await Promise.all([
          companyProfileAPI.get(),
          shopsAPI.list(),
        ]);
        setCompanyProfile(companyResponse.data);
        setShops(shopsResponse.data);
        const initialEdits = Object.fromEntries(
          shopsResponse.data.map((shop) => [
            shop.id,
            { phone: shop.phone || '', email: shop.email || '' },
          ])
        );
        setShopEdits(initialEdits);
      } catch (error) {
        console.error('Failed to load settings:', error);
        showToast.error('Failed to load settings.');
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [isAdmin, user]);

  useEffect(() => {
    return () => {
      if (logoPreview) {
        URL.revokeObjectURL(logoPreview);
      }
    };
  }, [logoPreview]);

  const logoUrl = useMemo(() => {
    if (logoPreview) return logoPreview;
    return buildMediaUrl(companyProfile?.logo || null);
  }, [companyProfile?.logo, logoPreview]);

  const handleLogoChange = (file?: File) => {
    if (!file) return;
    setLogoFile(file);
    setLogoPreview(URL.createObjectURL(file));
  };

  const handleLogoSave = async () => {
    if (!logoFile) {
      showToast.info('Select a logo file first.');
      return;
    }

    setSavingLogo(true);
    try {
      const formData = new FormData();
      formData.append('logo', logoFile);
      const response = await companyProfileAPI.update(formData);
      setCompanyProfile(response.data);
      setLogoFile(null);
      setLogoPreview(null);
      showToast.success('Logo updated successfully.');
    } catch (error) {
      console.error('Failed to update logo:', error);
      showToast.error('Failed to update logo.');
    } finally {
      setSavingLogo(false);
    }
  };

  const updateShopField = (shopId: number, field: 'phone' | 'email', value: string) => {
    setShopEdits((prev) => ({
      ...prev,
      [shopId]: {
        ...prev[shopId],
        [field]: value,
      },
    }));
  };

  const handleShopSave = async (shop: Shop) => {
    const edits = shopEdits[shop.id];
    if (!edits) return;

    setSavingShopId(shop.id);
    try {
      await shopsAPI.update(shop.id, {
        phone: edits.phone || null,
        email: edits.email || null,
      });
      showToast.success(`${shop.name} updated.`);
    } catch (error) {
      console.error('Failed to update shop:', error);
      showToast.error(`Failed to update ${shop.name}.`);
    } finally {
      setSavingShopId(null);
    }
  };

  if (loading) {
    return <FullScreenLoader label="Loading settings" />;
  }

  if (!isAdmin) {
    return (
      <div className="text-center py-16">
        <h2 className="text-2xl font-semibold text-slate-900 dark:text-slate-100">Admin settings only</h2>
        <p className="text-slate-600 dark:text-slate-400 mt-2">
          Contact your administrator to update company or shop settings.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <div className="relative overflow-hidden rounded-3xl border border-slate-200/70 dark:border-white/10 bg-gradient-to-br from-slate-50 via-white to-emerald-50 dark:from-slate-900 dark:via-slate-950 dark:to-slate-900 p-6 shadow-xl">
        <div className="absolute -left-24 -top-16 h-48 w-48 rounded-full bg-emerald-200/40 blur-3xl dark:bg-emerald-400/10" />
        <div className="absolute -right-16 -bottom-16 h-40 w-40 rounded-full bg-sky-200/40 blur-3xl dark:bg-sky-400/10" />
        <div className="relative">
          <p className="text-[11px] uppercase tracking-[0.35em] text-slate-500 dark:text-slate-400">Admin Settings</p>
          <h1 className="mt-2 text-3xl font-semibold text-slate-900 dark:text-slate-100">Brand + Shop Controls</h1>
          <p className="mt-2 text-sm text-slate-700 dark:text-slate-300">
            Manage the logo and shop contact details used on customer bills.
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
        <div className="rounded-2xl border border-slate-200/80 dark:border-white/10 bg-white/90 dark:bg-slate-900/80 p-6 text-slate-900 dark:text-slate-100 shadow-lg">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-xl font-semibold">Company Logo</h2>
              <p className="text-sm text-slate-600 dark:text-slate-400">Shown on every invoice.</p>
            </div>
            <FiImage className="text-slate-500" />
          </div>

          <div className="mt-6 flex flex-col items-center gap-4">
            <div className="flex h-32 w-32 items-center justify-center rounded-2xl border border-dashed border-slate-300 dark:border-white/20 bg-slate-50 dark:bg-white/5">
              {logoUrl ? (
                <img src={logoUrl} alt="Company logo" className="h-24 w-24 object-contain" />
              ) : (
                <span className="text-xs text-slate-500 dark:text-slate-400">No logo</span>
              )}
            </div>

            <label className="inline-flex cursor-pointer items-center gap-2 rounded-xl border border-slate-200 dark:border-white/10 bg-white dark:bg-slate-900 px-4 py-2 text-sm font-medium text-slate-700 dark:text-slate-100 shadow-sm transition hover:-translate-y-0.5 hover:bg-slate-100 dark:hover:bg-white/10">
              <FiUploadCloud />
              <span>Select logo</span>
              <input
                type="file"
                accept="image/*"
                className="hidden"
                onChange={(event) => handleLogoChange(event.target.files?.[0])}
              />
            </label>

            <button
              onClick={handleLogoSave}
              disabled={!logoFile || savingLogo}
              className="inline-flex items-center gap-2 rounded-xl bg-emerald-600 px-4 py-2 text-sm font-semibold text-white shadow-lg transition hover:bg-emerald-700 disabled:cursor-not-allowed disabled:opacity-60"
            >
              <FiSave />
              {savingLogo ? 'Saving...' : 'Save logo'}
            </button>
          </div>
        </div>

        <div className="rounded-2xl border border-slate-200/80 dark:border-white/10 bg-white/90 dark:bg-slate-900/80 p-6 text-slate-900 dark:text-slate-100 shadow-lg">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-xl font-semibold">Shop Contact Details</h2>
              <p className="text-sm text-slate-600 dark:text-slate-400">Used on printed bills.</p>
            </div>
            <FiRefreshCcw className="text-slate-500" />
          </div>

          <div className="mt-5 space-y-4">
            {shops.map((shop) => (
              <div key={shop.id} className="rounded-xl border border-slate-200/80 dark:border-white/10 bg-slate-50 dark:bg-transparent p-4">
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <h3 className="text-base font-semibold text-slate-900 dark:text-slate-100">{shop.name}</h3>
                    <p className="text-xs text-slate-600 dark:text-slate-400">{shop.address}</p>
                  </div>
                  <button
                    onClick={() => handleShopSave(shop)}
                    disabled={savingShopId === shop.id}
                    className="inline-flex items-center gap-2 rounded-xl border border-slate-200 dark:border-white/10 bg-white dark:bg-slate-900 px-3 py-2 text-xs font-semibold text-slate-700 dark:text-slate-100 shadow-sm transition hover:-translate-y-0.5 hover:bg-slate-100 dark:hover:bg-white/10 disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    <FiSave />
                    {savingShopId === shop.id ? 'Saving...' : 'Save'}
                  </button>
                </div>

                <div className="mt-4 grid grid-cols-1 md:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-semibold text-slate-600 dark:text-slate-400 mb-1">Phone</label>
                    <div className="flex items-center gap-2 rounded-xl border border-slate-200 dark:border-white/10 bg-white dark:bg-slate-900 px-3 py-2">
                      <FiPhone className="text-slate-400" />
                      <input
                        type="text"
                        className="w-full bg-transparent text-sm focus:outline-none"
                        value={shopEdits[shop.id]?.phone || ''}
                        onChange={(event) => updateShopField(shop.id, 'phone', event.target.value)}
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-600 dark:text-slate-400 mb-1">Email</label>
                    <div className="flex items-center gap-2 rounded-xl border border-slate-200 dark:border-white/10 bg-white dark:bg-slate-900 px-3 py-2">
                      <FiMail className="text-slate-400" />
                      <input
                        type="email"
                        className="w-full bg-transparent text-sm focus:outline-none"
                        value={shopEdits[shop.id]?.email || ''}
                        onChange={(event) => updateShopField(shop.id, 'email', event.target.value)}
                      />
                    </div>
                  </div>
                </div>
              </div>
            ))}
            {shops.length === 0 && (
              <div className="text-sm text-slate-600 dark:text-slate-400">No shops found.</div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
