
import {
  AnyNode, AtomicNode, MolecularNode, Connection, ExecutionContext, ExecutionMetaState, ExecutionResult,
  InputPort, OutputPort, NodeId, OperationTypeEnum, TerminalStateReasonEnum, LogicalCategoryEnum, PortTypeEnum
} from '../types';
import { MAX_CYCLE_DEPTH_LIMIT, MAX_EXECUTION_STEPS } from '../constants';
import { nodeRegistryService } from './NodeRegistryService'; // Import the registry

// --- Logging Utility ---
function logMessage(metaState: ExecutionMetaState, nodeId: NodeId | undefined, message: string, type: 'info' | 'error' | 'success' | 'debug') {
  console.log(`[${type.toUpperCase()}] ${nodeId ? `(Node ${nodeId.substring(0,15)}...) ` : ''}${message}`);
  metaState.log.push({ timestamp: Date.now(), nodeId, message, type });
}

// --- Dependency Tree Construction and Topological Sort (for Data Pull) ---
// These functions (topologicalSort, buildDependencyTreeAndExecutionOrder) can largely remain the same as they deal with graph structure.
interface DependencyAnalysisResult {
  dependencyNodeIds: Set<NodeId>;
  executionOrder: NodeId[];
  error?: TerminalStateReasonEnum;
}

function buildDependencyTreeAndExecutionOrder(
  targetNodeId: NodeId,
  allNodes: AnyNode[],
  allConnections: Connection[]
): DependencyAnalysisResult {
  const dependencyNodeSet = new Set<NodeId>();
  const tempExecutionOrder: NodeId[] = [];
  const visitedForDFS = new Set<NodeId>();
  const recursionStack = new Set<NodeId>();

  function dfsBackward(currentNodeId: NodeId): boolean {
    visitedForDFS.add(currentNodeId);
    recursionStack.add(currentNodeId);

    const node = allNodes.find(n => n.id === currentNodeId);
    if (!node) {
        console.error(`[DependencyAnalysis] Node ${currentNodeId} not found during DFS backward.`);
        return false;
    }

    for (const inputPort of node.inputPorts.filter(p => p.portType === PortTypeEnum.DATA)) {
      const connectionsToPort = allConnections.filter(c => c.toNodeId === currentNodeId && c.toPortId === inputPort.id);
      for (const conn of connectionsToPort) {
        if (recursionStack.has(conn.fromNodeId)) {
          return true;
        }
        if (!visitedForDFS.has(conn.fromNodeId)) {
          if (dfsBackward(conn.fromNodeId)) return true;
        }
      }
    }

    recursionStack.delete(currentNodeId);
    dependencyNodeSet.add(currentNodeId);
    tempExecutionOrder.push(currentNodeId);
    return false;
  }

  if (dfsBackward(targetNodeId)) {
    return {
        dependencyNodeIds: new Set(),
        executionOrder: [],
        error: TerminalStateReasonEnum.ERROR_STRUCTURAL_CYCLE_IN_DEPENDENCIES
    };
  }

  return { dependencyNodeIds: dependencyNodeSet, executionOrder: tempExecutionOrder.reverse() }; // Reverse for correct execution order
}


