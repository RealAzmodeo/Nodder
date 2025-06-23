
# Logical Construction Plan - Style Guide & Philosophy

This document outlines the aesthetic philosophy and specific style implementations guiding the visual design of the Logical Construction Plan application. The overarching goal is to create an interface that is not only functional but also visually engaging, intuitive, and sophisticated, drawing inspiration from physical materials and light interaction.

## Core Principles

### 1. The Coherent Light Principle
The entire user interface exists within a simulated 3D space governed by a consistent, imaginary light source. This principle dictates how elements are shaped, how they appear to reflect or absorb light, and how they cast shadows, contributing to a sense of depth and realism.

### 2. Intuitive Tactile Interaction
Interactive elements, particularly buttons, should visually and behaviorally mimic real-world physical components. Their form must clearly communicate their state (e.g., actionable, pressed, disabled) and provide satisfying feedback upon interaction.

### 3. Uninterrupted Flow Principle
The UI aims to eliminate obstacles between user intention and its manifestation on the canvas, making creation fluid and natural.

## Implementation Details

### Axiom 1: The Canvas & Ambient Illumination (The Stage)
The canvas serves as the foundational background for all interactive elements.

*   **Purpose:** To give the canvas a sense of depth and physical space, acting as a stage for the nodes and panels.
*   **Color:** A dark, desaturated color (`#24272E`) is used as the base to allow light and shadow effects to be more prominent.
*   **Texture (Fine Noise):** A subtle SVG-based noise texture (`opacity: 0.025`) is applied over the canvas. This breaks up flat color, adds a tactile quality, and enhances the perception of a physical surface.
*   **Ambient Lighting:**
    *   **Top Light:** A large, extremely diffuse radial gradient (`rgba(255, 255, 255, 0.03)`) is positioned at the top-center of the canvas, simulating a soft overhead light source.
    *   **Bottom Light (Accent):** A similar, even more subtle radial gradient (`rgba(126, 34, 206, 0.015)` - a system accent purple) is placed at the bottom-center, adding atmospheric depth without competing for attention.
    *   **Z-Ordering:** Ambient lights are behind the noise texture, which is behind the main UI content (`#root`).

### Axiom 2: Crystal Components (Nodes & Panels)
Nodes and side panels (Controls, Inspector, Log View) are designed as "crystal cards" – sleek, semi-transparent plaques floating above the illuminated canvas. The Command Agent Panel, DebugControls, Node Config Modal, and Clear Graph Confirmation Modal also adhere to this principle, appearing as distinct floating or integrated panels.

*   **Purpose:** To reinforce the illusion of physical, glass-like elements interacting with the ambient light.
*   **Material Color:**
    *   **Fixed Panels (`.neumorphic-panel` for Controls, Inspector, Log View, Command Agent, DebugControls):** Base color `#2D3039`.
    *   **Nodes (Operational):** Base color `rgba(45, 48, 57, 0.25)`.
    *   **Nodes (Display/Manifestation - e.g., DISPLAY_VALUE, PROGRESS_BAR):** Slightly different base like `rgba(55, 65, 81, 0.35)` to differentiate visually, while still being part of the crystal family.
    *   **Modals (NodeConfigModal, ClearGraphConfirmationModal):** Darker, more solid background like `bg-gray-800` for focus, but still with subtle border lighting and shadows to feel part of the "crystal" family.
*   **Backdrop Filter (Nodes):** A `blur(10px)` effect is applied (`backdrop-filter` and `-webkit-backdrop-filter`) to simulate frosted glass for nodes, where the canvas content behind the node appears blurred. Panels generally do not use backdrop-filter for performance and clarity, relying more on their base material color and edge lighting.
*   **Edge Lighting (Asymmetric Border):**
    *   The borders of these crystal cards are 1px wide and react to the ambient light.
    *   **Fixed Panels (`.neumorphic-panel`):** `border-top: 1px solid rgba(255, 255, 255, 0.12); border-left: 1px solid rgba(255, 255, 255, 0.10); border-bottom: 1px solid rgba(255, 255, 255, 0.03); border-right: 1px solid rgba(255, 255, 255, 0.03);`
    *   **Nodes:** `border-top: 1px solid rgba(255, 255, 255, 0.25); border-left: 1px solid rgba(255, 255, 255, 0.20); border-bottom: 1px solid rgba(255, 255, 255, 0.05); border-right: 1px solid rgba(255, 255, 255, 0.05);`
    *   The top and left edges are brighter, simulating light catching the "canto" of the glass from the top-left ambient source.
