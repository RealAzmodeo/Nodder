
import React, { useEffect, useState, useRef, useCallback, useMemo } from 'react';
import { AnyNode, NodeId, OperationTypeEnum, ExecutionContext, NodeResizeEndHandler, Connection, PortTypeEnum, NodeConfig, InputPort, OutputPort, LogicalCategoryEnum, Breakpoints, QuickInspectField, LogicalCategoryEnum as NodeLogicalCategoryEnum } from '../types';
import PortComponent from './PortComponent';
import { useDraggableNode } from '../hooks/useDraggable';
import { useResizableNode } from '../hooks/useResizableNode';
import {
    NODE_WIDTH, NODE_HEADER_HEIGHT, NODE_TYPE_COLORS,
    DEFAULT_COMMENT_WIDTH, DEFAULT_COMMENT_HEIGHT, DEFAULT_FRAME_WIDTH, DEFAULT_FRAME_HEIGHT,
    RESIZE_HANDLE_SIZE, MIN_RESIZABLE_NODE_WIDTH, MIN_RESIZABLE_NODE_HEIGHT, NODE_PORT_HEIGHT,
    NODE_FOOTER_PADDING_Y, NODE_FOOTER_LINE_HEIGHT, NODE_FOOTER_MAX_LINES, NODE_FOOTER_BORDER_HEIGHT,
    SELECTION_COLOR_ACCENT, ERROR_COLOR_ACCENT, BREAKPOINT_MARKER_SIZE, BREAKPOINT_MARKER_COLOR, PAUSED_NODE_HIGHLIGHT_COLOR, BREAKPOINT_MARKER_BORDER_COLOR,
    DEFAULT_DISPLAY_VALUE_CONTENT_HEIGHT, DEFAULT_DISPLAY_MARKDOWN_CONTENT_HEIGHT,
    DEFAULT_PROGRESS_BAR_CONTENT_HEIGHT, DEFAULT_DATA_TABLE_CONTENT_HEIGHT,
    DEFAULT_VISUAL_DICE_ROLLER_CONTENT_HEIGHT, DEFAULT_VISUAL_DICE_ROLLER_WIDTH,
    DEFAULT_DISPLAY_VALUE_WIDTH, DEFAULT_DISPLAY_MARKDOWN_WIDTH, DEFAULT_PROGRESS_BAR_WIDTH, DEFAULT_DATA_TABLE_WIDTH,
    ARCANUM_SELECTION_COLOR_ACCENT
} from '../constants';
import { CogIcon, CubeTransparentIcon, MinusCircleIcon, StopCircleIcon as BreakpointIconActive, CircleIcon as BreakpointIconInactive, SparklesIcon as RollIcon } from './Icons';
import { canConnect } from '../services/validationService';
import { UseQuickInspectReturn } from '../hooks/useQuickInspect';
import { nodeRegistryService } from '../services/NodeRegistryService';


interface NodeComponentProps extends Pick<UseQuickInspectReturn,
  'isQuickInspectTargetNode' |
  'showQuickInspectWithDelay' |
  'hideQuickInspect' |
  'resetQuickInspectTimer' |
  'clearQuickInspectTimer' |
  'openQuickInspectImmediately'
> {
  node: AnyNode;
  connections: Connection[];
  onNodeDrag: (nodeId: NodeId, position: { x: number; y: number }) => void;
  onPortMouseDown: (event: React.MouseEvent, nodeId: NodeId, portId: string, portType: 'input' | 'output') => void;
  svgRef: React.RefObject<SVGSVGElement | null>;
  panOffsetRef: React.RefObject<{ x: number; y: number }>;
  zoomLevelRef: React.RefObject<number>;
  isSelected: boolean;
  isHoveredForConnectionPortId?: string | null;
  onNodeSelect: (nodeId: NodeId | null, isCtrlOrMetaPressed: boolean) => void;
  onNodeConfigOpen: (nodeId: NodeId) => void;
  onNodeConfigUpdate: (nodeId: NodeId, newConfig: Partial<NodeConfig>) => void;
  onRemoveNode: (nodeId: NodeId) => void;
  onRemoveConnection: (connectionId: string) => void;
  resolvedStatesForInspection: ExecutionContext | null;
  onEnterMolecularNode?: (nodeId: NodeId, nodeName: string) => void;
  onNodeResizeEnd: NodeResizeEndHandler;
  isNodeInErrorState?: boolean;
  allNodesForConnectionContext: AnyNode[];
  breakpoints: Breakpoints;
  onToggleBreakpoint: (nodeId: NodeId) => void;
  isPausedAtThisNode: boolean;
  pulsingNodeInfo: { nodeId: NodeId; pulseKey: number } | null;
  selectedNodeOutputsForAffinity: OutputPort[];
  thisNodeIdForAffinity: NodeId;
}

