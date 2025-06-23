# Logical Construction Plan - Panel Functionalities Overview

## Introduction

The Logical Construction Plan application features several specialized panels designed to support the primary interaction on the Node Editor canvas. These panels organize tools, display contextual information, and provide access to various functionalities. They adhere to the "Sovereign Canvas" and "Unified Contextual Control" principles, presenting as "crystal card" style elements that are intuitive, context-aware, and **collapsible** to maximize the canvas workspace when needed.

---

## Controls Panel (Left Panel)

The Controls Panel, located on the left side of the application, serves as the primary hub for adding new elements to the graph and managing the overall graph state.

*   **Overall Purpose:** Facilitates the creation of new nodes (both Atomic and Component Blueprints), manages graph state through history (Undo/Redo) and clipboard (Copy/Paste) operations, and provides debugging controls.
*   **Styling & Collapsibility:** Appears as a "crystal card." It can be collapsed to a narrow vertical bar by clicking the "Collapse" button (e.g., double left chevron icon) at its bottom. When collapsed, an "Expand" button (e.g., double right chevron icon) and a representative icon (`WrenchScrewdriverIcon`) are visible. This maximizes canvas space for focused graph editing.

*   **Key Sections & Functionalities:**
    *   **Breadcrumbs Bar:**
        *   **Location:** At the very top of the Controls Panel.
        *   **Function:** Displays the current graph scope hierarchy (e.g., "Root Graph > My Molecule"). Allows users to navigate back to parent scopes by clicking on their names in the breadcrumb trail. The current scope is highlighted and not clickable.
    *   **Quick Shelf:**
        *   **Function:** A user-customizable area for pinning frequently used Atomic Nodes or Component Blueprints. Items can be dragged from the Node Libraries below onto the shelf. Clicking an item on the shelf adds it to the current graph. Items can be removed from the shelf.
    *   **Node Libraries Tabs:**
        *   **"Atomic Nodes" Tab:** Provides a categorized list of all available fundamental operational nodes (e.g., Value Provider, Addition, Branch). Users click a node button to add it to the current graph or drag it to the Quick Shelf. Archetype nodes are visually distinct. Node buttons can also show contextual compatibility highlights (pulsing effect) if "Focus Mode" is active and a node with output ports is selected on the canvas, or be dimmed if not compatible.
        *   **"Component Library" Tab:** Lists available "Component Blueprints" – pre-configured, reusable Molecular Nodes. These can be added to the Root Graph or dragged to the Quick Shelf. Similar compatibility highlighting and filtering can apply in "Focus Mode".
    *   **History Controls:**
        *   **"Undo" Button:** Reverts the last graph modification (e.g., node addition, connection change, property edit).
        *   **"Redo" Button:** Re-applies an action that was previously undone.
    *   **Clipboard Controls:**
        *   **"Copy" Button:** Copies the currently selected nodes and their internal connections to an internal clipboard.
        *   **"Paste" Button:** Pastes the clipboard contents into the current graph scope, creating new instances of the copied nodes and connections with new IDs.
    *   **Debugger Controls:**
        *   **Location:** Typically housed at the bottom of the Controls Panel.
        *   **Function:** These controls become active and interactive only when graph execution is paused at a breakpoint.
            *   **"Resume" Button:** Continues execution from the currently paused state.
            *   **"Step Over" Button:** Executes the currently paused node and then pauses execution at the next node in the sequence.
            *   **"Stop" Button:** Terminates the current execution session entirely.

---

## Inspector Panel (Right Panel)

The Inspector Panel, located on the right side, is a context-sensitive "crystal card" panel. Its content dynamically adapts based on whether a node is selected on the canvas or if the canvas itself (representing global graph context) is the focus. It is also collapsible.

*   **Overall Purpose:** To inspect and modify properties of selected elements (nodes), or to provide access to global graph tools, canvas settings, and information when no specific element is selected.
*   **Styling & Collapsibility:** Appears as a "crystal card." It can be collapsed to a narrow vertical bar using its "Collapse" button (e.g., double right chevron icon). An "Expand" button (e.g., double left chevron icon) and a representative icon (`InformationCircleIcon`) are shown when collapsed.

