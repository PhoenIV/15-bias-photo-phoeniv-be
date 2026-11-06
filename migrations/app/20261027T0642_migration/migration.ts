#!/usr/bin/env -S node
import type { Contract as End } from '../../snapshots/93b6141a1d1f87244b599acc6cd86eeb01e8d66c04d7573c375aa4bb3de5e97a/contract';
import endContract from '../../snapshots/93b6141a1d1f87244b599acc6cd86eeb01e8d66c04d7573c375aa4bb3de5e97a/contract.json' with { type: 'json' };
import type { Contract as Start } from '../../snapshots/9e07ba63e0d34088ee0cb317fe58f500b9aad2eed307f24c36d2f6df98008cdf/contract';
import startContract from '../../snapshots/9e07ba63e0d34088ee0cb317fe58f500b9aad2eed307f24c36d2f6df98008cdf/contract.json' with { type: 'json' };
import { Migration, MigrationCLI, sql } from '@prisma/orm-postgres/migration';

export default class M extends Migration<Start, End> {
  override readonly startContractJson = startContract;
  override readonly endContractJson = endContract;

  override get operations() {
    return [
      this.dropCheckConstraint({
        schema: 'public',
        table: 'exchange_offer',
        constraint: 'exchange_offer_status_check_56005a61',
      }),
      this.dropDefault({ schema: 'public', table: 'exchange_offer', column: 'updated_at' }),
      this.dropDefault({ schema: 'public', table: 'sale', column: 'updated_at' }),
      this.dropDefault({ schema: 'public', table: 'user', column: 'updated_at' }),
      this.dropDefault({ schema: 'public', table: 'user_card', column: 'updated_at' }),
      this.addCheckConstraint({
        schema: 'public',
        table: 'exchange_offer',
        constraint: 'exchange_offer_status_check_57fe5f48',
        expression: sql`"status" IN ('PENDING', 'APPROVED', 'REJECTED', 'CANCELLED')`,
      }),
    ];
  }
}

MigrationCLI.run(import.meta.url, M);
