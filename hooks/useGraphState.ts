

import { useState, useCallback, useMemo } from 'react';
import {
  AnyNode, Connection, OperationTypeEnum, NodeId, MolecularNode,
  InputPort, OutputPort, LogicalCategoryEnum, NodeConfig, Port, PortTypeEnum, ScopeStackItem, NodeResizeEndHandler
} from '../types';
import { createAtomicNode, createMolecularNode, generateNodeId, generateConnectionId, generatePortId, createIterateNode } from '../services/nodeFactory';
import { nodeRegistryService } from '../services/NodeRegistryService';

let dynamicPortIdCounter = 0;
const generateAppSpecificDynamicPortId = (nodeId: NodeId, baseName: string): string => {
  return `${nodeId}_dyn_${baseName.toLowerCase().replace(/\s+/g, '_')}_${Date.now()}_${dynamicPortIdCounter++}`;
};

const arePortListsSame = (listA: Port[], listB: Port[]): boolean => {
  if (listA.length !== listB.length) return false;
  for (let i = 0; i < listA.length; i++) {
    if (listA[i].id !== listB[i].id ||
        listA[i].name !== listB[i].name ||
        listA[i].category !== listB[i].category ||
        listA[i].portType !== listB[i].portType) {
      return false;
    }
  }
  return true;
};

