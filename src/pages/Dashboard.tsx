/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useMemo } from 'react';
import { 
  Users, 
  CreditCard, 
  Globe, 
  AlertCircle, 
  TrendingUp, 
  ArrowUpRight, 
  ArrowDownRight,
  FileText
} from 'lucide-react';
import { 
  AreaChart, 
  Area, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer,
  BarChart,
  Bar,
  Cell
} from 'recharts';
import { Card } from '../components/UI/Components';
import { formatCurrency } from '../lib/utils';
import { useFirestore } from '../hooks/useFirestore';
import { Customer, Subscription, Deployment, Invoice } from '../types';
import { format, subMonths, startOfMonth, subDays } from 'date-fns';

const StatCard = ({ 
  title, 
  value, 
  trend, 
  trendValue, 
  icon: Icon, 
  color 
}: { 
  title: string; 
  value: string | number; 
  trend: 'up' | 'down' | 'neutral'; 
  trendValue: string; 
  icon: React.ElementType;
  color: string;
}) => (
  <Card className="p-6">
    <div className="flex items-start justify-between">
      <div>
        <p className="text-sm font-medium text-slate-500">{title}</p>
        <h3 className="mt-2 text-2xl font-bold text-slate-900">{value}</h3>
        <div className="flex items-center mt-2 gap-1">
          {trend === 'up' ? (
            <ArrowUpRight className="w-4 h-4 text-emerald-500" />
          ) : trend === 'down' ? (
            <ArrowDownRight className="w-4 h-4 text-rose-500" />
          ) : (
            <TrendingUp className="w-4 h-4 text-slate-400" />
          )}
          <span className={trend === 'up' ? 'text-emerald-600 text-sm font-medium' : trend === 'down' ? 'text-rose-600 text-sm font-medium' : 'text-slate-500 text-sm font-medium'}>
            {trendValue}
          </span>
          <span className="text-slate-400 text-sm">vs last month</span>
        </div>
      </div>
      <div className={`p-3 rounded-xl ${color}`}>
        <Icon className="w-6 h-6 text-white" />
      </div>
    </div>
  </Card>
);

