import * as migration_20260618_195338_initial from './20260618_195338_initial';
import * as migration_20260618_201054_phase1_data_model from './20260618_201054_phase1_data_model';
import * as migration_20260618_211043_phase2_admin_compliance from './20260618_211043_phase2_admin_compliance';
import * as migration_20260618_220742_phase3_cms from './20260618_220742_phase3_cms';
import * as migration_20260619_012655_phase3_game_reports from './20260619_012655_phase3_game_reports';
import * as migration_20260625_063707_stageb0_scheduling_foundation from './20260625_063707_stageb0_scheduling_foundation';
import * as migration_20260625_070400_stageb1_games from './20260625_070400_stageb1_games';
import * as migration_20260625_072109_stageb2_reporting from './20260625_072109_stageb2_reporting';
import * as migration_20260625_075326_stageb2_fixes from './20260625_075326_stageb2_fixes';
import * as migration_20260625_080712_stageb3_officials from './20260625_080712_stageb3_officials';

export const migrations = [
  {
    up: migration_20260618_195338_initial.up,
    down: migration_20260618_195338_initial.down,
    name: '20260618_195338_initial',
  },
  {
    up: migration_20260618_201054_phase1_data_model.up,
    down: migration_20260618_201054_phase1_data_model.down,
    name: '20260618_201054_phase1_data_model',
  },
  {
    up: migration_20260618_211043_phase2_admin_compliance.up,
    down: migration_20260618_211043_phase2_admin_compliance.down,
    name: '20260618_211043_phase2_admin_compliance',
  },
  {
    up: migration_20260618_220742_phase3_cms.up,
    down: migration_20260618_220742_phase3_cms.down,
    name: '20260618_220742_phase3_cms',
  },
  {
    up: migration_20260619_012655_phase3_game_reports.up,
    down: migration_20260619_012655_phase3_game_reports.down,
    name: '20260619_012655_phase3_game_reports',
  },
  {
    up: migration_20260625_063707_stageb0_scheduling_foundation.up,
    down: migration_20260625_063707_stageb0_scheduling_foundation.down,
    name: '20260625_063707_stageb0_scheduling_foundation',
  },
  {
    up: migration_20260625_070400_stageb1_games.up,
    down: migration_20260625_070400_stageb1_games.down,
    name: '20260625_070400_stageb1_games',
  },
  {
    up: migration_20260625_072109_stageb2_reporting.up,
    down: migration_20260625_072109_stageb2_reporting.down,
    name: '20260625_072109_stageb2_reporting',
  },
  {
    up: migration_20260625_075326_stageb2_fixes.up,
    down: migration_20260625_075326_stageb2_fixes.down,
    name: '20260625_075326_stageb2_fixes',
  },
  {
    up: migration_20260625_080712_stageb3_officials.up,
    down: migration_20260625_080712_stageb3_officials.down,
    name: '20260625_080712_stageb3_officials'
  },
];