function getResolvedInputValue(
    node: AnyNode,
    port: InputPort,
    allConnections: Connection[],
    resolvedStates: ExecutionContext,
    metaState: ExecutionMetaState,
    allNodesForPulseContext: AnyNode[],
    isOptional: boolean = false,
    defaultValue?: any
): any {
  if (port.portType !== PortTypeEnum.DATA) return undefined;

  const connection = allConnections.find(c => c.toNodeId === node.id && c.toPortId === port.id);

  if (connection) {
    const fromNodeMeta = metaState.fullExecutionPath.find(n => n.nodeId === connection.fromNodeId);
    const fromSourcePort = fromNodeMeta ? (allNodesForPulseContext.find(n => n.id === connection.fromNodeId)?.outputPorts.find(p => p.id === connection.fromPortId)) : undefined;

    if (fromSourcePort && metaState.status === 'running') { // Only pulse if actively running/resolving
        metaState.pulsingConnectionInfo = {
            connectionId: connection.id,
            pulseKey: (metaState.pulsingConnectionInfo?.pulseKey || 0) + 1,
            sourcePortCategory: fromSourcePort.category,
            isExecutionPulse: false
        };
    }

    const inputValue = resolvedStates[`${connection.fromNodeId}_${connection.fromPortId}`];
    return inputValue !== undefined ? inputValue : defaultValue;
  } else {
    const overrideValue = node.config?.inputPortOverrides?.[port.id];
    if (overrideValue !== undefined) {
      return overrideValue;
    }
    if (defaultValue !== undefined) {
      return defaultValue;
    }
    if (!isOptional && node.operationType !== OperationTypeEnum.LOG_VALUE) { // Log value input is optional
        // logMessage(metaState, node.id, `Input data port '${port.name}' is not connected and has no override or default. It will be undefined.`, 'debug');
    }
    return undefined;
  }
}

interface IterationData {
    currentItem: any;
    currentIndex: number;
}

const CHANNEL_PREFIX = "__channel_";

// Helper function to find an input port by name or throw an error
function findInputPortOrFail(node: AtomicNode, portName: string, portType: PortTypeEnum = PortTypeEnum.DATA): InputPort {
    const port = node.inputPorts.find(p => p.name === portName && p.portType === portType);
    if (!port) {
        const availablePorts = node.inputPorts.map(p => `${p.name} (${p.portType}, ${p.category})`).join(', ') || 'None';
        throw new Error(`Execution Error: Required input port '${portName}' (Type: ${portType}) not found on node '${node.name}' (ID: ${node.id}, OpType: ${node.operationType}). Available: [${availablePorts}]`);
    }
    return port;
}

// Helper function to find an output port by name or throw an error
function findOutputPortOrFail(node: AtomicNode, portName: string, portType: PortTypeEnum = PortTypeEnum.DATA): OutputPort {
    const port = node.outputPorts.find(p => p.name === portName && p.portType === portType);
    if (!port) {
        const availablePorts = node.outputPorts.map(p => `${p.name} (${p.portType}, ${p.category})`).join(', ') || 'None';
        throw new Error(`Execution Error: Required output port '${portName}' (Type: ${portType}) not found on node '${node.name}' (ID: ${node.id}, OpType: ${node.operationType}). Available: [${availablePorts}]`);
    }
    return port;
}


