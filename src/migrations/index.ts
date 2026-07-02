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
import * as migration_20260625_082918_stageb4_push_devices from './20260625_082918_stageb4_push_devices';
import * as migration_20260625_084235_stageb5_brackets_incidents_scaffolds from './20260625_084235_stageb5_brackets_incidents_scaffolds';
import * as migration_20260630_020454_add_mfa_schema from './20260630_020454_add_mfa_schema';
import * as migration_20260630_125952_add_audit_integrity from './20260630_125952_add_audit_integrity';
import * as migration_20260630_170515_f1a_engagement_foundation from './20260630_170515_f1a_engagement_foundation';
import * as migration_20260630_173652_f2_recognitions_consents from './20260630_173652_f2_recognitions_consents';
import * as migration_20260630_205617_f3_notification_prefs from './20260630_205617_f3_notification_prefs';
import * as migration_20260630_205953_now_challenges from './20260630_205953_now_challenges';
import * as migration_20260630_214120_challenge_team from './20260630_214120_challenge_team';
import * as migration_20260630_220346_now_quiz_attempts from './20260630_220346_now_quiz_attempts';
import * as migration_20260702_175004_arcade_scores from './20260702_175004_arcade_scores';
import * as migration_20260702_195156_member_cards_core from './20260702_195156_member_cards_core';
import * as migration_20260702_205536_add_gates_member_card from './20260702_205536_add_gates_member_card';
import * as migration_20260702_214557_member_card_scannable_roles from './20260702_214557_member_card_scannable_roles';

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
    name: '20260625_080712_stageb3_officials',
  },
  {
    up: migration_20260625_082918_stageb4_push_devices.up,
    down: migration_20260625_082918_stageb4_push_devices.down,
    name: '20260625_082918_stageb4_push_devices',
  },
  {
    up: migration_20260625_084235_stageb5_brackets_incidents_scaffolds.up,
    down: migration_20260625_084235_stageb5_brackets_incidents_scaffolds.down,
    name: '20260625_084235_stageb5_brackets_incidents_scaffolds',
  },
  {
    up: migration_20260630_020454_add_mfa_schema.up,
    down: migration_20260630_020454_add_mfa_schema.down,
    name: '20260630_020454_add_mfa_schema',
  },
  {
    up: migration_20260630_125952_add_audit_integrity.up,
    down: migration_20260630_125952_add_audit_integrity.down,
    name: '20260630_125952_add_audit_integrity',
  },
  {
    up: migration_20260630_170515_f1a_engagement_foundation.up,
    down: migration_20260630_170515_f1a_engagement_foundation.down,
    name: '20260630_170515_f1a_engagement_foundation',
  },
  {
    up: migration_20260630_173652_f2_recognitions_consents.up,
    down: migration_20260630_173652_f2_recognitions_consents.down,
    name: '20260630_173652_f2_recognitions_consents',
  },
  {
    up: migration_20260630_205617_f3_notification_prefs.up,
    down: migration_20260630_205617_f3_notification_prefs.down,
    name: '20260630_205617_f3_notification_prefs',
  },
  {
    up: migration_20260630_205953_now_challenges.up,
    down: migration_20260630_205953_now_challenges.down,
    name: '20260630_205953_now_challenges',
  },
  {
    up: migration_20260630_214120_challenge_team.up,
    down: migration_20260630_214120_challenge_team.down,
    name: '20260630_214120_challenge_team',
  },
  {
    up: migration_20260630_220346_now_quiz_attempts.up,
    down: migration_20260630_220346_now_quiz_attempts.down,
    name: '20260630_220346_now_quiz_attempts',
  },
  {
    up: migration_20260702_175004_arcade_scores.up,
    down: migration_20260702_175004_arcade_scores.down,
    name: '20260702_175004_arcade_scores',
  },
  {
    up: migration_20260702_195156_member_cards_core.up,
    down: migration_20260702_195156_member_cards_core.down,
    name: '20260702_195156_member_cards_core',
  },
  {
    up: migration_20260702_205536_add_gates_member_card.up,
    down: migration_20260702_205536_add_gates_member_card.down,
    name: '20260702_205536_add_gates_member_card',
  },
  {
    up: migration_20260702_214557_member_card_scannable_roles.up,
    down: migration_20260702_214557_member_card_scannable_roles.down,
    name: '20260702_214557_member_card_scannable_roles'
  },
];
