
import { ComponentBlueprint, LogicalModule } from '../types';
import * as Icons from '../components/Icons'; // For fallback icon

class ComponentRegistryService {
  private registeredComponents: Map<string, ComponentBlueprint> = new Map();

  public registerComponent(blueprint: ComponentBlueprint): void {
    // Use blueprint.name as the key, assuming it's unique for components
    // Or blueprint.id if ManifestComponentEntry provides a unique ID
    const componentKey = blueprint.id || blueprint.name;
    if (this.registeredComponents.has(componentKey)) {
      console.warn(`ComponentRegistryService: Component ${componentKey} is already registered. Overwriting.`);
    }
    this.registeredComponents.set(componentKey, blueprint);
  }

  // Simulates loading from manifest and definition files
  public loadFromInitialModuleDefinition(moduleDef: LogicalModule): void {
    moduleDef.componentBlueprints?.forEach(bp => {
      this.registerComponent({
        id: bp.id || bp.name, // Ensure an ID
        name: bp.name,
        description: bp.description,
        category: bp.category || "Components", // Default category
        icon: bp.icon || Icons.CubeTransparentIcon, // Fallback icon
        creatorFunction: bp.creatorFunction,
      });
    });
  }

  public getComponentBlueprint(idOrName: string): ComponentBlueprint | undefined {
    return this.registeredComponents.get(idOrName);
  }

  public getAllComponentBlueprints(): ComponentBlueprint[] {
    return Array.from(this.registeredComponents.values()).sort((a, b) => a.name.localeCompare(b.name));
  }
}

export const componentRegistryService = new ComponentRegistryService();
