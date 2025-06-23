
import { allModules } from '../modules'; // Assuming this is the entry point for all module definitions
import { nodeRegistryService } from './NodeRegistryService';
import { componentRegistryService } from './ComponentRegistryService';
import { LogicalModule } from '../types';

class ModuleLoaderService {
  private hasLoaded: boolean = false;

  public async loadModules(): Promise<void> {
    if (this.hasLoaded) {
      console.warn("ModuleLoaderService: Modules already loaded.");
      return;
    }

    console.log("ModuleLoaderService: Starting module discovery and loading...");

    // Simulate iterating over discovered module manifests
    // In a real scenario, this would involve FS scanning or importing a registry file.
    // Here, we use the pre-defined `allModules` array.
    for (const moduleDefinition of allModules) {
      try {
        console.log(`ModuleLoaderService: Processing module "${moduleDefinition.name}" (ID: ${moduleDefinition.id})`);

        // Register atomic nodes from this module
        if (moduleDefinition.atomicNodeDefinitions) {
          // Pass the whole initial module definition to the registry service
          // The registry service will extract and process atomicNodeDefinitions
          nodeRegistryService.loadFromInitialModuleDefinition(moduleDefinition);
        }

        // Register component blueprints from this module
        if (moduleDefinition.componentBlueprints) {
           // Pass the whole initial module definition to the registry service
          // The registry service will extract and process componentBlueprints
          componentRegistryService.loadFromInitialModuleDefinition(moduleDefinition);
        }
        console.log(`ModuleLoaderService: Successfully processed module "${moduleDefinition.name}".`);
      } catch (error) {
        console.error(`ModuleLoaderService: Failed to load module "${moduleDefinition.name}". Error:`, error);
        // Continue to next module, do not halt application
      }
    }

    this.hasLoaded = true;
    console.log("ModuleLoaderService: All modules processed.");
    console.log("Registered Atomic Nodes:", nodeRegistryService.getAllNodeDefinitions().map(n => n.operationType));
    console.log("Registered Components:", componentRegistryService.getAllComponentBlueprints().map(c => c.name));
  }
}

export const moduleLoaderService = new ModuleLoaderService();
