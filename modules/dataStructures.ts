
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

export const dataStructuresModule = {
  id: 'data_structures',
  name: 'Data Structures',
  description: 'Nodes for manipulating strings, arrays, and objects.',
  atomicNodeDefinitions: [
    {
      operationType: OperationTypeEnum.CONCATENATE,
      name: 'Concatenate',
      description: "Joins two string inputs.",
      category: 'Text Manipulation',
      icon: Icons.SparklesIcon,
      defaultConfig: { ...defaultFooterConfig },
      portGenerator: (nodeId) => ({
        inputPorts: [
          { id: generatePortId(nodeId, 'in', 'String 1'), name: 'String 1', category: LogicalCategoryEnum.STRING, portType: PortTypeEnum.DATA },
          { id: generatePortId(nodeId, 'in', 'String 2'), name: 'String 2', category: LogicalCategoryEnum.STRING, portType: PortTypeEnum.DATA },
        ],
        outputPorts: [{ id: generatePortId(nodeId, 'out', 'Result'), name: 'Result', category: LogicalCategoryEnum.STRING, portType: PortTypeEnum.DATA }],
      }),
      resolveOutputs: (node, resolvedInputs) => {
        const s1 = String(resolvedInputs[findInputPortOrFail(node, 'String 1').id] ?? '');
        const s2 = String(resolvedInputs[findInputPortOrFail(node, 'String 2').id] ?? '');
        return { [`${node.id}_${findOutputPortOrFail(node, 'Result').id}`]: s1 + s2 };
      }
    },
    {
      operationType: OperationTypeEnum.UNION,
      name: 'Union (Array)',
      description: "Collects inputs into an array.",
      category: 'Data Structures',
      icon: Icons.PlusCircleIcon,
      defaultConfig: { ...defaultFooterConfig },
      portGenerator: (nodeId) => ({
        inputPorts: [
          { id: generatePortId(nodeId, 'in', 'Item 1'), name: 'Item 1', category: LogicalCategoryEnum.ANY, portType: PortTypeEnum.DATA, description: 'First item.' },
          { id: generatePortId(nodeId, 'in', 'Item 2'), name: 'Item 2', category: LogicalCategoryEnum.ANY, portType: PortTypeEnum.DATA, description: 'Second item.' },
        ],
        outputPorts: [{ id: generatePortId(nodeId, 'out', 'Collection'), name: 'Collection', category: LogicalCategoryEnum.ARRAY, portType: PortTypeEnum.DATA }],
      }),
      resolveOutputs: (node, resolvedInputs) => {
        const collectedValues: any[] = [];
        node.inputPorts.filter(p=> p.portType === PortTypeEnum.DATA).forEach(port => {
            const value = resolvedInputs[port.id];
            if (value !== undefined) collectedValues.push(value);
        });
        return { [`${node.id}_${findOutputPortOrFail(node, 'Collection').id}`]: collectedValues };
      }
    },
    {
      operationType: OperationTypeEnum.TO_STRING,
      name: 'To String',
      description: "Converts input to string.",
      category: 'Text Manipulation',
      icon: Icons.ArrowRightCircleIcon,
      defaultConfig: { ...defaultFooterConfig },
      portGenerator: (nodeId) => ({
        inputPorts: [{ id: generatePortId(nodeId, 'in', 'Input'), name: 'Input', category: LogicalCategoryEnum.ANY, portType: PortTypeEnum.DATA }],
        outputPorts: [{ id: generatePortId(nodeId, 'out', 'Output'), name: 'Output', category: LogicalCategoryEnum.STRING, portType: PortTypeEnum.DATA }],
      }),
      resolveOutputs: (node, resolvedInputs) => ({
        [`${node.id}_${findOutputPortOrFail(node, 'Output').id}`]: String(resolvedInputs[findInputPortOrFail(node, 'Input').id] ?? 'undefined')
      })
    },
    {
      operationType: OperationTypeEnum.GET_ITEM_AT_INDEX,
      name: 'Get Item at Index',
      description: "Extracts item from array by index.",
      category: 'Data Structures',
      icon: Icons.GetItemAtIndexIcon,
      defaultConfig: { ...defaultFooterConfig },
      portGenerator: (nodeId) => ({
        inputPorts: [
            { id: generatePortId(nodeId, 'in', 'Collection'), name: 'Collection', category: LogicalCategoryEnum.ARRAY, portType: PortTypeEnum.DATA },
            { id: generatePortId(nodeId, 'in', 'Index'), name: 'Index', category: LogicalCategoryEnum.NUMBER, portType: PortTypeEnum.DATA },
        ],
        outputPorts: [{ id: generatePortId(nodeId, 'out', 'Item'), name: 'Item', category: LogicalCategoryEnum.ANY, portType: PortTypeEnum.DATA }],
      }),
      resolveOutputs: (node, resolvedInputs, _, metaState) => {
        const collection = resolvedInputs[findInputPortOrFail(node, 'Collection').id];
        const index = resolvedInputs[findInputPortOrFail(node, 'Index').id];
        let item: any = undefined;
        if (!Array.isArray(collection)) {
            metaState.log.push({timestamp: Date.now(), nodeId: node.id, message:"Input 'Collection' is not an array.", type: 'error'});
        } else if (typeof index !== 'number' || isNaN(index) || !Number.isInteger(index)) {
            metaState.log.push({timestamp: Date.now(), nodeId: node.id, message:"Input 'Index' is not an integer.", type: 'error'});
        } else if (index < 0 || index >= collection.length) {
            metaState.log.push({timestamp: Date.now(), nodeId: node.id, message:`Index ${index} out of bounds for collection length ${collection.length}.`, type: 'debug'});
        } else {
            item = collection[index];
        }
        return { [`${node.id}_${findOutputPortOrFail(node, 'Item').id}`]: item };
      }
    },
    {
      operationType: OperationTypeEnum.COLLECTION_LENGTH,
      name: 'Collection Length',
      description: "Gets length of an array.",
      category: 'Data Structures',
      icon: Icons.CollectionLengthIcon,
      defaultConfig: { ...defaultFooterConfig },
      portGenerator: (nodeId) => ({
        inputPorts: [{ id: generatePortId(nodeId, 'in', 'Collection'), name: 'Collection', category: LogicalCategoryEnum.ARRAY, portType: PortTypeEnum.DATA }],
        outputPorts: [{ id: generatePortId(nodeId, 'out', 'Length'), name: 'Length', category: LogicalCategoryEnum.NUMBER, portType: PortTypeEnum.DATA }],
      }),
      resolveOutputs: (node, resolvedInputs, _, metaState) => {
        const collection = resolvedInputs[findInputPortOrFail(node, 'Collection').id];
        if (!Array.isArray(collection)) {
            metaState.log.push({timestamp: Date.now(), nodeId: node.id, message:"Input 'Collection' is not an array.", type: 'error'});
            return { [`${node.id}_${findOutputPortOrFail(node, 'Length').id}`]: 0 };
        }
        return { [`${node.id}_${findOutputPortOrFail(node, 'Length').id}`]: collection.length };
      }
    },
    {
      operationType: OperationTypeEnum.GET_PROPERTY,
      name: 'Get Property',
      description: "Gets property from object by key.",
      category: 'Data Structures',
      icon: Icons.GetPropertyIcon,
      defaultConfig: { ...defaultFooterConfig },
      portGenerator: (nodeId) => ({
        inputPorts: [
            { id: generatePortId(nodeId, 'in', 'Source'), name: 'Source', category: LogicalCategoryEnum.OBJECT, portType: PortTypeEnum.DATA },
            { id: generatePortId(nodeId, 'in', 'Key'), name: 'Key', category: LogicalCategoryEnum.STRING, portType: PortTypeEnum.DATA },
        ],
        outputPorts: [{ id: generatePortId(nodeId, 'out', 'Value'), name: 'Value', category: LogicalCategoryEnum.ANY, portType: PortTypeEnum.DATA }],
      }),
       resolveOutputs: (node, resolvedInputs, _, metaState) => {
        const sourceObj = resolvedInputs[findInputPortOrFail(node, 'Source').id];
        const keyProp = resolvedInputs[findInputPortOrFail(node, 'Key').id];
        let value: any = undefined;
        if (typeof sourceObj !== 'object' || sourceObj === null) {
            metaState.log.push({timestamp: Date.now(), nodeId: node.id, message:"Input 'Source' is not an object.", type: 'error'});
        } else if (typeof keyProp !== 'string') {
            metaState.log.push({timestamp: Date.now(), nodeId: node.id, message:"Input 'Key' is not a string.", type: 'error'});
        } else {
            value = sourceObj[keyProp];
            if (value === undefined && !Object.prototype.hasOwnProperty.call(sourceObj, keyProp)) {
                metaState.log.push({timestamp: Date.now(), nodeId: node.id, message:`Key '${keyProp}' not found in source.`, type: 'debug'});
            }
        }
        return { [`${node.id}_${findOutputPortOrFail(node, 'Value').id}`]: value };
      }
    },
    {
      operationType: OperationTypeEnum.SET_PROPERTY,
      name: 'Set Property',
      description: "Sets property on a (copy of) object.",
      category: 'Data Structures',
      icon: Icons.SetPropertyIcon,
      defaultConfig: { ...defaultFooterConfig },
      portGenerator: (nodeId) => ({
        inputPorts: [
            { id: generatePortId(nodeId, 'in', 'Source'), name: 'Source', category: LogicalCategoryEnum.OBJECT, portType: PortTypeEnum.DATA },
            { id: generatePortId(nodeId, 'in', 'Key'), name: 'Key', category: LogicalCategoryEnum.STRING, portType: PortTypeEnum.DATA },
            { id: generatePortId(nodeId, 'in', 'Value'), name: 'Value', category: LogicalCategoryEnum.ANY, portType: PortTypeEnum.DATA },
        ],
        outputPorts: [{ id: generatePortId(nodeId, 'out', 'Result'), name: 'Result', category: LogicalCategoryEnum.OBJECT, portType: PortTypeEnum.DATA }],
      }),
      resolveOutputs: (node, resolvedInputs, _, metaState) => {
        const sourceObj = resolvedInputs[findInputPortOrFail(node, 'Source').id];
        const keyProp = resolvedInputs[findInputPortOrFail(node, 'Key').id];
        const valueProp = resolvedInputs[findInputPortOrFail(node, 'Value').id];
        let resultObj: any = {};

        if (typeof sourceObj !== 'object' || sourceObj === null) {
             metaState.log.push({timestamp: Date.now(), nodeId: node.id, message:"Input 'Source' is not an object.", type: 'error'});
        } else if (typeof keyProp !== 'string') {
             metaState.log.push({timestamp: Date.now(), nodeId: node.id, message:"Input 'Key' is not a string.", type: 'error'});
             resultObj = {...sourceObj};
        } else {
            resultObj = { ...sourceObj, [keyProp]: valueProp };
        }
        return { [`${node.id}_${findOutputPortOrFail(node, 'Result').id}`]: resultObj };
      }
    },
    {
      operationType: OperationTypeEnum.STRING_LENGTH,
      name: 'String Length',
      description: "Gets length of a string.",
      category: 'Text Manipulation',
      icon: Icons.StringLengthIcon,
      defaultConfig: { ...defaultFooterConfig },
      portGenerator: (nodeId) => ({
        inputPorts: [{ id: generatePortId(nodeId, 'in', 'Source'), name: 'Source', category: LogicalCategoryEnum.STRING, portType: PortTypeEnum.DATA }],
        outputPorts: [{ id: generatePortId(nodeId, 'out', 'Length'), name: 'Length', category: LogicalCategoryEnum.NUMBER, portType: PortTypeEnum.DATA }],
      }),
      resolveOutputs: (node, resolvedInputs) => ({
        [`${node.id}_${findOutputPortOrFail(node, 'Length').id}`]: String(resolvedInputs[findInputPortOrFail(node, 'Source').id] ?? '').length
      })
    },
    {
      operationType: OperationTypeEnum.SPLIT_STRING,
      name: 'Split String',
      description: "Splits string by delimiter into an array.",
      category: 'Text Manipulation',
      icon: Icons.SplitStringIcon,
      defaultConfig: { splitDelimiter: ',', ...defaultFooterConfig },
      portGenerator: (nodeId) => ({
        inputPorts: [
            { id: generatePortId(nodeId, 'in', 'Source'), name: 'Source', category: LogicalCategoryEnum.STRING, portType: PortTypeEnum.DATA },
            { id: generatePortId(nodeId, 'in', 'Delimiter'), name: 'Delimiter', category: LogicalCategoryEnum.STRING, portType: PortTypeEnum.DATA },
        ],
        outputPorts: [{ id: generatePortId(nodeId, 'out', 'Result'), name: 'Result', category: LogicalCategoryEnum.ARRAY, portType: PortTypeEnum.DATA, description:"Array of strings." }],
      }),
      resolveOutputs: (node, resolvedInputs) => {
        const source = String(resolvedInputs[findInputPortOrFail(node, 'Source').id] ?? '');
        const delimiter = String(resolvedInputs[findInputPortOrFail(node, 'Delimiter').id] ?? node.config?.splitDelimiter ?? ',');
        return { [`${node.id}_${findOutputPortOrFail(node, 'Result').id}`]: source.split(delimiter) };
      }
    },
    {
      operationType: OperationTypeEnum.CONSTRUCT_OBJECT,
      name: 'Construct Object',
      description: "Constructs object from dynamic Key-Value pairs.",
      category: 'Data Structures',
      icon: Icons.ConstructObjectIcon,
      defaultConfig: { ...defaultFooterConfig },
      portGenerator: (nodeId) => ({
        inputPorts: [
            { id: generatePortId(nodeId, 'in', 'Key 1'), name: 'Key 1', category: LogicalCategoryEnum.STRING, portType: PortTypeEnum.DATA },
            { id: generatePortId(nodeId, 'in', 'Value 1'), name: 'Value 1', category: LogicalCategoryEnum.ANY, portType: PortTypeEnum.DATA, description: "Connecting this port may add new ports." },
        ],
        outputPorts: [{ id: generatePortId(nodeId, 'out', 'Object'), name: 'Object', category: LogicalCategoryEnum.OBJECT, portType: PortTypeEnum.DATA }],
      }),
      resolveOutputs: (node, resolvedInputs, _, metaState) => {
        const constructedObject: Record<string, any> = {};
        const dataInputPortsCO = node.inputPorts.filter(p => p.portType === PortTypeEnum.DATA);
        for (let i = 0; i < dataInputPortsCO.length; i += 2) {
            const keyPort = dataInputPortsCO[i];
            const valuePort = dataInputPortsCO[i+1];
            if (keyPort && valuePort) {
                const key = resolvedInputs[keyPort.id];
                const value = resolvedInputs[valuePort.id];
                if (typeof key === 'string' && key.trim() !== '') {
                    constructedObject[key] = value;
                } else if (key !== undefined) {
                     metaState.log.push({timestamp: Date.now(), nodeId: node.id, message:`Invalid key type or empty key ('${key}') for CONSTRUCT_OBJECT port '${keyPort.name}'. Skipping.`, type: 'error'});
                }
            }
        }
        return { [`${node.id}_${findOutputPortOrFail(node, 'Object').id}`]: constructedObject };
      }
    },
  ] as AtomicNodeDefinition[],
  componentBlueprints: [],
};
