
import { AtomicNodeDefinition, OperationTypeEnum, LogicalCategoryEnum, PortTypeEnum, AtomicNode, InputPort, OutputPort, ExecutionContext, ExecutionMetaState } from '../types';
import { generatePortId } from '../services/nodeFactory';
import * as Icons from '../components/Icons';
import { 
    NODE_WIDTH, // Using NODE_WIDTH as a general default width for display nodes
    DEFAULT_DISPLAY_VALUE_CONTENT_HEIGHT, 
    DEFAULT_DISPLAY_MARKDOWN_CONTENT_HEIGHT, 
    DEFAULT_PROGRESS_BAR_CONTENT_HEIGHT, 
    DEFAULT_DATA_TABLE_CONTENT_HEIGHT 
} from '../constants';

const defaultFooterConfig = { footerNoteText: '', showFooterNote: false };

// Helper (can be removed if a shared utility exists and is imported)
function findInputPortOrFail(node: AtomicNode, portName: string): InputPort {
    const port = node.inputPorts.find(p => p.name === portName);
    if (!port) throw new Error(`Input port '\${portName}' not found on node '\${node.name}'.`);
    return port;
}

export const manifestationModule = {
  id: 'manifestation',
  name: 'Outputs & Displays',
  description: 'Nodes for displaying data and insights directly on the canvas.',
  atomicNodeDefinitions: [
    {
      operationType: OperationTypeEnum.DISPLAY_VALUE,
      name: 'Display Value',
      description: "Shows the input value prominently on the node.",
      category: 'Outputs & Displays',
      icon: Icons.EyeIcon,
      isArchetype: true,
      defaultConfig: {
        ...defaultFooterConfig,
        frameWidth: NODE_WIDTH, // Use NODE_WIDTH as default display width
        frameHeight: DEFAULT_DISPLAY_VALUE_CONTENT_HEIGHT // Use CONTENT_HEIGHT for frameHeight
      },
      portGenerator: (nodeId: string) => ({
        inputPorts: [{
            id: generatePortId(nodeId, 'in', 'Value'),
            name: 'Value',
            category: LogicalCategoryEnum.ANY,
            portType: PortTypeEnum.DATA,
            description: "Value to display."
        }],
        outputPorts: [],
      }),
      resolveOutputs: (node: AtomicNode, resolvedInputs: Record<string, any>) => {
        // This node doesn't produce new data outputs for other nodes.
        // Its display is updated based on its resolved input by NodeComponent.
        return {};
      },
    },
    {
      operationType: OperationTypeEnum.DISPLAY_MARKDOWN_TEXT,
      name: 'Display Markdown Text',
      description: "Renders input string as Markdown formatted text.",
      category: 'Outputs & Displays',
      icon: Icons.DocumentTextIcon,
      isArchetype: true,
      defaultConfig: {
        ...defaultFooterConfig,
        frameWidth: NODE_WIDTH, // Use NODE_WIDTH as default display width
        frameHeight: DEFAULT_DISPLAY_MARKDOWN_CONTENT_HEIGHT // Use CONTENT_HEIGHT for frameHeight
      },
      portGenerator: (nodeId: string) => ({
        inputPorts: [{
            id: generatePortId(nodeId, 'in', 'Markdown String'),
            name: 'Markdown String',
            category: LogicalCategoryEnum.STRING,
            portType: PortTypeEnum.DATA,
            description: "Markdown text to render."
        }],
        outputPorts: [],
      }),
      resolveOutputs: () => ({}),
    },
    {
      operationType: OperationTypeEnum.PROGRESS_BAR,
      name: 'Progress Bar',
      description: "Visualizes a numeric value as a progress bar.",
      category: 'Outputs & Displays',
      icon: Icons.ChartBarIcon,
      isArchetype: true,
      defaultConfig: {
        barColor: '#33C1FF',
        showPercentage: true,
        defaultMin: 0,
        defaultMax: 100,
        ...defaultFooterConfig,
        frameWidth: NODE_WIDTH, // Use NODE_WIDTH as default display width
        frameHeight: DEFAULT_PROGRESS_BAR_CONTENT_HEIGHT, // Use CONTENT_HEIGHT for frameHeight
      },
      portGenerator: (nodeId: string) => ({
        inputPorts: [
          { id: generatePortId(nodeId, 'in', 'Value'), name: 'Value', category: LogicalCategoryEnum.NUMBER, portType: PortTypeEnum.DATA, description: "Current value." },
          { id: generatePortId(nodeId, 'in', 'Min'), name: 'Min', category: LogicalCategoryEnum.NUMBER, portType: PortTypeEnum.DATA, description: "Minimum value (default 0)." },
          { id: generatePortId(nodeId, 'in', 'Max'), name: 'Max', category: LogicalCategoryEnum.NUMBER, portType: PortTypeEnum.DATA, description: "Maximum value (default 100)." },
        ],
        outputPorts: [],
      }),
      resolveOutputs: () => ({}),
    },
    {
      operationType: OperationTypeEnum.DATA_TABLE,
      name: 'Data Table',
      description: "Displays an array of objects in a tabular format.",
      category: 'Outputs & Displays',
      icon: Icons.TableCellsIcon,
      isArchetype: true,
      defaultConfig: {
        dataTableColumns: [],
        ...defaultFooterConfig,
        frameWidth: NODE_WIDTH, // Use NODE_WIDTH as default display width
        frameHeight: DEFAULT_DATA_TABLE_CONTENT_HEIGHT, // Use CONTENT_HEIGHT for frameHeight
      },
      portGenerator: (nodeId: string) => ({
        inputPorts: [{
            id: generatePortId(nodeId, 'in', 'Data'),
            name: 'Data',
            category: LogicalCategoryEnum.ARRAY,
            portType: PortTypeEnum.DATA,
            description: "Array of objects to display."
        }],
        outputPorts: [],
      }),
      resolveOutputs: () => ({}),
    },
  ] as AtomicNodeDefinition[],
  componentBlueprints: [],
};
        