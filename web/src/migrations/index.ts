import * as migration_20260928_012055_initial from './20260928_012055_initial';

export const migrations = [
  {
    up: migration_20260928_012055_initial.up,
    down: migration_20260928_012055_initial.down,
    name: '20260928_012055_initial'
  },
];