*   **Colored Drop Shadow:**
    *   Shadows are not pure black but are subtly tinted with a system accent color (e.g., blue `rgba(68, 138, 255, 0.1)` for panels, `rgba(68, 138, 255, 0.12)` for nodes by default). This makes shadows feel more integrated and vibrant.
    *   Example: `box-shadow: 0px 8px 24px rgba(68, 138, 255, 0.1);`.
    *   The `CommandAgentPanel` and `DebugControls` at the bottom/lower part of side panels might use a top-oriented shadow like `0 -2px 8px rgba(0,0,0,0.1)` or `0 -4px 12px rgba(0,0,0,0.1)` for distinction.
*   **Rounded Corners:** Consistent `border-radius: 0.75rem` (panels, modals) or `1rem` (nodes) for a softer, more modern feel.
*   **Node Selection/Error/Paused States:**
    *   **Selected:** The node's `box-shadow` becomes more pronounced and incorporates the `SELECTION_COLOR_ACCENT` (`#448AFF`) as an outline: `0px 10px 28px rgba(68, 138, 255, 0.22), 0 0 0 2px ${SELECTION_COLOR_ACCENT}`.
    *   **Error:** Similarly, incorporates `ERROR_COLOR_ACCENT` (`#D32F2F`): `0px 8px 20px rgba(211, 47, 47, 0.25), 0 0 0 2px ${ERROR_COLOR_ACCENT}`.
    *   **Paused:** The node background changes to `PAUSED_NODE_HIGHLIGHT_COLOR` (e.g., `rgba(255, 255, 0, 0.3)`), a yellowish semi-transparent overlay.
*   **Display Nodes (Manifestation Nodes):**
    *   Follow the general "Crystal Component" styling for borders, shadows, and backdrop filter.
    *   The body of these nodes is dedicated to rendering their specific content (value, Markdown, progress bar, table).
    *   These nodes are resizable, similar to `COMMENT` and `FRAME` nodes, to accommodate varying content sizes. Scrollbars appear within their content area if the content exceeds the node's dimensions.

### Axiom 3: Tactile Controls (Buttons & Inputs)
Buttons and input fields are designed to feel like physical components that can be pressed or interacted with. Their appearance changes based on state, providing clear visual feedback.

*   **Base Style (`.neumorphic-button`):**
    *   **Background:** Matches the panel material (`#2D3039`).
    *   **Text Color:** `rgba(255, 255, 255, 0.8)`.
    *   **Border:** Subtle `1px solid rgba(255, 255, 255, 0.05)`.
    *   **Transition:** `all 0.15s ease-out` for smooth state changes.
*   **Default State (Actionable - Convex):**
    *   **Appearance:** The button appears to emerge from the surface, inviting interaction.
    *   **Shadow Logic:** `box-shadow: 0 -1px 2px rgba(57, 60, 73, 0.5), 0 2px 3px rgba(33, 36, 41, 0.6);` (Light highlight on top, dark shadow on bottom, assuming light from above).
*   **Hover State (Intention - More Prominent Convex):**
    *   **Appearance:** The button "illuminates" slightly and becomes more prominent.
    *   **Background:** Slightly lighter (`#333742`).
    *   **Shadow Logic:** More pronounced convex shadow: `0 -2px 4px rgba(57, 60, 73, 0.7), 0 3px 5px rgba(33, 36, 41, 0.8);`.
    *   **Text/Border:** Slightly brighter.
