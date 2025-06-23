
import React, { useEffect, useMemo, useRef } from 'react';
import { NodeCreationContextMenuState, OperationTypeEnum, LogicalCategoryEnum, PortTypeEnum, RegisteredAtomicNodeDefinition } from '../types';
import { nodeRegistryService } from '../services/NodeRegistryService';
import * as Icons from './Icons';
import { NODE_TYPE_COLORS } from '../constants';

interface NodeCreationContextMenuProps {
  contextMenuState: NodeCreationContextMenuState;
  onSelectNodeToAdd: (operationType: OperationTypeEnum) => void;
  onClose: () => void;
}

interface CompatibleNodeEntry {
  opType: OperationTypeEnum;
  name: string;
  icon: React.FC<React.SVGProps<SVGSVGElement>>;
  isDisplayNode?: boolean; 
}


const NodeCreationContextMenu: React.FC<NodeCreationContextMenuProps> = ({
  contextMenuState,
  onSelectNodeToAdd,
  onClose,
}) => {
  const menuRef = useRef<HTMLDivElement>(null);

  const compatibleNodes = useMemo(() => {
    if (!contextMenuState.sourcePort) {
      return [];
    }
    const { sourcePort } = contextMenuState; 
    
    const allNodeDefsGrouped = nodeRegistryService.getGroupedNodeDefinitionsForControls();
    
    const compatible: CompatibleNodeEntry[] = [];

    type FlatNodeDefControls = {
        opType: OperationTypeEnum;
        label: string;
        icon: React.FC<React.SVGProps<SVGSVGElement>>;
        title?: string;
        isArchetype?: boolean;
    };

    Object.values(allNodeDefsGrouped).flat().forEach((def: FlatNodeDefControls) => {
      const nodeDefinition = nodeRegistryService.getNodeDefinition(def.opType);
      if (!nodeDefinition) return;

      const { inputPorts } = nodeDefinition.portGenerator('temp_id_for_check_creation_menu', {}); 
      
      const isDisplayNode = [
        OperationTypeEnum.DISPLAY_VALUE,
        OperationTypeEnum.DISPLAY_MARKDOWN_TEXT,
        OperationTypeEnum.PROGRESS_BAR,
        OperationTypeEnum.DATA_TABLE
      ].includes(def.opType);

      const hasCompatibleInput = inputPorts.some(inputP => {
        if (sourcePort.portType !== inputP.portType) return false;
        
        if (sourcePort.portType === PortTypeEnum.DATA) {
          if (def.opType === OperationTypeEnum.DISPLAY_VALUE) return true; 
          if (def.opType === OperationTypeEnum.DISPLAY_MARKDOWN_TEXT) return sourcePort.category === LogicalCategoryEnum.STRING || sourcePort.category === LogicalCategoryEnum.ANY;
          if (def.opType === OperationTypeEnum.PROGRESS_BAR) return sourcePort.category === LogicalCategoryEnum.NUMBER || sourcePort.category === LogicalCategoryEnum.ANY;
          if (def.opType === OperationTypeEnum.DATA_TABLE) return sourcePort.category === LogicalCategoryEnum.ARRAY || sourcePort.category === LogicalCategoryEnum.ANY;

          return sourcePort.category === LogicalCategoryEnum.ANY ||
                 inputP.category === LogicalCategoryEnum.ANY ||
                 sourcePort.category === inputP.category;
        }
        return true; 
      });

      if (hasCompatibleInput) {
        compatible.push({ opType: def.opType, name: def.label, icon: def.icon, isDisplayNode });
      }
    });
    
    return compatible.sort((a,b) => {
      if (a.isDisplayNode && !b.isDisplayNode) return -1;
      if (!a.isDisplayNode && b.isDisplayNode) return 1;
      return a.name.localeCompare(b.name);
    });
  }, [contextMenuState.sourcePort, contextMenuState.sourceNodeId]);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        onClose();
      }
    };
    const handleEscapeKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        onClose();
      }
    };

    if (contextMenuState.visible) {
      document.addEventListener('mousedown', handleClickOutside);
      document.addEventListener('keydown', handleEscapeKey);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('keydown', handleEscapeKey);
    };
  }, [contextMenuState.visible, onClose]);

  if (!contextMenuState.visible) return null;

  return (
    <div
      ref={menuRef}
      className="crystal-layer crystal-layer-4 absolute p-2 z-[100] max-h-80 w-60 overflow-y-auto scrollbar-thin scrollbar-thumb-gray-500/60 scrollbar-track-transparent"
      style={{ top: contextMenuState.screenY + 5, left: contextMenuState.screenX + 5 }}
      role="menu"
      aria-label={`Create node connected to ${contextMenuState.sourcePort.name}`}
    >
      <div className="text-xs text-gray-300 px-2 py-1 mb-1 border-b border-[rgba(255,255,255,0.1)] sticky top-0 bg-[rgba(var(--accent-rgb),0.12)] backdrop-blur-sm z-10">
        Connect <strong className="text-gray-100">{contextMenuState.sourcePort.name}</strong> to New:
      </div>
      <div className="pt-1"> 
        {compatibleNodes.length === 0 && (
          <div className="px-3 py-2 text-xs text-gray-400 italic">No directly compatible nodes found.</div>
        )}
        {compatibleNodes.map(({ opType, name, icon, isDisplayNode }) => {
          const colorDetails = NODE_TYPE_COLORS[opType] || NODE_TYPE_COLORS[OperationTypeEnum.ASSIGN];
          const IconComponent = icon || Icons.CogIcon;
          return (
              <button
                key={opType}
                onClick={() => {
                    onSelectNodeToAdd(opType);
                }}
                className={`crystal-button flex items-center w-full text-left px-3 py-2 text-sm rounded-md hover:${colorDetails.headerText || 'text-sky-300'} ${isDisplayNode ? 'font-semibold' : ''}`}
                role="menuitem"
                title={`Add ${name} node and connect`}
              >
                <IconComponent className={`w-4 h-4 mr-2 flex-shrink-0 ${colorDetails.headerText || 'text-gray-300'}`} />
                <span className="truncate">{name}</span>
                 {isDisplayNode && <span className="ml-auto text-xs text-teal-300">(Display)</span>}
              </button>
          );
        })}
      </div>
    </div>
  );
};

export default NodeCreationContextMenu;
