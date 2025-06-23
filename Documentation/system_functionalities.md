
# Logical Construction Plan - System Functionalities

## Overview

The Logical Construction Plan application is a visual environment designed for defining, executing, and understanding complex logical systems. It empowers users to build intricate plans by connecting nodes, each representing a specific operation or data point. This approach allows for clear visualization of data flow, execution paths, and dependencies, making it easier to design, debug, and manage sophisticated logic. The core philosophy is to enable "visual programming," where logical structures are built and tested interactively, guided by the "Coherent Light Principle" and "Intuitive Tactile Interaction" for an aesthetically pleasing and user-friendly experience.

## Core Functionalities

### Node Editor (Canvas)
The primary interactive workspace for visually programming your logical plans. The canvas adheres to the "Coherent Light Principle," featuring ambient lighting and a subtle noise texture to create a sense of depth. Nodes appear as "crystal cards" floating on this surface.
*   **Interaction:** Drag nodes onto the canvas, arrange them logically, and connect their ports. This visual construction defines how data is processed and how execution flows.
*   **Scope:** The canvas can display the "Root Graph" or a "Sub-Graph" within a Molecular Node or Iterate Node.
*   **Selection:** Clicking the canvas background deselects all nodes. Area selection allows selecting multiple nodes. Selected nodes are highlighted with an accent color outline.
*   **Panning:** Middle-mouse click and drag to pan the canvas.
*   **Zooming:** Use the mouse wheel to zoom in and out.
*   **Predictive Creation Context Menu:** If a connection is dragged from an output port and released onto an empty canvas area, a context menu appears. This menu lists node types compatible with the source port. Selecting a node creates it at the drop location and connects it. Manifestation nodes (like Display Value, Progress Bar) are prioritized in this list if compatible.
*   **Breakpoints:** Small circular indicators on node headers allow toggling breakpoints for debugging. Active breakpoints are solid red.
*   **Paused Node Highlighting:** When execution is paused at a breakpoint, the corresponding node is highlighted (e.g., with a semi-transparent yellow overlay).
*   **The Sovereign Canvas & Collapsible Panels:** In line with the "Sovereign Canvas" principle, the side panels (Controls Panel on the left, Inspector/Log Panel on the right) are **collapsible**.
    *   Each panel has a "Collapse" button (e.g., double chevron icon) at its bottom when expanded.
    *   When collapsed, each panel shrinks to a narrow vertical bar displaying an "Expand" button (opposite double chevron) and a representative icon (`WrenchScrewdriverIcon` for Controls, `InformationCircleIcon` for Inspector/Log).
    *   This allows the central Node Editor area to dynamically expand, maximizing the workspace for graph construction and viewing.

### Hierarchical Navigation (Entering & Exiting Sub-Graphs)
Manages complexity and creates reusable, modular logic by encapsulating detailed processes within higher-level nodes (Molecular Nodes, Iterate Nodes).
*   **Root Graph:** The main, top-level view of your entire plan.
*   **Sub-Graph:** The internal logic encapsulated within a Molecular Node or Iterate Node. **Double-click** a Molecular or Iterate node to enter its sub-graph and define its internal workings.
*   **Breadcrumbs:** This navigation aid (top of the left-hand Controls Panel), styled as a concave neumorphic element, shows your current depth (e.g., "Root Graph > My Logic Block"). Click names in the breadcrumbs to navigate back up the hierarchy.

### Connections (Links) - Dynamic Causal Conduits
Define the flow of data and the sequence of execution between nodes. They are no longer static lines but dynamic visual pathways.
*   **Shape (Bézier Curves):** Connections are rendered as smooth cubic Bézier curves, providing a more organic and visually appealing layout. Default curves are gentle horizontal S-shapes.
*   **Reroute Points (Flow Control):**
    *   **Creation:** Double-click on any part of a connection line to add a "reroute point."
    *   **Interaction:** Reroute points appear as small, draggable circular handles directly on the line. Drag these points to precisely shape the connection's path around other nodes or to create more organized layouts.
    *   **Behavior:** A connection can have multiple reroute points, forming a path of connected Bézier segments.
