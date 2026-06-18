import * as migration_20260618_195338_initial from './20260618_195338_initial';
import * as migration_20260618_201054_phase1_data_model from './20260618_201054_phase1_data_model';

export const migrations = [
  {
    up: migration_20260618_195338_initial.up,
    down: migration_20260618_195338_initial.down,
    name: '20260618_195338_initial',
  },
  {
    up: migration_20260618_201054_phase1_data_model.up,
    down: migration_20260618_201054_phase1_data_model.down,
    name: '20260618_201054_phase1_data_model'
  },
];
