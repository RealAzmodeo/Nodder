
import { 
  OutputPort, 
  InputPort, 
  Connection, 
  OperationTypeEnum,
  LogicalCategoryEnum,
  PortTypeEnum // New import
} from '../types';

/**
 * Checks if two logical categories are compatible for connection (for DATA ports).
 * 'ANY' is compatible with any other category.
 */
export function areDataCategoriesCompatible(outCategory: LogicalCategoryEnum, inCategory: LogicalCategoryEnum): boolean {
  if (outCategory === LogicalCategoryEnum.ANY || inCategory === LogicalCategoryEnum.ANY) {
    return true;
  }
  // VOID category is typically for execution ports or data ports that explicitly carry no data.
  // Allow VOID to VOID for data ports if that's ever a use case, but generally, VOID is for EXECUTION.
  if (outCategory === LogicalCategoryEnum.VOID && inCategory === LogicalCategoryEnum.VOID) {
    return true;
  }
  if (outCategory === LogicalCategoryEnum.VOID || inCategory === LogicalCategoryEnum.VOID) {
    // Typically, a non-VOID data port shouldn't connect to a VOID data port unless one is ANY.
    // This case is mostly covered by the ANY check.
    return false; 
  }
  return outCategory === inCategory;
}

/**
 * Validates if a connection can be made between an output port and an input port.
 * - Checks for port type compatibility (DATA to DATA, EXECUTION to EXECUTION).
 * - For DATA ports: Checks for logical category compatibility.
 * - For DATA ports: Enforces "Unión Explícita" (input port on non-UNION node cannot receive multiple connections).
 * - For EXECUTION ports: Input ports can receive multiple connections. Output ports typically connect to one input.
 */
export function canConnect(
  fromPort: OutputPort,
  toPort: InputPort,
  toNodeOperationType: OperationTypeEnum, // Operation type of the node the 'toPort' belongs to
  allConnections: Connection[],
  fromNodeId: string,
  toNodeId: string
): {Succeeded: boolean, Message: string} {

  if (fromNodeId === toNodeId) {
      return {Succeeded: false, Message: "Cannot connect a node to itself."};
  }

  // Rule 1: Port types must match
  if (fromPort.portType !== toPort.portType) {
    return {Succeeded: false, Message: `Port type mismatch: Cannot connect ${fromPort.portType} port to ${toPort.portType} port.`};
  }

  if (fromPort.portType === PortTypeEnum.DATA) {
    // Rules for DATA ports
    if (!areDataCategoriesCompatible(fromPort.category, toPort.category)) {
      return {Succeeded: false, Message: `Data category mismatch: Cannot connect ${fromPort.category} to ${toPort.category}.`};
    }

    const existingConnectionToTargetDataPort = allConnections.find(
      conn => conn.toNodeId === toNodeId && conn.toPortId === toPort.id
    );

    if (existingConnectionToTargetDataPort && toNodeOperationType !== OperationTypeEnum.UNION) {
      return {Succeeded: false, Message: `Input data port '${toPort.name}' on a non-UNION node already has a connection. Only UNION nodes can have multiple inputs to the same data port implicitly, or use distinct input ports.`};
    }
  } else { // PortTypeEnum.EXECUTION
    // Rules for EXECUTION ports
    // An EXECUTION input port can receive multiple connections (e.g. multiple events could trigger the same action).
    // An EXECUTION output port typically connects to one input to define a clear sequence. 
    // However, allowing an output to trigger multiple subsequent execution paths simultaneously (fan-out) might be desired in some advanced scenarios.
    // For now, let's allow an EXECUTION output port to connect to multiple EXECUTION input ports. Branching should be explicit with a BRANCH node.
    // So, no specific restriction here on multiple connections from an EXECUTION output port,
    // nor on multiple connections to an EXECUTION input port.
  }
  
  // Basic cycle detection (prevent direct self-loops was already done)
  // More complex cycle detection is handled by the execution engine for both data and execution flows.

  return {Succeeded: true, Message: "Connection is valid."};
}