export const useGraphState = (initialNodes: AnyNode[] = [], initialConnections: Connection[] = []) => {
  const [nodes, setNodesInternal] = useState<AnyNode[]>(initialNodes);
  const [connections, setConnectionsInternal] = useState<Connection[]>(initialConnections);
  const [currentGraphId, setCurrentGraphIdInternal] = useState<NodeId | 'root'>('root');
  const [scopeStack, setScopeStackInternal] = useState<ScopeStackItem[]>([{ id: 'root', name: 'Root Graph' }]);

  const getCurrentGraphData = useCallback((): {
    currentNodes: AnyNode[];
    currentConnections: Connection[];
    parentNodeId?: NodeId;
    parentNodeType?: OperationTypeEnum;
  } => {
    if (currentGraphId === 'root') {
      return { currentNodes: nodes, currentConnections: connections, parentNodeId: undefined, parentNodeType: undefined };
    }
    const parentNode = nodes.find(n => n.id === currentGraphId && n.type === 'Molecular') as MolecularNode | undefined;
    if (parentNode) {
      return {
        currentNodes: parentNode.subGraph.nodes,
        currentConnections: parentNode.subGraph.connections,
        parentNodeId: parentNode.id,
        parentNodeType: parentNode.operationType
      };
    }
    console.error("useGraphState: Could not find parent molecular node for currentGraphId:", currentGraphId);
    return { currentNodes: [], currentConnections: [], parentNodeId: undefined, parentNodeType: undefined };
  }, [nodes, connections, currentGraphId]);

  const { currentNodes, currentConnections, parentNodeId: currentParentNodeId, parentNodeType: currentParentNodeType } = useMemo(getCurrentGraphData, [getCurrentGraphData]);

  const regenerateMolecularNodePorts = useCallback((molecularNodeToUpdate: MolecularNode): MolecularNode => {
    if (molecularNodeToUpdate.operationType === OperationTypeEnum.ITERATE) {
      const iterateDef = nodeRegistryService.getNodeDefinition(OperationTypeEnum.ITERATE);
      if (iterateDef) {
        const { inputPorts, outputPorts } = iterateDef.portGenerator(molecularNodeToUpdate.id, molecularNodeToUpdate.config);
        if (!arePortListsSame(molecularNodeToUpdate.inputPorts, inputPorts) || !arePortListsSame(molecularNodeToUpdate.outputPorts, outputPorts)) {
          return { ...molecularNodeToUpdate, inputPorts, outputPorts };
        }
      }
      return molecularNodeToUpdate;
    }

    const newMolecularInputPorts: InputPort[] = [];
    const newMolecularOutputPorts: OutputPort[] = [];

    molecularNodeToUpdate.subGraph.nodes.forEach(subNode => {
      if (subNode.operationType === OperationTypeEnum.INPUT_GRAPH && subNode.config?.externalPortName) {
        const existingPort = molecularNodeToUpdate.inputPorts.find(p => p.name === subNode.config!.externalPortName && p.portType === PortTypeEnum.DATA);
        newMolecularInputPorts.push({
          id: existingPort?.id || generatePortId(molecularNodeToUpdate.id, 'in', subNode.config.externalPortName),
          name: subNode.config.externalPortName,
          category: subNode.config.externalPortCategory || LogicalCategoryEnum.ANY,
          portType: PortTypeEnum.DATA,
          description: `Input for ${molecularNodeToUpdate.name} from sub-graph node ${subNode.name}`,
        });
      } else if (subNode.operationType === OperationTypeEnum.OUTPUT_GRAPH && subNode.config?.externalPortName) {
        const existingPort = molecularNodeToUpdate.outputPorts.find(p => p.name === subNode.config!.externalPortName && p.portType === PortTypeEnum.DATA);
        newMolecularOutputPorts.push({
          id: existingPort?.id || generatePortId(molecularNodeToUpdate.id, 'out', subNode.config.externalPortName),
          name: subNode.config.externalPortName,
          category: subNode.config.externalPortCategory || LogicalCategoryEnum.ANY,
          portType: PortTypeEnum.DATA,
          description: `Output for ${molecularNodeToUpdate.name} from sub-graph node ${subNode.name}`,
        });
      }
    });

    newMolecularInputPorts.sort((a, b) => a.name.localeCompare(b.name));
    newMolecularOutputPorts.sort((a, b) => a.name.localeCompare(b.name));

    if (!arePortListsSame(molecularNodeToUpdate.inputPorts.filter(p => p.portType === PortTypeEnum.DATA), newMolecularInputPorts) ||
        !arePortListsSame(molecularNodeToUpdate.outputPorts.filter(p => p.portType === PortTypeEnum.DATA), newMolecularOutputPorts)) {
      const execInputPorts = molecularNodeToUpdate.inputPorts.filter(p => p.portType === PortTypeEnum.EXECUTION);
      const execOutputPorts = molecularNodeToUpdate.outputPorts.filter(p => p.portType === PortTypeEnum.EXECUTION);
      return { ...molecularNodeToUpdate, inputPorts: [...execInputPorts, ...newMolecularInputPorts], outputPorts: [...execOutputPorts, ...newMolecularOutputPorts] };
    }
    return molecularNodeToUpdate;
  }, []);

  const manageUnionNodePorts = useCallback((unionNode: AnyNode, connectionsInScope: Connection[]): AnyNode | null => {
    if (unionNode.operationType !== OperationTypeEnum.UNION || !unionNode.inputPorts) return null;
    let madeChanges = false;
    const connectedDataPortsDetails: {port: InputPort, originalIndex: number}[] = [];

    unionNode.inputPorts.filter(p => p.portType === PortTypeEnum.DATA).forEach((p, index) => {
        if(connectionsInScope.some(c => c.toNodeId === unionNode.id && c.toPortId === p.id)) {
            connectedDataPortsDetails.push({port: p, originalIndex: index});
        }
    });

    let newPortList: InputPort[] = connectedDataPortsDetails.map((detail, idx) => {
        const newName = `Item ${idx + 1}`;
        if (detail.port.name !== newName) madeChanges = true;
        return { ...detail.port, name: newName };
    });

    const nextItemNumber = newPortList.length + 1;
    const newEmptyPort: InputPort = {
        id: generateAppSpecificDynamicPortId(unionNode.id, `item${nextItemNumber}`),
        name: `Item ${nextItemNumber}`,
        category: LogicalCategoryEnum.ANY,
        portType: PortTypeEnum.DATA,
        description: 'Item to include in the union. Connecting this port may add new ports.'
    };
    newPortList.push(newEmptyPort);

    if (newPortList.length !== unionNode.inputPorts.filter(p=>p.portType === PortTypeEnum.DATA).length ||
        !arePortListsSame(newPortList.map(p => ({...p, connectedOutputNodeId: undefined, connectedOutputPortId: undefined})),
                          unionNode.inputPorts.filter(p=>p.portType === PortTypeEnum.DATA).map(p => ({...p, connectedOutputNodeId: undefined, connectedOutputPortId: undefined})))) {
        madeChanges = true;
    }

    if (madeChanges) {
      const finalNewPortList = newPortList.map(p_new => {
          const originalPort = unionNode.inputPorts.find(p_orig => p_orig.id === p_new.id);
          return { ...p_new, connectedOutputNodeId: originalPort?.connectedOutputNodeId, connectedOutputPortId: originalPort?.connectedOutputPortId };
      });
      const execPorts = unionNode.inputPorts.filter(p => p.portType === PortTypeEnum.EXECUTION);
      return { ...unionNode, inputPorts: [...execPorts, ...finalNewPortList] };
    }
    return null;
  }, []);

  const manageConstructObjectNodePorts = useCallback((objectNode: AnyNode, connectionsInScope: Connection[]): AnyNode | null => {
    if (objectNode.operationType !== OperationTypeEnum.CONSTRUCT_OBJECT || !objectNode.inputPorts) return null;
    let madeChanges = false;

    const dataInputPorts = objectNode.inputPorts
        .filter(p => p.portType === PortTypeEnum.DATA)
        .sort((a,b) => parseInt(a.name.split(" ")[1] || "0") - parseInt(b.name.split(" ")[1] || "0"));

    let newPortList: InputPort[] = [];
    let connectedPairCount = 0;

    for (let i = 0; i < dataInputPorts.length; i += 2) {
        const keyPort = dataInputPorts[i];
        const valuePort = dataInputPorts[i + 1];

        if (keyPort && valuePort) {
            const isValuePortConnected = connectionsInScope.some(c => c.toNodeId === objectNode.id && c.toPortId === valuePort.id);
             if (isValuePortConnected || i === dataInputPorts.length - 2) { 
                connectedPairCount++;
                const newKeyName = `Key ${connectedPairCount}`;
                const newValueName = `Value ${connectedPairCount}`;
                if (keyPort.name !== newKeyName || valuePort.name !== newValueName) madeChanges = true;

                newPortList.push({ ...keyPort, name: newKeyName });
                newPortList.push({ ...valuePort, name: newValueName });
            }
        }
    }
    
    const lastValuePortInNewList = newPortList[newPortList.length - 1];
    const isLastValuePortConnected = lastValuePortInNewList ? connectionsInScope.some(c => c.toNodeId === objectNode.id && c.toPortId === lastValuePortInNewList.id) : false;

    if (newPortList.length === 0 || isLastValuePortConnected) {
        const nextPairNumber = (newPortList.length / 2) + 1;
        newPortList.push({
            id: generateAppSpecificDynamicPortId(objectNode.id, `key${nextPairNumber}`),
            name: `Key ${nextPairNumber}`,
            category: LogicalCategoryEnum.STRING,
            portType: PortTypeEnum.DATA,
            description: `Key for property ${nextPairNumber}.`
        });
        newPortList.push({
            id: generateAppSpecificDynamicPortId(objectNode.id, `value${nextPairNumber}`),
            name: `Value ${nextPairNumber}`,
            category: LogicalCategoryEnum.ANY,
            portType: PortTypeEnum.DATA,
            description: `Value for property ${nextPairNumber}. Connecting this port may add new ports.`
        });
        madeChanges = true;
    }


    if (newPortList.length !== dataInputPorts.length || madeChanges) {
        const finalNewPortList = newPortList.map(p_new => {
            const originalPort = objectNode.inputPorts.find(p_orig => p_orig.id === p_new.id);
            return { ...p_new, connectedOutputNodeId: originalPort?.connectedOutputNodeId, connectedOutputPortId: originalPort?.connectedOutputPortId };
        });
        const execPorts = objectNode.inputPorts.filter(p => p.portType === PortTypeEnum.EXECUTION);
        return { ...objectNode, inputPorts: [...execPorts, ...finalNewPortList] };
    }
    return null; // Explicitly return null if no changes were made or required
  }, []);


  const setGraphStateForLoad = useCallback((data: {
    nodes: AnyNode[],
    connections: Connection[],
    currentGraphId: NodeId | 'root',
    scopeStack: ScopeStackItem[]
  }) => {
    setNodesInternal(data.nodes.map(n => n.type === 'Molecular' ? regenerateMolecularNodePorts(n as MolecularNode) : n));
    setConnectionsInternal(data.connections);
    setCurrentGraphIdInternal(data.currentGraphId || 'root');
    setScopeStackInternal(data.scopeStack || [{id: 'root', name: 'Root Graph'}]);
  }, [regenerateMolecularNodePorts]);

  const addNode = useCallback((
    type: OperationTypeEnum,
    position?: { x: number; y: number },
  ): AnyNode | null => {
    const { parentNodeType: CPNParentType, parentNodeId: currentScopeParentId } = getCurrentGraphData();
    const defaultPosition = position || { x: Math.random() * 400 + 50, y: Math.random() * 200 + 50 };

    const nodeDef = nodeRegistryService.getNodeDefinition(type);
    if (!nodeDef) {
        console.error(`Cannot add node: Definition for type ${type} not found.`);
        return null;
    }

    const nodeNameBase = nodeDef.name;
    
    const nodesForNameCounting = currentScopeParentId 
        ? (nodes.find(n => n.id === currentScopeParentId) as MolecularNode)?.subGraph.nodes || [] 
        : nodes;
    const nodeCountForName = nodesForNameCounting.filter(n => n.operationType === type).length + 1;
    const newNodeName = `${nodeNameBase} ${nodeCountForName}`;
    
    let newNode: AnyNode;
    if (type === OperationTypeEnum.MOLECULAR) {
        if (CPNParentType === OperationTypeEnum.ITERATE || currentScopeParentId) {
             alert("Molecular nodes can only be added to the Root Graph."); return null;
        }
        newNode = createMolecularNode({ name: newNodeName, operationType: type, position: defaultPosition, config: nodeDef.defaultConfig });
    } else if (type === OperationTypeEnum.ITERATE) {
         if (currentGraphId !== 'root') {
             alert("Iterate nodes can only be added to the Root Graph."); return null;
         }
        newNode = createIterateNode({ name: newNodeName, operationType: type, position: defaultPosition, config: nodeDef.defaultConfig });
    } else {
        newNode = createAtomicNode({ name: newNodeName, operationType: type, position: defaultPosition, config: nodeDef.defaultConfig });
    }

    if (currentScopeParentId) {
        setNodesInternal(prevRootNodes => { // Updater function for root nodes
            return prevRootNodes.map(n => {
                if (n.id === currentScopeParentId && n.type === 'Molecular') {
                    let molecularNode = n as MolecularNode;
                    const newSubGraphNodes = [...molecularNode.subGraph.nodes, newNode];
                    let updatedParentNode = {
                        ...molecularNode,
                        subGraph: { ...molecularNode.subGraph, nodes: newSubGraphNodes }
                    };
                    if (newNode.operationType === OperationTypeEnum.INPUT_GRAPH || newNode.operationType === OperationTypeEnum.OUTPUT_GRAPH) {
                        updatedParentNode = regenerateMolecularNodePorts(updatedParentNode);
                    }
                    return updatedParentNode;
                }
                return n;
            });
        });
    } else { // Adding to root graph
        setNodesInternal(prev => [...prev, newNode]);
    }
    return newNode;
  }, [nodes, currentGraphId, regenerateMolecularNodePorts, getCurrentGraphData]);

  const addBlueprint = useCallback((blueprintCreator: () => MolecularNode): MolecularNode | null => {
    if (currentGraphId !== 'root') {
        alert("Component blueprints can only be added to the Root Graph.");
        return null;
    }
    const blueprintNodeInstance = blueprintCreator();
    const newNodeId = generateNodeId();
    const defaultPosition = { x: Math.random() * 400 + 50, y: Math.random() * 200 + 50 };

    let nodeCountForName = nodes.filter(n => n.name.startsWith(blueprintNodeInstance.name)).length + 1;
    const newNodeName = `${blueprintNodeInstance.name} ${nodeCountForName}`;

    const oldToNewSubNodeIdMap = new Map<NodeId, NodeId>();
    const oldPortIdToNewPortIdMap = new Map<string, string>();

    const newSubGraphNodes: AnyNode[] = blueprintNodeInstance.subGraph.nodes.map(subNode => {
        const newSubNodeId = generateNodeId();
        oldToNewSubNodeIdMap.set(subNode.id, newSubNodeId);
        const nodeDef = nodeRegistryService.getNodeDefinition(subNode.operationType);

        const newSubInputPorts = subNode.inputPorts.map(p => {
            const newPortId = generatePortId(newSubNodeId, 'in', p.name);
            oldPortIdToNewPortIdMap.set(p.id, newPortId);
            return {...p, id: newPortId};
        });
        const newSubOutputPorts = subNode.outputPorts.map(p => {
            const newPortId = generatePortId(newSubNodeId, 'out', p.name);
            oldPortIdToNewPortIdMap.set(p.id, newPortId);
            return {...p, id: newPortId};
        });
        
        if (subNode.type === 'Molecular') {
            const molecularSubNode = subNode as MolecularNode;
            const reIdedInnerSubGraph = {nodes: [] as AnyNode[], connections: [] as Connection[]};
            const innerOldToNewNodeIdMap = new Map<NodeId, NodeId>();
            const innerOldToNewPortIdMap = new Map<string, string>();

            reIdedInnerSubGraph.nodes = molecularSubNode.subGraph.nodes.map(innerSubN => {
                const newInnerSubNodeId = generateNodeId();
                innerOldToNewNodeIdMap.set(innerSubN.id, newInnerSubNodeId);
                const innerNodeDef = nodeRegistryService.getNodeDefinition(innerSubN.operationType);
                const newInnerSubInputPorts = innerSubN.inputPorts.map(p => { const newId = generatePortId(newInnerSubNodeId, 'in', p.name); innerOldToNewPortIdMap.set(p.id, newId); return {...p, id: newId}; });
                const newInnerSubOutputPorts = innerSubN.outputPorts.map(p => { const newId = generatePortId(newInnerSubNodeId, 'out', p.name); innerOldToNewPortIdMap.set(p.id, newId); return {...p, id: newId}; });
                return {...innerSubN, id: newInnerSubNodeId, inputPorts: newInnerSubInputPorts, outputPorts: newInnerSubOutputPorts, config: {...(innerNodeDef?.defaultConfig || {}), ...innerSubN.config}};
            });
            reIdedInnerSubGraph.connections = molecularSubNode.subGraph.connections.map(innerConn => ({
                id: generateConnectionId(),
                fromNodeId: innerOldToNewNodeIdMap.get(innerConn.fromNodeId)!,
                fromPortId: innerOldToNewPortIdMap.get(innerConn.fromPortId)!,
                toNodeId: innerOldToNewNodeIdMap.get(innerConn.toNodeId)!,
                toPortId: innerOldToNewPortIdMap.get(innerConn.toPortId)!,
                reroutePoints: innerConn.reroutePoints ? JSON.parse(JSON.stringify(innerConn.reroutePoints)) : undefined
            }));
            return { ...subNode, id: newSubNodeId, inputPorts: newSubInputPorts, outputPorts: newSubOutputPorts, subGraph: reIdedInnerSubGraph, config: {...(nodeDef?.defaultConfig || {}), ...subNode.config}};
        }
        return { ...subNode, id: newSubNodeId, inputPorts: newSubInputPorts, outputPorts: newSubOutputPorts, config: {...(nodeDef?.defaultConfig || {}), ...subNode.config}};
    });

    const newSubGraphConnections: Connection[] = blueprintNodeInstance.subGraph.connections.map(subConn => ({
        id: generateConnectionId(),
        fromNodeId: oldToNewSubNodeIdMap.get(subConn.fromNodeId)!,
        fromPortId: oldPortIdToNewPortIdMap.get(subConn.fromPortId)!,
        toNodeId: oldToNewSubNodeIdMap.get(subConn.toNodeId)!,
        toPortId: oldPortIdToNewPortIdMap.get(subConn.toPortId)!,
        reroutePoints: subConn.reroutePoints ? JSON.parse(JSON.stringify(subConn.reroutePoints)) : undefined
    }));
    
    const blueprintDef = nodeRegistryService.getNodeDefinition(blueprintNodeInstance.operationType);

    let instantiatedNode: MolecularNode = {
        ...blueprintNodeInstance,
        id: newNodeId,
        name: newNodeName,
        position: defaultPosition,
        inputPorts: [], 
        outputPorts: [],
        config: {...(blueprintDef?.defaultConfig || {}), ...blueprintNodeInstance.config},
        subGraph: { nodes: newSubGraphNodes, connections: newSubGraphConnections },
    };

    instantiatedNode = regenerateMolecularNodePorts(instantiatedNode);

    setNodesInternal(prev => [...prev, instantiatedNode]);
    return instantiatedNode;
  }, [nodes, currentGraphId, regenerateMolecularNodePorts]);

  const updateNodesInCurrentScope = useCallback((updatedScopeNodes: AnyNode[], currentScopeConnectionsParam?: Connection[]) => {
    const connectionsToUse = currentScopeConnectionsParam || currentConnections;
    let finalProcessedNodes = updatedScopeNodes.map(node => {
        let updatedNode = node;
        const dynamicUnion = manageUnionNodePorts(node, connectionsToUse); 
        if (dynamicUnion) updatedNode = dynamicUnion;

        const dynamicConstruct = manageConstructObjectNodePorts(updatedNode, connectionsToUse); 
        if (dynamicConstruct) updatedNode = dynamicConstruct;
        
        return updatedNode;
    });
    
    if (currentParentNodeId) {
        setNodesInternal(prevRootNodes => prevRootNodes.map(n => {
            if (n.id === currentParentNodeId && n.type === 'Molecular') {
                const molecularN = n as MolecularNode;
                return { ...molecularN, subGraph: { ...molecularN.subGraph, nodes: finalProcessedNodes } };
            }
            return n;
        }).map(n => n.type === 'Molecular' ? regenerateMolecularNodePorts(n as MolecularNode) : n));
    } else {
        setNodesInternal(finalProcessedNodes.map(n => n.type === 'Molecular' ? regenerateMolecularNodePorts(n as MolecularNode) : n));
    }
   }, [currentParentNodeId, currentConnections, manageUnionNodePorts, manageConstructObjectNodePorts, regenerateMolecularNodePorts]);

  const updateConnectionsInCurrentScope = useCallback((
    newConnections: Connection[] // Changed from updater function
  ) => {
    const { parentNodeId: CPParentId } = getCurrentGraphData();
    // newConnections is the complete new state of connections for the current scope

    if (CPParentId) {
        setNodesInternal(prevRootNodes => prevRootNodes.map(n => {
            if (n.id === CPParentId && n.type === 'Molecular') {
                const molecularN = n as MolecularNode;
                // Update sub-graph nodes based on newConnections for dynamic port management
                const updatedSubGraphNodes = molecularN.subGraph.nodes.map(subNode => {
                    let tempNode = subNode;
                    const dynamicUnion = manageUnionNodePorts(subNode, newConnections); // Use newConnections
                    if (dynamicUnion) tempNode = dynamicUnion;
                    const dynamicConstruct = manageConstructObjectNodePorts(tempNode, newConnections); // Use newConnections
                    if (dynamicConstruct) tempNode = dynamicConstruct;
                    return tempNode;
                });
                let updatedParentNode = { ...molecularN, subGraph: { nodes: updatedSubGraphNodes, connections: newConnections } };
                // Port regeneration for molecular nodes (like INPUT_GRAPH/OUTPUT_GRAPH) should happen when those specific nodes are changed,
                // not generically on every connection update unless it directly impacts molecular port definitions.
                // The regenerateMolecularNodePorts function is usually called when Input/Output graph nodes are added/removed/config changed.
                // If dynamic port changes on UNION/CONSTRUCT_OBJECT inside a subgraph should trigger parent regen, that's more complex.
                // For now, assuming regen is handled at higher levels when structural interface nodes change.
                return updatedParentNode;
            }
            return n;
        }));
    } else { // Root graph
        setConnectionsInternal(newConnections); // Set connections for the root graph
        // Update root nodes based on newConnections for dynamic port management
        setNodesInternal(prevRootNodes => {
            return prevRootNodes.map(node => {
                let tempNode = node;
                const dynamicUnion = manageUnionNodePorts(node, newConnections); // Use newConnections
                if (dynamicUnion) tempNode = dynamicUnion;
                const dynamicConstruct = manageConstructObjectNodePorts(tempNode, newConnections); // Use newConnections
                if (dynamicConstruct) tempNode = dynamicConstruct;
                return tempNode;
            });
        });
    }
  }, [getCurrentGraphData, manageUnionNodePorts, manageConstructObjectNodePorts]);


  const navigateToNodeScope = useCallback((nodeId: NodeId, nodeName: string, currentScopeNodesForEntry?: AnyNode[]) => {
    const nodesToSearch = currentScopeNodesForEntry || (currentGraphId === 'root' ? nodes : currentNodes);
    const nodeToEnter = nodesToSearch.find(n => n.id === nodeId && n.type === 'Molecular') as MolecularNode | undefined;

    if (nodeToEnter && nodeToEnter.subGraph.nodes.length === 0) {
        let nodesToAdd: AnyNode[] = [];
        let needsPortRegen = false;
        const inputGraphDef = nodeRegistryService.getNodeDefinition(OperationTypeEnum.INPUT_GRAPH);
        const outputGraphDef = nodeRegistryService.getNodeDefinition(OperationTypeEnum.OUTPUT_GRAPH);
        const loopItemDef = nodeRegistryService.getNodeDefinition(OperationTypeEnum.LOOP_ITEM);
        const iterationResultDef = nodeRegistryService.getNodeDefinition(OperationTypeEnum.ITERATION_RESULT);

        if (nodeToEnter.operationType === OperationTypeEnum.MOLECULAR) {
            if (inputGraphDef) nodesToAdd.push(createAtomicNode({ name: 'Input 1', operationType: OperationTypeEnum.INPUT_GRAPH, position: { x: 50, y: 100 }, config: { externalPortName: 'Input 1', externalPortCategory: LogicalCategoryEnum.ANY, ...(inputGraphDef.defaultConfig || {}) } }));
            if (outputGraphDef) nodesToAdd.push(createAtomicNode({ name: 'Output 1', operationType: OperationTypeEnum.OUTPUT_GRAPH, position: { x: 400, y: 100 }, config: { externalPortName: 'Output 1', externalPortCategory: LogicalCategoryEnum.ANY, ...(outputGraphDef.defaultConfig || {}) } }));
            needsPortRegen = true;
        } else if (nodeToEnter.operationType === OperationTypeEnum.ITERATE) {
            if (loopItemDef) nodesToAdd.push(createAtomicNode({ name: 'Loop Item', operationType: OperationTypeEnum.LOOP_ITEM, position: { x: 50, y: 100 }, config: {...(loopItemDef.defaultConfig || {})} }));
            if (iterationResultDef) nodesToAdd.push(createAtomicNode({ name: 'Iteration Result', operationType: OperationTypeEnum.ITERATION_RESULT, position: { x: 400, y: 100 }, config: {...(iterationResultDef.defaultConfig || {})} }));
        }

        if (nodesToAdd.length > 0) {
            setNodesInternal(prevGlobalNodes => prevGlobalNodes.map(globalNode => {
                if (globalNode.id === nodeId) {
                    let updatedNode = {
                        ...(globalNode as MolecularNode),
                        subGraph: { ...(globalNode as MolecularNode).subGraph, nodes: nodesToAdd }
                    };
                    if (needsPortRegen) {
                        updatedNode = regenerateMolecularNodePorts(updatedNode);
                    }
                    return updatedNode;
                }
                return globalNode;
            }));
        }
    }
    setCurrentGraphIdInternal(nodeId);
    setScopeStackInternal(prev => [...prev, {id: nodeId, name: nodeName}]);
  }, [nodes, currentNodes, currentGraphId, regenerateMolecularNodePorts]);

  const navigateToStackIndex = useCallback((targetScopeId: NodeId | 'root', indexInStack: number) => {
    setCurrentGraphIdInternal(targetScopeId);
    setScopeStackInternal(prev => prev.slice(0, indexInStack + 1));
  }, []);

  const removeNode = useCallback((nodeIdToRemove: NodeId) => {
    const { currentNodes: CPNodes, currentConnections: CPConnections, parentNodeId: CPParentId } = getCurrentGraphData();
    const nodeToRemove = CPNodes.find(n => n.id === nodeIdToRemove);

    if (nodeToRemove) {
      const remainingNodes = CPNodes.filter(n => n.id !== nodeIdToRemove);
      const remainingConnections = CPConnections.filter(conn => conn.fromNodeId !== nodeIdToRemove && conn.toNodeId !== nodeIdToRemove);

      if (CPParentId) {
          setNodesInternal(prevRootNodes => prevRootNodes.map(n => {
              if (n.id === CPParentId && n.type === 'Molecular') {
                  let updatedMolNode = { ...(n as MolecularNode), subGraph: { nodes: remainingNodes, connections: remainingConnections }};
                  if (nodeToRemove.operationType === OperationTypeEnum.INPUT_GRAPH || nodeToRemove.operationType === OperationTypeEnum.OUTPUT_GRAPH) {
                      updatedMolNode = regenerateMolecularNodePorts(updatedMolNode);
                  }
                  return updatedMolNode;
              }
              return n;
          }));
      } else {
          setNodesInternal(remainingNodes);
          setConnectionsInternal(remainingConnections);
      }
    }
  }, [getCurrentGraphData, regenerateMolecularNodePorts]);

  const updateNodeConfig = useCallback((nodeId: string, newConfigPart: Partial<NodeConfig>) => {
    const { currentNodes: CPNodes, parentNodeId: CPParentId } = getCurrentGraphData();
    const nodeIndex = CPNodes.findIndex(n => n.id === nodeId);
    if (nodeIndex === -1) return;

    const nodeDef = nodeRegistryService.getNodeDefinition(CPNodes[nodeIndex].operationType);
    const initialConfigForType = nodeDef?.defaultConfig || {};
    
    let updatedNode = { ...CPNodes[nodeIndex], config: { ...initialConfigForType, ...(CPNodes[nodeIndex].config || {}), ...newConfigPart } };
    
    let newRootNodesList = nodes;
    if (CPParentId) {
        newRootNodesList = nodes.map(n => {
            if (n.id === CPParentId && n.type === 'Molecular') {
                const molecularN = n as MolecularNode;
                const subNodes = molecularN.subGraph.nodes.map(sn => sn.id === nodeId ? updatedNode : sn);
                if (updatedNode.operationType === OperationTypeEnum.INPUT_GRAPH || updatedNode.operationType === OperationTypeEnum.OUTPUT_GRAPH) {
                    return regenerateMolecularNodePorts({ ...molecularN, subGraph: { ...molecularN.subGraph, nodes: subNodes }});
                }
                return { ...molecularN, subGraph: { ...molecularN.subGraph, nodes: subNodes }};
            }
            return n;
        });
    } else {
        newRootNodesList = nodes.map(n => (n.id === nodeId ? updatedNode : n));
    }
    setNodesInternal(newRootNodesList);
  }, [nodes, getCurrentGraphData, regenerateMolecularNodePorts]);

  const updateNodeName = useCallback((nodeId: string, newName: string) => {
    const { currentNodes: CPNodes, parentNodeId: CPParentId } = getCurrentGraphData();
    
    let newRootNodesList = nodes;
    if (CPParentId) {
        newRootNodesList = nodes.map(n => {
            if (n.id === CPParentId && n.type === 'Molecular') {
                const molecularN = n as MolecularNode;
                const subNodes = molecularN.subGraph.nodes.map(sn => sn.id === nodeId ? {...sn, name: newName} : sn);
                return { ...molecularN, subGraph: { ...molecularN.subGraph, nodes: subNodes }};
            }
            return n;
        });
    } else {
        newRootNodesList = nodes.map(n => (n.id === nodeId ? {...n, name: newName} : n));
    }
    setNodesInternal(newRootNodesList);

    if(scopeStack.some(s => s.id === nodeId)) {
        setScopeStackInternal(prev => prev.map(s => s.id === nodeId ? {...s, name: newName} : s));
    }
  }, [nodes, scopeStack, getCurrentGraphData]);

  const updateNodeSize: NodeResizeEndHandler = useCallback((nodeId, dimensions) => {
    const { currentNodes: CPNodes, parentNodeId: CPParentId } = getCurrentGraphData();
    const nodeIndex = CPNodes.findIndex(n => n.id === nodeId);
    if (nodeIndex === -1) return;

    const updatedNode = {
        ...CPNodes[nodeIndex],
        config: {
            ...(CPNodes[nodeIndex].config || {}),
            frameWidth: dimensions.width,
            frameHeight: dimensions.height,
        }
    };
    
    let newRootNodesList = nodes;
    if (CPParentId) {
        newRootNodesList = nodes.map(n => {
            if (n.id === CPParentId && n.type === 'Molecular') {
                const molecularN = n as MolecularNode;
                const subNodes = molecularN.subGraph.nodes.map(sn => sn.id === nodeId ? updatedNode : sn);
                return { ...molecularN, subGraph: { ...molecularN.subGraph, nodes: subNodes }};
            }
            return n;
        });
    } else {
        newRootNodesList = nodes.map(n => (n.id === nodeId ? updatedNode : n));
    }
    setNodesInternal(newRootNodesList);
  }, [nodes, getCurrentGraphData]);


  return {
    nodes,
    connections,
    currentGraphId,
    scopeStack,
    currentNodes,
    currentConnections,
    currentParentNodeId,
    currentParentNodeType,
    setGraphStateForLoad,
    addNode,
    addBlueprint,
    updateNodesInCurrentScope,
    updateConnectionsInCurrentScope,
    navigateToNodeScope,
    navigateToStackIndex,
    removeNode,
    updateNodeConfig,
    updateNodeName,
    updateNodeSize,
    regenerateMolecularNodePorts, 
  };
};