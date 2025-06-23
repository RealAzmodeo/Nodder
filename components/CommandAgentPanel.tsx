
import React, { useState, useCallback, useEffect, useRef } from 'react';
import { AgentPlan, OperationTypeEnum, AutocompleteItem } from '../types';
import { PaperAirplaneIcon, CheckCircleIcon, XCircleIcon, SparklesIcon, CubeTransparentIcon } from './Icons'; 
import { NODE_TYPE_COLORS } from '../constants';

interface CommandAgentPanelProps {
  isProcessing: boolean;
  onSubmit: (command: string) => void;
  plan: AgentPlan | null;
  onCommit: () => void;
  onDiscard: () => void;
  searchableNodeTypes: AutocompleteItem[];
  onAddItemFromSearch: (item: AutocompleteItem) => void;
  inputRef?: React.RefObject<HTMLInputElement>; 
}

const CommandAgentPanel: React.FC<CommandAgentPanelProps> = ({
  isProcessing,
  onSubmit,
  plan,
  onCommit,
  onDiscard,
  searchableNodeTypes,
  onAddItemFromSearch,
  inputRef: externalInputRef,
}) => {
  const [command, setCommand] = useState('');
  const [searchResults, setSearchResults] = useState<AutocompleteItem[]>([]);
  const [showSearchResults, setShowSearchResults] = useState(false);
  const [activeIndex, setActiveIndex] = useState(-1);
  const internalInputRef = useRef<HTMLInputElement>(null);
  const inputRef = externalInputRef || internalInputRef;


  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const query = e.target.value;
    setCommand(query);
    setActiveIndex(-1); 

    if (query.trim().length > 0 && !plan) {
      const filteredResults = searchableNodeTypes.filter(item =>
        item.name.toLowerCase().includes(query.toLowerCase()) ||
        (item.operationType && item.operationType.toLowerCase().replace(/_/g, " ").includes(query.toLowerCase()))
      );
      setSearchResults(filteredResults.slice(0, 10)); 
      setShowSearchResults(filteredResults.length > 0);
    } else {
      setShowSearchResults(false);
    }
  };

  const handleSelectSearchResult = (item: AutocompleteItem) => {
    onAddItemFromSearch(item);
    setCommand('');
    setShowSearchResults(false);
    setSearchResults([]);
    setActiveIndex(-1);
    if (inputRef.current) {
        inputRef.current.blur(); 
    }
  };

  const handleSubmit = (e?: React.FormEvent) => {
    e?.preventDefault();
    if (showSearchResults && activeIndex >= 0 && searchResults[activeIndex]) {
      handleSelectSearchResult(searchResults[activeIndex]);
    } else if (command.trim() && !isProcessing && !plan) {
      onSubmit(command);
      setShowSearchResults(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (showSearchResults && searchResults.length > 0) {
      if (e.key === 'ArrowDown') {
        e.preventDefault();
        setActiveIndex(prev => (prev + 1) % searchResults.length);
      } else if (e.key === 'ArrowUp') {
        e.preventDefault();
        setActiveIndex(prev => (prev - 1 + searchResults.length) % searchResults.length);
      } else if (e.key === 'Enter') {
        e.preventDefault();
        handleSubmit(); 
      } else if (e.key === 'Escape') {
        e.preventDefault();
        setShowSearchResults(false);
        setActiveIndex(-1);
      }
    } else if (e.key === 'Enter' && !isProcessing && !plan && command.trim()) {
        e.preventDefault();
        handleSubmit(); 
    }
  };

  useEffect(() => {
    if (activeIndex >= 0 && showSearchResults) {
      const activeItemElement = document.getElementById(`search-item-${activeIndex}`);
      activeItemElement?.scrollIntoView({ block: 'nearest' });
    }
  }, [activeIndex, showSearchResults]);


  return (
    <div className={`relative flex-shrink-0 p-3 crystal-layer crystal-layer-3 crystal-layer-3-bottom ${isProcessing ? 'agent-panel-processing' : ''}`}>
      <form onSubmit={handleSubmit} className="flex items-center space-x-3 mb-2">
        <div className="relative flex-grow">
            <input
                ref={inputRef}
                type="text"
                value={command}
                onChange={handleInputChange}
                onKeyDown={handleKeyDown}
                placeholder="Search nodes (e.g. 'add', 'value') or describe logic for AI..."
                className="w-full p-2.5 text-sm bg-[rgba(30,33,40,0.6)] border border-[rgba(255,255,255,0.15)] rounded-md focus:ring-1 focus:ring-purple-400 focus:border-purple-400 placeholder-gray-400 text-gray-100"
                disabled={isProcessing || !!plan}
                aria-label="Command or Search Input"
                onFocus={() => { if (command.trim().length > 0 && searchResults.length > 0 && !plan) setShowSearchResults(true);}}
            />
            {showSearchResults && searchResults.length > 0 && (
             <div 
                className="absolute bottom-full left-0 right-0 mb-1 crystal-layer crystal-layer-4 p-1 rounded-md shadow-lg max-h-60 overflow-y-auto z-20 scrollbar-thin scrollbar-thumb-gray-500/50 scrollbar-track-transparent"
                role="listbox"
             >
                {searchResults.map((item, index) => {
                    const Icon = item.icon;
                    const itemTypeText = item.type === 'atomic' ? 'Atomic Node' : 'Component';
                    const isItemActive = index === activeIndex;
                    const nodeColorDetails = item.operationType ? (NODE_TYPE_COLORS[item.operationType] || NODE_TYPE_COLORS.ASSIGN) : { headerText: 'text-gray-300' };

                    return (
                        <div
                        key={item.id}
                        id={`search-item-${index}`}
                        role="option"
                        aria-selected={isItemActive}
                        onClick={() => handleSelectSearchResult(item)}
                        onMouseEnter={() => setActiveIndex(index)}
                        className={`flex items-center p-2 text-sm rounded-md cursor-pointer hover:bg-[rgba(var(--accent-rgb),0.15)] ${
                            isItemActive ? 'bg-[rgba(var(--accent-rgb),0.25)]' : ''
                        }`}
                        >
                        <Icon className={`w-4 h-4 mr-2.5 flex-shrink-0 ${isItemActive ? 'text-white': nodeColorDetails.headerText}`} />
                        <span className={`flex-grow truncate ${isItemActive ? 'text-white font-semibold' : 'text-gray-200'}`}>{item.name}</span>
                        <span className={`ml-2 text-xs ${isItemActive ? 'text-sky-200' : 'text-gray-400'}`}>{itemTypeText}</span>
                        </div>
                    );
                })}
            </div>
            )}
        </div>
        <button
          type="submit"
          disabled={isProcessing || (!command.trim() && !plan) || (command.trim() && showSearchResults && activeIndex !== -1 && !!searchResults[activeIndex])}
          className="crystal-button primary-action px-4 py-2.5 text-sm flex items-center justify-center"
          style={{minWidth: '100px'}}
          title={ (showSearchResults && activeIndex !== -1 && !!searchResults[activeIndex]) ? "Press Enter to add selected node" : "Send command to AI Agent"}
        >
          {isProcessing ? (
            <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
            </svg>
          ) : (
            <PaperAirplaneIcon className="w-4 h-4 mr-2" />
          )}
          {isProcessing ? 'Thinking...' : 'Send AI'}
        </button>
      </form>

      {plan && (
        <div className="mt-2 p-3 bg-[rgba(255,255,255,0.03)] border border-[rgba(255,255,255,0.08)] rounded-md">
          <h4 className="text-sm font-semibold text-purple-300 mb-1">Agent's Proposed Plan:</h4>
          <pre className="text-xs text-gray-300 whitespace-pre-wrap max-h-24 overflow-y-auto p-1 bg-[rgba(0,0,0,0.05)] rounded scrollbar-thin scrollbar-thumb-gray-600 scrollbar-track-transparent">
            {plan.planSummary}
          </pre>
          <div className="mt-2 flex space-x-2">
            <button
              onClick={onCommit}
              className="crystal-button flex-1 px-3 py-1.5 text-xs flex items-center justify-center"
              style={{'--button-accent-rgb': 'var(--success-accent-rgb)'} as React.CSSProperties}
            >
              <CheckCircleIcon className="w-4 h-4 mr-1.5" />
              Commit Plan
            </button>
            <button
              onClick={onDiscard}
              className="crystal-button flex-1 px-3 py-1.5 text-xs flex items-center justify-center"
              style={{'--button-accent-rgb': 'var(--danger-accent-rgb)'} as React.CSSProperties}
            >
              <XCircleIcon className="w-4 h-4 mr-1.5" />
              Discard Plan
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default CommandAgentPanel;
