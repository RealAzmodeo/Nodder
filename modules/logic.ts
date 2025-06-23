
import { AtomicNodeDefinition, OperationTypeEnum, LogicalCategoryEnum, PortTypeEnum, AtomicNode, InputPort, OutputPort, ExecutionContext, ExecutionMetaState } from '../types';
import { generatePortId } from '../services/nodeFactory';
import * as Icons from '../components/Icons';

const defaultFooterConfig = { footerNoteText: '', showFooterNote: false };

function findInputPortOrFail(node: AtomicNode, portName: string): InputPort {
    const port = node.inputPorts.find(p => p.name === portName);
    if (!port) throw new Error(`Input port '${portName}' not found on node '${node.name}'.`);
    return port;
}
function findOutputPortOrFail(node: AtomicNode, portName: string): OutputPort {
    const port = node.outputPorts.find(p => p.name === portName);
    if (!port) throw new Error(`Output port '${portName}' not found on node '${node.name}'.`);
    return port;
}

export const logicModule = {
  id: 'logic',
  name: 'Logic & Comparison',
  description: 'Nodes for boolean logic and value comparisons.',
  atomicNodeDefinitions: [
    {
      operationType: OperationTypeEnum.LOGICAL_AND,
      name: 'AND (Logical AND)',
      description: "Performs logical AND on dynamic boolean inputs.",
      category: 'Logic & Comparison',
      icon: Icons.ViewColumnsIcon,
      defaultConfig: { ...defaultFooterConfig },
      isArchetype: true,
      portGenerator: (nodeId) => ({
        inputPorts: [
          { id: generatePortId(nodeId, 'in', 'Input 1'), name: 'Input 1', category: LogicalCategoryEnum.BOOLEAN, portType: PortTypeEnum.DATA, description: "First boolean input." },
          { id: generatePortId(nodeId, 'in', 'Input 2'), name: 'Input 2', category: LogicalCategoryEnum.BOOLEAN, portType: PortTypeEnum.DATA, description: "Second boolean input. Connecting this port may add new ports." },
        ],
        outputPorts: [{ id: generatePortId(nodeId, 'out', 'Result'), name: 'Result', category: LogicalCategoryEnum.BOOLEAN, portType: PortTypeEnum.DATA, description: "The logical result." }],
      }),
      resolveOutputs: (node, resolvedInputs, _, metaState) => {
        const outputPort = findOutputPortOrFail(node, 'Result');
        let result = true;
        const andInputs = node.inputPorts.filter(p => p.portType === PortTypeEnum.DATA && p.category === LogicalCategoryEnum.BOOLEAN);
        if (andInputs.length === 0) result = true;
        else {
            for (const port of andInputs) {
                const val = resolvedInputs[port.id];
                if (val !== true) { result = false; break; }
            }
        }
        return { [`${node.id}_${outputPort.id}`]: result };
      }
    },
    {
      operationType: OperationTypeEnum.LOGICAL_OR,
      name: 'OR (Logical OR)',
      description: "Performs logical OR on dynamic boolean inputs.",
      category: 'Logic & Comparison',
      icon: Icons.PlusCircleIcon,
      defaultConfig: { ...defaultFooterConfig },
      portGenerator: (nodeId) => ({
        inputPorts: [
          { id: generatePortId(nodeId, 'in', 'Input 1'), name: 'Input 1', category: LogicalCategoryEnum.BOOLEAN, portType: PortTypeEnum.DATA, description: "First boolean input." },
          { id: generatePortId(nodeId, 'in', 'Input 2'), name: 'Input 2', category: LogicalCategoryEnum.BOOLEAN, portType: PortTypeEnum.DATA, description: "Second boolean input. Connecting this port may add new ports." },
        ],
        outputPorts: [{ id: generatePortId(nodeId, 'out', 'Result'), name: 'Result', category: LogicalCategoryEnum.BOOLEAN, portType: PortTypeEnum.DATA, description: "The logical result." }],
      }),
      resolveOutputs: (node, resolvedInputs, _, metaState) => {
        const outputPort = findOutputPortOrFail(node, 'Result');
        let result = false;
        const orInputs = node.inputPorts.filter(p => p.portType === PortTypeEnum.DATA && p.category === LogicalCategoryEnum.BOOLEAN);
        if (orInputs.length === 0) result = false;
        else {
            for (const port of orInputs) {
                const val = resolvedInputs[port.id];
                if (val === true) { result = true; break; }
            }
        }
        return { [`${node.id}_${outputPort.id}`]: result };
      }
    },
     {
      operationType: OperationTypeEnum.LOGICAL_XOR,
      name: 'XOR (Logical XOR)',
      description: "Performs logical XOR on dynamic boolean inputs.",
      category: 'Logic & Comparison',
      icon: Icons.ArrowsRightLeftIcon,
      defaultConfig: { ...defaultFooterConfig },
      portGenerator: (nodeId) => ({
        inputPorts: [
          { id: generatePortId(nodeId, 'in', 'Input 1'), name: 'Input 1', category: LogicalCategoryEnum.BOOLEAN, portType: PortTypeEnum.DATA, description: "First boolean input." },
          { id: generatePortId(nodeId, 'in', 'Input 2'), name: 'Input 2', category: LogicalCategoryEnum.BOOLEAN, portType: PortTypeEnum.DATA, description: "Second boolean input. Connecting this port may add new ports." },
        ],
        outputPorts: [{ id: generatePortId(nodeId, 'out', 'Result'), name: 'Result', category: LogicalCategoryEnum.BOOLEAN, portType: PortTypeEnum.DATA, description: "The logical result." }],
      }),
      resolveOutputs: (node, resolvedInputs, _, metaState) => {
        const outputPort = findOutputPortOrFail(node, 'Result');
        let trueCount = 0;
        const xorInputs = node.inputPorts.filter(p => p.portType === PortTypeEnum.DATA && p.category === LogicalCategoryEnum.BOOLEAN);
        for (const port of xorInputs) {
            if (resolvedInputs[port.id] === true) trueCount++;
        }
        return { [`${node.id}_${outputPort.id}`]: (trueCount % 2) !== 0 };
      }
    },
    {
      operationType: OperationTypeEnum.EQUALS,
      name: 'Equals',
      description: "Compares 'Value 1' and 'Value 2' for equality.",
      category: 'Logic & Comparison',
      icon: Icons.EqualsIcon,
      defaultConfig: { ...defaultFooterConfig },
      portGenerator: (nodeId) => ({
        inputPorts: [
            { id: generatePortId(nodeId, 'in', 'Value 1'), name: 'Value 1', category: LogicalCategoryEnum.ANY, portType: PortTypeEnum.DATA },
            { id: generatePortId(nodeId, 'in', 'Value 2'), name: 'Value 2', category: LogicalCategoryEnum.ANY, portType: PortTypeEnum.DATA },
        ],
        outputPorts: [{ id: generatePortId(nodeId, 'out', 'Result'), name: 'Result', category: LogicalCategoryEnum.BOOLEAN, portType: PortTypeEnum.DATA }],
      }),
      resolveOutputs: (node, resolvedInputs) => {
        const val1 = resolvedInputs[findInputPortOrFail(node, 'Value 1').id];
        const val2 = resolvedInputs[findInputPortOrFail(node, 'Value 2').id];
        return { [`${node.id}_${findOutputPortOrFail(node, 'Result').id}`]: JSON.stringify(val1) === JSON.stringify(val2) };
      }
    },
    {
      operationType: OperationTypeEnum.GREATER_THAN,
      name: 'Greater Than',
      description: "Checks if 'Operand A' > 'Operand B'.",
      category: 'Logic & Comparison',
      icon: Icons.GreaterThanIcon,
      defaultConfig: { ...defaultFooterConfig },
      portGenerator: (nodeId) => ({
        inputPorts: [
            { id: generatePortId(nodeId, 'in', 'Operand A'), name: 'Operand A', category: LogicalCategoryEnum.NUMBER, portType: PortTypeEnum.DATA },
            { id: generatePortId(nodeId, 'in', 'Operand B'), name: 'Operand B', category: LogicalCategoryEnum.NUMBER, portType: PortTypeEnum.DATA },
        ],
        outputPorts: [{ id: generatePortId(nodeId, 'out', 'Result'), name: 'Result', category: LogicalCategoryEnum.BOOLEAN, portType: PortTypeEnum.DATA }],
      }),
       resolveOutputs: (node, resolvedInputs) => {
        const opA = parseFloat(resolvedInputs[findInputPortOrFail(node, 'Operand A').id]);
        const opB = parseFloat(resolvedInputs[findInputPortOrFail(node, 'Operand B').id]);
        if (typeof opA !== 'number' || typeof opB !== 'number' || isNaN(opA) || isNaN(opB)) throw new Error("GREATER_THAN inputs must be numbers.");
        return { [`${node.id}_${findOutputPortOrFail(node, 'Result').id}`]: opA > opB };
      }
    },
    {
      operationType: OperationTypeEnum.LESS_THAN,
      name: 'Less Than',
      description: "Checks if 'Operand A' < 'Operand B'.",
      category: 'Logic & Comparison',
      icon: Icons.LessThanIcon,
      defaultConfig: { ...defaultFooterConfig },
      portGenerator: (nodeId) => ({
        inputPorts: [
            { id: generatePortId(nodeId, 'in', 'Operand A'), name: 'Operand A', category: LogicalCategoryEnum.NUMBER, portType: PortTypeEnum.DATA },
            { id: generatePortId(nodeId, 'in', 'Operand B'), name: 'Operand B', category: LogicalCategoryEnum.NUMBER, portType: PortTypeEnum.DATA },
        ],
        outputPorts: [{ id: generatePortId(nodeId, 'out', 'Result'), name: 'Result', category: LogicalCategoryEnum.BOOLEAN, portType: PortTypeEnum.DATA }],
      }),
      resolveOutputs: (node, resolvedInputs) => {
        const opA = parseFloat(resolvedInputs[findInputPortOrFail(node, 'Operand A').id]);
        const opB = parseFloat(resolvedInputs[findInputPortOrFail(node, 'Operand B').id]);
        if (typeof opA !== 'number' || typeof opB !== 'number' || isNaN(opA) || isNaN(opB)) throw new Error("LESS_THAN inputs must be numbers.");
        return { [`${node.id}_${findOutputPortOrFail(node, 'Result').id}`]: opA < opB };
      }
    },
    {
      operationType: OperationTypeEnum.IS_EMPTY,
      name: 'Is Empty',
      description: "Checks if 'Target' (String, Array, Object) is empty.",
      category: 'Logic & Comparison',
      icon: Icons.IsEmptyIcon,
      defaultConfig: { ...defaultFooterConfig },
      portGenerator: (nodeId) => ({
        inputPorts: [{ id: generatePortId(nodeId, 'in', 'Target'), name: 'Target', category: LogicalCategoryEnum.ANY, portType: PortTypeEnum.DATA, description: "String, Array, or Object to check." }],
        outputPorts: [{ id: generatePortId(nodeId, 'out', 'Is Empty'), name: 'Is Empty', category: LogicalCategoryEnum.BOOLEAN, portType: PortTypeEnum.DATA }],
      }),
      resolveOutputs: (node, resolvedInputs) => {
        const target = resolvedInputs[findInputPortOrFail(node, 'Target').id];
        let isEmptyResult = false;
        if (typeof target === 'string' || Array.isArray(target)) isEmptyResult = target.length === 0;
        else if (typeof target === 'object' && target !== null) isEmptyResult = Object.keys(target).length === 0;
        else if (target === null || target === undefined) isEmptyResult = true;
        return { [`${node.id}_${findOutputPortOrFail(node, 'Is Empty').id}`]: isEmptyResult };
      }
    },
    {
      operationType: OperationTypeEnum.NOT,
      name: 'Not',
      description: "Negates boolean 'Input'. Undefined input treated as false.",
      category: 'Logic & Comparison',
      icon: Icons.NotIcon,
      defaultConfig: { ...defaultFooterConfig },
      portGenerator: (nodeId) => ({
        inputPorts: [{ id: generatePortId(nodeId, 'in', 'Input'), name: 'Input', category: LogicalCategoryEnum.BOOLEAN, portType: PortTypeEnum.DATA }],
        outputPorts: [{ id: generatePortId(nodeId, 'out', 'Result'), name: 'Result', category: LogicalCategoryEnum.BOOLEAN, portType: PortTypeEnum.DATA }],
      }),
      resolveOutputs: (node, resolvedInputs, _, metaState) => {
        const inputVal = resolvedInputs[findInputPortOrFail(node, 'Input').id];
        if (typeof inputVal !== 'boolean') {
            if (inputVal === undefined) {
                 metaState.log.push({timestamp: Date.now(), nodeId:node.id, message:`Input for NOT is undefined, treating as false. Outputting true.`, type: 'debug'});
                 return { [`${node.id}_${findOutputPortOrFail(node, 'Result').id}`]: true };
            }
            throw new Error("NOT input must be boolean or undefined.");
        }
        return { [`${node.id}_${findOutputPortOrFail(node, 'Result').id}`]: !inputVal };
      }
    },
    {
      operationType: OperationTypeEnum.SWITCH,
      name: 'Switch',
      description: "Outputs value based on matching 'Input' against configured 'Cases'.",
      category: 'Flow Control',
      icon: Icons.SwitchIcon,
      defaultConfig: { switchCases: [], switchDefaultValue: undefined, ...defaultFooterConfig },
      portGenerator: (nodeId) => ({
        inputPorts: [{ id: generatePortId(nodeId, 'in', 'Value'), name: 'Value', category: LogicalCategoryEnum.ANY, portType: PortTypeEnum.DATA }],
        outputPorts: [{ id: generatePortId(nodeId, 'out', 'Result'), name: 'Result', category: LogicalCategoryEnum.ANY, portType: PortTypeEnum.DATA }],
      }),
      resolveOutputs: (node, resolvedInputs, _, metaState) => {
        const switchValue = resolvedInputs[findInputPortOrFail(node, 'Value').id];
        const cases = node.config?.switchCases || [];
        let matchFound = false;
        let outputValue: any = node.config?.switchDefaultValue;

        for (const switchCase of cases) {
            if (JSON.stringify(switchValue) === JSON.stringify(switchCase.caseValue)) {
                outputValue = switchCase.outputValue;
                matchFound = true;
                break;
            }
        }
        if (!matchFound && node.config?.switchDefaultValue === undefined) {
            metaState.log.push({timestamp: Date.now(), nodeId: node.id, message:`SWITCH node: No matching case for value '${JSON.stringify(switchValue)}' and no default value defined. Outputting undefined.`, type: 'debug'});
        }
        return { [`${node.id}_${findOutputPortOrFail(node, 'Result').id}`]: outputValue };
      }
    },
  ] as AtomicNodeDefinition[],
  componentBlueprints: [],
};