*   **Pressed State (Action - Concave):**
    *   **Appearance:** The button visually depresses, simulating a physical press.
    *   **Background:** Slightly darker (`#2A2D34`).
    *   **Shadow Logic (Inset):** `box-shadow: inset 0 2px 3px rgba(33, 36, 41, 0.7), inset 0 -1px 2px rgba(57, 60, 73, 0.5);` (Dark inner shadow on top, light inner highlight on bottom).
    *   **Transform:** `transform: translateY(1px);` for a subtle press-down effect.
*   **Disabled State (Recessed - Concave, using `.disabled-look`):**
    *   **Appearance:** The button appears sunken and muted, visually un-pressable.
    *   **Background:** Muted (`#292C33`).
    *   **Shadow Logic (Inset):** `box-shadow: inset 0 2px 3px rgba(33, 36, 41, 0.5), inset 0 -1px 1px rgba(57, 60, 73, 0.3);`.
    *   **Text Color:** Dimmed (`rgba(255, 255, 255, 0.4)`).
    *   **Opacity:** Reduced (`opacity: 0.7`).
    *   **Cursor:** `cursor: not-allowed !important;`.
*   **Active Tab Style (`.active-tab-style`):**
    *   Maintains a convex appearance but is visually distinct.
    *   **Background:** Slightly different base (`#353942`).
    *   **Shadow Logic:** Standard convex shadows plus a subtle inner blue glow: `inset 0 0 5px rgba(68, 138, 255, 0.1);`.
    *   **Text/Border:** Accent color (e.g., sky blue for text, blue-tinted border).
*   **Primary Action Buttons (`.primary-action-button`):**
    *   These follow the same convex/concave logic but use a distinct gradient background (e.g., purple `linear-gradient(145deg, #a855f7, #7e22ce)`) and corresponding tinted shadows for highlights and depressions. This style is used for key actions like "Send" in the Command Agent Panel, "Save Graph", "Dispatch Event".
*   **Input Fields (e.g., Command Agent Input, Event Dispatch, Inspector fields):**
    *   **Background:** Darker shade (`#252830`) to appear slightly recessed within their container panel.
    *   **Border:** Subtle `rgba(255,255,255,0.1)`.
    *   **Focus State:** Ring outline and border color change to an accent color (e.g., system purple `focus:ring-purple-500 focus:border-purple-500` or sky blue `focus:ring-sky-500 focus:border-sky-500`).
    *   **Placeholder Text:** Uses a muted color like `placeholder-gray-500`.

### Axiom 4: Port Visual Language
Data port markers use distinct colors based on their `LogicalCategoryEnum` to provide an immediate visual cue about the type of data they handle. Execution ports use a consistent white, triangular marker. Connection lines are neutral grey (data) or white (execution).

*   `NUMBER`: Blue Cyan (`bg-[#33C1FF]`)
*   `STRING`: Orange (`bg-[#FFAB40]`)
*   `BOOLEAN`: Magenta/Purple (`bg-[#E040FB]`)
*   `OBJECT`: Gold Yellow (`bg-[#FFD600]`)
*   `ARRAY`: Emerald Green (`bg-[#00E676]`)
*   `ANY`: Neutral Grey (`bg-[#9E9E9E]`)
*   `VOID` (Data): Blue Grey (`bg-[#78909C]`)
*   `EXECUTION`: White marker (`text-white` for SVG fill, `bg-transparent rounded-sm` for container). Connection lines are white.
*   **Light Beam Effect:** Connected data ports emit a subtle light beam (`port-light-beam` class) into the node, colored according to the port's category, enhancing the "crystal" feel.
*   **Connection End Markers:** Connections use SVG markers (`marker-end`) that are small circles (data) or triangles (execution) filled with the connection line's color, giving a sense of the line terminating cleanly at the port's edge. Gold versions are used for intensified execution.

### Axiom 5: Dynamic Causal Conduits (Connections)
Connections are not mere