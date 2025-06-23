
import React from 'react';
import { NodeId, ScopeStackItem } from '../types';
import * as Icons from './Icons';
import Breadcrumbs from './Breadcrumbs';

interface HorizontalToolbarComponentProps {
  // Left Section Props
  onSaveGraph: () => void;
  onLoadGraphRequest: () => void; // Triggers hidden file input click
  onUndo: () => void;
  canUndo: boolean;
  onRedo: () => void;
  canRedo: boolean;
  onCopy: () => void;
  canCopy: boolean;
  onPaste: () => void;
  canPaste: boolean;
  onAlignTop: () => void;
  onDistributeHorizontally: () => void;
  selectedNodeIdsCount: number;

  // Center Section Props
  scopeStack: ScopeStackItem[];
  onNavigateToScope: (targetScopeId: NodeId | 'root', indexInStack: number) => void;
  onFocusGraph: () => void;

  // Right Section Props
  onClearGraph: () => void;
}

const HorizontalToolbarComponent: React.FC<HorizontalToolbarComponentProps> = ({
  onSaveGraph, onLoadGraphRequest, onUndo, canUndo, onRedo, canRedo, onCopy, canCopy, onPaste, canPaste,
  onAlignTop, onDistributeHorizontally, selectedNodeIdsCount,
  scopeStack, onNavigateToScope, onFocusGraph,
  onClearGraph,
}) => {
  const buttonClass = "crystal-button p-2 text-xs";
  const disabledButtonClass = "disabled-look";

  return (
    <div className="flex justify-between items-center w-full h-full px-3 py-1 space-x-3">
      {/* Left Section */}
      <div className="flex items-center space-x-1.5">
        <button onClick={onSaveGraph} className={buttonClass} title="Save Graph (Ctrl/Cmd+S - Future)">
          <Icons.CloudArrowDownIcon className="w-4 h-4" />
        </button>
        <button onClick={onLoadGraphRequest} className={buttonClass} title="Load Graph (Ctrl/Cmd+O - Future)">
          <Icons.CloudArrowUpIcon className="w-4 h-4" />
        </button>
        <div className="w-px h-5 bg-white/10 mx-1"></div>
        <button onClick={onUndo} disabled={!canUndo} className={`${buttonClass} ${!canUndo ? disabledButtonClass : ''}`} title="Undo (Ctrl/Cmd+Z)">
          <Icons.ArrowUturnLeftIcon className="w-4 h-4" />
        </button>
        <button onClick={onRedo} disabled={!canRedo} className={`${buttonClass} ${!canRedo ? disabledButtonClass : ''}`} title="Redo (Ctrl/Cmd+Y)">
          <Icons.ArrowUturnRightIcon className="w-4 h-4" />
        </button>
        <div className="w-px h-5 bg-white/10 mx-1"></div>
        <button onClick={onCopy} disabled={!canCopy} className={`${buttonClass} ${!canCopy ? disabledButtonClass : ''}`} title="Copy (Ctrl/Cmd+C)">
          <Icons.DocumentDuplicateIcon className="w-4 h-4" />
        </button>
        <button onClick={onPaste} disabled={!canPaste} className={`${buttonClass} ${!canPaste ? disabledButtonClass : ''}`} title="Paste (Ctrl/Cmd+V)">
          <Icons.ClipboardDocumentIcon className="w-4 h-4" />
        </button>
        <div className="w-px h-5 bg-white/10 mx-1"></div>
        <button onClick={onAlignTop} disabled={selectedNodeIdsCount < 2} className={`${buttonClass} ${selectedNodeIdsCount < 2 ? disabledButtonClass : ''}`} title="Align Selected Top">
          <Icons.BarsArrowUpIcon className="w-4 h-4" />
        </button>
        {/* <button className={buttonClass} title="Align Horizontal (Future)"> <Icons.BarsArrowDownIcon className="w-4 h-4" /> </button> */}
        <button onClick={onDistributeHorizontally} disabled={selectedNodeIdsCount < 2} className={`${buttonClass} ${selectedNodeIdsCount < 2 ? disabledButtonClass : ''}`} title="Distribute Selected Horizontally">
          <Icons.ArrowsRightLeftIcon className="w-4 h-4" />
        </button>
      </div>

      {/* Center Section */}
      <div className="flex items-center space-x-2">
        <Breadcrumbs scopeStack={scopeStack} onNavigateToScope={onNavigateToScope} />
        <button onClick={onFocusGraph} className={buttonClass} title="Focus Graph">
          <Icons.ViewfinderCircleIcon className="w-4 h-4" />
        </button>
      </div>

      {/* Right Section */}
      <div className="flex items-center">
        <button onClick={onClearGraph} className={`${buttonClass} turquoise-action`} title="Clear Graph">
          <Icons.TrashIcon className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
};

export default HorizontalToolbarComponent;
