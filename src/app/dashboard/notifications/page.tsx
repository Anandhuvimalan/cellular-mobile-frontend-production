'use client';

import { useEffect, useMemo, useState } from 'react';
import { notificationsAPI } from '@/lib/api';
import type { Notification } from '@/types';
import { FiBell, FiCheck, FiCheckCircle, FiAlertTriangle, FiX } from 'react-icons/fi';
import { useAutoRefresh } from '@/hooks/useAutoRefresh';
import { formatDateTime, formatTime } from '@/lib/date';
import FullScreenLoader from '@/components/FullScreenLoader';

export default function NotificationsPage() {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [filter, setFilter] = useState<'all' | 'unread' | 'read'>('all');
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);
  const [pageSize, setPageSize] = useState(12);

  useEffect(() => {
    fetchNotifications();
  }, []);

  const fetchNotifications = async () => {
    try {
      setRefreshing(true);
      const response = await notificationsAPI.list();
      setNotifications(response.data);
      setLastUpdated(new Date());
    } catch (error) {
      console.error('Failed to fetch notifications:', error);
      setNotifications([]);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };
  useAutoRefresh(fetchNotifications, { intervalMs: 20000 });

  const handleMarkRead = async (id: number) => {
    setNotifications((prev) =>
      prev.map((notif) => (notif.id === id ? { ...notif, is_read: true } : notif))
    );
    try {
      await notificationsAPI.markRead(id);
      setLastUpdated(new Date());
    } catch (error) {
      console.error('Failed to mark notification as read:', error);
      fetchNotifications();
    }
  };

  const handleMarkAllRead = async () => {
    setNotifications((prev) => prev.map((notif) => ({ ...notif, is_read: true })));
    try {
      await notificationsAPI.markAllRead();
      setLastUpdated(new Date());
    } catch (error) {
      console.error('Failed to mark all as read:', error);
      fetchNotifications();
    }
  };

  const getNotificationIcon = (type: string) => {
    switch (type) {
      case 'low_stock':
        return <FiAlertTriangle className="text-red-600" size={24} />;
      case 'stock_request':
        return <FiBell className="text-blue-600" size={24} />;
      case 'stock_approved':
        return <FiCheckCircle className="text-green-600" size={24} />;
      case 'stock_rejected':
        return <FiX className="text-red-600" size={24} />;
      default:
        return <FiBell className="text-slate-700 dark:text-slate-300" size={24} />;
    }
  };

  const getNotificationTypeLabel = (type: string) => {
    const labels: { [key: string]: string } = {
      low_stock: 'Low Stock Alert',
      stock_request: 'Stock Request',
      stock_approved: 'Request Approved',
      stock_rejected: 'Request Rejected',
    };
    return labels[type] || type;
  };

  const getNotificationTypeColor = (type: string) => {
    switch (type) {
      case 'low_stock':
        return 'badge-danger';
      case 'stock_request':
        return 'badge-info';
      case 'stock_approved':
        return 'badge-success';
      case 'stock_rejected':
        return 'badge-warning';
      default:
        return 'badge-info';
    }
  };

  const filteredNotifications = useMemo(() => notifications.filter((notif) => {
    if (filter === 'unread') return !notif.is_read;
    if (filter === 'read') return notif.is_read;
    return true;
  }), [notifications, filter]);

  const unreadCount = useMemo(
    () => notifications.filter((n) => !n.is_read).length,
    [notifications]
  );
  const visibleNotifications = useMemo(
    () => filteredNotifications.slice(0, pageSize),
    [filteredNotifications, pageSize]
  );

  const formatRelativeTime = (dateString: string) => {
    const now = Date.now();
    const then = new Date(dateString).getTime();
    const diffMs = Math.max(0, now - then);
    const seconds = Math.floor(diffMs / 1000);
    if (seconds < 60) return `${seconds}s ago`;
    const minutes = Math.floor(seconds / 60);
    if (minutes < 60) return `${minutes}m ago`;
    const hours = Math.floor(minutes / 60);
    if (hours < 24) return `${hours}h ago`;
    const days = Math.floor(hours / 24);
    return `${days}d ago`;
  };

  if (loading) {
    return <FullScreenLoader label="Loading notifications" />;
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 mb-6">
        <div>
          <h1 className="text-3xl font-bold text-slate-900 dark:text-slate-100">Notifications</h1>
          <p className="text-slate-700 dark:text-slate-300">
            {unreadCount} unread notification{unreadCount !== 1 ? 's' : ''}
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <button
            onClick={fetchNotifications}
            className="btn btn-outline flex items-center"
            disabled={refreshing}
          >
            {refreshing ? 'Refreshing...' : 'Refresh'}
          </button>
          {unreadCount > 0 && (
            <button
              onClick={handleMarkAllRead}
              className="btn btn-secondary flex items-center"
            >
              <FiCheck className="mr-2" />
              Mark All as Read
            </button>
          )}
          <span className="text-xs text-slate-600 dark:text-slate-400">
            Last updated: {lastUpdated ? formatTime(lastUpdated) : '-'}
          </span>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
        <div className="rounded-2xl border border-slate-200/80 dark:border-white/10 bg-white/90 dark:bg-transparent p-6 text-slate-900 dark:text-slate-100 shadow-lg dark:shadow-[0_20px_60px_rgba(2,6,23,0.45)]">
          <div className="text-sm text-slate-600 dark:text-slate-400">Total</div>
          <div className="text-2xl font-bold text-gray-900 dark:text-gray-100">{notifications.length}</div>
        </div>
        <div className="rounded-2xl border border-slate-200/80 dark:border-white/10 bg-white/90 dark:bg-transparent p-6 text-slate-900 dark:text-slate-100 shadow-lg dark:shadow-[0_20px_60px_rgba(2,6,23,0.45)]">
          <div className="text-sm text-slate-600 dark:text-slate-400">Unread</div>
          <div className="text-2xl font-bold text-blue-600">{unreadCount}</div>
        </div>
        <div className="rounded-2xl border border-slate-200/80 dark:border-white/10 bg-white/90 dark:bg-transparent p-6 text-slate-900 dark:text-slate-100 shadow-lg dark:shadow-[0_20px_60px_rgba(2,6,23,0.45)]">
          <div className="text-sm text-slate-600 dark:text-slate-400">Read</div>
          <div className="text-2xl font-bold text-gray-800 dark:text-gray-200">
            {notifications.length - unreadCount}
          </div>
        </div>
      </div>

      <div className="rounded-2xl border border-slate-200/80 dark:border-white/10 bg-white/90 dark:bg-transparent p-6 text-slate-900 dark:text-slate-100 shadow-lg dark:shadow-[0_20px_60px_rgba(2,6,23,0.45)]">
        <div className="flex flex-wrap gap-3">
          <button
            onClick={() => setFilter('all')}
            className={`px-4 py-2 rounded-lg font-medium transition-colors ${
              filter === 'all'
                ? 'bg-primary text-white'
                : 'bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-200 hover:bg-gray-200 dark:hover:bg-gray-700'
            }`}
          >
            All ({notifications.length})
          </button>
          <button
            onClick={() => setFilter('unread')}
            className={`px-4 py-2 rounded-lg font-medium transition-colors ${
              filter === 'unread'
                ? 'bg-primary text-white'
                : 'bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-200 hover:bg-gray-200 dark:hover:bg-gray-700'
            }`}
          >
            Unread ({unreadCount})
          </button>
          <button
            onClick={() => setFilter('read')}
            className={`px-4 py-2 rounded-lg font-medium transition-colors ${
              filter === 'read'
                ? 'bg-primary text-white'
                : 'bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-200 hover:bg-gray-200 dark:hover:bg-gray-700'
            }`}
          >
            Read ({notifications.length - unreadCount})
          </button>
        </div>
      </div>

      <div className="space-y-4">
        {visibleNotifications.map((notification) => (
          <div
            key={notification.id}
            className={`card ${!notification.is_read ? 'border-l-4 border-primary bg-slate-50 dark:bg-transparent' : ''}`}
          >
            <div className="flex items-start">
              <div className="mr-4 mt-1">{getNotificationIcon(notification.notification_type)}</div>

              <div className="flex-1">
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center space-x-3">
                    <h3 className="text-lg font-semibold">{notification.title}</h3>
                    <span className={`badge ${getNotificationTypeColor(notification.notification_type)}`}>
                      {getNotificationTypeLabel(notification.notification_type)}
                    </span>
                    {!notification.is_read && (
                      <span className="bg-primary text-white text-xs px-2 py-1 rounded">
                        NEW
                      </span>
                    )}
                  </div>
                  <span className="text-sm text-slate-600 dark:text-slate-400" title={formatDateTime(notification.created_at)}>
                    {formatRelativeTime(notification.created_at)}
                  </span>
                </div>

                <p className="text-gray-800 dark:text-gray-200 mb-3">{notification.message}</p>

                {notification.shop_name && (
                  <p className="text-sm text-slate-700 dark:text-slate-300 mb-3">
                    <strong>Shop:</strong> {notification.shop_name}
                  </p>
                )}

                <div className="flex justify-between items-center pt-3 border-t">
                  <div className="text-xs text-slate-600 dark:text-slate-400">
                    ID: #{notification.id}
                  </div>
                  {!notification.is_read && (
                    <button
                      onClick={() => handleMarkRead(notification.id)}
                      className="btn btn-outline text-sm py-1 px-3"
                    >
                      <FiCheck className="inline mr-1" />
                      Mark as Read
                    </button>
                  )}
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>

      {filteredNotifications.length === 0 && (
        <div className="card text-center py-12">
          <FiBell className="mx-auto mb-4 text-gray-600 dark:text-gray-400" size={48} />
          <p className="text-slate-600 dark:text-slate-400 text-lg">
            {filter === 'unread'
              ? 'No unread notifications'
              : filter === 'read'
              ? 'No read notifications'
              : 'No notifications yet'}
          </p>
        </div>
      )}

      {filteredNotifications.length > pageSize && (
        <div className="flex justify-center mt-6">
          <button
            onClick={() => setPageSize((prev) => prev + 12)}
            className="btn btn-outline"
          >
            Load more
          </button>
        </div>
      )}
    </div>
  );
}