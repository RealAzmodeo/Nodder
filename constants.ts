
import { LogicalCategoryEnum, OperationTypeEnum, PortTypeEnum } from './types'; 

export const MAX_CYCLE_DEPTH_LIMIT = 10;
export const MAX_EXECUTION_STEPS = 1000; 
export const DEFAULT_MAX_ITERATIONS = 100; 

export const NODE_WIDTH = 400; // Doubled from 200
export const NODE_HEADER_HEIGHT = 40; // Kept original, new width should suffice
export const NODE_PORT_HEIGHT = 42; // Increased by 50% from 28
export const NODE_PORT_WIDTH = NODE_WIDTH; 
export const NODE_PORT_MARKER_SIZE = 10; 
export const EXECUTION_PORT_MARKER_SIZE = 12; 

export const EXECUTION_PORT_COLOR_BG = 'bg-[#FFFFFF]'; // White for execution port markers
export const EXECUTION_CONNECTION_STROKE = '#FFFFFF'; // White for execution connection lines

export const DEFAULT_COMMENT_WIDTH = 200;
export const DEFAULT_COMMENT_HEIGHT = 100;
export const DEFAULT_FRAME_WIDTH = 300;
export const DEFAULT_FRAME_HEIGHT = 200;

// Defaults for the content area of display nodes (excluding header/footer)
export const DEFAULT_DISPLAY_VALUE_CONTENT_HEIGHT = 60; 
export const DEFAULT_DISPLAY_MARKDOWN_CONTENT_HEIGHT = 120; 
export const DEFAULT_PROGRESS_BAR_CONTENT_HEIGHT = 60; 
export const DEFAULT_DATA_TABLE_CONTENT_HEIGHT = 180; 
export const DEFAULT_VISUAL_DICE_ROLLER_CONTENT_HEIGHT = 100;

// Default widths for display nodes (can be overridden by node.config.frameWidth)
export const DEFAULT_DISPLAY_VALUE_WIDTH = NODE_WIDTH;
export const DEFAULT_DISPLAY_MARKDOWN_WIDTH = NODE_WIDTH;
export const DEFAULT_PROGRESS_BAR_WIDTH = NODE_WIDTH;
export const DEFAULT_DATA_TABLE_WIDTH = NODE_WIDTH; 
export const DEFAULT_VISUAL_DICE_ROLLER_WIDTH = 200; 


export const RESIZE_HANDLE_SIZE = 12; 
export const MIN_RESIZABLE_NODE_WIDTH = 150; 
export const MIN_RESIZABLE_NODE_HEIGHT = 80; 


export const NODE_FOOTER_PADDING_Y = 4; 
export const NODE_FOOTER_LINE_HEIGHT = 14; 
export const NODE_FOOTER_MAX_LINES = 6; // Increased from 3 to 6
export const NODE_FOOTER_BORDER_HEIGHT = 1; 

export const MIN_ZOOM = 0.1;
export const MAX_ZOOM = 3.0;

// Debugger UI constants
export const BREAKPOINT_MARKER_SIZE = 8;
export const BREAKPOINT_MARKER_COLOR = 'bg-red-500';
export const BREAKPOINT_MARKER_BORDER_COLOR = 'border-white';
export const PAUSED_NODE_HIGHLIGHT_COLOR = 'rgba(255, 255, 0, 0.3)'; // Yellowish semi-transparent