const basicMarkdownToHtml = (markdown: string): string => {
  if (!markdown) return '';
  return markdown
    .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
    .replace(/\*(.*?)\*/g, '<em>$1</em>')
    .replace(/\n/g, '<br />');
};

const NodeComponent: React.FC<NodeComponentProps> = ({
  node,
  connections,
  onNodeDrag,
  onPortMouseDown,
  svgRef,
  panOffsetRef,
  zoomLevelRef,
  isSelected,
  isHoveredForConnectionPortId,
  onNodeSelect,
  onNodeConfigOpen,
  onNodeConfigUpdate,
  onRemoveNode,
  onRemoveConnection: propOnRemoveConnection,
  resolvedStatesForInspection,
  onEnterMolecularNode,
  onNodeResizeEnd,
  isNodeInErrorState = false,
  allNodesForConnectionContext,
  breakpoints,
  onToggleBreakpoint,
  isPausedAtThisNode,
  pulsingNodeInfo,
  isQuickInspectTargetNode,
  showQuickInspectWithDelay,
  hideQuickInspect,
  resetQuickInspectTimer,
  clearQuickInspectTimer,
  openQuickInspectImmediately,
  selectedNodeOutputsForAffinity,
  thisNodeIdForAffinity,
}) => {
  const { position, handleMouseDown: handleNodeMouseDown, nodeRef } = useDraggableNode({
    initialPosition: node.position,
    onDrag: (newPos) => onNodeDrag(node.id, newPos),
    svgRef,
    panOffsetRef,
    zoomLevelRef,
  });

  const isDisplayNode = [
    OperationTypeEnum.DISPLAY_VALUE, OperationTypeEnum.DISPLAY_MARKDOWN_TEXT,
    OperationTypeEnum.PROGRESS_BAR, OperationTypeEnum.DATA_TABLE, OperationTypeEnum.VISUAL_DICE_ROLLER
  ].includes(node.operationType);

  const isCommentOrFrame = node.operationType === OperationTypeEnum.COMMENT || node.operationType === OperationTypeEnum.FRAME;
  const isResizable = true; // All nodes are now resizable

  const isBreakpointActive = breakpoints.has(node.id);

  const calculateFooterHeight = useCallback(() => {
    let calculatedHeight = 0;
    if (node.config?.showFooterNote && node.config?.footerNoteText && node.config.footerNoteText.trim() !== '') {
      const lines = node.config.footerNoteText.split('\n').length;
      calculatedHeight = (Math.min(lines, NODE_FOOTER_MAX_LINES) * NODE_FOOTER_LINE_HEIGHT) + (NODE_FOOTER_PADDING_Y * 2);
      // The border is part of the div, not the pre. So add it to the div's height.
      calculatedHeight += NODE_FOOTER_BORDER_HEIGHT;
    }
    return calculatedHeight; // Removed the * 2.5 multiplier
  }, [node.config?.showFooterNote, node.config?.footerNoteText]);

  const footerHeight = useMemo(calculateFooterHeight, [calculateFooterHeight]);

  const getInitialNodeDimensions = useCallback(() => {
    let initialWidth: number;
    let initialHeight: number;

    const totalPortHeight = (node.inputPorts?.length || 0) * NODE_PORT_HEIGHT + (node.outputPorts?.length || 0) * NODE_PORT_HEIGHT;
    const minContentHeight = isDisplayNode ? 60 : 0; // Minimum space for display content or ports

    switch(node.operationType) {
      case OperationTypeEnum.COMMENT:
        initialWidth = node.config?.frameWidth || DEFAULT_COMMENT_WIDTH;
        initialHeight = node.config?.frameHeight || DEFAULT_COMMENT_HEIGHT;
        break;
      case OperationTypeEnum.FRAME:
        initialWidth = node.config?.frameWidth || DEFAULT_FRAME_WIDTH;
        initialHeight = node.config?.frameHeight || DEFAULT_FRAME_HEIGHT;
        break;
      case OperationTypeEnum.DISPLAY_VALUE:
        initialWidth = node.config?.frameWidth || DEFAULT_DISPLAY_VALUE_WIDTH;
        initialHeight = (node.config?.frameHeight || DEFAULT_DISPLAY_VALUE_CONTENT_HEIGHT) + NODE_HEADER_HEIGHT + totalPortHeight + footerHeight;
        break;
      case OperationTypeEnum.DISPLAY_MARKDOWN_TEXT:
        initialWidth = node.config?.frameWidth || DEFAULT_DISPLAY_MARKDOWN_WIDTH;
        initialHeight = (node.config?.frameHeight || DEFAULT_DISPLAY_MARKDOWN_CONTENT_HEIGHT) + NODE_HEADER_HEIGHT + totalPortHeight + footerHeight;
        break;
      case OperationTypeEnum.PROGRESS_BAR:
        initialWidth = node.config?.frameWidth || DEFAULT_PROGRESS_BAR_WIDTH;
        initialHeight = (node.config?.frameHeight || DEFAULT_PROGRESS_BAR_CONTENT_HEIGHT) + NODE_HEADER_HEIGHT + totalPortHeight + footerHeight;
        break;
      case OperationTypeEnum.DATA_TABLE:
        initialWidth = node.config?.frameWidth || DEFAULT_DATA_TABLE_WIDTH;
        initialHeight = (node.config?.frameHeight || DEFAULT_DATA_TABLE_CONTENT_HEIGHT) + NODE_HEADER_HEIGHT + totalPortHeight + footerHeight;
        break;
      case OperationTypeEnum.VISUAL_DICE_ROLLER:
        initialWidth = node.config?.frameWidth || DEFAULT_VISUAL_DICE_ROLLER_WIDTH;
        initialHeight = (node.config?.frameHeight || DEFAULT_VISUAL_DICE_ROLLER_CONTENT_HEIGHT) + NODE_HEADER_HEIGHT + totalPortHeight + footerHeight;
        break;
      default:
        initialWidth = node.config?.frameWidth || NODE_WIDTH;
        initialHeight = node.config?.frameHeight || (NODE_HEADER_HEIGHT + Math.max(minContentHeight, totalPortHeight) + footerHeight);
    }
    return {
        width: Math.max(MIN_RESIZABLE_NODE_WIDTH, initialWidth),
        height: Math.max(MIN_RESIZABLE_NODE_HEIGHT, initialHeight)
    };
  }, [node.operationType, node.config?.frameWidth, node.config?.frameHeight, node.inputPorts, node.outputPorts, footerHeight, isDisplayNode]);

  const {
    currentDimensions,
    handleResizeMouseDown,
    isHandleVisible,
    resizeHandleRef,
  } = useResizableNode({
    nodeId: node.id,
    initialDimensions: getInitialNodeDimensions(),
    onResizeEnd: onNodeResizeEnd,
    svgRef,
    panOffsetRef,
    zoomLevelRef,
    isSelected,
  });

  const displayWidth = currentDimensions.width;
  const displayHeight = currentDimensions.height;

  const nodeHeaderTextColorClass = (NODE_TYPE_COLORS[node.operationType] || NODE_TYPE_COLORS[OperationTypeEnum.ASSIGN]).headerText;

  const foreignObjectRef = useRef<SVGForeignObjectElement | null>(null);

  const getImportantConfigFields = useCallback((n: AnyNode): QuickInspectField[] => {
    const fields: QuickInspectField[] = [];
    switch (n.operationType) {
        case OperationTypeEnum.VALUE_PROVIDER:
            fields.push({ key: 'value', label: 'Value', type: typeof n.config?.value === 'boolean' ? 'select' : (typeof n.config?.value === 'number' ? 'number' : (typeof n.config?.value === 'object' ? 'textarea' : 'text')), options: typeof n.config?.value === 'boolean' ? [{value: true, label: 'True'}, {value: false, label: 'False'}] : undefined });
            break;
        case OperationTypeEnum.STATE:
            fields.push({ key: 'stateId', label: 'State ID', type: 'text' });
            fields.push({ key: 'initialValue', label: 'Initial Value', type: typeof n.config?.initialValue === 'boolean' ? 'select' : (typeof n.config?.initialValue === 'number' ? 'number' : (typeof n.config?.initialValue === 'object' ? 'textarea' : 'text')), options: typeof n.config?.initialValue === 'boolean' ? [{value: true, label: 'True'}, {value: false, label: 'False'}] : undefined });
            break;
        case OperationTypeEnum.ON_EVENT:
            fields.push({ key: 'eventName', label: 'Event Name', type: 'text' });
            break;
        case OperationTypeEnum.COMMENT:
            fields.push({ key: 'commentText', label: 'Comment', type: 'textarea' });
            break;
        case OperationTypeEnum.FRAME:
            fields.push({ key: 'frameTitle', label: 'Title', type: 'text' });
            break;
    }
    if (nodeRegistryService.getNodeDefinition(n.operationType)?.category.startsWith("D&D:")) {
        if (n.operationType === OperationTypeEnum.DICE_ROLLER) {
             fields.push({ key: 'diceNotation', label: 'Dice Notation', type: 'text' });
        }
        if (n.operationType === OperationTypeEnum.CHARACTER_ABILITY_SCORE) {
             fields.push({ key: 'abilityScoreName', label: 'Ability Name', type: 'text' });
             fields.push({ key: 'value', label: 'Score', type: 'number' });
        }
        if (n.operationType === OperationTypeEnum.VISUAL_DICE_ROLLER) {
             fields.push({ key: 'diceFaces', label: 'Faces (d)', type: 'select', options: [4,6,8,10,12,20,100].map(f => ({value: f, label: `d${f}`})) });
        }
    }
    return fields.slice(0, 3);
  }, []);

  const handleNodeMouseEnterWrapper = () => {
    if (isQuickInspectTargetNode(node.id)) return;
    showQuickInspectWithDelay(node, () => foreignObjectRef.current?.getBoundingClientRect(), getImportantConfigFields);
  };

  const handleNodeMouseLeaveWrapper = () => {
    hideQuickInspect();
  };

  const handleNodeMouseMoveWrapper = () => {
    if (!isQuickInspectTargetNode(node.id)) {
       resetQuickInspectTimer(node, () => foreignObjectRef.current?.getBoundingClientRect(), getImportantConfigFields);
    }
  };

  const isContextuallyCompatible = React.useMemo(() => {
    if (selectedNodeOutputsForAffinity.length === 0 || thisNodeIdForAffinity === node.id) {
      return false;
    }
    for (const selectedOutputPort of selectedNodeOutputsForAffinity) {
      for (const inputPort of node.inputPorts) {
        const { Succeeded } = canConnect(selectedOutputPort, inputPort, node.operationType, connections, thisNodeIdForAffinity, node.id);
        if (Succeeded) return true;
      }
    }
    return false;
  }, [selectedNodeOutputsForAffinity, node.inputPorts, node.id, node.operationType, connections, thisNodeIdForAffinity]);

  const handleWrapperMouseDown = (e: React.MouseEvent) => {
    const target = e.target;
    clearQuickInspectTimer();
    if (isQuickInspectTargetNode(node.id)) hideQuickInspect();

    if (!(target instanceof Element)) {
        onNodeSelect(node.id, e.metaKey || e.ctrlKey);
        handleNodeMouseDown(e);
        return;
    }

    const targetElement = target as Element;

    if (targetElement.closest && targetElement.closest('.breakpoint-toggle')) return;
    if (isResizable && targetElement.closest && targetElement.closest('.resize-handle-rect')) return;
    if (targetElement.tagName.toUpperCase() === 'INPUT' && targetElement.closest(`[id^="${node.id}-input-"]`)) return;
    if (targetElement.closest && targetElement.closest('button[title="Remove connection"]')) return;
    if (targetElement.closest && targetElement.closest('.node-action-button')) return;

    onNodeSelect(node.id, e.metaKey || e.ctrlKey);
    handleNodeMouseDown(e);
  };

  const handleDoubleClick = (e: React.MouseEvent) => {
    if (node.type === 'Molecular' && onEnterMolecularNode && !e.metaKey && !e.ctrlKey) {
      e.stopPropagation();
      onEnterMolecularNode(node.id, node.name);
    }
  };

  const hasConfigurableFieldsViaModal =
    node.operationType === OperationTypeEnum.VALUE_PROVIDER ||
    node.type === 'Molecular' ||
    node.operationType === OperationTypeEnum.INPUT_GRAPH ||
    node.operationType === OperationTypeEnum.OUTPUT_GRAPH ||
    node.operationType === OperationTypeEnum.STATE ||
    node.operationType === OperationTypeEnum.ON_EVENT ||
    node.operationType === OperationTypeEnum.RANDOM_NUMBER ||
    node.operationType === OperationTypeEnum.SWITCH ||
    node.operationType === OperationTypeEnum.COMMENT ||
    node.operationType === OperationTypeEnum.FRAME ||
    node.operationType === OperationTypeEnum.SEND_DATA ||
    node.operationType === OperationTypeEnum.RECEIVE_DATA ||
    node.operationType === OperationTypeEnum.ITERATE ||
    node.operationType === OperationTypeEnum.PROGRESS_BAR ||
    node.operationType === OperationTypeEnum.DATA_TABLE ||
    node.operationType === OperationTypeEnum.VISUAL_DICE_ROLLER ||
    nodeRegistryService.getNodeDefinition(node.operationType)?.category.startsWith("D&D:");

  const handleLiteralOverrideChange = (portId: string, value: any) => {
    const currentOverrides = node.config?.inputPortOverrides || {};
    let updatedOverrides = { ...currentOverrides };

    if (value === undefined) delete updatedOverrides[portId];
    else updatedOverrides[portId] = value;

    if (Object.keys(updatedOverrides).length === 0) {
      const newConfig = { ...node.config };
      delete newConfig.inputPortOverrides;
      onNodeConfigUpdate(node.id, newConfig as Partial<NodeConfig>);
    } else {
      onNodeConfigUpdate(node.id, { inputPortOverrides: updatedOverrides });
    }
  };

  const handleRemoveConnectionToInputPort = (portId: string) => {
    const connectionToRemove = connections.find(conn => conn.toNodeId === node.id && conn.toPortId === portId);
    if (connectionToRemove && typeof propOnRemoveConnection === 'function') {
      propOnRemoveConnection(connectionToRemove.id);
    }
  };

  const nodeDefinition = nodeRegistryService.getNodeDefinition(node.operationType);
  const isArcanumNode = nodeDefinition?.category.startsWith("D&D:");

  const nodeBaseStyle: React.CSSProperties = useMemo(() => {
    const style: React.CSSProperties = {
      backgroundColor: isPausedAtThisNode ? PAUSED_NODE_HIGHLIGHT_COLOR : undefined,
      transition: 'box-shadow 0.2s ease-out, background-color 0.2s ease-out',
    };
    if (isSelected) {
      const accentColorHex = isArcanumNode ? ARCANUM_SELECTION_COLOR_ACCENT : SELECTION_COLOR_ACCENT;
      style.boxShadow = `0px 8px 22px rgba(${isArcanumNode ? 'var(--arcanum-accent-rgb)' : 'var(--accent-rgb)'}, 0.25), 0 0 0 2px ${accentColorHex}`;
    } else if (isNodeInErrorState) {
      style.boxShadow = `0px 8px 20px rgba(var(--danger-accent-rgb), 0.3), 0 0 0 2px ${ERROR_COLOR_ACCENT}`;
    }
    return style;
  }, [isSelected, isNodeInErrorState, isPausedAtThisNode, isArcanumNode]);

  const headerClassName = useMemo(() => {
    let base = `node-header flex items-center justify-between p-2 h-[${NODE_HEADER_HEIGHT}px] select-none`;
    if (isArcanumNode) base += " arcanum-node-header-theme";
    else if (node.operationType === OperationTypeEnum.COMMENT) base += " comment-node-header";
    else if (node.operationType === OperationTypeEnum.FRAME) base += " frame-node-header";
    else if (isDisplayNode) base += " display-node-header";
    return base;
  }, [node.operationType, isDisplayNode, isArcanumNode]);


  const [showPulseEffect, setShowPulseEffect] = useState(false);
  useEffect(() => {
    if (pulsingNodeInfo && pulsingNodeInfo.nodeId === node.id) {
      setShowPulseEffect(true);
      const timer = setTimeout(() => setShowPulseEffect(false), 500);
      return () => clearTimeout(timer);
    }
  }, [pulsingNodeInfo, node.id]);

  const resolvedInputVal = useCallback((portName: string) => {
      const inputPort = node.inputPorts.find(p => p.name === portName);
      if (!inputPort || !resolvedStatesForInspection) return undefined;
      const connection = connections.find(c => c.toNodeId === node.id && c.toPortId === inputPort.id);
      return connection ? resolvedStatesForInspection[`${connection.fromNodeId}_${connection.fromPortId}`] : node.config?.inputPortOverrides?.[inputPort.id];
  }, [node, connections, resolvedStatesForInspection]);

  const handleVisualDiceRoll = () => {
    if (node.operationType === OperationTypeEnum.VISUAL_DICE_ROLLER) {
        const faces = node.config?.diceFaces || 20;
        const newRoll = Math.floor(Math.random() * faces) + 1;
        onNodeConfigUpdate(node.id, { ...node.config, lastRoll: newRoll });
    }
  };

  const contentVisualizationHeightForDisplayNode = useMemo(() => {
    if (!isDisplayNode) return 0;
    const totalPortHeight = (node.inputPorts?.length || 0) * NODE_PORT_HEIGHT + (node.outputPorts?.length || 0) * NODE_PORT_HEIGHT;
    const calculatedHeight = displayHeight - NODE_HEADER_HEIGHT - totalPortHeight - footerHeight;
    return Math.max(20, calculatedHeight);
  }, [isDisplayNode, node.inputPorts, node.outputPorts, displayHeight, footerHeight]);


  const renderNodeCentralContent = useMemo(() => {
    const baseContentClasses = "p-2.5 text-on-glass overflow-auto h-full";
    switch(node.operationType) {
      case OperationTypeEnum.COMMENT:
        return <div className="p-2.5 text-xs text-yellow-100 bg-yellow-800/30 overflow-y-auto flex-grow h-full" style={{fontFamily: "'Courier New', Courier, monospace"}}><pre className="whitespace-pre-wrap break-words h-full">{node.config?.commentText || ''}</pre></div>;
      case OperationTypeEnum.FRAME:
        return <div className="flex-grow h-full"></div>;
      case OperationTypeEnum.DISPLAY_VALUE:
        const displayVal = resolvedInputVal('Value');
        let formattedVal = String(displayVal ?? 'N/A');
        if (typeof displayVal === 'object' && displayVal !== null) {
            try { formattedVal = JSON.stringify(displayVal, null, 2); }
            catch (e) { formattedVal = '[Unserializable Object]'; }
        }
        return <div className={`${baseContentClasses} flex items-center justify-center`}>
                 <pre className="whitespace-pre-wrap break-words text-center text-sm">{formattedVal}</pre>
               </div>;
      case OperationTypeEnum.DISPLAY_MARKDOWN_TEXT:
        const markdownInput = resolvedInputVal('Markdown String') || '';
        return <div className={`${baseContentClasses} text-sm`} dangerouslySetInnerHTML={{ __html: basicMarkdownToHtml(String(markdownInput)) }} />;
      case OperationTypeEnum.PROGRESS_BAR:
        const val = parseFloat(String(resolvedInputVal('Value') ?? 0));
        const min = parseFloat(String(resolvedInputVal('Min') ?? node.config?.defaultMin ?? 0));
        const max = parseFloat(String(resolvedInputVal('Max') ?? node.config?.defaultMax ?? 100));
        const percentage = (max > min) ? Math.max(0, Math.min(100, ((val - min) / (max - min)) * 100)) : 0;
        const barColor = node.config?.barColor || 'rgba(var(--accent-rgb), 0.7)';
        const showPercentageConfig = node.config?.showPercentage !== undefined ? node.config.showPercentage : true;
        return (
            <div className="px-3 py-2 h-full flex flex-col justify-center">
                <div className="w-full bg-black/20 rounded-full h-5 overflow-hidden border border-white/10">
                    <div className="h-full rounded-full transition-all duration-300 ease-out" style={{ width: `${percentage}%`, backgroundColor: barColor }}></div>
                </div>
                {showPercentageConfig && <p className="text-center text-xs text-on-glass mt-1">{val.toFixed(1)} (${percentage.toFixed(0)}%)</p>}
            </div>
        );
    case OperationTypeEnum.DATA_TABLE:
        const tableData = resolvedInputVal('Data');
        let columns: string[] = node.config?.dataTableColumns || [];
        if (!Array.isArray(tableData) || tableData.length === 0) {
            return <div className="p-2.5 text-xs text-gray-400 italic h-full flex items-center justify-center">No data or not an array.</div>;
        }
        if (columns.length === 0 && typeof tableData[0] === 'object' && tableData[0] !== null) {
            columns = Object.keys(tableData[0]);
        }
        return (
            <div className="p-1 text-xs text-on-glass overflow-auto h-full">
                <table className="w-full min-w-max table-auto text-left">
                    <thead><tr className="bg-white/10">{columns.map(col => <th key={col} className="p-1.5 border-b border-white/10 text-xs font-semibold truncate">{col}</th>)}</tr></thead>
                    <tbody>{tableData.map((row, rowIndex) => (<tr key={rowIndex} className="even:bg-black/5 hover:bg-white/5 transition-colors">{columns.map(col => (<td key={`${rowIndex}-${col}`} className="p-1.5 border-b border-white/5 text-xs truncate max-w-[100px]">{typeof row[col] === 'object' ? JSON.stringify(row[col]) : String(row[col] ?? '')}</td>))}</tr>))}</tbody>
                </table>
            </div>
        );
      case OperationTypeEnum.VISUAL_DICE_ROLLER:
        return (
          <div className={`${baseContentClasses} flex items-center justify-center text-5xl font-bold text-amber-300`}>
            {node.config?.lastRoll ?? 'Roll!'}
          </div>
        );
      default:
        return null;
    }
  }, [node.operationType, node.config, resolvedInputVal, connections, contentVisualizationHeightForDisplayNode]);

  const outerDivClasses = `crystal-layer crystal-layer-1 w-full h-full flex flex-col
                      ${showPulseEffect ? 'node-executing-pulse-effect' : ''}
                      ${isContextuallyCompatible && !isSelected ? 'node-contextual-affinity-pulse' : ''}
                      ${isArcanumNode ? 'arcanum-node-theme' : ''}`;

  const NodeSpecificIcon = nodeDefinition?.icon || CubeTransparentIcon;

  const isStandardOperationalNode = !isDisplayNode && !isCommentOrFrame;

  // Main content area style: it takes flex-grow (default 1)
  const mainContentAreaStyle: React.CSSProperties = {
    overflowY: 'auto', // Always allow scroll if content overflows
    // flexGrow: 1, // Implicit from className="flex-grow"
    // No explicit height or maxHeight, let flexbox distribute height
  };

  // Footer style: it takes flex-grow with a smaller factor
  const footerStyle: React.CSSProperties = {
    minHeight: `${footerHeight}px`, // Ensure minimum space for up to NODE_FOOTER_MAX_LINES
    flexGrow: 0.2, // Grow, but less than the main content area
    flexShrink: 0, // Don't shrink below minHeight
    // minHeight: '0px', // Part of min-h-0 for flex children that scroll
  };


  return (
    <foreignObject
      ref={foreignObjectRef}
      x={position.x}
      y={position.y}
      width={displayWidth}
      height={displayHeight}
      onMouseDown={handleWrapperMouseDown}
      onDoubleClick={handleDoubleClick}
      onMouseEnter={handleNodeMouseEnterWrapper}
      onMouseLeave={handleNodeMouseLeaveWrapper}
      onMouseMove={handleNodeMouseMoveWrapper}
      className={`cursor-grab ${node.operationType === OperationTypeEnum.FRAME ? 'group-frame-node' : ''}`}
      style={{ overflow: 'visible', borderRadius: '1rem' }}
    >
      <div className={outerDivClasses} style={nodeBaseStyle}>
        <div className={headerClassName}>
          <div className="flex items-center space-x-2 flex-shrink min-w-0">
             <button
                onClick={(e) => { e.stopPropagation(); onToggleBreakpoint(node.id); }}
                className="breakpoint-toggle p-0.5 rounded-full crystal-button flex-shrink-0"
                style={{padding: '0.2rem'}}
                title={isBreakpointActive ? "Remove breakpoint" : "Set breakpoint"} aria-pressed={isBreakpointActive}
              >
                {isBreakpointActive ? <BreakpointIconActive className="w-3 h-3 text-red-400" /> : <BreakpointIconInactive className="w-3 h-3 text-gray-400 hover:text-gray-200" />}
              </button>
            <NodeSpecificIcon className={`w-4 h-4 text-on-glass ${nodeHeaderTextColorClass} flex-shrink-0`} />
            <span className={`font-semibold text-sm truncate text-on-glass ${nodeHeaderTextColorClass}`} title={node.name}>
                {node.operationType === OperationTypeEnum.FRAME ? node.config?.frameTitle || node.name : node.name}
            </span>
          </div>
          <div className="flex items-center space-x-1 flex-shrink-0">
             {node.operationType === OperationTypeEnum.VISUAL_DICE_ROLLER && (
                <button
                  onClick={(e) => { e.stopPropagation(); handleVisualDiceRoll(); }}
                  className="crystal-button node-action-button p-1 text-amber-300 hover:text-amber-100"
                  title="Roll Dice" aria-label="Roll Dice"
                > <RollIcon className="w-4 h-4" /> </button>
            )}
            { hasConfigurableFieldsViaModal &&
                <button
                  onClick={(e) => { e.stopPropagation(); onNodeConfigOpen(node.id); }}
                  className="crystal-button p-1"
                  title="Configure Node (Modal)" aria-label="Configure Node"
                > <CogIcon className="w-4 h-4" /> </button>
            }
             <button
                onClick={(e) => { e.stopPropagation(); onRemoveNode(node.id); }}
                className="crystal-button p-1"
                title="Remove Node" aria-label="Remove Node"
            > <MinusCircleIcon className="w-4 h-4 text-red-400 hover:text-red-300" /> </button>
          </div>
        </div>

        <div
          className={`flex-grow min-h-0 flex flex-col ${isCommentOrFrame ? 'overflow-hidden' : ''} ${isArcanumNode ? 'bg-[rgba(55,60,70,0.15)]' : ''} ${isArcanumNode ? 'border-t-0' : ''} ${isArcanumNode && (node.inputPorts.length > 0 || node.outputPorts.length > 0 || isDisplayNode) ? 'rounded-b-xl' : ''}`}
          style={mainContentAreaStyle}
        >
            {(node.inputPorts || []).filter(p => p).map((port) => {
                const isConnected = connections.some(conn => conn.toNodeId === node.id && conn.toPortId === port.id);
                const literalOverride = node.config?.inputPortOverrides?.[port.id];
                const connectionToPort = connections.find(conn => conn.toNodeId === node.id && conn.toPortId === port.id);
                let connectedOutputCat: LogicalCategoryEnum | undefined = undefined;
                if (isConnected && connectionToPort) {
                    const sourceNode = allNodesForConnectionContext.find(n => n.id === connectionToPort.fromNodeId);
                    const sourceOutputPort = sourceNode?.outputPorts.find(p => p.id === connectionToPort.fromPortId);
                    if (sourceOutputPort) connectedOutputCat = sourceOutputPort.category;
                }
                let resolvedValueForPort: any = undefined;
                if (resolvedStatesForInspection && isConnected && connectionToPort) {
                    resolvedValueForPort = resolvedStatesForInspection[`${connectionToPort.fromNodeId}_${connectionToPort.fromPortId}`];
                }
                return (
                <PortComponent
                    key={port.id} nodeId={node.id} port={port as InputPort} type="input"
                    isHoveredForConnection={isHoveredForConnectionPortId === port.id}
                    isConnected={isConnected} literalOverrideValue={literalOverride}
                    onLiteralOverrideChange={handleLiteralOverrideChange}
                    onRemoveConnectionToPort={handleRemoveConnectionToInputPort}
                    connectionId={connectionToPort?.id} connectedOutputPortCategory={connectedOutputCat}
                    resolvedValue={resolvedValueForPort}
                />
                );
            })}

            {(isDisplayNode || isCommentOrFrame) && renderNodeCentralContent && (
                <div
                  className={`central-content-visualization-area ${isCommentOrFrame ? 'flex-grow min-h-0' : ''} ${isDisplayNode ? 'overflow-auto' : ''}`}
                  style={isDisplayNode ? { height: `${contentVisualizationHeightForDisplayNode}px` } : (isCommentOrFrame ? {flexGrow:1, minHeight:0} : {})}
                >
                     {renderNodeCentralContent}
                </div>
            )}

            {(node.outputPorts || []).filter(p => p).map((port) => {
                const resolvedValueKey = `${node.id}_${port.id}`;
                const resolvedValue = resolvedStatesForInspection ? resolvedStatesForInspection[resolvedValueKey] : undefined;
                const isConnected = connections.some(conn => conn.fromNodeId === node.id && conn.fromPortId === port.id);
                return (
                <PortComponent
                    key={port.id} nodeId={node.id} port={port as OutputPort} type="output"
                    onMouseDown={(e, pId, pType) => onPortMouseDown(e, node.id, pId, pType)}
                    isHoveredForConnection={isHoveredForConnectionPortId === port.id}
                    resolvedValue={resolvedValue} isConnected={isConnected}
                />
                );
            })}
        </div>

        {footerHeight > 0 && !isCommentOrFrame && (
          <div
            className="text-xs text-on-glass-dim p-1 border-t border-white/10 flex flex-col min-h-0" // Added flex flex-col min-h-0
            style={footerStyle}
            title={node.config?.footerNoteText}
          >
            <pre className="whitespace-pre-wrap text-[10px] leading-tight font-mono p-0.5 h-full overflow-y-auto scrollbar-thin scrollbar-thumb-gray-500/50 scrollbar-track-transparent flex-grow">
                {node.config?.footerNoteText}
            </pre>
          </div>
        )}
      </div>
      {isResizable && isHandleVisible && (
        <svg
            className="resize-handle"
            x={displayWidth - RESIZE_HANDLE_SIZE}
            y={displayHeight - RESIZE_HANDLE_SIZE}
            width={RESIZE_HANDLE_SIZE} height={RESIZE_HANDLE_SIZE}
            style={{ cursor: 'se-resize', zIndex: 110, overflow: 'visible' }}
        >
            <rect ref={resizeHandleRef} onMouseDown={handleResizeMouseDown}
                className="resize-handle-rect" width={RESIZE_HANDLE_SIZE} height={RESIZE_HANDLE_SIZE}
                fill="rgba(180, 180, 180, 0.5)" stroke="rgba(255, 255, 255, 0.8)" strokeWidth="1" rx="2"
            />
        </svg>
      )}
    </foreignObject>
  );
};

export default React.memo(NodeComponent);
