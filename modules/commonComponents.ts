
import { MolecularNode, OperationTypeEnum, LogicalCategoryEnum, AnyNode, Connection, InputPort, OutputPort, PortTypeEnum, NodeId, Port, SwitchCaseConfig, LogicalModule, ComponentBlueprint } from '../types';
import { createAtomicNode, createMolecularNode, generateNodeId, generatePortId, generateConnectionId, generateSwitchCaseId, createIterateNode } from '../services/nodeFactory';
import * as Icons from '../components/Icons'; // Import all icons

// Helper function to find a port or throw an error, adapted for blueprint creation context
function findPortOrFail(ports: Port[], portName: string, nodeName: string, portType: 'input' | 'output'): Port {
    const port = ports.find(p => p.name === portName);
    if (!port) {
        const availablePortsMessage = ports.map(p => `${p.name} (${p.category}, ${p.portType})`).join(', ') || 'None';
        throw new Error(`Blueprint Error: Required ${portType} port '${portName}' not found on node '${nodeName}'. Available ${portType} ports: [${availablePortsMessage}].`);
    }
    return port;
}

// --- Clamp Number Logic (Internal Helper for Blueprints) ---
function createInternalClampLogic(
    molecularNodeId: NodeId,
    valueNodeId: NodeId, valuePortId: string,
    minNodeId: NodeId, minPortId: string,
    maxNodeId: NodeId, maxPortId: string,
    startX: number, startY: number
): { nodes: AnyNode[], connections: Connection[], finalOutputNodeId: NodeId, finalOutputPortId: string } {
    const subNodes: AnyNode[] = [];
    const subConnections: Connection[] = [];
    let currentX = startX;

    const lt_val_min = createAtomicNode({
        id: generateNodeId(), name: 'Value < Min?', operationType: OperationTypeEnum.LESS_THAN, position: { x: currentX, y: startY }
    });
    subNodes.push(lt_val_min);
    subConnections.push({ id: generateConnectionId(), fromNodeId: valueNodeId, fromPortId: valuePortId, toNodeId: lt_val_min.id, toPortId: findPortOrFail(lt_val_min.inputPorts, 'Operand A', lt_val_min.name, 'input').id });
    subConnections.push({ id: generateConnectionId(), fromNodeId: minNodeId, fromPortId: minPortId, toNodeId: lt_val_min.id, toPortId: findPortOrFail(lt_val_min.inputPorts, 'Operand B', lt_val_min.name, 'input').id });

    const union_val_min_ports: InputPort[] = [
        { id: generatePortId(molecularNodeId, 'in', 'uvm_item1_clamp_bp'), name: 'Item 1', category: LogicalCategoryEnum.ANY, portType: PortTypeEnum.DATA },
        { id: generatePortId(molecularNodeId, 'in', 'uvm_item2_clamp_bp'), name: 'Item 2', category: LogicalCategoryEnum.ANY, portType: PortTypeEnum.DATA }
    ];
    const union_val_min = createAtomicNode({
        id: generateNodeId(), name: 'UNION (Value, Min)', operationType: OperationTypeEnum.UNION, position: { x: currentX, y: startY + 70 },
        inputPorts: union_val_min_ports
    });
    subNodes.push(union_val_min);
    subConnections.push({ id: generateConnectionId(), fromNodeId: valueNodeId, fromPortId: valuePortId, toNodeId: union_val_min.id, toPortId: union_val_min_ports[0].id });
    subConnections.push({ id: generateConnectionId(), fromNodeId: minNodeId, fromPortId: minPortId, toNodeId: union_val_min.id, toPortId: union_val_min_ports[1].id });
    
    currentX += 200;
    const switch_idx_for_max = createAtomicNode({
        id: generateNodeId(), name: 'Switch Idx for Max(V,M)', operationType: OperationTypeEnum.SWITCH, position: { x: currentX, y: startY },
        config: { switchCases: [{ id: generateSwitchCaseId(), caseValue: true, outputValue: 1 }], switchDefaultValue: 0 }
    });
    subNodes.push(switch_idx_for_max);
    subConnections.push({ id: generateConnectionId(), fromNodeId: lt_val_min.id, fromPortId: lt_val_min.outputPorts[0].id, toNodeId: switch_idx_for_max.id, toPortId: findPortOrFail(switch_idx_for_max.inputPorts, 'Value', switch_idx_for_max.name, 'input').id });

    const temp_max_val_node = createAtomicNode({
        id: generateNodeId(), name: 'Get Max(Value,Min)', operationType: OperationTypeEnum.GET_ITEM_AT_INDEX, position: { x: currentX, y: startY + 70 }
    });
    subNodes.push(temp_max_val_node);
    subConnections.push({ id: generateConnectionId(), fromNodeId: union_val_min.id, fromPortId: union_val_min.outputPorts[0].id, toNodeId: temp_max_val_node.id, toPortId: findPortOrFail(temp_max_val_node.inputPorts, 'Collection', temp_max_val_node.name, 'input').id });
    subConnections.push({ id: generateConnectionId(), fromNodeId: switch_idx_for_max.id, fromPortId: switch_idx_for_max.outputPorts[0].id, toNodeId: temp_max_val_node.id, toPortId: findPortOrFail(temp_max_val_node.inputPorts, 'Index', temp_max_val_node.name, 'input').id });

    currentX += 200;
    const gt_temp_max_max = createAtomicNode({
        id: generateNodeId(), name: 'Max(V,M) > Max?', operationType: OperationTypeEnum.GREATER_THAN, position: { x: currentX, y: startY + 35 }
    });
    subNodes.push(gt_temp_max_max);
    subConnections.push({ id: generateConnectionId(), fromNodeId: temp_max_val_node.id, fromPortId: temp_max_val_node.outputPorts[0].id, toNodeId: gt_temp_max_max.id, toPortId: findPortOrFail(gt_temp_max_max.inputPorts, 'Operand A', gt_temp_max_max.name, 'input').id });
    subConnections.push({ id: generateConnectionId(), fromNodeId: maxNodeId, fromPortId: maxPortId, toNodeId: gt_temp_max_max.id, toPortId: findPortOrFail(gt_temp_max_max.inputPorts, 'Operand B', gt_temp_max_max.name, 'input').id });

    const union_temp_max_max_ports: InputPort[] = [
        { id: generatePortId(molecularNodeId, 'in', 'utmm_item1_clamp_bp'), name: 'Item 1', category: LogicalCategoryEnum.ANY, portType: PortTypeEnum.DATA },
        { id: generatePortId(molecularNodeId, 'in', 'utmm_item2_clamp_bp'), name: 'Item 2', category: LogicalCategoryEnum.ANY, portType: PortTypeEnum.DATA }
    ];
    const union_temp_max_max = createAtomicNode({
        id: generateNodeId(), name: 'UNION (Max(V,M), Max)', operationType: OperationTypeEnum.UNION, position: { x: currentX, y: startY + 105 },
        inputPorts: union_temp_max_max_ports
    });
    subNodes.push(union_temp_max_max);
    subConnections.push({ id: generateConnectionId(), fromNodeId: temp_max_val_node.id, fromPortId: temp_max_val_node.outputPorts[0].id, toNodeId: union_temp_max_max.id, toPortId: union_temp_max_max_ports[0].id });
    subConnections.push({ id: generateConnectionId(), fromNodeId: maxNodeId, fromPortId: maxPortId, toNodeId: union_temp_max_max.id, toPortId: union_temp_max_max_ports[1].id });
    
    currentX += 200;
    const switch_idx_for_min = createAtomicNode({
        id: generateNodeId(), name: 'Switch Idx for Min(Res,Max)', operationType: OperationTypeEnum.SWITCH, position: { x: currentX, y: startY + 35 },
        config: { switchCases: [{ id: generateSwitchCaseId(), caseValue: true, outputValue: 1 }], switchDefaultValue: 0 }
    });
    subNodes.push(switch_idx_for_min);
    subConnections.push({ id: generateConnectionId(), fromNodeId: gt_temp_max_max.id, fromPortId: gt_temp_max_max.outputPorts[0].id, toNodeId: switch_idx_for_min.id, toPortId: findPortOrFail(switch_idx_for_min.inputPorts, 'Value', switch_idx_for_min.name, 'input').id });

    const clamped_val_node = createAtomicNode({
        id: generateNodeId(), name: 'Get Clamped Value Final', operationType: OperationTypeEnum.GET_ITEM_AT_INDEX, position: { x: currentX, y: startY + 105 }
    });
    subNodes.push(clamped_val_node);
    subConnections.push({ id: generateConnectionId(), fromNodeId: union_temp_max_max.id, fromPortId: union_temp_max_max.outputPorts[0].id, toNodeId: clamped_val_node.id, toPortId: findPortOrFail(clamped_val_node.inputPorts, 'Collection', clamped_val_node.name, 'input').id });
    subConnections.push({ id: generateConnectionId(), fromNodeId: switch_idx_for_min.id, fromPortId: switch_idx_for_min.outputPorts[0].id, toNodeId: clamped_val_node.id, toPortId: findPortOrFail(clamped_val_node.inputPorts, 'Index', clamped_val_node.name, 'input').id });

    return { nodes: subNodes, connections: subConnections, finalOutputNodeId: clamped_val_node.id, finalOutputPortId: clamped_val_node.outputPorts[0].id };
}

