
import { useState, useCallback } from 'react';
import { AnyNode, Connection, NodeId, ScopeStackItem, Breakpoints, HistoryEntry } from '../types';

const MAX_HISTORY_SIZE = 50;

export interface GraphStateForHistory extends Omit<HistoryEntry, 'selectedNodeIds' | 'breakpoints'> {}

export interface HistorySelectionStateCallbacks {
  setGraphState: (graphData: GraphStateForHistory) => void;
  clearExecutionState: () => void;
}

export const useHistorySelectionState = () => {
  const [historyStack, setHistoryStack] = useState<HistoryEntry[]>([]);
  const [currentHistoryIndex, setCurrentHistoryIndex] = useState<number>(-1);
  const [currentSelectedNodeIds, setCurrentSelectedNodeIds] = useState<NodeId[]>([]);
  const [currentBreakpoints, setCurrentBreakpoints] = useState<Breakpoints>(new Set());

  const canUndo = currentHistoryIndex > 0;
  const canRedo = currentHistoryIndex < historyStack.length - 1;

  const initializeHistory = useCallback((graphState: GraphStateForHistory) => {
    const initialEntry: HistoryEntry = {
      ...graphState,
      selectedNodeIds: [],
      breakpoints: new Set(),
    };
    setHistoryStack([initialEntry]);
    setCurrentHistoryIndex(0);
    setCurrentSelectedNodeIds([]);
    setCurrentBreakpoints(new Set());
  }, []);

  const recordHistoryEntry = useCallback((
    graphState: GraphStateForHistory,
    newSelectedIds?: NodeId[],
    newBreakpointsSet?: Breakpoints
  ) => {
    const selectedIdsToRecord = newSelectedIds !== undefined ? newSelectedIds : currentSelectedNodeIds;
    const breakpointsToRecord = newBreakpointsSet !== undefined ? newBreakpointsSet : currentBreakpoints;

    setHistoryStack(prevHistory => {
      const nextHistorySlice = prevHistory.slice(0, currentHistoryIndex + 1);
      const newEntry: HistoryEntry = {
        nodes: JSON.parse(JSON.stringify(graphState.nodes)),
        connections: JSON.parse(JSON.stringify(graphState.connections)),
        scopeStack: JSON.parse(JSON.stringify(graphState.scopeStack)),
        currentGraphId: graphState.currentGraphId,
        selectedNodeIds: JSON.parse(JSON.stringify(selectedIdsToRecord)),
        breakpoints: new Set(breakpointsToRecord),
      };
      const updatedHistory = [...nextHistorySlice, newEntry];
      if (updatedHistory.length > MAX_HISTORY_SIZE) {
        return updatedHistory.slice(updatedHistory.length - MAX_HISTORY_SIZE);
      }
      return updatedHistory;
    });
    setCurrentHistoryIndex(prevIndex => Math.min(prevIndex + 1, MAX_HISTORY_SIZE - 1));
     // Update internal state if new values were explicitly passed for the recording
    if (newSelectedIds !== undefined) setCurrentSelectedNodeIds(newSelectedIds);
    if (newBreakpointsSet !== undefined) setCurrentBreakpoints(newBreakpointsSet);
  }, [currentHistoryIndex, currentSelectedNodeIds, currentBreakpoints]);

  const undo = useCallback((callbacks: HistorySelectionStateCallbacks) => {
    if (canUndo) {
      const prevState = historyStack[currentHistoryIndex - 1];
      setCurrentHistoryIndex(prev => prev - 1);
      callbacks.setGraphState({
        nodes: prevState.nodes,
        connections: prevState.connections,
        scopeStack: prevState.scopeStack,
        currentGraphId: prevState.currentGraphId,
      });
      setCurrentSelectedNodeIds(prevState.selectedNodeIds);
      setCurrentBreakpoints(prevState.breakpoints);
      callbacks.clearExecutionState();
    }
  }, [historyStack, currentHistoryIndex, canUndo]);

  const redo = useCallback((callbacks: HistorySelectionStateCallbacks) => {
    if (canRedo) {
      const nextState = historyStack[currentHistoryIndex + 1];
      setCurrentHistoryIndex(prev => prev + 1);
      callbacks.setGraphState({
        nodes: nextState.nodes,
        connections: nextState.connections,
        scopeStack: nextState.scopeStack,
        currentGraphId: nextState.currentGraphId,
      });
      setCurrentSelectedNodeIds(nextState.selectedNodeIds);
      setCurrentBreakpoints(nextState.breakpoints);
      callbacks.clearExecutionState();
    }
  }, [historyStack, currentHistoryIndex, canRedo]);

  const updateSelectedNodesAndRecord = useCallback((
    newNodeIds: NodeId[],
    graphStateForHistory: GraphStateForHistory
  ) => {
    setCurrentSelectedNodeIds(newNodeIds);
    recordHistoryEntry(graphStateForHistory, newNodeIds, currentBreakpoints);
  }, [recordHistoryEntry, currentBreakpoints]);

  const updateBreakpointsAndRecord = useCallback((
    newBreakpointsSet: Breakpoints,
    graphStateForHistory: GraphStateForHistory
  ) => {
    setCurrentBreakpoints(newBreakpointsSet);
    recordHistoryEntry(graphStateForHistory, currentSelectedNodeIds, newBreakpointsSet);
  }, [recordHistoryEntry, currentSelectedNodeIds]);
  
  const clearHistoryAndSelection = useCallback((initialGraphState: GraphStateForHistory) => {
    initializeHistory(initialGraphState); // This also clears selection/breakpoints
  }, [initializeHistory]);


  return {
    selectedNodeIds: currentSelectedNodeIds,
    breakpoints: currentBreakpoints,
    canUndo,
    canRedo,
    initializeHistory,
    recordHistoryEntry,
    undo,
    redo,
    updateSelectedNodesAndRecord,
    updateBreakpointsAndRecord,
    clearHistoryAndSelection,
    // Expose internal setters if direct manipulation from App.tsx is absolutely needed without history recording
    // For example, if loading a graph shouldn't be a history event itself, but should set the state.
    // setCurrentSelectedNodeIds, 
    // setCurrentBreakpoints,
  };
};