async function executeResolvedDependencyTree(
  executionOrder: NodeId[],
  dependencyNodes: AnyNode[],
  allConnections: Connection[],
  metaState: ExecutionMetaState,
  allNodesForPulse: AnyNode[],
  initialResolvedStates: ExecutionContext = {},
  iterationData?: IterationData // For ITERATE sub-graph context
): Promise<ExecutionContext> {
  const resolvedStates: ExecutionContext = { ...initialResolvedStates };

  for (const nodeId of executionOrder) {
    if (metaState.status !== 'running') break; // Stop if error or paused/stopped

    const node = dependencyNodes.find(n => n.id === nodeId);
    if (!node) {
        logMessage(metaState, nodeId, `Node not found in dependency list during data resolution. Skipping.`, 'error');
        continue;
    }
     metaState.fullExecutionPath.push({ nodeId: node.id, operation: node.operationType });


    if (node.operationType === OperationTypeEnum.COMMENT || node.operationType === OperationTypeEnum.FRAME) {
        continue;
    }

    let currentNodeOutputs: Partial<ExecutionContext> = {};
    try {
      if (node.type === 'Atomic') {
        const nodeDef = nodeRegistryService.getNodeDefinition(node.operationType);
        if (nodeDef?.resolveOutputs) {
          const resolvedInputs: Record<string, any> = {};
            node.inputPorts.filter(p => p.portType === PortTypeEnum.DATA).forEach(port => {
                let defaultValue: any = undefined;
                // Specific default value handling (could also be part of nodeDef.defaultConfig for ports)
                if (node.operationType === OperationTypeEnum.RANDOM_NUMBER) {
                    if (port.name === 'Min') defaultValue = node.config?.defaultMin ?? 0;
                    if (port.name === 'Max') defaultValue = node.config?.defaultMax ?? 1;
                }
                if (node.operationType === OperationTypeEnum.SPLIT_STRING && port.name === 'Delimiter') {
                    defaultValue = node.config?.splitDelimiter ?? ',';
                }
                 const isLogInputOptional = node.operationType === OperationTypeEnum.LOG_VALUE && port.name === 'Input';
                resolvedInputs[port.id] = getResolvedInputValue(node, port, allConnections, resolvedStates, metaState, allNodesForPulse, isLogInputOptional, defaultValue);
            });
          currentNodeOutputs = await nodeDef.resolveOutputs(node as AtomicNode, resolvedInputs, resolvedStates, metaState, allNodesForPulse, iterationData);
        } else {
            logMessage(metaState, node.id, `No 'resolveOutputs' function registered for atomic operation: ${node.operationType}`, 'debug');
        }
      } else if (node.type === 'Molecular') {
        // Molecular node data resolution (simplified, as it's complex)
        const molecularNode = node as MolecularNode;
        const subGraphInitialContext: ExecutionContext = {};

        molecularNode.inputPorts.filter(p => p.portType === PortTypeEnum.DATA).forEach(molecularInputPort => {
            const connectedInputGraphNode = molecularNode.subGraph.nodes.find(
                subN => subN.operationType === OperationTypeEnum.INPUT_GRAPH &&
                        subN.config?.externalPortName === molecularInputPort.name &&
                        subN.config?.externalPortCategory === molecularInputPort.category
            ) as AtomicNode | undefined;

            if (connectedInputGraphNode && connectedInputGraphNode.outputPorts.length > 0) {
                const resolvedInputValue = getResolvedInputValue(molecularNode, molecularInputPort, allConnections, resolvedStates, metaState, allNodesForPulse);
                subGraphInitialContext[`${connectedInputGraphNode.id}_${connectedInputGraphNode.outputPorts[0].id}`] = resolvedInputValue;
            }
        });
        
        // For simplicity, assume molecular node outputs are resolved via its sub-graph evaluation
        // This part would recursively call a similar execution for the sub-graph
        const outputGraphNodes = molecularNode.subGraph.nodes.filter(n => n.operationType === OperationTypeEnum.OUTPUT_GRAPH) as AtomicNode[];
        if (outputGraphNodes.length > 0) {
            // Simplified: Get target node IDs for sub-graph resolution
            const subGraphTargetNodeIds = outputGraphNodes.map(ogn => ogn.id);
            // This would involve another call to something like executeResolvedDependencyTree for the sub-graph
            // For now, just showing the structure
            const subGraphDepAnalysis = buildDependencyTreeAndExecutionOrder(subGraphTargetNodeIds[0], molecularNode.subGraph.nodes, molecularNode.subGraph.connections); // Simplified: just use first target
            if (subGraphDepAnalysis.error) throw new Error(`Sub-graph dependency error: ${subGraphDepAnalysis.error}`);

            const subGraphResolvedStates = await executeResolvedDependencyTree(
                subGraphDepAnalysis.executionOrder,
                molecularNode.subGraph.nodes.filter(n => subGraphDepAnalysis.dependencyNodeIds.has(n.id)),
                molecularNode.subGraph.connections,
                metaState,
                molecularNode.subGraph.nodes,
                subGraphInitialContext
            );
            
            molecularNode.outputPorts.filter(p => p.portType === PortTypeEnum.DATA).forEach(molOutPort => {
                const ogNode = outputGraphNodes.find(ogn => ogn.config?.externalPortName === molOutPort.name && ogn.config?.externalPortCategory === molOutPort.category);
                if (ogNode && ogNode.inputPorts.length > 0) {
                    const valueKey = `${ogNode.id}_${ogNode.inputPorts[0].id}`;
                    currentNodeOutputs[`${molecularNode.id}_${molOutPort.id}`] = subGraphResolvedStates[valueKey];
                }
            });
        }
      }
      Object.assign(resolvedStates, currentNodeOutputs);
    } catch (error: any) {
      logMessage(metaState, nodeId, `Error during data pull for node '${node.name}': ${error.message}`, 'error');
      metaState.status = 'error';
      metaState.error = error.message || TerminalStateReasonEnum.ERROR_OPERATION_FAILED;
    }
  }
  return resolvedStates;
}


