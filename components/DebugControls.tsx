
import React from 'react';
import { PlayIcon as ResumeIcon, StopIcon, ArrowRightIcon as StepOverIcon } from './Icons'; 

interface DebugControlsProps {
  isPaused: boolean;
  isExecuting: boolean; 
  onResume: () => void;
  onStepOver: () => void;
  onStop: () => void;
}

const DebugControls: React.FC<DebugControlsProps> = ({
  isPaused,
  isExecuting,
  onResume,
  onStepOver,
  onStop,
}) => {
  const baseButtonClass = "crystal-button flex-1 px-3 py-2 text-sm flex items-center justify-center";
  const disabledClass = "disabled-look"; 

  return (
    <div className="p-2 border-t border-[rgba(255,255,255,0.08)] crystal-layer crystal-layer-3"
         style={{boxShadow: '0 -2px 8px rgba(0,0,0,0.1)', borderRadius: '0 0 0.75rem 0.75rem'}}>
      <h3 className="text-xs font-semibold text-on-glass-dim mb-2 tracking-wider uppercase text-center">Debugger</h3>
      <div className="flex space-x-2">
        <button
          onClick={onResume}
          disabled={!isPaused || isExecuting}
          className={`${baseButtonClass} ${(!isPaused || isExecuting) ? disabledClass : ''}`}
          style={(!isPaused || isExecuting) ? undefined : {'--button-accent-rgb': 'var(--success-accent-rgb)'} as React.CSSProperties}
          title="Resume Execution (F8)"
        >
          <ResumeIcon className="w-4 h-4 mr-1.5" />
          Resume
        </button>
        <button
          onClick={onStepOver}
          disabled={!isPaused || isExecuting}
          className={`${baseButtonClass} ${(!isPaused || isExecuting) ? disabledClass : ''}`}
          title="Step Over (F10)"
        >
          <StepOverIcon className="w-4 h-4 mr-1.5" />
          Step Over
        </button>
        <button
          onClick={onStop}
          disabled={!isPaused && !isExecuting} 
          className={`${baseButtonClass} ${(!isPaused && !isExecuting) ? disabledClass : ''}`}
          style={(!isPaused && !isExecuting) ? undefined : {'--button-accent-rgb': 'var(--danger-accent-rgb)'} as React.CSSProperties}
          title="Stop Execution (Shift+F5)"
        >
          <StopIcon className="w-4 h-4 mr-1.5" />
          Stop
        </button>
      </div>
       {isPaused && <p className="text-xs text-amber-300 text-center mt-2 italic">Execution Paused. Use controls to proceed.</p>}
    </div>
  );
};

export default DebugControls;
