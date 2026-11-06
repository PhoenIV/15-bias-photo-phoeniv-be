#!/usr/bin/env -S node
import type { Contract as Start } from '../../snapshots/93b6141a1d1f87244b599acc6cd86eeb01e8d66c04d7573c375aa4bb3de5e97a/contract';
import startContract from '../../snapshots/93b6141a1d1f87244b599acc6cd86eeb01e8d66c04d7573c375aa4bb3de5e97a/contract.json' with { type: 'json' };
import type { Contract as End } from '../../snapshots/e494ffe37769b89df0904ef1b53ec4374ada04618b3b42576c0fd42e23f5e44a/contract';
import endContract from '../../snapshots/e494ffe37769b89df0904ef1b53ec4374ada04618b3b42576c0fd42e23f5e44a/contract.json' with { type: 'json' };
import { Migration, MigrationCLI } from '@prisma/orm-postgres/migration';

export default class M extends Migration<Start, End> {
  override readonly startContractJson = startContract;
  override readonly endContractJson = endContract;

  override get operations() {
    return [this.dropColumn({ schema: 'public', table: 'photo_card', column: 'image_url' })];
  }
}

MigrationCLI.run(import.meta.url, M);
