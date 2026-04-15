/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { 
  LayoutDashboard, 
  Users, 
  CreditCard, 
  Globe, 
  FileText, 
  BarChart3, 
  Settings,
  Search,
  Bell,
  User,
  Menu,
  X,
  LogOut
} from 'lucide-react';
import { cn } from '../../lib/utils';
import { Button } from '../UI/Components';
import { useAuth } from '../AuthProvider';

interface SidebarItemProps {
  icon: React.ElementType;
  label: string;
  active?: boolean;
  onClick: () => void;
}

const SidebarItem: React.FC<SidebarItemProps> = ({ icon: Icon, label, active, onClick }) => (
  <button
    onClick={onClick}
    className={cn(
      'flex items-center w-full gap-3 px-4 py-3 text-sm font-medium transition-all rounded-lg group',
      active 
        ? 'bg-indigo-50 text-indigo-700' 
        : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'
    )}
  >
    <Icon className={cn(
      'w-5 h-5 transition-colors',
      active ? 'text-indigo-600' : 'text-slate-400 group-hover:text-slate-600'
    )} />
    {label}
  </button>
);

export const Sidebar = ({ 
  activeTab, 
  setActiveTab, 
  isOpen, 
  setIsOpen 
}: { 
  activeTab: string; 
  setActiveTab: (tab: string) => void;
  isOpen: boolean;
  setIsOpen: (open: boolean) => void;
}) => {
  const { user, signOut } = useAuth();
  const menuItems = [
    { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
    { id: 'customers', label: 'Customers', icon: Users },
    { id: 'subscriptions', label: 'Subscriptions', icon: CreditCard },
    { id: 'deployments', label: 'Deployments', icon: Globe },
    { id: 'invoices', label: 'Invoices', icon: FileText },
    { id: 'reports', label: 'Reports', icon: BarChart3 },
    { id: 'settings', label: 'Settings', icon: Settings },
  ];

  return (
    <>
      {/* Mobile Backdrop */}
      {isOpen && (
        <div 
          className="fixed inset-0 z-40 bg-slate-900/50 lg:hidden backdrop-blur-sm"
          onClick={() => setIsOpen(false)}
        />
      )}

      <aside className={cn(
        "fixed inset-y-0 left-0 z-50 w-64 bg-white border-r border-slate-200 transition-transform duration-300 ease-in-out lg:translate-x-0 lg:static lg:inset-0",
        isOpen ? "translate-x-0" : "-translate-x-full"
      )}>
        <div className="flex flex-col h-full">
          {/* Logo */}
          <div className="flex items-center justify-between h-16 px-6 border-bottom border-slate-100">
            <div className="flex items-center gap-2">
              <div className="flex items-center justify-center w-8 h-8 text-white bg-indigo-600 rounded-lg">
                <Globe className="w-5 h-5" />
              </div>
              <span className="text-xl font-bold tracking-tight text-slate-900">Nexus</span>
            </div>
            <Button 
              variant="ghost" 
              size="icon" 
              className="lg:hidden" 
              onClick={() => setIsOpen(false)}
            >
              <X className="w-5 h-5" />
            </Button>
          </div>

          {/* Navigation */}
          <nav className="flex-1 px-4 py-6 space-y-1 overflow-y-auto">
            {menuItems.map((item) => (
              <SidebarItem
                key={item.id}
                icon={item.icon}
                label={item.label}
                active={activeTab === item.id}
                onClick={() => {
                  setActiveTab(item.id);
                  setIsOpen(false);
                }}
              />
            ))}
          </nav>

          {/* User Profile (Bottom) */}
          <div className="p-4 border-t border-slate-100">
            <div className="flex items-center gap-3 p-2 rounded-lg hover:bg-slate-50">
              {user?.photoURL ? (
                <img src={user.photoURL} alt={user.displayName || 'User'} className="w-10 h-10 rounded-full" referrerPolicy="no-referrer" />
              ) : (
                <div className="flex items-center justify-center w-10 h-10 rounded-full bg-indigo-100 text-indigo-700 font-semibold">
                  {user?.displayName?.charAt(0) || 'U'}
                </div>
              )}
              <div className="flex-1 overflow-hidden">
                <p className="text-sm font-semibold text-slate-900 truncate">{user?.displayName || 'User'}</p>
                <p className="text-xs text-slate-500 truncate">{user?.email}</p>
              </div>
              <Button variant="ghost" size="icon" onClick={signOut} title="Sign Out">
                <LogOut className="w-4 h-4 text-slate-500" />
              </Button>
            </div>
          </div>
        </div>
      </aside>
    </>
  );
};

export const Header = ({ 
  setIsOpen, 
  title,
  onOpenSearch
}: { 
  setIsOpen: (open: boolean) => void;
  title: string;
  onOpenSearch?: () => void;
}) => (
  <header className="sticky top-0 z-30 flex items-center justify-between h-16 px-4 bg-white/80 border-b border-slate-200 backdrop-blur-md lg:px-8">
    <div className="flex items-center gap-4">
      <Button 
        variant="ghost" 
        size="icon" 
        className="lg:hidden" 
        onClick={() => setIsOpen(true)}
      >
        <Menu className="w-5 h-5" />
      </Button>
      <h1 className="text-lg font-semibold text-slate-900 lg:text-xl">{title}</h1>
    </div>

    <div className="flex items-center gap-2 lg:gap-4">
      <div className="relative hidden md:block" onClick={onOpenSearch}>
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
        <input 
          type="text" 
          placeholder="Search anything..." 
          readOnly
          className="h-10 pl-10 pr-4 text-sm bg-slate-50 border border-slate-200 rounded-lg w-64 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all cursor-text"
        />
        <div className="absolute right-3 top-1/2 -translate-y-1/2 flex items-center gap-1">
          <kbd className="hidden sm:inline-block px-1.5 py-0.5 bg-white border border-slate-200 rounded text-[10px] font-mono text-slate-400">âŒ˜</kbd>
          <kbd className="hidden sm:inline-block px-1.5 py-0.5 bg-white border border-slate-200 rounded text-[10px] font-mono text-slate-400">K</kbd>
        </div>
      </div>
      <Button variant="ghost" size="icon" className="relative">
        <Bell className="w-5 h-5 text-slate-600" />
        <span className="absolute top-2.5 right-2.5 w-2 h-2 bg-rose-500 rounded-full border-2 border-white" />
      </Button>
      <Button variant="ghost" size="icon">
        <User className="w-5 h-5 text-slate-600" />
      </Button>
    </div>
  </header>
);
