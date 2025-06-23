
import React, { useState, useCallback, useEffect, useMemo, useRef } from 'react';
import {
  AnyNode, Connection, OperationTypeEnum, ConnectingState, NodeId, ExecutionMetaState, ExecutionContext,
  AtomicNode, MolecularNode, InputPort, OutputPort, LogicalCategoryEnum, ExecutionResult, NodeConfig, Port, PortTypeEnum, ScopeStackItem, NodeResizeEndHandler, NodeContextMenuState, TerminalStateReasonEnum, AgentPlan, Breakpoints, SteppingMode, AutocompleteItem, QuickInspectField, NodeCreationContextMenuState, QuickInspectData,
  FloatingPanelData 
} from '../types';
import { generateNodeId as globalGenerateNodeId, generateConnectionId as globalGenerateConnectionId, generatePortId as globalGeneratePortId } from '../services/nodeFactory';
import { canConnect } from '../services/validationService';
import NodeEditor, { NodeEditorContextMenuDetails, NodeEditorRef } from './NodeEditor';
import ControlsPanel from './ControlsPanel';
import InspectorPanel from './InspectorPanel';
import LogView from './LogView';
import NodeConfigModal from './NodeConfigModal';
import ClearGraphConfirmationModal from './ClearGraphConfirmationModal';
import Breadcrumbs from './Breadcrumbs';
import DebugControls from './DebugControls';
import * as Icons from './Icons';
import NodeContextMenu from './NodeContextMenu';
import NodeCreationContextMenu from './NodeCreationContextMenu';
import CommandAgentPanel from './CommandAgentPanel';
import { useGraphState } from '../hooks/useGraphState';
import { useHistorySelectionState, GraphStateForHistory, HistorySelectionStateCallbacks } from '../hooks/useHistorySelectionState';
import { useExecutionState } from '../hooks/useExecutionState';
import { useClipboardState, PasteCallbacks } from '../hooks/useClipboardState';
import { useQuickShelf } from '../hooks/useQuickShelf';
import QuickInspectPopover from './QuickInspectPopover'; // Corrected path
import { moduleLoaderService } from '../services/ModuleLoaderService';
import { nodeRegistryService } from '../services/NodeRegistryService';
import { componentRegistryService } from '../services/ComponentRegistryService';
import { useAgentState } from '../hooks/useAgentState';
import { useModalManager } from '../hooks/useModalManager';
import { useQuickInspect, UseQuickInspectReturn } from '../hooks/useQuickInspect';
import { useGraphInteractions } from '../hooks/useGraphInteractions';
import { getAgentServiceStatus } from '../services/agentService';


const CHANNEL_PREFIX = "__channel_";

const COLLAPSED_WIDTH_CLASS = "w-16"; 
const EXPANDED_WIDTH_LEFT_CLASS = "w-[300px]"; 
const EXPANDED_WIDTH_RIGHT_CLASS = "w-[380px]"; 