// --- Component Blueprint Definitions ---
// Each creator function now returns a MolecularNode
function createClampNumberBlueprint(): MolecularNode {
    const molecularNodeId = generateNodeId();
    const subGraphNodes: AnyNode[] = [];
    const subGraphConnections: Connection[] = [];
    let currentX = 50; let yInput = 50;

    const valueInputSource = createAtomicNode({ id: generateNodeId(), name: 'Value In', operationType: OperationTypeEnum.INPUT_GRAPH, position: { x: currentX, y: yInput }, config: { externalPortName: 'Value', externalPortCategory: LogicalCategoryEnum.NUMBER } });
    subGraphNodes.push(valueInputSource);
    const minInputSource = createAtomicNode({ id: generateNodeId(), name: 'Min In', operationType: OperationTypeEnum.INPUT_GRAPH, position: { x: currentX, y: yInput + 100 }, config: { externalPortName: 'Min', externalPortCategory: LogicalCategoryEnum.NUMBER } });
    subGraphNodes.push(minInputSource);
    const maxInputSource = createAtomicNode({ id: generateNodeId(), name: 'Max In', operationType: OperationTypeEnum.INPUT_GRAPH, position: { x: currentX, y: yInput + 200 }, config: { externalPortName: 'Max', externalPortCategory: LogicalCategoryEnum.NUMBER } });
    subGraphNodes.push(maxInputSource);

    const { nodes: clampNodes, connections: clampConnections, finalOutputNodeId, finalOutputPortId } = createInternalClampLogic( molecularNodeId, valueInputSource.id, valueInputSource.outputPorts[0].id, minInputSource.id, minInputSource.outputPorts[0].id, maxInputSource.id, maxInputSource.outputPorts[0].id, currentX + 200, yInput + 50 );
    subGraphNodes.push(...clampNodes);
    subGraphConnections.push(...clampConnections);

    const finalOutputXEstimate = currentX + 200 + (clampNodes.reduce((mX, n) => Math.max(mX, n.position.x + 200), 0) - (currentX + 200));
    const outputNode = createAtomicNode({ id: generateNodeId(), name: 'Clamped Value Out', operationType: OperationTypeEnum.OUTPUT_GRAPH, position: { x: finalOutputXEstimate, y: yInput + 100 + 50 }, config: { externalPortName: 'Clamped Value', externalPortCategory: LogicalCategoryEnum.NUMBER } });
    subGraphNodes.push(outputNode);
    subGraphConnections.push({ id: generateConnectionId(), fromNodeId: finalOutputNodeId, fromPortId: finalOutputPortId, toNodeId: outputNode.id, toPortId: outputNode.inputPorts[0].id });

    const molecularNode = createMolecularNode({ id: molecularNodeId, name: 'Clamp Number', operationType: OperationTypeEnum.MOLECULAR, position: { x: 0, y: 0 }, subGraph: { nodes: subGraphNodes, connections: subGraphConnections } });
    molecularNode.inputPorts = [ { id: generatePortId(molecularNodeId, 'in', 'Value'), name: 'Value', category: LogicalCategoryEnum.NUMBER, portType: PortTypeEnum.DATA, description: "The number to be clamped." }, { id: generatePortId(molecularNodeId, 'in', 'Min'), name: 'Min', category: LogicalCategoryEnum.NUMBER, portType: PortTypeEnum.DATA, description: "The minimum allowed value." }, { id: generatePortId(molecularNodeId, 'in', 'Max'), name: 'Max', category: LogicalCategoryEnum.NUMBER, portType: PortTypeEnum.DATA, description: "The maximum allowed value." }, ];
    molecularNode.outputPorts = [ { id: generatePortId(molecularNodeId, 'out', 'Clamped Value'), name: 'Clamped Value', category: LogicalCategoryEnum.NUMBER, portType: PortTypeEnum.DATA, description: "Value, clamped between Min and Max." } ];
    molecularNode.description = "Clamps a 'Value' to be within 'Min' and 'Max' inclusive. Result is Min if Value < Min, Max if Value > Max, else Value.";
    return molecularNode;
}
function createSafeGetPropertyBlueprint(): MolecularNode {
    const molecularNodeId = generateNodeId();
    const subGraphNodes: AnyNode[] = []; const subGraphConnections: Connection[] = [];
    const sourceObjectInput = createAtomicNode({ id: generateNodeId(), name: 'SG Obj In', operationType: OperationTypeEnum.INPUT_GRAPH, position: { x: 50, y: 50 }, config: { externalPortName: 'Source Object', externalPortCategory: LogicalCategoryEnum.OBJECT } }); subGraphNodes.push(sourceObjectInput);
    const pathInput = createAtomicNode({ id: generateNodeId(), name: 'SG Path In', operationType: OperationTypeEnum.INPUT_GRAPH, position: { x: 50, y: 120 }, config: { externalPortName: 'Path', externalPortCategory: LogicalCategoryEnum.STRING } }); subGraphNodes.push(pathInput);
    const splitPathNode = createAtomicNode({ name: 'Split Path by .', operationType: OperationTypeEnum.SPLIT_STRING, position: { x: 250, y: 120 }, config: {splitDelimiter: '.'}}); subGraphNodes.push(splitPathNode);
    subGraphConnections.push({ id: generateConnectionId(), fromNodeId: pathInput.id, fromPortId: pathInput.outputPorts[0].id, toNodeId: splitPathNode.id, toPortId: findPortOrFail(splitPathNode.inputPorts, 'Source', splitPathNode.name, 'input').id });
    const getKey1Node = createAtomicNode({ name: 'Get Key1 from Path', operationType: OperationTypeEnum.GET_ITEM_AT_INDEX, position: { x: 450, y: 100 }, config: {inputPortOverrides: { [findPortOrFail(createAtomicNode({name: 'temp', operationType: OperationTypeEnum.GET_ITEM_AT_INDEX, position: {x:0, y:0}}).inputPorts, 'Index', 'temp', 'input').id]: 0 }} }); subGraphNodes.push(getKey1Node);
    subGraphConnections.push({ id: generateConnectionId(), fromNodeId: splitPathNode.id, fromPortId: splitPathNode.outputPorts[0].id, toNodeId: getKey1Node.id, toPortId: findPortOrFail(getKey1Node.inputPorts, 'Collection', getKey1Node.name, 'input').id });
    const getProp1Node = createAtomicNode({ name: 'Get Property for Key1', operationType: OperationTypeEnum.GET_PROPERTY, position: { x: 650, y: 50 } }); subGraphNodes.push(getProp1Node);
    subGraphConnections.push({ id: generateConnectionId(), fromNodeId: sourceObjectInput.id, fromPortId: sourceObjectInput.outputPorts[0].id, toNodeId: getProp1Node.id, toPortId: findPortOrFail(getProp1Node.inputPorts, 'Source', getProp1Node.name, 'input').id });
    subGraphConnections.push({ id: generateConnectionId(), fromNodeId: getKey1Node.id, fromPortId: getKey1Node.outputPorts[0].id, toNodeId: getProp1Node.id, toPortId: findPortOrFail(getProp1Node.inputPorts, 'Key', getProp1Node.name, 'input').id });
    const getKey2Node = createAtomicNode({ name: 'Get Key2 from Path', operationType: OperationTypeEnum.GET_ITEM_AT_INDEX, position: { x: 450, y: 170 }, config: {inputPortOverrides: { [findPortOrFail(createAtomicNode({name: 'temp2', operationType: OperationTypeEnum.GET_ITEM_AT_INDEX, position: {x:0, y:0}}).inputPorts, 'Index', 'temp2', 'input').id]: 1 }} }); subGraphNodes.push(getKey2Node);
    subGraphConnections.push({ id: generateConnectionId(), fromNodeId: splitPathNode.id, fromPortId: splitPathNode.outputPorts[0].id, toNodeId: getKey2Node.id, toPortId: findPortOrFail(getKey2Node.inputPorts, 'Collection', getKey2Node.name, 'input').id });
    const getProp2Node = createAtomicNode({ name: 'Get Property for Key2', operationType: OperationTypeEnum.GET_PROPERTY, position: { x: 850, y: 120 } }); subGraphNodes.push(getProp2Node);
    subGraphConnections.push({ id: generateConnectionId(), fromNodeId: getProp1Node.id, fromPortId: getProp1Node.outputPorts[0].id, toNodeId: getProp2Node.id, toPortId: findPortOrFail(getProp2Node.inputPorts, 'Source', getProp2Node.name, 'input').id });
    subGraphConnections.push({ id: generateConnectionId(), fromNodeId: getKey2Node.id, fromPortId: getKey2Node.outputPorts[0].id, toNodeId: getProp2Node.id, toPortId: findPortOrFail(getProp2Node.inputPorts, 'Key', getProp2Node.name, 'input').id });
    const outputValueNode = createAtomicNode({ id: generateNodeId(), name: 'SG Value Out', operationType: OperationTypeEnum.OUTPUT_GRAPH, position: { x: 1050, y: 120 }, config: { externalPortName: 'Value', externalPortCategory: LogicalCategoryEnum.ANY } }); subGraphNodes.push(outputValueNode);
    subGraphConnections.push({ id: generateConnectionId(), fromNodeId: getProp2Node.id, fromPortId: getProp2Node.outputPorts[0].id, toNodeId: outputValueNode.id, toPortId: outputValueNode.inputPorts[0].id });
    const molecularNode = createMolecularNode({ id: molecularNodeId, name: 'Safe Get Property (L2)', operationType: OperationTypeEnum.MOLECULAR, position: { x: 0, y: 0 }, subGraph: { nodes: subGraphNodes, connections: subGraphConnections } });
    molecularNode.inputPorts = [ { id: generatePortId(molecularNodeId, 'in', 'Source Object'), name: 'Source Object', category: LogicalCategoryEnum.OBJECT, portType: PortTypeEnum.DATA }, { id: generatePortId(molecularNodeId, 'in', 'Path'), name: 'Path', category: LogicalCategoryEnum.STRING, portType: PortTypeEnum.DATA }, ];
    molecularNode.outputPorts = [ { id: generatePortId(molecularNodeId, 'out', 'Value'), name: 'Value', category: LogicalCategoryEnum.ANY, portType: PortTypeEnum.DATA } ];
    molecularNode.description = "Safely gets a property from an object using a dot-separated path (e.g., 'data.user', max 2 levels). Returns undefined if path is invalid or key not found.";
    return molecularNode;
}
function createValidateEmailBlueprint(): MolecularNode {
    const molecularNodeId = generateNodeId();
    const subGraphNodes: AnyNode[] = []; const subGraphConnections: Connection[] = [];
    let xStart = 50; let yPos = 50;
    const emailInput = createAtomicNode({ id: generateNodeId(), name: 'SG Email In', operationType: OperationTypeEnum.INPUT_GRAPH, position: { x: xStart, y: yPos }, config: { externalPortName: 'Email String', externalPortCategory: LogicalCategoryEnum.STRING } }); subGraphNodes.push(emailInput);
    yPos += 70; const splitAtNode = createAtomicNode({ name: 'Split by @', operationType: OperationTypeEnum.SPLIT_STRING, position: { x: xStart + 150, y: yPos }, config: {splitDelimiter: '@'} }); subGraphNodes.push(splitAtNode);
    subGraphConnections.push({id:generateConnectionId(), fromNodeId: emailInput.id, fromPortId: emailInput.outputPorts[0].id, toNodeId: splitAtNode.id, toPortId: findPortOrFail(splitAtNode.inputPorts, 'Source', splitAtNode.name, 'input').id});
    yPos += 70; const atPartsLengthNode = createAtomicNode({ name: 'Length of @ Split', operationType: OperationTypeEnum.COLLECTION_LENGTH, position: {x: xStart + 300, y: yPos}}); subGraphNodes.push(atPartsLengthNode);
    subGraphConnections.push({id:generateConnectionId(), fromNodeId: splitAtNode.id, fromPortId: splitAtNode.outputPorts[0].id, toNodeId: atPartsLengthNode.id, toPortId: atPartsLengthNode.inputPorts[0].id});
    yPos += 70; const hasOneAtNode = createAtomicNode({ name: 'Has Exactly One @', operationType: OperationTypeEnum.EQUALS, position: {x: xStart + 450, y: yPos}, config: {inputPortOverrides: { [findPortOrFail(createAtomicNode({name: 'temp', operationType: OperationTypeEnum.EQUALS, position: {x:0, y:0}}).inputPorts, 'Value 2', 'temp', 'input').id]: 2 }} }); subGraphNodes.push(hasOneAtNode);
    subGraphConnections.push({id:generateConnectionId(), fromNodeId: atPartsLengthNode.id, fromPortId: atPartsLengthNode.outputPorts[0].id, toNodeId: hasOneAtNode.id, toPortId: findPortOrFail(hasOneAtNode.inputPorts, 'Value 1', hasOneAtNode.name, 'input').id});
    yPos = 50; const localPartNode = createAtomicNode({name: 'Get Local Part', operationType: OperationTypeEnum.GET_ITEM_AT_INDEX, position: {x: xStart + 300, y: yPos + 140 }, config: {inputPortOverrides: { [findPortOrFail(createAtomicNode({name: 'tempL', operationType: OperationTypeEnum.GET_ITEM_AT_INDEX, position: {x:0, y:0}}).inputPorts, 'Index', 'tempL', 'input').id]: 0}} }); subGraphNodes.push(localPartNode);
    subGraphConnections.push({id:generateConnectionId(),fromNodeId:splitAtNode.id, fromPortId: splitAtNode.outputPorts[0].id, toNodeId: localPartNode.id, toPortId: findPortOrFail(localPartNode.inputPorts, 'Collection', localPartNode.name, 'input').id});
    const domainPartNode = createAtomicNode({name: 'Get Domain Part', operationType: OperationTypeEnum.GET_ITEM_AT_INDEX, position: {x: xStart + 300, y: yPos + 210 }, config: {inputPortOverrides: { [findPortOrFail(createAtomicNode({name: 'tempD', operationType: OperationTypeEnum.GET_ITEM_AT_INDEX, position: {x:0, y:0}}).inputPorts, 'Index', 'tempD', 'input').id]: 1}} }); subGraphNodes.push(domainPartNode);
    subGraphConnections.push({id:generateConnectionId(),fromNodeId:splitAtNode.id, fromPortId: splitAtNode.outputPorts[0].id, toNodeId: domainPartNode.id, toPortId: findPortOrFail(domainPartNode.inputPorts, 'Collection', domainPartNode.name, 'input').id});
    const localLengthNode = createAtomicNode({name: 'Local Part Length', operationType: OperationTypeEnum.STRING_LENGTH, position: {x: xStart + 450, y:yPos + 140}}); subGraphNodes.push(localLengthNode);
    subGraphConnections.push({id:generateConnectionId(),fromNodeId:localPartNode.id,fromPortId:localPartNode.outputPorts[0].id,toNodeId:localLengthNode.id,toPortId:localLengthNode.inputPorts[0].id});
    const isLocalNotEmptyNode = createAtomicNode({name:'Is Local NonEmpty',operationType:OperationTypeEnum.GREATER_THAN,position:{x:xStart+600, y:yPos+140}, config: {inputPortOverrides: { [findPortOrFail(createAtomicNode({name: 'tempLN', operationType: OperationTypeEnum.GREATER_THAN, position: {x:0, y:0}}).inputPorts, 'Operand B', 'tempLN', 'input').id]:0}} }); subGraphNodes.push(isLocalNotEmptyNode);
    subGraphConnections.push({id:generateConnectionId(),fromNodeId:localLengthNode.id, fromPortId:localLengthNode.outputPorts[0].id,toNodeId:isLocalNotEmptyNode.id,toPortId:findPortOrFail(isLocalNotEmptyNode.inputPorts, 'Operand A', isLocalNotEmptyNode.name, 'input').id});
    const domainLengthNode = createAtomicNode({name: 'Domain Part Length', operationType: OperationTypeEnum.STRING_LENGTH, position: {x: xStart + 450, y:yPos + 210}}); subGraphNodes.push(domainLengthNode);
    subGraphConnections.push({id:generateConnectionId(),fromNodeId:domainPartNode.id,fromPortId:domainPartNode.outputPorts[0].id,toNodeId:domainLengthNode.id,toPortId:domainLengthNode.inputPorts[0].id});
    const isDomainNotEmptyNode = createAtomicNode({name:'Is Domain NonEmpty',operationType:OperationTypeEnum.GREATER_THAN,position:{x:xStart+600, y:yPos+210}, config: {inputPortOverrides: { [findPortOrFail(createAtomicNode({name: 'tempDN', operationType: OperationTypeEnum.GREATER_THAN, position: {x:0, y:0}}).inputPorts, 'Operand B', 'tempDN', 'input').id]:0}} }); subGraphNodes.push(isDomainNotEmptyNode);
    subGraphConnections.push({id:generateConnectionId(),fromNodeId:domainLengthNode.id, fromPortId:domainLengthNode.outputPorts[0].id,toNodeId:isDomainNotEmptyNode.id,toPortId:findPortOrFail(isDomainNotEmptyNode.inputPorts, 'Operand A', isDomainNotEmptyNode.name, 'input').id});
    const splitDomainByDot = createAtomicNode({name:'Split Domain by .', operationType:OperationTypeEnum.SPLIT_STRING, position:{x:xStart+450, y:yPos+280}, config:{splitDelimiter:'.'}}); subGraphNodes.push(splitDomainByDot);
    subGraphConnections.push({id:generateConnectionId(), fromNodeId:domainPartNode.id, fromPortId:domainPartNode.outputPorts[0].id, toNodeId:splitDomainByDot.id, toPortId:findPortOrFail(splitDomainByDot.inputPorts, 'Source', splitDomainByDot.name, 'input').id});
    const domainDotPartsLength = createAtomicNode({name:'Domain Dot Parts Len', operationType:OperationTypeEnum.COLLECTION_LENGTH, position:{x:xStart+600, y:yPos+280}}); subGraphNodes.push(domainDotPartsLength);
    subGraphConnections.push({id:generateConnectionId(), fromNodeId:splitDomainByDot.id, fromPortId:splitDomainByDot.outputPorts[0].id, toNodeId:domainDotPartsLength.id, toPortId:domainDotPartsLength.inputPorts[0].id});
    const hasDotInDomain = createAtomicNode({name:'Has Dot in Domain', operationType:OperationTypeEnum.GREATER_THAN, position:{x:xStart+750, y:yPos+280}, config: {inputPortOverrides: { [findPortOrFail(createAtomicNode({name: 'tempHD', operationType: OperationTypeEnum.GREATER_THAN, position: {x:0, y:0}}).inputPorts, 'Operand B', 'tempHD', 'input').id]:1}} }); subGraphNodes.push(hasDotInDomain);
    subGraphConnections.push({id:generateConnectionId(), fromNodeId:domainDotPartsLength.id, fromPortId:domainDotPartsLength.outputPorts[0].id, toNodeId:hasDotInDomain.id, toPortId:findPortOrFail(hasDotInDomain.inputPorts, 'Operand A', hasDotInDomain.name, 'input').id});
    const and1Node = createAtomicNode({name:'AND At & Local', operationType:OperationTypeEnum.LOGICAL_AND, position:{x:xStart+750, y:yPos + 100}}); subGraphNodes.push(and1Node);
    subGraphConnections.push({id:generateConnectionId(), fromNodeId:hasOneAtNode.id, fromPortId:hasOneAtNode.outputPorts[0].id, toNodeId:and1Node.id, toPortId:and1Node.inputPorts[0].id});
    subGraphConnections.push({id:generateConnectionId(), fromNodeId:isLocalNotEmptyNode.id, fromPortId:isLocalNotEmptyNode.outputPorts[0].id, toNodeId:and1Node.id, toPortId:and1Node.inputPorts[1].id});
    const and2Node = createAtomicNode({name:'AND Domain & Dot', operationType:OperationTypeEnum.LOGICAL_AND, position:{x:xStart+900, y:yPos + 240}}); subGraphNodes.push(and2Node);
    subGraphConnections.push({id:generateConnectionId(), fromNodeId:isDomainNotEmptyNode.id, fromPortId:isDomainNotEmptyNode.outputPorts[0].id, toNodeId:and2Node.id, toPortId:and2Node.inputPorts[0].id});
    subGraphConnections.push({id:generateConnectionId(), fromNodeId:hasDotInDomain.id, fromPortId:hasDotInDomain.outputPorts[0].id, toNodeId:and2Node.id, toPortId:and2Node.inputPorts[1].id});
    const finalAndNode = createAtomicNode({name:'Final AND', operationType:OperationTypeEnum.LOGICAL_AND, position:{x:xStart+1050, y:yPos + 170}}); subGraphNodes.push(finalAndNode);
    subGraphConnections.push({id:generateConnectionId(), fromNodeId:and1Node.id, fromPortId:and1Node.outputPorts[0].id, toNodeId:finalAndNode.id, toPortId:finalAndNode.inputPorts[0].id});
    subGraphConnections.push({id:generateConnectionId(), fromNodeId:and2Node.id, fromPortId:and2Node.outputPorts[0].id, toNodeId:finalAndNode.id, toPortId:finalAndNode.inputPorts[1].id});
    const isValidOutput = createAtomicNode({ id: generateNodeId(), name: 'SG IsValid Out', operationType: OperationTypeEnum.OUTPUT_GRAPH, position: { x: xStart + 1200, y: yPos + 170 }, config: { externalPortName: 'Is Valid', externalPortCategory: LogicalCategoryEnum.BOOLEAN } }); subGraphNodes.push(isValidOutput);
    subGraphConnections.push({ id: generateConnectionId(), fromNodeId: finalAndNode.id, fromPortId: finalAndNode.outputPorts[0].id, toNodeId: isValidOutput.id, toPortId: isValidOutput.inputPorts[0].id });
    const molecularNode = createMolecularNode({ id: molecularNodeId, name: 'Validate Email (Enhanced Basic)', operationType: OperationTypeEnum.MOLECULAR, position: { x: 0, y: 0 }, subGraph: { nodes: subGraphNodes, connections: subGraphConnections } });
    molecularNode.inputPorts = [ { id: generatePortId(molecularNodeId, 'in', 'Email String'), name: 'Email String', category: LogicalCategoryEnum.STRING, portType: PortTypeEnum.DATA }];
    molecularNode.outputPorts = [ { id: generatePortId(molecularNodeId, 'out', 'Is Valid'), name: 'Is Valid', category: LogicalCategoryEnum.BOOLEAN, portType: PortTypeEnum.DATA }];
    molecularNode.description = "Enhanced basic email validation: checks for one '@', non-empty local/domain parts, and at least one '.' in domain. Not a full regex validation.";
    return molecularNode;
}
function createMapRangeBlueprint(): MolecularNode {
    const molecularNodeId = generateNodeId(); const subGraphNodes: AnyNode[] = []; const subGraphConnections: Connection[] = []; let x = 50, y = 50;
    const valueIn = createAtomicNode({ id: generateNodeId(), name: 'SG Value In', operationType: OperationTypeEnum.INPUT_GRAPH, position: { x, y }, config: { externalPortName: 'Value', externalPortCategory: LogicalCategoryEnum.NUMBER } }); subGraphNodes.push(valueIn); y += 70;
    const fromMinIn = createAtomicNode({ id: generateNodeId(), name: 'SG FromMin In', operationType: OperationTypeEnum.INPUT_GRAPH, position: { x, y }, config: { externalPortName: 'FromMin', externalPortCategory: LogicalCategoryEnum.NUMBER } }); subGraphNodes.push(fromMinIn); y += 70;
    const fromMaxIn = createAtomicNode({ id: generateNodeId(), name: 'SG FromMax In', operationType: OperationTypeEnum.INPUT_GRAPH, position: { x, y }, config: { externalPortName: 'FromMax', externalPortCategory: LogicalCategoryEnum.NUMBER } }); subGraphNodes.push(fromMaxIn); y += 70;
    const toMinIn = createAtomicNode({ id: generateNodeId(), name: 'SG ToMin In', operationType: OperationTypeEnum.INPUT_GRAPH, position: { x, y }, config: { externalPortName: 'ToMin', externalPortCategory: LogicalCategoryEnum.NUMBER } }); subGraphNodes.push(toMinIn); y += 70;
    const toMaxIn = createAtomicNode({ id: generateNodeId(), name: 'SG ToMax In', operationType: OperationTypeEnum.INPUT_GRAPH, position: { x, y }, config: { externalPortName: 'ToMax', externalPortCategory: LogicalCategoryEnum.NUMBER } }); subGraphNodes.push(toMaxIn);
    x += 250; y = 50; const subValFromMin = createAtomicNode({ name: 'Value - FromMin', operationType: OperationTypeEnum.SUBTRACT, position: { x, y } }); subGraphNodes.push(subValFromMin);
    subGraphConnections.push({ id: generateConnectionId(), fromNodeId: valueIn.id, fromPortId: valueIn.outputPorts[0].id, toNodeId: subValFromMin.id, toPortId: findPortOrFail(subValFromMin.inputPorts, 'Minuend', subValFromMin.name, 'input').id });
    subGraphConnections.push({ id: generateConnectionId(), fromNodeId: fromMinIn.id, fromPortId: fromMinIn.outputPorts[0].id, toNodeId: subValFromMin.id, toPortId: findPortOrFail(subValFromMin.inputPorts, 'Subtrahend', subValFromMin.name, 'input').id });
    y += 70; const subToMaxToMin = createAtomicNode({ name: 'ToMax - ToMin', operationType: OperationTypeEnum.SUBTRACT, position: { x, y } }); subGraphNodes.push(subToMaxToMin);
    subGraphConnections.push({ id: generateConnectionId(), fromNodeId: toMaxIn.id, fromPortId: toMaxIn.outputPorts[0].id, toNodeId: subToMaxToMin.id, toPortId: findPortOrFail(subToMaxToMin.inputPorts, 'Minuend', subToMaxToMin.name, 'input').id });
    subGraphConnections.push({ id: generateConnectionId(), fromNodeId: toMinIn.id, fromPortId: toMinIn.outputPorts[0].id, toNodeId: subToMaxToMin.id, toPortId: findPortOrFail(subToMaxToMin.inputPorts, 'Subtrahend', subToMaxToMin.name, 'input').id });
    y += 70; const subFromMaxFromMin = createAtomicNode({ name: 'FromMax - FromMin', operationType: OperationTypeEnum.SUBTRACT, position: { x, y } }); subGraphNodes.push(subFromMaxFromMin);
    subGraphConnections.push({ id: generateConnectionId(), fromNodeId: fromMaxIn.id, fromPortId: fromMaxIn.outputPorts[0].id, toNodeId: subFromMaxFromMin.id, toPortId: findPortOrFail(subFromMaxFromMin.inputPorts, 'Minuend', subFromMaxFromMin.name, 'input').id });
    subGraphConnections.push({ id: generateConnectionId(), fromNodeId: fromMinIn.id, fromPortId: fromMinIn.outputPorts[0].id, toNodeId: subFromMaxFromMin.id, toPortId: findPortOrFail(subFromMaxFromMin.inputPorts, 'Subtrahend', subFromMaxFromMin.name, 'input').id });
    x += 250; y = 50; const mul1 = createAtomicNode({ name: '(V-Fm) * (Tmx-Tmn)', operationType: OperationTypeEnum.MULTIPLY, position: { x, y } }); subGraphNodes.push(mul1);
    subGraphConnections.push({ id: generateConnectionId(), fromNodeId: subValFromMin.id, fromPortId: subValFromMin.outputPorts[0].id, toNodeId: mul1.id, toPortId: findPortOrFail(mul1.inputPorts, 'Operand A', mul1.name, 'input').id });
    subGraphConnections.push({ id: generateConnectionId(), fromNodeId: subToMaxToMin.id, fromPortId: subToMaxToMin.outputPorts[0].id, toNodeId: mul1.id, toPortId: findPortOrFail(mul1.inputPorts, 'Operand B', mul1.name, 'input').id });
    y += 70; const div1 = createAtomicNode({ name: 'Scaled Ratio', operationType: OperationTypeEnum.DIVIDE, position: { x, y } }); subGraphNodes.push(div1);
    subGraphConnections.push({ id: generateConnectionId(), fromNodeId: mul1.id, fromPortId: mul1.outputPorts[0].id, toNodeId: div1.id, toPortId: findPortOrFail(div1.inputPorts, 'Dividend', div1.name, 'input').id });
    subGraphConnections.push({ id: generateConnectionId(), fromNodeId: subFromMaxFromMin.id, fromPortId: subFromMaxFromMin.outputPorts[0].id, toNodeId: div1.id, toPortId: findPortOrFail(div1.inputPorts, 'Divisor', div1.name, 'input').id });
    x += 250; y = 50; const add1 = createAtomicNode({ name: 'ToMin + Scaled', operationType: OperationTypeEnum.ADDITION, position: { x, y } }); subGraphNodes.push(add1);
    subGraphConnections.push({ id: generateConnectionId(), fromNodeId: toMinIn.id, fromPortId: toMinIn.outputPorts[0].id, toNodeId: add1.id, toPortId: findPortOrFail(add1.inputPorts, 'Number 1', add1.name, 'input').id });
    subGraphConnections.push({ id: generateConnectionId(), fromNodeId: div1.id, fromPortId: div1.outputPorts[0].id, toNodeId: add1.id, toPortId: findPortOrFail(add1.inputPorts, 'Number 2', add1.name, 'input').id });
    const clampStartX = x + 250; const clampStartY = y - 50;
    const { nodes: clampNodes, connections: clampConnections, finalOutputNodeId, finalOutputPortId } = createInternalClampLogic( molecularNodeId, add1.id, add1.outputPorts[0].id, toMinIn.id, toMinIn.outputPorts[0].id, toMaxIn.id, toMaxIn.outputPorts[0].id, clampStartX, clampStartY );
    subGraphNodes.push(...clampNodes); subGraphConnections.push(...clampConnections);
    const finalOutputX = clampStartX + (clampNodes.reduce((maxX, node) => Math.max(maxX, node.position.x + 200), 0) - clampStartX);
    const resultOut = createAtomicNode({ id: generateNodeId(), name: 'SG Result Out', operationType: OperationTypeEnum.OUTPUT_GRAPH, position: { x: finalOutputX , y: clampStartY + 105 }, config: { externalPortName: 'Result', externalPortCategory: LogicalCategoryEnum.NUMBER } }); subGraphNodes.push(resultOut);
    subGraphConnections.push({ id: generateConnectionId(), fromNodeId: finalOutputNodeId, fromPortId: finalOutputPortId, toNodeId: resultOut.id, toPortId: resultOut.inputPorts[0].id });
    const molecularNode = createMolecularNode({ id: molecularNodeId, name: 'Map Range', operationType: OperationTypeEnum.MOLECULAR, position: { x: 0, y: 0 }, subGraph: { nodes: subGraphNodes, connections: subGraphConnections } });
    molecularNode.inputPorts = [ { id: generatePortId(molecularNodeId, 'in', 'Value'), name: 'Value', category: LogicalCategoryEnum.NUMBER, portType: PortTypeEnum.DATA }, { id: generatePortId(molecularNodeId, 'in', 'FromMin'), name: 'FromMin', category: LogicalCategoryEnum.NUMBER, portType: PortTypeEnum.DATA }, { id: generatePortId(molecularNodeId, 'in', 'FromMax'), name: 'FromMax', category: LogicalCategoryEnum.NUMBER, portType: PortTypeEnum.DATA }, { id: generatePortId(molecularNodeId, 'in', 'ToMin'), name: 'ToMin', category: LogicalCategoryEnum.NUMBER, portType: PortTypeEnum.DATA }, { id: generatePortId(molecularNodeId, 'in', 'ToMax'), name: 'ToMax', category: LogicalCategoryEnum.NUMBER, portType: PortTypeEnum.DATA }, ];
    molecularNode.outputPorts = [{ id: generatePortId(molecularNodeId, 'out', 'Result'), name: 'Result', category: LogicalCategoryEnum.NUMBER, portType: PortTypeEnum.DATA }];
    molecularNode.description = "Maps Value from [FromMin, FromMax] to [ToMin, ToMax], then clamps to [ToMin, ToMax].";
    return molecularNode;
}
function createTriggerOnceBlueprint(): MolecularNode {
    const molecularNodeId = generateNodeId(); const subGraphNodes: AnyNode[] = []; const subGraphConnections: Connection[] = []; let x = 50, y = 50;
    const execIn = createAtomicNode({ id: generateNodeId(), name: 'SG Exec In', operationType: OperationTypeEnum.INPUT_GRAPH, position: { x, y }, config: { externalPortName: 'Execute In', externalPortCategory: LogicalCategoryEnum.VOID } });
    execIn.outputPorts = [{id: generatePortId(execIn.id, 'out', 'trigger'), name: 'Trigger', category: LogicalCategoryEnum.VOID, portType: PortTypeEnum.EXECUTION}]; subGraphNodes.push(execIn);
    y += 100; const stateNodeId = `trigger_once_state_${molecularNodeId.replace(/[^a-zA-Z0-9]/g, '')}`;
    const stateNode = createAtomicNode({ name: 'Has Triggered?', operationType: OperationTypeEnum.STATE, position: { x, y }, config: { stateId: stateNodeId, initialValue: false } }); subGraphNodes.push(stateNode);
    x += 250; y = 50; const branchNode = createAtomicNode({ name: 'Branch on Triggered', operationType: OperationTypeEnum.BRANCH, position: { x, y } }); subGraphNodes.push(branchNode);
    subGraphConnections.push({ id: generateConnectionId(), fromNodeId: execIn.id, fromPortId: execIn.outputPorts[0].id, toNodeId: branchNode.id, toPortId: findPortOrFail(branchNode.inputPorts, 'Execute', branchNode.name, 'input').id });
    subGraphConnections.push({ id: generateConnectionId(), fromNodeId: stateNode.id, fromPortId: findPortOrFail(stateNode.outputPorts, 'Current Value', stateNode.name, 'output').id, toNodeId: branchNode.id, toPortId: findPortOrFail(branchNode.inputPorts, 'Condition', branchNode.name, 'input').id });
    x += 250; const trueValProvider = createAtomicNode({ name: 'True Value', operationType: OperationTypeEnum.VALUE_PROVIDER, position: { x: branchNode.position.x, y: branchNode.position.y + 120}, config: { value: true } }); subGraphNodes.push(trueValProvider);
    const execOut = createAtomicNode({ id: generateNodeId(), name: 'SG Exec Out', operationType: OperationTypeEnum.OUTPUT_GRAPH, position: { x, y: y - 50 }, config: { externalPortName: 'Execute Out', externalPortCategory: LogicalCategoryEnum.VOID } });
    execOut.inputPorts = [{id: generatePortId(execOut.id, 'in', 'signal'), name: 'Signal', category: LogicalCategoryEnum.VOID, portType: PortTypeEnum.EXECUTION}]; subGraphNodes.push(execOut);
    subGraphConnections.push({ id: generateConnectionId(), fromNodeId: branchNode.id, fromPortId: findPortOrFail(branchNode.outputPorts, 'If False (Exec)', branchNode.name, 'output').id, toNodeId: execOut.id, toPortId: execOut.inputPorts[0].id });
    subGraphConnections.push({ id: generateConnectionId(), fromNodeId: branchNode.id, fromPortId: findPortOrFail(branchNode.outputPorts, 'If False (Exec)', branchNode.name, 'output').id, toNodeId: stateNode.id, toPortId: findPortOrFail(stateNode.inputPorts, 'Execute Action', stateNode.name, 'input').id });
    subGraphConnections.push({ id: generateConnectionId(), fromNodeId: trueValProvider.id, fromPortId: trueValProvider.outputPorts[0].id, toNodeId: stateNode.id, toPortId: findPortOrFail(stateNode.inputPorts, 'Set Value', stateNode.name, 'input').id });
    const molecularNode = createMolecularNode({ id: molecularNodeId, name: 'Trigger Once', operationType: OperationTypeEnum.MOLECULAR, position: { x: 0, y: 0 }, subGraph: { nodes: subGraphNodes, connections: subGraphConnections } });
    molecularNode.inputPorts = [{ id: generatePortId(molecularNodeId, 'in', 'Execute In'), name: 'Execute In', category: LogicalCategoryEnum.VOID, portType: PortTypeEnum.EXECUTION }];
    molecularNode.outputPorts = [{ id: generatePortId(molecularNodeId, 'out', 'Execute Out'), name: 'Execute Out', category: LogicalCategoryEnum.VOID, portType: PortTypeEnum.EXECUTION }];
    molecularNode.description = "Passes 'Execute In' to 'Execute Out' only the first time it's triggered. Uses internal state.";
    return molecularNode;
}
function createToggleBlueprint(): MolecularNode {
    const molecularNodeId = generateNodeId(); const subGraphNodes: AnyNode[] = []; const subGraphConnections: Connection[] = []; let x = 50, y = 50;
    const execIn = createAtomicNode({ id: generateNodeId(), name: 'SG Exec In', operationType: OperationTypeEnum.INPUT_GRAPH, position: { x, y }, config: { externalPortName: 'Execute In', externalPortCategory: LogicalCategoryEnum.VOID } });
    execIn.outputPorts = [{id: generatePortId(execIn.id, 'out', 'trigger'), name: 'Trigger', category: LogicalCategoryEnum.VOID, portType: PortTypeEnum.EXECUTION}]; subGraphNodes.push(execIn);
    y += 100; const stateNodeId = `toggle_state_${molecularNodeId.replace(/[^a-zA-Z0-9]/g, '')}`;
    const stateNode = createAtomicNode({ name: 'Toggle State', operationType: OperationTypeEnum.STATE, position: { x, y }, config: { stateId: stateNodeId, initialValue: false } }); subGraphNodes.push(stateNode);
    subGraphConnections.push({ id: generateConnectionId(), fromNodeId: execIn.id, fromPortId: execIn.outputPorts[0].id, toNodeId: stateNode.id, toPortId: findPortOrFail(stateNode.inputPorts, 'Execute Action', stateNode.name, 'input').id });
    x += 250; y = 100; const notNode = createAtomicNode({ name: 'NOT Current State', operationType: OperationTypeEnum.NOT, position: { x, y } }); subGraphNodes.push(notNode);
    subGraphConnections.push({ id: generateConnectionId(), fromNodeId: stateNode.id, fromPortId: findPortOrFail(stateNode.outputPorts, 'Current Value', stateNode.name, 'output').id, toNodeId: notNode.id, toPortId: notNode.inputPorts[0].id });
    subGraphConnections.push({ id: generateConnectionId(), fromNodeId: notNode.id, fromPortId: notNode.outputPorts[0].id, toNodeId: stateNode.id, toPortId: findPortOrFail(stateNode.inputPorts, 'Set Value', stateNode.name, 'input').id });
    x += 250; y = 150; const currentStateOut = createAtomicNode({ id: generateNodeId(), name: 'SG Current State Out', operationType: OperationTypeEnum.OUTPUT_GRAPH, position: { x, y }, config: { externalPortName: 'Current State', externalPortCategory: LogicalCategoryEnum.BOOLEAN } }); subGraphNodes.push(currentStateOut);
    subGraphConnections.push({ id: generateConnectionId(), fromNodeId: stateNode.id, fromPortId: findPortOrFail(stateNode.outputPorts, 'Current Value', stateNode.name, 'output').id, toNodeId: currentStateOut.id, toPortId: currentStateOut.inputPorts[0].id });
    const molecularNode = createMolecularNode({ id: molecularNodeId, name: 'Toggle State', operationType: OperationTypeEnum.MOLECULAR, position: { x: 0, y: 0 }, subGraph: { nodes: subGraphNodes, connections: subGraphConnections } });
    molecularNode.inputPorts = [{ id: generatePortId(molecularNodeId, 'in', 'Execute In'), name: 'Execute In', category: LogicalCategoryEnum.VOID, portType: PortTypeEnum.EXECUTION }];
    molecularNode.outputPorts = [{ id: generatePortId(molecularNodeId, 'out', 'Current State'), name: 'Current State', category: LogicalCategoryEnum.BOOLEAN, portType: PortTypeEnum.DATA }];
    molecularNode.description = "Alternates an internal boolean state each time 'Execute In' is pulsed. Outputs the 'Current State'.";
    return molecularNode;
}
function createPickRandomItemBlueprint(): MolecularNode {
    const molecularNodeId = generateNodeId(); const subGraphNodes: AnyNode[] = []; const subGraphConnections: Connection[] = []; let x = 50, y = 50;
    const collectionIn = createAtomicNode({ id: generateNodeId(), name: 'SG Collection In', operationType: OperationTypeEnum.INPUT_GRAPH, position: { x, y }, config: { externalPortName: 'Collection', externalPortCategory: LogicalCategoryEnum.ARRAY } }); subGraphNodes.push(collectionIn);
    x += 250; const collectionLengthNode = createAtomicNode({ name: 'Get Collection Length', operationType: OperationTypeEnum.COLLECTION_LENGTH, position: { x, y } }); subGraphNodes.push(collectionLengthNode);
    subGraphConnections.push({ id: generateConnectionId(), fromNodeId: collectionIn.id, fromPortId: collectionIn.outputPorts[0].id, toNodeId: collectionLengthNode.id, toPortId: collectionLengthNode.inputPorts[0].id });
    y += 70; const zeroValueNode = createAtomicNode({ name: 'Value 0', operationType: OperationTypeEnum.VALUE_PROVIDER, position: { x, y: y - 35 }, config: {value: 0}}); subGraphNodes.push(zeroValueNode);
    const randomNumberNode = createAtomicNode({ name: 'Generate Random Index', operationType: OperationTypeEnum.RANDOM_NUMBER, position: { x, y } }); subGraphNodes.push(randomNumberNode);
    subGraphConnections.push({ id: generateConnectionId(), fromNodeId: zeroValueNode.id, fromPortId: zeroValueNode.outputPorts[0].id, toNodeId: randomNumberNode.id, toPortId: findPortOrFail(randomNumberNode.inputPorts, 'Min', randomNumberNode.name, 'input').id });
    subGraphConnections.push({ id: generateConnectionId(), fromNodeId: collectionLengthNode.id, fromPortId: collectionLengthNode.outputPorts[0].id, toNodeId: randomNumberNode.id, toPortId: findPortOrFail(randomNumberNode.inputPorts, 'Max', randomNumberNode.name, 'input').id });
    x += 250; y = 50; y += 70; const floorNode = createAtomicNode({ name: 'Floor Random Index', operationType: OperationTypeEnum.FLOOR, position: { x, y } }); subGraphNodes.push(floorNode);
    subGraphConnections.push({ id: generateConnectionId(), fromNodeId: randomNumberNode.id, fromPortId: randomNumberNode.outputPorts[0].id, toNodeId: floorNode.id, toPortId: floorNode.inputPorts[0].id });
    x += 250; y = 50; const getItemNode = createAtomicNode({ name: 'Get Item at Index', operationType: OperationTypeEnum.GET_ITEM_AT_INDEX, position: { x, y } }); subGraphNodes.push(getItemNode);
    subGraphConnections.push({ id: generateConnectionId(), fromNodeId: collectionIn.id, fromPortId: collectionIn.outputPorts[0].id, toNodeId: getItemNode.id, toPortId: findPortOrFail(getItemNode.inputPorts, 'Collection', getItemNode.name, 'input').id });
    subGraphConnections.push({ id: generateConnectionId(), fromNodeId: floorNode.id, fromPortId: floorNode.outputPorts[0].id, toNodeId: getItemNode.id, toPortId: findPortOrFail(getItemNode.inputPorts, 'Index', getItemNode.name, 'input').id });
    x += 250; const itemOut = createAtomicNode({ id: generateNodeId(), name: 'SG Item Out', operationType: OperationTypeEnum.OUTPUT_GRAPH, position: { x, y }, config: { externalPortName: 'Item', externalPortCategory: LogicalCategoryEnum.ANY } }); subGraphNodes.push(itemOut);
    subGraphConnections.push({ id: generateConnectionId(), fromNodeId: getItemNode.id, fromPortId: getItemNode.outputPorts[0].id, toNodeId: itemOut.id, toPortId: itemOut.inputPorts[0].id });
    const molecularNode = createMolecularNode({ id: molecularNodeId, name: 'Pick Random Item', operationType: OperationTypeEnum.MOLECULAR, position: { x: 0, y: 0 }, subGraph: { nodes: subGraphNodes, connections: subGraphConnections } });
    molecularNode.inputPorts = [{ id: generatePortId(molecularNodeId, 'in', 'Collection'), name: 'Collection', category: LogicalCategoryEnum.ARRAY, portType: PortTypeEnum.DATA }];
    molecularNode.outputPorts = [{ id: generatePortId(molecularNodeId, 'out', 'Item'), name: 'Item', category: LogicalCategoryEnum.ANY, portType: PortTypeEnum.DATA }];
    molecularNode.description = "Selects and outputs a random 'Item' from the input 'Collection' (ARRAY).";
    return molecularNode;
}

