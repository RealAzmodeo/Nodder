

export type NodeId = string;

export enum LogicalCategoryEnum {
  NUMBER = "NUMBER",
  STRING = "STRING",
  BOOLEAN = "BOOLEAN",
  OBJECT = "OBJECT",
  ARRAY = "ARRAY",
  ANY = "ANY",
  VOID = "VOID",
  // D&D Specific Categories
  DAMAGE_ROLL = "DAMAGE_ROLL",
  ATTACK_BONUS = "ATTACK_BONUS",
  CHARACTER_STAT = "CHARACTER_STAT",
  ACTION_TYPE = "ACTION_TYPE", // Renamed from ACTION
  DICE_NOTATION = "DICE_NOTATION", // e.g., "2d6", "1d20+3"
}

export enum PortTypeEnum {
  DATA = "DATA",
  EXECUTION = "EXECUTION"
}

export interface Port {
  id: string;
  name: string;
  category: LogicalCategoryEnum;
  portType: PortTypeEnum;
  description?: string;
  connectedOutputNodeId?: NodeId;
  connectedOutputPortId?: string;
  operationType?: OperationTypeEnum;
}

export interface InputPort extends Port {}
export interface OutputPort extends Port {}


export enum OperationTypeEnum {
  VALUE_PROVIDER = "VALUE_PROVIDER",
  ADDITION = "ADDITION",
  CONCATENATE = "CONCATENATE",
  LOGICAL_AND = "LOGICAL_AND",
  LOGICAL_OR = "LOGICAL_OR",
  LOGICAL_XOR = "LOGICAL_XOR",
  ASSIGN = "ASSIGN",
  UNION = "UNION",
  TO_STRING = "TO_STRING",
  EQUALS = "EQUALS",
  GREATER_THAN = "GREATER_THAN",
  IS_EMPTY = "IS_EMPTY",
  NOT = "NOT",
  LESS_THAN = "LESS_THAN",
  BRANCH = "BRANCH",
  ON_EVENT = "ON_EVENT",
  INPUT_GRAPH = "INPUT_GRAPH",
  OUTPUT_GRAPH = "OUTPUT_GRAPH",
  MOLECULAR = "MOLECULAR",
  ITERATE = "ITERATE",
  LOOP_ITEM = "LOOP_ITEM",
  ITERATION_RESULT = "ITERATION_RESULT",
  STATE = "STATE",
  RANDOM_NUMBER = "RANDOM_NUMBER",
  ROUND = "ROUND",
  FLOOR = "FLOOR",
  CEIL = "CEIL",
  SUBTRACT = "SUBTRACT",
  MULTIPLY = "MULTIPLY",
  DIVIDE = "DIVIDE",
  MODULO = "MODULO",
  GET_ITEM_AT_INDEX = "GET_ITEM_AT_INDEX",
  COLLECTION_LENGTH = "COLLECTION_LENGTH",
  GET_PROPERTY = "GET_PROPERTY",
  SET_PROPERTY = "SET_PROPERTY",
  STRING_LENGTH = "STRING_LENGTH",
  SPLIT_STRING = "SPLIT_STRING",
  SWITCH = "SWITCH",
  LOG_VALUE = "LOG_VALUE",
  CONSTRUCT_OBJECT = "CONSTRUCT_OBJECT",
  COMMENT = "COMMENT",
  FRAME = "FRAME",
  SEND_DATA = "SEND_DATA",
  RECEIVE_DATA = "RECEIVE_DATA",
  // Manifestation Nodes
  DISPLAY_VALUE = "DISPLAY_VALUE",
  DISPLAY_MARKDOWN_TEXT = "DISPLAY_MARKDOWN_TEXT",
  PROGRESS_BAR = "PROGRESS_BAR",
  DATA_TABLE = "DATA_TABLE",
  // D&D Player's Toolkit Nodes ("Arcanum Instrumentum")
  DICE_ROLLER = "DICE_ROLLER",                // D&D: Core Mechanics
  VISUAL_DICE_ROLLER = "VISUAL_DICE_ROLLER",  // D&D: Core Mechanics - New visual dice node
  ADVANTAGE_ROLL = "ADVANTAGE_ROLL",          // D&D: Core Mechanics
  CHECK_DC = "CHECK_DC",                      // D&D: Core Mechanics
  WEAPON_ATTACK = "WEAPON_ATTACK",            // D&D: Equipment & Items
  ARMOR_CLASS = "ARMOR_CLASS",                // D&D: Equipment & Items
  CHARACTER_ABILITY_SCORE = "CHARACTER_ABILITY_SCORE", // D&D: Character Attributes
  SKILL_PROFICIENCY = "SKILL_PROFICIENCY",    // D&D: Character Attributes
  SPELL_SLOT_TRACKER = "SPELL_SLOT_TRACKER",  // D&D: Spells & Abilities
  CAST_SPELL = "CAST_SPELL",                  // D&D: Spells & Abilities
  RESOURCE_TRACKER = "RESOURCE_TRACKER",      // D&D: Character Attributes (e.g. Ki, Sorcery points)
}

