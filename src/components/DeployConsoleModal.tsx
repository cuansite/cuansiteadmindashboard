import React, { useState, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { Terminal, X, Play, Loader2, CheckCircle2 } from 'lucide-react';
import { Card, Button } from './UI/Components';
import { Deployment } from '../types';

interface DeployConsoleModalProps {
  isOpen: boolean;
  onClose: () => void;
  deployment: Deployment | null;
  onDeployComplete: (id: string, url?: string) => void;
}

export const DeployConsoleModal: React.FC<DeployConsoleModalProps> = ({ isOpen, onClose, deployment, onDeployComplete }) => {
  const [logs, setLogs] = useState<string[]>([]);
  const [isDeploying, setIsDeploying] = useState(false);
  const [isComplete, setIsComplete] = useState(false);
  const logsEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (isOpen) {
      setLogs([`Initializing deployment console for ${deployment?.domain || 'unknown'}...`, 'Ready.']);
      setIsDeploying(false);
      setIsComplete(false);
    }
  }, [isOpen, deployment]);

  useEffect(() => {
    if (logsEndRef.current) {
      logsEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [logs]);

  const startDeployment = async () => {
    if (!deployment) return;
    setIsDeploying(true);
    setLogs(prev => [...prev, '\n> Starting deployment sequence...', `> Target: Vercel`, `> Repository: ${deployment.gitRepo || 'unknown'}`]);

    try {
      const response = await fetch('/api/deploy', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          gitUrl: deployment.gitRepo,
          projectName: deployment.projectName
        })
      });

      const text = await response.text();
      let data;
      try {
        data = JSON.parse(text);
      } catch (e) {
        if (text.includes('502 Bad Gateway') || text.includes('<html')) {
          throw new Error('Server is currently restarting or unavailable (502 Bad Gateway). Please wait a few seconds and try again. If the issue persists, the server might be crashing.');
        }
        throw new Error(`Invalid server response: ${text.substring(0, 100)}`);
      }

      if (!response.ok) {
        throw new Error(data.error || 'Failed to deploy');
      }

      setLogs(prev => [
        ...prev, 
        `> Vercel Deployment Created!`,
        `> Deployment ID: ${data.deploymentId}`,
        `> URL: https://${data.url}`,
        `> Status: ${data.readyState}`,
        `\nDEPLOYMENT SUCCESSFUL`
      ]);

      setIsComplete(true);
      // Pass the real URL back to Deployments.tsx
      onDeployComplete(deployment.id, data.url);
    } catch (error: any) {
      console.error('Deployment error:', error);
      setLogs(prev => [...prev, `\n[ERROR] Deployment failed: ${error.message}`]);
    } finally {
      setIsDeploying(false);
    }
  };

  if (!isOpen || !deployment) return null;

  return createPortal(
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/80 backdrop-blur-sm">
      <Card className="w-full max-w-4xl h-[80vh] flex flex-col overflow-hidden bg-slate-950 border-slate-800 shadow-2xl">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-slate-800 bg-slate-900">
          <div className="flex items-center gap-3">
            <Terminal className="w-5 h-5 text-emerald-500" />
            <div>
              <h3 className="text-sm font-bold text-slate-200">Deployment Console</h3>
              <p className="text-xs text-slate-500">{deployment.domain} • {deployment.server}</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {!isDeploying && !isComplete && (
              <Button size="sm" className="gap-2 bg-emerald-600 hover:bg-emerald-700 text-white border-none" onClick={startDeployment}>
                <Play className="w-4 h-4" />
                Start Deploy
              </Button>
            )}
            {isDeploying && (
              <div className="flex items-center gap-2 px-3 py-1.5 bg-slate-800 rounded-md text-xs font-medium text-sky-400">
                <Loader2 className="w-3 h-3 animate-spin" />
                Deploying...
              </div>
            )}
            {isComplete && (
              <div className="flex items-center gap-2 px-3 py-1.5 bg-emerald-900/30 rounded-md text-xs font-medium text-emerald-400">
                <CheckCircle2 className="w-3 h-3" />
                Deployed
              </div>
            )}
            <Button variant="ghost" size="icon" onClick={onClose} className="text-slate-400 hover:text-slate-200 hover:bg-slate-800" disabled={isDeploying}>
              <X className="w-5 h-5" />
            </Button>
          </div>
        </div>

        {/* Terminal Output */}
        <div className="flex-1 p-4 overflow-y-auto font-mono text-sm bg-slate-950 text-slate-300">
          {logs.map((log, index) => (
            <div key={index} className="whitespace-pre-wrap break-all leading-relaxed">
              {log}
            </div>
          ))}
          <div ref={logsEndRef} />
        </div>
      </Card>
    </div>,
    document.body
  );
};
