
import { useState, useCallback } from 'react';
import { AnyNode } from '../types';

export interface ModalManagerState {
  isConfigModalOpen: boolean;
  configuringNode: AnyNode | null;
  isClearGraphModalOpen: boolean;
  graphNameToClear: string;
}

export interface ModalManagerActions {
  openConfigModal: (node: AnyNode) => void;
  closeConfigModal: () => void;
  openClearGraphModal: (graphName: string) => void;
  closeClearGraphModal: () => void;
}

export type UseModalManagerReturn = ModalManagerState & ModalManagerActions;

export const useModalManager = (): UseModalManagerReturn => {
  const [isConfigModalOpen, setIsConfigModalOpen] = useState(false);
  const [configuringNode, setConfiguringNode] = useState<AnyNode | null>(null);

  const [isClearGraphModalOpen, setIsClearGraphModalOpen] = useState(false);
  const [graphNameToClear, setGraphNameToClear] = useState('');

  const openConfigModal = useCallback((node: AnyNode) => {
    setConfiguringNode(node);
    setIsConfigModalOpen(true);
  }, []);

  const closeConfigModal = useCallback(() => {
    setIsConfigModalOpen(false);
    setConfiguringNode(null); // Clear the node after closing
  }, []);

  const openClearGraphModal = useCallback((graphName: string) => {
    setGraphNameToClear(graphName);
    setIsClearGraphModalOpen(true);
  }, []);

  const closeClearGraphModal = useCallback(() => {
    setIsClearGraphModalOpen(false);
    // graphNameToClear doesn't need explicit clearing, will be overwritten on next open
  }, []);

  return {
    isConfigModalOpen,
    configuringNode,
    isClearGraphModalOpen,
    graphNameToClear,
    openConfigModal,
    closeConfigModal,
    openClearGraphModal,
    closeClearGraphModal,
  };
};
