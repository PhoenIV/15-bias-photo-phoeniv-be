#!/usr/bin/env -S node
import type { Contract as End } from '../../snapshots/ac9d649ff5545dfd178c1fea2e8e152d1d7825f33e0d486cd2da8f0cd48214d4/contract';
import endContract from '../../snapshots/ac9d649ff5545dfd178c1fea2e8e152d1d7825f33e0d486cd2da8f0cd48214d4/contract.json' with { type: 'json' };
import type { Contract as Start } from '../../snapshots/e494ffe37769b89df0904ef1b53ec4374ada04618b3b42576c0fd42e23f5e44a/contract';
import startContract from '../../snapshots/e494ffe37769b89df0904ef1b53ec4374ada04618b3b42576c0fd42e23f5e44a/contract.json' with { type: 'json' };
import { Migration, MigrationCLI, sql } from '@prisma/orm-postgres/migration';

export default class M extends Migration<Start, End> {
  override readonly startContractJson = startContract;
  override readonly endContractJson = endContract;

  override get operations() {
    return [
      this.dropConstraint({
        schema: 'public',
        table: 'exchange_offer',
        constraint: 'exchange_offer_sale_id_offered_user_card_id_key',
      }),
      this.createIndex({
        schema: 'public',
        table: 'exchange_offer',
        index: 'exchange_offer_pending_sale_card_key_7da1d654',
        columns: ['sale_id', 'offered_user_card_id'],
        extras: { where: sql`"status" = 'PENDING'`, unique: true },
      }),
    ];
  }
}

MigrationCLI.run(import.meta.url, M);
