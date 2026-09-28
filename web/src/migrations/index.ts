import * as migration_20260928_012055_initial from './20260928_012055_initial';
import * as migration_20260928_230142_coverage_area_served from './20260928_230142_coverage_area_served';

export const migrations = [
  {
    up: migration_20260928_012055_initial.up,
    down: migration_20260928_012055_initial.down,
    name: '20260928_012055_initial',
  },
  {
    up: migration_20260928_230142_coverage_area_served.up,
    down: migration_20260928_230142_coverage_area_served.down,
    name: '20260928_230142_coverage_area_served'
  },
];
