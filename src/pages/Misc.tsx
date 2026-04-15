/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { Card, Button } from '../components/UI/Components';
import { BarChart3, Download, Filter, Calendar, Plus, Trash2 } from 'lucide-react';
import { useFirestore } from '../hooks/useFirestore';
import { Invoice, Subscription, Deployment, SettingsData, Package } from '../types';
import { formatCurrency } from '../lib/utils';

export const Reports = () => {
  const { data: invoices } = useFirestore<Invoice>('invoices');
  const { data: subscriptions } = useFirestore<Subscription>('subscriptions');
  const { data: deployments } = useFirestore<Deployment>('deployments');

  const totalRevenue = invoices.filter(i => i.status === 'paid').reduce((sum, inv) => sum + inv.total, 0);
  const activeSubscriptions = subscriptions.filter(s => s.status === 'active').length;
  const totalDeployments = deployments.length;
  const successfulDeployments = deployments.filter(d => d.status === 'deployed').length;
  const successRate = totalDeployments > 0 ? Math.round((successfulDeployments / totalDeployments) * 100) : 0;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-slate-900">Business Reports</h2>
          <p className="text-slate-500">Detailed insights into your agency's performance</p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" className="gap-2">
            <Calendar className="w-4 h-4" />
            Last 30 Days
          </Button>
          <Button className="gap-2">
            <Download className="w-4 h-4" />
            Export PDF
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
        <Card className="p-6 flex flex-col items-center justify-center text-center min-h-[300px]">
          <div className="p-4 bg-indigo-50 text-indigo-600 rounded-full mb-4">
            <BarChart3 className="w-8 h-8" />
          </div>
          <h3 className="text-lg font-bold text-slate-900">Revenue Analytics</h3>
          <p className="text-2xl font-bold text-indigo-600 mt-2">{formatCurrency(totalRevenue)}</p>
          <p className="text-sm text-slate-500 mt-2 max-w-[200px]">
            Total collected revenue from all paid invoices.
          </p>
          <Button variant="ghost" className="mt-6 text-indigo-600">View Report</Button>
        </Card>

        <Card className="p-6 flex flex-col items-center justify-center text-center min-h-[300px]">
          <div className="p-4 bg-emerald-50 text-emerald-600 rounded-full mb-4">
            <Filter className="w-8 h-8" />
          </div>
          <h3 className="text-lg font-bold text-slate-900">Customer Retention</h3>
          <p className="text-2xl font-bold text-emerald-600 mt-2">{activeSubscriptions} Active</p>
          <p className="text-sm text-slate-500 mt-2 max-w-[200px]">
            Current active subscriptions across all customers.
          </p>
          <Button variant="ghost" className="mt-6 text-emerald-600">View Report</Button>
        </Card>

        <Card className="p-6 flex flex-col items-center justify-center text-center min-h-[300px]">
          <div className="p-4 bg-sky-50 text-sky-600 rounded-full mb-4">
            <BarChart3 className="w-8 h-8" />
          </div>
          <h3 className="text-lg font-bold text-slate-900">Deployment Velocity</h3>
          <p className="text-2xl font-bold text-sky-600 mt-2">{successRate}% Success</p>
          <p className="text-sm text-slate-500 mt-2 max-w-[200px]">
            {successfulDeployments} successful out of {totalDeployments} total deployments.
          </p>
          <Button variant="ghost" className="mt-6 text-sky-600">View Report</Button>
        </Card>
      </div>
    </div>
  );
};

