
import { AtomicNodeDefinition, OperationTypeEnum, LogicalCategoryEnum, PortTypeEnum, AtomicNode, NodeConfig, InputPort, OutputPort } from '../types';
import { generatePortId } from '../services/nodeFactory';
import * as Icons from '../components/Icons';
import { DEFAULT_VISUAL_DICE_ROLLER_WIDTH, DEFAULT_VISUAL_DICE_ROLLER_CONTENT_HEIGHT } from '../constants';

const defaultFooterConfig = { footerNoteText: '', showFooterNote: false };

// Helper to find an input port by name or throw an error
function findInputPortOrFail(node: AtomicNode, portName: string): InputPort {
    const port = node.inputPorts.find(p => p.name === portName);
    if (!port) throw new Error(`Input port '\${portName}' not found on node '\${node.name}'.`);
    return port;
}
function findOutputPortOrFail(node: AtomicNode, portName: string): OutputPort {
    const port = node.outputPorts.find(p => p.name === portName);
    if (!port) throw new Error(`Output port '\${portName}' not found on node '\${node.name}'.`);
    return port;
}

export const arcanumInstrumentumModule = {
  id: 'arcanum_instrumentum',
  name: "Arcanum Instrumentum (D&D Toolkit)",
  description: "Nodes for Dungeons & Dragons character sheets, dice rolling, and game mechanics.",
  atomicNodeDefinitions: [
    {
      operationType: OperationTypeEnum.DICE_ROLLER,
      name: 'Dice Roller (Notation)',
      description: "Rolls dice based on standard notation (e.g., '2d6+3').",
      category: 'D&D: Core Mechanics',
      icon: Icons.D20Icon,
      defaultConfig: { 
        diceNotation: '1d20', 
        showFooterNote: true,
        footerNoteText: "Rolls dice based on text notation (e.g., '2d6+3', '1d20'). Input 'Notation' or configure default. Outputs 'Total Result' and 'Individual Rolls'."
      },
      portGenerator: (nodeId: string, config?: Partial<NodeConfig>) => ({
        inputPorts: [
          { id: generatePortId(nodeId, 'in', 'Notation'), name: 'Notation', category: LogicalCategoryEnum.DICE_NOTATION, portType: PortTypeEnum.DATA, description: "Dice notation (e.g., 1d20, 2d6+3)." },
        ],
        outputPorts: [
          { id: generatePortId(nodeId, 'out', 'Total Result'), name: 'Total Result', category: LogicalCategoryEnum.NUMBER, portType: PortTypeEnum.DATA, description: "The sum of all dice rolled including modifiers." },
          { id: generatePortId(nodeId, 'out', 'Individual Rolls'), name: 'Individual Rolls', category: LogicalCategoryEnum.ARRAY, portType: PortTypeEnum.DATA, description: "Array of individual die results before modifiers." },
        ],
      }),
      resolveOutputs: (node, resolvedInputs, _, metaState) => {
        const notationPort = findInputPortOrFail(node, 'Notation');
        const notationStr = resolvedInputs[notationPort.id] as string || node.config?.diceNotation || '1d20';
        
        const match = notationStr.toLowerCase().match(/(\d+)?d(\d+)([+-]\d+)?/);
        if (!match) {
          metaState.log.push({timestamp:Date.now(), nodeId:node.id, message: `Invalid dice notation: \${notationStr}`, type:'error'});
          return {
            [`\${node.id}_\${findOutputPortOrFail(node, 'Total Result').id}`]: 0,
            [`\${node.id}_\${findOutputPortOrFail(node, 'Individual Rolls').id}`]: [],
          };
        }
        const count = parseInt(match[1] || '1', 10);
        const sides = parseInt(match[2], 10);
        const modifier = parseInt(match[3] || '0', 10);

        if (isNaN(count) || isNaN(sides) || count <= 0 || sides <= 0) {
          metaState.log.push({timestamp:Date.now(), nodeId:node.id, message: `Invalid dice parameters in notation: \${notationStr}`, type:'error'});
           return {
            [`\${node.id}_\${findOutputPortOrFail(node, 'Total Result').id}`]: 0,
            [`\${node.id}_\${findOutputPortOrFail(node, 'Individual Rolls').id}`]: [],
          };
        }
        
        const rolls = [];
        let sum = 0;
        for (let i = 0; i < count; i++) {
          const roll = Math.floor(Math.random() * sides) + 1;
          rolls.push(roll);
          sum += roll;
        }
        sum += modifier;

        return {
          [`\${node.id}_\${findOutputPortOrFail(node, 'Total Result').id}`]: sum,
          [`\${node.id}_\${findOutputPortOrFail(node, 'Individual Rolls').id}`]: rolls,
        };
      },
    },
    {
      operationType: OperationTypeEnum.VISUAL_DICE_ROLLER,
      name: 'Visual Dice Roller',
      description: "Visually rolls a single die and displays the result.",
      category: 'D&D: Core Mechanics',
      icon: Icons.D20Icon, // Or a new, more specific icon
      defaultConfig: {
        diceFaces: 20,
        lastRoll: 1,
        showFooterNote: true,
        footerNoteText: "Visually rolls a single die. Click 'Roll!' in header. Configura las caras del dado (ej: d4, d6, d20, d100) en el Inspector o Modal de Configuración.",
        frameWidth: DEFAULT_VISUAL_DICE_ROLLER_WIDTH,
        frameHeight: DEFAULT_VISUAL_DICE_ROLLER_CONTENT_HEIGHT
      },
      portGenerator: () => ({ // No input/output ports
        inputPorts: [],
        outputPorts: [],
      }),
      resolveOutputs: () => ({}), // No data outputs to resolve
    },
    {
      operationType: OperationTypeEnum.WEAPON_ATTACK,
      name: 'Weapon Attack',
      description: "Represents a weapon attack, calculating hit and damage.",
      category: 'D&D: Equipment & Items',
      icon: Icons.CrossedSwordsIcon,
      defaultConfig: { 
        diceNotation: '1d8', 
        showFooterNote: true,
        footerNoteText: "Simula un ataque. Entradas: 'Attack Bonus Mod', 'Damage Dice' (ej: '1d8+STR'), 'Target AC'. Salidas: 'Attack Roll Total', 'Is Hit', 'Damage Dealt'."
      },
      portGenerator: (nodeId: string) => ({
        inputPorts: [
          { id: generatePortId(nodeId, 'in', 'Attack Bonus Mod'), name: 'Attack Bonus Mod', category: LogicalCategoryEnum.ATTACK_BONUS, portType: PortTypeEnum.DATA, description: "Total modifier for the attack roll (e.g., from ability score, proficiency)." },
          { id: generatePortId(nodeId, 'in', 'Damage Dice'), name: 'Damage Dice', category: LogicalCategoryEnum.DICE_NOTATION, portType: PortTypeEnum.DATA, description: "Damage dice (e.g., 1d8, 2d6+STR)." },
          { id: generatePortId(nodeId, 'in', 'Target AC'), name: 'Target AC', category: LogicalCategoryEnum.NUMBER, portType: PortTypeEnum.DATA, description: "Armor Class of the target." },
        ],
        outputPorts: [
          { id: generatePortId(nodeId, 'out', 'Attack Roll Total'), name: 'Attack Roll Total', category: LogicalCategoryEnum.NUMBER, portType: PortTypeEnum.DATA, description: "Result of d20 + Attack Bonus Mod." },
          { id: generatePortId(nodeId, 'out', 'Is Hit'), name: 'Is Hit', category: LogicalCategoryEnum.BOOLEAN, portType: PortTypeEnum.DATA, description: "True if Attack Roll Total >= Target AC." },
          { id: generatePortId(nodeId, 'out', 'Damage Dealt'), name: 'Damage Dealt', category: LogicalCategoryEnum.DAMAGE_ROLL, portType: PortTypeEnum.DATA, description: "Total damage if it's a hit." },
        ],
      }),
      resolveOutputs: (node, resolvedInputs, _, metaState) => {
        const attackBonus = resolvedInputs[findInputPortOrFail(node, 'Attack Bonus Mod').id] as number || 0;
        const targetAC = resolvedInputs[findInputPortOrFail(node, 'Target AC').id] as number || 10;
        const damageDiceNotation = resolvedInputs[findInputPortOrFail(node, 'Damage Dice').id] as string || node.config?.diceNotation || '1d6';

        const d20Roll = Math.floor(Math.random() * 20) + 1;
        const attackRollTotal = d20Roll + attackBonus;
        const isHit = attackRollTotal >= targetAC;
        
        let damageDealt = 0;
        if (isHit) {
           const damageMatch = damageDiceNotation.match(/(\d+)?d(\d+)([+-]\d+)?/);
           if(damageMatch) {
               const numDice = parseInt(damageMatch[1] || '1', 10);
               const diceSides = parseInt(damageMatch[2], 10);
               const damModifier = parseInt(damageMatch[3] || '0', 10);
               for(let i=0; i<numDice; i++) damageDealt += Math.floor(Math.random() * diceSides) + 1;
               damageDealt += damModifier;
           } else {
               damageDealt = 1; 
               metaState.log.push({timestamp:Date.now(), nodeId:node.id, message: `Invalid damage dice notation: \${damageDiceNotation}`, type:'error'});
           }
        }
        
        return {
          [`\${node.id}_\${findOutputPortOrFail(node, 'Attack Roll Total').id}`]: attackRollTotal,
          [`\${node.id}_\${findOutputPortOrFail(node, 'Is Hit').id}`]: isHit,
          [`\${node.id}_\${findOutputPortOrFail(node, 'Damage Dealt').id}`]: damageDealt,
        };
      },
    },
    {
      operationType: OperationTypeEnum.CHARACTER_ABILITY_SCORE,
      name: 'Character Ability Score',
      description: "Represents a D&D ability score (e.g., Strength) and its modifier.",
      category: 'D&D: Character Attributes',
      icon: Icons.UserCircleIcon,
      defaultConfig: { 
        abilityScoreName: "Strength", 
        value: 10, 
        showFooterNote: true,
        footerNoteText: "Representa una puntuación de habilidad. Entrada: 'Base Score' (1-30). Salidas: 'Score Value', 'Modifier' ((Puntuación-10)/2, redondeado hacia abajo). Configuración por defecto: Fuerza 10."
      },
      portGenerator: (nodeId: string, config?: Partial<NodeConfig>) => ({
        inputPorts: [
            { id: generatePortId(nodeId, 'in', 'Base Score'), name: 'Base Score', category: LogicalCategoryEnum.NUMBER, portType: PortTypeEnum.DATA, description: "The base ability score value (1-30)." },
        ],
        outputPorts: [
          { id: generatePortId(nodeId, 'out', 'Score Value'), name: 'Score Value', category: LogicalCategoryEnum.CHARACTER_STAT, portType: PortTypeEnum.DATA, description: "The ability score." },
          { id: generatePortId(nodeId, 'out', 'Modifier'), name: 'Modifier', category: LogicalCategoryEnum.NUMBER, portType: PortTypeEnum.DATA, description: "The modifier ((Score - 10) / 2, floored)." },
        ],
      }),
      resolveOutputs: (node, resolvedInputs) => {
        const baseScorePort = findInputPortOrFail(node, 'Base Score');
        const scoreValue = resolvedInputs[baseScorePort.id] as number ?? node.config?.value ?? 10;
        const modifier = Math.floor((scoreValue - 10) / 2);
        return {
          [`\${node.id}_\${findOutputPortOrFail(node, 'Score Value').id}`]: scoreValue,
          [`\${node.id}_\${findOutputPortOrFail(node, 'Modifier').id}`]: modifier,
        };
      },
    },
  ] as AtomicNodeDefinition[],
  componentBlueprints: [],
};
