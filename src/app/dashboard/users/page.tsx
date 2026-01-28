'use client';

import { useEffect, useRef, useState } from 'react';
import { usersAPI, shopsAPI } from '@/lib/api';
import type { User, Shop } from '@/types';
import { FiPlus, FiEdit, FiTrash, FiUser } from 'react-icons/fi';
import TableSearchBar from '@/components/TableSearchBar';
import { useMultiSelect } from '@/hooks/useMultiSelect';
import BulkActionBar from '@/components/BulkActionBar';
import { useAutoRefresh } from '@/hooks/useAutoRefresh';
import FullScreenLoader from '@/components/FullScreenLoader';
import SearchableSelect from '@/components/SearchableSelect';
import { HoverBorderGradient } from '@/components/ui/hover-border-gradient';
import { showToast } from '@/lib/toast';

export default function UsersPage() {
  const [users, setUsers] = useState<User[]>([]);
  const [shops, setShops] = useState<Shop[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
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

  const [formData, setFormData] = useState({
    username: '',
    email: '',
    password: '',
    first_name: '',
    last_name: '',
    role: 'sub_stock_manager',
    phone: '',
    shop: '',
  });

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      const [usersRes, shopsRes] = await Promise.all([
        usersAPI.list(searchTerm),
        shopsAPI.list(),
      ]);
      setUsers(usersRes.data);
      setShops(shopsRes.data);
    } catch (error) {
      console.error('Failed to fetch data:', error);
      setUsers([]);
      setShops([]);
    } finally {
      setLoading(false);
    }
  };
  useAutoRefresh(fetchData);

  useEffect(() => {
    const timer = setTimeout(() => {
      fetchData();
    }, 300);
    return () => clearTimeout(timer);
  }, [searchTerm]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const submitData: any = {
        ...formData,
        shop: formData.shop ? parseInt(formData.shop) : null,
      };

      if (editingId) {
        if (!submitData.password) {
          delete submitData.password; // Don't update password unless specifically changing it
        }
        await usersAPI.update(editingId, submitData);
      } else {
        await usersAPI.create(submitData);
      }

      setShowForm(false);
      setEditingId(null);
      setFormData({
        username: '',
        email: '',
        password: '',
        first_name: '',
        last_name: '',
        role: 'sub_stock_manager',
        phone: '',
        shop: '',
      });
      fetchData();
    } catch (error: any) {
      showToast.error(error.response?.data?.detail || 'Failed to save user');
    }
  };

  const handleEdit = (user: User) => {
    setFormData({
      username: user.username,
      email: user.email,
      password: '', // Don't populate password
      first_name: user.first_name,
      last_name: user.last_name,
      role: user.role,
      phone: user.phone || '',
      shop: user.shop?.toString() || '',
    });
    setEditingId(user.id);
    setShowForm(true);
    setTimeout(() => {
      formRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }, 100);
  };

  const handleDelete = async (id: number) => {
    if (confirm('Are you sure you want to delete this user?')) {
      try {
        await usersAPI.delete(id);
        showToast.success('User deleted successfully!');
        removeSelection([id]);
        fetchData();
      } catch (error: any) {
        showToast.error(error.response?.data?.detail || 'Failed to delete user');
      }
    }
  };

  const handleBulkDelete = async () => {
    if (confirm(`Are you sure you want to delete ${selectedIds.length} user${selectedIds.length === 1 ? '' : 's'}?`)) {
      try {
        await usersAPI.bulkDelete(selectedIds);
        showToast.success('Users deleted successfully!');
        removeSelection(selectedIds);
        fetchData();
      } catch (error: any) {
        console.error('Bulk delete error:', error);
        showToast.error('Failed to delete some users. Check console for details.');
      }
    }
  };

  const handleCancel = () => {
    setShowForm(false);
    setEditingId(null);
    setFormData({
      username: '',
      email: '',
      password: '',
      first_name: '',
      last_name: '',
      role: 'sub_stock_manager',
      phone: '',
      shop: '',
    });
  };

  const getRoleBadgeColor = (role: string) => {
    switch (role) {
      case 'super_admin':
        return 'badge-danger';
      case 'admin':
        return 'badge-warning';
      case 'main_inventory_manager':
        return 'badge-info';
      case 'sub_stock_manager':
        return 'badge-success';
      default:
        return 'badge-info';
    }
  };

  const getRoleLabel = (role: string) => {
    return role.replace(/_/g, ' ').replace(/\b\w/g, (l) => l.toUpperCase());
  };

  if (loading) {
    return <FullScreenLoader label="Loading users" />;
  }

  const roleOptions = [
    { value: 'sub_stock_manager', label: 'Sub Stock Manager' },
    { value: 'main_inventory_manager', label: 'Main Inventory Manager' },
    { value: 'admin', label: 'Admin' },
    { value: 'super_admin', label: 'Super Admin' },
  ];

  const shopOptions = [
    { value: '', label: 'None' },
    ...shops.map((shop) => ({
      value: String(shop.id),
      label: `${shop.name} (${shop.code})`,
    })),
  ];

  return (
    <div className="space-y-6">
      <div className="section-header">        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <p className="text-[11px] uppercase tracking-[0.3em] text-slate-600 dark:text-slate-400">Access Control</p>
            <h1 className="text-3xl font-semibold text-slate-900 dark:text-slate-100">Users</h1>
            <p className="text-slate-700 dark:text-slate-300">Manage system users and roles</p>
          </div>
          <HoverBorderGradient
            as="button"
            onClick={() => setShowForm(!showForm)}
            className="bg-white/90 dark:bg-transparent text-slate-900 dark:text-slate-100"
          >
            <FiPlus className="h-4 w-4" />
            {showForm ? 'Cancel' : 'Add User'}
          </HoverBorderGradient>
        </div>
      </div>

      {showForm && (
        <div ref={formRef} className="rounded-2xl border border-slate-200/80 dark:border-white/10 bg-white/90 dark:bg-transparent p-6 text-slate-900 dark:text-slate-100 shadow-lg dark:shadow-[0_20px_60px_rgba(2,6,23,0.45)]">
          <h2 className="text-xl font-semibold mb-4">
            {editingId ? 'Edit User' : 'Create New User'}
          </h2>
          <form onSubmit={handleSubmit} className="grid grid-cols-2 gap-4">
            <div>
              <label htmlFor="username" className="block text-sm font-medium mb-1">Username *</label>
              <input id="username" name="username"
                type="text"
                className="input"
                value={formData.username}
                autoComplete="username"
                onChange={(e) => setFormData({ ...formData, username: e.target.value })}
                required
                disabled={!!editingId}
              />
            </div>

            <div>
              <label htmlFor="email" className="block text-sm font-medium mb-1">Email *</label>
              <input id="email" name="email"
                type="email"
                className="input"
                value={formData.email}
                autoComplete="email"
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                required
              />
            </div>

            <div>
              <label htmlFor="first_name" className="block text-sm font-medium mb-1">First Name *</label>
              <input id="first_name" name="first_name"
                type="text"
                className="input"
                value={formData.first_name}
                autoComplete="given-name"
                onChange={(e) => setFormData({ ...formData, first_name: e.target.value })}
                required
              />
            </div>

            <div>
              <label htmlFor="last_name" className="block text-sm font-medium mb-1">Last Name *</label>
              <input id="last_name" name="last_name"
                type="text"
                className="input"
                value={formData.last_name}
                autoComplete="family-name"
                onChange={(e) => setFormData({ ...formData, last_name: e.target.value })}
                required
              />
            </div>

            <div>
              <label htmlFor="password" className="block text-sm font-medium mb-1">
                Password {!editingId && '*'}
              </label>
              <input id="password" name="password"
                type="password"
                className="input"
                value={formData.password}
                autoComplete="new-password"
                onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                required={!editingId}
                minLength={8}
                placeholder={editingId ? 'Leave blank to keep current' : 'Min 8 characters'}
              />
            </div>

            <div>
              <label htmlFor="phone" className="block text-sm font-medium mb-1">Phone</label>
              <input id="phone" name="phone"
                type="tel"
                className="input"
                value={formData.phone}
                autoComplete="tel"
                onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
              />
            </div>

            <SearchableSelect
              label="Role"
              placeholder="Select role..."
              required
              value={formData.role}
              onChange={(value) => setFormData({ ...formData, role: String(value) })}
              options={roleOptions}
            />

            <SearchableSelect
              label="Assigned Shop"
              placeholder="Select shop..."
              value={formData.shop}
              onChange={(value) => setFormData({ ...formData, shop: String(value) })}
              options={shopOptions}
            />

            <div className="col-span-2 flex space-x-3">
              <HoverBorderGradient
                as="button"
                type="submit"
                className="bg-white/90 dark:bg-transparent text-slate-900 dark:text-slate-100"
              >
                {editingId ? 'Update' : 'Create'} User
              </HoverBorderGradient>
              <button type="button" onClick={handleCancel} className="btn btn-outline">
                Cancel
              </button>
            </div>
          </form>
        </div>
      )}

      <div className="rounded-2xl border border-slate-200/80 dark:border-white/10 bg-white/90 dark:bg-transparent p-6 text-slate-900 dark:text-slate-100 shadow-lg dark:shadow-[0_20px_60px_rgba(2,6,23,0.45)]">
        <div className="mb-4">
          <TableSearchBar
            onSearch={setSearchTerm}
            placeholder="Search users by name, username, email..."
            className="rounded-2xl border border-slate-200/80 dark:border-white/10 bg-slate-50 dark:bg-transparent p-4"
          />
        </div>
        <div className="overflow-x-auto scrollbar-hide rounded-2xl border border-slate-200/80 dark:border-white/10 bg-white dark:bg-transparent">
          <table className="table table-frost">
            <thead>
              <tr>
                <th className="w-12">
                  <input name="rowSelect"
                    type="checkbox"
                    checked={isAllSelected(users.map(u => u.id))}
                    onChange={() => toggleSelectAll(users.map(u => u.id))}
                  />
                </th>
                <th>ID</th>
                <th>Name</th>
                <th>Username</th>
                <th>Email</th>
                <th>Role</th>
                <th>Shop</th>
                <th>Status</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {users.map((user) => (
                <tr key={user.id} className={isSelected(user.id) ? 'bg-slate-50 dark:bg-transparent' : ''}>
                  <td>
                    <input name="rowSelect"
                      type="checkbox"
                      checked={isSelected(user.id)}
                      onChange={() => toggleSelect(user.id)}
                    />
                  </td>
                  <td>{user.id}</td>
                  <td className="font-medium">
                    {user.first_name} {user.last_name}
                  </td>
                  <td>{user.username}</td>
                  <td>{user.email}</td>
                  <td>
                    <span className={`badge ${getRoleBadgeColor(user.role)}`}>
                      {getRoleLabel(user.role)}
                    </span>
                  </td>
                  <td>{user.shop_name || '-'}</td>
                  <td>
                    {user.is_active ? (
                      <span className="badge badge-success">Active</span>
                    ) : (
                      <span className="badge badge-danger">Inactive</span>
                    )}
                  </td>
                  <td>
                    <div className="flex flex-wrap gap-2">
                      <button
                        onClick={() => handleEdit(user)}
                        className="inline-flex items-center gap-2 rounded-full border border-sky-400 dark:border-sky-400/30 bg-sky-100 dark:bg-sky-500/15 px-3 py-1 text-xs font-semibold text-sky-700 dark:text-sky-200 transition hover:bg-sky-200 dark:hover:bg-sky-500/25"
                      >
                        <FiEdit size={14} />
                        Edit
                      </button>
                      <button
                        onClick={() => handleDelete(user.id)}
                        className="inline-flex items-center gap-2 rounded-full border border-rose-400 dark:border-rose-400/30 bg-rose-100 dark:bg-rose-500/15 px-3 py-1 text-xs font-semibold text-rose-700 dark:text-rose-200 transition hover:bg-rose-200 dark:hover:bg-rose-500/25"
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

          {users.length === 0 && (
            <div className="text-center py-12 text-slate-600 dark:text-slate-400">
              No users found.
            </div>
          )}
        </div>
      </div>

      <BulkActionBar
        selectedCount={selectedIds.length}
        onDelete={handleBulkDelete}
        onCancel={clearSelection}
      />
    </div>
  );
}
