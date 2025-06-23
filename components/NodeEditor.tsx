
import React, { useState, useCallback, useRef, useEffect, useImperativeHandle, forwardRef } from 'react';
import { AnyNode, Connection, ConnectingState, NodeId, InputPort, OutputPort, ExecutionContext, PortTypeEnum, NodeResizeEndHandler, LogicalCategoryEnum, NodeContextMenuState, ScopeStackItem, AtomicNode, NodeConfig, MolecularNode, OperationTypeEnum, Breakpoints, NodeCreationContextMenuState, Port, ExecutionMetaState, TerminalStateReasonEnum, QuickInspectField, QuickInspectData, FloatingPanelData } from '../types';
import NodeComponent from './NodeComponent'; 
import FloatingPanelComponent from './FloatingPanelComponent';
import { NODE_WIDTH, NODE_HEADER_HEIGHT, NODE_PORT_HEIGHT, NODE_PORT_MARKER_SIZE, EXECUTION_CONNECTION_STROKE, DEFAULT_FRAME_WIDTH, DEFAULT_FRAME_HEIGHT, MIN_RESIZABLE_NODE_HEIGHT, MIN_RESIZABLE_NODE_WIDTH, MAX_ZOOM, MIN_ZOOM, SELECTION_COLOR_ACCENT, PAUSED_NODE_HIGHLIGHT_COLOR, PORT_CATEGORY_HEX_COLORS } from '../constants';
import {canConnect as canPortsConnect} from '../services/validationService';
import { UseQuickInspectReturn } from '../hooks/useQuickInspect'; 

export interface NodeEditorContextMenuDetails {
  screenX: number;
  screenY: number;
  worldX: number;
  worldY: number;
  sourceNodeId: NodeId;
  sourcePortId: string;
  sourceNode: AnyNode; 
  sourcePort: OutputPort; 
}

interface NodeEditorProps extends Pick<UseQuickInspectReturn, 
  'isQuickInspectTargetNode' | 
  'showQuickInspectWithDelay' | 
  'hideQuickInspect' | 
  'resetQuickInspectTimer' |
  'clearQuickInspectTimer' |
  'openQuickInspectImmediately'