export interface SwitchCaseConfig {
  id: string;
  caseValue: any;
  outputValue: any;
}

export interface NodeConfig {
  value?: any;
  inputPortOverrides?: Record<string, any>;
  externalPortName?: string;
  externalPortCategory?: LogicalCategoryEnum;
  maxIterations?: number;
  stateId?: string;
  initialValue?: any;
  eventName?: string;
  defaultMin?: number;
  defaultMax?: number;
  switchCases?: SwitchCaseConfig[];
  switchDefaultValue?: any;
  commentText?: string;
  frameTitle?: string;
  frameWidth?: number;
  frameHeight?: number;
  channelName?: string;
  splitDelimiter?: string;
  footerNoteText?: string;
  showFooterNote?: boolean;
  // Config for PROGRESS_BAR
  barColor?: string;
  showPercentage?: boolean;
  // Config for DATA_TABLE
  dataTableColumns?: string[]; // Optional: explicit column keys and order
  
  // Configs for D&D Nodes
  diceNotation?: string; // For DICE_ROLLER (e.g., "2d6+3")
  diceFaces?: number; // For VISUAL_DICE_ROLLER (e.g., 6, 20, 100)
  lastRoll?: number; // For VISUAL_DICE_ROLLER, to store/display the result
  targetDC?: number; // For CHECK_DC
  abilityScoreName?: string; // For CHARACTER_ABILITY_SCORE (e.g., "Strength")
  baseArmorClass?: number; // For ARMOR_CLASS
  resourceName?: string; // For RESOURCE_TRACKER
  maxResourceValue?: number; // For RESOURCE_TRACKER
  spellName?: string; // For CAST_SPELL
  spellLevel?: number; // For CAST_SPELL

  [key: string]: any;
}

export interface NodeForm {
  id: NodeId;
  name: string;
  type: 'Atomic' | 'Molecular';
  operationType: OperationTypeEnum;
  description?: string;
  inputPorts: InputPort[];
  outputPorts: OutputPort[];
  position: { x: number; y: number };
  isStartNode?: boolean;
  config?: NodeConfig;
}

export interface AtomicNode extends NodeForm {
  type: 'Atomic';
}

export interface MolecularNode extends NodeForm {
  type: 'Molecular';
  subGraph: {
    nodes: AnyNode[];
    connections: Connection[];
  };
}

export type AnyNode = AtomicNode | MolecularNode;

export interface ComponentBlueprint {
  name: string;
  description: string;
  icon?: React.FC<React.SVGProps<SVGSVGElement>>;
  creatorFunction: () => MolecularNode;
  id?: string; 
  category?: string; 
}


export interface Connection {
  id: string;
  fromNodeId: NodeId;
  fromPortId: string;
  toNodeId: NodeId;
  toPortId: string;
  reroutePoints?: Array<{x: number, y: number}>;
}

export type ExecutionContext = Record<string, any>;

export type SteppingMode = 'run' | 'step_over' | 'step_into' | 'step_out' | null;

export interface ExecutionMetaState {
  visitedNodesTrace: NodeId[];
  fullExecutionPath: {nodeId: NodeId, operation: OperationTypeEnum}[];
  cycleDepth: number;
  maxCycleDepth: number;
  log: { timestamp: number; nodeId?: NodeId; message: string; type: 'info' | 'error' | 'success' | 'debug' | 'agent_plan' }[];
  status: 'idle' | 'running' | 'completed' | 'error' | 'paused' | 'stopped';
  error?: string;
  globalStateStore: Map<string, any>;
  pausedNodeId?: NodeId | null;
  steppingMode?: SteppingMode;
  pulsingNodeInfo?: { nodeId: NodeId; pulseKey: number } | null;
  pulsingConnectionInfo?: {
    connectionId: string;
    pulseKey: number;
    sourcePortCategory: LogicalCategoryEnum;
    isExecutionPulse: boolean;
  } | null;
  currentIterationOutput?: any; // Added for ITERATE sub-graph communication
}

