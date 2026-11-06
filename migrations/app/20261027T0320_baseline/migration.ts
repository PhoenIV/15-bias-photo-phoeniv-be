#!/usr/bin/env -S node
import type { Contract as End } from '../../snapshots/5d8bc954e0d3eb490e71b06fec9b131d5251005682f2d83b7535148e36d631e1/contract';
import endContract from '../../snapshots/5d8bc954e0d3eb490e71b06fec9b131d5251005682f2d83b7535148e36d631e1/contract.json' with { type: 'json' };
import {
  Migration,
  MigrationCLI,
  checkExpression,
  col,
  fn,
  lit,
  primaryKey,
  sql,
} from '@prisma/orm-postgres/migration';

export default class M extends Migration<never, End> {
  override readonly endContractJson = endContract;

  override get operations() {
    return [
      this.createSchema({ schema: 'public' }),
      this.createTable({
        schema: 'public',
        table: 'ExchangeOffer',
        columns: [
          col('createdAt', 'timestamptz', {
            notNull: true,
            default: fn(sql`now()`),
            codecRef: { codecId: 'pg/timestamptz-string@1' },
          }),
          col('description', 'text', { codecRef: { codecId: 'pg/text@1' } }),
          col('id', 'SERIAL', { notNull: true, codecRef: { codecId: 'pg/int4@1' } }),
          col('offeredUserCardId', 'int4', { notNull: true, codecRef: { codecId: 'pg/int4@1' } }),
          col('proposerId', 'int4', { notNull: true, codecRef: { codecId: 'pg/int4@1' } }),
          col('saleId', 'int4', { notNull: true, codecRef: { codecId: 'pg/int4@1' } }),
          col('status', 'text', {
            notNull: true,
            default: lit('Pending'),
            codecRef: { codecId: 'pg/text@1' },
          }),
          col('updatedAt', 'timestamptz', {
            notNull: true,
            default: fn(sql`now()`),
            codecRef: { codecId: 'pg/timestamptz-string@1' },
          }),
        ],
        constraints: [
          primaryKey(['id']),
          checkExpression(
            'ExchangeOffer_status_check_769b3142',
            sql`"status" IN ('Pending', 'Approved', 'Rejected', 'Cancelled')`,
          ),
        ],
      }),
      this.createTable({
        schema: 'public',
        table: 'Notification',
        columns: [
          col('createdAt', 'timestamptz', {
            notNull: true,
            default: fn(sql`now()`),
            codecRef: { codecId: 'pg/timestamptz-string@1' },
          }),
          col('exchangeOfferId', 'int4', { codecRef: { codecId: 'pg/int4@1' } }),
          col('id', 'SERIAL', { notNull: true, codecRef: { codecId: 'pg/int4@1' } }),
          col('message', 'text', { notNull: true, codecRef: { codecId: 'pg/text@1' } }),
          col('purchaseId', 'int4', { codecRef: { codecId: 'pg/int4@1' } }),
          col('readAt', 'timestamptz', { codecRef: { codecId: 'pg/timestamptz-string@1' } }),
          col('saleId', 'int4', { codecRef: { codecId: 'pg/int4@1' } }),
          col('type', 'text', { notNull: true, codecRef: { codecId: 'pg/text@1' } }),
          col('userId', 'int4', { notNull: true, codecRef: { codecId: 'pg/int4@1' } }),
        ],
        constraints: [
          primaryKey(['id']),
          checkExpression(
            'Notification_type_check_b2d06bfc',
            sql`"type" IN ('Purchase', 'Soldout', 'ExchangeApproved', 'ExchangeRejected', 'ExchangeOfferReceived')`,
          ),
          checkExpression(
            'notification_ref_check_0fd367d4',
            sql`(num_nonnulls("saleId", "purchaseId", "exchangeOfferId") = 1)`,
          ),
        ],
      }),
      this.createTable({
        schema: 'public',
        table: 'PhotoCard',
        columns: [
          col('createdAt', 'timestamptz', {
            notNull: true,
            default: fn(sql`now()`),
            codecRef: { codecId: 'pg/timestamptz-string@1' },
          }),
          col('creatorId', 'int4', { notNull: true, codecRef: { codecId: 'pg/int4@1' } }),
          col('description', 'text', { codecRef: { codecId: 'pg/text@1' } }),
          col('genre', 'text', {
            notNull: true,
            default: lit('Others'),
            codecRef: { codecId: 'pg/text@1' },
          }),
          col('grade', 'text', {
            notNull: true,
            default: lit('Common'),
            codecRef: { codecId: 'pg/text@1' },
          }),
          col('id', 'SERIAL', { notNull: true, codecRef: { codecId: 'pg/int4@1' } }),
          col('imagePublicId', 'text', { notNull: true, codecRef: { codecId: 'pg/text@1' } }),
          col('imageUrl', 'text', { notNull: true, codecRef: { codecId: 'pg/text@1' } }),
          col('minPrice', 'int4', { notNull: true, codecRef: { codecId: 'pg/int4@1' } }),
          col('name', 'text', { notNull: true, codecRef: { codecId: 'pg/text@1' } }),
          col('totalCreated', 'int4', { notNull: true, codecRef: { codecId: 'pg/int4@1' } }),
        ],
        constraints: [
          primaryKey(['id']),
          checkExpression(
            'PhotoCard_genre_check_caa08e7d',
            sql`"genre" IN ('Album', 'Special', 'FanSign', 'SeasonsGreetings', 'FanMeeting', 'Concert', 'MD', 'Collab', 'FanClub', 'Others')`,
          ),
          checkExpression(
            'PhotoCard_grade_check_b973fee2',
            sql`"grade" IN ('Common', 'Rare', 'SuperRare', 'Legendary')`,
          ),
          checkExpression(
            'photo_card_check_aa270336',
            sql`("minPrice" >= 0 AND "totalCreated" >= 1)`,
          ),
        ],
      }),
      this.createTable({
        schema: 'public',
        table: 'PointDraw',
        columns: [
          col('createdAt', 'timestamptz', {
            notNull: true,
            default: fn(sql`now()`),
            codecRef: { codecId: 'pg/timestamptz-string@1' },
          }),
          col('id', 'SERIAL', { notNull: true, codecRef: { codecId: 'pg/int4@1' } }),
          col('userId', 'int4', { notNull: true, codecRef: { codecId: 'pg/int4@1' } }),
        ],
        constraints: [primaryKey(['id'])],
      }),
      this.createTable({
        schema: 'public',
        table: 'PointHistory',
        columns: [
          col('amount', 'int4', { notNull: true, codecRef: { codecId: 'pg/int4@1' } }),
          col('balanceAfter', 'int4', { notNull: true, codecRef: { codecId: 'pg/int4@1' } }),
          col('createdAt', 'timestamptz', {
            notNull: true,
            default: fn(sql`now()`),
            codecRef: { codecId: 'pg/timestamptz-string@1' },
          }),
          col('id', 'SERIAL', { notNull: true, codecRef: { codecId: 'pg/int4@1' } }),
          col('pointDrawId', 'int4', { codecRef: { codecId: 'pg/int4@1' } }),
          col('purchaseId', 'int4', { codecRef: { codecId: 'pg/int4@1' } }),
          col('type', 'text', { notNull: true, codecRef: { codecId: 'pg/text@1' } }),
          col('userId', 'int4', { notNull: true, codecRef: { codecId: 'pg/int4@1' } }),
        ],
        constraints: [
          primaryKey(['id']),
          checkExpression(
            'PointHistory_type_check_1087e67e',
            sql`"type" IN ('Purchase', 'PointDraw')`,
          ),
          checkExpression(
            'point_history_ref_check_21e7b6a9',
            sql`(("type" = 'Purchase' AND "purchaseId" IS NOT NULL AND "pointDrawId" IS NULL) OR ("type" = 'PointDraw' AND "pointDrawId" IS NOT NULL AND "purchaseId" IS NULL))`,
          ),
        ],
      }),
      this.createTable({
        schema: 'public',
        table: 'Purchase',
        columns: [
          col('buyerId', 'int4', { notNull: true, codecRef: { codecId: 'pg/int4@1' } }),
          col('createdAt', 'timestamptz', {
            notNull: true,
            default: fn(sql`now()`),
            codecRef: { codecId: 'pg/timestamptz-string@1' },
          }),
          col('id', 'SERIAL', { notNull: true, codecRef: { codecId: 'pg/int4@1' } }),
          col('price', 'int4', { notNull: true, codecRef: { codecId: 'pg/int4@1' } }),
          col('quantity', 'int4', { notNull: true, codecRef: { codecId: 'pg/int4@1' } }),
          col('saleId', 'int4', { notNull: true, codecRef: { codecId: 'pg/int4@1' } }),
        ],
        constraints: [
          primaryKey(['id']),
          checkExpression('purchase_check_3a28a658', sql`("quantity" >= 1 AND "price" >= 0)`),
        ],
      }),
      this.createTable({
        schema: 'public',
        table: 'Sale',
        columns: [
          col('cancelledAt', 'timestamptz', { codecRef: { codecId: 'pg/timestamptz-string@1' } }),
          col('createdAt', 'timestamptz', {
            notNull: true,
            default: fn(sql`now()`),
            codecRef: { codecId: 'pg/timestamptz-string@1' },
          }),
          col('exchangeDescription', 'text', { codecRef: { codecId: 'pg/text@1' } }),
          col('exchangeGenre', 'text', { codecRef: { codecId: 'pg/text@1' } }),
          col('exchangeGrade', 'text', { codecRef: { codecId: 'pg/text@1' } }),
          col('id', 'SERIAL', { notNull: true, codecRef: { codecId: 'pg/int4@1' } }),
          col('price', 'int4', { notNull: true, codecRef: { codecId: 'pg/int4@1' } }),
          col('remainingQuantity', 'int4', { notNull: true, codecRef: { codecId: 'pg/int4@1' } }),
          col('sellerId', 'int4', { notNull: true, codecRef: { codecId: 'pg/int4@1' } }),
          col('totalQuantity', 'int4', { notNull: true, codecRef: { codecId: 'pg/int4@1' } }),
          col('updatedAt', 'timestamptz', {
            notNull: true,
            default: fn(sql`now()`),
            codecRef: { codecId: 'pg/timestamptz-string@1' },
          }),
          col('userCardId', 'int4', { notNull: true, codecRef: { codecId: 'pg/int4@1' } }),
        ],
        constraints: [
          primaryKey(['id']),
          checkExpression(
            'Sale_exchangeGenre_check_738e391c',
            sql`"exchangeGenre" IN ('Album', 'Special', 'FanSign', 'SeasonsGreetings', 'FanMeeting', 'Concert', 'MD', 'Collab', 'FanClub', 'Others')`,
          ),
          checkExpression(
            'Sale_exchangeGrade_check_0fe63347',
            sql`"exchangeGrade" IN ('Common', 'Rare', 'SuperRare', 'Legendary')`,
          ),
          checkExpression(
            'sale_quantity_check_19d80806',
            sql`("price" >= 0 AND "totalQuantity" >= 1 AND "remainingQuantity" >= 0 AND "remainingQuantity" <= "totalQuantity")`,
          ),
        ],
      }),
      this.createTable({
        schema: 'public',
        table: 'User',
        columns: [
          col('createdAt', 'timestamptz', {
            notNull: true,
            default: fn(sql`now()`),
            codecRef: { codecId: 'pg/timestamptz-string@1' },
          }),
          col('email', 'text', { notNull: true, codecRef: { codecId: 'pg/text@1' } }),
          col('id', 'SERIAL', { notNull: true, codecRef: { codecId: 'pg/int4@1' } }),
          col('nickname', 'text', { notNull: true, codecRef: { codecId: 'pg/text@1' } }),
          col('password', 'text', { codecRef: { codecId: 'pg/text@1' } }),
          col('point', 'int4', {
            notNull: true,
            default: lit(0),
            codecRef: { codecId: 'pg/int4@1' },
          }),
          col('provider', 'text', {
            notNull: true,
            default: lit('Local'),
            codecRef: { codecId: 'pg/text@1' },
          }),
          col('providerId', 'text', { codecRef: { codecId: 'pg/text@1' } }),
          col('updatedAt', 'timestamptz', {
            notNull: true,
            default: fn(sql`now()`),
            codecRef: { codecId: 'pg/timestamptz-string@1' },
          }),
        ],
        constraints: [
          primaryKey(['id']),
          checkExpression('User_provider_check_6cd7b865', sql`"provider" IN ('Local', 'Google')`),
          checkExpression('user_point_check_43ed1220', sql`("point" >= 0)`),
          checkExpression(
            'user_provider_check_65fd690e',
            sql`(("provider" = 'Local' AND "password" IS NOT NULL) OR ("provider" = 'Google' AND "providerId" IS NOT NULL))`,
          ),
        ],
      }),
      this.createTable({
        schema: 'public',
        table: 'UserCard',
        columns: [
          col('createdAt', 'timestamptz', {
            notNull: true,
            default: fn(sql`now()`),
            codecRef: { codecId: 'pg/timestamptz-string@1' },
          }),
          col('id', 'SERIAL', { notNull: true, codecRef: { codecId: 'pg/int4@1' } }),
          col('netQuantity', 'int4', { notNull: true, codecRef: { codecId: 'pg/int4@1' } }),
          col('ownerId', 'int4', { notNull: true, codecRef: { codecId: 'pg/int4@1' } }),
          col('photoCardId', 'int4', { notNull: true, codecRef: { codecId: 'pg/int4@1' } }),
          col('totalQuantity', 'int4', { notNull: true, codecRef: { codecId: 'pg/int4@1' } }),
          col('updatedAt', 'timestamptz', {
            notNull: true,
            default: fn(sql`now()`),
            codecRef: { codecId: 'pg/timestamptz-string@1' },
          }),
        ],
        constraints: [
          primaryKey(['id']),
          checkExpression(
            'user_card_quantity_check_29326975',
            sql`("netQuantity" >= 0 AND "netQuantity" <= "totalQuantity")`,
          ),
        ],
      }),
      this.addUnique({
        schema: 'public',
        table: 'ExchangeOffer',
        constraint: 'ExchangeOffer_saleId_offeredUserCardId_key',
        columns: ['saleId', 'offeredUserCardId'],
      }),
      this.addUnique({
        schema: 'public',
        table: 'PointHistory',
        constraint: 'PointHistory_pointDrawId_key',
        columns: ['pointDrawId'],
      }),
      this.addUnique({
        schema: 'public',
        table: 'PointHistory',
        constraint: 'PointHistory_purchaseId_userId_key',
        columns: ['purchaseId', 'userId'],
      }),
      this.addUnique({
        schema: 'public',
        table: 'User',
        constraint: 'User_email_key',
        columns: ['email'],
      }),
      this.addUnique({
        schema: 'public',
        table: 'User',
        constraint: 'User_nickname_key',
        columns: ['nickname'],
      }),
      this.addUnique({
        schema: 'public',
        table: 'User',
        constraint: 'User_provider_providerId_key',
        columns: ['provider', 'providerId'],
      }),
      this.addUnique({
        schema: 'public',
        table: 'UserCard',
        constraint: 'UserCard_ownerId_photoCardId_key',
        columns: ['ownerId', 'photoCardId'],
      }),
      this.createIndex({
        schema: 'public',
        table: 'ExchangeOffer',
        index: 'ExchangeOffer_offeredUserCardId_idx_80a48e54',
        columns: ['offeredUserCardId'],
      }),
      this.createIndex({
        schema: 'public',
        table: 'ExchangeOffer',
        index: 'ExchangeOffer_saleId_idx_b4c0fb73',
        columns: ['saleId'],
      }),
      this.createIndex({
        schema: 'public',
        table: 'ExchangeOffer',
        index: 'exchange_offer_card_status_idx_8dc11292',
        columns: ['offeredUserCardId', 'status'],
      }),
      this.createIndex({
        schema: 'public',
        table: 'ExchangeOffer',
        index: 'exchange_offer_proposer_id_idx_a1d96f6a',
        columns: ['proposerId'],
      }),
      this.createIndex({
        schema: 'public',
        table: 'Notification',
        index: 'Notification_exchangeOfferId_idx_1e0042f8',
        columns: ['exchangeOfferId'],
      }),
      this.createIndex({
        schema: 'public',
        table: 'Notification',
        index: 'Notification_purchaseId_idx_10cddd2f',
        columns: ['purchaseId'],
      }),
      this.createIndex({
        schema: 'public',
        table: 'Notification',
        index: 'Notification_saleId_idx_b4c0fb73',
        columns: ['saleId'],
      }),
      this.createIndex({
        schema: 'public',
        table: 'Notification',
        index: 'Notification_userId_idx_a489d58a',
        columns: ['userId'],
      }),
      this.createIndex({
        schema: 'public',
        table: 'Notification',
        index: 'notification_unread_idx_4ec396a0',
        columns: ['userId'],
        extras: { where: sql`"readAt" IS NULL` },
      }),
      this.createIndex({
        schema: 'public',
        table: 'Notification',
        index: 'notification_user_created_at_idx_f726f04a',
        columns: ['userId', 'createdAt'],
      }),
      this.createIndex({
        schema: 'public',
        table: 'PhotoCard',
        index: 'photo_card_creator_id_idx_3a77d800',
        columns: ['creatorId'],
      }),
      this.createIndex({
        schema: 'public',
        table: 'PhotoCard',
        index: 'photo_card_grade_genre_idx_9c541f43',
        columns: ['grade', 'genre'],
      }),
      this.createIndex({
        schema: 'public',
        table: 'PointDraw',
        index: 'PointDraw_userId_idx_a489d58a',
        columns: ['userId'],
      }),
      this.createIndex({
        schema: 'public',
        table: 'PointDraw',
        index: 'point_draw_user_created_at_idx_f726f04a',
        columns: ['userId', 'createdAt'],
      }),
      this.createIndex({
        schema: 'public',
        table: 'PointHistory',
        index: 'PointHistory_purchaseId_idx_10cddd2f',
        columns: ['purchaseId'],
      }),
      this.createIndex({
        schema: 'public',
        table: 'PointHistory',
        index: 'PointHistory_userId_idx_a489d58a',
        columns: ['userId'],
      }),
      this.createIndex({
        schema: 'public',
        table: 'PointHistory',
        index: 'point_history_user_created_at_idx_f726f04a',
        columns: ['userId', 'createdAt'],
      }),
      this.createIndex({
        schema: 'public',
        table: 'Purchase',
        index: 'Purchase_buyerId_idx_80be0de9',
        columns: ['buyerId'],
      }),
      this.createIndex({
        schema: 'public',
        table: 'Purchase',
        index: 'purchase_buyer_created_at_idx_7547b79f',
        columns: ['buyerId', 'createdAt'],
      }),
      this.createIndex({
        schema: 'public',
        table: 'Purchase',
        index: 'purchase_sale_id_idx_b4c0fb73',
        columns: ['saleId'],
      }),
      this.createIndex({
        schema: 'public',
        table: 'Sale',
        index: 'sale_active_created_at_idx_d8d6fad2',
        columns: ['createdAt'],
        extras: { where: sql`"cancelledAt" IS NULL` },
      }),
      this.createIndex({
        schema: 'public',
        table: 'Sale',
        index: 'sale_seller_id_idx_d71255f2',
        columns: ['sellerId'],
      }),
      this.createIndex({
        schema: 'public',
        table: 'Sale',
        index: 'sale_user_card_id_idx_5ba616ea',
        columns: ['userCardId'],
      }),
      this.createIndex({
        schema: 'public',
        table: 'UserCard',
        index: 'UserCard_ownerId_idx_e2d0c1ef',
        columns: ['ownerId'],
      }),
      this.createIndex({
        schema: 'public',
        table: 'UserCard',
        index: 'user_card_photo_card_id_idx_f3ca9eb9',
        columns: ['photoCardId'],
      }),
      this.addForeignKey({
        schema: 'public',
        table: 'ExchangeOffer',
        foreignKey: {
          name: 'ExchangeOffer_saleId_fkey',
          columns: ['saleId'],
          references: { schema: 'public', table: 'Sale', columns: ['id'] },
          onDelete: 'restrict',
        },
      }),
      this.addForeignKey({
        schema: 'public',
        table: 'ExchangeOffer',
        foreignKey: {
          name: 'ExchangeOffer_proposerId_fkey',
          columns: ['proposerId'],
          references: { schema: 'public', table: 'User', columns: ['id'] },
          onDelete: 'restrict',
        },
      }),
      this.addForeignKey({
        schema: 'public',
        table: 'ExchangeOffer',
        foreignKey: {
          name: 'ExchangeOffer_offeredUserCardId_fkey',
          columns: ['offeredUserCardId'],
          references: { schema: 'public', table: 'UserCard', columns: ['id'] },
          onDelete: 'restrict',
        },
      }),
      this.addForeignKey({
        schema: 'public',
        table: 'Notification',
        foreignKey: {
          name: 'Notification_userId_fkey',
          columns: ['userId'],
          references: { schema: 'public', table: 'User', columns: ['id'] },
          onDelete: 'restrict',
        },
      }),
      this.addForeignKey({
        schema: 'public',
        table: 'Notification',
        foreignKey: {
          name: 'Notification_saleId_fkey',
          columns: ['saleId'],
          references: { schema: 'public', table: 'Sale', columns: ['id'] },
          onDelete: 'restrict',
        },
      }),
      this.addForeignKey({
        schema: 'public',
        table: 'Notification',
        foreignKey: {
          name: 'Notification_purchaseId_fkey',
          columns: ['purchaseId'],
          references: { schema: 'public', table: 'Purchase', columns: ['id'] },
          onDelete: 'restrict',
        },
      }),
      this.addForeignKey({
        schema: 'public',
        table: 'Notification',
        foreignKey: {
          name: 'Notification_exchangeOfferId_fkey',
          columns: ['exchangeOfferId'],
          references: { schema: 'public', table: 'ExchangeOffer', columns: ['id'] },
          onDelete: 'restrict',
        },
      }),
      this.addForeignKey({
        schema: 'public',
        table: 'PhotoCard',
        foreignKey: {
          name: 'PhotoCard_creatorId_fkey',
          columns: ['creatorId'],
          references: { schema: 'public', table: 'User', columns: ['id'] },
          onDelete: 'restrict',
        },
      }),
      this.addForeignKey({
        schema: 'public',
        table: 'PointDraw',
        foreignKey: {
          name: 'PointDraw_userId_fkey',
          columns: ['userId'],
          references: { schema: 'public', table: 'User', columns: ['id'] },
          onDelete: 'restrict',
        },
      }),
      this.addForeignKey({
        schema: 'public',
        table: 'PointHistory',
        foreignKey: {
          name: 'PointHistory_userId_fkey',
          columns: ['userId'],
          references: { schema: 'public', table: 'User', columns: ['id'] },
          onDelete: 'restrict',
        },
      }),
      this.addForeignKey({
        schema: 'public',
        table: 'PointHistory',
        foreignKey: {
          name: 'PointHistory_purchaseId_fkey',
          columns: ['purchaseId'],
          references: { schema: 'public', table: 'Purchase', columns: ['id'] },
          onDelete: 'restrict',
        },
      }),
      this.addForeignKey({
        schema: 'public',
        table: 'PointHistory',
        foreignKey: {
          name: 'PointHistory_pointDrawId_fkey',
          columns: ['pointDrawId'],
          references: { schema: 'public', table: 'PointDraw', columns: ['id'] },
          onDelete: 'restrict',
        },
      }),
      this.addForeignKey({
        schema: 'public',
        table: 'Purchase',
        foreignKey: {
          name: 'Purchase_saleId_fkey',
          columns: ['saleId'],
          references: { schema: 'public', table: 'Sale', columns: ['id'] },
          onDelete: 'restrict',
        },
      }),
      this.addForeignKey({
        schema: 'public',
        table: 'Purchase',
        foreignKey: {
          name: 'Purchase_buyerId_fkey',
          columns: ['buyerId'],
          references: { schema: 'public', table: 'User', columns: ['id'] },
          onDelete: 'restrict',
        },
      }),
      this.addForeignKey({
        schema: 'public',
        table: 'Sale',
        foreignKey: {
          name: 'Sale_sellerId_fkey',
          columns: ['sellerId'],
          references: { schema: 'public', table: 'User', columns: ['id'] },
          onDelete: 'restrict',
        },
      }),
      this.addForeignKey({
        schema: 'public',
        table: 'Sale',
        foreignKey: {
          name: 'Sale_userCardId_fkey',
          columns: ['userCardId'],
          references: { schema: 'public', table: 'UserCard', columns: ['id'] },
          onDelete: 'restrict',
        },
      }),
      this.addForeignKey({
        schema: 'public',
        table: 'UserCard',
        foreignKey: {
          name: 'UserCard_photoCardId_fkey',
          columns: ['photoCardId'],
          references: { schema: 'public', table: 'PhotoCard', columns: ['id'] },
          onDelete: 'restrict',
        },
      }),
      this.addForeignKey({
        schema: 'public',
        table: 'UserCard',
        foreignKey: {
          name: 'UserCard_ownerId_fkey',
          columns: ['ownerId'],
          references: { schema: 'public', table: 'User', columns: ['id'] },
          onDelete: 'restrict',
        },
      }),
    ];
  }
}

MigrationCLI.run(import.meta.url, M);
