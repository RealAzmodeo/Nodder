
import { useState, useCallback } from 'react';
import {
  AnyNode, Connection, OperationTypeEnum, ConnectingState, NodeId,
  OutputPort, NodeContextMenuState, NodeCreationContextMenuState
} from '../types';
import { generateConnectionId as globalGenerateConnectionId } from '../services/nodeFactory';
import { canConnect } from '../services/validationService';
import { GraphStateForHistory } from './useHistorySelectionState'; // For getCurrentGraphStateForHistory type
import { NodeEditorContextMenuDetails } from '../components/NodeEditor'; // Import the correct details type

interface UseGraphInteractionsProps {
  currentNodes: AnyNode[];
  currentConnections: Connection[];
  addNodeViaHook: (type: OperationTypeEnum, position?: { x: number; y: number }) => AnyNode | null;
  updateConnectionsInCurrentScope: (newConnections: Connection[]) => void; // Changed signature
  selectedNodeIds: NodeId[];
  updateSelectedNodesAndRecord: (newNodeIds: NodeId[], graphStateForHistory: GraphStateForHistory) => void;
  getCurrentGraphStateForHistory: () => GraphStateForHistory;
  recordHistoryEntry: (graphState: GraphStateForHistory, newSelectedIds?: NodeId[], newBreakpointsSet?: Set<string>) => void;
  appendExecutionLog: (message: string, type: 'info' | 'error' | 'success' | 'debug' | 'agent_plan', nodeId?: NodeId) => void;
  clearExecutionState: () => void;
  currentGraphId: NodeId | 'root'; // For context menu node filtering
  currentParentNodeType?: OperationTypeEnum; // For context menu node filtering
}

