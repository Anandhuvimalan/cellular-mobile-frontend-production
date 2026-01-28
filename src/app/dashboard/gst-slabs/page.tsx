'use client';

import { useEffect, useState } from 'react';
import { gstSlabsAPI } from '@/lib/api';
import type { GSTSlab } from '@/types';
import { FiPlus, FiAlertCircle } from 'react-icons/fi';
import { useAutoRefresh } from '@/hooks/useAutoRefresh';
import { formatDate } from '@/lib/date';
import FullScreenLoader from '@/components/FullScreenLoader';
import { HoverBorderGradient } from '@/components/ui/hover-border-gradient';
import { showToast } from '@/lib/toast';

export default function GSTSlabsPage() {
  const [gstSlabs, setGstSlabs] = useState<GSTSlab[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [loading, setLoading] = useState(true);

  const [formData, setFormData] = useState({
    rate: '',
    cgst: '',
    sgst: '',
    igst: '',
    effective_from: new Date().toISOString().split('T')[0],
    is_active: true,
  });

  useEffect(() => {
    fetchGstSlabs();
  }, []);

  const fetchGstSlabs = async () => {
    try {
      const response = await gstSlabsAPI.list();
      setGstSlabs(response.data);
    } catch (error) {
      console.error('Failed to fetch GST slabs:', error);
      setGstSlabs([]);
    } finally {
      setLoading(false);
    }
  };
  useAutoRefresh(fetchGstSlabs);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await gstSlabsAPI.create(formData);
      setShowForm(false);
      setFormData({
        rate: '',
        cgst: '',
        sgst: '',
        igst: '',
        effective_from: new Date().toISOString().split('T')[0],
        is_active: true,
      });
      fetchGstSlabs();
      showToast.success('GST Slab created successfully');
    } catch (error: any) {
      showToast.error(error.response?.data?.detail || 'Failed to create GST slab');
    }
  };

  if (loading) {
    return <FullScreenLoader label="Loading GST slabs" />;
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-3xl font-bold text-slate-900 dark:text-slate-100">GST Slabs</h1>
          <p className="text-slate-700 dark:text-slate-300">Manage GST tax slabs (Immutable)</p>
        </div>
        <HoverBorderGradient
          as="button"
          onClick={() => setShowForm(!showForm)}
          className="bg-white/90 dark:bg-transparent text-slate-900 dark:text-slate-100"
        >
          <FiPlus className="h-4 w-4" />
          {showForm ? 'Cancel' : 'Add GST Slab'}
        </HoverBorderGradient>
      </div>

      <div className="bg-yellow-100 border border-yellow-400 text-yellow-800 px-4 py-3 rounded mb-6 flex items-start">
        <FiAlertCircle className="mr-2 mt-1 flex-shrink-0" size={20} />
        <div>
          <p className="font-semibold">Important: GST Slabs are Immutable</p>
          <p className="text-sm">
            GST slabs cannot be edited or deleted once created. When GST rates change, create a new slab instead of modifying existing ones. This ensures historical transaction integrity.
          </p>
        </div>
      </div>

      {showForm && (
        <div className="rounded-2xl border border-slate-200/80 dark:border-white/10 bg-white/90 dark:bg-transparent p-6 text-slate-900 dark:text-slate-100 shadow-lg dark:shadow-[0_20px_60px_rgba(2,6,23,0.45)]">
          <h2 className="text-xl font-semibold mb-4">Create New GST Slab</h2>
          <form onSubmit={handleSubmit} className="grid grid-cols-2 gap-4">
            <div>
              <label htmlFor="rate" className="block text-sm font-medium mb-1">Total GST Rate (%) *</label>
              <input id="rate" name="rate"
                type="number"
                step="0.01"
                className="input"
                value={formData.rate}
                onChange={(e) => setFormData({ ...formData, rate: e.target.value })}
                required
                placeholder="e.g. 18.00"
              />
            </div>

            <div>
              <label htmlFor="cgst" className="block text-sm font-medium mb-1">CGST (%) *</label>
              <input id="cgst" name="cgst"
                type="number"
                step="0.01"
                className="input"
                value={formData.cgst}
                onChange={(e) => setFormData({ ...formData, cgst: e.target.value })}
                required
                placeholder="e.g. 9.00"
              />
            </div>

            <div>
              <label htmlFor="sgst" className="block text-sm font-medium mb-1">SGST (%) *</label>
              <input id="sgst" name="sgst"
                type="number"
                step="0.01"
                className="input"
                value={formData.sgst}
                onChange={(e) => setFormData({ ...formData, sgst: e.target.value })}
                required
                placeholder="e.g. 9.00"
              />
            </div>

            <div>
              <label htmlFor="igst" className="block text-sm font-medium mb-1">IGST (%) *</label>
              <input id="igst" name="igst"
                type="number"
                step="0.01"
                className="input"
                value={formData.igst}
                onChange={(e) => setFormData({ ...formData, igst: e.target.value })}
                required
                placeholder="e.g. 18.00"
              />
            </div>

            <div>
              <label htmlFor="effective_from" className="block text-sm font-medium mb-1">Effective From *</label>
              <input id="effective_from" name="effective_from"
                type="date"
                className="input"
                value={formData.effective_from}
                onChange={(e) => setFormData({ ...formData, effective_from: e.target.value })}
                required
              />
            </div>

            <div className="flex items-center">
              <input
                type="checkbox"
                id="is_active"
                checked={formData.is_active}
                onChange={(e) => setFormData({ ...formData, is_active: e.target.checked })}
                className="mr-2"
              />
              <label htmlFor="is_active" className="text-sm font-medium">
                Active
              </label>
            </div>

            <div className="col-span-2">
              <HoverBorderGradient
                as="button"
                type="submit"
                className="w-full justify-center bg-white/90 dark:bg-transparent text-slate-900 dark:text-slate-100"
              >
                Create GST Slab
              </HoverBorderGradient>
            </div>
          </form>
        </div>
      )}

      <div className="rounded-2xl border border-slate-200/80 dark:border-white/10 bg-white/90 dark:bg-transparent p-6 text-slate-900 dark:text-slate-100 shadow-lg dark:shadow-[0_20px_60px_rgba(2,6,23,0.45)]">
        <div className="overflow-x-auto scrollbar-hide rounded-2xl border border-slate-200/80 dark:border-white/10 bg-white dark:bg-transparent">
          <table className="table table-frost">
            <thead>
              <tr>
                <th>ID</th>
                <th>Total Rate</th>
                <th>CGST</th>
                <th>SGST</th>
                <th>IGST</th>
                <th>Effective From</th>
                <th>Status</th>
                <th>Created At</th>
              </tr>
            </thead>
            <tbody>
              {gstSlabs.map((slab) => (
                <tr key={slab.id}>
                  <td>{slab.id}</td>
                  <td className="font-medium">{slab.rate}%</td>
                  <td>{slab.cgst}%</td>
                  <td>{slab.sgst}%</td>
                  <td>{slab.igst}%</td>
                  <td>{formatDate(slab.effective_from)}</td>
                  <td>
                    {slab.is_active ? (
                      <span className="badge badge-success">Active</span>
                    ) : (
                      <span className="badge badge-danger">Inactive</span>
                    )}
                  </td>
                  <td>{formatDate(slab.created_at)}</td>
                </tr>
              ))}
            </tbody>
          </table>

          {gstSlabs.length === 0 && (
            <div className="text-center py-12 text-slate-600 dark:text-slate-400">
              No GST slabs found. Create your first GST slab to get started.
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
