
import { GoogleGenAI, GenerateContentResponse, GenerateContentRequest } from "@google/genai";
import { AgentPlan, OperationTypeEnum, NodeConfig } from '../types';

let ai: GoogleGenAI | null = null;
let isAgentServiceOperational = false;
let agentServiceInitializationMessage = "Agent service has not been initialized.";

// Vite replaces process.env.XXX with the actual value at build time.
// Prioritize GEMINI_API_KEY if both are somehow set.
const apiKeyFromEnv = process.env.GEMINI_API_KEY || process.env.API_KEY;


if (apiKeyFromEnv) {
  try {
    ai = new GoogleGenAI({ apiKey: apiKeyFromEnv });
    isAgentServiceOperational = true;
    agentServiceInitializationMessage = "Agent service initialized successfully.";
    console.log("GoogleGenAI initialized successfully with API Key.");
  } catch (error) {
    console.error("Failed to initialize GoogleGenAI with API_KEY:", error);
    isAgentServiceOperational = false;
    if (error instanceof Error) {
      agentServiceInitializationMessage = `Failed to initialize agent service: ${error.message}`;
    } else {
      agentServiceInitializationMessage = "Failed to initialize agent service due to an unknown error.";
    }
  }
} else {
  const warningMessage = "API_KEY for Gemini is not set in environment variables. Agent Service will be non-operational. Please set GEMINI_API_KEY in your .env file.";
  console.warn(warningMessage);
  isAgentServiceOperational = false;
  agentServiceInitializationMessage = warningMessage;
}

export function getAgentServiceStatus(): { isOperational: boolean; message: string } {
  return { isOperational: isAgentServiceOperational, message: agentServiceInitializationMessage };
}

