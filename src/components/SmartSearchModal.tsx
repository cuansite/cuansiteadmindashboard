import React, { useState, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { Search, X, Sparkles, FileText, Users, CreditCard, Globe, Loader2 } from 'lucide-react';
import { Card, Button } from './UI/Components';
import { useFirestore } from '../hooks/useFirestore';
import { Customer, Invoice, Subscription, Deployment } from '../types';
import { GoogleGenAI, ThinkingLevel } from '@google/genai';
import ReactMarkdown from 'react-markdown';
import { cn } from '../lib/utils';

interface SmartSearchModalProps {
  isOpen: boolean;
  onClose: () => void;
  onNavigate: (tab: string) => void;
}

// Initialize Gemini
const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

export const SmartSearchModal: React.FC<SmartSearchModalProps> = ({ isOpen, onClose, onNavigate }) => {
  const [query, setQuery] = useState('');
  const [isAiMode, setIsAiMode] = useState(false);
  const [aiResponse, setAiResponse] = useState('');
  const [isAiLoading, setIsAiLoading] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const { data: customers } = useFirestore<Customer>('customers');
  const { data: invoices } = useFirestore<Invoice>('invoices');
  const { data: subscriptions } = useFirestore<Subscription>('subscriptions');
  const { data: deployments } = useFirestore<Deployment>('deployments');

  useEffect(() => {
    if (isOpen) {
      setTimeout(() => inputRef.current?.focus(), 100);
    } else {
      setQuery('');
      setIsAiMode(false);
      setAiResponse('');
    }
  }, [isOpen]);

  if (!isOpen) return null;

  // Local Search Logic
  const lowerQuery = query.toLowerCase();
  const filteredCustomers = query ? customers.filter(c => c.name.toLowerCase().includes(lowerQuery) || c.company.toLowerCase().includes(lowerQuery)).slice(0, 3) : [];
  const filteredInvoices = query ? invoices.filter(i => i.invoiceNumber.toLowerCase().includes(lowerQuery)).slice(0, 3) : [];
  const filteredSubscriptions = query ? subscriptions.filter(s => s.plan.toLowerCase().includes(lowerQuery)).slice(0, 3) : [];
  const filteredDeployments = query ? deployments.filter(d => d.projectName.toLowerCase().includes(lowerQuery) || d.environment.toLowerCase().includes(lowerQuery)).slice(0, 3) : [];

  const hasLocalResults = filteredCustomers.length > 0 || filteredInvoices.length > 0 || filteredSubscriptions.length > 0 || filteredDeployments.length > 0;

  const handleAskAi = async () => {
    if (!query.trim()) return;
    setIsAiMode(true);
    setIsAiLoading(true);
    setAiResponse('');

    try {
      const contextData = JSON.stringify({
        customers: customers.map(c => ({ id: c.id, name: c.name, company: c.company, email: c.email })),
        invoices: invoices.map(i => ({ id: i.id, number: i.invoiceNumber, amount: i.total, status: i.status, customerId: i.customerId })),
        subscriptions: subscriptions.map(s => ({ id: s.id, plan: s.plan, status: s.status, customerId: s.customerId })),
        deployments: deployments.map(d => ({ id: d.id, project: d.projectName, status: d.status, env: d.environment }))
      });

      const prompt = `You are an AI assistant for the Nexus Agency Admin dashboard.
The user asked: "${query}"

Here is the current agency data in JSON format:
${contextData}

Please provide a helpful, concise answer based on this data. If the user asks for specific records, list them clearly. Use markdown formatting.`;

      const responseStream = await ai.models.generateContentStream({
        model: 'gemini-3.1-pro-preview',
        contents: prompt,
        config: {
          thinkingConfig: { thinkingLevel: ThinkingLevel.HIGH }
        }
      });

      for await (const chunk of responseStream) {
        setAiResponse(prev => prev + chunk.text);
      }
    } catch (error) {
      console.error('AI Search Error:', error);
      setAiResponse('Sorry, I encountered an error while processing your request.');
    } finally {
      setIsAiLoading(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Escape') onClose();
    if (e.key === 'Enter' && query.trim() && !isAiMode) {
      handleAskAi();
    }
  };

  return createPortal(
    <div className="fixed inset-0 z-[100] flex items-start justify-center pt-20 px-4 bg-slate-900/50 backdrop-blur-sm" onClick={onClose}>
      <Card 
        className="w-full max-w-2xl overflow-hidden shadow-2xl flex flex-col max-h-[80vh]" 
        onClick={e => e.stopPropagation()}
      >
        <div className="relative flex items-center p-4 border-b border-slate-100">
          <Search className="w-5 h-5 text-slate-400 absolute left-6" />
          <input
            ref={inputRef}
            type="text"
            value={query}
            onChange={e => setQuery(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Search customers, invoices, or ask Gemini..."
            className="w-full h-12 pl-10 pr-24 text-lg bg-transparent border-none focus:outline-none focus:ring-0 text-slate-900 placeholder:text-slate-400"
          />
          <div className="absolute right-4 flex items-center gap-2">
            {query.trim() && !isAiMode && (
              <Button size="sm" className="gap-2 bg-indigo-50 text-indigo-700 hover:bg-indigo-100" onClick={handleAskAi}>
                <Sparkles className="w-4 h-4" />
                Ask AI
              </Button>
            )}
            <Button variant="ghost" size="icon" onClick={onClose} className="h-8 w-8">
              <X className="w-4 h-4" />
            </Button>
          </div>
        </div>

        <div className="overflow-y-auto flex-1 min-h-[100px] p-4">
          {isAiMode ? (
            <div className="space-y-4">
              <div className="flex items-center gap-2 text-indigo-600 font-medium mb-4">
                <Sparkles className="w-5 h-5" />
                <span>Gemini AI Response</span>
              </div>
              {isAiLoading && !aiResponse ? (
                <div className="flex items-center justify-center py-8 text-slate-400">
                  <Loader2 className="w-6 h-6 animate-spin" />
                  <span className="ml-2">Thinking...</span>
                </div>
              ) : (
                <div className="prose prose-slate max-w-none prose-sm">
                  <ReactMarkdown>{aiResponse}</ReactMarkdown>
                </div>
              )}
            </div>
          ) : query.trim() ? (
            <div className="space-y-6">
              {filteredCustomers.length > 0 && (
                <div>
                  <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2 px-2">Customers</h3>
                  {filteredCustomers.map(c => (
                    <div key={c.id} className="flex items-center gap-3 p-2 hover:bg-slate-50 rounded-lg cursor-pointer" onClick={() => { onNavigate('customers'); onClose(); }}>
                      <Users className="w-4 h-4 text-slate-400" />
                      <div>
                        <p className="text-sm font-medium text-slate-900">{c.company}</p>
                        <p className="text-xs text-slate-500">{c.name}</p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
              
              {filteredInvoices.length > 0 && (
                <div>
                  <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2 px-2">Invoices</h3>
                  {filteredInvoices.map(i => (
                    <div key={i.id} className="flex items-center gap-3 p-2 hover:bg-slate-50 rounded-lg cursor-pointer" onClick={() => { onNavigate('invoices'); onClose(); }}>
                      <FileText className="w-4 h-4 text-slate-400" />
                      <div>
                        <p className="text-sm font-medium text-slate-900">{i.invoiceNumber}</p>
                        <p className="text-xs text-slate-500 capitalize">{i.status}</p>
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {filteredSubscriptions.length > 0 && (
                <div>
                  <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2 px-2">Subscriptions</h3>
                  {filteredSubscriptions.map(s => (
                    <div key={s.id} className="flex items-center gap-3 p-2 hover:bg-slate-50 rounded-lg cursor-pointer" onClick={() => { onNavigate('subscriptions'); onClose(); }}>
                      <CreditCard className="w-4 h-4 text-slate-400" />
                      <div>
                        <p className="text-sm font-medium text-slate-900">{s.plan} Plan</p>
                        <p className="text-xs text-slate-500 capitalize">{s.status}</p>
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {filteredDeployments.length > 0 && (
                <div>
                  <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2 px-2">Deployments</h3>
                  {filteredDeployments.map(d => (
                    <div key={d.id} className="flex items-center gap-3 p-2 hover:bg-slate-50 rounded-lg cursor-pointer" onClick={() => { onNavigate('deployments'); onClose(); }}>
                      <Globe className="w-4 h-4 text-slate-400" />
                      <div>
                        <p className="text-sm font-medium text-slate-900">{d.projectName}</p>
                        <p className="text-xs text-slate-500 capitalize">{d.environment} • {d.status}</p>
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {!hasLocalResults && (
                <div className="text-center py-8">
                  <p className="text-slate-500 mb-4">No exact matches found.</p>
                  <Button className="gap-2" onClick={handleAskAi}>
                    <Sparkles className="w-4 h-4" />
                    Ask Gemini to search
                  </Button>
                </div>
              )}
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center py-12 text-slate-400">
              <Search className="w-12 h-12 mb-4 opacity-20" />
              <p>Type to search or ask a question...</p>
              <div className="flex gap-2 mt-4">
                <Badge>Try: "Show unpaid invoices"</Badge>
                <Badge>Try: "Who are my customers?"</Badge>
              </div>
            </div>
          )}
        </div>
        
        <div className="bg-slate-50 border-t border-slate-100 p-3 flex items-center justify-between text-xs text-slate-500">
          <div className="flex items-center gap-4">
            <span className="flex items-center gap-1"><kbd className="px-1.5 py-0.5 bg-white border border-slate-200 rounded text-[10px] font-mono">âµ</kbd> to Ask AI</span>
            <span className="flex items-center gap-1"><kbd className="px-1.5 py-0.5 bg-white border border-slate-200 rounded text-[10px] font-mono">ESC</kbd> to close</span>
          </div>
          <div className="flex items-center gap-1 text-indigo-600 font-medium">
            <Sparkles className="w-3 h-3" />
            Powered by Gemini
          </div>
        </div>
      </Card>
    </div>,
    document.body
  );
};

const Badge = ({ children }: { children: React.ReactNode }) => (
  <span className="px-2 py-1 bg-slate-100 text-slate-600 rounded-md text-xs font-medium">
    {children}
  </span>
);
