
import { OperationTypeEnum, RegisteredAtomicNodeDefinition, AtomicNodeDefinition as InitialAtomicNodeDefinitionFromFile, LogicalModule } from '../types';
import * as Icons from '../components/Icons'; // For fallback icon

class NodeRegistryService {
  private registeredNodes: Map<OperationTypeEnum, RegisteredAtomicNodeDefinition> = new Map();

  public registerNode(definition: RegisteredAtomicNodeDefinition): void {
    if (this.registeredNodes.has(definition.operationType)) {
      console.warn(`NodeRegistryService: Node type ${definition.operationType} is already registered. Overwriting.`);
    }
    this.registeredNodes.set(definition.operationType, definition);
  }

  // Simulates loading from manifest and definition files
  public loadFromInitialModuleDefinition(moduleDef: LogicalModule): void {
    moduleDef.atomicNodeDefinitions?.forEach(initialDef => {
      const registeredDef: RegisteredAtomicNodeDefinition = {
        operationType: initialDef.operationType,
        name: initialDef.name,
        description: initialDef.description,
        category: initialDef.category,
        isArchetype: initialDef.isArchetype,
        icon: initialDef.icon,
        defaultConfig: initialDef.defaultConfig,
        portGenerator: initialDef.portGenerator,
        resolveOutputs: initialDef.resolveOutputs,
        processStep: initialDef.processStep,
      };
      this.registerNode(registeredDef);
    });
  }


  public getNodeDefinition(opType: OperationTypeEnum): RegisteredAtomicNodeDefinition | undefined {
    return this.registeredNodes.get(opType);
  }

  public getAllNodeDefinitions(): RegisteredAtomicNodeDefinition[] {
    return Array.from(this.registeredNodes.values());
  }

  public getGroupedNodeDefinitionsForControls(): Record<string, {
    opType: OperationTypeEnum;
    label: string;
    icon: React.FC<React.SVGProps<SVGSVGElement>>;
    title?: string;
    isArchetype?: boolean;
  }[]> {
    const grouped: Record<string, any[]> = {};
    this.registeredNodes.forEach(def => {
      if (!grouped[def.category]) {
        grouped[def.category] = [];
      }
      grouped[def.category].push({
        opType: def.operationType,
        label: def.name,
        icon: def.icon || Icons.CogIcon, // Fallback icon
        title: def.description,
        isArchetype: def.isArchetype,
      });
    });
    Object.keys(grouped).forEach(category => {
      grouped[category].sort((a, b) => a.label.localeCompare(b.label));
    });
    return grouped;
  }
}

export const nodeRegistryService = new NodeRegistryService();
