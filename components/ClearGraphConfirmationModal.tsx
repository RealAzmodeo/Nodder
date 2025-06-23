
import React from 'react';
import { XMarkIcon, CheckCircleIcon, ArrowDownTrayIcon, TrashIcon as ClearIcon } from './Icons';

interface ClearGraphConfirmationModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSaveAndClear: () => void;
  onClearAnyway: () => void;
  graphName: string;
}

const ClearGraphConfirmationModal: React.FC<ClearGraphConfirmationModalProps> = ({
  isOpen,
  onClose,
  onSaveAndClear,
  onClearAnyway,
  graphName,
}) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="crystal-layer crystal-layer-4 p-6 rounded-lg shadow-2xl w-full max-w-md">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-xl font-semibold text-amber-300">Confirm Clear Graph</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-200 p-1 rounded-full hover:bg-white/10">
            <XMarkIcon className="w-5 h-5" />
          </button>
        </div>

        <p className="text-gray-200 mb-6">
          Are you sure you want to clear all nodes and connections in{' '}
          <strong className="text-sky-300">{graphName}</strong>? This action cannot be undone.
        </p>

        <div className="flex flex-col space-y-3">
          <button
            onClick={onSaveAndClear}
            className="crystal-button primary-action w-full flex items-center justify-center px-4 py-2 text-sm"
            title="Save the current graph as a JSON file, then clear it."
          >
            <ArrowDownTrayIcon className="w-5 h-5 mr-2" />
            Save & Clear Graph
          </button>
          <button
            onClick={onClearAnyway}
            className="crystal-button w-full flex items-center justify-center px-4 py-2 text-sm"
            style={{'--button-accent-rgb': 'var(--danger-accent-rgb)'} as React.CSSProperties}
            title="Clear the graph without saving."
          >
            <ClearIcon className="w-5 h-5 mr-2" />
            Clear Graph Anyway
          </button>
          <button
            onClick={onClose}
            className="crystal-button w-full px-4 py-2 text-sm"
          >
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
};

export default ClearGraphConfirmationModal;