*   **Visual Effects (Information Flow):**
    *   **Ambient Pulse:** All connections continuously display a subtle, slow-moving, faint light pulse (achieved with an animated `stroke-dashoffset` on a secondary path, creating a "marching ants" effect). This suggests latent energy and is typically a faint grey/white (`rgba(200, 200, 220, 0.15)`). This effect is hidden if the connection is currently undergoing an "execution intensification."
    *   **Execution Intensification & Directional Pulse:** When execution or data actively flows:
        *   The main connection path's stroke color temporarily changes to a bright gold (`#FFD700`).
        *   The stroke width may slightly increase (e.g., from 1.5 to 2.5 for data, 2 to 3 for execution).
        *   A subtle golden glow effect (`filter: drop-shadow(...)`) is applied to the path.
        *   A small, golden, animated circle (the directional pulse) travels visibly along the curve from source to target.
        *   Arrowheads also turn gold.
        *   This combined "golden intensification" makes active pathways highly visible and distinct.
    *   These effects provide immediate visual feedback on active data paths and execution sequences.
*   **Creation:**
    *   **Direct Port-to-Port:** Click and drag from an output port (right side of a node) to a compatible input port (left side of another node).
    *   **Predictive Creation (Context Menu):** Drag from an output port and release onto an empty canvas area. A context menu will appear, allowing you to select a compatible node type. This node will be created at the release point and automatically connected. Manifestation nodes are prioritized if compatible.
*   **Validation:** Valid connections depend on matching port types (Data-to-Data, Execution-to-Execution) and compatible data categories (e.g., `NUMBER` to `NUMBER` or `ANY`). An input DATA port (except on `UNION` nodes) can only have one incoming connection.
*   **Removal:** For input ports, a small 'X' icon appears on hover over the port marker if it's connected, allowing removal of that specific connection. Connections are also removed if a connected node is deleted. Reroute points are part of the connection and are removed with it.

### Inspector Panel (Right Panel)
A **collapsible "crystal card" panel** whose content dynamically adapts to the user's current selection, embodying the "Unified Contextual Control" principle.
*   **Access:**
    *   If a single node is selected on the canvas, the Inspector Panel shows details for that node.
    *   If no node is selected, it shows global graph-level actions and tools.
*   **Contents (Node Selected):**
    *   **Node Name:** Editable name for the selected node.
    *   **Configuration (Node-Specific):** Fields relevant to the node's type (e.g., the value for a `VALUE_PROVIDER`, State ID for a `STATE` node, cases for a `SWITCH` node, channel name for `SEND_DATA`/`RECEIVE_DATA`, bar color for `PROGRESS_BAR`).
    *   **Input Port Overrides:** Allows setting literal values for unconnected DATA input ports.
    *   **Footer Note:** A section to add descriptive text that can optionally be displayed at the bottom of the node.
    *   **Node Description:** A static description of the node's general purpose.
*   **Contents (No Node Selected):**
    *   **Graph Actions:** Buttons for "Execute Selected Output", "Clear Graph", "Focus Graph", "Align Selected Top", "Distribute Selected Horizontally".
    *   **Canvas Tools:** Toggles for "Sequence Mode" and "Focus Mode".
    *   **Persistence:** Buttons for "Save Graph" and "Load Graph".
*   **Log View:** The "Execution Log" is always present at the bottom of this panel.

### Controls Panel (Left Panel)
A **collapsible "crystal card" panel** primarily used for adding new nodes to the current graph scope. It also contains universal graph management tools.
*   **Node Addition:**
    *   **Quick Shelf:** A draggable area for favorite or frequently used nodes.
    *   **Atomic Nodes Tab:** Categorized list of basic operational nodes.
    *   **Component Library Tab:** Access to pre-built "Component Blueprints".