export enum TerminalStateReasonEnum {
  SUCCESS = "Execution completed successfully.",
  ERROR_CYCLE_DETECTED = "Execution halted: Cycle detected exceeding max depth.",
  ERROR_RUNTIME_CYCLE_DETECTED = "Execution halted: Runtime cycle detected in execution path.",
  ERROR_STRUCTURAL_CYCLE_IN_DEPENDENCIES = "Resolution failed: Required dependency graph contains a cycle.",
  ERROR_MAX_STEPS_EXCEEDED = "Execution halted: Maximum execution steps exceeded.",
  ERROR_VALIDATION = "Execution halted: Input validation failed.",
  ERROR_OPERATION_FAILED = "Execution halted: Node operation failed.",
  ERROR_MISSING_INPUT = "Execution halted: Required input missing.",
  ERROR_TARGET_NODE_NOT_FOUND = "Resolution failed: Target node not found.",
  ERROR_TARGET_PORT_NOT_FOUND = "Resolution failed: Target port not found.",
  ERROR_UNREACHABLE_TARGET = "Resolution failed: Target node is unreachable or has no valid dependency path.",
  MANUAL_STOP = "Execution stopped manually.",
  ERROR_ITERATION_FAILED = "Execution halted: An iteration within an ITERATE node failed.",
  ERROR_INVALID_ITERATION_COLLECTION = "Execution halted: ITERATE node 'Collection' input is not an array.",
  ERROR_STATE_ID_MISSING = "Execution halted: STATE node is missing a 'State ID' in its configuration.",
  ERROR_EVENT_NAME_MISSING = "Execution halted: ON_EVENT node is missing an 'Event Name' in its configuration.",
  ERROR_DIVISION_BY_ZERO = "Execution halted: Division by zero attempted.",
  ERROR_INVALID_RANGE = "Execution halted: Invalid range provided (e.g., Min >= Max for RANDOM_NUMBER).",
  ERROR_INVALID_INPUT_TYPE = "Execution halted: Invalid input type for operation.",
  ERROR_SWITCH_NO_MATCH = "Execution Info: SWITCH node had no matching case and no default value defined.",
  ERROR_CHANNEL_NAME_MISSING = "Execution halted: SEND_DATA or RECEIVE_DATA node is missing a 'Channel Name'."
}

export interface ExecutionResult {
  requestedValue?: any;
  resolvedStates: ExecutionContext;
  finalMetaState: ExecutionMetaState;
}

export interface ConnectingState {
  active: boolean;
  sourceNodeId: NodeId | null;
  sourcePortId: string | null;
  sourcePosition: { x: number; y: number } | null;
  mousePosition: { x: number; y: number };
}

export interface ScopeStackItem {
  id: NodeId | 'root';
  name: string;
}

export interface NodeContextMenuState {
  visible: boolean;
  screenX: number;
  screenY: number;
  targetWorldX: number;
  targetWorldY: number;
  sourceNodeId: NodeId;
  sourcePortId: string;
  sourceNode: AnyNode;
  sourcePort: OutputPort | InputPort;
}

export interface NodeCreationContextMenuState {
  visible: boolean;
  screenX: number;
  screenY: number;
  worldX: number;
  worldY: number;
  sourceNodeId: NodeId;
  sourcePortId: string;
  sourcePort: OutputPort;
}


export type NodeResizeEndHandler = (nodeId: NodeId, dimensions: { width: number; height: number }) => void;

export type Breakpoints = Set<NodeId>;

export interface HistoryEntry {
  nodes: AnyNode[];
  connections: Connection[];
  scopeStack: ScopeStackItem[];
  currentGraphId: NodeId | 'root';
  selectedNodeIds: NodeId[];
  breakpoints: Breakpoints;
}

// --- Module System Types (Refactored) ---

// Represents the structure of what's exported from a node's "definitionPath" file.
export interface LoadedNodeLogicModule {
  icon: React.FC<React.SVGProps<SVGSVGElement>>;
  defaultConfig: Partial<NodeConfig>;
  portGenerator: (nodeId: NodeId, config?: Partial<NodeConfig>) => { inputPorts: InputPort[]; outputPorts: OutputPort[]; };
  // The execute function for data-pull model
  resolveOutputs?: (
    node: AtomicNode,
    resolvedInputs: Record<string, any>,
    executionContext: ExecutionContext,
    metaState: ExecutionMetaState,
    allNodesForPulseContext: AnyNode[],
    iterationData?: any // Consider a more specific IterationData type
  ) => Promise<Partial<ExecutionContext>> | Partial<ExecutionContext>;
  // The execute function for event-driven/push model (for nodes with side effects or specific exec flow)
  processStep?: (
    node: AtomicNode,
    triggeredByExecPortId: string | null, // ID of the input exec port that was triggered
    allNodes: AnyNode[],
    allConnections: Connection[],
    resolvedStates: ExecutionContext, // Current data context
    metaState: ExecutionMetaState,
    resolveOutputFn?: ( // Optional function for on-demand data resolution
        targetNodeId: NodeId,
        targetPortId: string,
        nodes: AnyNode[],
        connections: Connection[],
        initialMetaStateConfig: Partial<Omit<ExecutionMetaState, 'globalStateStore' | 'pulsingConnectionInfo'>> & { globalStateStore: Map<string, any> }
    ) => Promise<ExecutionResult>
  ) => Promise<{ nextExecOutputs?: { portId: string; targetNodeId: NodeId; targetPortId: string; connectionId: string; }[] }>; // Returns IDs of output exec ports to pulse
}

