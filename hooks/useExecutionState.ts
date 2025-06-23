
import { useState, useCallback, useRef } from 'react';
import {
  AnyNode, Connection, NodeId, ExecutionMetaState, ExecutionContext,
  ExecutionResult, SteppingMode, TerminalStateReasonEnum
} from '../types';
import { getResolveStateForOutput, triggerEventFlow as executionServiceTriggerEventFlow } from '../services/executionService'; // Renamed import

export const useExecutionState = () => {
  const [executionMeta, _setExecutionMetaInternalOnly] = useState<ExecutionMetaState | null>(null);
  const [isExecuting, setIsExecutingInternal] = useState(false);
  const [resolvedStatesForInspection, setResolvedStatesForInspectionInternal] = useState<ExecutionContext | null>(null);
  const pulseTimeoutRef = useRef<number | null>(null); // Changed from NodeJS.Timeout to number for browser

  const executionLogs = executionMeta?.log || [];

  const setExecutionMetaInternalWithPulseClear = useCallback((
    updater: React.SetStateAction<ExecutionMetaState | null>,
    isPulseRelated: boolean = false // This flag indicates if the update specifically involves setting a pulse
  ) => {
    // Clear any existing timeout if we are setting a new pulse or if it's a non-pulse update that might clear it
    if (pulseTimeoutRef.current) {
      clearTimeout(pulseTimeoutRef.current);
      pulseTimeoutRef.current = null;
    }

    _setExecutionMetaInternalOnly(prevMeta => {
      const nextMeta = typeof updater === 'function' ? updater(prevMeta) : updater;
      
      // Only set a new timeout if this update is pulse-related AND there's actual pulse info
      if (isPulseRelated && nextMeta?.pulsingConnectionInfo) {
        pulseTimeoutRef.current = window.setTimeout(() => {
          _setExecutionMetaInternalOnly(current => {
            // Check if the pulseKey matches to avoid clearing a newer pulse
            if (current && current.pulsingConnectionInfo?.pulseKey === nextMeta.pulsingConnectionInfo?.pulseKey) {
              return { ...current, pulsingConnectionInfo: null };
            }
            return current;
          });
          pulseTimeoutRef.current = null; // Clear ref after timeout executes
        }, 750); 
      }
      return nextMeta;
    });
  }, []);


  const commonExecutionStart = useCallback((
    initialMessage: string,
    globalStateStore: Map<string, any>,
    steppingMode: SteppingMode = null,
    currentPausedNodeId?: NodeId | null,
    existingLogs?: ExecutionMetaState['log']
  ): ExecutionMetaState => {
    setIsExecutingInternal(true);
    const baseMeta: ExecutionMetaState = {
      log: [...(existingLogs || []), { timestamp: Date.now(), message: initialMessage, type: 'info' }],
      globalStateStore: globalStateStore,
      status: 'running',
      fullExecutionPath: [],
      visitedNodesTrace: [],
      cycleDepth: 0,
      maxCycleDepth: 10,
      pausedNodeId: currentPausedNodeId || null,
      steppingMode: steppingMode,
      pulsingNodeInfo: null,
      pulsingConnectionInfo: null, 
    };
    setExecutionMetaInternalWithPulseClear(baseMeta); // Not specifically pulse-related for start
    return baseMeta;
  }, [setExecutionMetaInternalWithPulseClear]);

  const commonExecutionEnd = useCallback((
    finalMeta: ExecutionMetaState,
    resolvedData?: ExecutionContext
  ) => {
    if (finalMeta.status !== 'paused') {
      setIsExecutingInternal(false);
      finalMeta.pausedNodeId = null;
      finalMeta.steppingMode = null;
    }
    
    const metaToSet = (finalMeta.status !== 'paused' && finalMeta.pulsingConnectionInfo) 
        ? { ...finalMeta, pulsingConnectionInfo: null, pulsingNodeInfo: null } 
        : finalMeta;

    // Don't treat this as a "new pulse setting" action, rely on timeouts set during execution steps
    setExecutionMetaInternalWithPulseClear(metaToSet, false); 
    if (resolvedData) setResolvedStatesForInspectionInternal(resolvedData);
  }, [setExecutionMetaInternalWithPulseClear]);

  const initiateExecution = useCallback(async (
    selectedNodeId: NodeId,
    targetPortId: string,
    rootNodes: AnyNode[],
    rootConnections: Connection[],
    globalStateStore: Map<string, any>
  ) => {
    const nodeToExecute = rootNodes.find(n => n.id === selectedNodeId); 
    if (!nodeToExecute) {
      const errorMeta = commonExecutionStart("Node not found for execution.", globalStateStore);
      errorMeta.status = 'error';
      errorMeta.error = TerminalStateReasonEnum.ERROR_TARGET_NODE_NOT_FOUND;
      errorMeta.log.push({timestamp: Date.now(), message: `Selected node ${selectedNodeId} not found.`, type: 'error'});
      commonExecutionEnd(errorMeta);
      return;
    }

    const initialMeta = commonExecutionStart(
      `Resolving output for node ${nodeToExecute.name} (Port ID: ${targetPortId})...`,
      globalStateStore,
      'run'
    );

    const result: ExecutionResult = await getResolveStateForOutput(
      selectedNodeId,
      targetPortId,
      rootNodes,
      rootConnections,
      { ...initialMeta, globalStateStore }
    );
    commonExecutionEnd(result.finalMetaState, result.resolvedStates);
  }, [commonExecutionStart, commonExecutionEnd]);

  const initiateEventFlow = useCallback(async (
    eventName: string,
    payload: any,
    rootNodes: AnyNode[],
    rootConnections: Connection[],
    globalStateStore: Map<string, any>,
    currentPausedNodeId?: NodeId | null,
    steppingModeOverride: SteppingMode = 'run'
  ) => {
    const initialMessage = currentPausedNodeId && steppingModeOverride !== 'run' ?
      `Continuing event '${eventName}' (${steppingModeOverride})...` :
      `Dispatching event '${eventName}'...`;

    const baseMeta = commonExecutionStart(
        initialMessage, 
        globalStateStore, 
        steppingModeOverride, 
        steppingModeOverride === 'run' ? null : currentPausedNodeId,
        currentPausedNodeId && steppingModeOverride !== 'run' && executionMeta ? executionMeta.log : []
    );
    
    const metaForDispatch: ExecutionMetaState = {
      ...baseMeta,
      pausedNodeId: steppingModeOverride === 'run' ? null : currentPausedNodeId,
      pulsingNodeInfo: null, 
      pulsingConnectionInfo: null, 
    };

    const finalMetaState = await executionServiceTriggerEventFlow( 
      eventName.trim(),
      payload,
      rootNodes,
      rootConnections,
      { ...metaForDispatch, globalStateStore } // Removed setExecutionMetaCallback
    );
    commonExecutionEnd(finalMetaState);
  }, [commonExecutionStart, commonExecutionEnd, executionMeta, setExecutionMetaInternalWithPulseClear]); 
  
  const stopCurrentExecution = useCallback(() => {
    setIsExecutingInternal(false);
    if (executionMeta) {
      setExecutionMetaInternalWithPulseClear(prev => ({
        ...(prev || commonExecutionStart("Execution stopped.", new Map(), null)), 
        status: 'stopped',
        pausedNodeId: null,
        steppingMode: null,
        pulsingNodeInfo: null,
        pulsingConnectionInfo: null,
        log: [...(prev?.log || []), { timestamp: Date.now(), message: "Execution stopped by user.", type: 'info' }]
      }));
    }
  }, [executionMeta, commonExecutionStart, setExecutionMetaInternalWithPulseClear]);

  const resumePausedExecution = useCallback((
    eventName: string, payload: any, rootNodes: AnyNode[], rootConnections: Connection[], globalStateStore: Map<string, any>
   ) => {
    if (executionMeta?.pausedNodeId) {
      initiateEventFlow(eventName, payload, rootNodes, rootConnections, globalStateStore, executionMeta.pausedNodeId, null);
    }
  }, [executionMeta, initiateEventFlow]);

  const stepOverPausedExecution = useCallback((
     eventName: string, payload: any, rootNodes: AnyNode[], rootConnections: Connection[], globalStateStore: Map<string, any>
  ) => {
    if (executionMeta?.pausedNodeId) {
      initiateEventFlow(eventName, payload, rootNodes, rootConnections, globalStateStore, executionMeta.pausedNodeId, 'step_over');
    }
  }, [executionMeta, initiateEventFlow]);

  const clearExecutionState = useCallback(() => {
    setExecutionMetaInternalWithPulseClear(null);
    setResolvedStatesForInspectionInternal(null);
    setIsExecutingInternal(false);
  }, [setExecutionMetaInternalWithPulseClear]);

  const appendLog = useCallback((message: string, type: 'info' | 'error' | 'success' | 'debug' | 'agent_plan', nodeId?: NodeId) => {
    setExecutionMetaInternalWithPulseClear(prev => ({
        ...(prev || { log: [], globalStateStore: new Map(), status: 'idle', fullExecutionPath: [], visitedNodesTrace: [], cycleDepth: 0, maxCycleDepth: 10, steppingMode: null, pulsingNodeInfo: null, pulsingConnectionInfo: null }),
        log: [...(prev?.log || []), { timestamp: Date.now(), message, type, nodeId }]
    }));
  }, [setExecutionMetaInternalWithPulseClear]);

  const setExecutionStatus = useCallback((status: ExecutionMetaState['status'], error?: string) => {
    setExecutionMetaInternalWithPulseClear(prev => ({
        ...(prev || { log: [], globalStateStore: new Map(), status: 'idle', fullExecutionPath: [], visitedNodesTrace: [], cycleDepth: 0, maxCycleDepth: 10, steppingMode: null, pulsingNodeInfo: null, pulsingConnectionInfo: null }),
        status,
        error,
    }));
    if (status !== 'paused' && status !== 'running') {
        setIsExecutingInternal(false);
    }
  }, [setExecutionMetaInternalWithPulseClear]);


  return {
    executionMeta,
    isExecuting,
    resolvedStatesForInspection,
    executionLogs,
    initiateExecution,
    initiateEventFlow,
    stopCurrentExecution,
    resumePausedExecution,
    stepOverPausedExecution,
    clearExecutionState,
    appendLog,
    setExecutionStatus,
  };
};