function buildPrompt(userCommand: string, availableOperations: string[]): string {
  const today = new Date().toLocaleDateString();
  return `
    You are an expert AI assistant for the "Logical Construction Plan" visual programming application.
    Your task is to translate a user's natural language command into a structured plan of nodes and connections.
    The current date is ${today}.

    Available Node Operation Types: ${availableOperations.join(', ')}.

    Output ONLY a single, valid JSON object. Do not include any other text, explanations, or markdown formatting like \`\`\`json.
    The JSON object should conform to the following TypeScript interface for AgentPlan:

    interface AgentPlannedNode {
      tempId: string; // e.g., "node1", "node2" - unique for this plan
      operationType: OperationTypeEnum; // Must be one of the available types
      name: string; // A descriptive name, e.g., "User Input Value", "Calculate Sum"
      config?: Partial<NodeConfig>; // e.g., { "value": 10 } for VALUE_PROVIDER, { "stateId": "myVar" } for STATE
      position: { x: number; y: number }; // Suggested initial position (e.g., x: 50, y: 100, then x: 250, y: 100 for next)
    }
    interface AgentPlannedConnection {
      fromNodeTempId: string;
      fromPortName: string; // Human-readable port name, e.g., "Value", "Sum", "Number 1", "Execute"
      toNodeTempId: string;
      toPortName: string;   // Human-readable port name
    }
    interface AgentPlan {
      planSummary: string; // A concise, human-readable summary of the steps. Max 3-4 short sentences.
      nodesToCreate: AgentPlannedNode[];
      connectionsToCreate: AgentPlannedConnection[];
    }

    VERY IMPORTANT JSON FORMATTING RULES:
    1. The entire output MUST be a single JSON object.
    2. All strings within the JSON must be enclosed in double quotes.
    3. Keys and string values must use double quotes.
    4. Arrays (like 'nodesToCreate' and 'connectionsToCreate') must be enclosed in square brackets [].
    5. Objects within an array must be complete JSON objects (starting with { and ending with }), and they MUST be separated by a comma (,). The last object in an array should NOT have a trailing comma.
    6. Ensure all curly braces {} and square brackets [] are correctly paired and nested.

    Strict Port Naming Conventions (MUST use these exact names for the specified ports):
    - VALUE_PROVIDER: Output "Value".
    - ADDITION: Inputs "Number 1", "Number 2". Output "Sum".
    - SUBTRACT: Inputs "Minuend", "Subtrahend". Output "Difference".
    - MULTIPLY: Inputs "Operand A", "Operand B". Output "Product".
    - DIVIDE: Inputs "Dividend", "Divisor". Output "Quotient".
    - MODULO: Inputs "Dividend", "Divisor". Output "Remainder".
    - CONCATENATE: Inputs "String 1", "String 2". Output "Result".
    - LOGICAL_AND: Inputs "Input 1", "Input 2". Output "Result".
    - LOGICAL_OR: Inputs "Input 1", "Input 2". Output "Result".
    - NOT: Input "Input". Output "Result".
    - EQUALS: Inputs "Value 1", "Value 2". Output "Result".
    - GREATER_THAN: Inputs "Operand A", "Operand B". Output "Result".
    - LESS_THAN: Inputs "Operand A", "Operand B". Output "Result".
    - IS_EMPTY: Input "Target". Output "Is Empty".
    - BRANCH: Inputs "Execute" (EXECUTION), "Condition" (BOOLEAN), "Input Value" (ANY). Outputs "If True (Exec)" (EXECUTION), "If False (Exec)" (EXECUTION), "If True (Data)" (ANY), "If False (Data)" (ANY).
    - ON_EVENT: Outputs "Triggered" (EXECUTION), "Payload" (ANY).
    - STATE: Inputs "Execute Action" (EXECUTION), "Set Value" (ANY), "Reset to Initial" (BOOLEAN). Outputs "Action Executed" (EXECUTION), "Current Value" (ANY).
    - ASSIGN: Input "Input". Output "Output".
    - TO_STRING: Input "Input". Output "Output".
    - UNION: Inputs "Item 1", "Item 2" (more if needed). Output "Collection".
    - RANDOM_NUMBER: Inputs "Min", "Max". Output "Result".
    - ROUND: Input "Value". Output "Result".
    - FLOOR: Input "Value". Output "Result".
    - CEIL: Input "Value". Output "Result".
    - GET_ITEM_AT_INDEX: Inputs "Collection", "Index". Output "Item".
    - COLLECTION_LENGTH: Input "Collection". Output "Length".
    - GET_PROPERTY: Inputs "Source", "Key". Output "Value".
    - SET_PROPERTY: Inputs "Source", "Key", "Value". Output "Result".
    - STRING_LENGTH: Input "Source". Output "Length".
    - SPLIT_STRING: Inputs "Source", "Delimiter". Output "Result".
    - SWITCH: Input "Value". Output "Result".
    - LOG_VALUE: Inputs "Execute" (EXECUTION), "Input" (ANY). Outputs "Executed" (EXECUTION), "Output" (ANY).
    - CONSTRUCT_OBJECT: Inputs "Key 1", "Value 1" (more if needed). Output "Object".
    - SEND_DATA: Inputs "Execute" (EXECUTION), "Data In" (ANY). Output "Executed" (EXECUTION).
    - RECEIVE_DATA: Output "Data Out" (ANY).
    (For INPUT_GRAPH, OUTPUT_GRAPH, LOOP_ITEM, ITERATION_RESULT, the port names are typically "Value", "Item", "Index", "Commit Result", "Signal" as appropriate. HOWEVER, see rules below.)

    VERY IMPORTANT CONTEXTUAL RULES FOR NODE PLACEMENT:
    - INPUT_GRAPH and OUTPUT_GRAPH nodes are special interface nodes that define the inputs and outputs of a MOLECULAR node.
    - They ONLY have meaning and function INSIDE the sub-graph of a MOLECULAR node.
    - THEREFORE, INPUT_GRAPH and OUTPUT_GRAPH nodes ARE STRICTLY PROHIBITED in the Root Graph.
    - DO NOT, under any circumstances, include INPUT_GRAPH or OUTPUT_GRAPH nodes in the 'nodesToCreate' list if you are generating a plan for the Root Graph based on the user's command.
    - If the user's command implies a self-contained function (e.g., "a function that takes price and discount, and returns final price" or "create a component that adds two numbers"):
        1. Your primary action for this in the Root Graph is to create a single MOLECULAR node (e.g., "Calculate Discount Function", "Adder Component").
        2. In the 'planSummary', clearly state that this MOLECULAR node has been created. Explain that the user needs to double-click this MOLECULAR node to define its internal logic. This internal logic would then involve using INPUT_GRAPH nodes for its inputs (e.g., Price, Discount for the first example; Number A, Number B for the second) and an OUTPUT_GRAPH node for its output (e.g., Final Price; Sum), along with the necessary calculation logic nodes (like SUBTRACT and MULTIPLY, or ADDITION).
        3. DO NOT attempt to define these internal INPUT_GRAPH/OUTPUT_GRAPH nodes or their internal connections within *this current AgentPlan*. That is a separate step for the user to perform by editing the sub-graph of the created MOLECULAR node.
    - Your plan should only contain nodes and connections valid for the current graph level implied by the command (which is assumed to be the Root Graph).
    - MOLECULAR and ITERATE nodes can only be created in the Root Graph. Do not suggest creating them if the context implies being inside another MOLECULAR or ITERATE node.
    - LOOP_ITEM and ITERATION_RESULT nodes can only be created inside an ITERATE node's sub-graph. Do not suggest creating them in the Root Graph or a general MOLECULAR node's sub-graph.

    User Command: "${userCommand}"

    Based on the user command, generate the JSON for the AgentPlan.
    Think step-by-step to identify nodes, their sequence, and connections.
    For VALUE_PROVIDER nodes, if a specific value is mentioned (e.g., "value 10", "string 'hello'"), include it in the config: \`{ "value": 10 }\` or \`{ "value": "hello" }\`. If it's a boolean, use \`{ "value": true }\` or \`{ "value": false }\`.
    For STATE nodes, if a name is hinted (e.g., "state variable 'counter'"), use that for config.stateId: \`{ "stateId": "counter" }\`.
    Assign simple names to nodes like "Value Provider 1", "Addition 1" unless a more descriptive name is obvious from the command.
    Stagger node positions horizontally by about 200-250 units for a basic left-to-right layout (e.g., node1 at x:50, y:100; node2 at x:300, y:100; node3 at x:550, y:100). Use y:200, y:300 etc. for parallel tracks if needed.
    Ensure all port names used in connections strictly adhere to the Port Naming Conventions listed above for the respective node operation types.
  `;
}

