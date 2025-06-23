
import { useState, useCallback, useRef } from 'react';
import { AnyNode, QuickInspectData, QuickInspectField, NodeId } from '../types'; // Added NodeId import

const QUICK_INSPECT_DELAY = 1200; // ms

export interface UseQuickInspectReturn {
  quickInspectPopoverData: QuickInspectData | null;
  isQuickInspectTargetNode: (nodeId: NodeId) => boolean;
  showQuickInspectWithDelay: (node: AnyNode, getRect: () => DOMRect | undefined, getFields: (n: AnyNode) => QuickInspectField[]) => void;
  hideQuickInspect: () => void;
  resetQuickInspectTimer: (node: AnyNode, getRect: () => DOMRect | undefined, getFields: (n: AnyNode) => QuickInspectField[]) => void;
  clearQuickInspectTimer: () => void;
  openQuickInspectImmediately: (node: AnyNode, position: { top: number; left: number }, fields: QuickInspectField[]) => void;
}

export const useQuickInspect = (): UseQuickInspectReturn => {
  const [quickInspectPopoverData, setQuickInspectPopoverData] = useState<QuickInspectData | null>(null);
  const popoverTimerRef = useRef<number | null>(null);

  const clearQuickInspectTimer = useCallback(() => {
    if (popoverTimerRef.current) {
      clearTimeout(popoverTimerRef.current);
      popoverTimerRef.current = null;
    }
  }, []);

  const openQuickInspectImmediately = useCallback((node: AnyNode, position: { top: number; left: number }, fields: QuickInspectField[]) => {
    clearQuickInspectTimer();
    if (fields.length > 0) {
        setQuickInspectPopoverData({ node, position, fields });
    }
  }, [clearQuickInspectTimer]);


  const showQuickInspectWithDelay = useCallback((
    node: AnyNode,
    getRect: () => DOMRect | undefined,
    getFields: (n: AnyNode) => QuickInspectField[]
  ) => {
    clearQuickInspectTimer(); // Clear any existing timer
    
    // Don't set a new timer if a popover is already open for a *different* node, or if it's open for this one.
    if (quickInspectPopoverData && quickInspectPopoverData.node.id !== node.id) {
       return; // A popover for another node is already active, don't start a new timer.
    }
    if (quickInspectPopoverData && quickInspectPopoverData.node.id === node.id) {
        return; // Popover for this node is already active.
    }


    popoverTimerRef.current = window.setTimeout(() => {
      const rect = getRect();
      if (rect) {
        const fields = getFields(node);
        if (fields.length > 0) {
          setQuickInspectPopoverData({ node, position: { top: rect.top - 10, left: rect.right + 10 }, fields });
        }
      }
      popoverTimerRef.current = null;
    }, QUICK_INSPECT_DELAY);
  }, [clearQuickInspectTimer, quickInspectPopoverData]);

  const hideQuickInspect = useCallback(() => {
    clearQuickInspectTimer();
    setQuickInspectPopoverData(null);
  }, [clearQuickInspectTimer]);

  const resetQuickInspectTimer = useCallback((
    node: AnyNode,
    getRect: () => DOMRect | undefined,
    getFields: (n: AnyNode) => QuickInspectField[]
  ) => {
    // Only reset timer if a popover isn't already visible for the current node
    if (!quickInspectPopoverData || quickInspectPopoverData.node.id !== node.id) {
      showQuickInspectWithDelay(node, getRect, getFields);
    }
  }, [quickInspectPopoverData, showQuickInspectWithDelay]);


  const isQuickInspectTargetNode = useCallback((nodeId: NodeId): boolean => {
    return quickInspectPopoverData?.node.id === nodeId;
  }, [quickInspectPopoverData]);

  return {
    quickInspectPopoverData,
    isQuickInspectTargetNode,
    showQuickInspectWithDelay,
    hideQuickInspect,
    resetQuickInspectTimer,
    clearQuickInspectTimer,
    openQuickInspectImmediately,
  };
};
