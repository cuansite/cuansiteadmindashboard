/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { 
  Search, 
  Plus, 
  Filter, 
  Edit2,
  Trash2,
  X
} from 'lucide-react';
import { Card, Button, Badge, ConfirmModal } from '../components/UI/Components';
import { Customer, SettingsData, Subscription, Invoice, Deployment } from '../types';
import { formatDate, formatCurrency } from '../lib/utils';
import { useFirestore } from '../hooks/useFirestore';
import { generateInvoicePDF } from '../lib/pdfGenerator';

export const Customers = () => {
  const [searchTerm, setSearchTerm] = useState('');
  const { data: customers, loading, add, update, remove } = useFirestore<Customer>('customers');
  const { data: settingsList } = useFirestore<SettingsData>('settings');
  const { data: subscriptions, add: addSubscription, remove: removeSubscription } = useFirestore<Subscription>('subscriptions');
  const { data: invoices, add: addInvoice, remove: removeInvoice } = useFirestore<Invoice>('invoices');
  const { data: deployments, remove: removeDeployment } = useFirestore<Deployment>('deployments');
  
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [editingCustomer, setEditingCustomer] = useState<Customer | null>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);

  const settings = settingsList?.[0];
  const packages = settings?.packages || [];

  const [formData, setFormData] = useState<Partial<Customer>>({
    name: '',
    company: '',
    email: '',
    phone: '',
    plan: 'Basic',
    status: 'active',
    startDate: new Date().toISOString().split('T')[0],
    endDate: new Date(new Date().setFullYear(new Date().getFullYear() + 1)).toISOString().split('T')[0],
    websiteUrl: '',
    notes: ''
  });

  // Update end date when plan or start date changes
  useEffect(() => {
    if (!editingCustomer && formData.plan && formData.startDate) {
      const selectedPackage = packages.find(p => p.name === formData.plan);
      if (selectedPackage) {
        const start = new Date(formData.startDate);
        const end = new Date(start.setMonth(start.getMonth() + selectedPackage.durationMonths));
        setFormData(prev => ({ ...prev, endDate: end.toISOString().split('T')[0] }));
      }
    }
  }, [formData.plan, formData.startDate, packages, editingCustomer]);

  const filteredCustomers = customers.filter(c => 
    c.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    c.company.toLowerCase().includes(searchTerm.toLowerCase()) ||
    c.email.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const handleOpenModal = (customer?: Customer) => {
    if (customer) {
      setEditingCustomer(customer);
      setFormData(customer);
    } else {
      setEditingCustomer(null);
      const defaultPlan = packages.length > 0 ? packages[0].name : 'Basic';
      setFormData({
        name: '',
        company: '',
        email: '',
        phone: '',
        plan: defaultPlan as any,
        status: 'active',
        startDate: new Date().toISOString().split('T')[0],
        endDate: new Date(new Date().setFullYear(new Date().getFullYear() + 1)).toISOString().split('T')[0],
        websiteUrl: '',
        notes: ''
      });
    }
    setIsModalOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    try {
      if (editingCustomer) {
        await update(editingCustomer.id, formData);
      } else {
        // Create Customer
        const customerId = await add(formData as any);
        
        // Find selected package or use fallback
        const selectedPackage = packages.find(p => p.name === formData.plan) || {
          name: formData.plan,
          price: formData.plan === 'Pro' ? 99 : formData.plan === 'Enterprise' ? 299 : 0,
          durationMonths: 12
        };
        
        // Create Subscription
        const subPromise = addSubscription({
          customerId,
          plan: formData.plan as any,
          amount: selectedPackage.price,
          startDate: formData.startDate || new Date().toISOString().split('T')[0],
          endDate: formData.endDate || new Date(new Date().setFullYear(new Date().getFullYear() + 1)).toISOString().split('T')[0],
          status: 'active',
          paymentStatus: 'paid',
          billingCycle: 'yearly',
          autoRenew: true
        } as any);

        // Create Invoice
        const invoiceNumber = `INV-${new Date().getFullYear()}-${Math.floor(1000 + Math.random() * 9000)}`;
        const taxRate = settings?.taxRate || 0;
        const tax = selectedPackage.price * (taxRate / 100);
        const total = selectedPackage.price + tax;
        
        const newInvoice: any = {
          invoiceNumber,
          customerId,
          date: formData.startDate || new Date().toISOString().split('T')[0],
          dueDate: formData.startDate || new Date().toISOString().split('T')[0],
          items: [
            {
              description: `${selectedPackage.name} Subscription (${selectedPackage.durationMonths} months)`,
              quantity: 1,
              unitPrice: selectedPackage.price,
              total: selectedPackage.price
            }
          ],
          subtotal: selectedPackage.price,
          tax,
          total,
          status: 'paid'
        };
        
        const invPromise = addInvoice(newInvoice);

        // Wait for both subscription and invoice to be created
        await Promise.all([subPromise, invPromise]);

        // Generate and download PDF
        const customerData = { ...formData, id: customerId } as Customer;
        generateInvoicePDF(newInvoice, customerData, settings || {
          agencyName: 'Agency Name',
          supportEmail: 'support@example.com',
          currency: 'USD',
          taxRate: 0,
          packages: []
        } as any);
      }
      setIsModalOpen(false);
    } catch (error) {
      console.error('Error saving customer:', error);
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = async () => {
    if (deleteId) {
      const idToDelete = deleteId;
      setDeleteId(null); // Close modal immediately and prevent double clicks
      try {
        // Find related records
        const customerSubscriptions = subscriptions.filter(s => s.customerId === idToDelete);
        const customerInvoices = invoices.filter(i => i.customerId === idToDelete);
        const customerDeployments = deployments.filter(d => d.customerId === idToDelete);

        // Delete related records
        for (const sub of customerSubscriptions) {
          await removeSubscription(sub.id);
        }
        for (const inv of customerInvoices) {
          await removeInvoice(inv.id);
        }
        for (const dep of customerDeployments) {
          await removeDeployment(dep.id);
        }

        // Delete customer
        await remove(idToDelete);
      } catch (error) {
        console.error('Error deleting customer and related records:', error);
      }
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <input 
            type="text" 
            placeholder="Search customers by name, company or email..." 
            className="w-full h-11 pl-10 pr-4 text-sm bg-white border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" className="gap-2">
            <Filter className="w-4 h-4" />
            Filters
          </Button>
          <Button className="gap-2" onClick={() => handleOpenModal()}>
            <Plus className="w-4 h-4" />
            Add Customer
          </Button>
        </div>
      </div>

      <Card>
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-slate-100 bg-slate-50/50">
                <th className="px-6 py-4 text-xs font-bold uppercase tracking-wider text-slate-500">Customer</th>
                <th className="px-6 py-4 text-xs font-bold uppercase tracking-wider text-slate-500">Plan</th>
                <th className="px-6 py-4 text-xs font-bold uppercase tracking-wider text-slate-500">Status</th>
                <th className="px-6 py-4 text-xs font-bold uppercase tracking-wider text-slate-500">Start Date</th>
                <th className="px-6 py-4 text-xs font-bold uppercase tracking-wider text-slate-500 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {loading ? (
                <tr>
                  <td colSpan={5} className="px-6 py-8 text-center text-slate-500">Loading customers...</td>
                </tr>
              ) : filteredCustomers.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-6 py-12 text-center">
                    <div className="flex flex-col items-center justify-center">
                      <div className="p-4 bg-slate-50 rounded-full mb-4">
                        <Search className="w-8 h-8 text-slate-300" />
                      </div>
                      <p className="text-slate-500 font-medium">No customers found.</p>
                    </div>
                  </td>
                </tr>
              ) : (
                filteredCustomers.map((customer) => (
                  <tr key={customer.id} className="hover:bg-slate-50/50 transition-colors group">
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        <div className="flex items-center justify-center w-10 h-10 rounded-xl bg-indigo-50 text-indigo-600 font-bold uppercase">
                          {customer.name.charAt(0)}
                        </div>
                        <div>
                          <p className="font-bold text-slate-900">{customer.name}</p>
                          <p className="text-xs text-slate-500">{customer.company}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <Badge variant={customer.plan === 'Enterprise' ? 'info' : 'default'}>
                        {customer.plan}
                      </Badge>
                    </td>
                    <td className="px-6 py-4">
                      <Badge variant={customer.status === 'active' ? 'success' : customer.status === 'inactive' ? 'danger' : 'warning'}>
                        {customer.status}
                      </Badge>
                    </td>
                    <td className="px-6 py-4 text-sm text-slate-600">
                      {formatDate(customer.startDate)}
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center justify-end gap-2">
                        <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => handleOpenModal(customer)}>
                          <Edit2 className="w-4 h-4" />
                        </Button>
                        <Button variant="ghost" size="icon" className="h-8 w-8 text-rose-500 hover:text-rose-600 hover:bg-rose-50" onClick={() => setDeleteId(customer.id)}>
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </Card>

      <ConfirmModal
        isOpen={!!deleteId}
        title="Delete Customer"
        message="Are you sure you want to delete this customer? This will also delete all their subscriptions, invoices, and deployments. This action cannot be undone."
        confirmText="Delete All"
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
                {editingCustomer ? 'Edit Customer' : 'Add New Customer'}
              </h3>
              <Button variant="ghost" size="icon" onClick={() => setIsModalOpen(false)}>
                <X className="w-5 h-5" />
              </Button>
            </div>
            <form onSubmit={handleSubmit} className="p-6 space-y-6">
              <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
                <div className="space-y-2">
                  <label className="text-sm font-medium text-slate-700">Full Name</label>
                  <input 
                    required
                    type="text" 
                    value={formData.name}
                    onChange={e => setFormData({...formData, name: e.target.value})}
                    className="w-full h-10 px-3 bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500/20" 
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium text-slate-700">Company</label>
                  <input 
                    required
                    type="text" 
                    value={formData.company}
                    onChange={e => setFormData({...formData, company: e.target.value})}
                    className="w-full h-10 px-3 bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500/20" 
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium text-slate-700">Email</label>
                  <input 
                    required
                    type="email" 
                    value={formData.email}
                    onChange={e => setFormData({...formData, email: e.target.value})}
                    className="w-full h-10 px-3 bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500/20" 
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium text-slate-700">Phone</label>
                  <input 
                    type="tel" 
                    value={formData.phone}
                    onChange={e => setFormData({...formData, phone: e.target.value})}
                    className="w-full h-10 px-3 bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500/20" 
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium text-slate-700">Plan</label>
                  <select 
                    value={formData.plan}
                    onChange={e => setFormData({...formData, plan: e.target.value as any})}
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
                  <label className="text-sm font-medium text-slate-700">Status</label>
                  <select 
                    value={formData.status}
                    onChange={e => setFormData({...formData, status: e.target.value as any})}
                    className="w-full h-10 px-3 bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
                  >
                    <option value="active">Active</option>
                    <option value="inactive">Inactive</option>
                    <option value="pending">Pending</option>
                  </select>
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium text-slate-700">Start Date</label>
                  <input 
                    type="date" 
                    value={formData.startDate}
                    onChange={e => setFormData({...formData, startDate: e.target.value})}
                    className="w-full h-10 px-3 bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500/20" 
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium text-slate-700">End Date</label>
                  <input 
                    type="date" 
                    value={formData.endDate}
                    onChange={e => setFormData({...formData, endDate: e.target.value})}
                    className="w-full h-10 px-3 bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500/20" 
                  />
                </div>
                <div className="space-y-2 md:col-span-2">
                  <label className="text-sm font-medium text-slate-700">Website URL</label>
                  <input 
                    type="url" 
                    value={formData.websiteUrl}
                    onChange={e => setFormData({...formData, websiteUrl: e.target.value})}
                    className="w-full h-10 px-3 bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500/20" 
                  />
                </div>
                <div className="space-y-2 md:col-span-2">
                  <label className="text-sm font-medium text-slate-700">Notes</label>
                  <textarea 
                    value={formData.notes}
                    onChange={e => setFormData({...formData, notes: e.target.value})}
                    className="w-full h-24 p-3 bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500/20 resize-none" 
                  />
                </div>
              </div>
              <div className="flex justify-end gap-3 pt-6 border-t border-slate-100">
                <Button type="button" variant="outline" onClick={() => setIsModalOpen(false)} disabled={isSaving}>Cancel</Button>
                <Button type="submit" disabled={isSaving}>
                  {isSaving ? 'Saving...' : editingCustomer ? 'Save Changes' : 'Add Customer & Generate Invoice'}
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