// Represents the full definition stored in NodeRegistryService
export interface RegisteredAtomicNodeDefinition extends LoadedNodeLogicModule {
  operationType: OperationTypeEnum; // From manifest
  name: string;                     // From manifest
  description: string;              // From manifest
  category: string;                 // From manifest
  isArchetype?: boolean;            // From manifest
}

// Structure of a node entry in manifest.json (simulated)
export interface ManifestNodeEntry {
  type: OperationTypeEnum; // Renamed from operationType for clarity in manifest context
  name: string;
  description: string;
  category: string;
  isArchetype?: boolean;
  // definitionPath: string; // Path to the file exporting LoadedNodeLogicModule parts
  // For simulation, we'll embed the LoadedNodeLogicModule parts directly in the existing AtomicNodeDefinition
}

// Simulating the old AtomicNodeDefinition but now it includes the execute functions
// This is what will be in modules/*.ts for now
export interface AtomicNodeDefinition extends LoadedNodeLogicModule {
  operationType: OperationTypeEnum; // This is the "type" from ManifestNodeEntry
  name: string; // From ManifestNodeEntry
  description: string; // From ManifestNodeEntry
  category: string; // From ManifestNodeEntry
  isArchetype?: boolean; // From ManifestNodeEntry
}


// Structure of a component entry in manifest.json (simulated)
export interface ManifestComponentEntry {
  id: string;
  name: string;
  description: string;
  category: string;
  icon?: React.FC<React.SVGProps<SVGSVGElement>>; // Keep icon directly for simplicity
  // blueprintPath: string; // Path to blueprint JSON file
  // For simulation, ComponentBlueprint already has creatorFunction which implies the blueprint
  creatorFunction: () => MolecularNode;
}

// Structure of a module manifest (simulated by LogicalModule for now)
export interface ModuleManifest {
  id: string;
  name: string;
  version: string;
  nodes?: ManifestNodeEntry[]; // Conceptually, these would point to definitionPath files
  components?: ManifestComponentEntry[]; // Conceptually, these would point to blueprintPath files
}

// Existing LogicalModule will serve as the "simulated manifest"
// We will add the execute functions to AtomicNodeDefinition inside each module file.
export interface LogicalModule {
  id: string;
  name: string;
  description: string;
  atomicNodeDefinitions?: AtomicNodeDefinition[]; // Will now include execute functions
  componentBlueprints?: ComponentBlueprint[]; // Will be used as ManifestComponentEntry
  enabledByDefault?: boolean;
}


// Agent Related Types
export interface AgentPlannedNode {
  tempId: string;
  operationType: OperationTypeEnum;
  name: string;
  config?: Partial<NodeConfig>;
  position: { x: number; y: number };
}

export interface AgentPlannedConnection {
  fromNodeTempId: string;
  fromPortName: string;
  toNodeTempId: string;
  toPortName: string;
}

export interface AgentPlan {
  planSummary: string;
  nodesToCreate: AgentPlannedNode[];
  connectionsToCreate: AgentPlannedConnection[];
}

// --- Quick Shelf Types ---
export interface QuickShelfItem {
  id: string;
  type: 'atomic' | 'blueprint';
  operationType?: OperationTypeEnum;
  blueprintName?: string;
  icon: React.FC<React.SVGProps<SVGSVGElement>>;
  label: string;
}

// --- Universal Search / Command Bar Autocomplete ---
export interface AutocompleteItem {
  id: string;
  type: 'atomic' | 'blueprint';
  name: string;
  icon: React.FC<React.SVGProps<SVGSVGElement>>;
  operationType?: OperationTypeEnum;
  blueprintCreatorFunction?: () => MolecularNode;
}

// --- Quick Inspect Popover Types ---
export interface QuickInspectField {
  key: keyof NodeConfig | string;
  label: string;
  type: 'text' | 'number' | 'boolean' | 'textarea' | 'select';
  options?: {value: string | number | boolean, label: string}[];
}

export interface QuickInspectData {
  node: AnyNode;
  position: { top: number; left: number; };
  fields: QuickInspectField[];
}

// --- Floating Panel Types ---
export interface FloatingPanelData {
  id: string;
  title?: string; 
  position: { x: number; y: number }; // Screen coordinates
  width: number;  // Screen width
  height: number; // Screen height
  zIndex?: number;
  // Content is determined by the panel's id or a specific component prop later
}