const blueprints: ComponentBlueprint[] = [
  { name: "Clamp Number", description: "Clamps a number between a min and max value. (Data-flow logic)", icon: Icons.AdjustmentsHorizontalIcon, creatorFunction: createClampNumberBlueprint },
  { name: "Safe Get Property (L2)", description: "Safely access a property from an object (max 2 levels deep).", icon: Icons.CodeBracketSquareIcon, creatorFunction: createSafeGetPropertyBlueprint },
  { name: "Validate Email (Basic)", description: "Basic check if a string could be an email.", icon: Icons.EnvelopeIcon, creatorFunction: createValidateEmailBlueprint },
  { name: "Map Range", description: "Maps a Value from [FromMin, FromMax] to [ToMin, ToMax], then clamps to [ToMin, ToMax].", icon: Icons.AdjustmentsHorizontalIcon, creatorFunction: createMapRangeBlueprint },
  { name: "Trigger Once", description: "Passes 'Execute In' to 'Execute Out' only the first time it's triggered.", icon: Icons.ArchiveBoxIcon, creatorFunction: createTriggerOnceBlueprint },
  { name: "Toggle State", description: "Alternates an internal boolean state each time 'Execute In' is pulsed. Outputs the 'Current State'.", icon: Icons.ArrowPathIcon, creatorFunction: createToggleBlueprint },
  { name: "Pick Random Item", description: "Selects and outputs a random 'Item' from the input 'Collection' (ARRAY).", icon: Icons.SparklesIcon, creatorFunction: createPickRandomItemBlueprint },
];


export const commonComponentsModule: LogicalModule = {
  id: 'common_components',
  name: 'Common Components',
  description: 'A collection of pre-built molecular components for common tasks.',
  atomicNodeDefinitions: [], // This module only provides component blueprints
  componentBlueprints: blueprints,
};
