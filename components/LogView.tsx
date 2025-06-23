
import React, { useEffect, useRef } from 'react';
import { ExecutionMetaState } from '../types';

interface LogViewProps {
  logs: ExecutionMetaState['log'];
}

const LogView: React.FC<LogViewProps> = ({ logs }) => {
  const logContainerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (logContainerRef.current) {
      logContainerRef.current.scrollTop = logContainerRef.current.scrollHeight;
    }
  }, [logs]);

  const getLogColor = (type: ExecutionMetaState['log'][0]['type']): string => {
    switch (type) {
      case 'info': return 'text-sky-300'; 
      case 'error': return 'text-red-300'; 
      case 'success': return 'text-green-300'; 
      case 'debug': return 'text-gray-400'; 
      case 'agent_plan': return 'text-purple-300';
      default: return 'text-gray-200';
    }
  };

  return (
    <div className="h-full bg-transparent p-4 flex flex-col">
      <h2 className="text-lg font-semibold text-on-glass border-b border-[rgba(255,255,255,0.15)] pb-2 mb-3">Execution Log</h2>
      <div ref={logContainerRef} className="flex-grow overflow-y-auto space-y-1 pr-2 scrollbar-thin scrollbar-thumb-gray-500/60 scrollbar-track-transparent">
        {logs.length === 0 && <p className="text-on-glass-dim italic">No logs yet. Perform an action or use the Command Agent to see logs.</p>}
        {logs.map((logEntry, index) => (
          <div 
            key={index} 
            className={`text-xs p-1.5 rounded-md bg-[rgba(255,255,255,0.04)] border border-[rgba(255,255,255,0.08)] ${getLogColor(logEntry.type)}`}
          >
            <span className="font-mono mr-2 text-[rgba(255,255,255,0.7)]">[{new Date(logEntry.timestamp).toLocaleTimeString()}]</span>
            {logEntry.type === 'agent_plan' && <span className="font-semibold mr-1">[Agent Plan]</span>}
            {logEntry.nodeId && <span className="font-semibold mr-1 text-indigo-300">(Node {logEntry.nodeId.substring(0,8)}...)</span>}
            <pre className="whitespace-pre-wrap font-sans">{logEntry.message}</pre>
          </div>
        ))}
      </div>
    </div>
  );
};

export default LogView;