export const App: React.FC = () => {
  const [modulesInitialized, setModulesInitialized] = useState(false);
  const [isLeftPanelCollapsed, setIsLeftPanelCollapsed] = useState(false);
  const [isRightPanelCollapsed, setIsRightPanelCollapsed] = useState(false);

  const [floatingPanels, setFloatingPanels] = useState<FloatingPanelData[]>([
    { id: 'fp_node_palette', position: { x: 50, y: 180 }, width: 320, height: 700 },
    { id: 'fp_horizontal_tools_panel', position: { x: 320, y: 60 }, width: 900, height: 60 }
  ]);


  const {
    nodes, connections, currentGraphId, scopeStack, currentNodes, currentConnections,
    currentParentNodeId, currentParentNodeType,
    setGraphStateForLoad, addNode: addNodeViaHook, addBlueprint: addBlueprintViaHook, updateNodesInCurrentScope,
    updateConnectionsInCurrentScope, navigateToNodeScope: navigateToNodeScopeViaHook, navigateToStackIndex: navigateToStackIndexViaHook,
    removeNode: removeNodeViaHook, updateNodeConfig: updateNodeConfigViaHook, updateNodeName: updateNodeNameViaHook, updateNodeSize: updateNodeSizeViaHook, regenerateMolecularNodePorts
  } = useGraphState();

  const {
    executionMeta, isExecuting, resolvedStatesForInspection, executionLogs,
    initiateExecution, initiateEventFlow: initiateEventFlowViaHook, stopCurrentExecution,
    resumePausedExecution, stepOverPausedExecution, clearExecutionState,
    appendLog: appendExecutionLog, setExecutionStatus
  } = useExecutionState();

  const {
    selectedNodeIds, breakpoints, canUndo, canRedo,
    initializeHistory, recordHistoryEntry, undo: undoHistory, redo: redoHistory,
    updateSelectedNodesAndRecord, updateBreakpointsAndRecord, clearHistoryAndSelection,
  } = useHistorySelectionState();

  const {
    clipboard, canPaste, copyToClipboard, pasteFromClipboard,
  } = useClipboardState();

  const { quickShelfItems, addQuickShelfItem, removeQuickShelfItem } = useQuickShelf({ appendLog: appendExecutionLog });

  const {
    isConfigModalOpen, configuringNode, isClearGraphModalOpen, graphNameToClear,
    openConfigModal, closeConfigModal, openClearGraphModal, closeClearGraphModal
  } = useModalManager();

  const {
    quickInspectPopoverData,
    isQuickInspectTargetNode,
    showQuickInspectWithDelay,
    hideQuickInspect,
    resetQuickInspectTimer,
    clearQuickInspectTimer,
    openQuickInspectImmediately,
  } = useQuickInspect();


  const globalStateStoreRef = useRef(new Map<string, any>());
  const nodeEditorRef = useRef<NodeEditorRef>(null);
  const commandBarInputRef = useRef<HTMLInputElement>(null);
  const loadGraphInputRef = useRef<HTMLInputElement | null>(null);


  const [eventNameInput, setEventNameInput] = useState<string>('myEvent');
  const [eventPayloadInput, setEventPayloadInput] = useState<string>('{"data": "test"}');
  
  const [isSequenceModeActive, setIsSequenceModeActive] = useState(false);
  const [isFocusModeActive, setIsFocusModeActive] = useState(false);


  const getCurrentGraphStateForHistory = useCallback((): GraphStateForHistory => {
    return {
        nodes: JSON.parse(JSON.stringify(nodes)),
        connections: JSON.parse(JSON.stringify(connections)),
        scopeStack: JSON.parse(JSON.stringify(scopeStack)),
        currentGraphId: currentGraphId,
    };
  }, [nodes, connections, scopeStack, currentGraphId]);

  const {
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
  } = useGraphInteractions({
    currentNodes,
    currentConnections,
    addNodeViaHook,
    updateConnectionsInCurrentScope,
    selectedNodeIds,
    updateSelectedNodesAndRecord,
    getCurrentGraphStateForHistory,
    recordHistoryEntry,
    appendExecutionLog,
    clearExecutionState,
    currentGraphId, 
    currentParentNodeType, 
  });

  const commitAgentPlanToGraphCallback = useCallback((plan: AgentPlan) => {
    if (!plan) return;
    try {
        const tempIdToNewNodeMap = new Map<string, AnyNode>();
        plan.nodesToCreate.forEach(plannedNode => { 
            const newNode = addNodeViaHook(plannedNode.operationType, plannedNode.position);
            if (!newNode) throw new Error(`Failed to create node for agent: ${plannedNode.name}`);

            let finalNode = newNode;
            if (plannedNode.name && plannedNode.name !== newNode.name) {
                 updateNodeNameViaHook(newNode.id, plannedNode.name);
                 finalNode = {...finalNode, name: plannedNode.name};
            }
            if (plannedNode.config) {
                updateNodeConfigViaHook(newNode.id, plannedNode.config);
                 finalNode = {...finalNode, config: {...finalNode.config, ...plannedNode.config}};
            }
            tempIdToNewNodeMap.set(plannedNode.tempId, finalNode);
        });

        const newConnectionsBatch: Connection[] = [];
        plan.connectionsToCreate.forEach(plannedConnection => { 
            const fromNode = tempIdToNewNodeMap.get(plannedConnection.fromNodeTempId);
            const toNode = tempIdToNewNodeMap.get(plannedConnection.toNodeTempId);

            if (!fromNode || !toNode) {
                throw new Error(`Agent Plan Error: Could not find nodes for connection: ${plannedConnection.fromNodeTempId} -> ${plannedConnection.toNodeTempId}`);
            }

            const sourcePort = fromNode.outputPorts.find(p => p.name === plannedConnection.fromPortName);
            const targetPort = toNode.inputPorts.find(p => p.name === plannedConnection.toPortName);

            if (!sourcePort || !targetPort) {
                const availableFrom = fromNode.outputPorts.map(p=>p.name).join(', ');
                const availableTo = toNode.inputPorts.map(p=>p.name).join(', ');
                throw new Error(`Agent Plan Error: Could not find ports for connection. From: ${fromNode.name}.${plannedConnection.fromPortName} (Avail: ${availableFrom}). To: ${toNode.name}.${plannedConnection.toPortName} (Avail: ${availableTo})`);
            }
            
            const { Succeeded, Message } = canConnect(sourcePort, targetPort, toNode.operationType, currentConnections, fromNode.id, toNode.id);
            if (!Succeeded) {
                throw new Error(`Agent Plan Error: Invalid connection proposed: ${Message}`);
            }

            newConnectionsBatch.push({
                id: globalGenerateConnectionId(),
                fromNodeId: fromNode.id,
                fromPortId: sourcePort.id,
                toNodeId: toNode.id,
                toPortId: targetPort.id,
            });
        });

        if (newConnectionsBatch.length > 0) {
            updateConnectionsInCurrentScope([...currentConnections, ...newConnectionsBatch]);
        }
        recordHistoryEntry(getCurrentGraphStateForHistory());
        updateSelectedNodesAndRecord(Array.from(tempIdToNewNodeMap.values()).map(n => n.id), getCurrentGraphStateForHistory());
        appendExecutionLog("Agent plan committed successfully.", 'success');

    } catch (error: any) {
        console.error("Error committing agent plan:", error);
        appendExecutionLog(`Error committing agent plan: ${error.message}`, 'error');
        throw error; 
    }
  }, [addNodeViaHook, updateNodeNameViaHook, updateNodeConfigViaHook, updateConnectionsInCurrentScope, updateSelectedNodesAndRecord, currentConnections, appendExecutionLog, getCurrentGraphStateForHistory, recordHistoryEntry]);


  const getAvailableNodeOperationsForAgent = useCallback(() => {
    return nodeRegistryService.getAllNodeDefinitions().map(def => def.operationType);
  }, []);

  const {
    isAgentProcessing,
    currentAgentPlan,
    submitAgentCommand,
    confirmAgentPlan,
    discardAgentPlan,
  } = useAgentState({
    appendLog: appendExecutionLog,
    commitPlanToGraph: commitAgentPlanToGraphCallback,
    getAvailableNodeOperations: getAvailableNodeOperationsForAgent,
  });

  useEffect(() => {
    const initializeAppModules = async () => {
      await moduleLoaderService.loadModules();
      setModulesInitialized(true);
    };
    initializeAppModules();
  }, []);


  useEffect(() => {
    if (modulesInitialized) {
        initializeHistory(getCurrentGraphStateForHistory());
        initializeGlobalStateFromNodes(nodes, true);

        // Check Agent Service Status once modules are initialized and appendLog is available
        if (appendExecutionLog) {
            const agentStatus = getAgentServiceStatus();
            if (!agentStatus.isOperational) {
                appendExecutionLog(`Agent Service Warning: ${agentStatus.message}`, 'warning');
            } else {
                // Optionally log success, or do nothing if it's expected to be operational
                // appendExecutionLog(agentStatus.message, 'info');
            }
        }
    }
  }, [modulesInitialized, initializeHistory, getCurrentGraphStateForHistory, nodes, appendExecutionLog]);


  const initializeGlobalStateFromNodes = useCallback((nodesToScan: AnyNode[], clearExisting: boolean) => {
    if (!modulesInitialized) return;
    if (clearExisting) {
        globalStateStoreRef.current.clear();
    }
    nodesToScan.forEach(node => {
        const nodeDef = nodeRegistryService.getNodeDefinition(node.operationType);
        const initialConfig = nodeDef?.defaultConfig || {};
        const finalConfig = { ...initialConfig, ...node.config };

        if (node.operationType === OperationTypeEnum.STATE && finalConfig?.stateId) {
            const stateId = finalConfig.stateId;
            const initialValue = finalConfig.initialValue;
            if (clearExisting || !globalStateStoreRef.current.has(stateId)) {
                globalStateStoreRef.current.set(stateId, initialValue);
            }
        }
        if (node.type === 'Molecular' && (node as MolecularNode).subGraph?.nodes) {
            initializeGlobalStateFromNodes((node as MolecularNode).subGraph.nodes, false);
        }
    });
  }, [modulesInitialized]); 


  const handleExecuteSelectedOutputWrapper = async () => {
    if (selectedNodeIds.length !== 1) {
      appendExecutionLog("Please select a single node to execute its output.", 'error');
      return;
    }
    const singleSelectedNodeId = selectedNodeIds[0];
    const nodeToExecute = currentNodes.find(n => n.id === singleSelectedNodeId);

    if (!nodeToExecute) {
      appendExecutionLog(`Selected node ${singleSelectedNodeId} not found in current scope.`, 'error');
      return;
    }

    let determinedTargetPortId: string | undefined = undefined;
    if (nodeToExecute.outputPorts.length > 0) {
      const dataOutputPorts = nodeToExecute.outputPorts.filter(p => p.portType === PortTypeEnum.DATA);
      if (dataOutputPorts.length > 0) {
        determinedTargetPortId = dataOutputPorts[0].id;
      } else {
        determinedTargetPortId = nodeToExecute.outputPorts[0].id;
      }
    }

    if (!determinedTargetPortId) {
      appendExecutionLog(`Node '${nodeToExecute.name}' has no suitable output port to resolve.`, 'error', nodeToExecute.id);
      return;
    }

    await initiateExecution(singleSelectedNodeId, determinedTargetPortId, nodes, connections, globalStateStoreRef.current);
  };

  const handleDispatchEventWrapper = async (steppingModeOverride?: SteppingMode) => {
    if (!eventNameInput.trim() && steppingModeOverride !== 'step_over' && steppingModeOverride !== null) {
      appendExecutionLog("Event name cannot be empty.", 'error');
      return;
    }
    let parsedPayload: any;
    try {
        parsedPayload = eventPayloadInput.trim() ? JSON.parse(eventPayloadInput) : undefined;
    } catch (e: any) {
        appendExecutionLog(`Invalid JSON payload: ${e.message}`, 'error');
        return;
    }

    await initiateEventFlowViaHook(
        eventNameInput,
        parsedPayload,
        nodes,
        connections,
        globalStateStoreRef.current,
        executionMeta?.pausedNodeId,
        steppingModeOverride || 'run'
    );
  };

  const handleResumeExecutionWrapper = () => {
    if (executionMeta?.pausedNodeId) {
      resumePausedExecution(eventNameInput, eventPayloadInput ? JSON.parse(eventPayloadInput) : undefined, nodes, connections, globalStateStoreRef.current);
    }
  };

  const handleStepOverWrapper = () => {
     if (executionMeta?.pausedNodeId) {
      stepOverPausedExecution(eventNameInput, eventPayloadInput ? JSON.parse(eventPayloadInput) : undefined, nodes, connections, globalStateStoreRef.current);
    }
  };

  const handleToggleBreakpointWrapper = (nodeId: NodeId) => {
    const newBreakpoints = new Set(breakpoints);
    if (newBreakpoints.has(nodeId)) {
      newBreakpoints.delete(nodeId);
    } else {
      newBreakpoints.add(nodeId);
    }
    updateBreakpointsAndRecord(newBreakpoints, getCurrentGraphStateForHistory());
  };

  const handleClearGraphModalOpenWrapper = () => {
    const name = currentGraphId === 'root' ? 'Root Graph' : scopeStack.find(s => s.id === currentGraphId)?.name || 'current sub-graph';
    openClearGraphModal(name);
  };

  const executeClearGraph = () => {
    const graphName = currentGraphId === 'root' ? 'Root Graph' : scopeStack.find(s => s.id === currentGraphId)?.name || 'current sub-graph';
    const nodesToClear = currentNodes;

    nodesToClear.forEach(nodeToClear => {
        if (nodeToClear.operationType === OperationTypeEnum.STATE && nodeToClear.config?.stateId) {
            globalStateStoreRef.current.delete(nodeToClear.config.stateId);
        }
        if (currentGraphId === 'root' && (nodeToClear.operationType === OperationTypeEnum.SEND_DATA || nodeToClear.operationType === OperationTypeEnum.RECEIVE_DATA) && nodeToClear.config?.channelName) {
            globalStateStoreRef.current.delete(`${CHANNEL_PREFIX}${nodeToClear.config.channelName}`);
        }
        if (currentGraphId === 'root' && nodeToClear.type === 'Molecular') {
            const clearSubGraphStatesAndChannels = (subGraphNodes: AnyNode[]) => {
                subGraphNodes.forEach(subN => {
                    if (subN.operationType === OperationTypeEnum.STATE && subN.config?.stateId) {
                        globalStateStoreRef.current.delete(subN.config.stateId);
                    }
                    if ((subN.operationType === OperationTypeEnum.SEND_DATA || subN.operationType === OperationTypeEnum.RECEIVE_DATA) && subN.config?.channelName) {
                         globalStateStoreRef.current.delete(`${CHANNEL_PREFIX}${subN.config.channelName}`);
                    }
                    if (subN.type === 'Molecular') clearSubGraphStatesAndChannels((subN as MolecularNode).subGraph.nodes);
                });
            };
            clearSubGraphStatesAndChannels((nodeToClear as MolecularNode).subGraph.nodes);
        }
    });

    const clearedGraphStateForHistory: GraphStateForHistory = currentParentNodeId ?
      { nodes: [], connections: [], currentGraphId: currentGraphId, scopeStack: scopeStack } :
      { nodes: [], connections: [], currentGraphId: 'root', scopeStack: [{ id: 'root', name: 'Root Graph' }] };

    if (currentParentNodeId) {
      updateNodesInCurrentScope([]);
      updateConnectionsInCurrentScope([]);
    } else {
      setGraphStateForLoad(clearedGraphStateForHistory);
    }

    clearHistoryAndSelection(clearedGraphStateForHistory);
    appendExecutionLog(`${graphName} cleared.`, 'info');
    closeClearGraphModal();
  };

  const handleSaveAndClearGraph = () => {
    handleSaveGraph();
    executeClearGraph(); 
  };

  const handleSaveGraph = () => {
    const graphData = {
      nodes,
      connections,
      currentGraphId,
      scopeStack,
      globalStateStore: Array.from(globalStateStoreRef.current.entries()),
      breakpoints: Array.from(breakpoints),
      floatingPanels, 
    };
    const blob = new Blob([JSON.stringify(graphData, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'node_graph.json';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    appendExecutionLog('Graph saved.', 'success');
  };

  const handleLoadGraphFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (e) => {
        try {
          const graphData = JSON.parse(e.target?.result as string);
          if (graphData.nodes && graphData.connections) {
            const loadedGraphStateForHistory: GraphStateForHistory = {
              nodes: graphData.nodes,
              connections: graphData.connections,
              currentGraphId: graphData.currentGraphId || 'root',
              scopeStack: graphData.scopeStack || [{id: 'root', name: 'Root Graph'}]
            };
            setGraphStateForLoad(loadedGraphStateForHistory);
            const loadedBreakpoints = new Set(graphData.breakpoints || []) as Breakpoints;

            initializeHistory({...loadedGraphStateForHistory});
            updateBreakpointsAndRecord(loadedBreakpoints, loadedGraphStateForHistory);


            if (graphData.globalStateStore && Array.isArray(graphData.globalStateStore)) {
                globalStateStoreRef.current = new Map(graphData.globalStateStore);
            } else {
                initializeGlobalStateFromNodes(graphData.nodes, true);
            }
            if (graphData.floatingPanels && Array.isArray(graphData.floatingPanels)) { 
              setFloatingPanels(graphData.floatingPanels);
            } else {
              setFloatingPanels([
                { id: 'fp_node_palette', position: { x: 50, y: 180 }, width: 320, height: 700 },
                { id: 'fp_horizontal_tools_panel', position: { x: 320, y: 60 }, width: 900, height: 60 }
              ]);
            }
            clearExecutionState();
            appendExecutionLog('Graph loaded.', 'success');
            setExecutionStatus('completed');
          } else {
            appendExecutionLog('Invalid graph file format.', 'error');
          }
        } catch (error: any) {
          appendExecutionLog(`Error loading graph: ${error.message}`, 'error');
        }
        if (event.target) event.target.value = ''; // Reset file input
      };
      reader.readAsText(file);
    }
  };

  const handleLoadGraphRequest = () => {
    loadGraphInputRef.current?.click();
  };


  const handleNodeSelectWrapper = useCallback((nodeIdOrIds: NodeId | NodeId[] | null, isCtrlOrMetaPressed: boolean = false) => {
    let newSelectedIds: NodeId[];
    if (nodeIdOrIds === null) {
        newSelectedIds = [];
    } else if (Array.isArray(nodeIdOrIds)) {
        newSelectedIds = nodeIdOrIds;
    } else {
        if (isCtrlOrMetaPressed) {
            if (selectedNodeIds.includes(nodeIdOrIds)) {
                newSelectedIds = selectedNodeIds.filter(id => id !== nodeIdOrIds);
            } else {
                newSelectedIds = [...selectedNodeIds, nodeIdOrIds];
            }
        } else {
            newSelectedIds = [nodeIdOrIds];
        }
    }
    updateSelectedNodesAndRecord(newSelectedIds, getCurrentGraphStateForHistory());
    clearExecutionState();
  }, [selectedNodeIds, updateSelectedNodesAndRecord, clearExecutionState, getCurrentGraphStateForHistory]);

  const handleConfigModalOpenWrapper = (nodeId: NodeId) => {
    const nodeToConfig = currentNodes.find(n => n.id === nodeId);
    if (nodeToConfig) {
      openConfigModal(nodeToConfig);
    }
  };

  const handleActualNodeConfigUpdate = (nodeId: string, newConfigPart: Partial<NodeConfig>) => {
    updateNodeConfigViaHook(nodeId, newConfigPart);
    const nodeToUpdate = (currentGraphId === 'root' ? nodes : currentNodes).find(n => n.id === nodeId);
    if (nodeToUpdate?.operationType === OperationTypeEnum.STATE) {
        const oldStateId = nodeToUpdate.config?.stateId;
        const newStateId = newConfigPart?.stateId;
        if (oldStateId && newStateId && oldStateId !== newStateId) {
            if (globalStateStoreRef.current.has(oldStateId)) {
                const value = globalStateStoreRef.current.get(oldStateId);
                globalStateStoreRef.current.delete(oldStateId);
                globalStateStoreRef.current.set(newStateId as string, value);
            } else {
                 globalStateStoreRef.current.set(newStateId as string, newConfigPart?.initialValue);
            }
        } else if (newStateId && !globalStateStoreRef.current.has(newStateId as string)) {
            globalStateStoreRef.current.set(newStateId as string, newConfigPart?.initialValue);
        }
    }
    recordHistoryEntry(getCurrentGraphStateForHistory());
    clearExecutionState();
  };


  const handleActualNodeNameChange = (nodeId: string, newName: string) => {
    updateNodeNameViaHook(nodeId, newName);
    recordHistoryEntry(getCurrentGraphStateForHistory());
  };

  const handleActualNodeResizeEndWrapper: NodeResizeEndHandler = useCallback((nodeId, dimensions) => {
    updateNodeSizeViaHook(nodeId, dimensions);
    recordHistoryEntry(getCurrentGraphStateForHistory());
  }, [updateNodeSizeViaHook, recordHistoryEntry, getCurrentGraphStateForHistory]);

  const handleRemoveMultipleNodesWrapper = useCallback((nodeIdsToRemove: NodeId[]) => {
    if (nodeIdsToRemove.length === 0) return;

    const nodesBeingRemoved = currentNodes.filter(n => nodeIdsToRemove.includes(n.id));

    nodesBeingRemoved.forEach(nodeToRemove => {
        if (nodeToRemove.operationType === OperationTypeEnum.STATE && nodeToRemove.config?.stateId) {
            globalStateStoreRef.current.delete(nodeToRemove.config.stateId);
        }
        if ((nodeToRemove.operationType === OperationTypeEnum.SEND_DATA || nodeToRemove.operationType === OperationTypeEnum.RECEIVE_DATA) && nodeToRemove.config?.channelName) {
            if (currentGraphId === 'root') {
                globalStateStoreRef.current.delete(`${CHANNEL_PREFIX}${nodeToRemove.config.channelName}`);
            }
        }
        removeNodeViaHook(nodeToRemove.id);
    });

    updateSelectedNodesAndRecord([], getCurrentGraphStateForHistory());
    clearExecutionState();
  }, [currentNodes, currentGraphId, removeNodeViaHook, updateSelectedNodesAndRecord, clearExecutionState, getCurrentGraphStateForHistory]);

  const handleRemoveConnectionWrapper = useCallback((connectionIdToRemove: string) => {
    updateConnectionsInCurrentScope(currentConnections.filter(conn => conn.id !== connectionIdToRemove));
    recordHistoryEntry(getCurrentGraphStateForHistory());
    clearExecutionState();
  }, [currentConnections, updateConnectionsInCurrentScope, recordHistoryEntry, clearExecutionState, getCurrentGraphStateForHistory]);

  const handleActualEnterMolecularNode = (nodeId: NodeId, nodeName: string) => {
    navigateToNodeScopeViaHook(nodeId, nodeName, currentNodes);
    updateSelectedNodesAndRecord([], getCurrentGraphStateForHistory());
    clearExecutionState();
  };

  const handleActualNavigateToScope = (targetScopeId: NodeId | 'root', indexInStack: number) => {
    navigateToStackIndexViaHook(targetScopeId, indexInStack);
    updateSelectedNodesAndRecord([], getCurrentGraphStateForHistory());
    clearExecutionState();
  };

  const panOffsetRef = useRef( { x: 0, y: 0 });
  const zoomLevelRef = useRef(1);

  const handleFocusOnGraph = () => {
    nodeEditorRef.current?.focusOnGraph(currentNodes);
  };

  const handleAlignSelectedTop = () => {
    if (selectedNodeIds.length < 2) return;
    const selNodes = currentNodes.filter(n => selectedNodeIds.includes(n.id));
    if (selNodes.length < 2) return;

    const minY = Math.min(...selNodes.map(n => n.position.y));
    const updatedNodesInScope = currentNodes.map(n =>
        selectedNodeIds.includes(n.id) ? { ...n, position: { ...n.position, y: minY } } : n
    );
    updateNodesInCurrentScope(updatedNodesInScope);
    recordHistoryEntry(getCurrentGraphStateForHistory());
  };

  const handleDistributeSelectedHorizontally = () => {
    if (selectedNodeIds.length < 2) return;
    const selNodes = currentNodes.filter(n => selectedNodeIds.includes(n.id))
                             .sort((a, b) => a.position.x - b.position.x);
    if (selNodes.length < 2) return;

    const SPACING = 30;
    let currentX = selNodes[0].position.x;
    const updates: { nodeId: NodeId; newX: number }[] = [{nodeId: selNodes[0].id, newX: selNodes[0].position.x}];

    for (let i = 1; i < selNodes.length; i++) {
        const prevNode = selNodes[i-1];
        const prevNodeInCurrentNodesList = currentNodes.find(n => n.id === prevNode.id);
        if (!prevNodeInCurrentNodesList) continue;

        const nodeDef = nodeRegistryService.getNodeDefinition(prevNodeInCurrentNodesList.operationType);
        const isResizable = prevNodeInCurrentNodesList.operationType === OperationTypeEnum.COMMENT || prevNodeInCurrentNodesList.operationType === OperationTypeEnum.FRAME;
        const prevNodeWidth = isResizable ? (prevNodeInCurrentNodesList.config?.frameWidth || nodeDef?.defaultConfig.frameWidth || 200) : 200;

        currentX += prevNodeWidth + SPACING;
        updates.push({nodeId: selNodes[i].id, newX: currentX});
    }

    const updatedNodesInScope = currentNodes.map(n => {
        const update = updates.find(u => u.nodeId === n.id);
        return update ? { ...n, position: { ...n.position, x: update.newX } } : n;
    });
    updateNodesInCurrentScope(updatedNodesInScope);
    recordHistoryEntry(getCurrentGraphStateForHistory());
  };

  const selectedNodeForInspector = selectedNodeIds.length === 1 ? currentNodes.find(node => node.id === selectedNodeIds[0]) : null;

  const selectedNodeOutputsForAffinity = useMemo(() => {
    if (selectedNodeIds.length === 1) {
        const node = currentNodes.find(n => n.id === selectedNodeIds[0]);
        return node ? node.outputPorts.filter(p => p.portType === PortTypeEnum.DATA) : [];
    }
    return [];
  }, [selectedNodeIds, currentNodes]);


  const historyCallbacks: HistorySelectionStateCallbacks = useMemo(() => ({
    setGraphState: (graphData) => setGraphStateForLoad(graphData),
    clearExecutionState: clearExecutionState,
  }), [setGraphStateForLoad, clearExecutionState]);

  const handleUndoWrapper = useCallback(() => undoHistory(historyCallbacks), [undoHistory, historyCallbacks]);
  const handleRedoWrapper = useCallback(() => redoHistory(historyCallbacks), [redoHistory, historyCallbacks]);

  const handleCopyToClipboardWrapper = useCallback(() => {
    if (selectedNodeIds.length === 0) return;
    const nodesToCopy = currentNodes.filter(n => selectedNodeIds.includes(n.id));
    const connectionsToCopy = currentConnections.filter(c =>
        selectedNodeIds.includes(c.fromNodeId) && selectedNodeIds.includes(c.toNodeId)
    );
    copyToClipboard(nodesToCopy, connectionsToCopy, currentGraphId);
    appendExecutionLog(`${nodesToCopy.length} node(s) copied.`, 'info');
  }, [selectedNodeIds, currentNodes, currentConnections, currentGraphId, copyToClipboard, appendExecutionLog]);

  const handlePasteFromClipboardWrapper = useCallback(() => {
    const pasteCb: PasteCallbacks = {
      getCurrentGraphId: () => currentGraphId,
      getCurrentParentNodeType: () => currentParentNodeType,
      getCurrentNodes: () => currentNodes,
      getCurrentConnections: () => currentConnections,
      addPastedNodesToScope: (nodesToAdd) => {
        updateNodesInCurrentScope([...currentNodes, ...nodesToAdd]);
      },
      addPastedConnectionsToScope: (connectionsToAdd) => {
        updateConnectionsInCurrentScope([...currentConnections, ...connectionsToAdd]);
      },
      updateSelectionAndRecordHistory: updateSelectedNodesAndRecord,
      getGraphStateForHistory: getCurrentGraphStateForHistory,
      initializePastedNodeState: (node, store) => {
         if (node.operationType === OperationTypeEnum.STATE && node.config?.stateId && !store.has(node.config.stateId)) {
            store.set(node.config.stateId, node.config.initialValue);
        }
      },
      getGlobalStateStore: () => globalStateStoreRef.current,
      appendLog: appendExecutionLog,
      generateNodeId: globalGenerateNodeId,
      generatePortId: globalGeneratePortId,
      generateConnectionId: globalGenerateConnectionId,
      getAtomicNodeDefinition: (opType: OperationTypeEnum) => nodeRegistryService.getNodeDefinition(opType),
    };
    pasteFromClipboard(pasteCb);
  }, [
    clipboard, currentGraphId, currentParentNodeType, currentNodes, currentConnections,
    updateNodesInCurrentScope, updateConnectionsInCurrentScope,
    updateSelectedNodesAndRecord, getCurrentGraphStateForHistory,
    appendExecutionLog, pasteFromClipboard
  ]);


  useEffect(() => {
    const handleGlobalKeyDown = (event: KeyboardEvent) => {
      const activeElem = document.activeElement;
      const isEditingText = activeElem && (
          activeElem.tagName === 'INPUT' ||
          activeElem.tagName === 'TEXTAREA' ||
          (activeElem instanceof HTMLElement && activeElem.isContentEditable)
      );

      if (event.metaKey || event.ctrlKey) {
        if (event.key.toLowerCase() === 'z') {
          event.preventDefault();
          if (event.shiftKey) handleRedoWrapper();
          else handleUndoWrapper();
        } else if (event.key.toLowerCase() === 'y') {
            event.preventDefault();
            handleRedoWrapper();
        } else if (event.key.toLowerCase() === 'c' && !isEditingText) {
              event.preventDefault();
              handleCopyToClipboardWrapper();
        } else if (event.key.toLowerCase() === 'v' && !isEditingText) {
              event.preventDefault();
              handlePasteFromClipboardWrapper();
        } else if (event.key.toLowerCase() === 'k') {
            event.preventDefault();
            commandBarInputRef.current?.focus();
        }
      } else if ((event.key === 'Delete' || event.key === 'Backspace') && !isEditingText) {
         if (selectedNodeIds.length > 0) {
            event.preventDefault();
            handleRemoveMultipleNodesWrapper([...selectedNodeIds]);
         }
      }
    };

    window.addEventListener('keydown', handleGlobalKeyDown);
    return () => {
      window.removeEventListener('keydown', handleGlobalKeyDown);
    };
  }, [handleUndoWrapper, handleRedoWrapper, handleCopyToClipboardWrapper, handlePasteFromClipboardWrapper, selectedNodeIds, handleRemoveMultipleNodesWrapper]);


  const handleAddNodeWrapper = (type: OperationTypeEnum, position?: {x: number, y:number}) => {
    const newNode = addNodeViaHook(type, position);
    if (newNode) {
      updateSelectedNodesAndRecord([newNode.id], getCurrentGraphStateForHistory());
      if (newNode.operationType === OperationTypeEnum.STATE) {
          initializeGlobalStateFromNodes([newNode], false);
      }
      clearExecutionState();
    }
    return newNode;
  };

  const handleAddBlueprintWrapper = (creator: () => MolecularNode) => {
    const newBlueprintNode = addBlueprintViaHook(creator);
    if (newBlueprintNode) {
        updateSelectedNodesAndRecord([newBlueprintNode.id], getCurrentGraphStateForHistory());
         const scanForStateNodesAndInitialize = (nodesToScan: AnyNode[]) => {
            nodesToScan.forEach(n => {
                if (n.operationType === OperationTypeEnum.STATE && n.config?.stateId) {
                     if (!globalStateStoreRef.current.has(n.config.stateId)) {
                        globalStateStoreRef.current.set(n.config.stateId, n.config.initialValue);
                    }
                }
                if (n.type === 'Molecular') {
                    scanForStateNodesAndInitialize((n as MolecularNode).subGraph.nodes);
                }
            });
        };
        scanForStateNodesAndInitialize(newBlueprintNode.subGraph.nodes);
        clearExecutionState();
    }
    return newBlueprintNode;
  };

  const handleAddNodeFromCommandBar = useCallback((item: AutocompleteItem) => {
    if (!nodeEditorRef.current || !nodeEditorRef.current.getSvgElement()) {
      console.error("SVG element not available for calculating center.");
      return;
    }
    const svgElement = nodeEditorRef.current.getSvgElement();
    if (!svgElement) return;

    const { width: viewportWidth, height: viewportHeight } = svgElement.getBoundingClientRect();

    const CTM = svgElement.getScreenCTM();
    if (!CTM) return;
    const svgCenterX = (viewportWidth / 2 - CTM.e) / CTM.a;
    const svgCenterY = (viewportHeight / 2 - CTM.f) / CTM.d;

    const worldCenterX = (svgCenterX - panOffsetRef.current.x) / zoomLevelRef.current;
    const worldCenterY = (svgCenterY - panOffsetRef.current.y) / zoomLevelRef.current;

    let newNode: AnyNode | null = null;
    if (item.type === 'atomic' && item.operationType) {
        newNode = handleAddNodeWrapper(item.operationType, { x: worldCenterX, y: worldCenterY });
    } else if (item.type === 'blueprint' && item.blueprintCreatorFunction) {
        newNode = handleAddBlueprintWrapper(item.blueprintCreatorFunction);
        if (newNode) {
            const updatedNodes = currentNodes.map(n => n.id === newNode!.id ? { ...newNode!, position: { x: worldCenterX, y: worldCenterY } } : n);
            updateNodesInCurrentScope(updatedNodes);
        }
    }

    if (newNode) {
        updateSelectedNodesAndRecord([newNode.id], getCurrentGraphStateForHistory());
        appendExecutionLog(`Added '${newNode.name}' from command bar.`, 'info');
    }
  }, [handleAddNodeWrapper, handleAddBlueprintWrapper, updateSelectedNodesAndRecord, getCurrentGraphStateForHistory, appendExecutionLog, currentNodes, updateNodesInCurrentScope]);

  const handleFloatingPanelDrag = useCallback((panelId: string, newPosition: { x: number; y: number }) => {
    setFloatingPanels(prevPanels =>
      prevPanels.map(p =>
        p.id === panelId ? { ...p, position: newPosition } : p
      )
    );
  }, []);


  if (!modulesInitialized) {
    return (
      <div className="flex items-center justify-center h-screen bg-[#24272E] text-white">
        Loading Application Modules...
      </div>
    );
  }

  const handleQuickInspectConfigUpdate = (nodeId: string, newConfigPart: Partial<NodeConfig>) => {
    updateNodeConfigViaHook(nodeId, newConfigPart);
  };


  return (
    <div className="flex h-screen bg-[#24272E] text-[rgba(255,255,255,0.87)] font-sans">
      <input
        type="file"
        ref={loadGraphInputRef}
        accept=".json"
        onChange={handleLoadGraphFileChange}
        className="hidden"
        aria-hidden="true"
      />
      {/* Left Controls Panel */}
      <div className={`crystal-layer crystal-layer-2 flex flex-col ${isLeftPanelCollapsed ? COLLAPSED_WIDTH_CLASS : EXPANDED_WIDTH_LEFT_CLASS} transition-all duration-300 ease-in-out`}>
        {isLeftPanelCollapsed ? (
          <div className="flex flex-col items-center justify-center h-full py-4">
            <button onClick={() => setIsLeftPanelCollapsed(false)} className="crystal-button p-2.5 mb-4" title="Expand Controls Panel">
              <Icons.ChevronDoubleRightIcon className="w-5 h-5" />
            </button>
            <Icons.WrenchScrewdriverIcon className="w-6 h-6 text-gray-400" title="Controls Panel"/>
          </div>
        ) : (
          <div className="flex flex-col h-full">
            <div className="p-2 border-b border-[rgba(255,255,255,0.08)] flex-shrink-0">
              <Breadcrumbs scopeStack={scopeStack} onNavigateToScope={handleActualNavigateToScope} />
            </div>
            <div className="flex-grow overflow-y-auto min-h-0">
              <ControlsPanel
                onAddNode={handleAddNodeWrapper}
                onAddBlueprintNode={handleAddBlueprintWrapper}
                currentGraphId={currentGraphId}
                parentNodeOperationType={currentParentNodeType}
                quickShelfItems={quickShelfItems}
                addQuickShelfItem={addQuickShelfItem}
                removeQuickShelfItem={removeQuickShelfItem}
                onInfoLog={(message) => appendExecutionLog(message, 'info')}
              />
            </div>
             <div className="p-3 border-t border-[rgba(255,255,255,0.08)] space-y-2 flex-shrink-0">
                {/* History and Clipboard sections removed - their functionalities moved to HorizontalToolbarComponent */}
            </div>
            <div className="flex-shrink-0">
                <DebugControls
                    isPaused={!!executionMeta?.pausedNodeId}
                    isExecuting={isExecuting && !executionMeta?.pausedNodeId}
                    onResume={handleResumeExecutionWrapper}
                    onStepOver={handleStepOverWrapper}
                    onStop={stopCurrentExecution}
                />
            </div>
            <div className="p-2 border-t border-[rgba(255,255,255,0.08)] flex-shrink-0">
              <button onClick={() => setIsLeftPanelCollapsed(true)} className="crystal-button w-full p-2 flex items-center justify-center" title="Collapse Controls Panel">
                <Icons.ChevronDoubleLeftIcon className="w-5 h-5" />
                <span className="ml-2 text-xs">Collapse</span>
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Main Editor Area & Command Agent */}
      <div className="flex-1 flex flex-col max-h-screen overflow-hidden">
        <div className="p-4 flex flex-col space-y-3 flex-grow min-h-0">
             <div className="flex space-x-3 items-center mb-0 pb-0 flex-shrink-0">
                <h1 className="text-2xl font-bold text-on-glass" style={{textShadow: '0 1px 3px rgba(0,0,0,0.3)'}}>Logical Construction Plan</h1>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mb-1 items-start flex-shrink-0 p-3 rounded-lg crystal-layer crystal-layer-3">
                <div className="flex flex-col space-y-1">
                    <label htmlFor="eventNameInput" className="text-xs text-on-glass-dim">Event Name:</label>
                    <input
                        id="eventNameInput" type="text" value={eventNameInput} onChange={e => setEventNameInput(e.target.value)}
                        placeholder="e.g., buttonClick"
                        className="p-1.5 text-sm bg-[rgba(30,33,40,0.6)] border border-[rgba(255,255,255,0.15)] rounded-md focus:ring-1 focus:ring-purple-500 focus:border-purple-500 placeholder-gray-500 text-gray-100"
                    />
                </div>
                <div className="flex flex-col space-y-1">
                     <label htmlFor="eventPayloadInput" className="text-xs text-on-glass-dim">Event Payload (JSON):</label>
                    <textarea
                        id="eventPayloadInput" value={eventPayloadInput} onChange={e => setEventPayloadInput(e.target.value)}
                        placeholder='e.g., {"value": 10}' rows={1}
                        className="p-1.5 text-sm bg-[rgba(30,33,40,0.6)] border border-[rgba(255,255,255,0.15)] rounded-md focus:ring-1 focus:ring-purple-500 focus:border-purple-500 h-9 resize-none placeholder-gray-500 text-gray-100"
                    />
                </div>
                <button
                    onClick={() => handleDispatchEventWrapper()}
                    disabled={isExecuting && !executionMeta?.pausedNodeId}
                    className={`crystal-button primary-action self-end w-full h-9 flex items-center justify-center px-3 py-1.5 text-sm ${(isExecuting && !executionMeta?.pausedNodeId) ? 'disabled-look' : ''}`}
                >
                    {isExecuting && !executionMeta?.pausedNodeId ? 'Dispatching...' : 'Dispatch Event'}
                </button>
            </div>
            <div className="flex-grow min-h-0 rounded-lg overflow-hidden shadow-[0_0_30px_rgba(0,0,0,0.3)]">
              <NodeEditor
                ref={nodeEditorRef}
                nodes={currentNodes}
                connections={currentConnections}
                floatingPanels={floatingPanels}
                onFloatingPanelDrag={handleFloatingPanelDrag}
                onAddNode={handleAddNodeWrapper}
                onAddBlueprintNode={handleAddBlueprintWrapper}
                currentGraphId={currentGraphId}
                parentNodeOperationType={currentParentNodeType}
                isFocusModeActive={isFocusModeActive}
                selectedNodeOutputsForAffinity={selectedNodeOutputsForAffinity}
                allNodesForConnectionContext={currentNodes}
                onNodesChange={updateNodesInCurrentScope}
                onConnectionsChange={(newConns) => updateConnectionsInCurrentScope(newConns)}
                connectingState={connectingState}
                onConnectingStart={handleConnectingStart}
                onConnectingEnd={handleConnectingEnd}
                onConnectingUpdate={handleConnectingUpdate}
                onNodeSelect={handleNodeSelectWrapper}
                selectedNodeIds={selectedNodeIds}
                onNodeConfigOpen={handleConfigModalOpenWrapper}
                onNodeConfigUpdate={handleActualNodeConfigUpdate} 
                onRemoveNode={() => handleRemoveMultipleNodesWrapper([...selectedNodeIds])}
                onRemoveConnection={handleRemoveConnectionWrapper}
                resolvedStatesForInspection={resolvedStatesForInspection}
                onEnterMolecularNode={handleActualEnterMolecularNode}
                onNodeResizeEnd={handleActualNodeResizeEndWrapper}
                onOpenNodeContextMenu={handleOpenNodeContextMenu}
                onOpenNodeCreationContextMenu={handleOpenNodeCreationContextMenu}
                panOffsetRef={panOffsetRef}
                zoomLevelRef={zoomLevelRef}
                breakpoints={breakpoints}
                onToggleBreakpoint={handleToggleBreakpointWrapper}
                pausedNodeId={executionMeta?.pausedNodeId || null}
                pulsingNodeInfo={executionMeta?.pulsingNodeInfo || null}
                pulsingConnectionInfo={executionMeta?.pulsingConnectionInfo || null}
                executionMeta={executionMeta}
                quickInspectPopoverData={quickInspectPopoverData}
                isQuickInspectTargetNode={isQuickInspectTargetNode}
                showQuickInspectWithDelay={showQuickInspectWithDelay}
                hideQuickInspect={hideQuickInspect}
                resetQuickInspectTimer={resetQuickInspectTimer}
                clearQuickInspectTimer={clearQuickInspectTimer}
                openQuickInspectImmediately={openQuickInspectImmediately}
                // Props for HorizontalToolbarComponent (passed through FloatingPanel)
                onSaveGraph={handleSaveGraph}
                onLoadGraphRequest={handleLoadGraphRequest}
                onUndo={handleUndoWrapper}
                canUndo={canUndo}
                onRedo={handleRedoWrapper}
                canRedo={canRedo}
                onCopy={handleCopyToClipboardWrapper}
                canCopy={selectedNodeIds.length > 0}
                onPaste={handlePasteFromClipboardWrapper}
                canPaste={canPaste}
                onAlignTop={handleAlignSelectedTop}
                onDistributeHorizontally={handleDistributeSelectedHorizontally}
                selectedNodeIdsCount={selectedNodeIds.length}
                scopeStack={scopeStack}
                onNavigateToScope={handleActualNavigateToScope}
                onFocusGraph={handleFocusOnGraph}
                onClearGraph={handleClearGraphModalOpenWrapper}
              />
            </div>
        </div>
        <CommandAgentPanel
            inputRef={commandBarInputRef}
            isProcessing={isAgentProcessing}
            onSubmit={submitAgentCommand}
            plan={currentAgentPlan}
            onCommit={confirmAgentPlan}
            onDiscard={discardAgentPlan}
            searchableNodeTypes={nodeRegistryService.getAllNodeDefinitions().map(def => ({
                id: def.operationType,
                type: 'atomic',
                name: def.name,
                icon: def.icon,
                operationType: def.operationType,
            }))}
            onAddItemFromSearch={handleAddNodeFromCommandBar}
        />
      </div>

      {/* Right Inspector Panel */}
      <div className={`crystal-layer crystal-layer-2 flex flex-col ${isRightPanelCollapsed ? COLLAPSED_WIDTH_CLASS : EXPANDED_WIDTH_RIGHT_CLASS} transition-all duration-300 ease-in-out`}>
        {isRightPanelCollapsed ? (
            <div className="flex flex-col items-center justify-center h-full py-4">
                <button onClick={() => setIsRightPanelCollapsed(false)} className="crystal-button p-2.5 mb-4" title="Expand Inspector Panel">
                    <Icons.ChevronDoubleLeftIcon className="w-5 h-5" />
                </button>
                <Icons.InformationCircleIcon className="w-6 h-6 text-gray-400" title="Inspector & Log Panel"/>
            </div>
        ) : (
            <div className="flex flex-col h-full">
                <div className="flex-grow overflow-y-auto min-h-0">
                    {selectedNodeForInspector ? (
                        <InspectorPanel
                            selectedNode={selectedNodeForInspector}
                            connections={currentConnections}
                            allNodes={currentNodes}
                            onConfigChange={handleActualNodeConfigUpdate}
                            onNodeNameChange={handleActualNodeNameChange}
                        />
                    ) : (
                        <div className="p-3 space-y-2 flex-shrink-0">
                            <h3 className="text-xs font-semibold text-on-glass-dim mb-1.5 tracking-wider uppercase">Graph Actions</h3>
                            <div className="space-y-2">
                                <button
                                    onClick={handleExecuteSelectedOutputWrapper}
                                    disabled={selectedNodeIds.length !== 1 || isExecuting}
                                    className={`crystal-button turquoise-action w-full flex items-center justify-center px-3 py-2 text-sm ${(selectedNodeIds.length !== 1 || isExecuting) ? 'disabled-look' : ''}`}
                                    title="Execute the selected output port (Data Pull)"
                                >
                                    <Icons.PlayIcon className="w-4 h-4 mr-2" />
                                    Execute Selected Output
                                </button>
                                {/* "Clear Graph" button removed from here, moved to HorizontalToolbarComponent */}
                                <button
                                    onClick={handleFocusOnGraph}
                                    className="crystal-button w-full flex items-center justify-center px-3 py-2 text-sm"
                                    title="Focus view on all nodes in the current graph."
                                >
                                    <Icons.ViewfinderCircleIcon className="w-4 h-4 mr-2" />
                                    Focus Graph
                                </button>
                                <div className="flex space-x-2">
                                    <button
                                        onClick={handleAlignSelectedTop}
                                        disabled={selectedNodeIds.length < 2}
                                        className={`crystal-button flex-1 flex items-center justify-center px-3 py-2 text-sm ${selectedNodeIds.length < 2 ? 'disabled-look' : ''}`}
                                        title="Align top edges of selected nodes."
                                    >
                                        <Icons.BarsArrowUpIcon className="w-4 h-4 mr-2" />
                                        Align Top
                                    </button>
                                    <button
                                        onClick={handleDistributeSelectedHorizontally}
                                        disabled={selectedNodeIds.length < 2}
                                        className={`crystal-button flex-1 flex items-center justify-center px-3 py-2 text-sm ${selectedNodeIds.length < 2 ? 'disabled-look' : ''}`}
                                        title="Distribute selected nodes horizontally."
                                    >
                                        <Icons.ArrowsRightLeftIcon className="w-4 h-4 mr-2" />
                                        Distribute Horizontally
                                    </button>
                                </div>
                                <div className="flex items-center justify-between pt-2">
                                    <span className="text-xs font-medium text-on-glass-dim">Sequence Mode</span>
                                    <label htmlFor="sequenceModeToggle" className="switch" title="Toggle visual sequence mode (future feature)">
                                        <input type="checkbox" id="sequenceModeToggle" checked={isSequenceModeActive} onChange={(e) => setIsSequenceModeActive(e.target.checked)} />
                                        <span className="slider"></span>
                                    </label>
                                </div>
                                <div className="flex items-center justify-between pt-1">
                                    <span className="text-xs font-medium text-on-glass-dim">Focus Mode</span>
                                    <label htmlFor="focusModeToggle" className="switch" title="Toggle Focus Mode (dims non-compatible nodes in Controls Panel)">
                                        <input type="checkbox" id="focusModeToggle" checked={isFocusModeActive} onChange={(e) => setIsFocusModeActive(e.target.checked)} />
                                        <span className="slider"></span>
                                    </label>
                                </div>
                            </div>
                            <div className="pt-2">
                                <h3 className="text-xs font-semibold text-on-glass-dim mb-1.5 tracking-wider uppercase">Persistence</h3>
                                <div className="space-y-2">
                                <button
                                    onClick={handleSaveGraph}
                                    className="crystal-button primary-action w-full flex items-center justify-center px-3 py-2 text-sm"
                                >
                                    <Icons.CloudArrowDownIcon className="w-4 h-4 mr-2" />
                                    Save Graph
                                </button>
                                <label
                                    htmlFor="load-graph-input"
                                    className="crystal-button primary-action w-full flex items-center justify-center px-3 py-2 text-sm cursor-pointer"
                                >
                                    <Icons.CloudArrowUpIcon className="w-4 h-4 mr-2" />
                                    Load Graph
                                </label>
                                <input type="file" id="load-graph-input" ref={loadGraphInputRef} accept=".json" onChange={handleLoadGraphFileChange} className="hidden" />
                                </div>
                            </div>
                             <div className="p-4 text-on-glass-dim italic text-center mt-5">
                                Select a node to inspect its properties.
                            </div>
                        </div>
                    )}
                </div>
                <div className="h-[250px] flex-shrink-0 border-t border-[rgba(255,255,255,0.1)]">
                    <LogView logs={executionLogs} />
                </div>
                <div className="p-2 border-t border-[rgba(255,255,255,0.08)] flex-shrink-0">
                    <button onClick={() => setIsRightPanelCollapsed(true)} className="crystal-button w-full p-2 flex items-center justify-center" title="Collapse Inspector Panel">
                        <Icons.ChevronDoubleRightIcon className="w-5 h-5" />
                         <span className="ml-2 text-xs">Collapse</span>
                    </button>
                </div>
            </div>
        )}
      </div>

      {isConfigModalOpen && configuringNode && (
        <NodeConfigModal
          node={configuringNode}
          isOpen={isConfigModalOpen}
          onClose={closeConfigModal}
          onSave={(nodeId, newConfig) => {
            handleActualNodeConfigUpdate(nodeId, newConfig);
            closeConfigModal(); 
          }}
        />
      )}
      {isClearGraphModalOpen && (
        <ClearGraphConfirmationModal
            isOpen={isClearGraphModalOpen}
            onClose={closeClearGraphModal}
            onSaveAndClear={handleSaveAndClearGraph}
            onClearAnyway={executeClearGraph}
            graphName={graphNameToClear}
        />
      )}
      {nodeContextMenu.visible && (
        <NodeContextMenu
          contextMenuState={nodeContextMenu}
          onSelectNodeToAdd={handleAddNodeAndConnectFromContextMenu}
          onClose={handleCloseNodeContextMenu}
          currentGraphId={currentGraphId}
          parentNodeOperationType={currentParentNodeType}
          panOffset={panOffsetRef.current}
          zoomLevel={zoomLevelRef.current}
        />
      )}
      {nodeCreationContextMenu.visible && (
        <NodeCreationContextMenu
            contextMenuState={nodeCreationContextMenu}
            onSelectNodeToAdd={handleAddNodeAndConnectFromCreationContextMenu}
            onClose={handleCloseNodeCreationContextMenu}
        />
      )}
      {quickInspectPopoverData && (
        <QuickInspectPopover
            data={quickInspectPopoverData}
            onClose={hideQuickInspect}
            onConfigUpdate={handleQuickInspectConfigUpdate}
        />
      )}
    </div>
  );
};