*   **History Controls:** "Undo" (Ctrl/Cmd+Z) and "Redo" (Ctrl/Cmd+Y or Ctrl/Cmd+Shift+Z) buttons.
*   **Clipboard Controls:** "Copy" (Ctrl/Cmd+C) and "Paste" (Ctrl/Cmd+V) buttons for selected nodes.
*   **Debugger Controls:** "Resume", "Step Over", and "Stop" buttons, active when execution is paused at a breakpoint.
*   **Scope Restrictions:** Enforced for adding certain node types (e.g., `MOLECULAR` nodes only in Root Graph).

### Command Agent Panel
An interactive panel enabling users to construct parts of their logical graph using natural language commands. This panel leverages an AI (Gemini API) to interpret user intent and propose a set of nodes and connections.
*   **Location:** Positioned at the bottom of the main editor area, below the Node Editor.
*   **User Input:**
    *   A text field where users can type commands (e.g., "create a value provider with the value 10, then add 5 to it and log the result").
    *   A "Send" button to submit the command to the AI agent.
*   **AI Processing & Plan Generation:**
    *   The submitted command is sent to an AI agent service (`agentService.ts` which uses `@google/genai`).
    *   The AI agent attempts to understand the command and translates it into a structured `AgentPlan`. This plan includes:
        *   `planSummary`: A human-readable summary of the AI's intended actions.
        *   `nodesToCreate`: A list of nodes the AI suggests creating, including their type, name, initial configuration, and suggested position.
        *   `connectionsToCreate`: A list of connections between the proposed new nodes, specified by temporary IDs and human-readable port names.
*   **Plan Review & Action:**
    *   If a plan is successfully generated, the `planSummary` is displayed in the Command Agent Panel.
    *   Two options are provided:
        *   **Commit Plan:** Executes the plan, creating the specified nodes and connections in the currently active graph scope.
        *   **Discard Plan:** Rejects the proposed plan, allowing the user to issue a new command or modify the existing one.
*   **Feedback & Logging:**
    *   The process of sending the command, receiving the plan, and committing/discarding is logged in the Execution Log panel (type: 'agent_plan' or 'info'/'error').
*   **Purpose:** To speed up graph construction, assist users who might be unsure of exact node names or configurations, and offer a more intuitive, conversational method for building logic.
*   **Contextual Awareness:** The agent is instructed to avoid creating `INPUT_GRAPH`/`OUTPUT_GRAPH` nodes in the Root Graph, instead guiding users to create a `MOLECULAR` node and define its interface internally.

### Execution Models

