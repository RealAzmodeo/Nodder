

import { LogicalModule } from '../types';
import { coreModule } from './core';
import { mathModule } from './math';
import { dataStructuresModule } from './dataStructures';
import { logicModule } from './logic';
import { flowControlModule } from './flowControl';
import { channelsModule } from './channels';
import { commonComponentsModule } from './commonComponents';
import { manifestationModule } from './manifestation'; 
import { arcanumInstrumentumModule } from './arcanumInstrumentum'; // Added D&D module


// The `AtomicNodeDefinition` within each of these modules
// will now need to be updated to include `resolveOutputs` and/or `processStep` methods
// containing the logic previously in executionService.ts's switch cases.

export const allModules: LogicalModule[] = [
  coreModule,
  mathModule,
  dataStructuresModule,
  logicModule,
  flowControlModule,
  channelsModule,
  manifestationModule,
  arcanumInstrumentumModule, // Added D&D module
  commonComponentsModule,
];