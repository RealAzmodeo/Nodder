

import { AtomicNodeDefinition, OperationTypeEnum, LogicalCategoryEnum, PortTypeEnum, AtomicNode, OutputPort, ExecutionContext, InputPort, Connection, ExecutionMetaState, AnyNode, ExecutionResult } from '../types';
import { generatePortId } from '../services/nodeFactory';
import * as Icons from '../components/Icons';
import { DEFAULT_MAX_ITERATIONS } from '../constants';

const defaultFooterConfig = { footerNoteText: '', showFooterNote: false };

function findInputPortOrFail(node: AtomicNode, portName: string, portType: PortTypeEnum = PortTypeEnum.DATA): InputPort {
    const port = node.inputPorts.find(p => p.name === portName && p.portType === portType);
    if (!port) throw new Error(`Input port '${portName}' (Type: ${portType}) not found on node '${node.name}'.`);
    return port;
}
function findOutputPortOrFail(node: AtomicNode, portName: string, portType: PortTypeEnum = PortTypeEnum.DATA): OutputPort {
    const port = node.outputPorts.find(p => p.name === portName && p.portType === portType);
    if (!port) throw new Error(`Output port '${portName}' (Type: ${portType}) not found on node '${node.name}'.`);
    return port;
}

const CHANNEL_PREFIX = "__channel_";