export async function processUserCommandViaAgent(
  userCommand: string,
  availableOperations: OperationTypeEnum[]
): Promise<AgentPlan | null> {
  const status = getAgentServiceStatus();
  if (!status.isOperational || !ai) {
    console.error("Agent service is not operational. Cannot process commands.", status.message);
    // No relanzar el error aquí directamente, permitir que el llamador decida cómo manejarlo.
    // El llamador (useAgentState) ya tiene lógica para appendLog.
    // Simplemente devolvemos null o una promesa rechazada si es necesario.
    // Por consistencia con el tipo de retorno, lanzaremos un error que puede ser capturado.
    throw new Error(`Agent Service Error: ${status.message}`);
  }

  const prompt = buildPrompt(userCommand, availableOperations);

  try {
    // ai is checked for nullity above by `status.isOperational` which implies `ai` is initialized.
    const generateContentParams: GenerateContentRequest = {
        model: "gemini-2.5-flash-preview-04-17", // Usando el modelo más reciente de la documentación
        contents: [{ role: "user", parts: [{ text: prompt }] }], // Estructura de Contents actualizada
        generationConfig: { // generationConfig para temperature
            responseMimeType: "application/json", // responseMimeType ahora va aquí
            temperature: 0.05,
        },
        // safetySettings: [...] // Opcional: añadir configuraciones de seguridad si es necesario
    };

    const response: GenerateContentResponse = await ai.models.generateContent(generateContentParams);

    // Gemini API (v1beta y posteriores) devuelve el JSON directamente en response.candidates[0].content.parts[0].text
    // cuando responseMimeType es "application/json".
    // No es necesario `response.text.trim()` ni quitar las vallas de markdown.
    // Referencia: https://ai.google.dev/docs/gemini_api_overview#json

    let jsonStr: string | undefined;
    if (response.candidates && response.candidates.length > 0 &&
        response.candidates[0].content && response.candidates[0].content.parts &&
        response.candidates[0].content.parts.length > 0 &&
        typeof response.candidates[0].content.parts[0].text === 'string') {
      jsonStr = response.candidates[0].content.parts[0].text;
    } else {
      console.error("Unexpected response structure from Gemini:", response);
      // Tratar de obtener texto de la manera antigua como fallback, aunque no debería ser necesario
      if (typeof (response as any).text === 'string') {
        jsonStr = (response as any).text.trim();
         // Eliminar vallas de markdown si están presentes (fallback)
        const fenceRegex = /^```(\w*)?\s*\n?(.*?)\n?\s*```$/s;
        const match = jsonStr.match(fenceRegex);
        if (match && match[2]) {
          jsonStr = match[2].trim();
        }
      } else {
        throw new Error("Agent returned no parsable content and response structure is unexpected.");
      }
    }
    
    // Remove markdown fences if present
    const fenceRegex = /^```(\w*)?\s*\n?(.*?)\n?\s*```$/s;
    const match = jsonStr.match(fenceRegex);
    if (match && match[2]) {
      jsonStr = match[2].trim();
    }

    try {
      const parsedPlan: AgentPlan = JSON.parse(jsonStr);
      // Basic validation of the parsed plan structure
      if (parsedPlan && Array.isArray(parsedPlan.nodesToCreate) && Array.isArray(parsedPlan.connectionsToCreate) && typeof parsedPlan.planSummary === 'string') {
        // Additional validation: ensure no INPUT_GRAPH or OUTPUT_GRAPH nodes are in nodesToCreate
        const hasInvalidInterfaceNodes = parsedPlan.nodesToCreate.some(
            node => node.operationType === OperationTypeEnum.INPUT_GRAPH || node.operationType === OperationTypeEnum.OUTPUT_GRAPH
        );
        if (hasInvalidInterfaceNodes) {
            console.error("Agent plan included INPUT_GRAPH or OUTPUT_GRAPH nodes at the top level, which is forbidden.", parsedPlan);
            throw new Error("Agent's plan included forbidden INPUT_GRAPH/OUTPUT_GRAPH nodes at the top level. This indicates the AI did not follow instructions properly.");
        }
        return parsedPlan;
      } else {
        console.error("Parsed plan from Gemini is missing required fields or has incorrect types:", parsedPlan);
        throw new Error("Agent's plan structure is invalid.");
      }
    } catch (e) {
      console.error("Failed to parse JSON response from Gemini:", e);
      console.error("Raw Gemini response text for debugging (after fence removal attempt):", jsonStr); 
      console.error("Original raw Gemini response text:", response.text);
      throw new Error("Agent returned invalid JSON. Check console for raw response.");
    }

  } catch (error) {
    console.error("Error calling Gemini API:", error);
    let errorMessage = "Agent failed to process the command.";
    if (error instanceof Error) {
        errorMessage = error.message;
    }
    // Check for specific GoogleGenAIError details if available
    // e.g., if (error.errorCode === 'API_KEY_INVALID') ...
    throw new Error(errorMessage);
  }
}
