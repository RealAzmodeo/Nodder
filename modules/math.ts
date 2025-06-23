
import { AtomicNodeDefinition, OperationTypeEnum, LogicalCategoryEnum, PortTypeEnum, AtomicNode, InputPort, OutputPort, ExecutionContext } from '../types';
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


export const mathModule = {
  id: 'math',
  name: 'Mathematics',
  description: 'Nodes for performing mathematical calculations.',
  atomicNodeDefinitions: [
    {
      operationType: OperationTypeEnum.ADDITION,
      name: 'Addition',
      description: "Accepts two numerical inputs ('Number 1', 'Number 2') and outputs their sum.",
      category: 'Math Operations',
      icon: Icons.PlusCircleIcon,
      defaultConfig: { ...defaultFooterConfig },
      isArchetype: true,
      portGenerator: (nodeId) => ({
        inputPorts: [
          { id: generatePortId(nodeId, 'in', 'Number 1'), name: 'Number 1', category: LogicalCategoryEnum.NUMBER, portType: PortTypeEnum.DATA },
          { id: generatePortId(nodeId, 'in', 'Number 2'), name: 'Number 2', category: LogicalCategoryEnum.NUMBER, portType: PortTypeEnum.DATA },
        ],
        outputPorts: [{ id: generatePortId(nodeId, 'out', 'Sum'), name: 'Sum', category: LogicalCategoryEnum.NUMBER, portType: PortTypeEnum.DATA }],
      }),
      resolveOutputs: (node, resolvedInputs) => {
        const n1Port = findInputPortOrFail(node, 'Number 1');
        const n2Port = findInputPortOrFail(node, 'Number 2');
        const sumPort = findOutputPortOrFail(node, 'Sum');
        const n1 = parseFloat(resolvedInputs[n1Port.id]);
        const n2 = parseFloat(resolvedInputs[n2Port.id]);
        if (isNaN(n1) || isNaN(n2)) throw new Error("Invalid number input for ADDITION.");
        return { [`${node.id}_${sumPort.id}`]: n1 + n2 };
      },
    },
    {
      operationType: OperationTypeEnum.SUBTRACT,
      name: 'Subtract',
      description: "Subtracts 'Subtrahend' from 'Minuend'.",
      category: 'Math Operations',
      icon: Icons.SubtractIcon,
      defaultConfig: { ...defaultFooterConfig },
      portGenerator: (nodeId) => ({
        inputPorts: [
          { id: generatePortId(nodeId, 'in', 'Minuend'), name: 'Minuend', category: LogicalCategoryEnum.NUMBER, portType: PortTypeEnum.DATA },
          { id: generatePortId(nodeId, 'in', 'Subtrahend'), name: 'Subtrahend', category: LogicalCategoryEnum.NUMBER, portType: PortTypeEnum.DATA },
        ],
        outputPorts: [{ id: generatePortId(nodeId, 'out', 'Difference'), name: 'Difference', category: LogicalCategoryEnum.NUMBER, portType: PortTypeEnum.DATA }],
      }),
      resolveOutputs: (node, resolvedInputs) => {
        const minuend = parseFloat(resolvedInputs[findInputPortOrFail(node, 'Minuend').id]);
        const subtrahend = parseFloat(resolvedInputs[findInputPortOrFail(node, 'Subtrahend').id]);
        if (isNaN(minuend) || isNaN(subtrahend)) throw new Error("Invalid number input for SUBTRACT.");
        return { [`${node.id}_${findOutputPortOrFail(node, 'Difference').id}`]: minuend - subtrahend };
      }
    },
    {
      operationType: OperationTypeEnum.MULTIPLY,
      name: 'Multiply',
      description: "Multiplies 'Operand A' by 'Operand B'.",
      category: 'Math Operations',
      icon: Icons.MultiplyIcon,
      defaultConfig: { ...defaultFooterConfig },
      portGenerator: (nodeId) => ({
        inputPorts: [
          { id: generatePortId(nodeId, 'in', 'Operand A'), name: 'Operand A', category: LogicalCategoryEnum.NUMBER, portType: PortTypeEnum.DATA },
          { id: generatePortId(nodeId, 'in', 'Operand B'), name: 'Operand B', category: LogicalCategoryEnum.NUMBER, portType: PortTypeEnum.DATA },
        ],
        outputPorts: [{ id: generatePortId(nodeId, 'out', 'Product'), name: 'Product', category: LogicalCategoryEnum.NUMBER, portType: PortTypeEnum.DATA }],
      }),
      resolveOutputs: (node, resolvedInputs) => {
        const opA = parseFloat(resolvedInputs[findInputPortOrFail(node, 'Operand A').id]);
        const opB = parseFloat(resolvedInputs[findInputPortOrFail(node, 'Operand B').id]);
        if (isNaN(opA) || isNaN(opB)) throw new Error("Invalid number input for MULTIPLY.");
        return { [`${node.id}_${findOutputPortOrFail(node, 'Product').id}`]: opA * opB };
      }
    },
    {
      operationType: OperationTypeEnum.DIVIDE,
      name: 'Divide',
      description: "Divides 'Dividend' by 'Divisor'.",
      category: 'Math Operations',
      icon: Icons.DivideIcon,
      defaultConfig: { ...defaultFooterConfig },
      portGenerator: (nodeId) => ({
        inputPorts: [
          { id: generatePortId(nodeId, 'in', 'Dividend'), name: 'Dividend', category: LogicalCategoryEnum.NUMBER, portType: PortTypeEnum.DATA },
          { id: generatePortId(nodeId, 'in', 'Divisor'), name: 'Divisor', category: LogicalCategoryEnum.NUMBER, portType: PortTypeEnum.DATA },
        ],
        outputPorts: [{ id: generatePortId(nodeId, 'out', 'Quotient'), name: 'Quotient', category: LogicalCategoryEnum.NUMBER, portType: PortTypeEnum.DATA }],
      }),
      resolveOutputs: (node, resolvedInputs, _, metaState) => {
        const dividend = parseFloat(resolvedInputs[findInputPortOrFail(node, 'Dividend').id]);
        const divisor = parseFloat(resolvedInputs[findInputPortOrFail(node, 'Divisor').id]);
        if (isNaN(dividend) || isNaN(divisor)) throw new Error("Invalid number input for DIVIDE.");
        if (divisor === 0) {
          metaState.log.push({timestamp: Date.now(), nodeId: node.id, message: "Division by zero.", type: 'error'});
          return { [`${node.id}_${findOutputPortOrFail(node, 'Quotient').id}`]: dividend >= 0 ? Infinity : -Infinity };
        }
        return { [`${node.id}_${findOutputPortOrFail(node, 'Quotient').id}`]: dividend / divisor };
      }
    },
    {
      operationType: OperationTypeEnum.MODULO,
      name: 'Modulo',
      description: "Calculates remainder of 'Dividend' / 'Divisor'.",
      category: 'Math Operations',
      icon: Icons.ModuloIcon,
      defaultConfig: { ...defaultFooterConfig },
      portGenerator: (nodeId) => ({
        inputPorts: [
          { id: generatePortId(nodeId, 'in', 'Dividend'), name: 'Dividend', category: LogicalCategoryEnum.NUMBER, portType: PortTypeEnum.DATA },
          { id: generatePortId(nodeId, 'in', 'Divisor'), name: 'Divisor', category: LogicalCategoryEnum.NUMBER, portType: PortTypeEnum.DATA },
        ],
        outputPorts: [{ id: generatePortId(nodeId, 'out', 'Remainder'), name: 'Remainder', category: LogicalCategoryEnum.NUMBER, portType: PortTypeEnum.DATA }],
      }),
       resolveOutputs: (node, resolvedInputs, _, metaState) => {
        const dividend = parseFloat(resolvedInputs[findInputPortOrFail(node, 'Dividend').id]);
        const divisor = parseFloat(resolvedInputs[findInputPortOrFail(node, 'Divisor').id]);
        if (isNaN(dividend) || isNaN(divisor)) throw new Error("Invalid number input for MODULO.");
        if (divisor === 0) {
          metaState.log.push({timestamp: Date.now(), nodeId: node.id, message: "Modulo by zero.", type: 'error'});
          return { [`${node.id}_${findOutputPortOrFail(node, 'Remainder').id}`]: NaN };
        }
        return { [`${node.id}_${findOutputPortOrFail(node, 'Remainder').id}`]: dividend % divisor };
      }
    },
    {
      operationType: OperationTypeEnum.RANDOM_NUMBER,
      name: 'Random Number',
      description: "Generates a pseudo-random number between Min and Max.",
      category: 'Math Operations',
      icon: Icons.RandomNumberIcon,
      defaultConfig: { defaultMin: 0, defaultMax: 1, ...defaultFooterConfig },
      portGenerator: (nodeId) => ({
        inputPorts: [
            { id: generatePortId(nodeId, 'in', 'Min'), name: 'Min', category: LogicalCategoryEnum.NUMBER, portType: PortTypeEnum.DATA },
            { id: generatePortId(nodeId, 'in', 'Max'), name: 'Max', category: LogicalCategoryEnum.NUMBER, portType: PortTypeEnum.DATA },
        ],
        outputPorts: [{ id: generatePortId(nodeId, 'out', 'Result'), name: 'Result', category: LogicalCategoryEnum.NUMBER, portType: PortTypeEnum.DATA }],
      }),
      resolveOutputs: (node, resolvedInputs, _, metaState) => {
        const minVal = parseFloat(resolvedInputs[findInputPortOrFail(node, 'Min').id]);
        const maxVal = parseFloat(resolvedInputs[findInputPortOrFail(node, 'Max').id]);
        if (isNaN(minVal) || isNaN(maxVal)) throw new Error("Min/Max for RANDOM_NUMBER must be numbers.");
        if (minVal >= maxVal) {
            metaState.log.push({timestamp: Date.now(), nodeId:node.id, message:`Invalid range for RANDOM_NUMBER: Min (${minVal}) >= Max (${maxVal}). Outputting NaN.`, type: 'error'});
            return { [`${node.id}_${findOutputPortOrFail(node, 'Result').id}`]: NaN };
        }
        return { [`${node.id}_${findOutputPortOrFail(node, 'Result').id}`]: Math.random() * (maxVal - minVal) + minVal };
      }
    },
    {
      operationType: OperationTypeEnum.ROUND,
      name: 'Round',
      description: "Rounds input 'Value' to the nearest integer.",
      category: 'Math Operations',
      icon: Icons.RoundIcon,
      defaultConfig: { ...defaultFooterConfig },
      portGenerator: (nodeId) => ({
        inputPorts: [{ id: generatePortId(nodeId, 'in', 'Value'), name: 'Value', category: LogicalCategoryEnum.NUMBER, portType: PortTypeEnum.DATA }],
        outputPorts: [{ id: generatePortId(nodeId, 'out', 'Result'), name: 'Result', category: LogicalCategoryEnum.NUMBER, portType: PortTypeEnum.DATA }],
      }),
      resolveOutputs: (node, resolvedInputs) => {
        const val = parseFloat(resolvedInputs[findInputPortOrFail(node, 'Value').id]);
        if (isNaN(val)) throw new Error("Input for ROUND must be a number.");
        return { [`${node.id}_${findOutputPortOrFail(node, 'Result').id}`]: Math.round(val) };
      }
    },
    {
      operationType: OperationTypeEnum.FLOOR,
      name: 'Floor',
      description: "Rounds input 'Value' down to the largest integer less than or equal to it.",
      category: 'Math Operations',
      icon: Icons.ArrowDownIcon,
      defaultConfig: { ...defaultFooterConfig },
      portGenerator: (nodeId) => ({
        inputPorts: [{ id: generatePortId(nodeId, 'in', 'Value'), name: 'Value', category: LogicalCategoryEnum.NUMBER, portType: PortTypeEnum.DATA }],
        outputPorts: [{ id: generatePortId(nodeId, 'out', 'Result'), name: 'Result', category: LogicalCategoryEnum.NUMBER, portType: PortTypeEnum.DATA }],
      }),
      resolveOutputs: (node, resolvedInputs) => {
        const val = parseFloat(resolvedInputs[findInputPortOrFail(node, 'Value').id]);
        if (isNaN(val)) throw new Error("Input for FLOOR must be a number.");
        return { [`${node.id}_${findOutputPortOrFail(node, 'Result').id}`]: Math.floor(val) };
      }
    },
    {
      operationType: OperationTypeEnum.CEIL,
      name: 'Ceil',
      description: "Rounds input 'Value' up to the smallest integer greater than or equal to it.",
      category: 'Math Operations',
      icon: Icons.ArrowUpIcon,
      defaultConfig: { ...defaultFooterConfig },
      portGenerator: (nodeId) => ({
        inputPorts: [{ id: generatePortId(nodeId, 'in', 'Value'), name: 'Value', category: LogicalCategoryEnum.NUMBER, portType: PortTypeEnum.DATA }],
        outputPorts: [{ id: generatePortId(nodeId, 'out', 'Result'), name: 'Result', category: LogicalCategoryEnum.NUMBER, portType: PortTypeEnum.DATA }],
      }),
      resolveOutputs: (node, resolvedInputs) => {
        const val = parseFloat(resolvedInputs[findInputPortOrFail(node, 'Value').id]);
        if (isNaN(val)) throw new Error("Input for CEIL must be a number.");
        return { [`${node.id}_${findOutputPortOrFail(node, 'Result').id}`]: Math.ceil(val) };
      }
    },
  ] as AtomicNodeDefinition[],
  componentBlueprints: [],
};