// Node header text colors. Background and border are now glassmorphic.
export const NODE_TYPE_COLORS: Record<OperationTypeEnum | 'MOLECULAR_WRAPPER' | 'COMPONENT_BLUEPRINT', { headerText: string }> = {
  [OperationTypeEnum.VALUE_PROVIDER]: { headerText: 'text-sky-300' },
  [OperationTypeEnum.ADDITION]: { headerText: 'text-green-300' },
  [OperationTypeEnum.CONCATENATE]: { headerText: 'text-amber-300' },
  [OperationTypeEnum.LOGICAL_AND]: { headerText: 'text-purple-300' },
  [OperationTypeEnum.LOGICAL_OR]: { headerText: 'text-purple-300' },
  [OperationTypeEnum.LOGICAL_XOR]: { headerText: 'text-purple-300' },
  [OperationTypeEnum.ASSIGN]: { headerText: 'text-gray-300' },
  [OperationTypeEnum.UNION]: { headerText: 'text-indigo-300' },
  [OperationTypeEnum.TO_STRING]: { headerText: 'text-cyan-300' },
  
  [OperationTypeEnum.EQUALS]: { headerText: 'text-lime-300' },
  [OperationTypeEnum.GREATER_THAN]: { headerText: 'text-lime-300' },
  [OperationTypeEnum.LESS_THAN]: { headerText: 'text-lime-300' },
  [OperationTypeEnum.IS_EMPTY]: { headerText: 'text-lime-300' },
  [OperationTypeEnum.NOT]: { headerText: 'text-purple-300' },
  
  [OperationTypeEnum.BRANCH]: { headerText: 'text-orange-300' },
  [OperationTypeEnum.ON_EVENT]: { headerText: 'text-pink-300' }, 

  [OperationTypeEnum.INPUT_GRAPH]: { headerText: 'text-pink-400' },
  [OperationTypeEnum.OUTPUT_GRAPH]: { headerText: 'text-fuchsia-400' },
  [OperationTypeEnum.MOLECULAR]: { headerText: 'text-rose-300' }, 
  MOLECULAR_WRAPPER: { headerText: 'text-teal-300' }, 
  COMPONENT_BLUEPRINT: { headerText: 'text-blue-300' },


  [OperationTypeEnum.ITERATE]: { headerText: 'text-yellow-300' }, 
  [OperationTypeEnum.LOOP_ITEM]: { headerText: 'text-yellow-200' }, 
  [OperationTypeEnum.ITERATION_RESULT]: { headerText: 'text-yellow-200' },

  [OperationTypeEnum.STATE]: { headerText: 'text-red-300' },

  [OperationTypeEnum.RANDOM_NUMBER]: { headerText: 'text-teal-300' },
  [OperationTypeEnum.ROUND]: { headerText: 'text-emerald-300' },
  [OperationTypeEnum.FLOOR]: { headerText: 'text-emerald-300' },
  [OperationTypeEnum.CEIL]: { headerText: 'text-emerald-300' },
  [OperationTypeEnum.SUBTRACT]: { headerText: 'text-green-300' },
  [OperationTypeEnum.MULTIPLY]: { headerText: 'text-green-300' },
  [OperationTypeEnum.DIVIDE]: { headerText: 'text-green-300' },
  [OperationTypeEnum.MODULO]: { headerText: 'text-green-300' },

  [OperationTypeEnum.GET_ITEM_AT_INDEX]: { headerText: 'text-blue-300' },
  [OperationTypeEnum.COLLECTION_LENGTH]: { headerText: 'text-blue-300' },
  [OperationTypeEnum.GET_PROPERTY]: { headerText: 'text-indigo-300' },
  [OperationTypeEnum.SET_PROPERTY]: { headerText: 'text-indigo-300' },
  [OperationTypeEnum.STRING_LENGTH]: { headerText: 'text-cyan-300' },
  [OperationTypeEnum.SPLIT_STRING]: { headerText: 'text-cyan-300' },
  [OperationTypeEnum.SWITCH]: { headerText: 'text-orange-300' },
  [OperationTypeEnum.LOG_VALUE]: { headerText: 'text-slate-300' },
  [OperationTypeEnum.CONSTRUCT_OBJECT]: { headerText: 'text-purple-300' },

  [OperationTypeEnum.COMMENT]: { headerText: 'text-yellow-700' }, 
  [OperationTypeEnum.FRAME]: { headerText: 'text-gray-200' }, 
  [OperationTypeEnum.SEND_DATA]: { headerText: 'text-rose-300' },
  [OperationTypeEnum.RECEIVE_DATA]: { headerText: 'text-emerald-300' },

  // Manifestation Nodes
  [OperationTypeEnum.DISPLAY_VALUE]: { headerText: 'text-teal-200' },
  [OperationTypeEnum.DISPLAY_MARKDOWN_TEXT]: { headerText: 'text-lime-200' },
  [OperationTypeEnum.PROGRESS_BAR]: { headerText: 'text-sky-200' },
  [OperationTypeEnum.DATA_TABLE]: { headerText: 'text-fuchsia-200' },

  // D&D Player's Toolkit Nodes ("Arcanum Instrumentum")
  [OperationTypeEnum.DICE_ROLLER]: { headerText: 'text-amber-300' },
  [OperationTypeEnum.VISUAL_DICE_ROLLER]: { headerText: 'text-amber-200' }, 
  [OperationTypeEnum.ADVANTAGE_ROLL]: { headerText: 'text-amber-300' },
  [OperationTypeEnum.CHECK_DC]: { headerText: 'text-amber-300' },
  [OperationTypeEnum.WEAPON_ATTACK]: { headerText: 'text-orange-300' },
  [OperationTypeEnum.ARMOR_CLASS]: { headerText: 'text-orange-300' },
  [OperationTypeEnum.CHARACTER_ABILITY_SCORE]: { headerText: 'text-yellow-300' },
  [OperationTypeEnum.SKILL_PROFICIENCY]: { headerText: 'text-yellow-300' },
  [OperationTypeEnum.SPELL_SLOT_TRACKER]: { headerText: 'text-purple-300' }, 
  [OperationTypeEnum.CAST_SPELL]: { headerText: 'text-purple-300' },
  [OperationTypeEnum.RESOURCE_TRACKER]: { headerText: 'text-red-400' }, 
};