export const Settings = () => {
  const { data: settingsList, update, add } = useFirestore<SettingsData>('settings');
  const [formData, setFormData] = useState<Partial<SettingsData>>({
    agencyName: 'Nexus Web Agency',
    supportEmail: 'support@nexusagency.com',
    currency: 'IDR (Rp)',
    taxRate: 11,
    packages: [
      { id: '1', name: 'Basic', price: 1500000, durationMonths: 1 },
      { id: '2', name: 'Pro', price: 3000000, durationMonths: 6 },
      { id: '3', name: 'Enterprise', price: 7500000, durationMonths: 12 }
    ]
  });
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    if (settingsList && settingsList.length > 0) {
      setFormData(settingsList[0]);
    }
  }, [settingsList]);

  const handleSave = async () => {
    setIsSaving(true);
    try {
      if (settingsList && settingsList.length > 0) {
        await update(settingsList[0].id, formData);
      } else {
        await add(formData as any);
      }
      alert('Settings saved successfully!');
    } catch (error) {
      alert('Failed to save settings.');
    } finally {
      setIsSaving(false);
    }
  };

  const handleAddPackage = () => {
    setFormData({
      ...formData,
      packages: [
        ...(formData.packages || []),
        { id: Math.random().toString(36).substring(7), name: '', price: 0, durationMonths: 1 }
      ]
    });
  };

  const handleRemovePackage = (id: string) => {
    setFormData({
      ...formData,
      packages: (formData.packages || []).filter(p => p.id !== id)
    });
  };

  const handlePackageChange = (id: string, field: keyof Package, value: string | number) => {
    setFormData({
      ...formData,
      packages: (formData.packages || []).map(p => 
        p.id === id ? { ...p, [field]: value } : p
      )
    });
  };

  return (
    <div className="max-w-4xl space-y-8">
      <div>
        <h2 className="text-2xl font-bold text-slate-900">Settings</h2>
        <p className="text-slate-500">Manage your agency profile and preferences</p>
      </div>

      <Card className="divide-y divide-slate-100">
        <div className="p-6">
          <h3 className="text-lg font-bold text-slate-900 mb-4">Agency Profile</h3>
          <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
            <div className="space-y-2">
              <label className="text-sm font-medium text-slate-700">Agency Name</label>
              <input 
                type="text" 
                value={formData.agencyName} 
                onChange={(e) => setFormData({ ...formData, agencyName: e.target.value })}
                className="w-full h-10 px-3 bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500/20" 
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium text-slate-700">Support Email</label>
              <input 
                type="email" 
                value={formData.supportEmail} 
                onChange={(e) => setFormData({ ...formData, supportEmail: e.target.value })}
                className="w-full h-10 px-3 bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500/20" 
              />
            </div>
          </div>
        </div>

        <div className="p-6">
          <h3 className="text-lg font-bold text-slate-900 mb-4">Billing Configuration</h3>
          <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
            <div className="space-y-2">
              <label className="text-sm font-medium text-slate-700">Currency</label>
              <select 
                value={formData.currency}
                onChange={(e) => setFormData({ ...formData, currency: e.target.value })}
                className="w-full h-10 px-3 bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
              >
                <option value="USD ($)">USD ($)</option>
                <option value="EUR (€)">EUR (€)</option>
                <option value="GBP (£)">GBP (£)</option>
                <option value="IDR (Rp)">IDR (Rp)</option>
              </select>
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium text-slate-700">Tax Rate (%)</label>
              <input 
                type="number" 
                value={formData.taxRate} 
                onChange={(e) => setFormData({ ...formData, taxRate: Number(e.target.value) })}
                className="w-full h-10 px-3 bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500/20" 
              />
            </div>
          </div>
        </div>

        <div className="p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-bold text-slate-900">Subscription Packages</h3>
            <Button variant="outline" size="sm" onClick={handleAddPackage} className="gap-2">
              <Plus className="w-4 h-4" />
              Add Package
            </Button>
          </div>
          <div className="space-y-4">
            {(formData.packages || []).map((pkg) => (
              <div key={pkg.id} className="flex items-start gap-4 p-4 bg-slate-50 border border-slate-200 rounded-xl">
                <div className="flex-1 space-y-2">
                  <label className="text-xs font-medium text-slate-500 uppercase">Package Name</label>
                  <input 
                    type="text" 
                    value={pkg.name}
                    placeholder="e.g. Basic Plan"
                    onChange={(e) => handlePackageChange(pkg.id, 'name', e.target.value)}
                    className="w-full h-10 px-3 bg-white border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500/20" 
                  />
                </div>
                <div className="w-32 space-y-2">
                  <label className="text-xs font-medium text-slate-500 uppercase">Price</label>
                  <input 
                    type="number" 
                    value={pkg.price}
                    onChange={(e) => handlePackageChange(pkg.id, 'price', Number(e.target.value))}
                    className="w-full h-10 px-3 bg-white border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500/20" 
                  />
                </div>
                <div className="w-32 space-y-2">
                  <label className="text-xs font-medium text-slate-500 uppercase">Duration (Months)</label>
                  <input 
                    type="number" 
                    value={pkg.durationMonths}
                    onChange={(e) => handlePackageChange(pkg.id, 'durationMonths', Number(e.target.value))}
                    className="w-full h-10 px-3 bg-white border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500/20" 
                  />
                </div>
                <div className="pt-6">
                  <Button variant="ghost" size="icon" className="text-rose-500 hover:bg-rose-50" onClick={() => handleRemovePackage(pkg.id)}>
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </div>
              </div>
            ))}
            {(!formData.packages || formData.packages.length === 0) && (
              <p className="text-sm text-slate-500 text-center py-4">No packages defined. Add one to get started.</p>
            )}
          </div>
        </div>

        <div className="p-6 flex justify-end gap-3">
          <Button variant="outline" onClick={() => {
            if (settingsList && settingsList.length > 0) {
              setFormData(settingsList[0]);
            }
          }}>Cancel</Button>
          <Button onClick={handleSave} disabled={isSaving}>
            {isSaving ? 'Saving...' : 'Save Changes'}
          </Button>
        </div>
      </Card>
    </div>
  );
};
