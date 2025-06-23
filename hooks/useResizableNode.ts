import React, { useState, useCallback, useRef, RefObject, useEffect } from 'react';
import { NodeId, NodeResizeEndHandler } from '../types';
import { MIN_RESIZABLE_NODE_WIDTH, MIN_RESIZABLE_NODE_HEIGHT, RESIZE_HANDLE_SIZE } from '../constants';

interface ResizableNodeOptions {
  nodeId: NodeId;
  initialDimensions: { width: number; height: number };
  onResizeEnd: NodeResizeEndHandler;
  svgRef: RefObject<SVGSVGElement | null>;
  panOffsetRef: RefObject<{ x: number; y: number }>;
  zoomLevelRef: RefObject<number>;
  isSelected: boolean; // To control visibility of the handle
}

interface ResizeState {
  isResizing: boolean;
  startMousePos: { x: number; y: number }; // Screen coordinates
  startDimensions: { width: number; height: number }; // World dimensions
}

export function useResizableNode(options: ResizableNodeOptions) {
  const { nodeId, initialDimensions, onResizeEnd, svgRef, panOffsetRef, zoomLevelRef, isSelected } = options;
  const [currentDimensions, setCurrentDimensions] = useState(initialDimensions);
  
  const [resizeState, setResizeState] = useState<ResizeState>({
    isResizing: false,
    startMousePos: { x: 0, y: 0 },
    startDimensions: { width: initialDimensions.width, height: initialDimensions.height },
  });

  const resizeHandleRef = useRef<SVGRectElement | null>(null);

  useEffect(() => {
    setCurrentDimensions(initialDimensions);
  }, [initialDimensions]);

  const handleMouseDown = useCallback((event: React.MouseEvent<SVGRectElement>) => {
    event.stopPropagation(); // Stop propagation to prevent node dragging
    event.preventDefault();

    if (!svgRef.current || !panOffsetRef.current || zoomLevelRef.current === undefined) return;
    
    setResizeState({
      isResizing: true,
      startMousePos: { x: event.clientX, y: event.clientY },
      startDimensions: currentDimensions, // Current world dimensions
    });
  }, [svgRef, panOffsetRef, zoomLevelRef, currentDimensions]);

  const handleMouseMove = useCallback((event: MouseEvent) => {
    if (!resizeState.isResizing || !zoomLevelRef.current) return;
    event.stopPropagation();

    const deltaScreenX = event.clientX - resizeState.startMousePos.x;
    const deltaScreenY = event.clientY - resizeState.startMousePos.y;

    // Convert screen delta to world delta
    const deltaWorldX = deltaScreenX / zoomLevelRef.current;
    const deltaWorldY = deltaScreenY / zoomLevelRef.current;

    let newWidth = resizeState.startDimensions.width + deltaWorldX;
    let newHeight = resizeState.startDimensions.height + deltaWorldY;

    newWidth = Math.max(MIN_RESIZABLE_NODE_WIDTH, newWidth);
    newHeight = Math.max(MIN_RESIZABLE_NODE_HEIGHT, newHeight);
    
    setCurrentDimensions({ width: newWidth, height: newHeight });
    // Note: onResizeEnd is called on mouse up to avoid too many state updates in App.tsx
  }, [resizeState, zoomLevelRef]);

  const handleMouseUp = useCallback((event: MouseEvent) => {
    if (!resizeState.isResizing) return;
    event.stopPropagation();
    
    onResizeEnd(nodeId, currentDimensions);
    setResizeState(prev => ({ ...prev, isResizing: false }));
  }, [resizeState.isResizing, onResizeEnd, nodeId, currentDimensions]);

  useEffect(() => {
    if (resizeState.isResizing) {
      window.addEventListener('mousemove', handleMouseMove);
      window.addEventListener('mouseup', handleMouseUp);
    }
    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
    };
  }, [resizeState.isResizing, handleMouseMove, handleMouseUp]);

  return {
    currentDimensions,
    handleResizeMouseDown: handleMouseDown,
    resizeHandleRef,
    isHandleVisible: isSelected, // Only show handle if selected (or always if preferred)
  };
}
