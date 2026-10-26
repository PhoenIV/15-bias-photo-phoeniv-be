import postgres from '@prisma/orm-postgres/runtime';
import { contractFromJson } from '@prisma/orm-postgres/static';
import contractJson from './contract.json' with { type: 'json' };

/** @typedef {import('./contract.js').Contract} Contract */

export const contract = contractFromJson(contractJson)

/** @type {import('@prisma/orm-postgres/runtime').PostgresClient<Contract>} */

export const db = postgres({
    contract,
    url: process.env.DATABASE_URL
})