export const flowControlModule = {
  id: 'flow_control',
  name: 'Flow Control & Hierarchy',
  description: 'Nodes for managing execution flow, events, state, and graph hierarchy.',
  atomicNodeDefinitions: [
    {
      operationType: OperationTypeEnum.ON_EVENT,
      name: 'On Event',
      description: "Listens for a named external event.",
      category: 'Values & Inputs',
      icon: Icons.BellAlertIcon,
      defaultConfig: { eventName: "myEvent", ...defaultFooterConfig },
      isArchetype: true,
      portGenerator: (nodeId) => ({
        inputPorts: [],
        outputPorts: [
            { id: generatePortId(nodeId, 'out', 'Triggered'), name: 'Triggered', category: LogicalCategoryEnum.VOID, portType: PortTypeEnum.EXECUTION },
            { id: generatePortId(nodeId, 'out', 'Payload'), name: 'Payload', category: LogicalCategoryEnum.ANY, portType: PortTypeEnum.DATA },
        ],
      }),
      // ON_EVENT's resolveOutputs is primarily to make its payload available when triggered by eventFlow
      resolveOutputs: (node, resolvedInputs, executionContext) => {
        const payloadPort = findOutputPortOrFail(node, 'Payload');
        // The payload is typically set by triggerEventFlow directly into resolvedStates
        // This function ensures it's correctly keyed if resolvedStates is passed as executionContext
        return { [`${node.id}_${payloadPort.id}`]: executionContext[`${node.id}_${payloadPort.id}`] || undefined };
      }
      // processStep for ON_EVENT is handled by triggerEventFlow directly.
    },
    {
      operationType: OperationTypeEnum.STATE,
      name: 'State (Variable)',
      description: "Maintains a persistent value.",
      category: 'Values & Inputs',
      icon: Icons.ArchiveBoxIcon,
      defaultConfig: { initialValue: undefined, stateId: 'myVariable', ...defaultFooterConfig },
      isArchetype: true,
      portGenerator: (nodeId) => ({
        inputPorts: [
            { id: generatePortId(nodeId, 'in', 'Execute Action'), name: 'Execute Action', category: LogicalCategoryEnum.VOID, portType: PortTypeEnum.EXECUTION },
            { id: generatePortId(nodeId, 'in', 'Set Value'), name: 'Set Value', category: LogicalCategoryEnum.ANY, portType: PortTypeEnum.DATA, description: "Value to set the state to." },
            { id: generatePortId(nodeId, 'in', 'Reset to Initial'), name: 'Reset to Initial', category: LogicalCategoryEnum.BOOLEAN, portType: PortTypeEnum.DATA, description: "If true, sets state to initial value." },
        ],
        outputPorts: [
            { id: generatePortId(nodeId, 'out', 'Action Executed'), name: 'Action Executed', category: LogicalCategoryEnum.VOID, portType: PortTypeEnum.EXECUTION },
            { id: generatePortId(nodeId, 'out', 'Current Value'), name: 'Current Value', category: LogicalCategoryEnum.ANY, portType: PortTypeEnum.DATA },
        ],
      }),
      resolveOutputs: (node, resolvedInputs, executionContext, metaState) => {
        const stateId = node.config?.stateId;
        const currentValuePort = findOutputPortOrFail(node, 'Current Value');
        if (!stateId) throw new Error("STATE node missing State ID.");
        
        let valueToOutput;
        if (metaState.globalStateStore.has(stateId)) {
            valueToOutput = metaState.globalStateStore.get(stateId);
        } else {
            valueToOutput = node.config?.initialValue;
            // Do not set in global store here, only on exec or if explicitly requested.
        }
        return { [`${node.id}_${currentValuePort.id}`]: valueToOutput };
      },
      processStep: async (node, triggeredByExecPortId, allNodes, allConnections, resolvedStatesFromDataPull, metaState) => {
        const stateId = node.config?.stateId;
        if (!stateId) {
            metaState.log.push({timestamp:Date.now(), nodeId:node.id, message:"STATE node missing State ID.", type:'error'});
            throw new Error("STATE node missing State ID.");
        }

        const resetPort = findInputPortOrFail(node, 'Reset to Initial');
        const setValuePort = findInputPortOrFail(node, 'Set Value');
        
        // Resolve inputs for processStep if they are connected
        const resetValueInput = (allConnections.some(c => c.toNodeId === node.id && c.toPortId === resetPort.id))
            ? resolvedStatesFromDataPull[`${allConnections.find(c => c.toNodeId === node.id && c.toPortId === resetPort.id)!.fromNodeId}_${allConnections.find(c => c.toNodeId === node.id && c.toPortId === resetPort.id)!.fromPortId}`]
            : node.config?.inputPortOverrides?.[resetPort.id];

        let valueToSetInput;
        if (allConnections.some(c => c.toNodeId === node.id && c.toPortId === setValuePort.id)) {
             valueToSetInput = resolvedStatesFromDataPull[`${allConnections.find(c => c.toNodeId === node.id && c.toPortId === setValuePort.id)!.fromNodeId}_${allConnections.find(c => c.toNodeId === node.id && c.toPortId === setValuePort.id)!.fromPortId}`];
        } else {
            valueToSetInput = node.config?.inputPortOverrides?.[setValuePort.id];
        }


        if (resetValueInput === true) {
            metaState.globalStateStore.set(stateId, node.config?.initialValue);
            metaState.log.push({timestamp:Date.now(), nodeId:node.id, message:`State '${stateId}' reset to initial: ${JSON.stringify(node.config?.initialValue)}`, type:'info'});
        } else if (valueToSetInput !== undefined) {
            metaState.globalStateStore.set(stateId, valueToSetInput);
            metaState.log.push({timestamp:Date.now(), nodeId:node.id, message:`State '${stateId}' set to: ${JSON.stringify(valueToSetInput)}`, type:'info'});
        }
        
        // Update resolvedStates for Current Value port if it's part of this exec chain's data needs
        const currentValuePort = findOutputPortOrFail(node, 'Current Value');
        resolvedStatesFromDataPull[`${node.id}_${currentValuePort.id}`] = metaState.globalStateStore.get(stateId);

        const actionExecutedPort = findOutputPortOrFail(node, 'Action Executed', PortTypeEnum.EXECUTION);
        const nextExecOutputs = allConnections
            .filter(c => c.fromNodeId === node.id && c.fromPortId === actionExecutedPort.id)
            .map(conn => ({ portId: actionExecutedPort.id, targetNodeId: conn.toNodeId, targetPortId: conn.toPortId, connectionId: conn.id }));
        return { nextExecOutputs };
      }
    },
    {
      operationType: OperationTypeEnum.INPUT_GRAPH,
      name: 'Input Graph Port',
      description: "Represents an input port for a Molecular Node's sub-graph.",
      category: 'Values & Inputs',
      icon: Icons.ArrowDownTrayIcon,
      defaultConfig: { externalPortName: 'Input', externalPortCategory: LogicalCategoryEnum.ANY, ...defaultFooterConfig },
      portGenerator: (nodeId, config) => ({
        inputPorts: [],
        outputPorts: [{ id: generatePortId(nodeId, 'out', 'Value'), name: 'Value', category: config?.externalPortCategory || LogicalCategoryEnum.ANY, portType: PortTypeEnum.DATA }],
      }),
      resolveOutputs: (node, resolvedInputs, executionContext) => {
        // Value for INPUT_GRAPH is set by the parent MolecularNode when executing its sub-graph.
        // It's passed via initialResolvedStates to executeResolvedDependencyTree for the sub-graph.
        const outputPort = findOutputPortOrFail(node, 'Value');
        return { [`${node.id}_${outputPort.id}`]: executionContext[`${node.id}_${outputPort.id}`] }; // Value should be in the executionContext
      }
    },
    {
      operationType: OperationTypeEnum.OUTPUT_GRAPH,
      name: 'Output Graph Port',
      description: "Represents an output port for a Molecular Node's sub-graph.",
      category: 'Flow Control',
      icon: Icons.ArrowUpTrayIcon,
      defaultConfig: { externalPortName: 'Output', externalPortCategory: LogicalCategoryEnum.ANY, ...defaultFooterConfig },
      portGenerator: (nodeId, config) => ({
        inputPorts: [{ id: generatePortId(nodeId, 'in', 'Value'), name: 'Value', category: config?.externalPortCategory || LogicalCategoryEnum.ANY, portType: PortTypeEnum.DATA }],
        outputPorts: [],
      }),
      // No specific resolveOutputs for OUTPUT_GRAPH itself, its input is what the parent Molecular Node exposes.
    },
     {
      operationType: OperationTypeEnum.LOOP_ITEM,
      name: 'Loop Item Provider',
      description: "Provides current item and index within an ITERATE sub-graph.",
      category: 'Values & Inputs',
      icon: Icons.InboxArrowDownIcon,
      defaultConfig: { ...defaultFooterConfig },
      portGenerator: (nodeId) => ({
        inputPorts: [],
        outputPorts: [
            { id: generatePortId(nodeId, 'out', 'Item'), name: 'Item', category: LogicalCategoryEnum.ANY, portType: PortTypeEnum.DATA },
            { id: generatePortId(nodeId, 'out', 'Index'), name: 'Index', category: LogicalCategoryEnum.NUMBER, portType: PortTypeEnum.DATA },
        ],
      }),
      resolveOutputs: (node, _, __, ___, iterationData?: {currentItem: any, currentIndex: number}) => {
        if (iterationData) {
            return {
                [`${node.id}_${findOutputPortOrFail(node, 'Item').id}`]: iterationData.currentItem,
                [`${node.id}_${findOutputPortOrFail(node, 'Index').id}`]: iterationData.currentIndex,
            };
        }
        return {};
      }
    },
    {
      operationType: OperationTypeEnum.ITERATION_RESULT,
      name: 'Iteration Result',
      description: "Commits the result for the current iteration in an ITERATE sub-graph.",
      category: 'Flow Control',
      icon: Icons.PaperAirplaneIcon,
      defaultConfig: { ...defaultFooterConfig },
      portGenerator: (nodeId) => ({
        inputPorts: [
            { id: generatePortId(nodeId, 'in', 'Commit Result'), name: 'Commit Result', category: LogicalCategoryEnum.VOID, portType: PortTypeEnum.EXECUTION },
            { id: generatePortId(nodeId, 'in', 'Value'), name: 'Value', category: LogicalCategoryEnum.ANY, portType: PortTypeEnum.DATA },
        ],
        outputPorts: [],
      }),
      processStep: async (node, triggeredByExecPortId, allNodes, allConnections, resolvedStates, metaState, resolveOutputFn) => {
        const valuePort = findInputPortOrFail(node, 'Value');
        let valueToCommit;
        // Resolve value from connection or override
        const inputConnection = allConnections.find(c => c.toNodeId === node.id && c.toPortId === valuePort.id);
        if (inputConnection) {
            // Value should be resolved by data-pull if connected from within sub-graph
            // This assumes data flow inside the loop iteration is resolved prior to this exec step or on-demand by executionService
             valueToCommit = resolvedStates[`${inputConnection.fromNodeId}_${inputConnection.fromPortId}`];
             if(valueToCommit === undefined && resolveOutputFn) { // Check if resolveOutputFn is provided
                const tempMeta = { ...metaState, log: [], status: 'running' as 'running', error: undefined, fullExecutionPath: [], visitedNodesTrace: [], cycleDepth: 0 };
                const sourceNode = allNodes.find(n => n.id === inputConnection.fromNodeId);
                if (sourceNode) {
                    const sourceOutputPort = sourceNode.outputPorts.find(p => p.id === inputConnection.fromPortId);
                    if (sourceOutputPort && sourceOutputPort.portType === PortTypeEnum.DATA) {
                         const resolutionResult: ExecutionResult = await resolveOutputFn( // Use the passed function
                            sourceNode.id,
                            sourceOutputPort.id,
                            allNodes, // these should be sub-graph nodes
                            allConnections, // sub-graph connections
                            tempMeta
                        );
                        valueToCommit = resolutionResult.requestedValue;
                        // Merge logs and update status if necessary, carefully
                        metaState.log.push(...resolutionResult.finalMetaState.log.filter(l => l.type === 'error' || l.message.includes("Error")));
                        if (resolutionResult.finalMetaState.status === 'error') metaState.status = 'error';
                    }
                }
             }
        } else {
            valueToCommit = node.config?.inputPortOverrides?.[valuePort.id];
        }
        metaState.currentIterationOutput = valueToCommit;
        metaState.log.push({timestamp: Date.now(), nodeId:node.id, message:`ITERATION_RESULT committed: ${JSON.stringify(valueToCommit)}`, type: 'debug'});
        return { nextExecOutputs: [] }; // ITERATION_RESULT stops its own exec chain.
      }
    },
    {
      operationType: OperationTypeEnum.MOLECULAR,
      name: 'Create Molecule',
      description: "Encapsulates a sub-graph of nodes.",
      category: 'Containers & Hierarchy',
      icon: Icons.CubeTransparentIcon,
      defaultConfig: { ...defaultFooterConfig },
      isArchetype: true,
      portGenerator: () => ({ inputPorts: [], outputPorts: [] }), // Ports are dynamic
      // resolveOutputs and processStep for MOLECULAR are complex and handled by executeResolvedDependencyTree and processExecutionStep directly by managing sub-graph execution.
    },
    {
      operationType: OperationTypeEnum.ITERATE,
      name: 'Iterate (Loop)',
      description: "Executes its sub-graph for each item in a collection.",
      category: 'Containers & Hierarchy',
      icon: Icons.ArrowPathIcon,
      defaultConfig: { maxIterations: DEFAULT_MAX_ITERATIONS, ...defaultFooterConfig },
      isArchetype: true,
      portGenerator: (nodeId) => ({
        inputPorts: [
            { id: generatePortId(nodeId, 'in', 'Start Iteration'), name: 'Start Iteration', category: LogicalCategoryEnum.VOID, portType: PortTypeEnum.EXECUTION },
            { id: generatePortId(nodeId, 'in', 'Collection'), name: 'Collection', category: LogicalCategoryEnum.ARRAY, portType: PortTypeEnum.DATA },
            { id: generatePortId(nodeId, 'in', 'Max Iterations'), name: 'Max Iterations', category: LogicalCategoryEnum.NUMBER, portType: PortTypeEnum.DATA, description:`Overrides default if connected. Default: ${DEFAULT_MAX_ITERATIONS}` },
        ],
        outputPorts: [
            { id: generatePortId(nodeId, 'out', 'Iteration Completed'), name: 'Iteration Completed', category: LogicalCategoryEnum.VOID, portType: PortTypeEnum.EXECUTION },
            { id: generatePortId(nodeId, 'out', 'Results'), name: 'Results', category: LogicalCategoryEnum.ARRAY, portType: PortTypeEnum.DATA },
            { id: generatePortId(nodeId, 'out', 'Completed Status'), name: 'Completed Status', category: LogicalCategoryEnum.BOOLEAN, portType: PortTypeEnum.DATA, description:"True if iteration finished, false if max iterations hit or error." },
        ],
      }),
      // resolveOutputs and processStep for ITERATE are complex and handled by executeResolvedDependencyTree and processExecutionStep directly by managing sub-graph execution.
    },
  ] as AtomicNodeDefinition[],
  componentBlueprints: [],
};