export async function getResolveStateForOutput(
  targetNodeId: NodeId,
  targetPortId: string,
  allNodes: AnyNode[],
  allConnections: Connection[],
  initialMetaStateConfig: Partial<Omit<ExecutionMetaState, 'globalStateStore' | 'pulsingConnectionInfo'>> & { globalStateStore: Map<string, any> }
): Promise<ExecutionResult> {
  const metaState: ExecutionMetaState = {
    visitedNodesTrace: initialMetaStateConfig.visitedNodesTrace || [],
    fullExecutionPath: initialMetaStateConfig.fullExecutionPath || [],
    cycleDepth: initialMetaStateConfig.cycleDepth || 0,
    maxCycleDepth: initialMetaStateConfig.maxCycleDepth || MAX_CYCLE_DEPTH_LIMIT,
    log: initialMetaStateConfig.log || [],
    status: 'running', // Start as running
    error: initialMetaStateConfig.error || undefined,
    globalStateStore: initialMetaStateConfig.globalStateStore,
    pulsingNodeInfo: initialMetaStateConfig.pulsingNodeInfo || null,
    pulsingConnectionInfo: null,
  };

  const targetNode = allNodes.find(n => n.id === targetNodeId);
  if (!targetNode) {
    logMessage(metaState, undefined, `Target node '${targetNodeId}' not found for data resolution.`, 'error');
    metaState.status = 'error';
    metaState.error = TerminalStateReasonEnum.ERROR_TARGET_NODE_NOT_FOUND;
    return { resolvedStates: {}, finalMetaState: metaState };
  }
  const targetPort = targetNode.outputPorts.find(p => p.id === targetPortId);
  if (!targetPort && targetNode.operationType !== OperationTypeEnum.STATE && targetNode.operationType !== OperationTypeEnum.LOG_VALUE && targetNode.operationType !== OperationTypeEnum.RECEIVE_DATA) {
    logMessage(metaState, targetNodeId, `Target port '${targetPortId}' not found on node '${targetNode.name}'.`, 'error');
    metaState.status = 'error';
    metaState.error = TerminalStateReasonEnum.ERROR_TARGET_PORT_NOT_FOUND;
    return { resolvedStates: {}, finalMetaState: metaState };
  }

  if (targetPort && targetPort.portType !== PortTypeEnum.DATA) {
      logMessage(metaState, targetNodeId, `Target port '${targetPort.name}' is an EXECUTION port. Cannot resolve data from it.`, 'error');
      metaState.status = 'error';
      metaState.error = TerminalStateReasonEnum.ERROR_OPERATION_FAILED;
      return { resolvedStates: {}, finalMetaState: metaState };
  }

  logMessage(metaState, undefined, `Starting DATA resolution for: Node '${targetNode?.name}'${targetPort ? `, Port '${targetPort.name}'` : ''}.`, 'info');
  const { dependencyNodeIds, executionOrder, error: treeBuildError } = buildDependencyTreeAndExecutionOrder(targetNodeId, allNodes, allConnections);

  if (treeBuildError) {
      logMessage(metaState, targetNodeId, `Failed to build dependency tree: ${treeBuildError}`, 'error');
      metaState.status = 'error';
      metaState.error = treeBuildError;
      return { resolvedStates: {}, finalMetaState: metaState };
  }
  
  // Ensure target node itself is in the execution order if it's a provider or has no data inputs
  let finalExecutionOrder = executionOrder;
  if (!dependencyNodeIds.has(targetNodeId) && 
      (targetNode.operationType === OperationTypeEnum.VALUE_PROVIDER ||
       targetNode.operationType === OperationTypeEnum.STATE ||
       targetNode.operationType === OperationTypeEnum.RECEIVE_DATA ||
       (targetNode.inputPorts.filter(p => p.portType === PortTypeEnum.DATA).length === 0 && targetNode.outputPorts.some(p => p.portType === PortTypeEnum.DATA))
      )) {
      finalExecutionOrder = [...executionOrder, targetNodeId]; // Add to end if not already there
      dependencyNodeIds.add(targetNodeId);
  } else if (!executionOrder.includes(targetNodeId) && dependencyNodeIds.has(targetNodeId)) {
    // If it's a dependency but somehow not in order, add it (though buildDependencyTree should handle this)
    finalExecutionOrder.push(targetNodeId);
  }


  const dependencyNodes = allNodes.filter(n => dependencyNodeIds.has(n.id));
  const resolvedStates = await executeResolvedDependencyTree(finalExecutionOrder, dependencyNodes, allConnections, metaState, allNodes);

  let requestedValue: any;
   if (targetPortId) { // This check handles cases where targetPort might be undefined (e.g. STATE)
    requestedValue = resolvedStates[`${targetNodeId}_${targetPortId}`];
  } else if (targetNode.type === 'Atomic' && targetNode.operationType === OperationTypeEnum.STATE) {
    const nodeDef = nodeRegistryService.getNodeDefinition(OperationTypeEnum.STATE);
    const port = nodeDef?.portGenerator(targetNode.id, targetNode.config).outputPorts.find(p => p.name === 'Current Value');
    if (port) requestedValue = resolvedStates[`${targetNodeId}_${port.id}`];
  } // Similar for LOG_VALUE, RECEIVE_DATA if targetPortId isn't directly passed

  if (metaState.status === 'running') metaState.status = 'completed'; // Mark as completed if no errors occurred

  const finalLogType: 'success' | 'error' = metaState.status === 'completed' ? 'success' : 'error';
  logMessage(metaState, undefined, `Data resolution ${metaState.status === 'completed' ? 'completed successfully' : 'finished with errors'}.`, finalLogType);
  
  if (metaState.status !== 'paused') {
      metaState.pulsingConnectionInfo = null;
      metaState.pulsingNodeInfo = null;
  }
  return { requestedValue, resolvedStates, finalMetaState: metaState };
}

