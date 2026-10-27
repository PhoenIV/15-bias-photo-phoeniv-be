#!/usr/bin/env -S node
import type { Contract as Start } from '../../snapshots/5d8bc954e0d3eb490e71b06fec9b131d5251005682f2d83b7535148e36d631e1/contract';
import startContract from '../../snapshots/5d8bc954e0d3eb490e71b06fec9b131d5251005682f2d83b7535148e36d631e1/contract.json' with { type: 'json' };
import type { Contract as End } from '../../snapshots/9e07ba63e0d34088ee0cb317fe58f500b9aad2eed307f24c36d2f6df98008cdf/contract';
import endContract from '../../snapshots/9e07ba63e0d34088ee0cb317fe58f500b9aad2eed307f24c36d2f6df98008cdf/contract.json' with { type: 'json' };
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

export default class M extends Migration<Start, End> {
  override readonly startContractJson = startContract;
  override readonly endContractJson = endContract;

  override get operations() {
    return [
      this.dropTable({ schema: 'public', table: 'Notification' }),
      this.dropTable({ schema: 'public', table: 'ExchangeOffer' }),
      this.dropTable({ schema: 'public', table: 'PointHistory' }),
      this.dropTable({ schema: 'public', table: 'PointDraw' }),
      this.dropTable({ schema: 'public', table: 'Purchase' }),
      this.dropTable({ schema: 'public', table: 'Sale' }),
      this.dropTable({ schema: 'public', table: 'UserCard' }),
      this.dropTable({ schema: 'public', table: 'PhotoCard' }),
      this.dropTable({ schema: 'public', table: 'User' }),
      this.createTable({
        schema: 'public',
        table: 'exchange_offer',
        columns: [
          col('created_at', 'timestamptz', {
            notNull: true,
            default: fn(sql`now()`),
            codecRef: { codecId: 'pg/timestamptz-string@1' },
          }),
          col('description', 'text', { codecRef: { codecId: 'pg/text@1' } }),
          col('id', 'SERIAL', { notNull: true, codecRef: { codecId: 'pg/int4@1' } }),
          col('offered_user_card_id', 'int4', {
            notNull: true,
            codecRef: { codecId: 'pg/int4@1' },
          }),
          col('proposer_id', 'int4', { notNull: true, codecRef: { codecId: 'pg/int4@1' } }),
          col('sale_id', 'int4', { notNull: true, codecRef: { codecId: 'pg/int4@1' } }),
          col('status', 'text', {
            notNull: true,
            default: lit('PENDING'),
            codecRef: { codecId: 'pg/text@1' },
          }),
          col('updated_at', 'timestamptz', {
            notNull: true,
            default: fn(sql`now()`),
            codecRef: { codecId: 'pg/timestamptz-string@1' },
          }),
        ],
        constraints: [
          primaryKey(['id']),
          checkExpression(
            'exchange_offer_status_check_56005a61',
            sql`"status" IN ('PENDING', 'APPROVED', 'REJECTED')`,
          ),
        ],
      }),
      this.createTable({
        schema: 'public',
        table: 'notification',
        columns: [
          col('created_at', 'timestamptz', {
            notNull: true,
            default: fn(sql`now()`),
            codecRef: { codecId: 'pg/timestamptz-string@1' },
          }),
          col('exchange_offer_id', 'int4', { codecRef: { codecId: 'pg/int4@1' } }),
          col('id', 'SERIAL', { notNull: true, codecRef: { codecId: 'pg/int4@1' } }),
          col('message', 'text', { notNull: true, codecRef: { codecId: 'pg/text@1' } }),
          col('purchase_id', 'int4', { codecRef: { codecId: 'pg/int4@1' } }),
          col('read_at', 'timestamptz', { codecRef: { codecId: 'pg/timestamptz-string@1' } }),
          col('sale_id', 'int4', { codecRef: { codecId: 'pg/int4@1' } }),
          col('type', 'text', { notNull: true, codecRef: { codecId: 'pg/text@1' } }),
          col('user_id', 'int4', { notNull: true, codecRef: { codecId: 'pg/int4@1' } }),
        ],
        constraints: [
          primaryKey(['id']),
          checkExpression(
            'notification_ref_check_eb31b53b',
            sql`(num_nonnulls("sale_id", "purchase_id", "exchange_offer_id") = 1)`,
          ),
          checkExpression(
            'notification_type_check_29c6617e',
            sql`"type" IN ('PURCHASE', 'SOLDOUT', 'EXCHANGE_APPROVED', 'EXCHANGE_REJECTED', 'EXCHANGE_OFFER_RECEIVED')`,
          ),
        ],
      }),
      this.createTable({
        schema: 'public',
        table: 'photo_card',
        columns: [
          col('created_at', 'timestamptz', {
            notNull: true,
            default: fn(sql`now()`),
            codecRef: { codecId: 'pg/timestamptz-string@1' },
          }),
          col('creator_id', 'int4', { notNull: true, codecRef: { codecId: 'pg/int4@1' } }),
          col('description', 'text', { codecRef: { codecId: 'pg/text@1' } }),
          col('genre', 'text', {
            notNull: true,
            default: lit('OTHERS'),
            codecRef: { codecId: 'pg/text@1' },
          }),
          col('grade', 'text', {
            notNull: true,
            default: lit('COMMON'),
            codecRef: { codecId: 'pg/text@1' },
          }),
          col('id', 'SERIAL', { notNull: true, codecRef: { codecId: 'pg/int4@1' } }),
          col('image_public_id', 'text', { notNull: true, codecRef: { codecId: 'pg/text@1' } }),
          col('image_url', 'text', { notNull: true, codecRef: { codecId: 'pg/text@1' } }),
          col('min_price', 'int4', { notNull: true, codecRef: { codecId: 'pg/int4@1' } }),
          col('name', 'text', { notNull: true, codecRef: { codecId: 'pg/text@1' } }),
          col('total_created', 'int4', { notNull: true, codecRef: { codecId: 'pg/int4@1' } }),
        ],
        constraints: [
          primaryKey(['id']),
          checkExpression(
            'photo_card_check_be2f7c0a',
            sql`("min_price" >= 0 AND "total_created" >= 1)`,
          ),
          checkExpression(
            'photo_card_genre_check_9d25f790',
            sql`"genre" IN ('ALBUM', 'SPECIAL', 'FAN_SIGN', 'SEASONS_GREETINGS', 'FAN_MEETING', 'CONCERT', 'MD', 'COLLAB', 'FAN_CLUB', 'OTHERS')`,
          ),
          checkExpression(
            'photo_card_grade_check_5e1f14a6',
            sql`"grade" IN ('COMMON', 'RARE', 'SUPER_RARE', 'LEGENDARY')`,
          ),
        ],
      }),
      this.createTable({
        schema: 'public',
        table: 'point_draw',
        columns: [
          col('created_at', 'timestamptz', {
            notNull: true,
            default: fn(sql`now()`),
            codecRef: { codecId: 'pg/timestamptz-string@1' },
          }),
          col('id', 'SERIAL', { notNull: true, codecRef: { codecId: 'pg/int4@1' } }),
          col('user_id', 'int4', { notNull: true, codecRef: { codecId: 'pg/int4@1' } }),
        ],
        constraints: [primaryKey(['id'])],
      }),
      this.createTable({
        schema: 'public',
        table: 'point_history',
        columns: [
          col('amount', 'int4', { notNull: true, codecRef: { codecId: 'pg/int4@1' } }),
          col('balance_after', 'int4', { notNull: true, codecRef: { codecId: 'pg/int4@1' } }),
          col('created_at', 'timestamptz', {
            notNull: true,
            default: fn(sql`now()`),
            codecRef: { codecId: 'pg/timestamptz-string@1' },
          }),
          col('id', 'SERIAL', { notNull: true, codecRef: { codecId: 'pg/int4@1' } }),
          col('point_draw_id', 'int4', { codecRef: { codecId: 'pg/int4@1' } }),
          col('purchase_id', 'int4', { codecRef: { codecId: 'pg/int4@1' } }),
          col('type', 'text', { notNull: true, codecRef: { codecId: 'pg/text@1' } }),
          col('user_id', 'int4', { notNull: true, codecRef: { codecId: 'pg/int4@1' } }),
        ],
        constraints: [
          primaryKey(['id']),
          checkExpression(
            'point_history_ref_check_82e3a824',
            sql`(("type" = 'PURCHASE' AND "purchase_id" IS NOT NULL AND "point_draw_id" IS NULL) OR ("type" = 'POINT_DRAW' AND "point_draw_id" IS NOT NULL AND "purchase_id" IS NULL))`,
          ),
          checkExpression(
            'point_history_type_check_dfd4e960',
            sql`"type" IN ('PURCHASE', 'POINT_DRAW')`,
          ),
        ],
      }),
      this.createTable({
        schema: 'public',
        table: 'purchase',
        columns: [
          col('buyer_id', 'int4', { notNull: true, codecRef: { codecId: 'pg/int4@1' } }),
          col('created_at', 'timestamptz', {
            notNull: true,
            default: fn(sql`now()`),
            codecRef: { codecId: 'pg/timestamptz-string@1' },
          }),
          col('id', 'SERIAL', { notNull: true, codecRef: { codecId: 'pg/int4@1' } }),
          col('price', 'int4', { notNull: true, codecRef: { codecId: 'pg/int4@1' } }),
          col('quantity', 'int4', { notNull: true, codecRef: { codecId: 'pg/int4@1' } }),
          col('sale_id', 'int4', { notNull: true, codecRef: { codecId: 'pg/int4@1' } }),
        ],
        constraints: [
          primaryKey(['id']),
          checkExpression('purchase_check_3a28a658', sql`("quantity" >= 1 AND "price" >= 0)`),
        ],
      }),
      this.createTable({
        schema: 'public',
        table: 'sale',
        columns: [
          col('cancelled_at', 'timestamptz', { codecRef: { codecId: 'pg/timestamptz-string@1' } }),
          col('created_at', 'timestamptz', {
            notNull: true,
            default: fn(sql`now()`),
            codecRef: { codecId: 'pg/timestamptz-string@1' },
          }),
          col('exchange_description', 'text', { codecRef: { codecId: 'pg/text@1' } }),
          col('exchange_genre', 'text', { codecRef: { codecId: 'pg/text@1' } }),
          col('exchange_grade', 'text', { codecRef: { codecId: 'pg/text@1' } }),
          col('id', 'SERIAL', { notNull: true, codecRef: { codecId: 'pg/int4@1' } }),
          col('price', 'int4', { notNull: true, codecRef: { codecId: 'pg/int4@1' } }),
          col('remaining_quantity', 'int4', { notNull: true, codecRef: { codecId: 'pg/int4@1' } }),
          col('seller_id', 'int4', { notNull: true, codecRef: { codecId: 'pg/int4@1' } }),
          col('total_quantity', 'int4', { notNull: true, codecRef: { codecId: 'pg/int4@1' } }),
          col('updated_at', 'timestamptz', {
            notNull: true,
            default: fn(sql`now()`),
            codecRef: { codecId: 'pg/timestamptz-string@1' },
          }),
          col('user_card_id', 'int4', { notNull: true, codecRef: { codecId: 'pg/int4@1' } }),
        ],
        constraints: [
          primaryKey(['id']),
          checkExpression(
            'sale_exchange_genre_check_9951e072',
            sql`"exchange_genre" IN ('ALBUM', 'SPECIAL', 'FAN_SIGN', 'SEASONS_GREETINGS', 'FAN_MEETING', 'CONCERT', 'MD', 'COLLAB', 'FAN_CLUB', 'OTHERS')`,
          ),
          checkExpression(
            'sale_exchange_grade_check_a5a1957f',
            sql`"exchange_grade" IN ('COMMON', 'RARE', 'SUPER_RARE', 'LEGENDARY')`,
          ),
          checkExpression(
            'sale_quantity_check_152ad791',
            sql`("price" >= 0 AND "total_quantity" >= 1 AND "remaining_quantity" >= 0 AND "remaining_quantity" <= "total_quantity")`,
          ),
        ],
      }),
      this.createTable({
        schema: 'public',
        table: 'user',
        columns: [
          col('created_at', 'timestamptz', {
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
            default: lit('LOCAL'),
            codecRef: { codecId: 'pg/text@1' },
          }),
          col('provider_id', 'text', { codecRef: { codecId: 'pg/text@1' } }),
          col('updated_at', 'timestamptz', {
            notNull: true,
            default: fn(sql`now()`),
            codecRef: { codecId: 'pg/timestamptz-string@1' },
          }),
        ],
        constraints: [
          primaryKey(['id']),
          checkExpression('user_point_nonnegative_ck_43ed1220', sql`("point" >= 0)`),
          checkExpression('user_provider_check_909bb46d', sql`"provider" IN ('LOCAL', 'GOOGLE')`),
          checkExpression(
            'user_provider_rule_ck_5b46b8b9',
            sql`(("provider" = 'LOCAL' AND "password" IS NOT NULL) OR ("provider" = 'GOOGLE' AND "provider_id" IS NOT NULL))`,
          ),
        ],
      }),
      this.createTable({
        schema: 'public',
        table: 'user_card',
        columns: [
          col('created_at', 'timestamptz', {
            notNull: true,
            default: fn(sql`now()`),
            codecRef: { codecId: 'pg/timestamptz-string@1' },
          }),
          col('id', 'SERIAL', { notNull: true, codecRef: { codecId: 'pg/int4@1' } }),
          col('net_quantity', 'int4', { notNull: true, codecRef: { codecId: 'pg/int4@1' } }),
          col('owner_id', 'int4', { notNull: true, codecRef: { codecId: 'pg/int4@1' } }),
          col('photo_card_id', 'int4', { notNull: true, codecRef: { codecId: 'pg/int4@1' } }),
          col('total_quantity', 'int4', { notNull: true, codecRef: { codecId: 'pg/int4@1' } }),
          col('updated_at', 'timestamptz', {
            notNull: true,
            default: fn(sql`now()`),
            codecRef: { codecId: 'pg/timestamptz-string@1' },
          }),
        ],
        constraints: [
          primaryKey(['id']),
          checkExpression(
            'user_card_quantity_check_c5b3f46f',
            sql`("net_quantity" >= 0 AND "net_quantity" <= "total_quantity")`,
          ),
        ],
      }),
      this.addUnique({
        schema: 'public',
        table: 'exchange_offer',
        constraint: 'exchange_offer_sale_id_offered_user_card_id_key',
        columns: ['sale_id', 'offered_user_card_id'],
      }),
      this.addUnique({
        schema: 'public',
        table: 'photo_card',
        constraint: 'photo_card_image_public_id_key',
        columns: ['image_public_id'],
      }),
      this.addUnique({
        schema: 'public',
        table: 'point_history',
        constraint: 'point_history_point_draw_id_key',
        columns: ['point_draw_id'],
      }),
      this.addUnique({
        schema: 'public',
        table: 'point_history',
        constraint: 'point_history_purchase_id_user_id_key',
        columns: ['purchase_id', 'user_id'],
      }),
      this.addUnique({
        schema: 'public',
        table: 'user',
        constraint: 'user_email_key',
        columns: ['email'],
      }),
      this.addUnique({
        schema: 'public',
        table: 'user',
        constraint: 'user_nickname_key',
        columns: ['nickname'],
      }),
      this.addUnique({
        schema: 'public',
        table: 'user',
        constraint: 'user_provider_provider_id_key',
        columns: ['provider', 'provider_id'],
      }),
      this.addUnique({
        schema: 'public',
        table: 'user_card',
        constraint: 'user_card_owner_id_photo_card_id_key',
        columns: ['owner_id', 'photo_card_id'],
      }),
      this.createIndex({
        schema: 'public',
        table: 'exchange_offer',
        index: 'exchange_offer_card_status_idx_0ddac7fe',
        columns: ['offered_user_card_id', 'status'],
      }),
      this.createIndex({
        schema: 'public',
        table: 'exchange_offer',
        index: 'exchange_offer_offered_user_card_id_idx_34a80427',
        columns: ['offered_user_card_id'],
      }),
      this.createIndex({
        schema: 'public',
        table: 'exchange_offer',
        index: 'exchange_offer_proposer_id_idx_f9a4d8da',
        columns: ['proposer_id'],
      }),
      this.createIndex({
        schema: 'public',
        table: 'exchange_offer',
        index: 'exchange_offer_sale_id_idx_43e6ad69',
        columns: ['sale_id'],
      }),
      this.createIndex({
        schema: 'public',
        table: 'notification',
        index: 'notification_exchange_offer_id_idx_89187884',
        columns: ['exchange_offer_id'],
      }),
      this.createIndex({
        schema: 'public',
        table: 'notification',
        index: 'notification_purchase_id_idx_91976ef4',
        columns: ['purchase_id'],
      }),
      this.createIndex({
        schema: 'public',
        table: 'notification',
        index: 'notification_sale_id_idx_43e6ad69',
        columns: ['sale_id'],
      }),
      this.createIndex({
        schema: 'public',
        table: 'notification',
        index: 'notification_unread_idx_8d07162c',
        columns: ['user_id'],
        extras: { where: sql`"read_at" IS NULL` },
      }),
      this.createIndex({
        schema: 'public',
        table: 'notification',
        index: 'notification_user_created_at_idx_b562028f',
        columns: ['user_id', 'created_at'],
      }),
      this.createIndex({
        schema: 'public',
        table: 'notification',
        index: 'notification_user_id_idx_6c952402',
        columns: ['user_id'],
      }),
      this.createIndex({
        schema: 'public',
        table: 'photo_card',
        index: 'photo_card_creator_id_idx_c8bab67a',
        columns: ['creator_id'],
      }),
      this.createIndex({
        schema: 'public',
        table: 'photo_card',
        index: 'photo_card_grade_genre_idx_9c541f43',
        columns: ['grade', 'genre'],
      }),
      this.createIndex({
        schema: 'public',
        table: 'point_draw',
        index: 'point_draw_user_created_at_idx_b562028f',
        columns: ['user_id', 'created_at'],
      }),
      this.createIndex({
        schema: 'public',
        table: 'point_draw',
        index: 'point_draw_user_id_idx_6c952402',
        columns: ['user_id'],
      }),
      this.createIndex({
        schema: 'public',
        table: 'point_history',
        index: 'point_history_purchase_id_idx_91976ef4',
        columns: ['purchase_id'],
      }),
      this.createIndex({
        schema: 'public',
        table: 'point_history',
        index: 'point_history_user_created_at_idx_b562028f',
        columns: ['user_id', 'created_at'],
      }),
      this.createIndex({
        schema: 'public',
        table: 'point_history',
        index: 'point_history_user_id_idx_6c952402',
        columns: ['user_id'],
      }),
      this.createIndex({
        schema: 'public',
        table: 'purchase',
        index: 'purchase_buyer_created_at_idx_7f687fb1',
        columns: ['buyer_id', 'created_at'],
      }),
      this.createIndex({
        schema: 'public',
        table: 'purchase',
        index: 'purchase_buyer_id_idx_a09525cc',
        columns: ['buyer_id'],
      }),
      this.createIndex({
        schema: 'public',
        table: 'purchase',
        index: 'purchase_sale_id_idx_43e6ad69',
        columns: ['sale_id'],
      }),
      this.createIndex({
        schema: 'public',
        table: 'sale',
        index: 'sale_active_created_at_idx_30867079',
        columns: ['created_at'],
        extras: { where: sql`"cancelled_at" IS NULL` },
      }),
      this.createIndex({
        schema: 'public',
        table: 'sale',
        index: 'sale_seller_id_idx_de05cd59',
        columns: ['seller_id'],
      }),
      this.createIndex({
        schema: 'public',
        table: 'sale',
        index: 'sale_user_card_id_idx_b9db0af5',
        columns: ['user_card_id'],
      }),
      this.createIndex({
        schema: 'public',
        table: 'user_card',
        index: 'user_card_owner_id_idx_ade9f347',
        columns: ['owner_id'],
      }),
      this.createIndex({
        schema: 'public',
        table: 'user_card',
        index: 'user_card_photo_card_id_idx_92021706',
        columns: ['photo_card_id'],
      }),
      this.addForeignKey({
        schema: 'public',
        table: 'exchange_offer',
        foreignKey: {
          name: 'exchange_offer_sale_id_fkey',
          columns: ['sale_id'],
          references: { schema: 'public', table: 'sale', columns: ['id'] },
          onDelete: 'restrict',
        },
      }),
      this.addForeignKey({
        schema: 'public',
        table: 'exchange_offer',
        foreignKey: {
          name: 'exchange_offer_proposer_id_fkey',
          columns: ['proposer_id'],
          references: { schema: 'public', table: 'user', columns: ['id'] },
          onDelete: 'restrict',
        },
      }),
      this.addForeignKey({
        schema: 'public',
        table: 'exchange_offer',
        foreignKey: {
          name: 'exchange_offer_offered_user_card_id_fkey',
          columns: ['offered_user_card_id'],
          references: { schema: 'public', table: 'user_card', columns: ['id'] },
          onDelete: 'restrict',
        },
      }),
      this.addForeignKey({
        schema: 'public',
        table: 'notification',
        foreignKey: {
          name: 'notification_user_id_fkey',
          columns: ['user_id'],
          references: { schema: 'public', table: 'user', columns: ['id'] },
          onDelete: 'restrict',
        },
      }),
      this.addForeignKey({
        schema: 'public',
        table: 'notification',
        foreignKey: {
          name: 'notification_sale_id_fkey',
          columns: ['sale_id'],
          references: { schema: 'public', table: 'sale', columns: ['id'] },
          onDelete: 'restrict',
        },
      }),
      this.addForeignKey({
        schema: 'public',
        table: 'notification',
        foreignKey: {
          name: 'notification_purchase_id_fkey',
          columns: ['purchase_id'],
          references: { schema: 'public', table: 'purchase', columns: ['id'] },
          onDelete: 'restrict',
        },
      }),
      this.addForeignKey({
        schema: 'public',
        table: 'notification',
        foreignKey: {
          name: 'notification_exchange_offer_id_fkey',
          columns: ['exchange_offer_id'],
          references: { schema: 'public', table: 'exchange_offer', columns: ['id'] },
          onDelete: 'restrict',
        },
      }),
      this.addForeignKey({
        schema: 'public',
        table: 'photo_card',
        foreignKey: {
          name: 'photo_card_creator_id_fkey',
          columns: ['creator_id'],
          references: { schema: 'public', table: 'user', columns: ['id'] },
          onDelete: 'restrict',
        },
      }),
      this.addForeignKey({
        schema: 'public',
        table: 'point_draw',
        foreignKey: {
          name: 'point_draw_user_id_fkey',
          columns: ['user_id'],
          references: { schema: 'public', table: 'user', columns: ['id'] },
          onDelete: 'restrict',
        },
      }),
      this.addForeignKey({
        schema: 'public',
        table: 'point_history',
        foreignKey: {
          name: 'point_history_user_id_fkey',
          columns: ['user_id'],
          references: { schema: 'public', table: 'user', columns: ['id'] },
          onDelete: 'restrict',
        },
      }),
      this.addForeignKey({
        schema: 'public',
        table: 'point_history',
        foreignKey: {
          name: 'point_history_purchase_id_fkey',
          columns: ['purchase_id'],
          references: { schema: 'public', table: 'purchase', columns: ['id'] },
          onDelete: 'restrict',
        },
      }),
      this.addForeignKey({
        schema: 'public',
        table: 'point_history',
        foreignKey: {
          name: 'point_history_point_draw_id_fkey',
          columns: ['point_draw_id'],
          references: { schema: 'public', table: 'point_draw', columns: ['id'] },
          onDelete: 'restrict',
        },
      }),
      this.addForeignKey({
        schema: 'public',
        table: 'purchase',
        foreignKey: {
          name: 'purchase_sale_id_fkey',
          columns: ['sale_id'],
          references: { schema: 'public', table: 'sale', columns: ['id'] },
          onDelete: 'restrict',
        },
      }),
      this.addForeignKey({
        schema: 'public',
        table: 'purchase',
        foreignKey: {
          name: 'purchase_buyer_id_fkey',
          columns: ['buyer_id'],
          references: { schema: 'public', table: 'user', columns: ['id'] },
          onDelete: 'restrict',
        },
      }),
      this.addForeignKey({
        schema: 'public',
        table: 'sale',
        foreignKey: {
          name: 'sale_seller_id_fkey',
          columns: ['seller_id'],
          references: { schema: 'public', table: 'user', columns: ['id'] },
          onDelete: 'restrict',
        },
      }),
      this.addForeignKey({
        schema: 'public',
        table: 'sale',
        foreignKey: {
          name: 'sale_user_card_id_fkey',
          columns: ['user_card_id'],
          references: { schema: 'public', table: 'user_card', columns: ['id'] },
          onDelete: 'restrict',
        },
      }),
      this.addForeignKey({
        schema: 'public',
        table: 'user_card',
        foreignKey: {
          name: 'user_card_photo_card_id_fkey',
          columns: ['photo_card_id'],
          references: { schema: 'public', table: 'photo_card', columns: ['id'] },
          onDelete: 'restrict',
        },
      }),
      this.addForeignKey({
        schema: 'public',
        table: 'user_card',
        foreignKey: {
          name: 'user_card_owner_id_fkey',
          columns: ['owner_id'],
          references: { schema: 'public', table: 'user', columns: ['id'] },
          onDelete: 'restrict',
        },
      }),
    ];
  }
}

MigrationCLI.run(import.meta.url, M);
