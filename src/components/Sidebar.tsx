'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import {
  FiHome, FiPackage, FiShoppingCart, FiGrid, FiUsers,
  FiSettings, FiTrendingUp, FiTag, FiLayers, FiDatabase,
  FiShoppingBag, FiTruck, FiBell, FiDroplet, FiUserPlus,
  FiDollarSign, FiFileText, FiMenu, FiX, FiFilter, FiShuffle, FiArchive
} from 'react-icons/fi';
import { useEffect, useMemo, useState } from 'react';
import { createPortal } from 'react-dom';

export default function Sidebar() {
  const pathname = usePathname();
  const router = useRouter();
  const { user } = useAuth();
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [isMobileOpen, setIsMobileOpen] = useState(false);
  const [hoveredItem, setHoveredItem] = useState<{
    label: string;
    top: number;
    left: number;
  } | null>(null);
  const [tooltipRoot, setTooltipRoot] = useState<HTMLElement | null>(null);

  const menuItems = [
    { name: 'Dashboard', href: '/dashboard', icon: FiHome, roles: ['super_admin', 'admin', 'main_inventory_manager', 'sub_stock_manager'] },
    { name: 'Products', href: '/dashboard/products', icon: FiPackage, roles: ['super_admin', 'admin', 'main_inventory_manager', 'sub_stock_manager'] },
    { name: 'Categories', href: '/dashboard/categories', icon: FiGrid, roles: ['super_admin', 'admin', 'main_inventory_manager'] },
    { name: 'Brands', href: '/dashboard/brands', icon: FiTag, roles: ['super_admin', 'admin', 'main_inventory_manager'] },
    { name: 'Variants', href: '/dashboard/variants', icon: FiLayers, roles: ['super_admin', 'admin', 'main_inventory_manager'] },
    { name: 'Colors', href: '/dashboard/colors', icon: FiDroplet, roles: ['super_admin', 'admin', 'main_inventory_manager'] },
    { name: 'Conditions', href: '/dashboard/conditions', icon: FiFilter, roles: ['super_admin', 'admin', 'main_inventory_manager'] },
    { name: 'Sources', href: '/dashboard/sources', icon: FiShuffle, roles: ['super_admin', 'admin', 'main_inventory_manager'] },
    { name: 'GST Slabs', href: '/dashboard/gst-slabs', icon: FiTrendingUp, roles: ['super_admin'] },
    { name: 'Stock Batches', href: '/dashboard/stock-batches', icon: FiDatabase, roles: ['super_admin', 'main_inventory_manager'] },
    { name: 'Purchase Invoices', href: '/dashboard/purchase-invoices', icon: FiFileText, roles: ['super_admin', 'admin', 'main_inventory_manager'] },
    { name: 'Dead Stock', href: '/dashboard/dead-stock', icon: FiArchive, roles: ['super_admin', 'admin', 'main_inventory_manager', 'sub_stock_manager'] },
    { name: 'Shops', href: '/dashboard/shops', icon: FiShoppingBag, roles: ['super_admin'] },
    { name: 'Sub Stock', href: '/dashboard/sub-stocks', icon: FiShoppingCart, roles: ['super_admin', 'main_inventory_manager', 'sub_stock_manager'] },
    { name: 'Stock Requests', href: '/dashboard/stock-requests', icon: FiTruck, roles: ['super_admin', 'main_inventory_manager', 'sub_stock_manager'] },
    { name: 'Point of Sale', href: '/dashboard/pos', icon: FiDollarSign, roles: ['super_admin', 'main_inventory_manager', 'sub_stock_manager'] },
    { name: 'Sales History', href: '/dashboard/sales', icon: FiFileText, roles: ['super_admin', 'admin', 'main_inventory_manager', 'sub_stock_manager'] },
    { name: 'Customers', href: '/dashboard/customers', icon: FiUserPlus, roles: ['super_admin', 'admin', 'main_inventory_manager', 'sub_stock_manager'] },
    { name: 'Notifications', href: '/dashboard/notifications', icon: FiBell, roles: ['super_admin', 'admin', 'main_inventory_manager', 'sub_stock_manager'] },
    { name: 'Settings', href: '/dashboard/settings', icon: FiSettings, roles: ['super_admin', 'admin'] },
    { name: 'Users', href: '/dashboard/users', icon: FiUsers, roles: ['super_admin', 'admin'] },
  ];

  const normalizeRole = (role: unknown): string => {
    if (!role) return '';
    if (typeof role === 'string') {
      return role.trim().toLowerCase().replace(/\s+/g, '_');
    }
    if (typeof role === 'object') {
      const roleObj = role as { name?: string; value?: string; slug?: string };
      return normalizeRole(roleObj.value ?? roleObj.slug ?? roleObj.name ?? '');
    }
    return '';
  };

  // Defensive fallback: If user exists but role is undefined, assume super_admin for backwards compatibility
  const userRole = normalizeRole(user?.role) || (user?.username === 'admin' ? 'super_admin' : '');

  if (user && !user.role) {
    console.warn('User object missing role field:', user);
  }

  const filteredMenuItems = useMemo(() => {
    const items = menuItems.filter(item =>
      item.roles.includes(userRole) &&
      (item.name !== 'Point of Sale' || user?.shop)
    );

    if (items.length === 0 && user) {
      console.warn('Sidebar menu empty for role:', user.role);
      return menuItems.filter(item => item.name === 'Dashboard');
    }

    return items;
  }, [menuItems, userRole, user?.shop, user]);

  // Close mobile menu on route change
  useEffect(() => {
    setIsMobileOpen(false);
  }, [pathname]);

  // Prefetch routes
  useEffect(() => {
    if (!user || filteredMenuItems.length === 0) return;

    const hrefs = filteredMenuItems
      .map((item) => item.href)
      .filter((href) => href && href !== pathname);
    if (hrefs.length === 0) return;

    let cancelled = false;

    const schedulePrefetch = () => {
      hrefs.forEach((href, index) => {
        window.setTimeout(() => {
          if (cancelled) return;
          router.prefetch(href);
        }, index * 150);
      });
    };

    const idle = (window as Window & { requestIdleCallback?: (cb: () => void, opts?: { timeout: number }) => number }).requestIdleCallback;
    if (idle) {
      const idleId = idle(schedulePrefetch, { timeout: 2000 });
      return () => {
        cancelled = true;
        (window as Window & { cancelIdleCallback?: (id: number) => void }).cancelIdleCallback?.(idleId);
      };
    }

    const timeoutId = window.setTimeout(schedulePrefetch, 500);
    return () => {
      cancelled = true;
      window.clearTimeout(timeoutId);
    };
  }, [filteredMenuItems, pathname, router, user]);

  useEffect(() => {
    if (!isCollapsed) {
      setHoveredItem(null);
    }
  }, [isCollapsed]);

  useEffect(() => {
    if (typeof document !== 'undefined') {
      setTooltipRoot(document.body);
    }
  }, []);

  // Lock body scroll when mobile menu is open
  useEffect(() => {
    if (isMobileOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => {
      document.body.style.overflow = '';
    };
  }, [isMobileOpen]);

  const handleShowTooltip = (
    label: string,
    event: React.MouseEvent<HTMLElement> | React.FocusEvent<HTMLElement>
  ) => {
    if (!isCollapsed) return;
    const rect = event.currentTarget.getBoundingClientRect();
    setHoveredItem({
      label,
      top: rect.top + rect.height / 2,
      left: rect.right + 12,
    });
  };

  const handleHideTooltip = () => {
    setHoveredItem(null);
  };

  const groupedMenuItems = {
    main: filteredMenuItems.filter(item =>
      ['Dashboard', 'Point of Sale'].includes(item.name)
    ),
    products: filteredMenuItems.filter(item =>
      ['Products', 'Categories', 'Brands', 'Variants', 'Colors', 'Conditions', 'Sources', 'GST Slabs'].includes(item.name)
    ),
    inventory: filteredMenuItems.filter(item =>
      ['Stock Batches', 'Purchase Invoices', 'Dead Stock', 'Sub Stock', 'Stock Requests'].includes(item.name)
    ),
    sales: filteredMenuItems.filter(item =>
      ['Sales History', 'Customers'].includes(item.name)
    ),
    system: filteredMenuItems.filter(item =>
      ['Shops', 'Users', 'Notifications'].includes(item.name)
    ),
  };

  const renderMenuItem = (item: typeof filteredMenuItems[0], isMobile = false) => {
    const Icon = item.icon;
    const isActive = pathname === item.href;

    return (
      <Link
        key={item.name}
        href={item.href}
        onClick={() => isMobile && setIsMobileOpen(false)}
        className={`group relative flex items-center gap-3 rounded-xl px-3 py-2.5 transition-all duration-200 ${isActive
          ? 'bg-gradient-to-r from-sky-50 to-white dark:from-sky-900/20 dark:to-transparent text-sky-600 dark:text-sky-300 shadow-sm border border-sky-100 dark:border-sky-800/20'
          : 'text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-white/5 hover:text-slate-900 dark:hover:text-white border border-transparent'
          }`}
      >
        {isActive && (
          <span className="absolute left-0 top-1/2 h-6 w-1 -translate-y-1/2 rounded-r-full bg-sky-500 dark:bg-sky-400 shadow-[0_0_12px_rgba(14,165,233,0.6)]" />
        )}
        <Icon
          className={`flex-shrink-0 transition-colors duration-200 ${isActive
            ? 'text-sky-600 dark:text-sky-300'
            : 'text-slate-500 dark:text-slate-300 group-hover:text-sky-500 dark:group-hover:text-sky-300'
            }`}
          size={20}
        />
        <span className="text-sm font-medium leading-none tracking-wide">{item.name}</span>
      </Link>
    );
  };

  const renderMenuSection = (title: string, items: typeof filteredMenuItems, isMobile = false, showCollapsed = false) => {
    if (items.length === 0) return null;

    return (
      <div className="mb-4">
        {(!showCollapsed || !isCollapsed) && (
          <div className="px-3 py-2 text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-widest">
            {title}
          </div>
        )}
        <div className="space-y-1">
          {isMobile
            ? items.map((item) => renderMenuItem(item, true))
            : items.map((item) => {
              const Icon = item.icon;
              const isActive = pathname === item.href;
              return (
                <Link
                  key={item.name}
                  href={item.href}
                  className={`group relative mx-3 flex items-center gap-3 rounded-xl ${isCollapsed ? 'justify-center px-2' : 'px-3'
                    } py-2.5 transition-all duration-200 ${isActive
                      ? 'bg-gradient-to-r from-sky-50 to-white dark:from-sky-900/20 dark:to-transparent text-sky-600 dark:text-sky-300 shadow-sm border border-sky-100 dark:border-sky-800/20'
                      : 'text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-white/5 hover:text-slate-900 dark:hover:text-white border border-transparent'
                    }`}
                  aria-label={isCollapsed ? item.name : undefined}
                  onMouseEnter={(event) => handleShowTooltip(item.name, event)}
                  onMouseLeave={handleHideTooltip}
                  onFocus={(event) => handleShowTooltip(item.name, event)}
                  onBlur={handleHideTooltip}
                >
                  {isActive && (
                    <span className="absolute left-0 top-1/2 h-6 w-1 -translate-y-1/2 rounded-r-full bg-sky-500 dark:bg-sky-400 shadow-[0_0_12px_rgba(14,165,233,0.6)]" />
                  )}
                  <Icon
                    className={`flex-shrink-0 transition-colors duration-200 ${isActive
                      ? 'text-sky-600 dark:text-sky-300'
                      : 'text-slate-500 dark:text-slate-300 group-hover:text-sky-500 dark:group-hover:text-sky-300'
                      }`}
                    size={20}
                  />
                  {!isCollapsed && (
                    <span className="text-sm font-medium leading-none tracking-wide">{item.name}</span>
                  )}
                </Link>
              );
            })}
        </div>
      </div>
    );
  };

  return (
    <>
      {/* Mobile Hamburger Button - Fixed position */}
      <button
        onClick={() => setIsMobileOpen(true)}
        className="fixed top-3 left-3 z-50 p-2.5 rounded-xl border border-slate-200 dark:border-white/10 bg-white/90 dark:bg-slate-900/90 backdrop-blur-sm shadow-lg lg:hidden"
        aria-label="Open menu"
      >
        <FiMenu size={22} className="text-slate-700 dark:text-slate-200" />
      </button>

      {/* Mobile Overlay */}
      {isMobileOpen && (
        <div
          className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm lg:hidden"
          onClick={() => setIsMobileOpen(false)}
        />
      )}

      {/* Mobile Drawer */}
      <aside
        className={`fixed inset-y-0 left-0 z-50 w-72 transform bg-white/95 dark:bg-slate-950/95 backdrop-blur-xl border-r border-slate-200/60 dark:border-slate-800/60 transition-transform duration-300 ease-out lg:hidden ${isMobileOpen ? 'translate-x-0' : '-translate-x-full'
          }`}
      >
        {/* Mobile Header */}
        <div className="flex items-center justify-between h-16 px-4 border-b border-slate-200/60 dark:border-slate-800/60">
          <Link href="/dashboard" className="text-lg font-semibold tracking-wide">
            <span className="text-slate-800 dark:text-slate-200">Cellular</span>
            <span className="ml-2 bg-gradient-to-r from-violet-500 via-fuchsia-500 to-indigo-500 dark:from-violet-300 dark:via-fuchsia-200 dark:to-indigo-300 bg-clip-text text-transparent">
              Suite
            </span>
          </Link>
          <button
            onClick={() => setIsMobileOpen(false)}
            className="p-2 rounded-xl border border-slate-200 dark:border-white/10 bg-slate-50 dark:bg-white/5 hover:bg-slate-100 dark:hover:bg-white/10 transition-colors"
            aria-label="Close menu"
          >
            <FiX size={20} className="text-slate-700 dark:text-slate-200" />
          </button>
        </div>

        {/* Mobile Navigation */}
        <nav className="flex-1 overflow-y-auto py-4 px-2 max-h-[calc(100vh-8rem)]" aria-label="Mobile navigation">
          {renderMenuSection('Main', groupedMenuItems.main, true)}
          {renderMenuSection('Products', groupedMenuItems.products, true)}
          {renderMenuSection('Inventory', groupedMenuItems.inventory, true)}
          {renderMenuSection('Sales', groupedMenuItems.sales, true)}
          {renderMenuSection('System', groupedMenuItems.system, true)}
        </nav>

        {/* Mobile Footer */}
        <div className="absolute bottom-0 left-0 right-0 border-t border-slate-200/60 dark:border-slate-800/60 p-4 bg-white/95 dark:bg-slate-950/95">
          <div className="rounded-2xl border border-slate-200 dark:border-white/10 bg-slate-50 dark:bg-white/5 p-3">
            <p className="text-sm font-medium text-slate-900 dark:text-slate-100">{user?.username || 'User'}</p>
            <p className="text-xs text-slate-500 dark:text-slate-400 capitalize">{user?.role?.replace(/_/g, ' ') || 'Role'}</p>
            {user?.shop_name && (
              <p className="text-xs text-sky-600 dark:text-sky-300 mt-1">{user.shop_name}</p>
            )}
          </div>
        </div>
      </aside>

      {/* Desktop Sidebar - Hidden on mobile */}
      <aside
        className={`hidden lg:flex relative z-40 h-screen min-h-0 flex-col border-r border-slate-200/60 bg-white/70 backdrop-blur-xl transition-all duration-300 dark:border-slate-800/60 dark:bg-slate-950/70 text-slate-900 dark:text-slate-100 ${isCollapsed ? 'w-[4.5rem]' : 'w-64'
          }`}
      >
        <div className="flex items-center justify-between h-16 px-4">
          {!isCollapsed && (
            <Link href="/dashboard" className="text-lg font-semibold tracking-wide">
              <span className="text-slate-800 dark:text-slate-200">Cellular</span>
              <span className="ml-2 bg-gradient-to-r from-violet-500 via-fuchsia-500 to-indigo-500 dark:from-violet-300 dark:via-fuchsia-200 dark:to-indigo-300 bg-clip-text text-transparent">
                Suite
              </span>
            </Link>
          )}
          <button
            onClick={() => setIsCollapsed(!isCollapsed)}
            className="p-2 rounded-xl border border-slate-200 dark:border-white/10 bg-slate-50 dark:bg-white/5 hover:bg-slate-100 dark:hover:bg-white/10 transition-colors"
            title={isCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
          >
            {isCollapsed ? <FiMenu size={20} /> : <FiX size={20} />}
          </button>
        </div>

        <nav className="flex-1 min-h-0 overflow-y-auto py-4 scrollbar-hide" aria-label="Sidebar navigation">
          {renderMenuSection('Main', groupedMenuItems.main, false, true)}
          {renderMenuSection('Products', groupedMenuItems.products, false, true)}
          {renderMenuSection('Inventory', groupedMenuItems.inventory, false, true)}
          {renderMenuSection('Sales', groupedMenuItems.sales, false, true)}
          {renderMenuSection('System', groupedMenuItems.system, false, true)}
        </nav>

        {isCollapsed && hoveredItem && tooltipRoot
          ? createPortal(
            <div
              className="pointer-events-none fixed z-[9999] -translate-y-1/2 whitespace-nowrap rounded-lg border border-slate-900/10 bg-slate-900 px-3 py-1.5 text-xs font-semibold text-white shadow-[0_12px_30px_rgba(15,23,42,0.35)] dark:border-white/10 dark:bg-white dark:text-slate-900"
              style={{ top: hoveredItem.top, left: hoveredItem.left }}
              role="tooltip"
            >
              <span className="absolute -left-1 top-1/2 h-2 w-2 -translate-y-1/2 rotate-45 bg-slate-900 dark:bg-white" />
              {hoveredItem.label}
            </div>,
            tooltipRoot
          )
          : null}

        <div className={`border-t border-slate-200/60 dark:border-slate-800/60 p-4 ${isCollapsed ? 'text-center' : ''}`}>
          {!isCollapsed ? (
            <div className="rounded-2xl border border-slate-200 dark:border-white/10 bg-slate-50 dark:bg-white/5 p-3">
              <p className="text-sm font-medium text-slate-900 dark:text-slate-100">{user?.username || 'User'}</p>
              <p className="text-xs text-slate-500 dark:text-slate-400 capitalize">{user?.role?.replace(/_/g, ' ') || 'Role'}</p>
              {user?.shop_name && (
                <p className="text-xs text-sky-600 dark:text-sky-300 mt-1">{user.shop_name}</p>
              )}
            </div>
          ) : (
            <div
              className="w-10 h-10 rounded-full bg-gradient-to-br from-violet-500 to-fuchsia-600 flex items-center justify-center text-white font-bold mx-auto shadow-lg"
              title={user?.username}
            >
              {user?.username?.charAt(0).toUpperCase()}
            </div>
          )}
        </div>
      </aside>

      <style jsx>{`
        .scrollbar-hide::-webkit-scrollbar {
          display: none;
        }
        .scrollbar-hide {
          -ms-overflow-style: none;
          scrollbar-width: none;
        }
      `}</style>
    </>
  );
}
