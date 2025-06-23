
import { useState, useCallback } from 'react';
import {
  AnyNode, Connection, NodeId, OperationTypeEnum, NodeConfig, AtomicNode, MolecularNode,
  InputPort, OutputPort, PortTypeEnum, LogicalCategoryEnum
} from '../types';
// import { moduleManager } from '../services/moduleManager'; // For node definitions - Removed
import { generateNodeId as globalGenerateNodeId, generatePortId as globalGeneratePortId, generateConnectionId as globalGenerateConnectionId } from '../services/nodeFactory';
import { GraphStateForHistory } from './useHistorySelectionState';
import { AtomicNodeDefinition } from '../types';

const CHANNEL_PREFIX = "__channel_"; // If channel logic is part of pasting state nodes

interface ClipboardData {
  nodes: AnyNode[];
  connections: Connection[];
  sourceGraphId: NodeId | 'root';
}

export interface PasteCallbacks {
  getCurrentGraphId: () => NodeId | 'root';
  getCurrentParentNodeType: () => OperationTypeEnum | undefined;
  getCurrentNodes: () => AnyNode[];
  getCurrentConnections: () => Connection[];
  addPastedNodesToScope: (nodesToAdd: AnyNode[]) => void; // Modified to accept multiple nodes
  addPastedConnectionsToScope: (connectionsToAdd: Connection[]) => void;
  updateSelectionAndRecordHistory: (newNodeIds: NodeId[], graphStateForHistory: GraphStateForHistory) => void;
  getGraphStateForHistory: () => GraphStateForHistory;
  initializePastedNodeState: (node: AnyNode, globalStateStore: Map<string, any>) => void;
  getGlobalStateStore: () => Map<string, any>;
  appendLog: (message: string, type: 'info' | 'error' | 'success' | 'debug', nodeId?: NodeId) => void;
  // Pass utility functions if they are not directly importable or for consistency
  generateNodeId: () => NodeId;
  generatePortId: (nodeId: NodeId, type: 'in' | 'out', name: string) => string;
  generateConnectionId: () => string;
  getAtomicNodeDefinition: (opType: OperationTypeEnum) => AtomicNodeDefinition | undefined;
}