> {
  nodes: AnyNode[]; 
  connections: Connection[]; 
  floatingPanels: FloatingPanelData[]; 
  onFloatingPanelDrag: (panelId: string, position: { x: number; y: number }) => void; 
  onAddNode: (type: OperationTypeEnum) => void; 
  onAddBlueprintNode: (blueprintCreator: () => MolecularNode) => void; 
  currentGraphId: NodeId | 'root'; 
  parentNodeOperationType?: OperationTypeEnum; 
  isFocusModeActive: boolean; 
  selectedNodeOutputsForAffinity: OutputPort[]; 
  allNodesForConnectionContext: AnyNode[]; 
  onNodesChange: (nodes: AnyNode[]) => void;
  onConnectionsChange: (connections: Connection[]) => void;
  connectingState: ConnectingState;
  onConnectingStart: (nodeId: NodeId, portId: string, portType: 'input' | 'output', portPosition: {x: number, y:number}) => void;
  onConnectingEnd: (nodeId: NodeId | null, portId: string | null, portType: 'input' | 'output', portPosition: {x: number, y:number}) => void;
  onConnectingUpdate: (mousePosition: {x: number, y:number}) => void;
  onNodeSelect: (nodeIdOrIds: NodeId | NodeId[] | null, isCtrlOrMetaPressed: boolean) => void;
  selectedNodeIds: NodeId[];
  onNodeConfigOpen: (nodeId: NodeId) => void; 
  onNodeConfigUpdate: (nodeId: NodeId, newConfig: Partial<NodeConfig>) => void; 
  onRemoveNode: (nodeIdsToRemove: NodeId[]) => void; 
  onRemoveConnection: (connectionId: string) => void;
  resolvedStatesForInspection: ExecutionContext | null;
  onEnterMolecularNode?: (nodeId: NodeId, nodeName: string) => void;
  onNodeResizeEnd: NodeResizeEndHandler; 
  onOpenNodeContextMenu: (details: NodeEditorContextMenuDetails) => void; 
  onOpenNodeCreationContextMenu: (details: NodeCreationContextMenuState) => void; 
  panOffsetRef: React.MutableRefObject<{ x: number; y: number }>; 
  zoomLevelRef: React.MutableRefObject<number>; 
  breakpoints: Breakpoints;
  onToggleBreakpoint: (nodeId: NodeId) => void;
  pausedNodeId: NodeId | null;
  pulsingNodeInfo: { nodeId: NodeId; pulseKey: number } | null;
  pulsingConnectionInfo: { connectionId: string; pulseKey: number; sourcePortCategory: LogicalCategoryEnum; isExecutionPulse: boolean; } | null;
  executionMeta: ExecutionMetaState | null;
  quickInspectPopoverData: QuickInspectData | null; 

  // Props for HorizontalToolbarComponent, passed via FloatingPanelComponent
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

export interface NodeEditorRef {
  focusOnGraph: (nodesToFrame?: AnyNode[]) => void;
  getSvgElement: () => SVGSVGElement | null;
  updateTransform: () => void;
}

const ZOOM_SENSITIVITY = 0.001;
const REROUTE_POINT_RADIUS = 5;


const NodeEditor = forwardRef<NodeEditorRef, NodeEditorProps>(({
  nodes,
  connections,
  floatingPanels,
  onFloatingPanelDrag,
  onAddNode, 
  onAddBlueprintNode, 
  currentGraphId, 
  parentNodeOperationType, 
  isFocusModeActive, 
  selectedNodeOutputsForAffinity, 
  allNodesForConnectionContext, 
  onNodesChange,
  onConnectionsChange,
  connectingState,
  onConnectingStart,
  onConnectingEnd,
  onConnectingUpdate,
  onNodeSelect,
  selectedNodeIds,
  onNodeConfigOpen,
  onNodeConfigUpdate,
  onRemoveNode, 
  onRemoveConnection,
  resolvedStatesForInspection,
  onEnterMolecularNode,
  onNodeResizeEnd,
  onOpenNodeContextMenu, 
  onOpenNodeCreationContextMenu, 
  panOffsetRef, 
  zoomLevelRef, 
  breakpoints,
  onToggleBreakpoint,
  pausedNodeId,
  pulsingNodeInfo,
  pulsingConnectionInfo,
  executionMeta,
  quickInspectPopoverData,
  isQuickInspectTargetNode,
  showQuickInspectWithDelay,
  hideQuickInspect,
  resetQuickInspectTimer,
  clearQuickInspectTimer,
  openQuickInspectImmediately,
  // Destructure HorizontalToolbarComponent props
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
}, ref) => {
  const svgRef = useRef<SVGSVGElement | null>(null);
  const transformedGroupRef = useRef<SVGGElement | null>(null);
  const [hoveredPortInfo, setHoveredPortInfo] = useState<{nodeId: NodeId, portId: string} | null>(null);
  const [isPanning, setIsPanning] = useState(false);
  const [lastPanPosition, setLastPanPosition] = useState<{ x: number; y: number } | null>(null);
  const [selectionRect, setSelectionRect] = useState<{ x: number; y: number; width: number; height: number; visible: boolean; startX: number; startY: number; } | null>(null);
  const [draggingReroutePoint, setDraggingReroutePoint] = useState<{ connectionId: string; pointIndex: number; startDragWorldPos: {x:number, y:number}, originalPointPos: {x:number, y:number} } | null>(null);


  const screenToWorld = useCallback((screenX: number, screenY: number): { x: number; y: number } => {
    if (!svgRef.current) return { x: screenX, y: screenY };
    const CTM = svgRef.current.getScreenCTM();
    if (!CTM) return { x: screenX, y: screenY };

    const svgPointX = (screenX - CTM.e) / CTM.a;
    const svgPointY = (screenY - CTM.f) / CTM.d;
    
    return {
      x: (svgPointX - panOffsetRef.current.x) / zoomLevelRef.current,
      y: (svgPointY - panOffsetRef.current.y) / zoomLevelRef.current,
    };
  }, [panOffsetRef, zoomLevelRef]);

  const getPortPositionAndType = useCallback((nodeId: NodeId, portId: string, nodePortDirection: 'input' | 'output'): { x: number; y: number, portType: PortTypeEnum, portCategory: LogicalCategoryEnum, port: Port } | null => {
    const node = nodes.find(n => n.id === nodeId);
    if (!node) return null;

    const portList = nodePortDirection === 'input' ? node.inputPorts : node.outputPorts;
    const port = portList.find(p => p.id === portId);
    if (!port) return null;
    
    const portIndex = portList.findIndex(p => p.id === portId);
    if (portIndex === -1) return null;

    const nodeEffectiveWidth = node.config?.frameWidth || NODE_WIDTH;
    const yOffset = NODE_HEADER_HEIGHT + (portIndex * NODE_PORT_HEIGHT) + (NODE_PORT_HEIGHT / 2);
    const xOffset = nodePortDirection === 'input' ? 0 : nodeEffectiveWidth; 

    return {
      x: node.position.x + xOffset, 
      y: node.position.y + yOffset,
      portType: port.portType,
      portCategory: port.category,
      port: port, 
    };
  }, [nodes]);

  const updateTransformAttribute = useCallback(() => {
    if (transformedGroupRef.current) {
      transformedGroupRef.current.setAttribute('transform', `translate(${panOffsetRef.current.x}, ${panOffsetRef.current.y}) scale(${zoomLevelRef.current})`);
    }
  }, [panOffsetRef, zoomLevelRef]);

  useEffect(() => {
    updateTransformAttribute();
  }, [panOffsetRef.current.x, panOffsetRef.current.y, zoomLevelRef.current, updateTransformAttribute]);


  useImperativeHandle(ref, () => ({
    focusOnGraph: (nodesToFrame = nodes) => {
      if (!svgRef.current) return;
      const { width: viewportWidth, height: viewportHeight } = svgRef.current.getBoundingClientRect();

      if (nodesToFrame.length === 0) {
        panOffsetRef.current = { x: viewportWidth / 2, y: viewportHeight / 2 };
        zoomLevelRef.current = 1;
        updateTransformAttribute();
        return;
      }

      let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
      nodesToFrame.forEach(node => {
        const isResizable = node.operationType === OperationTypeEnum.COMMENT || node.operationType === OperationTypeEnum.FRAME;
        let nodeWidth = isResizable ? (node.config?.frameWidth || (node.operationType === OperationTypeEnum.COMMENT ? DEFAULT_FRAME_WIDTH : DEFAULT_FRAME_WIDTH )) : NODE_WIDTH;
        nodeWidth = Math.max(isResizable ? MIN_RESIZABLE_NODE_WIDTH : NODE_WIDTH, nodeWidth);
        
        let nodeHeight;
        if (isResizable) {
          nodeHeight = node.config?.frameHeight || (node.operationType === OperationTypeEnum.COMMENT ? DEFAULT_FRAME_HEIGHT : DEFAULT_FRAME_HEIGHT );
          nodeHeight = Math.max(isResizable ? MIN_RESIZABLE_NODE_HEIGHT : 0, nodeHeight);
        } else {
            let footerHeightCalc = 0;
            const showFooter = node.config?.showFooterNote && node.config?.footerNoteText && node.config.footerNoteText.trim() !== '';
            if (showFooter) {
                const lines = node.config.footerNoteText!.split('\n').length;
                footerHeightCalc = (Math.min(lines, 3) * 14) + (4 * 2) + 1; // NODE_FOOTER_MAX_LINES, NODE_FOOTER_LINE_HEIGHT, NODE_FOOTER_PADDING_Y, NODE_FOOTER_BORDER_HEIGHT
            }
            nodeHeight = NODE_HEADER_HEIGHT + 
                         (node.inputPorts?.filter(p => p).length || 0) * NODE_PORT_HEIGHT + 
                         (node.outputPorts?.filter(p => p).length || 0) * NODE_PORT_HEIGHT +
                         footerHeightCalc;
        }

        minX = Math.min(minX, node.position.x);
        minY = Math.min(minY, node.position.y);
        maxX = Math.max(maxX, node.position.x + nodeWidth);
        maxY = Math.max(maxY, node.position.y + nodeHeight);
      });

      const PADDING = 50; 
      const graphWidth = maxX - minX;
      const graphHeight = maxY - minY;

      if (graphWidth <= 0 || graphHeight <= 0) { 
        const singleNode = nodesToFrame[0];
        const singleNodeWidth = singleNode.config?.frameWidth || NODE_WIDTH;
        let singleNodeHeight;
         const isResizable = singleNode.operationType === OperationTypeEnum.COMMENT || singleNode.operationType === OperationTypeEnum.FRAME;
        if(isResizable){
            singleNodeHeight = singleNode.config?.frameHeight || (singleNode.operationType === OperationTypeEnum.COMMENT ? DEFAULT_FRAME_HEIGHT : DEFAULT_FRAME_HEIGHT );
        } else {
             let footerHeightCalc = 0; 
            singleNodeHeight = NODE_HEADER_HEIGHT + (singleNode.inputPorts?.length || 0) * NODE_PORT_HEIGHT + (singleNode.outputPorts?.length || 0) * NODE_PORT_HEIGHT + footerHeightCalc;
        }

        zoomLevelRef.current = 1;
        panOffsetRef.current = {
          x: viewportWidth / 2 - (singleNode.position.x + singleNodeWidth / 2) * zoomLevelRef.current,
          y: viewportHeight / 2 - (singleNode.position.y + singleNodeHeight / 2) * zoomLevelRef.current,
        };
      } else {
        const newZoomX = viewportWidth / (graphWidth + PADDING * 2);
        const newZoomY = viewportHeight / (graphHeight + PADDING * 2);
        zoomLevelRef.current = Math.max(MIN_ZOOM, Math.min(MAX_ZOOM, newZoomX, newZoomY));
        panOffsetRef.current = {
          x: (viewportWidth / 2) - ((graphWidth / 2) + minX) * zoomLevelRef.current,
          y: (viewportHeight / 2) - ((graphHeight / 2) + minY) * zoomLevelRef.current,
        };
      }
      updateTransformAttribute();
    },
    getSvgElement: () => svgRef.current,
    updateTransform: updateTransformAttribute,
  }));


  const handleNodeDrag = useCallback((nodeId: NodeId, position: { x: number; y: number }) => {
    const newNodes = nodes.map(n => (n.id === nodeId ? { ...n, position } : n));
    onNodesChange(newNodes);
  }, [nodes, onNodesChange]);

  const handlePortMouseDown = useCallback((event: React.MouseEvent, nodeId: NodeId, portId: string, portSide: 'input' | 'output') => {
    event.stopPropagation();
    const portInfo = getPortPositionAndType(nodeId, portId, portSide);
    if (portInfo && portSide === 'output') {  
        onConnectingStart(nodeId, portId, portSide, { x: portInfo.x, y: portInfo.y }); 
    }
  }, [getPortPositionAndType, onConnectingStart]);


  const handleMouseMoveSVG = (event: React.MouseEvent<SVGSVGElement>) => {
    if (isPanning && lastPanPosition && svgRef.current) {
      const dx = event.clientX - lastPanPosition.x;
      const dy = event.clientY - lastPanPosition.y;
      panOffsetRef.current = { x: panOffsetRef.current.x + dx, y: panOffsetRef.current.y + dy };
      updateTransformAttribute();
      setLastPanPosition({ x: event.clientX, y: event.clientY });
      return; 
    }

    if (draggingReroutePoint && svgRef.current) {
        const currentMouseWorldPos = screenToWorld(event.clientX, event.clientY);
        const updatedConnections = connections.map(c => {
            if (c.id === draggingReroutePoint.connectionId && c.reroutePoints) {
                const newReroutePoints = [...c.reroutePoints];
                newReroutePoints[draggingReroutePoint.pointIndex] = {
                    x: currentMouseWorldPos.x,
                    y: currentMouseWorldPos.y
                };
                return { ...c, reroutePoints: newReroutePoints };
            }
            return c;
        });
        onConnectionsChange(updatedConnections);
        return;
    }


    if (selectionRect && selectionRect.visible && svgRef.current) {
        const currentWorldPos = screenToWorld(event.clientX, event.clientY);
        const newX = Math.min(selectionRect.startX, currentWorldPos.x);
        const newY = Math.min(selectionRect.startY, currentWorldPos.y);
        const newWidth = Math.abs(currentWorldPos.x - selectionRect.startX);
        const newHeight = Math.abs(currentWorldPos.y - selectionRect.startY);
        setSelectionRect(prev => prev ? {...prev, x: newX, y: newY, width: newWidth, height: newHeight } : null);
        return;
    }

    if (connectingState.active && svgRef.current && connectingState.sourceNodeId && connectingState.sourcePortId) {
        const worldMousePos = screenToWorld(event.clientX, event.clientY);
        onConnectingUpdate(worldMousePos); 

        let foundPort = false;
        const sourceNode = nodes.find(n => n.id === connectingState.sourceNodeId);
        const sourcePort = sourceNode?.outputPorts.find(p => p.id === connectingState.sourcePortId);

        if (sourceNode && sourcePort) {
            for (const targetNode of nodes) {
                if (targetNode.id === sourceNode.id) continue; 

                targetNode.inputPorts.forEach((targetPort, portIndex) => {
                    if(sourcePort.portType !== targetPort.portType) return;
                     if(sourcePort.portType === PortTypeEnum.DATA && targetPort.portType === PortTypeEnum.DATA &&
                        sourcePort.category !== LogicalCategoryEnum.ANY && targetPort.category !== LogicalCategoryEnum.ANY &&
                        sourcePort.category !== targetPort.category) {
                        return;
                    }

                    const nodeWidth = targetNode.config?.frameWidth || NODE_WIDTH;
                    const portRowWorldTopY = targetNode.position.y + NODE_HEADER_HEIGHT + (portIndex * NODE_PORT_HEIGHT);
                    const portRowWorldBottomY = portRowWorldTopY + NODE_PORT_HEIGHT;
                    const portRowWorldLeftX = targetNode.position.x;
                    const portRowWorldRightX = targetNode.position.x + nodeWidth;

                    if (worldMousePos.x >= portRowWorldLeftX && worldMousePos.x <= portRowWorldRightX &&
                        worldMousePos.y >= portRowWorldTopY && worldMousePos.y <= portRowWorldBottomY) {
                         const { Succeeded: canActuallyConnect } = canPortsConnect(sourcePort, targetPort, targetNode.operationType, connections, sourceNode.id, targetNode.id);
                         if(canActuallyConnect){
                            setHoveredPortInfo({nodeId: targetNode.id, portId: targetPort.id});
                            foundPort = true;
                         } else {
                            setHoveredPortInfo(null); 
                         }
                        return; 
                    }
                });
                if (foundPort) break; 
            }
        }
        if (!foundPort) setHoveredPortInfo(null);
    } else {
        setHoveredPortInfo(null);
    }
  };
  
  const handleMouseUpSVG = (event: React.MouseEvent<SVGSVGElement>) => {
    if (isPanning) {
      setIsPanning(false);
      setLastPanPosition(null);
      return;
    }

    if (draggingReroutePoint) {
        setDraggingReroutePoint(null);
        return;
    }


    if (selectionRect && selectionRect.visible) {
        const { x: selX, y: selY, width: selW, height: selH } = selectionRect;
        const selectedIds: NodeId[] = [];
        nodes.forEach(node => {
            const isResizable = node.operationType === OperationTypeEnum.COMMENT || node.operationType === OperationTypeEnum.FRAME;
            const nodeWidth = isResizable ? (node.config?.frameWidth || (node.operationType === OperationTypeEnum.COMMENT ? DEFAULT_FRAME_WIDTH : DEFAULT_FRAME_WIDTH )) : NODE_WIDTH;
            let nodeHeight;
            if (isResizable) {
                 nodeHeight = node.config?.frameHeight || (node.operationType === OperationTypeEnum.COMMENT ? DEFAULT_FRAME_HEIGHT : DEFAULT_FRAME_HEIGHT );
            } else {
                let footerHeightCalc = 0;
                 const showFooter = node.config?.showFooterNote && node.config?.footerNoteText && node.config.footerNoteText.trim() !== '';
                 if (showFooter) {
                    const lines = node.config.footerNoteText!.split('\n').length;
                    footerHeightCalc = (Math.min(lines, 3) * 14) + (4 * 2) + 1;
                 }
                nodeHeight = NODE_HEADER_HEIGHT + (node.inputPorts?.filter(p => p).length || 0) * NODE_PORT_HEIGHT + (node.outputPorts?.filter(p => p).length || 0) * NODE_PORT_HEIGHT + footerHeightCalc;
            }

            const nodeRight = node.position.x + nodeWidth;
            const nodeBottom = node.position.y + nodeHeight;
            const selRight = selX + selW;
            const selBottom = selY + selH;

            if (node.position.x < selRight && nodeRight > selX &&
                node.position.y < selBottom && nodeBottom > selY) {
                selectedIds.push(node.id);
            }
        });
        onNodeSelect(selectedIds, false); 
        setSelectionRect(null);
        return;
    }


    if (connectingState.active && connectingState.sourceNodeId && connectingState.sourcePortId) {
      const worldMousePos = screenToWorld(event.clientX, event.clientY);
      if (hoveredPortInfo && hoveredPortInfo.nodeId && hoveredPortInfo.portId) {
        const portDetails = getPortPositionAndType(hoveredPortInfo.nodeId, hoveredPortInfo.portId, 'input');
        if (portDetails) {
          onConnectingEnd(hoveredPortInfo.nodeId, hoveredPortInfo.portId, 'input', { x: portDetails.x, y: portDetails.y });
        } else {
          onConnectingEnd(null, null, 'input', {x:0, y:0}); 
        }
      } else { 
        const sourceNode = nodes.find(n => n.id === connectingState.sourceNodeId);
        const sourcePort = sourceNode?.outputPorts.find(p => p.id === connectingState.sourcePortId);
        if (sourceNode && sourcePort) {
          onOpenNodeCreationContextMenu({
            visible: true,
            screenX: event.clientX,
            screenY: event.clientY,
            worldX: worldMousePos.x,
            worldY: worldMousePos.y,
            sourceNodeId: sourceNode.id,
            sourcePortId: sourcePort.id,
            sourcePort: sourcePort 
          });
        } else {
            onConnectingEnd(null, null, 'input', {x:0,y:0});
        }
      }
      setHoveredPortInfo(null);
    }
  };

  const handleSvgMouseDown = (event: React.MouseEvent<SVGSVGElement>) => {
    const actualEventTarget = event.target as SVGElement;

    if (actualEventTarget.nodeName && actualEventTarget.dataset && actualEventTarget.dataset.rerouteConnectionId && actualEventTarget.dataset.rerouteIndex !== undefined) {
      const connectionId = actualEventTarget.dataset.rerouteConnectionId;
      const pointIndex = parseInt(actualEventTarget.dataset.rerouteIndex, 10);
      const connection = connections.find(c => c.id === connectionId);
      if (connection && connection.reroutePoints && connection.reroutePoints[pointIndex]) {
        event.stopPropagation();
        const startWorldPos = screenToWorld(event.clientX, event.clientY);
        setDraggingReroutePoint({
          connectionId,
          pointIndex,
          startDragWorldPos: startWorldPos,
          originalPointPos: connection.reroutePoints[pointIndex]
        });
      }
      return;
    }

    if (event.button === 1) { 
      event.preventDefault();
      setIsPanning(true);
      setLastPanPosition({ x: event.clientX, y: event.clientY });
    } else if (event.button === 0 && (actualEventTarget === svgRef.current || (actualEventTarget.classList && actualEventTarget.classList.contains('canvas-grid-rect')))) { 
        const startWorldPos = screenToWorld(event.clientX, event.clientY);
        setSelectionRect({ x: startWorldPos.x, y: startWorldPos.y, width: 0, height: 0, visible: true, startX: startWorldPos.x, startY: startWorldPos.y });
        onNodeSelect(null, false); 
    }
  };

  const handleWheel = (event: React.WheelEvent<SVGSVGElement>) => {
    event.preventDefault();
    if (!svgRef.current) return;

    const CTM = svgRef.current.getScreenCTM();
    if(!CTM) return;

    const scroll = event.deltaY * ZOOM_SENSITIVITY * -1;
    const newZoomLevel = Math.max(MIN_ZOOM, Math.min(MAX_ZOOM, zoomLevelRef.current * (1 + scroll)));

    const svgMouseX = (event.clientX - CTM.e) / CTM.a;
    const svgMouseY = (event.clientY - CTM.f) / CTM.d;

    const newPanX = svgMouseX - (svgMouseX - panOffsetRef.current.x) * (newZoomLevel / zoomLevelRef.current);
    const newPanY = svgMouseY - (svgMouseY - panOffsetRef.current.y) * (newZoomLevel / zoomLevelRef.current);
    
    zoomLevelRef.current = newZoomLevel;
    panOffsetRef.current = { x: newPanX, y: newPanY };
    
    updateTransformAttribute();

    if (connectingState.active && connectingState.sourcePosition) {
        const worldMousePos = screenToWorld(event.clientX, event.clientY);
        onConnectingUpdate(worldMousePos);
    }
  };

  const generateBezierPath = (x1: number, y1: number, x2: number, y2: number, horizontalOffsetFactor = 0.3) => {
    const dx = x2 - x1;
    const controlPointOffset = Math.max(Math.abs(dx) * horizontalOffsetFactor, 30);
    const cp1x = x1 + controlPointOffset;
    const cp1y = y1;
    const cp2x = x2 - controlPointOffset;
    const cp2y = y2;
    return `M ${x1},${y1} C ${cp1x},${cp1y} ${cp2x},${cp2y} ${x2},${y2}`;
  };

  const handleConnectionDoubleClick = (event: React.MouseEvent, connectionId: string) => {
    event.stopPropagation();
    const worldPos = screenToWorld(event.clientX, event.clientY);
    
    const updatedConnections = connections.map(conn => {
      if (conn.id === connectionId) {
        const newReroutePoints = [...(conn.reroutePoints || [])];
        
        let closestSegmentIndex = -1;
        let minDistSq = Infinity;

        const pointsForSegments = [
            getPortPositionAndType(conn.fromNodeId, conn.fromPortId, 'output')!,
            ...(conn.reroutePoints || []),
            getPortPositionAndType(conn.toNodeId, conn.toPortId, 'input')!
        ].filter(p => p); 

        if (pointsForSegments.length < 2) { 
             newReroutePoints.push(worldPos);
        } else {
            for (let i = 0; i < pointsForSegments.length - 1; i++) {
                const p1 = pointsForSegments[i];
                const p2 = pointsForSegments[i+1];
                
                const midX = (p1.x + p2.x) / 2;
                const midY = (p1.y + p2.y) / 2;
                const distSq = (worldPos.x - midX)**2 + (worldPos.y - midY)**2;

                if (distSq < minDistSq) {
                    minDistSq = distSq;
                    closestSegmentIndex = i;
                }
            }
            newReroutePoints.splice(closestSegmentIndex, 0, worldPos);
        }
        return { ...conn, reroutePoints: newReroutePoints };
      }
      return conn;
    });
    onConnectionsChange(updatedConnections);
  };


  return (
    <svg
      ref={svgRef}
      className="w-full h-full rounded-lg shadow-inner cursor-default select-none canvas-bg-color noise-texture-canvas relative overflow-hidden" 
      onMouseMove={handleMouseMoveSVG}
      onMouseUp={handleMouseUpSVG}
      onMouseDown={handleSvgMouseDown}
      onWheel={handleWheel}
      tabIndex={0}
    >
      <defs>
        <marker id="arrowhead-data" markerWidth="10" markerHeight="7" refX="8" refY="3.5" orient="auto" markerUnits="userSpaceOnUse">
          <polygon points="0 0, 10 3.5, 0 7" fill="#9E9E9E" />
        </marker>
         <marker id="arrowhead-data-gold" markerWidth="10" markerHeight="7" refX="8" refY="3.5" orient="auto" markerUnits="userSpaceOnUse">
          <polygon points="0 0, 10 3.5, 0 7" fill="#FFD700" />
        </marker>
        <marker id="arrowhead-exec" markerWidth="12" markerHeight="8" refX="9" refY="4" orient="auto" markerUnits="userSpaceOnUse">
          <polygon points="0 0, 12 4, 0 8" fill={EXECUTION_CONNECTION_STROKE} />
        </marker>
        <marker id="arrowhead-exec-gold" markerWidth="12" markerHeight="8" refX="9" refY="4" orient="auto" markerUnits="userSpaceOnUse">
          <polygon points="0 0, 12 4, 0 8" fill="#FFD700" />
        </marker>
        <pattern id="gridPattern" width="20" height="20" patternUnits="userSpaceOnUse">
            <circle cx="1" cy="1" r="0.5" fill="rgba(255, 255, 255, 0.08)" /> 
        </pattern>
      </defs>
      
      <g ref={transformedGroupRef} transform={`translate(${panOffsetRef.current.x}, ${panOffsetRef.current.y}) scale(${zoomLevelRef.current})`}>
        <rect 
            x={-50000 / zoomLevelRef.current + (-panOffsetRef.current.x / zoomLevelRef.current)} 
            y={-50000 / zoomLevelRef.current + (-panOffsetRef.current.y / zoomLevelRef.current)}
            width={100000 / zoomLevelRef.current} 
            height={100000 / zoomLevelRef.current} 
            fill="url(#gridPattern)" 
            className="canvas-grid-rect"
            style={{pointerEvents: 'all'}} 
        />
        
        {connections.map((conn) => {
          const fromPosAndType = getPortPositionAndType(conn.fromNodeId, conn.fromPortId, 'output');
          const toPosAndType = getPortPositionAndType(conn.toNodeId, conn.toPortId, 'input');
          if (!fromPosAndType || !toPosAndType) return null;

          const isPulsingExecution = pulsingConnectionInfo?.connectionId === conn.id && pulsingConnectionInfo.isExecutionPulse;
          const isPulsingData = pulsingConnectionInfo?.connectionId === conn.id && !pulsingConnectionInfo.isExecutionPulse;

          const isExecutionConnection = fromPosAndType.portType === PortTypeEnum.EXECUTION;
          
          let strokeColor = isExecutionConnection ? EXECUTION_CONNECTION_STROKE : "#9E9E9E";
          let markerId = isExecutionConnection ? "url(#arrowhead-exec)" : "url(#arrowhead-data)";
          let visualStrokeWidth = isExecutionConnection ? 2 : 1.5;
          let visualPathClass = "";

          if (isPulsingExecution || isPulsingData) {
            strokeColor = "#FFD700"; 
            markerId = isExecutionConnection ? "url(#arrowhead-exec-gold)" : "url(#arrowhead-data-gold)";
            visualStrokeWidth = isExecutionConnection ? 3 : 2.5;
            visualPathClass = "connection-execution-intensified-gold";
          }
          
          let pathData = "";
          const points = [
            { x: fromPosAndType.x, y: fromPosAndType.y },
            ...(conn.reroutePoints || []),
            { x: toPosAndType.x, y: toPosAndType.y }
          ];

          for (let i = 0; i < points.length - 1; i++) {
            pathData += generateBezierPath(points[i].x, points[i].y, points[i+1].x, points[i+1].y);
          }
          
          const interactionPath = (
            <path
                key={`${conn.id}-interaction`}
                d={pathData}
                className="connection-path-interaction-area"
                stroke="transparent"
                strokeWidth={12} 
                fill="none"
                onDoubleClick={(e) => handleConnectionDoubleClick(e, conn.id)}
                style={{ cursor: 'pointer' }}
            />
          );
          
          const ambientPulsePath = !(isPulsingExecution || isPulsingData) ? (
            <path
              key={`${conn.id}-ambient`}
              d={pathData}
              className="connection-ambient-pulse"
              markerEnd={isExecutionConnection ? "url(#arrowhead-exec)" : "url(#arrowhead-data)"}
            />
          ) : null;

          const visualPath = (
            <path
              key={conn.id}
              d={pathData}
              id={`path-${conn.id}`}
              className={visualPathClass}
              style={{ 
                stroke: strokeColor, 
                strokeWidth: visualStrokeWidth / zoomLevelRef.current, 
                strokeLinecap: 'round',
                strokeLinejoin: 'round',
                fill: 'none',
                transition: 'stroke 0.3s ease, stroke-width 0.3s ease, filter 0.3s ease'
              }}
              markerEnd={markerId}
            />
          );

          const reroutePointElements = (conn.reroutePoints || []).map((point, index) => (
            <circle
                key={`${conn.id}-reroute-${index}`}
                cx={point.x}
                cy={point.y}
                r={REROUTE_POINT_RADIUS / zoomLevelRef.current}
                fill={strokeColor}
                stroke="rgba(255,255,255,0.7)"
                strokeWidth={1.5 / zoomLevelRef.current}
                style={{ cursor: 'move' }}
                data-reroute-connection-id={conn.id}
                data-reroute-index={index}
                onMouseDown={(e: React.MouseEvent<SVGCircleElement>) => {
                    e.stopPropagation(); 
                    const startWorldPos = screenToWorld(e.clientX, e.clientY);
                    setDraggingReroutePoint({ connectionId: conn.id, pointIndex: index, startDragWorldPos: startWorldPos, originalPointPos: point});
                }}
            />
          ));
          
          let directionalPulseElement = null;
          if ((isPulsingExecution || isPulsingData) && pulsingConnectionInfo) {
            const pulseColor = "#FFD700"; 
            directionalPulseElement = (
              <circle r={(isExecutionConnection ? 5 : 4) / zoomLevelRef.current} fill={pulseColor} opacity="1">
                <animateMotion
                  key={pulsingConnectionInfo.pulseKey} 
                  dur="0.7s"
                  repeatCount="1"
                  fill="freeze" 
                  path={pathData}
                />
              </circle>
            );
          }

          return (
            <g key={`group-${conn.id}`}>
              {interactionPath}
              {ambientPulsePath} 
              {visualPath}
              {reroutePointElements}
              {directionalPulseElement}
            </g>
          );
        })}

        {nodes.map((node) => {
          const primarySelectedNode = selectedNodeIds.length === 1 ? nodes.find(n => n.id === selectedNodeIds[0]) : null;
          const nodeOutputsForAffinity = primarySelectedNode ? primarySelectedNode.outputPorts.filter(p => p.portType === PortTypeEnum.DATA) : [];
          
          return (
            <NodeComponent
              key={node.id}
              node={node}
              connections={connections}
              onNodeDrag={handleNodeDrag}
              onPortMouseDown={handlePortMouseDown}
              svgRef={svgRef}
              panOffsetRef={panOffsetRef} 
              zoomLevelRef={zoomLevelRef} 
              isSelected={selectedNodeIds.includes(node.id)}
              isHoveredForConnectionPortId={hoveredPortInfo?.nodeId === node.id ? hoveredPortInfo.portId : null}
              onNodeSelect={onNodeSelect}
              onNodeConfigOpen={onNodeConfigOpen}
              onNodeConfigUpdate={onNodeConfigUpdate}
              onRemoveNode={() => onRemoveNode([node.id])} 
              onRemoveConnection={onRemoveConnection}
              resolvedStatesForInspection={resolvedStatesForInspection}
              onEnterMolecularNode={onEnterMolecularNode}
              onNodeResizeEnd={onNodeResizeEnd} 
              allNodesForConnectionContext={allNodesForConnectionContext}
              breakpoints={breakpoints}
              onToggleBreakpoint={onToggleBreakpoint}
              isPausedAtThisNode={node.id === pausedNodeId}
              pulsingNodeInfo={pulsingNodeInfo}
              isNodeInErrorState={isNodeInErrorState(node.id, executionMeta, executionMeta?.log)}
              isQuickInspectTargetNode={isQuickInspectTargetNode} 
              showQuickInspectWithDelay={showQuickInspectWithDelay}
              hideQuickInspect={hideQuickInspect}
              resetQuickInspectTimer={resetQuickInspectTimer}
              clearQuickInspectTimer={clearQuickInspectTimer}
              openQuickInspectImmediately={openQuickInspectImmediately}
              selectedNodeOutputsForAffinity={nodeOutputsForAffinity}
              thisNodeIdForAffinity={node.id}
            />
          );
        })}
        
        {/* Render Floating Panels After Nodes for higher stacking order */}
        {floatingPanels.map((panel) => (
          <FloatingPanelComponent
            key={panel.id}
            panel={panel}
            onPanelDrag={onFloatingPanelDrag}
            onAddNode={onAddNode}
            onAddBlueprintNode={onAddBlueprintNode}
            currentGraphId={currentGraphId}
            parentNodeOperationType={parentNodeOperationType}
            isFocusModeActive={isFocusModeActive}
            selectedNodeOutputsForAffinity={selectedNodeOutputsForAffinity}
            allNodes={allNodesForConnectionContext}
            allConnections={connections}
            // Pass HorizontalToolbarComponent props
            onSaveGraph={onSaveGraph}
            onLoadGraphRequest={onLoadGraphRequest}
            onUndo={onUndo}
            canUndo={canUndo}
            onRedo={onRedo}
            canRedo={canRedo}
            onCopy={onCopy}
            canCopy={canCopy}
            onPaste={onPaste}
            canPaste={canPaste}
            onAlignTop={onAlignTop}
            onDistributeHorizontally={onDistributeHorizontally}
            selectedNodeIdsCount={selectedNodeIdsCount}
            scopeStack={scopeStack}
            onNavigateToScope={onNavigateToScope}
            onFocusGraph={onFocusGraph}
            onClearGraph={onClearGraph}
          />
        ))}


        {selectionRect && selectionRect.visible && (
          <rect
            x={selectionRect.x}
            y={selectionRect.y}
            width={selectionRect.width}
            height={selectionRect.height}
            fill="rgba(68, 138, 255, 0.2)" 
            stroke={SELECTION_COLOR_ACCENT} 
            strokeWidth={1.5 / zoomLevelRef.current} 
            pointerEvents="none"
          />
        )}
      </g>
      
       {connectingState.active && connectingState.sourcePosition && (
        <g transform={`translate(${panOffsetRef.current.x}, ${panOffsetRef.current.y}) scale(${zoomLevelRef.current})`}>
            <path
              d={generateBezierPath(connectingState.sourcePosition.x, connectingState.sourcePosition.y, connectingState.mousePosition.x, connectingState.mousePosition.y)}
              className="connecting-line" 
              style={{ 
                  stroke: nodes.find(n=>n.id === connectingState.sourceNodeId)?.outputPorts.find(p=>p.id === connectingState.sourcePortId)?.portType === PortTypeEnum.EXECUTION ? EXECUTION_CONNECTION_STROKE : '#9E9E9E', 
                  strokeWidth: (nodes.find(n=>n.id === connectingState.sourceNodeId)?.outputPorts.find(p=>p.id === connectingState.sourcePortId)?.portType === PortTypeEnum.EXECUTION ? 2 : 1.5) / zoomLevelRef.current,
                  fill: 'none',
                  strokeLinecap: 'round',
              }}
              markerEnd={nodes.find(n=>n.id === connectingState.sourceNodeId)?.outputPorts.find(p=>p.id === connectingState.sourcePortId)?.portType === PortTypeEnum.EXECUTION ? "url(#arrowhead-exec)" : "url(#arrowhead-data)"}
            />
        </g>
      )}
    </svg>
  );
});

const isNodeInErrorState = (nodeId: NodeId, currentMeta: ExecutionMetaState | null, currentLogsParam: ExecutionMetaState['log'] | undefined) => {
    const currentLogs = currentLogsParam || [];
    if (!currentMeta) return false;
    return currentMeta.status === 'error' &&
           ( (currentMeta.error === TerminalStateReasonEnum.ERROR_OPERATION_FAILED ||
             currentMeta.error === TerminalStateReasonEnum.ERROR_MISSING_INPUT) &&
             currentMeta.fullExecutionPath.some(p => p.nodeId === nodeId)
           ) ||
           currentLogs.some(l => l.nodeId === nodeId && l.type === 'error');
};


export default NodeEditor;
