
import React, { useState, useCallback, useRef } from 'react';
import { FloatingPanelData, OperationTypeEnum, NodeId, OutputPort, AnyNode, Connection, MolecularNode, ScopeStackItem } from '../types';
import NodePaletteComponent from './NodePaletteComponent';
import HorizontalToolbarComponent from './HorizontalToolbarComponent'; // New Import
import { CogIcon } from './Icons'; 

interface FloatingPanelComponentProps {
  panel: FloatingPanelData;
  onPanelDrag: (panelId: string, position: { x: number; y: number }) => void;
  
  // Props for NodePaletteComponent 
  onAddNode?: (type: OperationTypeEnum) => void;
  onAddBlueprintNode?: (blueprintCreator: () => MolecularNode) => void;
  currentGraphId?: NodeId | 'root';
  parentNodeOperationType?: OperationTypeEnum;
  isFocusModeActive?: boolean;
  selectedNodeOutputsForAffinity?: OutputPort[];
  allNodes?: AnyNode[];
  allConnections?: Connection[];

  // Props for HorizontalToolbarComponent
  onSaveGraph?: () => void;
  onLoadGraphRequest?: () => void;
  onUndo?: () => void;
  canUndo?: boolean;
  onRedo?: () => void;
  canRedo?: boolean;
  onCopy?: () => void;
  canCopy?: boolean;
  onPaste?: () => void;
  canPaste?: boolean;
  onAlignTop?: () => void;
  onDistributeHorizontally?: () => void;
  selectedNodeIdsCount?: number;
  scopeStack?: ScopeStackItem[];
  onNavigateToScope?: (targetScopeId: NodeId | 'root', indexInStack: number) => void;
  onFocusGraph?: () => void;
  onClearGraph?: () => void;
}

const FloatingPanelComponent: React.FC<FloatingPanelComponentProps> = ({
  panel,
  onPanelDrag,
  // NodePaletteComponent props
  onAddNode,
  onAddBlueprintNode,
  currentGraphId,
  parentNodeOperationType,
  isFocusModeActive,
  selectedNodeOutputsForAffinity,
  allNodes,
  allConnections,
  // HorizontalToolbarComponent props
  onSaveGraph,
  onLoadGraphRequest,
  onUndo,
  canUndo,
  onRedo,
  canRedo,
  onCopy,
  canCopy,
  onPaste,
  canPaste,
  onAlignTop,
  onDistributeHorizontally,
  selectedNodeIdsCount,
  scopeStack,
  onNavigateToScope,
  onFocusGraph,
  onClearGraph,
}) => {
  const [isDragging, setIsDragging] = useState(false);
  const dragStartOffset = useRef({ x: 0, y: 0 });

  const handleMouseDown = useCallback((event: React.MouseEvent) => {
    event.stopPropagation();
    setIsDragging(true);
    dragStartOffset.current = {
      x: event.clientX - panel.position.x,
      y: event.clientY - panel.position.y,
    };
  }, [panel.position.x, panel.position.y]);

  const handleMouseMove = useCallback((event: MouseEvent) => {
    if (!isDragging) return;
    event.stopPropagation();
    const newX = event.clientX - dragStartOffset.current.x;
    const newY = event.clientY - dragStartOffset.current.y;
    onPanelDrag(panel.id, { x: newX, y: newY });
  }, [isDragging, panel.id, onPanelDrag]);

  const handleMouseUp = useCallback((event: MouseEvent) => {
    event.stopPropagation();
    setIsDragging(false);
  }, []);

  React.useEffect(() => {
    if (isDragging) {
      document.addEventListener('mousemove', handleMouseMove);
      document.addEventListener('mouseup', handleMouseUp);
    }
    return () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
    };
  }, [isDragging, handleMouseMove, handleMouseUp]);

  const panelStyle: React.CSSProperties = {
    width: `${panel.width}px`,
    height: `${panel.height}px`,
    zIndex: panel.zIndex || 100, 
    position: 'absolute', 
    display: 'flex',
    flexDirection: 'column',
    overflow: 'hidden', 
  };
  
  let panelContent: React.ReactNode = null;
  if (panel.id === 'fp_node_palette' && onAddNode && onAddBlueprintNode && currentGraphId && allNodes && allConnections && selectedNodeOutputsForAffinity) {
    panelContent = (
      <NodePaletteComponent
        onAddNode={onAddNode}
        onAddBlueprintNode={onAddBlueprintNode}
        currentGraphId={currentGraphId}
        parentNodeOperationType={parentNodeOperationType}
        isFocusModeActive={isFocusModeActive || false}
        selectedNodeOutputsForAffinity={selectedNodeOutputsForAffinity}
        allNodes={allNodes}
        allConnections={allConnections}
      />
    );
  } else if (panel.id === 'fp_horizontal_tools_panel' && 
             onSaveGraph && onLoadGraphRequest && onUndo && onRedo && onCopy && onPaste &&
             onAlignTop && onDistributeHorizontally && scopeStack && onNavigateToScope &&
             onFocusGraph && onClearGraph && canUndo !== undefined && canRedo !== undefined &&
             canCopy !== undefined && canPaste !== undefined && selectedNodeIdsCount !== undefined
            ) {
    panelContent = (
      <HorizontalToolbarComponent
        onSaveGraph={onSaveGraph} onLoadGraphRequest={onLoadGraphRequest}
        onUndo={onUndo} canUndo={canUndo} onRedo={onRedo} canRedo={canRedo}
        onCopy={onCopy} canCopy={canCopy} onPaste={onPaste} canPaste={canPaste}
        onAlignTop={onAlignTop} onDistributeHorizontally={onDistributeHorizontally}
        selectedNodeIdsCount={selectedNodeIdsCount}
        scopeStack={scopeStack} onNavigateToScope={onNavigateToScope}
        onFocusGraph={onFocusGraph}
        onClearGraph={onClearGraph}
      />
    );
  } else if (panel.title) {
    panelContent = <div className="p-2 text-xs text-on-glass">Content for {panel.title}</div>;
  }

  const divProps: React.HTMLAttributes<HTMLDivElement> & { xmlns?: string } = {
    xmlns: "http://www.w3.org/1999/xhtml",
    className: `crystal-layer crystal-layer-1 ${!panel.title ? 'draggable-header-for-palette' : ''}`, // Draggable body if no title
    style: panelStyle,
  };
  if (!panel.title) { // Attach drag handler to body if no title
    divProps.onMouseDown = handleMouseDown;
  }


  return (
    <foreignObject
      x={panel.position.x} 
      y={panel.position.y} 
      width={panel.width}   
      height={panel.height}  
      style={{ overflow: 'visible' }} 
    >
      <div {...divProps}>
        {panel.title && (
          <div 
            className="floating-panel-header p-2 cursor-grab flex items-center"
            onMouseDown={handleMouseDown} // Draggable header if title exists
          >
             <CogIcon className="w-4 h-4 mr-2 text-sky-300"/>
            <span className="text-sm font-semibold text-on-glass truncate">{panel.title}</span>
          </div>
        )}
        
        <div className={`flex-grow overflow-hidden`}>
          {panelContent}
        </div>
      </div>
    </foreignObject>
  );
};

export default FloatingPanelComponent;
