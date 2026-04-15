/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

export type CustomerStatus = 'active' | 'inactive' | 'pending';
export type SubscriptionPlan = string;
export type DeploymentStatus = 'pending' | 'in-progress' | 'deployed' | 'failed' | 'updated';
export type PaymentStatus = 'paid' | 'unpaid' | 'overdue' | 'refunded';

export interface Customer {
  id: string;
  name: string;
  company: string;
  email: string;
  phone: string;
  plan: SubscriptionPlan;
  startDate: string;
  endDate: string;
  status: CustomerStatus;
  notes: string;
  websiteUrl: string;
}

export interface Subscription {
  id: string;
  customerId: string;
  plan: SubscriptionPlan;
  amount: number;
  startDate: string;
  renewalDate: string;
  status: 'active' | 'expired' | 'upcoming';
  paymentStatus: PaymentStatus;
}

export interface Deployment {
  id: string;
  customerId: string;
  projectName?: string;
  date: string;
  version: string;
  domain: string;
  server: string;
  gitRepo: string;
  status: DeploymentStatus;
  notes: string;
}

export interface Invoice {
  id: string;
  invoiceNumber: string;
  customerId: string;
  date: string;
  dueDate: string;
  items: {
    description: string;
    quantity: number;
    unitPrice: number;
    total: number;
  }[];
  subtotal: number;
  tax: number;
  total: number;
  status: PaymentStatus;
}

export interface Package {
  id: string;
  name: string;
  price: number;
  durationMonths: number;
}

export interface SettingsData {
  id: string;
  agencyName: string;
  supportEmail: string;
  currency: string;
  taxRate: number;
  packages?: Package[];
}

export interface DashboardStats {
  totalCustomers: number;
  activeSubscriptions: number;
  deploymentsThisMonth: number;
  unpaidInvoices: number;
  totalRevenue: number;
  revenueGrowth: number;
  customerGrowth: number;
}