*   **Contextual Content:**

    *   **When a Single Node is Selected:**
        *   **Node Name:** An editable field displaying the selected node's name. Changes are applied on blur or Enter.
        *   **Node-Specific Configuration:** Dynamically displayed fields relevant to the selected node's type. Examples:
            *   `VALUE_PROVIDER`: A field to input the constant value it provides.
            *   `STATE`: Fields for "State ID" and "Initial Value".
            *   `SWITCH`: UI for managing cases (conditions and output values) and a default value.
            *   `PROGRESS_BAR`: Field for "Bar Color" and a checkbox for "Show Percentage".
            *   `DATA_TABLE`: Field for "Columns" (comma-separated string).
        *   **Input Port Overrides:** For DATA input ports that are not currently connected, users can provide literal values here. These values will be used by the node during execution. This section is typically hidden if all input ports are connected or if the node has no configurable input literals.
        *   **Footer Note Editor:**
            *   A text area for users to write descriptive notes or comments specific to the selected node.
            *   A checkbox to toggle the visibility of this note at the bottom of the node's visual representation on the canvas.
        *   **Node Description:** A static, read-only area displaying a brief explanation of the selected node type's general purpose and behavior.

    *   **When No Node is Selected (or Multiple Nodes Selected):**
        *   **Graph Actions:**
            *   **"Execute Selected Output":** (Active if exactly one node with an output port is selected) Triggers a data-pull execution for the first available data output port of the selected node.
            *   **"Clear Graph":** Opens a confirmation modal to remove all nodes and connections from the currently active graph scope.
            *   **"Focus Graph":** Adjusts the canvas pan and zoom settings to fit all nodes in the current scope comfortably within the view.
            *   **"Align Selected Top":** (Active if multiple nodes are selected) Aligns the top edges of all currently selected nodes.
            *   **"Distribute Selected Horizontally":** (Active if multiple nodes are selected) Evenly spaces out selected nodes horizontally.
        *   **Canvas Tools:**
            *   **"Sequence Mode" Toggle:** A switch to toggle a visual mode (currently a placeholder for a future feature intended for step-by-step execution visualization).
            *   **"Focus Mode" Toggle:** A switch that, when active, dims non-compatible nodes in the Controls Panel's Node Libraries based on the output ports of the currently selected node on the canvas. This helps in finding connectable nodes.
        *   **Persistence:**
            *   **"Save Graph" Button:** Allows the user to save the entire graph state (including all scopes, nodes, connections, global state variables, and breakpoints) to a local JSON file.
            *   **"Load Graph" Button:** Opens a file dialog, allowing the user to load a previously saved graph from a JSON file, restoring its state.

*   **Log View (Integrated at the Bottom):**
    *   **Function:** This section is persistently displayed at the bottom of the Inspector Panel, regardless of node selection. It shows a chronological, auto-scrolling log of:
        *   Execution events (start, completion, errors, pause, resume).
        *   Data resolutions and values during execution.
        *   Errors encountered during graph operations or execution.
        *   AI Agent activities: commands sent, plan summaries received, and plan commitment/discard status.
        *   General debug messages from the system.
    *   **Features:** Log entries are typically color-coded by type (e.g., blue for info, red for error, green for success, purple for agent plans) for easier visual parsing.

---

## Command Agent Panel (Bottom Panel)

Positioned at the bottom of the main editor area, below the Node Editor canvas, the Command Agent Panel is a "crystal card" panel. It enables users to interact with an AI (powered by the Gemini API) to generate or modify graph elements using natural language commands.

*   **Overall Purpose:** To streamline and accelerate graph construction by translating conversational instructions into concrete nodes and connections.

*   **Key Functionalities:**
    *   **Command Input Field:** A primary text area where users type their desired actions or graph structures in natural language (e.g., "create a value provider with the number 100, connect it to an addition node, add 50 to it, and then display the result").
    *   **Node Search/Autocomplete:** While typing in the command input (and if not currently processing an AI command or reviewing a plan), the input field also acts as a quick search. Matching Atomic Nodes and Component Blueprints from the libraries are displayed in a dropdown list above the input. Selecting an item from this list adds it directly to the center of the current canvas view.
    *   **Send AI Command Button:** Submits the typed command to the AI agent for processing. This button is enabled when there's text in the input field and no AI plan is pending review.
    *   **Processing Indicator:** While the AI is processing a command, the panel provides visual feedback (e.g., a pulsing border, a "Thinking..." message on the button) to indicate activity.
    *   **Plan Review Area:** If the AI successfully generates a plan based on the command, this area (within the Command Agent Panel) displays:
        *   A human-readable `planSummary` outlining the AI's understanding and intended actions (e.g., "Okay, I will create a Value Provider set to 100, an Addition node, connect them, and then connect the Addition node to a new Display Value node.").
    *   **Commit Plan Button:** If an AI-generated plan is displayed, clicking this button applies the proposed nodes and connections to the currently active graph scope.
    *   **Discard Plan Button:** If an AI-generated plan is displayed, this button allows the user to reject the AI's proposal. The panel then clears the plan and returns to the command input state, allowing the user to rephrase or issue a new command.

---

## Relationship to Node Editor

These panels are meticulously designed to support and augment the primary interaction occurring on the Node Editor canvas. By providing organized access to creation tools, contextual modification capabilities, global graph management functions, and innovative features like AI-assisted creation, they aim to make the process of logical construction more efficient, intuitive, and focused. The collapsible nature of the side panels ensures that the canvas can remain the "Sovereign Canvas," offering maximum workspace for complex graph visualization and manipulation whenever the user desires.