async function processExecutionStep(
    executingNodeId: NodeId,
    triggeredByExecPortId: string | null,
    allNodes: AnyNode[],
    allConnections: Connection[],
    resolvedStates: ExecutionContext, // This context is built up by data-pulls triggered by exec nodes
    metaState: ExecutionMetaState
): Promise<void> {
    if (['error', 'stopped'].includes(metaState.status)) {
        return;
    }

    metaState.pulsingNodeInfo = { nodeId: executingNodeId, pulseKey: (metaState.pulsingNodeInfo?.pulseKey || 0) + 1 };

    if (metaState.fullExecutionPath.length >= MAX_EXECUTION_STEPS) {
        logMessage(metaState, executingNodeId, `Max execution steps (${MAX_EXECUTION_STEPS}) reached during event flow. Halting.`, 'error');
        metaState.status = 'error';
        metaState.error = TerminalStateReasonEnum.ERROR_MAX_STEPS_EXCEEDED;
        return;
    }
    const node = allNodes.find(n => n.id === executingNodeId);
    if (!node) {
        logMessage(metaState, executingNodeId, `Node not found during execution flow.`, 'error');
        metaState.status = 'error';
        metaState.error = TerminalStateReasonEnum.ERROR_TARGET_NODE_NOT_FOUND;
        return;
    }

    if (node.operationType === OperationTypeEnum.COMMENT || node.operationType === OperationTypeEnum.FRAME) {
        logMessage(metaState, executingNodeId, `Skipping organizational node '${node.name}' in execution flow.`, 'debug');
        return; // Skip organizational nodes
    }
    
    logMessage(metaState, executingNodeId, `Executing node '${node.name}' (triggered by ${triggeredByExecPortId || 'event dispatch'}).`, 'debug');
    metaState.fullExecutionPath.push({ nodeId: node.id, operation: node.operationType });

    if (metaState.fullExecutionPath.filter(step => step.nodeId === executingNodeId).length > MAX_CYCLE_DEPTH_LIMIT) {
        logMessage(metaState, executingNodeId, `Runtime cycle detected for node '${node.name}' during event flow. Halting.`, 'error');
        metaState.status = 'error';
        metaState.error = TerminalStateReasonEnum.ERROR_RUNTIME_CYCLE_DETECTED;
        return;
    }

    try {
      let nextExecOutputs: { portId: string; targetNodeId: NodeId; targetPortId: string; connectionId: string; }[] = [];
      
      if (node.type === 'Atomic') {
        const nodeDef = nodeRegistryService.getNodeDefinition(node.operationType);
        if (nodeDef?.processStep) {
          const result = await nodeDef.processStep(
            node as AtomicNode, 
            triggeredByExecPortId, 
            allNodes, 
            allConnections, 
            resolvedStates, 
            metaState,
            getResolveStateForOutput // Pass the function here
          );
          if (result?.nextExecOutputs) {
            nextExecOutputs = result.nextExecOutputs;
          }
        } else {
          // Default pass-through for nodes without specific processStep (like simple data nodes just being part of a chain)
          const firstExecOutput = node.outputPorts.find(p => p.portType === PortTypeEnum.EXECUTION);
          if (firstExecOutput) {
            logMessage(metaState, executingNodeId, `Node type '${node.operationType}' passing through execution pulse (default behavior).`, 'debug');
            allConnections.filter(c => c.fromNodeId === executingNodeId && c.fromPortId === firstExecOutput.id)
              .forEach(conn => nextExecOutputs.push({ portId: firstExecOutput.id, targetNodeId: conn.toNodeId, targetPortId: conn.toPortId, connectionId: conn.id }));
          } else {
            logMessage(metaState, executingNodeId, `Node type '${node.operationType}' reached end of execution path or not designed for exec output.`, 'debug');
          }
        }
      } else if (node.type === 'Molecular') {
        // TODO: Handle molecular node execution flow (entering sub-graph)
        logMessage(metaState, node.id, `Molecular node execution not fully implemented in this refactor step.`, 'debug');
      }

      for (const next of nextExecOutputs) {
          metaState.pulsingConnectionInfo = {
              connectionId: next.connectionId,
              pulseKey: (metaState.pulsingConnectionInfo?.pulseKey || 0) + 1,
              sourcePortCategory: node.outputPorts.find(p => p.id === next.portId)?.category || LogicalCategoryEnum.VOID,
              isExecutionPulse: true
          };
          if (['error', 'stopped'].includes(metaState.status)) break; // Check mutable metaState status
          await processExecutionStep(next.targetNodeId, next.targetPortId, allNodes, allConnections, resolvedStates, metaState);
      }

    } catch (error: any) {
        logMessage(metaState, executingNodeId, `Error during execution step for node '${node.name}': ${error.message}`, 'error');
        metaState.status = 'error';
        metaState.error = error.message || TerminalStateReasonEnum.ERROR_OPERATION_FAILED;
    }
}