export const useClipboardState = () => {
  const [clipboardData, setClipboardDataInternal] = useState<ClipboardData | null>(null);

  const canPaste = !!clipboardData;

  const copyToClipboard = useCallback((
    nodesToCopy: AnyNode[],
    connectionsToCopy: Connection[],
    sourceGraphId: NodeId | 'root'
  ) => {
    setClipboardDataInternal({
      nodes: JSON.parse(JSON.stringify(nodesToCopy)), // Deep clone
      connections: JSON.parse(JSON.stringify(connectionsToCopy)), // Deep clone
      sourceGraphId,
    });
  }, []);

  const pasteFromClipboard = useCallback((callbacks: PasteCallbacks) => {
    if (!clipboardData) return;

    const {
      getCurrentGraphId, getCurrentParentNodeType, getCurrentNodes, getCurrentConnections,
      addPastedNodesToScope, addPastedConnectionsToScope,
      updateSelectionAndRecordHistory, getGraphStateForHistory,
      initializePastedNodeState, getGlobalStateStore, appendLog,
      generateNodeId, generatePortId, generateConnectionId, getAtomicNodeDefinition
    } = callbacks;

    const currentScopeGraphId = getCurrentGraphId();
    const currentScopeParentType = getCurrentParentNodeType();
    const currentScopeNodes = getCurrentNodes();
    const currentScopeConnections = getCurrentConnections();

    let newNodesBatch: AnyNode[] = [];
    let newConnectionsBatch: Connection[] = [];
    const idMap = new Map<NodeId, NodeId>(); // Maps old node IDs to new node IDs
    const portIdMap = new Map<string, string>(); // Maps old port IDs to new port IDs
    const pasteOffsetX = 30;
    const pasteOffsetY = 30;

    const isPastingIntoIncompatibleScope = (nodeType: OperationTypeEnum) => {
      if (currentScopeGraphId !== 'root' && (nodeType === OperationTypeEnum.MOLECULAR || nodeType === OperationTypeEnum.ITERATE)) return true;
      if (currentScopeParentType !== OperationTypeEnum.MOLECULAR && (nodeType === OperationTypeEnum.INPUT_GRAPH || nodeType === OperationTypeEnum.OUTPUT_GRAPH)) return true;
      if (currentScopeParentType !== OperationTypeEnum.ITERATE && (nodeType === OperationTypeEnum.LOOP_ITEM || nodeType === OperationTypeEnum.ITERATION_RESULT)) return true;
      return false;
    };

    clipboardData.nodes.forEach(nodeToPaste => {
      if (isPastingIntoIncompatibleScope(nodeToPaste.operationType)) {
        appendLog(`Skipping paste of node "${nodeToPaste.name}" due to scope incompatibility.`, 'error', nodeToPaste.id);
        return;
      }

      const newNodeId = generateNodeId();
      idMap.set(nodeToPaste.id, newNodeId);
      const nodeDef = getAtomicNodeDefinition(nodeToPaste.operationType);

      const newInputs = nodeToPaste.inputPorts.map(p => {
        const newPortId = generatePortId(newNodeId, 'in', p.name);
        portIdMap.set(p.id, newPortId);
        return { ...p, id: newPortId };
      });
      const newOutputs = nodeToPaste.outputPorts.map(p => {
        const newPortId = generatePortId(newNodeId, 'out', p.name);
        portIdMap.set(p.id, newPortId);
        return { ...p, id: newPortId };
      });

      const newConfig = JSON.parse(JSON.stringify(nodeDef?.defaultConfig ? { ...nodeDef.defaultConfig, ...nodeToPaste.config } : nodeToPaste.config || {}));
      if (nodeToPaste.operationType === OperationTypeEnum.STATE && newConfig.stateId) {
        newConfig.stateId = `${newConfig.stateId}_copy_${Date.now().toString().slice(-4)}`;
      }
       // Clear inputPortOverrides for pasted nodes as connections might change
       if (newConfig.inputPortOverrides) {
        delete newConfig.inputPortOverrides;
      }

      const commonPastedNodeProps = {
        id: newNodeId,
        name: nodeToPaste.name,
        operationType: nodeToPaste.operationType,
        description: nodeDef?.description || nodeToPaste.description,
        inputPorts: newInputs,
        outputPorts: newOutputs,
        position: { x: nodeToPaste.position.x + pasteOffsetX, y: nodeToPaste.position.y + pasteOffsetY },
        isStartNode: nodeToPaste.isStartNode,
        config: newConfig,
      };

      let finalPastedNode: AnyNode;
      if (nodeToPaste.type === 'Molecular') {
        // Deep clone and re-ID subgraph if pasting molecular node
        const molecularToPaste = nodeToPaste as MolecularNode;
        const subGraphIdMap = new Map<NodeId, NodeId>();
        const subGraphPortIdMap = new Map<string, string>();

        const newSubGraphNodes = molecularToPaste.subGraph.nodes.map(subN => {
            const newSubNId = generateNodeId();
            subGraphIdMap.set(subN.id, newSubNId);
            const subNodeDef = getAtomicNodeDefinition(subN.operationType);
            const subNInputs = subN.inputPorts.map(p => { const nId = generatePortId(newSubNId, 'in', p.name); subGraphPortIdMap.set(p.id, nId); return {...p, id: nId}; });
            const subNOutputs = subN.outputPorts.map(p => { const nId = generatePortId(newSubNId, 'out', p.name); subGraphPortIdMap.set(p.id, nId); return {...p, id: nId}; });
            return {...subN, id: newSubNId, inputPorts: subNInputs, outputPorts: subNOutputs, config: {...(subNodeDef?.defaultConfig || {}), ...subN.config} };
        });
        const newSubGraphConnections = molecularToPaste.subGraph.connections.map(subC => ({
            ...subC,
            id: generateConnectionId(),
            fromNodeId: subGraphIdMap.get(subC.fromNodeId)!,
            toNodeId: subGraphIdMap.get(subC.toNodeId)!,
            fromPortId: subGraphPortIdMap.get(subC.fromPortId)!,
            toPortId: subGraphPortIdMap.get(subC.toPortId)!,
        }));

        finalPastedNode = {
          ...commonPastedNodeProps,
          type: 'Molecular',
          subGraph: { nodes: newSubGraphNodes, connections: newSubGraphConnections }
        } as MolecularNode;
      } else {
        finalPastedNode = {
          ...commonPastedNodeProps,
          type: 'Atomic'
        } as AtomicNode;
      }
      newNodesBatch.push(finalPastedNode);
    });

    clipboardData.connections.forEach(conn => {
      const newFromNodeId = idMap.get(conn.fromNodeId);
      const newToNodeId = idMap.get(conn.toNodeId);
      const newFromPortId = portIdMap.get(conn.fromPortId);
      const newToPortId = portIdMap.get(conn.toPortId);

      if (newFromNodeId && newToNodeId && newFromPortId && newToPortId) {
        // Ensure the nodes involved in this connection were actually added (not skipped due to scope)
        if (newNodesBatch.some(n => n.id === newFromNodeId) && newNodesBatch.some(n => n.id === newToNodeId)) {
          newConnectionsBatch.push({
            ...conn,
            id: generateConnectionId(),
            fromNodeId: newFromNodeId,
            toNodeId: newToNodeId,
            fromPortId: newFromPortId,
            toPortId: newToPortId,
          });
        }
      }
    });

    if (newNodesBatch.length > 0) {
      addPastedNodesToScope(newNodesBatch);
      if (newConnectionsBatch.length > 0) {
        addPastedConnectionsToScope(newConnectionsBatch);
      }

      const globalStateStore = getGlobalStateStore();
      newNodesBatch.forEach(n => {
        if (n.operationType === OperationTypeEnum.STATE && n.config?.stateId) {
          initializePastedNodeState(n, globalStateStore);
        }
      });
      
      updateSelectionAndRecordHistory(newNodesBatch.map(n => n.id), getGraphStateForHistory());
      appendLog(`${newNodesBatch.length} node(s) pasted.`, 'info');
    }
  }, [clipboardData]);

  return {
    clipboard: clipboardData,
    canPaste,
    copyToClipboard,
    pasteFromClipboard,
  };
};