export const useGraphInteractions = (props: UseGraphInteractionsProps) => {
  const {
    currentNodes, currentConnections, addNodeViaHook, updateConnectionsInCurrentScope,
    selectedNodeIds, updateSelectedNodesAndRecord, getCurrentGraphStateForHistory, recordHistoryEntry,
    appendExecutionLog, clearExecutionState, currentGraphId, currentParentNodeType,
  } = props;

  const [connectingState, setConnectingState] = useState<ConnectingState>({
    active: false,
    sourceNodeId: null,
    sourcePortId: null,
    sourcePosition: null,
    mousePosition: { x: 0, y: 0 },
  });

  const [nodeContextMenu, setNodeContextMenu] = useState<NodeContextMenuState>({
    visible: false, screenX: 0, screenY: 0, targetWorldX: 0, targetWorldY: 0,
    sourceNodeId: '', sourcePortId: '', sourceNode: {} as AnyNode, sourcePort: {} as OutputPort,
  });

  const [nodeCreationContextMenu, setNodeCreationContextMenu] = useState<NodeCreationContextMenuState>({
    visible: false, screenX: 0, screenY: 0, worldX: 0, worldY: 0,
    sourceNodeId: '', sourcePortId: '', sourcePort: {} as OutputPort,
  });

  const handleConnectingStart = useCallback((nodeId: NodeId, portId: string, portSide: 'input' | 'output', portPosition: {x:number, y:number}) => {
    if (portSide === 'output') {
      setConnectingState({ active: true, sourceNodeId: nodeId, sourcePortId: portId, sourcePosition: portPosition, mousePosition: portPosition });
    }
  }, []);

  const handleConnectingUpdate = useCallback((mousePosition: {x: number, y:number}) => {
    if (connectingState.active) {
        setConnectingState(prev => ({ ...prev, mousePosition }));
    }
  }, [connectingState.active]);

  const handleConnectingEnd = useCallback((targetNodeId: NodeId | null, targetPortId: string | null, targetPortSide: 'input' | 'output') => {
    if (!connectingState.active || !connectingState.sourceNodeId || !connectingState.sourcePortId) {
        setConnectingState({ active: false, sourceNodeId: null, sourcePortId: null, sourcePosition: null, mousePosition: { x: 0, y: 0 } });
        return;
    }

    if (targetNodeId && targetPortId && targetPortSide === 'input') {
      const sourceNode = currentNodes.find(n => n.id === connectingState.sourceNodeId);
      const targetNode = currentNodes.find(n => n.id === targetNodeId);
      const sourcePort = sourceNode?.outputPorts.find(p => p.id === connectingState.sourcePortId);
      const targetPort = targetNode?.inputPorts.find(p => p.id === targetPortId);

      if (sourceNode && targetNode && sourcePort && targetPort) {
        const { Succeeded: canConnectResult, Message: connectionMessage } = canConnect(
          sourcePort,
          targetPort,
          targetNode.operationType,
          currentConnections,
          sourceNode.id,
          targetNode.id
        );

        if (canConnectResult) {
          const newConnection: Connection = {
            id: globalGenerateConnectionId(),
            fromNodeId: sourceNode.id,
            fromPortId: sourcePort.id,
            toNodeId: targetNode.id,
            toPortId: targetPort.id,
          };
          updateConnectionsInCurrentScope([...currentConnections, newConnection]);
          recordHistoryEntry(getCurrentGraphStateForHistory());
        } else {
          appendExecutionLog(`Connection failed: ${connectionMessage}`, 'error');
        }
      }
    }
    setConnectingState({ active: false, sourceNodeId: null, sourcePortId: null, sourcePosition: null, mousePosition: { x: 0, y: 0 } });
    clearExecutionState();
  }, [connectingState, updateConnectionsInCurrentScope, currentNodes, currentConnections, recordHistoryEntry, clearExecutionState, getCurrentGraphStateForHistory, appendExecutionLog]);


  const handleOpenNodeContextMenu = useCallback((details: NodeEditorContextMenuDetails) => {
    setNodeContextMenu({
      visible: true,
      screenX: details.screenX,
      screenY: details.screenY,
      targetWorldX: details.worldX,      
      targetWorldY: details.worldY,      
      sourceNodeId: details.sourceNodeId,
      sourcePortId: details.sourcePortId,
      sourceNode: details.sourceNode,
      sourcePort: details.sourcePort,      
    });
  }, []);

  const handleCloseNodeContextMenu = useCallback(() => {
    setNodeContextMenu(prev => ({ ...prev, visible: false }));
  }, []);

  const handleAddNodeAndConnectFromContextMenu = useCallback((
    operationType: OperationTypeEnum,
    sourceNodeId: NodeId,
    sourcePortId: string,
    newNodeWorldPosition: { x: number; y: number }
  ) => {
    const newNode = addNodeViaHook(operationType, newNodeWorldPosition);

    if (newNode) {
      const sourceNode = currentNodes.find(n => n.id === sourceNodeId);
      const sourcePort = sourceNode?.outputPorts.find(p => p.id === sourcePortId);
      
      if (sourcePort && newNode.inputPorts) { // Ensure newNode.inputPorts exists
        const firstCompatibleInputPort = newNode.inputPorts.find(inputPort => {
          const { Succeeded } = canConnect(sourcePort, inputPort, newNode.operationType, currentConnections, sourceNodeId, newNode.id);
          return Succeeded;
        });

        if (firstCompatibleInputPort) {
          const newConnection: Connection = {
            id: globalGenerateConnectionId(),
            fromNodeId: sourceNodeId,
            fromPortId: sourcePortId,
            toNodeId: newNode.id,
            toPortId: firstCompatibleInputPort.id,
          };
          updateConnectionsInCurrentScope([...currentConnections, newConnection]);
        } else {
          appendExecutionLog(`No compatible input port found on new ${operationType} node to connect with ${sourcePort.name}`, 'error', newNode.id);
        }
        updateSelectedNodesAndRecord([newNode.id], getCurrentGraphStateForHistory());
      } else if (!sourcePort) {
        appendExecutionLog(`Source port ${sourcePortId} not found on node ${sourceNodeId}. Cannot connect.`, 'error', sourceNodeId);
      } else if (!newNode.inputPorts) {
        appendExecutionLog(`New node ${newNode.name} has no input ports defined. Cannot connect.`, 'error', newNode.id);
      }
    } else {
        appendExecutionLog(`Failed to create node of type ${operationType} from context menu.`, 'error');
    }
    handleCloseNodeContextMenu();
  }, [addNodeViaHook, currentNodes, currentConnections, updateConnectionsInCurrentScope, handleCloseNodeContextMenu, getCurrentGraphStateForHistory, appendExecutionLog, updateSelectedNodesAndRecord]);

  const handleOpenNodeCreationContextMenu = useCallback((details: NodeCreationContextMenuState) => {
    setNodeCreationContextMenu(details);
  }, []);

  const handleCloseNodeCreationContextMenu = useCallback(() => {
    setNodeCreationContextMenu(prev => ({ ...prev, visible: false }));
    setConnectingState({ active: false, sourceNodeId: null, sourcePortId: null, sourcePosition: null, mousePosition: { x:0, y:0}});
  }, []);

  const handleAddNodeAndConnectFromCreationContextMenu = useCallback((
    operationType: OperationTypeEnum
  ) => {
    if (!nodeCreationContextMenu.visible) return;
    const { sourceNodeId, sourcePortId, worldX, worldY, sourcePort } = nodeCreationContextMenu;

    const newNode = addNodeViaHook(operationType, {x: worldX, y: worldY});
    if (newNode) {
        if (newNode.inputPorts) { // Ensure newNode.inputPorts exists
            const firstCompatibleInputPort = newNode.inputPorts.find(inputP => {
                const { Succeeded } = canConnect(sourcePort, inputP, newNode.operationType, currentConnections, sourceNodeId, newNode.id);
                return Succeeded;
            });

            if (firstCompatibleInputPort) {
                const newConnection: Connection = {
                    id: globalGenerateConnectionId(),
                    fromNodeId: sourceNodeId,
                    fromPortId: sourcePortId,
                    toNodeId: newNode.id,
                    toPortId: firstCompatibleInputPort.id,
                };
                updateConnectionsInCurrentScope([...currentConnections, newConnection]);
            } else {
                appendExecutionLog(`No compatible input port found on new ${operationType} node to connect with ${sourcePort.name}`, 'error', newNode.id);
            }
            updateSelectedNodesAndRecord([newNode.id], getCurrentGraphStateForHistory());
        } else {
             appendExecutionLog(`New node ${newNode.name} has no input ports defined. Cannot connect.`, 'error', newNode.id);
        }
    } else {
         appendExecutionLog(`Failed to create node of type ${operationType} from creation context menu.`, 'error');
    }
    handleCloseNodeCreationContextMenu();
  }, [nodeCreationContextMenu, addNodeViaHook, currentConnections, updateConnectionsInCurrentScope, handleCloseNodeCreationContextMenu, getCurrentGraphStateForHistory, appendExecutionLog, updateSelectedNodesAndRecord]);


  return {
    connectingState,
    nodeContextMenu,
    nodeCreationContextMenu,
    handleConnectingStart,
    handleConnectingUpdate,
    handleConnectingEnd,
    handleOpenNodeContextMenu,
    handleCloseNodeContextMenu,
    handleAddNodeAndConnectFromContextMenu,
    handleOpenNodeCreationContextMenu,
    handleCloseNodeCreationContextMenu,
    handleAddNodeAndConnectFromCreationContextMenu,
  };
};