export const Dashboard = ({ setActiveTab }: { setActiveTab?: (tab: string) => void }) => {
  const { data: customers } = useFirestore<Customer>('customers');
  const { data: subscriptions } = useFirestore<Subscription>('subscriptions');
  const { data: deployments } = useFirestore<Deployment>('deployments');
  const { data: invoices } = useFirestore<Invoice>('invoices');

  const activeSubscriptions = subscriptions.filter(s => s.status === 'active').length;
  const unpaidInvoices = invoices.filter(i => i.status !== 'paid').length;

  // Calculate real revenue data for the last 6 months
  const revenueChartData = useMemo(() => {
    const data = [];
    const now = new Date();
    for (let i = 5; i >= 0; i--) {
      const monthStart = startOfMonth(subMonths(now, i));
      const monthLabel = format(monthStart, 'MMM');
      
      const monthRevenue = invoices
        .filter(inv => inv.status === 'paid' && inv.date.startsWith(format(monthStart, 'yyyy-MM')))
        .reduce((sum, inv) => sum + inv.total, 0);
        
      data.push({ month: monthLabel, revenue: monthRevenue });
    }
    return data;
  }, [invoices]);

  // Calculate real deployment data for the last 7 days
  const deploymentChartData = useMemo(() => {
    const data = [];
    const now = new Date();
    for (let i = 6; i >= 0; i--) {
      const day = subDays(now, i);
      const dayLabel = format(day, 'EEE');
      const dayString = format(day, 'yyyy-MM-dd');
      
      const dayCount = deployments.filter(d => d.date.startsWith(dayString)).length;
      data.push({ day: dayLabel, count: dayCount });
    }
    return data;
  }, [deployments]);

  // Calculate trends (mocked logic for now, but could be real if we compare to previous month)
  const currentMonthRevenue = revenueChartData[5]?.revenue || 0;
  const previousMonthRevenue = revenueChartData[4]?.revenue || 0;
  const revenueGrowth = previousMonthRevenue === 0 
    ? (currentMonthRevenue > 0 ? 100 : 0) 
    : ((currentMonthRevenue - previousMonthRevenue) / previousMonthRevenue) * 100;

  return (
    <div className="space-y-8">
      {/* Stats Grid */}
      <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-4">
        <StatCard 
          title="Total Customers" 
          value={customers.length} 
          trend="up" 
          trendValue="12%" 
          icon={Users} 
          color="bg-indigo-600"
        />
        <StatCard 
          title="Active Subscriptions" 
          value={activeSubscriptions} 
          trend="up" 
          trendValue="8%" 
          icon={CreditCard} 
          color="bg-emerald-600"
        />
        <StatCard 
          title="Monthly Deployments" 
          value={deployments.filter(d => d.date.startsWith(format(new Date(), 'yyyy-MM'))).length} 
          trend="up" 
          trendValue="24%" 
          icon={Globe} 
          color="bg-sky-600"
        />
        <StatCard 
          title="Unpaid Invoices" 
          value={unpaidInvoices} 
          trend="neutral" 
          trendValue="0%" 
          icon={AlertCircle} 
          color="bg-rose-600"
        />
      </div>

      {/* Charts Section */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <Card className="p-6">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h3 className="text-lg font-bold text-slate-900">Revenue Growth</h3>
              <p className="text-sm text-slate-500">Monthly revenue overview</p>
            </div>
            <div className={`flex items-center gap-2 px-3 py-1 rounded-full text-xs font-bold ${revenueGrowth >= 0 ? 'bg-emerald-50 text-emerald-700' : 'bg-rose-50 text-rose-700'}`}>
              {revenueGrowth >= 0 ? <TrendingUp className="w-3 h-3" /> : <ArrowDownRight className="w-3 h-3" />}
              {revenueGrowth > 0 ? '+' : ''}{revenueGrowth.toFixed(1)}%
            </div>
          </div>
          <div className="h-[300px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={revenueChartData}>
                <defs>
                  <linearGradient id="colorRevenue" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#4f46e5" stopOpacity={0.1}/>
                    <stop offset="95%" stopColor="#4f46e5" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                <XAxis 
                  dataKey="month" 
                  axisLine={false} 
                  tickLine={false} 
                  tick={{ fill: '#64748b', fontSize: 12 }}
                  dy={10}
                />
                <YAxis 
                  axisLine={false} 
                  tickLine={false} 
                  tick={{ fill: '#64748b', fontSize: 12 }}
                  tickFormatter={(value) => `$${value}`}
                />
                <Tooltip 
                  contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)' }}
                  formatter={(value: number) => [`$${value}`, 'Revenue']}
                />
                <Area 
                  type="monotone" 
                  dataKey="revenue" 
                  stroke="#4f46e5" 
                  strokeWidth={3}
                  fillOpacity={1} 
                  fill="url(#colorRevenue)" 
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </Card>

        <Card className="p-6">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h3 className="text-lg font-bold text-slate-900">Deployment Activity</h3>
              <p className="text-sm text-slate-500">Weekly deployment frequency</p>
            </div>
          </div>
          <div className="h-[300px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={deploymentChartData}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                <XAxis 
                  dataKey="day" 
                  axisLine={false} 
                  tickLine={false} 
                  tick={{ fill: '#64748b', fontSize: 12 }}
                  dy={10}
                />
                <YAxis 
                  axisLine={false} 
                  tickLine={false} 
                  tick={{ fill: '#64748b', fontSize: 12 }}
                />
                <Tooltip 
                  cursor={{ fill: '#f8fafc' }}
                  contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)' }}
                />
                <Bar dataKey="count" radius={[6, 6, 0, 0]}>
                  {deploymentChartData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={index === 6 ? '#4f46e5' : '#e2e8f0'} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </Card>
      </div>

      {/* Recent Activity / Quick Actions */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <Card className="p-6 lg:col-span-2">
          <h3 className="mb-6 text-lg font-bold text-slate-900">Recent Invoices</h3>
          <div className="space-y-4">
            {invoices.slice(0, 4).map((invoice) => {
              const customer = customers.find(c => c.id === invoice.customerId);
              return (
                <div key={invoice.id} className="flex items-center justify-between p-4 border border-slate-100 rounded-xl hover:bg-slate-50 transition-colors">
                  <div className="flex items-center gap-4">
                    <div className="w-10 h-10 bg-indigo-100 text-indigo-700 rounded-full flex items-center justify-center font-bold uppercase">
                      {customer?.company?.charAt(0) || '?'}
                    </div>
                    <div>
                      <p className="font-semibold text-slate-900">{customer?.company || 'Unknown'}</p>
                      <p className="text-xs text-slate-500">Invoice {invoice.invoiceNumber}</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="font-bold text-slate-900">{formatCurrency(invoice.total)}</p>
                    <p className={`text-xs font-medium ${invoice.status === 'paid' ? 'text-emerald-600' : 'text-amber-600'}`}>
                      {invoice.status}
                    </p>
                  </div>
                </div>
              );
            })}
            {invoices.length === 0 && (
              <p className="text-slate-500 text-center py-4">No recent invoices.</p>
            )}
          </div>
        </Card>

        <Card className="p-6">
          <h3 className="mb-6 text-lg font-bold text-slate-900">Quick Actions</h3>
          <div className="grid grid-cols-1 gap-3">
            <button 
              onClick={() => setActiveTab && setActiveTab('customers')}
              className="flex items-center gap-3 p-4 text-left border border-slate-100 rounded-xl hover:border-indigo-200 hover:bg-indigo-50/50 transition-all group"
            >
              <div className="p-2 bg-indigo-100 text-indigo-600 rounded-lg group-hover:bg-indigo-600 group-hover:text-white transition-colors">
                <Users className="w-5 h-5" />
              </div>
              <div>
                <p className="text-sm font-bold text-slate-900">Add Customer</p>
                <p className="text-xs text-slate-500">Register a new client</p>
              </div>
            </button>
            <button 
              onClick={() => setActiveTab && setActiveTab('deployments')}
              className="flex items-center gap-3 p-4 text-left border border-slate-100 rounded-xl hover:border-emerald-200 hover:bg-emerald-50/50 transition-all group"
            >
              <div className="p-2 bg-emerald-100 text-emerald-600 rounded-lg group-hover:bg-emerald-600 group-hover:text-white transition-colors">
                <Globe className="w-5 h-5" />
              </div>
              <div>
                <p className="text-sm font-bold text-slate-900">New Deployment</p>
                <p className="text-xs text-slate-500">Push updates to production</p>
              </div>
            </button>
            <button 
              onClick={() => setActiveTab && setActiveTab('invoices')}
              className="flex items-center gap-3 p-4 text-left border border-slate-100 rounded-xl hover:border-sky-200 hover:bg-sky-50/50 transition-all group"
            >
              <div className="p-2 bg-sky-100 text-sky-600 rounded-lg group-hover:bg-sky-600 group-hover:text-white transition-colors">
                <FileText className="w-5 h-5" />
              </div>
              <div>
                <p className="text-sm font-bold text-slate-900">Create Invoice</p>
                <p className="text-xs text-slate-500">Generate billing document</p>
              </div>
            </button>
          </div>
        </Card>
      </div>
    </div>
  );
};
