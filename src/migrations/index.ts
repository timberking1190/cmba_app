import * as migration_20260618_195338_initial from './20260618_195338_initial';

export const migrations = [
  {
    up: migration_20260618_195338_initial.up,
    down: migration_20260618_195338_initial.down,
    name: '20260618_195338_initial'
  },
];
