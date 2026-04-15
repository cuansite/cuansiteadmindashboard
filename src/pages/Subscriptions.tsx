/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { createPortal } from 'react-dom';
import { 
  CreditCard, 
  Calendar, 
  RefreshCw, 
  TrendingUp,
  Plus,
  X,
  Trash2,
  Edit2,
  AlertTriangle
} from 'lucide-react';
import { Card, Button, ConfirmModal } from '../components/UI/Components';
import { Subscription, Customer, SettingsData } from '../types';
import { formatCurrency, formatDate, cn } from '../lib/utils';
import { differenceInDays } from 'date-fns';
import { useFirestore } from '../hooks/useFirestore';

export const Subscriptions = () => {
  const { data: subscriptions, loading, add, update, remove } = useFirestore<Subscription>('subscriptions');
  const { data: customers } = useFirestore<Customer>('customers');
  const { data: settingsList } = useFirestore<SettingsData>('settings');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [editingSubscription, setEditingSubscription] = useState<Subscription | null>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);

  const settings = settingsList?.[0];
  const packages = settings?.packages || [];

  const [formData, setFormData] = useState<Partial<Subscription>>({
    customerId: '',
    plan: 'Basic',
    status: 'active',
    paymentStatus: 'paid',
    startDate: new Date().toISOString().split('T')[0],
    endDate: new Date(new Date().setFullYear(new Date().getFullYear() + 1)).toISOString().split('T')[0],
    amount: 0,
    billingCycle: 'monthly',
    autoRenew: true
  });

  const handleOpenModal = (subscription?: Subscription) => {
    if (subscription) {
      setEditingSubscription(subscription);
      setFormData(subscription);
    } else {
      setEditingSubscription(null);
      const defaultPlan = packages.length > 0 ? packages[0].name : 'Basic';
      const defaultAmount = packages.length > 0 ? packages[0].price : 0;
      setFormData({
        customerId: customers[0]?.id || '',
        plan: defaultPlan as any,
        status: 'active',
        paymentStatus: 'paid',
        startDate: new Date().toISOString().split('T')[0],
        endDate: new Date(new Date().setFullYear(new Date().getFullYear() + 1)).toISOString().split('T')[0],
        amount: defaultAmount,
        billingCycle: 'monthly',
        autoRenew: true
      });
    }
    setIsModalOpen(true);
  };

  const handlePlanChange = (planName: string) => {
    const selectedPackage = packages.find(p => p.name === planName);
    if (selectedPackage) {
      setFormData(prev => ({
        ...prev,
        plan: planName as any,
        amount: selectedPackage.price
      }));
    } else {
      setFormData(prev => ({ ...prev, plan: planName as any }));
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    try {
      if (editingSubscription) {
        await update(editingSubscription.id, formData);
      } else {
        await add(formData as any);
      }
      setIsModalOpen(false);
    } catch (error) {
      console.error('Error saving subscription:', error);
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = async () => {
    if (deleteId) {
      const idToDelete = deleteId;
      setDeleteId(null);
      try {
        await remove(idToDelete);
      } catch (error) {
        console.error('Error deleting subscription:', error);
      }
    }
  };

  const activeCount = subscriptions.filter(s => s.status === 'active').length;
  const expiringCount = subscriptions.filter(s => s.status === 'expiring').length;
  const expiredCount = subscriptions.filter(s => s.status === 'expired').length;

  const expiringSoonSubscriptions = subscriptions.filter(sub => {
    const daysRemaining = differenceInDays(new Date(sub.endDate), new Date());
    return daysRemaining >= 0 && daysRemaining <= 10;
  });

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-slate-900">Subscription Plans</h2>
          <p className="text-slate-500">Track recurring revenue and client renewals</p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" className="gap-2">
            <RefreshCw className="w-4 h-4" />
            Sync Billing
          </Button>
          <Button className="gap-2" onClick={() => handleOpenModal()}>
            <Plus className="w-4 h-4" />
            New Subscription
          </Button>
        </div>
      </div>

      {expiringSoonSubscriptions.length > 0 && (
        <div className="bg-amber-50 border border-amber-200 text-amber-800 px-4 py-3 rounded-lg flex items-center gap-3 shadow-sm">
          <AlertTriangle className="w-5 h-5 text-amber-500" />
          <p className="text-sm font-medium">
            You have {expiringSoonSubscriptions.length} subscription{expiringSoonSubscriptions.length > 1 ? 's' : ''} expiring within the next 10 days.
          </p>
        </div>
      )}

      <div className="grid grid-cols-1 gap-6 md:grid-cols-3">
        <Card className="p-6">
          <div className="flex items-center gap-4 mb-4">
            <div className="p-3 bg-indigo-100 text-indigo-600 rounded-xl">
              <TrendingUp className="w-6 h-6" />
            </div>
            <div>
              <p className="text-sm font-medium text-slate-500">Active Subscriptions</p>
              <h3 className="text-2xl font-bold text-slate-900">{activeCount}</h3>
            </div>
          </div>
          <div className="flex items-center gap-2 text-emerald-600 text-sm font-medium">
            <TrendingUp className="w-4 h-4" />
            Growing steadily
          </div>
        </Card>
        
        <Card className="p-6">
          <div className="flex items-center gap-4 mb-4">
            <div className="p-3 bg-amber-100 text-amber-600 rounded-xl">
              <Calendar className="w-6 h-6" />
            </div>
            <div>
              <p className="text-sm font-medium text-slate-500">Expiring Soon</p>
              <h3 className="text-2xl font-bold text-slate-900">{expiringCount}</h3>
            </div>
          </div>
          <p className="text-sm text-slate-500">Needs attention</p>
        </Card>

        <Card className="p-6">
          <div className="flex items-center gap-4 mb-4">
            <div className="p-3 bg-rose-100 text-rose-600 rounded-xl">
              <CreditCard className="w-6 h-6" />
            </div>
            <div>
              <p className="text-sm font-medium text-slate-500">Expired</p>
              <h3 className="text-2xl font-bold text-slate-900">{expiredCount}</h3>
            </div>
          </div>
          <p className="text-sm text-slate-500">Action required</p>
        </Card>
      </div>

      <div className="space-y-4">
        <h3 className="text-lg font-bold text-slate-900">All Subscriptions</h3>
        <div className="grid grid-cols-1 gap-4">
          {loading ? (
            <p className="text-slate-500">Loading subscriptions...</p>
          ) : subscriptions.length === 0 ? (
            <Card className="p-12 text-center">
              <CreditCard className="w-12 h-12 text-slate-300 mx-auto mb-4" />
              <p className="text-slate-500 font-medium">No subscriptions found.</p>
            </Card>
          ) : (
            subscriptions.map((sub) => {
              const customer = customers.find(c => c.id === sub.customerId);
              const daysRemaining = differenceInDays(new Date(sub.endDate), new Date());
              const isExpiringSoon = daysRemaining >= 0 && daysRemaining <= 10;
              
              return (
                <Card key={sub.id} className={cn("p-6 transition-all", isExpiringSoon ? "border-amber-300 bg-amber-50/30" : "hover:border-indigo-200")}>
                  <div className="flex flex-col gap-6 md:flex-row md:items-center">
                    <div className="flex-1">
                      <div className="flex items-center gap-3">
                        <div className="w-12 h-12 bg-slate-100 rounded-xl flex items-center justify-center font-bold text-slate-600 uppercase">
                          {customer?.company.charAt(0) || '?'}
                        </div>
                        <div>
                          <div className="flex items-center gap-2">
                            <h4 className="font-bold text-slate-900">{customer?.company || 'Unknown'}</h4>
                            {isExpiringSoon && (
                              <span className="px-2 py-0.5 text-[10px] font-bold bg-amber-100 text-amber-700 rounded-full uppercase tracking-wider">
                                Expiring Soon
                              </span>
                            )}
                          </div>
                          <p className="text-sm text-slate-500">{sub.plan} Plan</p>
                        </div>
                      </div>
                    </div>

                    <div className="flex-1 grid grid-cols-2 gap-4 md:gap-8">
                      <div>
                        <p className="text-xs font-medium text-slate-400 uppercase tracking-wider">Amount</p>
                        <p className="text-sm font-bold text-slate-900">{formatCurrency(sub.amount)}/{sub.billingCycle === 'monthly' ? 'mo' : sub.billingCycle === 'yearly' ? 'yr' : 'qtr'}</p>
                      </div>
                      <div>
                        <p className="text-xs font-medium text-slate-400 uppercase tracking-wider">Renewal</p>
                        <p className="text-sm font-bold text-slate-900">{formatDate(sub.endDate)}</p>
                      </div>
                    </div>

                    <div className="flex-1">
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-xs font-medium text-slate-500">
                          {daysRemaining > 0 ? `${daysRemaining} days remaining` : 'Expired'}
                        </span>
                        <span className="text-xs font-bold text-slate-900">
                          {Math.max(0, Math.min(100, Math.round((daysRemaining / 365) * 100)))}%
                        </span>
                      </div>
                      <div className="w-full bg-slate-100 h-2 rounded-full overflow-hidden">
                        <div 
                          className={cn(
                            "h-full rounded-full transition-all duration-500",
                            daysRemaining < 30 ? "bg-rose-500" : daysRemaining < 90 ? "bg-amber-500" : "bg-emerald-500"
                          )}
                          style={{ width: `${Math.max(0, Math.min(100, Math.round((daysRemaining / 365) * 100)))}%` }}
                        />
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      <Button variant="ghost" size="icon" onClick={() => handleOpenModal(sub)}>
                        <Edit2 className="w-4 h-4 text-slate-400" />
                      </Button>
                      <Button variant="ghost" size="icon" className="text-rose-500 hover:bg-rose-50" onClick={() => setDeleteId(sub.id)}>
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>
                </Card>
              );
            })
          )}
        </div>
      </div>

      <ConfirmModal
        isOpen={!!deleteId}
        title="Delete Subscription"
        message="Are you sure you want to delete this subscription? This action cannot be undone."
        confirmText="Delete"
        cancelText="Cancel"
        isDestructive={true}
        onConfirm={handleDelete}
        onCancel={() => setDeleteId(null)}
      />

      {/* Modal */}
      {isModalOpen && createPortal(
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm">
          <Card className="w-full max-w-2xl max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between p-6 border-b border-slate-100 sticky top-0 bg-white z-10">
              <h3 className="text-lg font-bold text-slate-900">
                {editingSubscription ? 'Edit Subscription' : 'New Subscription'}
              </h3>
              <Button variant="ghost" size="icon" onClick={() => setIsModalOpen(false)}>
                <X className="w-5 h-5" />
              </Button>
            </div>
            <form onSubmit={handleSubmit} className="p-6 space-y-6">
              <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
                <div className="space-y-2 md:col-span-2">
                  <label className="text-sm font-medium text-slate-700">Customer</label>
                  <select 
                    required
                    value={formData.customerId}
                    onChange={e => setFormData({...formData, customerId: e.target.value})}
                    className="w-full h-10 px-3 bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
                  >
                    <option value="" disabled>Select a customer</option>
                    {customers.map(c => (
                      <option key={c.id} value={c.id}>{c.company} ({c.name})</option>
                    ))}
                  </select>
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium text-slate-700">Plan</label>
                  <select 
                    value={formData.plan}
                    onChange={e => handlePlanChange(e.target.value)}
                    className="w-full h-10 px-3 bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
                  >
                    {packages.length > 0 ? (
                      packages.map(pkg => (
                        <option key={pkg.id} value={pkg.name}>{pkg.name} ({formatCurrency(pkg.price)})</option>
                      ))
                    ) : (
                      <>
                        <option value="Basic">Basic</option>
                        <option value="Pro">Pro</option>
                        <option value="Enterprise">Enterprise</option>
                        <option value="Custom">Custom</option>
                      </>
                    )}
                  </select>
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium text-slate-700">Amount</label>
                  <input 
                    required
                    type="number" 
                    min="0"
                    step="0.01"
                    value={formData.amount}
                    onChange={e => setFormData({...formData, amount: Number(e.target.value)})}
                    className="w-full h-10 px-3 bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500/20" 
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium text-slate-700">Status</label>
                  <select 
                    value={formData.status}
                    onChange={e => setFormData({...formData, status: e.target.value as any})}
                    className="w-full h-10 px-3 bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
                  >
                    <option value="active">Active</option>
                    <option value="expiring">Expiring Soon</option>
                    <option value="expired">Expired</option>
                    <option value="cancelled">Cancelled</option>
                  </select>
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium text-slate-700">Start Date</label>
                  <input 
                    required
                    type="date" 
                    value={formData.startDate}
                    onChange={e => setFormData({...formData, startDate: e.target.value})}
                    className="w-full h-10 px-3 bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500/20" 
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium text-slate-700">End Date</label>
                  <input 
                    required
                    type="date" 
                    value={formData.endDate}
                    onChange={e => setFormData({...formData, endDate: e.target.value})}
                    className="w-full h-10 px-3 bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500/20" 
                  />
                </div>
              </div>
              <div className="flex justify-end gap-3 pt-6 border-t border-slate-100">
                <Button type="button" variant="outline" onClick={() => setIsModalOpen(false)} disabled={isSaving}>Cancel</Button>
                <Button type="submit" disabled={isSaving}>
                  {isSaving ? 'Saving...' : editingSubscription ? 'Save Changes' : 'Create Subscription'}
                </Button>
              </div>
            </form>
          </Card>
        </div>,
        document.body
      )}
    </div>
  );
};
