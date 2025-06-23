
import { useState, useCallback } from 'react';
import { AgentPlan, OperationTypeEnum } from '../types';
import { processUserCommandViaAgent } from '../services/agentService';

export interface AgentStateCallbacks {
  appendLog: (message: string, type: 'info' | 'error' | 'success' | 'debug' | 'agent_plan', nodeId?: string) => void;
  commitPlanToGraph: (plan: AgentPlan) => void;
  getAvailableNodeOperations: () => OperationTypeEnum[];
}

export const useAgentState = (callbacks: AgentStateCallbacks) => {
  const [isAgentProcessing, setIsAgentProcessing] = useState(false);
  const [currentAgentPlan, setCurrentAgentPlan] = useState<AgentPlan | null>(null);

  const { appendLog, commitPlanToGraph, getAvailableNodeOperations } = callbacks;

  const submitAgentCommand = useCallback(async (command: string) => {
    if (!command.trim()) return;
    setIsAgentProcessing(true);
    setCurrentAgentPlan(null); // Clear previous plan
    appendLog(`Agent processing command: "${command}"`, 'info');

    try {
      const availableOps = getAvailableNodeOperations();
      const plan = await processUserCommandViaAgent(command, availableOps);
      if (plan) {
        setCurrentAgentPlan(plan);
        appendLog(`Agent proposed plan:\n${plan.planSummary}`, 'agent_plan');
      } else {
        appendLog("Agent could not generate a plan.", 'error');
      }
    } catch (error: any) {
      console.error("Agent processing error in useAgentState:", error);
      appendLog(`Agent error: ${error.message}`, 'error');
    } finally {
      setIsAgentProcessing(false);
    }
  }, [appendLog, getAvailableNodeOperations]);

  const confirmAgentPlan = useCallback(() => {
    if (currentAgentPlan) {
      try {
        commitPlanToGraph(currentAgentPlan);
        // appendLog for success/failure is handled by the commitPlanToGraph implementer
      } catch (error: any) {
        // This catch might be redundant if commitPlanToGraph already handles its own errors + logging
        console.error("Error committing agent plan (caught in useAgentState):", error);
        appendLog(`Error committing agent plan: ${error.message}`, 'error');
      } finally {
        setCurrentAgentPlan(null); // Clear plan after attempting commit
      }
    }
  }, [currentAgentPlan, commitPlanToGraph, appendLog]);

  const discardAgentPlan = useCallback(() => {
    setCurrentAgentPlan(null);
    appendLog("Agent plan discarded.", 'info');
  }, [appendLog]);

  return {
    isAgentProcessing,
    currentAgentPlan,
    submitAgentCommand,
    confirmAgentPlan,
    discardAgentPlan,
  };
};