export async function triggerEventFlow(
  eventName: string,
  payload: any,
  allNodes: AnyNode[],
  allConnections: Connection[],
  initialMetaStateConfig: Partial<Omit<ExecutionMetaState, 'globalStateStore' | 'pulsingConnectionInfo'>> & { globalStateStore: Map<string, any> }
): Promise<ExecutionMetaState> {
  const metaState: ExecutionMetaState = {
    visitedNodesTrace: initialMetaStateConfig.visitedNodesTrace || [],
    maxCycleDepth: initialMetaStateConfig.maxCycleDepth || MAX_CYCLE_DEPTH_LIMIT,
    log: initialMetaStateConfig.log || [],
    status: 'running',
    error: undefined,
    globalStateStore: initialMetaStateConfig.globalStateStore,
    ...initialMetaStateConfig,
    fullExecutionPath: initialMetaStateConfig.fullExecutionPath || [],
    cycleDepth: initialMetaStateConfig.cycleDepth || 0,
    pulsingNodeInfo: initialMetaStateConfig.pulsingNodeInfo || null,
    pulsingConnectionInfo: null,
  };
  const resolvedStates: ExecutionContext = {}; // Execution flow builds its own context for now

  logMessage(metaState, undefined, `Event '${eventName}' triggered with payload: ${JSON.stringify(payload)}`, 'info');

  const eventNodes = allNodes.filter(
    n => n.operationType === OperationTypeEnum.ON_EVENT && n.config?.eventName === eventName && n.type === 'Atomic'
  ) as AtomicNode[];

  if (eventNodes.length === 0) {
    logMessage(metaState, undefined, `No ON_EVENT nodes found for event name '${eventName}'.`, 'debug');
    metaState.status = 'completed';
    return metaState;
  }

  for (const eventNode of eventNodes) {
    if (['error', 'stopped'].includes(metaState.status)) break; // Check mutable metaState status

    const nodeDef = nodeRegistryService.getNodeDefinition(OperationTypeEnum.ON_EVENT);
    if (nodeDef?.resolveOutputs) { // ON_EVENT might have a resolveOutputs to set its payload
        const outputs = await nodeDef.resolveOutputs(eventNode, { /* no direct inputs for ON_EVENT payload */ }, {}, metaState, allNodes, { payload });
        Object.assign(resolvedStates, outputs);
    }
    
    metaState.pulsingNodeInfo = { nodeId: eventNode.id, pulseKey: (metaState.pulsingNodeInfo?.pulseKey || 0) + 1 };

    const triggeredExecPort = findOutputPortOrFail(eventNode, 'Triggered', PortTypeEnum.EXECUTION);
    const outgoingConnections = allConnections.filter(
        c => c.fromNodeId === eventNode.id && c.fromPortId === triggeredExecPort.id
    );
    for (const conn of outgoingConnections) {
        metaState.pulsingConnectionInfo = {
            connectionId: conn.id,
            pulseKey: (metaState.pulsingConnectionInfo?.pulseKey || 0) + 1,
            sourcePortCategory: triggeredExecPort.category,
            isExecutionPulse: true
        };
        if (['error', 'stopped'].includes(metaState.status)) break; // Check mutable metaState status
        await processExecutionStep(conn.toNodeId, conn.toPortId, allNodes, allConnections, resolvedStates, metaState);
    }
  }

  if (metaState.status === 'running') {
    metaState.status = 'completed';
    logMessage(metaState, undefined, `Event '${eventName}' processing completed.`, 'success');
  } else if (metaState.status !== 'error' && metaState.status !== 'stopped') {
    logMessage(metaState, undefined, `Event '${eventName}' processing concluded with status: ${metaState.status}.`, 'info');
  } else if (metaState.status === 'error') {
    logMessage(metaState, undefined, `Event '${eventName}' processing finished with errors.`, 'error');
  }
  
  if (metaState.status !== 'paused') {
     metaState.pulsingNodeInfo = null;
     metaState.pulsingConnectionInfo = null;
  }
  return metaState;
}