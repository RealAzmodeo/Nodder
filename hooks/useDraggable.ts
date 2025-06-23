
import React, { useState, useCallback, useRef, RefObject } from 'react';

// Helper to convert screen/SVG coordinates to world coordinates
const screenToWorld = (
  screenX: number,
  screenY: number,
  panX: number,
  panY: number,
  zoom: number,
  svgCTM: DOMMatrix | null
): { x: number; y: number } => {
  if (!svgCTM) return { x: screenX, y: screenY }; // Fallback if CTM is not available

  // Convert client/screen coordinates to SVG's coordinate system first
  const svgPointX = (screenX - svgCTM.e) / svgCTM.a;
  const svgPointY = (screenY - svgCTM.f) / svgCTM.d;
  
  // Then convert from SVG's coordinate system to world coordinates
  return {
    x: (svgPointX - panX) / zoom,
    y: (svgPointY - panY) / zoom,
  };
};


interface DraggableOptions {
  initialPosition: { x: number; y: number };
  onDrag: (pos: { x: number; y: number }) => void;
  svgRef: RefObject<SVGSVGElement | null>;
  panOffsetRef: RefObject<{ x: number; y: number }>; // Ref to current pan offset
  zoomLevelRef: RefObject<number>; // Ref to current zoom level
}

interface DraggableState {
  isDragging: boolean;
  dragStartWorldPos: { x: number; y: number }; // Initial world position of the node at drag start
  dragStartMouseWorldPos: { x: number; y: number }; // Initial mouse position in world coords at drag start
}

export function useDraggableNode(options: DraggableOptions) {
  const { initialPosition, onDrag, svgRef, panOffsetRef, zoomLevelRef } = options;
  const [position, setPosition] = useState(initialPosition); // Position is in world coordinates
  const [dragState, setDragState] = useState<DraggableState>({ 
    isDragging: false, 
    dragStartWorldPos: { x: 0, y: 0 },
    dragStartMouseWorldPos: { x: 0, y: 0 }
  });
  const nodeRef = useRef<SVGForeignObjectElement | null>(null);

  const handleMouseDown = useCallback((event: React.MouseEvent) => {
    event.stopPropagation();
    if (!svgRef.current || !panOffsetRef.current || zoomLevelRef.current === undefined) return;

    const CTM = svgRef.current.getScreenCTM();
    if (!CTM) return;

    const currentMouseWorldPos = screenToWorld(
      event.clientX, 
      event.clientY, 
      panOffsetRef.current.x, 
      panOffsetRef.current.y, 
      zoomLevelRef.current,
      CTM
    );
    
    setDragState({
      isDragging: true,
      dragStartWorldPos: position, // Current world position of the node
      dragStartMouseWorldPos: currentMouseWorldPos,
    });
  }, [svgRef, panOffsetRef, zoomLevelRef, position]);

  const handleMouseMove = useCallback((event: MouseEvent) => {
    if (!dragState.isDragging || !svgRef.current || !panOffsetRef.current || zoomLevelRef.current === undefined) return;
    event.stopPropagation();
    
    const CTM = svgRef.current.getScreenCTM();
    if (!CTM) return;

    const currentMouseWorldPos = screenToWorld(
      event.clientX,
      event.clientY,
      panOffsetRef.current.x,
      panOffsetRef.current.y,
      zoomLevelRef.current,
      CTM
    );

    const deltaX = currentMouseWorldPos.x - dragState.dragStartMouseWorldPos.x;
    const deltaY = currentMouseWorldPos.y - dragState.dragStartMouseWorldPos.y;

    const newX = dragState.dragStartWorldPos.x + deltaX;
    const newY = dragState.dragStartWorldPos.y + deltaY;
    
    setPosition({ x: newX, y: newY });
    onDrag({ x: newX, y: newY });
  }, [dragState, onDrag, svgRef, panOffsetRef, zoomLevelRef]);

  const handleMouseUp = useCallback((event: MouseEvent) => {
    if (!dragState.isDragging) return;
    event.stopPropagation();
    setDragState(prev => ({ ...prev, isDragging: false }));
  }, [dragState.isDragging]);

  React.useEffect(() => {
    if (dragState.isDragging) {
      window.addEventListener('mousemove', handleMouseMove);
      window.addEventListener('mouseup', handleMouseUp);
    }
    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
    };
  }, [dragState.isDragging, handleMouseMove, handleMouseUp]);

  React.useEffect(() => {
    setPosition(initialPosition);
  }, [initialPosition]);

  return {
    position, // This is world position
    handleMouseDown,
    nodeRef,
  };
}
