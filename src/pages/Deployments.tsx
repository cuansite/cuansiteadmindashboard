/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { createPortal } from 'react-dom';
import { 
  Globe, 
  GitBranch, 
  Server, 
  Clock, 
  CheckCircle2, 
  XCircle, 
  AlertCircle,
  Plus,
  ExternalLink,
  X,
  Settings,
  Play,
  Trash2,
  Github,
  Rocket
} from 'lucide-react';
import { Card, Button, Badge, ConfirmModal } from '../components/UI/Components';
import { Deployment, Customer } from '../types';
import { cn, formatDate } from '../lib/utils';
import { useFirestore } from '../hooks/useFirestore';
import { DeployConsoleModal } from '../components/DeployConsoleModal';

const StatusIcon = ({ status }: { status: string }) => {
  switch (status) {
    case 'deployed': return <CheckCircle2 className="w-5 h-5 text-emerald-500" />;
    case 'failed': return <XCircle className="w-5 h-5 text-rose-500" />;
    case 'in-progress': return <Clock className="w-5 h-5 text-sky-500 animate-pulse" />;
    case 'pending': return <AlertCircle className="w-5 h-5 text-amber-500" />;
    default: return <CheckCircle2 className="w-5 h-5 text-slate-400" />;
  }
};

export const Deployments = () => {
  const { data: deployments, loading, add, update, remove } = useFirestore<Deployment>('deployments');
  const { data: customers } = useFirestore<Customer>('customers');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isConsoleOpen, setIsConsoleOpen] = useState(false);
  const [activeDeployment, setActiveDeployment] = useState<Deployment | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [editingDeployment, setEditingDeployment] = useState<Deployment | null>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [formData, setFormData] = useState<Partial<Deployment>>({
    customerId: '',
    projectName: '',
    date: new Date().toISOString().split('T')[0],
    version: 'v1.0.0',
    domain: '',
    server: 'Nexus Edge Network',
    gitRepo: '',
    status: 'pending',
    notes: ''
  });

  const handleOpenDeployWizard = () => {
    setEditingDeployment(null);
    setFormData({
      customerId: customers[0]?.id || '',
      projectName: '',
      date: new Date().toISOString().split('T')[0],
      version: 'v1.0.0',
      domain: '',
      server: 'Nexus Edge Network',
      gitRepo: '',
      status: 'pending',
      notes: ''
    });
    setIsModalOpen(true);
  };

  const handleOpenSettings = (deployment: Deployment) => {
    setEditingDeployment(deployment);
    setFormData(deployment);
    setIsModalOpen(true);
  };

  const handleStartDeployment = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    try {
      const generatedDomain = `${(formData.projectName || 'project').toLowerCase().replace(/[^a-z0-9]/g, '-')}.nexus-edge.app`;
      const newDeployment = {
        ...formData,
        domain: generatedDomain,
        status: 'pending'
      };
      const newId = await add(newDeployment as any);
      setIsModalOpen(false);
      
      setActiveDeployment({ id: newId, ...newDeployment } as Deployment);
      setIsConsoleOpen(true);
    } catch (error) {
      console.error('Error starting deployment:', error);
    } finally {
      setIsSaving(false);
    }
  };

  const handleUpdateSettings = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingDeployment) return;
    setIsSaving(true);
    try {
      await update(editingDeployment.id, formData);
      setIsModalOpen(false);
    } catch (error) {
      console.error('Error updating deployment:', error);
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
        console.error('Error deleting deployment:', error);
      }
    }
  };

  const handleDeployComplete = async (id: string, url?: string) => {
    try {
      const updateData: Partial<Deployment> = { status: 'deployed' };
      if (url) {
        updateData.domain = url;
        updateData.server = 'Vercel';
      }
      await update(id, updateData);
    } catch (error) {
      console.error('Failed to update deployment status', error);
    }
  };

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-slate-900">Deployment History</h2>
          <p className="text-slate-500">Monitor and manage your website deployments</p>
        </div>
        <Button className="gap-2" onClick={handleOpenDeployWizard}>
          <Rocket className="w-4 h-4" />
          Deploy Project
        </Button>
      </div>

      <div className="grid grid-cols-1 gap-8 lg:grid-cols-3">
        {/* Timeline */}
        <div className="lg:col-span-2 space-y-6">
          {loading ? (
            <p className="text-slate-500">Loading deployments...</p>
          ) : deployments.length === 0 ? (
            <Card className="p-12 text-center">
              <Globe className="w-12 h-12 text-slate-300 mx-auto mb-4" />
              <p className="text-slate-500 font-medium">No deployments found.</p>
              <Button variant="outline" className="mt-4" onClick={handleOpenDeployWizard}>Deploy your first project</Button>
            </Card>
          ) : (
            deployments.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()).map((deployment, idx) => {
              const customer = customers.find(c => c.id === deployment.customerId);
              return (
                <div key={deployment.id} className="relative pl-8 group">
                  {/* Timeline Line */}
                  {idx !== deployments.length - 1 && (
                    <div className="absolute left-[11px] top-8 bottom-[-24px] w-[2px] bg-slate-100 group-hover:bg-indigo-100 transition-colors" />
                  )}
                  
                  {/* Timeline Dot */}
                  <div className="absolute left-0 top-1.5 z-10">
                    <div className="flex items-center justify-center w-6 h-6 rounded-full bg-white border-2 border-slate-200 group-hover:border-indigo-500 transition-colors">
                      <div className={cn(
                        "w-2 h-2 rounded-full",
                        deployment.status === 'deployed' ? "bg-emerald-500" : 
                        deployment.status === 'failed' ? "bg-rose-500" : "bg-sky-500"
                      )} />
                    </div>
                  </div>

                  <Card className="p-6 hover:border-indigo-200 transition-all">
                    <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
                      <div className="space-y-1">
                        <div className="flex items-center gap-2">
                          <h4 className="font-bold text-slate-900">{deployment.projectName || customer?.company || 'Unknown Project'}</h4>
                          <Badge variant={
                            deployment.status === 'deployed' ? 'success' : 
                            deployment.status === 'failed' ? 'danger' : 'info'
                          }>
                            {deployment.status}
                          </Badge>
                        </div>
                        <p className="text-sm text-slate-500">{customer?.company} • {deployment.notes || 'No description'}</p>
                      </div>
                      <div className="text-right">
                        <p className="text-sm font-medium text-slate-900">{formatDate(deployment.date)}</p>
                        <p className="text-xs text-slate-400">{deployment.version}</p>
                      </div>
                    </div>

                    <div className="grid grid-cols-1 gap-4 mt-6 md:grid-cols-3">
                      <div className="flex items-center gap-2 px-3 py-2 bg-slate-50 rounded-lg">
                        <Globe className="w-4 h-4 text-slate-400" />
                        <span className="text-xs font-medium text-slate-600 truncate">{deployment.domain}</span>
                      </div>
                      <div className="flex items-center gap-2 px-3 py-2 bg-slate-50 rounded-lg">
                        <Server className="w-4 h-4 text-slate-400" />
                        <span className="text-xs font-medium text-slate-600 truncate">{deployment.server}</span>
                      </div>
                      <div className="flex items-center gap-2 px-3 py-2 bg-slate-50 rounded-lg">
                        <GitBranch className="w-4 h-4 text-slate-400" />
                        <span className="text-xs font-medium text-slate-600 truncate">main</span>
                      </div>
                    </div>

                    <div className="flex items-center justify-end gap-3 mt-6 pt-4 border-t border-slate-100">
                      <Button 
                        variant="ghost" 
                        size="sm" 
                        className="gap-2 text-emerald-600 hover:bg-emerald-50 hover:text-emerald-700" 
                        onClick={() => {
                          setActiveDeployment(deployment);
                          setIsConsoleOpen(true);
                        }}
                      >
                        <Play className="w-4 h-4" />
                        Deploy
                      </Button>
                      <Button variant="ghost" size="sm" className="gap-2 text-slate-500 hover:bg-slate-50 hover:text-slate-600" onClick={() => handleOpenSettings(deployment)}>
                        <Settings className="w-4 h-4" />
                        Settings
                      </Button>
                      <Button variant="ghost" size="sm" className="gap-2 text-rose-500 hover:bg-rose-50 hover:text-rose-600" onClick={() => setDeleteId(deployment.id)}>
                        <Trash2 className="w-4 h-4" />
                        Delete
                      </Button>
                      <Button variant="outline" size="sm" className="gap-2" onClick={() => window.open(`https://${deployment.domain}`, '_blank')}>
                        <ExternalLink className="w-3 h-3" />
                        Visit Site
                      </Button>
                    </div>
                  </Card>
                </div>
              );
            })
          )}
        </div>

        {/* Sidebar Info */}
        <div className="space-y-6">
          <Card className="p-6 bg-indigo-600 text-white">
            <h3 className="text-lg font-bold mb-2">Deployment Stats</h3>
            <p className="text-indigo-100 text-sm mb-6">Overview of your infrastructure health</p>
            
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <span className="text-sm text-indigo-100">Uptime</span>
                <span className="text-sm font-bold">99.98%</span>
              </div>
              <div className="w-full bg-indigo-500/50 h-1.5 rounded-full overflow-hidden">
                <div className="bg-white h-full w-[99.98%]" />
              </div>
              
              <div className="flex items-center justify-between pt-2">
                <span className="text-sm text-indigo-100">Success Rate</span>
                <span className="text-sm font-bold">
                  {deployments.length > 0 
                    ? Math.round((deployments.filter(d => d.status === 'deployed').length / deployments.length) * 100) 
                    : 0}%
                </span>
              </div>
              <div className="w-full bg-indigo-500/50 h-1.5 rounded-full overflow-hidden">
                <div className="bg-white h-full" style={{ width: `${deployments.length > 0 ? (deployments.filter(d => d.status === 'deployed').length / deployments.length) * 100 : 0}%` }} />
              </div>
            </div>

            <div className="mt-8 p-4 bg-white/10 rounded-xl border border-white/20">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-white/20 rounded-lg">
                  <CheckCircle2 className="w-5 h-5" />
                </div>
                <div>
                  <p className="text-xs font-medium text-indigo-100 uppercase tracking-wider">Status</p>
                  <p className="text-sm font-bold">All Systems Operational</p>
                </div>
              </div>
            </div>
          </Card>
        </div>
      </div>

      <ConfirmModal
        isOpen={!!deleteId}
        title="Delete Deployment"
        message="Are you sure you want to delete this deployment? This action cannot be undone."
        confirmText="Delete"
        cancelText="Cancel"
        isDestructive={true}
        onConfirm={handleDelete}
        onCancel={() => setDeleteId(null)}
      />

      <DeployConsoleModal
        isOpen={isConsoleOpen}
        onClose={() => setIsConsoleOpen(false)}
        deployment={activeDeployment}
        onDeployComplete={handleDeployComplete}
      />

      {/* Modal */}
      {isModalOpen && createPortal(
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm">
          <Card className="w-full max-w-2xl max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between p-6 border-b border-slate-100 sticky top-0 bg-white z-10">
              <h3 className="text-lg font-bold text-slate-900">
                {editingDeployment ? 'Deployment Settings' : 'Deploy New Project'}
              </h3>
              <Button variant="ghost" size="icon" onClick={() => setIsModalOpen(false)}>
                <X className="w-5 h-5" />
              </Button>
            </div>
            {editingDeployment ? (
              <form onSubmit={handleUpdateSettings} className="p-6 space-y-6">
                <div className="space-y-4">
                  <div className="space-y-2">
                    <label className="text-sm font-medium text-slate-700">Project Name</label>
                    <input 
                      required
                      type="text" 
                      value={formData.projectName || ''}
                      onChange={e => setFormData({...formData, projectName: e.target.value})}
                      className="w-full h-10 px-3 bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500/20" 
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-medium text-slate-700">Custom Domain</label>
                    <input 
                      required
                      type="text" 
                      value={formData.domain || ''}
                      onChange={e => setFormData({...formData, domain: e.target.value})}
                      className="w-full h-10 px-3 bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500/20" 
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-medium text-slate-700">Git Repository</label>
                    <input 
                      type="text" 
                      value={formData.gitRepo || ''}
                      onChange={e => setFormData({...formData, gitRepo: e.target.value})}
                      className="w-full h-10 px-3 bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500/20" 
                    />
                  </div>
                </div>
                <div className="flex justify-end gap-3 pt-6 border-t border-slate-100">
                  <Button type="button" variant="outline" onClick={() => setIsModalOpen(false)} disabled={isSaving}>Cancel</Button>
                  <Button type="submit" disabled={isSaving}>Save Changes</Button>
                </div>
              </form>
            ) : (
              <form onSubmit={handleStartDeployment} className="p-6 space-y-6">
                <div className="p-4 border border-slate-200 rounded-xl bg-slate-50 flex items-start gap-4">
                  <div className="p-3 bg-white rounded-lg shadow-sm border border-slate-200">
                    <Github className="w-6 h-6 text-slate-700" />
                  </div>
                  <div>
                    <h4 className="font-semibold text-slate-900">Deploy from Git Repository</h4>
                    <p className="text-sm text-slate-500">Connect your repository to automatically build and deploy to Nexus Edge.</p>
                  </div>
                </div>
                
                <div className="space-y-4">
                  <div className="space-y-2">
                    <label className="text-sm font-medium text-slate-700">Customer / Owner</label>
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
                    <label className="text-sm font-medium text-slate-700">Project Name</label>
                    <input 
                      required
                      type="text" 
                      placeholder="e.g. my-awesome-app"
                      value={formData.projectName || ''}
                      onChange={e => setFormData({...formData, projectName: e.target.value})}
                      className="w-full h-10 px-3 bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500/20" 
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-medium text-slate-700">Git Repository URL</label>
                    <input 
                      required
                      type="text" 
                      placeholder="https://github.com/username/repo"
                      value={formData.gitRepo || ''}
                      onChange={e => setFormData({...formData, gitRepo: e.target.value})}
                      className="w-full h-10 px-3 bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500/20" 
                    />
                  </div>
                </div>
                
                <div className="flex justify-end gap-3 pt-6 border-t border-slate-100">
                  <Button type="button" variant="outline" onClick={() => setIsModalOpen(false)} disabled={isSaving}>Cancel</Button>
                  <Button type="submit" disabled={isSaving} className="gap-2 bg-indigo-600 hover:bg-indigo-700">
                    <Rocket className="w-4 h-4" />
                    Deploy Now
                  </Button>
                </div>
              </form>
            )}
          </Card>
        </div>,
        document.body
      )}
    </div>
  );
};