#### Data Pull Model ("Resolve Selected Output")
This model is primarily for on-demand calculation and inspection of the output value of a specific data port on a selected node. It's useful for understanding data flow and debugging.
*   **Process:** When "Execute Selected Output" (found in the right-hand panel when no node is selected, but acts on the *currently selected node's output*) is triggered:
    1.  The system traces dependencies *backward* from the selected port through the graph structure.
    2.  It identifies all upstream nodes necessary to compute the value.
    3.  These nodes are evaluated topologically. `STATE` nodes provide current values; `SEND_DATA`/`RECEIVE_DATA` interact with channels.
*   **Output:** The resolved value and a log. Active connections show a data pulse.

#### Event-Driven Push Model ("Dispatch Event")
This model simulates real-world events or initiates procedural execution flows that can cause side effects. Supports debugging and execution pulse animations.
*   **Process:**
    1.  User provides "Event Name" and "Payload".
    2.  Matching `ON_EVENT` nodes activate, pushing execution signals and payload data.
    3.  Signals propagate; breakpoints pause execution. `STATE`, `LOG_VALUE`, `ITERATE` nodes react.
*   **Output:** Detailed execution log, state changes, errors.

### Manifestation Nodes (Outputs & Displays)
Nodes for visualizing data on the canvas, making it an interactive dashboard. Resizable.
*   **`DISPLAY_VALUE`:** Shows any input data as string/JSON.
*   **`DISPLAY_MARKDOWN_TEXT`:** Renders input string as basic Markdown.
*   **`PROGRESS_BAR`:** Visualizes a numeric value relative to min/max.
*   **`DATA_TABLE`:** Displays an array of objects as a table.

### Debugging
Tools for understanding and troubleshooting logical plans.
*   **Breakpoints:** Set on any node; pauses event-driven execution.
*   **Paused State:** Highlights the paused node; `DebugControls` (in left Controls Panel) activate.
*   **DebugControls Panel:**
    *   **Resume:** Continues execution.
    *   **Step Over:** Executes current node, pauses at the next.
    *   **Step Into (Future):** Enters sub-graph.
    *   **Step Out (Future):** Exits sub-graph.
    *   **Stop:** Terminates execution.
*   **Resolved States Inspection:** Values visible in tooltips or Manifestation Nodes.
*   **Sequence Mode (UI Toggle Added):** Toggle in the right-hand panel (when no node selected). Full step-by-step visualization is a future feature.

### History (Undo/Redo)
Tracks graph modifications for reversion.
*   **Actions Tracked:** Node/connection changes, movements, config updates.
*   **Controls:** "Undo" and "Redo" buttons in the left Controls Panel.

### Clipboard (Copy/Paste)
Copies and pastes selected nodes and their internal connections.
*   **Copy:** (Ctrl/Cmd+C) Copies selected elements.
*   **Paste:** (Ctrl/Cmd+V) Pastes into current scope with new IDs.
*   **Controls:** "Copy" and "Paste" buttons in the left Controls Panel.

### Execution Log
Chronological record of execution events, data resolutions, errors, agent activities. Located at the bottom of the right Inspector Panel.

### Persistence (Saving and Loading Graphs)
Persists and reloads entire logical plans via JSON files. Includes nodes, connections, scope, state store, and breakpoints. "Save Graph" and "Load Graph" buttons are in the right-hand panel (when no node selected).

### Type System (Logical Categories & Port Types)
Ensures data integrity and logical consistency.
*   **Port Types:** `DATA`, `EXECUTION`.
*   **Logical Categories (DATA):** `NUMBER`, `STRING`, `BOOLEAN`, `OBJECT`, `ARRAY`, `ANY`, `VOID`.
*   **Compatibility Rules:** Port types must match. Data categories must be compatible (or one is `ANY`).

### Canvas Tools
Global graph manipulation tools, available in the right-hand panel when no node is selected.
*   **Clear Current Graph:** Removes all elements from the current scope (with confirmation).
*   **Focus on Graph (Frame All):** Adjusts pan/zoom to show all nodes.
*   **Tidy Up Nodes (Alignment):** "Align Selected Top", "Distribute Selected Horizontally".
*   **Area Selection:** Drag on canvas to select multiple nodes.
*   **Multiple Node Deletion:** `Delete`/`Backspace` removes all selected nodes.

### Global State Store & Channels
Maintains persistent data.
*   **`STATE` Nodes:** Interact with the global store via a unique `stateId`.
*   **Channels (`SEND_DATA` / `RECEIVE_DATA`):** Transfer data via named channels in the global store.

### Node Configuration (Modal & Inspector)
Adjust node-specific settings.
*   **Inspector Panel:** For common edits (name, some configs, overrides, footer note).
*   **Configuration Modal:** For more complex settings (I/O graph port names, Switch cases, Comment/Frame dimensions).

### Dynamic Ports
Nodes like `UNION`, `CONSTRUCT_OBJECT`, `AND`, `OR`, `XOR` can dynamically adjust input ports.

### Component Blueprints
Pre-configured Molecular Nodes for common patterns, available in the Controls Panel's "Component Library" tab for addition to the Root Graph.

---
*This document will be updated as new system features are added.*
