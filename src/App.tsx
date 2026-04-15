/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { Sidebar, Header } from './components/Layout/Layout';
import { Dashboard } from './pages/Dashboard';
import { Customers } from './pages/Customers';
import { Subscriptions } from './pages/Subscriptions';
import { Deployments } from './pages/Deployments';
import { Invoices } from './pages/Invoices';
import { Reports, Settings } from './pages/Misc';
import { motion, AnimatePresence } from 'motion/react';
import { useAuth } from './components/AuthProvider';
import { Button } from './components/UI/Components';
import { Globe } from 'lucide-react';
import { SmartSearchModal } from './components/SmartSearchModal';

export default function App() {
  const [activeTab, setActiveTab] = useState('dashboard');
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [authError, setAuthError] = useState<string | null>(null);
  const [isSigningIn, setIsSigningIn] = useState(false);
  const { user, loading, signIn } = useAuth();

  // Add keyboard shortcut for search
  React.useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        setIsSearchOpen(true);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen bg-slate-50">
        <div className="w-8 h-8 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  if (!user) {
    const handleSignIn = async () => {
      setAuthError(null);
      setIsSigningIn(true);
      try {
        await signIn();
      } catch (error: any) {
        setAuthError(error.message || 'Failed to sign in with GitHub.');
      } finally {
        setIsSigningIn(false);
      }
    };

    return (
      <div className="flex flex-col items-center justify-center h-screen bg-slate-50">
        <div className="p-8 bg-white rounded-2xl shadow-xl max-w-md w-full text-center">
          <div className="flex items-center justify-center w-16 h-16 mx-auto mb-6 text-white bg-indigo-600 rounded-2xl">
            <Globe className="w-8 h-8" />
          </div>
          <h1 className="text-2xl font-bold text-slate-900 mb-2">Nexus Agency Admin</h1>
          <p className="text-slate-500 mb-8">Sign in to manage your agency's clients, deployments, and billing.</p>
          <Button onClick={handleSignIn} disabled={isSigningIn} className="w-full h-12 text-lg">
            {isSigningIn ? 'Signing in...' : 'Sign in with GitHub'}
          </Button>
          {authError && (
            <div className="mt-4 p-4 bg-rose-50 text-rose-700 text-sm rounded-xl border border-rose-100 text-left">
              <p className="font-bold mb-1">Authentication Failed</p>
              <p className="mb-2 text-rose-600">{authError}</p>
              <div className="text-xs text-rose-500 space-y-1">
                <p className="font-semibold">How to fix this:</p>
                <ol className="list-decimal pl-4 space-y-1">
                  <li>Go to your Firebase Console</li>
                  <li>Open <strong>Authentication</strong> &gt; <strong>Sign-in method</strong></li>
                  <li>Click <strong>Add new provider</strong> and select <strong>GitHub</strong></li>
                  <li>Enable it and provide your GitHub Client ID and Secret</li>
                </ol>
              </div>
            </div>
          )}
        </div>
      </div>
    );
  }

  const renderContent = () => {
    switch (activeTab) {
      case 'dashboard': return <Dashboard setActiveTab={setActiveTab} />;
      case 'customers': return <Customers />;
      case 'subscriptions': return <Subscriptions />;
      case 'deployments': return <Deployments />;
      case 'invoices': return <Invoices />;
      case 'reports': return <Reports />;
      case 'settings': return <Settings />;
      default: return <Dashboard setActiveTab={setActiveTab} />;
    }
  };

  const getTitle = () => {
    switch (activeTab) {
      case 'dashboard': return 'Dashboard Overview';
      case 'customers': return 'Customer Management';
      case 'subscriptions': return 'Subscription Plans';
      case 'deployments': return 'Deployment History';
      case 'invoices': return 'Invoices & Receipts';
      case 'reports': return 'Business Reports';
      case 'settings': return 'Account Settings';
      default: return 'Nexus Admin';
    }
  };

  return (
    <div className="flex h-screen bg-slate-50 overflow-hidden font-sans">
      <Sidebar 
        activeTab={activeTab} 
        setActiveTab={setActiveTab} 
        isOpen={isSidebarOpen} 
        setIsOpen={setIsSidebarOpen} 
      />
      
      <div className="flex flex-col flex-1 min-w-0 overflow-hidden">
        <Header 
          setIsOpen={setIsSidebarOpen} 
          title={getTitle()} 
          onOpenSearch={() => setIsSearchOpen(true)}
        />
        
        <main className="flex-1 overflow-y-auto p-4 lg:p-8">
          <div className="max-w-7xl mx-auto">
            <AnimatePresence mode="wait">
              <motion.div
                key={activeTab}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                transition={{ duration: 0.2 }}
              >
                {renderContent()}
              </motion.div>
            </AnimatePresence>
          </div>
        </main>
      </div>
      
      <SmartSearchModal 
        isOpen={isSearchOpen} 
        onClose={() => setIsSearchOpen(false)} 
        onNavigate={setActiveTab} 
      />
    </div>
  );
}
