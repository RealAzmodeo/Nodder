
import { AtomicNodeDefinition, OperationTypeEnum, LogicalCategoryEnum, PortTypeEnum, ExecutionContext, AtomicNode, ExecutionMetaState, AnyNode, InputPort, OutputPort, Connection, ExecutionResult, TerminalStateReasonEnum } from '../types';
import { generatePortId } from '../services/nodeFactory';
import * as Icons from '../components/Icons';
import { DEFAULT_COMMENT_WIDTH, DEFAULT_COMMENT_HEIGHT, DEFAULT_FRAME_WIDTH, DEFAULT_FRAME_HEIGHT } from '../constants';

const defaultFooterConfig = { footerNoteText: '', showFooterNote: false };

// Helper to find an input port by name or throw an error - can be shared or redefined if modules are isolated
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

export const coreModule = {
  id: 'core',
  name: 'Core Operations',
  description: 'Fundamental nodes for basic operations and graph organization.',
  atomicNodeDefinitions: [
    {
      operationType: OperationTypeEnum.VALUE_PROVIDER,
      name: 'Value Provider',
      description: "Outputs a constant, user-defined value.",
      category: 'Values & Inputs',
      icon: Icons.SparklesIcon,
      defaultConfig: { value: 0, ...defaultFooterConfig },
      isArchetype: true,
      portGenerator: (nodeId) => ({
        inputPorts: [],
        outputPorts: [{ id: generatePortId(nodeId, 'out', 'Value'), name: 'Value', category: LogicalCategoryEnum.ANY, portType: PortTypeEnum.DATA, description: "The configured constant value." }],
      }),
      resolveOutputs: (node) => {
        const outputPort = findOutputPortOrFail(node, 'Value');
        return { [`${node.id}_${outputPort.id}`]: node.config?.value };
      },
    },
    {
      operationType: OperationTypeEnum.ASSIGN,
      name: 'Assign (Passthrough)',
      description: "Passes input to output.",
      category: 'Utilities',
      icon: Icons.SparklesIcon,
      defaultConfig: { ...defaultFooterConfig },
      isArchetype: true,
      portGenerator: (nodeId) => ({
        inputPorts: [{ id: generatePortId(nodeId, 'in', 'Input'), name: 'Input', category: LogicalCategoryEnum.ANY, portType: PortTypeEnum.DATA }],
        outputPorts: [{ id: generatePortId(nodeId, 'out', 'Output'), name: 'Output', category: LogicalCategoryEnum.ANY, portType: PortTypeEnum.DATA }],
      }),
      resolveOutputs: (node, resolvedInputs) => {
        const inputPort = findInputPortOrFail(node, 'Input');
        const outputPort = findOutputPortOrFail(node, 'Output');
        return { [`${node.id}_${outputPort.id}`]: resolvedInputs[inputPort.id] };
      },
    },
    {
      operationType: OperationTypeEnum.BRANCH,
      name: 'Branch (If)',
      description: "Conditional execution and data flow.",
      category: 'Flow Control',
      icon: Icons.BranchIcon,
      defaultConfig: { ...defaultFooterConfig },
      isArchetype: true,
      portGenerator: (nodeId) => ({
        inputPorts: [
            { id: generatePortId(nodeId, 'in', 'Execute'), name: 'Execute', category: LogicalCategoryEnum.VOID, portType: PortTypeEnum.EXECUTION },
            { id: generatePortId(nodeId, 'in', 'Condition'), name: 'Condition', category: LogicalCategoryEnum.BOOLEAN, portType: PortTypeEnum.DATA },
            { id: generatePortId(nodeId, 'in', 'Input Value'), name: 'Input Value', category: LogicalCategoryEnum.ANY, portType: PortTypeEnum.DATA },
        ],
        outputPorts: [
            { id: generatePortId(nodeId, 'out', 'If True (Exec)'), name: 'If True (Exec)', category: LogicalCategoryEnum.VOID, portType: PortTypeEnum.EXECUTION },
            { id: generatePortId(nodeId, 'out', 'If False (Exec)'), name: 'If False (Exec)', category: LogicalCategoryEnum.VOID, portType: PortTypeEnum.EXECUTION },
            { id: generatePortId(nodeId, 'out', 'If True (Data)'), name: 'If True (Data)', category: LogicalCategoryEnum.ANY, portType: PortTypeEnum.DATA },
            { id: generatePortId(nodeId, 'out', 'If False (Data)'), name: 'If False (Data)', category: LogicalCategoryEnum.ANY, portType: PortTypeEnum.DATA },
        ],
      }),
      resolveOutputs: (node, resolvedInputs) => {
        const conditionPort = findInputPortOrFail(node, 'Condition');
        const inputValuePort = findInputPortOrFail(node, 'Input Value');
        const ifTrueDataPort = findOutputPortOrFail(node, 'If True (Data)');
        const ifFalseDataPort = findOutputPortOrFail(node, 'If False (Data)');

        const condition = resolvedInputs[conditionPort.id];
        const inputValue = resolvedInputs[inputValuePort.id];
        const outputs: Partial<ExecutionContext> = {};
        
        // For data passthrough, if condition is not a boolean, it might be an error or default path
        // However, processStep should rigorously check and halt if type is wrong for execution.
        // Here, for data flow, we can be a bit more lenient or assume it has been validated.
        if (condition === true) {
          outputs[`${node.id}_${ifTrueDataPort.id}`] = inputValue;
        } else { // Handles false, undefined, null, non-boolean for data flow by defaulting to false path
          outputs[`${node.id}_${ifFalseDataPort.id}`] = inputValue;
        }
        return outputs;
      },
      processStep: async (node, triggeredByExecPortId, allNodes, allConnections, resolvedStates, metaState, resolveOutputFn) => {
        const conditionPort = findInputPortOrFail(node, 'Condition');
        const conditionInputConnection = allConnections.find(c => c.toNodeId === node.id && c.toPortId === conditionPort.id);
        let conditionVal: any;

        if (conditionInputConnection) {
            if (!resolveOutputFn) {
                metaState.log.push({timestamp: Date.now(), nodeId: node.id, message: "BRANCH Error: resolveOutputFn not available for Condition port.", type: 'error'});
                metaState.status = 'error';
                metaState.error = "resolveOutputFn not available";
                return {}; // Halt
            }
             // Prepare a minimal metaState for the sub-resolution
            const subMetaStateConfig: Partial<Omit<ExecutionMetaState, 'globalStateStore' | 'pulsingConnectionInfo'>> & { globalStateStore: Map<string, any> } = {
                globalStateStore: metaState.globalStateStore, // Share global store
                log: [], // Isolate logs for sub-resolution initially
                visitedNodesTrace: [], 
                fullExecutionPath: [], 
                cycleDepth: 0, 
                maxCycleDepth: metaState.maxCycleDepth,
                status: 'running',
            };
            const result: ExecutionResult = await resolveOutputFn(
                conditionInputConnection.fromNodeId,
                conditionInputConnection.fromPortId,
                allNodes, 
                allConnections,
                subMetaStateConfig
            );
            conditionVal = result.requestedValue;

            // Merge critical parts of subMetaState back
            if (result.finalMetaState.status === 'error') {
                metaState.status = 'error';
                metaState.error = result.finalMetaState.error || TerminalStateReasonEnum.ERROR_OPERATION_FAILED;
                // Merge only error logs or specific logs if needed, avoid flooding main log
                result.finalMetaState.log.forEach(subLog => {
                    if(subLog.type === 'error') metaState.log.push({...subLog, message: `Sub-resolution for BRANCH Condition: ${subLog.message}`});
                });
                return {}; // Halt this path
            }
            // Update the main resolvedStates with the newly fetched value, so it's available for its own resolveOutputs or future nodes if needed.
            resolvedStates[`${conditionInputConnection.fromNodeId}_${conditionInputConnection.fromPortId}`] = conditionVal;

        } else { // Not connected
            conditionVal = node.config?.inputPortOverrides?.[conditionPort.id];
            if (conditionVal === undefined) { 
                conditionVal = false; // Default to false if no connection and no override
                metaState.log.push({timestamp: Date.now(), nodeId: node.id, message: "BRANCH Condition not connected and no override, defaulting to false.", type: 'debug'});
            }
        }

        if (typeof conditionVal !== 'boolean') {
            metaState.log.push({timestamp: Date.now(), nodeId: node.id, message: `BRANCH Condition input must be boolean, but received ${typeof conditionVal} (${JSON.stringify(conditionVal)}).`, type: 'error'});
            metaState.status = 'error';
            metaState.error = TerminalStateReasonEnum.ERROR_INVALID_INPUT_TYPE;
            return {}; // Halt this path
        }

        const execPortToTriggerName = conditionVal ? 'If True (Exec)' : 'If False (Exec)';
        const execPortToTrigger = findOutputPortOrFail(node, execPortToTriggerName, PortTypeEnum.EXECUTION);
        
        const nextExecOutputs = allConnections
            .filter(c => c.fromNodeId === node.id && c.fromPortId === execPortToTrigger.id)
            .map(conn => ({ portId: execPortToTrigger.id, targetNodeId: conn.toNodeId, targetPortId: conn.toPortId, connectionId: conn.id }));
        return { nextExecOutputs };
      }
    },
    {
      operationType: OperationTypeEnum.COMMENT,
      name: 'Comment',
      description: "Adds text annotations to the graph.",
      category: 'Utilities',
      icon: Icons.ChatBubbleLeftEllipsisIcon,
      defaultConfig: { commentText: "My Comment", frameWidth: DEFAULT_COMMENT_WIDTH, frameHeight: DEFAULT_COMMENT_HEIGHT, ...defaultFooterConfig },
      portGenerator: () => ({ inputPorts: [], outputPorts: [] }),
      // No resolveOutputs or processStep needed for Comment
    },
    {
      operationType: OperationTypeEnum.FRAME,
      name: 'Frame',
      description: "Visually groups related nodes.",
      category: 'Utilities',
      icon: Icons.RectangleGroupIcon,
      defaultConfig: { frameTitle: "My Group", frameWidth: DEFAULT_FRAME_WIDTH, frameHeight: DEFAULT_FRAME_HEIGHT, ...defaultFooterConfig },
      portGenerator: () => ({ inputPorts: [], outputPorts: [] }),
      // No resolveOutputs or processStep needed for Frame
    },
    {
      operationType: OperationTypeEnum.LOG_VALUE,
      name: 'Log Value',
      description: "Logs input value to console and passes it through.",
      category: 'Utilities',
      icon: Icons.LogValueIcon,
      defaultConfig: { ...defaultFooterConfig },
      isArchetype: true,
      portGenerator: (nodeId) => ({
        inputPorts: [
            { id: generatePortId(nodeId, 'in', 'Execute'), name: 'Execute', category: LogicalCategoryEnum.VOID, portType: PortTypeEnum.EXECUTION },
            { id: generatePortId(nodeId, 'in', 'Input'), name: 'Input', category: LogicalCategoryEnum.ANY, portType: PortTypeEnum.DATA, description: "Value to log." },
        ],
        outputPorts: [
            { id: generatePortId(nodeId, 'out', 'Executed'), name: 'Executed', category: LogicalCategoryEnum.VOID, portType: PortTypeEnum.EXECUTION },
            { id: generatePortId(nodeId, 'out', 'Output'), name: 'Output', category: LogicalCategoryEnum.ANY, portType: PortTypeEnum.DATA, description: "Passes through the input value." },
        ],
      }),
      resolveOutputs: (node, resolvedInputs) => {
        const inputPort = findInputPortOrFail(node, 'Input');
        const outputPort = findOutputPortOrFail(node, 'Output');
        const val = resolvedInputs[inputPort.id];
        return { [`${node.id}_${outputPort.id}`]: val };
      },
      processStep: async (node, triggeredByExecPortId, allNodes, allConnections, resolvedStates, metaState, resolveOutputFn) => {
        const inputPort = findInputPortOrFail(node, 'Input');
        let valueToLog: any;

        const inputConnection = allConnections.find(c => c.toNodeId === node.id && c.toPortId === inputPort.id);
        if (inputConnection) {
            if (!resolveOutputFn) {
                metaState.log.push({timestamp: Date.now(), nodeId: node.id, message: "LOG_VALUE Error: resolveOutputFn not available for Input port.", type: 'error'});
                metaState.status = 'error';
                metaState.error = "resolveOutputFn not available";
                return {}; // Halt
            }
            const result = await resolveOutputFn(
                inputConnection.fromNodeId,
                inputConnection.fromPortId,
                allNodes,
                allConnections,
                { globalStateStore: metaState.globalStateStore, log: [], visitedNodesTrace: [], fullExecutionPath: [], cycleDepth: 0, maxCycleDepth: metaState.maxCycleDepth, status: 'running' }
            );
            if (result.finalMetaState.status === 'error') {
                metaState.status = 'error';
                metaState.error = result.finalMetaState.error || TerminalStateReasonEnum.ERROR_OPERATION_FAILED;
                result.finalMetaState.log.forEach(subLog => {
                    if(subLog.type === 'error') metaState.log.push({...subLog, message: `Sub-resolution for LOG_VALUE Input: ${subLog.message}`});
                });
                return {}; // Halt this path
            }
            valueToLog = result.requestedValue;
            resolvedStates[`${inputConnection.fromNodeId}_${inputConnection.fromPortId}`] = valueToLog; // Cache for this execution flow
        } else {
            valueToLog = node.config?.inputPortOverrides?.[inputPort.id];
            if (valueToLog === undefined && triggeredByExecPortId) { // Log undefined only if explicitly triggered by exec
                 metaState.log.push({ timestamp: Date.now(), nodeId: node.id, message: "LOG_VALUE: Input is unconnected and has no override. Logging undefined.", type: 'debug'});
            }
        }

        metaState.log.push({ timestamp: Date.now(), nodeId: node.id, message: `LOG: ${JSON.stringify(valueToLog)}`, type: 'info'});
        
        const executedPort = findOutputPortOrFail(node, 'Executed', PortTypeEnum.EXECUTION);
        const nextExecOutputs = allConnections
            .filter(c => c.fromNodeId === node.id && c.fromPortId === executedPort.id)
            .map(conn => ({ portId: executedPort.id, targetNodeId: conn.toNodeId, targetPortId: conn.toPortId, connectionId: conn.id }));
        return { nextExecOutputs };
      }
    },
  ] as AtomicNodeDefinition[], // Cast to satisfy the updated type
  componentBlueprints: [],
};
