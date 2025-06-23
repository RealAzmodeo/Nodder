
import { useState, useCallback, useEffect } from 'react';
import { OperationTypeEnum, QuickShelfItem, ComponentBlueprint } from '../types';
import { nodeRegistryService } from '../services/NodeRegistryService';
import { componentRegistryService } from '../services/ComponentRegistryService';
import * as Icons from '../components/Icons';

const QUICK_SHELF_STORAGE_KEY = 'nodeGraphQuickShelfItems_v1';

// Helper to get icon for an operation type
const getIconForOperationType = (opType: OperationTypeEnum): React.FC<React.SVGProps<SVGSVGElement>> => {
  const nodeDef = nodeRegistryService.getNodeDefinition(opType);
  return nodeDef?.icon || Icons.CogIcon; // Fallback icon
};

// Helper to get icon for a blueprint
const getIconForBlueprint = (blueprintNameOrId: string): React.FC<React.SVGProps<SVGSVGElement>> => {
    const blueprint = componentRegistryService.getComponentBlueprint(blueprintNameOrId);
    return blueprint?.icon || Icons.CubeTransparentIcon; // Fallback icon for blueprints
};


export const useQuickShelf = () => {
  const [quickShelfItems, setQuickShelfItems] = useState<QuickShelfItem[]>([]);

  useEffect(() => {
    try {
      const storedItemsRaw = localStorage.getItem(QUICK_SHELF_STORAGE_KEY);
      if (storedItemsRaw) {
        const storedItemsParsed: Omit<QuickShelfItem, 'icon'>[] = JSON.parse(storedItemsRaw);
        // Rehydrate with actual icon components
        const rehydratedItems = storedItemsParsed.map(item => ({
            ...item,
            icon: item.type === 'atomic' && item.operationType 
                  ? getIconForOperationType(item.operationType) 
                  : item.type === 'blueprint' && item.blueprintName 
                  ? getIconForBlueprint(item.blueprintName) // Use blueprintName as identifier
                  : Icons.CogIcon,
        }));
        setQuickShelfItems(rehydratedItems);
      }
    } catch (error) {
      console.error("Failed to load quick shelf items from localStorage:", error);
      setQuickShelfItems([]);
    }
  }, []);

  const saveToLocalStorage = useCallback((items: QuickShelfItem[]) => {
    try {
      // Store without the icon component, just the identifiers
      const itemsToStore = items.map(({ icon, ...rest }) => rest);
      localStorage.setItem(QUICK_SHELF_STORAGE_KEY, JSON.stringify(itemsToStore));
    } catch (error) {
      console.error("Failed to save quick shelf items to localStorage:", error);
    }
  }, []);

  const addQuickShelfItem = useCallback((itemToAdd: Omit<QuickShelfItem, 'id'> & { id?: string }) => {
    setQuickShelfItems(prevItems => {
      const existingItem = prevItems.find(item => 
        item.type === itemToAdd.type && 
        (item.type === 'atomic' ? item.operationType === itemToAdd.operationType : item.blueprintName === itemToAdd.blueprintName)
      );
      if (existingItem) {
        return prevItems; // Already exists
      }
      const newItemId = itemToAdd.id || (itemToAdd.type === 'atomic' && itemToAdd.operationType ? itemToAdd.operationType : itemToAdd.blueprintName!);
      const fullNewItem: QuickShelfItem = { ...itemToAdd, id: newItemId };
      
      const updatedItems = [...prevItems, fullNewItem];
      saveToLocalStorage(updatedItems);
      return updatedItems;
    });
  }, [saveToLocalStorage]);

  const removeQuickShelfItem = useCallback((itemIdToRemove: string) => {
    setQuickShelfItems(prevItems => {
      const updatedItems = prevItems.filter(item => item.id !== itemIdToRemove);
      saveToLocalStorage(updatedItems);
      return updatedItems;
    });
  }, [saveToLocalStorage]);

  return {
    quickShelfItems,
    addQuickShelfItem,
    removeQuickShelfItem,
  };
};
