
import {
  NodeId,
  AtomicNode,
  MolecularNode,
  OperationTypeEnum,
  InputPort,
  OutputPort,
  AnyNode,
  NodeConfig,
  Connection,
  SwitchCaseConfig
} from '../types';
import { DEFAULT_MAX_ITERATIONS } from '../constants';
import { nodeRegistryService } from './NodeRegistryService'; // Import the new registry

let nodeIdCounter = 0;
export function generateNodeId(): NodeId {
  return `node_${Date.now()}_${nodeIdCounter++}`;
}

let portIdCounter = 0;
export function generatePortId(nodeId: NodeId, type: 'in' | 'out', name: string): string {
    const sanitizedName = name.toLowerCase().replace(/\s+/g, '_').replace(/[^a-z0-9_]/gi, '').substring(0, 20);
    return `${nodeId}_${type}_${sanitizedName}_${portIdCounter++}`;
}

export function generateConnectionId(): string {
  return `conn_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
}

export function generateSwitchCaseId(): string {
  return `case_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
}


interface CreateNodeOptions {
  id?: NodeId;
  name?: string; // Name can be optional now, registry provides default
  operationType: OperationTypeEnum;
  position: { x: number; y: number };
  inputPorts?: InputPort[];
  outputPorts?: OutputPort[];
  config?: NodeConfig;
  isStartNode?: boolean;
}

function createBaseNode(options: CreateNodeOptions, nameFromRegistry: string, descriptionFromRegistry: string, defaultConfigFromRegistry: Partial<NodeConfig>): Omit<AtomicNode, 'type'> & {type?: 'Atomic' | 'Molecular'} {
  const id = options.id || generateNodeId();
  return {
    id,
    name: options.name || nameFromRegistry, // Use provided name or default from registry
    operationType: options.operationType,
    position: options.position,
    inputPorts: options.inputPorts || [],
    outputPorts: options.outputPorts || [],
    config: { ...defaultConfigFromRegistry, ...options.config },
    isStartNode: options.isStartNode || false,
    description: descriptionFromRegistry,
  };
}

export function createAtomicNode(options: CreateNodeOptions): AtomicNode {
  const definition = nodeRegistryService.getNodeDefinition(options.operationType);

  if (!definition) {
    console.error(`Node definition not found for operation type: ${options.operationType}`);
    // Fallback, but this indicates an issue with module loading or registration
    const baseFallback = createBaseNode(options, `Unknown: ${options.operationType}`, "Unknown node type", {});
    return { ...baseFallback, type: 'Atomic', inputPorts: [], outputPorts: [] };
  }

  const { name: regName, description: regDesc, defaultConfig: regConfig, portGenerator } = definition;
  const base = createBaseNode(options, regName, regDesc, regConfig);
  
  const generatedPorts = portGenerator(base.id, base.config);

  return {
    ...base,
    type: 'Atomic',
    inputPorts: options.inputPorts || generatedPorts.inputPorts,
    outputPorts: options.outputPorts || generatedPorts.outputPorts
  };
}


export function createMolecularNode(options: CreateNodeOptions & { subGraph?: { nodes: AnyNode[], connections: Connection[] } }): MolecularNode {
  const definition = nodeRegistryService.getNodeDefinition(OperationTypeEnum.MOLECULAR); // Generic MOLECULAR def
  const name = options.name || definition?.name || "Molecule";
  const description = definition?.description || "A container for a sub-graph of nodes.";
  const defaultConfig = definition?.defaultConfig || {};

  const base = createBaseNode(options, name, description, defaultConfig);

  return {
    ...base,
    name, // Ensure name is correctly passed
    type: 'Molecular',
    inputPorts: options.inputPorts || [],
    outputPorts: options.outputPorts || [],
    subGraph: options.subGraph || { nodes: [], connections: [] },
  };
}

export function createIterateNode(options: CreateNodeOptions): MolecularNode {
  const definition = nodeRegistryService.getNodeDefinition(OperationTypeEnum.ITERATE);
  if (!definition) {
    throw new Error(`Node definition for ITERATE not found in registry.`);
  }
  const { name: regName, description: regDesc, defaultConfig: regConfig, portGenerator } = definition;

  const base = createBaseNode(options, regName, regDesc, regConfig);
  const generatedPorts = portGenerator(base.id, base.config);

  return {
    ...base,
    type: 'Molecular',
    operationType: OperationTypeEnum.ITERATE,
    inputPorts: options.inputPorts || generatedPorts.inputPorts,
    outputPorts: options.outputPorts || generatedPorts.outputPorts,
    subGraph: { nodes: [], connections: [] },
  };
}
