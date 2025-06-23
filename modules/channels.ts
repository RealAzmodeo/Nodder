
import { AtomicNodeDefinition, OperationTypeEnum, LogicalCategoryEnum, PortTypeEnum, AtomicNode, InputPort, OutputPort, ExecutionContext, Connection, ExecutionMetaState } from '../types';
import { generatePortId } from '../services/nodeFactory';
import * as Icons from '../components/Icons';

const defaultFooterConfig = { footerNoteText: '', showFooterNote: false };
const CHANNEL_PREFIX = "__channel_";

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

export const channelsModule = {
  id: 'channels',
  name: 'Data Channels',
  description: 'Nodes for sending and receiving data through named channels.',
  atomicNodeDefinitions: [
    {
      operationType: OperationTypeEnum.SEND_DATA,
      name: 'Send Data',
      description: "Sends input data to a named channel.",
      category: 'Values & Inputs',
      icon: Icons.PaperAirplaneIcon,
      defaultConfig: { channelName: "defaultChannel", ...defaultFooterConfig },
      portGenerator: (nodeId) => ({
        inputPorts: [
            { id: generatePortId(nodeId, 'in', 'Execute'), name: 'Execute', category: LogicalCategoryEnum.VOID, portType: PortTypeEnum.EXECUTION, description: "Pulse to send data."},
            { id: generatePortId(nodeId, 'in', 'Data In'), name: 'Data In', category: LogicalCategoryEnum.ANY, portType: PortTypeEnum.DATA, description: "Data to send to the channel." }
        ],
        outputPorts: [
             { id: generatePortId(nodeId, 'out', 'Executed'), name: 'Executed', category: LogicalCategoryEnum.VOID, portType: PortTypeEnum.EXECUTION, description: "Pulses after data is sent."}
        ],
      }),
      // SEND_DATA primarily has side effects, no data output of its own from resolveOutputs in data-pull model
      // unless it's designed to pass through the data it sent. For now, no specific data output.
      processStep: async (node, triggeredByExecPortId, allNodes, allConnections, resolvedStates, metaState) => {
        const channelNameSend = node.config?.channelName;
        if (!channelNameSend || channelNameSend.trim() === '') {
            metaState.log.push({timestamp: Date.now(), nodeId: node.id, message:"SEND_DATA node missing Channel Name.", type: 'error'});
            throw new Error("SEND_DATA node missing Channel Name.");
        }
        const dataInPort = findInputPortOrFail(node, 'Data In');
        
        // Resolve Data In port if connected
        let dataToSend: any;
        const inputConnection = allConnections.find(c => c.toNodeId === node.id && c.toPortId === dataInPort.id);
        if (inputConnection) {
             dataToSend = resolvedStates[`${inputConnection.fromNodeId}_${inputConnection.fromPortId}`];
        } else {
            dataToSend = node.config?.inputPortOverrides?.[dataInPort.id];
        }

        metaState.globalStateStore.set(`${CHANNEL_PREFIX}${channelNameSend}`, dataToSend);
        metaState.log.push({timestamp: Date.now(), nodeId: node.id, message:`Data sent to channel '${channelNameSend}': ${JSON.stringify(dataToSend)}`, type: 'debug'});
        
        const executedPort = findOutputPortOrFail(node, 'Executed', PortTypeEnum.EXECUTION);
        const nextExecOutputs = allConnections
            .filter(c => c.fromNodeId === node.id && c.fromPortId === executedPort.id)
            .map(conn => ({ portId: executedPort.id, targetNodeId: conn.toNodeId, targetPortId: conn.toPortId, connectionId: conn.id }));
        return { nextExecOutputs };
      }
    },
    {
      operationType: OperationTypeEnum.RECEIVE_DATA,
      name: 'Receive Data',
      description: "Receives data from a named channel.",
      category: 'Values & Inputs',
      icon: Icons.InboxArrowDownIcon,
      defaultConfig: { channelName: "defaultChannel", ...defaultFooterConfig },
      portGenerator: (nodeId) => ({
        inputPorts: [],
        outputPorts: [
            { id: generatePortId(nodeId, 'out', 'Data Out'), name: 'Data Out', category: LogicalCategoryEnum.ANY, portType: PortTypeEnum.DATA, description: "Last data received from the channel." }
        ],
      }),
      resolveOutputs: (node, resolvedInputs, executionContext, metaState) => {
        const channelNameReceive = node.config?.channelName;
        if (!channelNameReceive || channelNameReceive.trim() === '') {
            metaState.log.push({timestamp: Date.now(), nodeId: node.id, message:"RECEIVE_DATA node missing Channel Name.", type: 'error'});
            throw new Error("RECEIVE_DATA node missing Channel Name.");
        }
        const receivedData = metaState.globalStateStore.get(`${CHANNEL_PREFIX}${channelNameReceive}`);
        metaState.log.push({timestamp: Date.now(), nodeId: node.id, message:`Data received from channel '${channelNameReceive}': ${JSON.stringify(receivedData)}`, type: 'debug'});
        return { [`${node.id}_${findOutputPortOrFail(node, 'Data Out').id}`]: receivedData };
      }
    },
  ] as AtomicNodeDefinition[],
  componentBlueprints: [],
};