export const PORT_CATEGORY_COLORS: Record<LogicalCategoryEnum, string> = {
    [LogicalCategoryEnum.NUMBER]: 'bg-[#33C1FF]', 
    [LogicalCategoryEnum.STRING]: 'bg-[#FFAB40]', 
    [LogicalCategoryEnum.BOOLEAN]: 'bg-[#E040FB]',
    [LogicalCategoryEnum.OBJECT]: 'bg-[#FFD600]', 
    [LogicalCategoryEnum.ARRAY]: 'bg-[#00E676]',  
    [LogicalCategoryEnum.ANY]: 'bg-[#9E9E9E]',    
    [LogicalCategoryEnum.VOID]: 'bg-[#78909C]',   
    [LogicalCategoryEnum.DAMAGE_ROLL]: 'bg-red-700', 
    [LogicalCategoryEnum.ATTACK_BONUS]: 'bg-slate-500', 
    [LogicalCategoryEnum.CHARACTER_STAT]: 'bg-amber-700', 
    [LogicalCategoryEnum.ACTION_TYPE]: 'bg-green-700', 
    [LogicalCategoryEnum.DICE_NOTATION]: 'bg-orange-500', 
};

export const PORT_CATEGORY_HEX_COLORS: Record<LogicalCategoryEnum, string> = {
    [LogicalCategoryEnum.NUMBER]: '#33C1FF',
    [LogicalCategoryEnum.STRING]: '#FFAB40',
    [LogicalCategoryEnum.BOOLEAN]: '#E040FB',
    [LogicalCategoryEnum.OBJECT]: '#FFD600',
    [LogicalCategoryEnum.ARRAY]: '#00E676',
    [LogicalCategoryEnum.ANY]: '#9E9E9E',
    [LogicalCategoryEnum.VOID]: '#78909C',
    [LogicalCategoryEnum.DAMAGE_ROLL]: '#B91C1C',
    [LogicalCategoryEnum.ATTACK_BONUS]: '#64748B',
    [LogicalCategoryEnum.CHARACTER_STAT]: '#B45309',
    [LogicalCategoryEnum.ACTION_TYPE]: '#047857',
    [LogicalCategoryEnum.DICE_NOTATION]: '#F97316',
};


export const SELECTION_COLOR_ACCENT = '#448AFF'; 
export const ERROR_COLOR_ACCENT = '#D32F2F';     
export const ARCANUM_SELECTION_COLOR_ACCENT = '#F59E0B'; 
