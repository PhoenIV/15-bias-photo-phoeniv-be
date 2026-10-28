import mockUsers from '../mock/users.json' with { type: 'json' };
import mockCards from '../mock/cards.json' with { type: 'json' };
import bcrypt from 'bcrypt';
import postgres from '@prisma/orm-postgres/runtime';
import { pathToFileURL, URL } from 'node:url';
import { EXIT_CODE } from '#constants';
import { contract } from '#prisma/db.js';

const BCRYPT_SALT_ROUNDS = 10;
const SEED_DATABASE_NAME = 'neondb';
const SEED_DATABASE_PORT = '5432';

// mock(JSON)에 적힌 값 → contract.prisma의 enum 값
const GRADE_MAP = {
  common: 'COMMON',
  rare: 'RARE',
  'super rare': 'SUPER_RARE',
  legendary: 'LEGENDARY',
};

const GENRE_MAP = {
  앨범: 'ALBUM',
  특전: 'SPECIAL',
  팬싸: 'FAN_SIGN',
  시즌그리팅: 'SEASONS_GREETINGS',
  팬미팅: 'FAN_MEETING',
  콘서트: 'CONCERT',
  MD: 'MD',
  콜라보: 'COLLAB',
  팬클럽: 'FAN_CLUB',
  기타: 'OTHERS',
};

// 다른 테이블이 참조하는 쪽(자식)부터 지워야 합니다. (FK가 onDelete: Restrict)
const DELETE_ORDER = [
  'Notification',
  'PointHistory',
  'PointDraw',
  'Purchase',
  'ExchangeOffer',
  'Sale',
  'UserCard',
  'PhotoCard',
  'User',
];

const mapEnum = (map, value, label) => {
  const mapped = map[value];

  if (!mapped) {
    throw new Error(
      `⚠️  mock 데이터의 ${label} 값을 변환할 수 없습니다: ${value}`,
    );
  }

  return mapped;
};

// mock id → 실제 DB id 변환. 없으면 mock 데이터가 잘못된 것이므로 바로 알려줍니다.
const getDbId = (idMap, mockId, label) => {
  const dbId = idMap.get(mockId);

  if (dbId === undefined) {
    throw new Error(
      `⚠️  mock ${label} id ${mockId}에 해당하는 데이터가 없습니다`,
    );
  }

  return dbId;
};

// imagePublicId는 필수 컬럼인데 mock에 없어서 임시 값을 만들고, id 매핑용 키로도 씁니다.
const makeImagePublicId = (card) => `seed/card-${card.id}`;

const makeUserInput = async ({ email, nickname, password, points }) => ({
  email: email.toLowerCase(),
  nickname,
  password: await bcrypt.hash(password, BCRYPT_SALT_ROUNDS),
  point: points,
});

const makePhotoCardInput = (card, creatorId) => ({
  name: card.name,
  description: card.description,
  grade: mapEnum(GRADE_MAP, card.grade, 'grade'),
  genre: mapEnum(GENRE_MAP, card.genre, 'genre'),
  minPrice: card.price,
  totalCreated: card.totalQuantity,
  imagePublicId: makeImagePublicId(card),
  imageUrl: card.imageUrl,
  creatorId,
});

// 카드를 만든 유저가 그 카드를 전부 가지고 있는 상태로 시작합니다.
const makeUserCardInput = (card, ownerId, photoCardId) => ({
  ownerId,
  photoCardId,
  netQuantity: card.totalQuantity,
  totalQuantity: card.totalQuantity,
});

const resetDb = async (db) => {
  for (const modelName of DELETE_ORDER) {
    await db.orm.public[modelName].deleteAll();
  }
};

// 반환값: Map(mock 유저 id → 실제 DB 유저 id)
export const seedUsers = async (db, users) => {
  const data = await Promise.all(users.map(makeUserInput));
  const created = await db.orm.public.User.select('id', 'email').createAll(
    data,
  );

  const idByEmail = new Map(created.map((user) => [user.email, user.id]));

  return new Map(
    users.map((user) => [user.id, idByEmail.get(user.email.toLowerCase())]),
  );
};

// 반환값: Map(mock 카드 id → 실제 DB 포토카드 id)
export const seedPhotoCards = async (db, cards, userIdMap) => {
  const data = cards.map((card) =>
    makePhotoCardInput(card, getDbId(userIdMap, card.userId, 'user')),
  );
  const created = await db.orm.public.PhotoCard.select(
    'id',
    'imagePublicId',
  ).createAll(data);

  const idByPublicId = new Map(
    created.map((photoCard) => [photoCard.imagePublicId, photoCard.id]),
  );

  return new Map(
    cards.map((card) => [card.id, idByPublicId.get(makeImagePublicId(card))]),
  );
};

export const seedUserCards = async (db, cards, userIdMap, photoCardIdMap) => {
  const data = cards.map((card) =>
    makeUserCardInput(
      card,
      getDbId(userIdMap, card.userId, 'user'),
      getDbId(photoCardIdMap, card.id, 'card'),
    ),
  );

  return await db.orm.public.UserCard.select('id').createAll(data);
};

const getDevelopmentDatabaseUrl = () => {
  if (process.env.NODE_ENV !== 'DEVELOPMENT') {
    throw new Error('⚠️  프로덕션 환경에서는 시딩을 실행하지 않습니다');
  }

  const seedDatabaseHost = process.env.SEED_DATABASE_HOST;

  if (!seedDatabaseHost) {
    throw new Error('⚠️  SEED_DATABASE_HOST가 필요합니다');
  }

  let databaseUrl;
  try {
    databaseUrl = new URL(process.env.DATABASE_URL);
  } catch {
    throw new Error('⚠️  올바른 DATABASE_URL이 필요합니다');
  }

  const protocolIsPostgreSql = ['postgres:', 'postgresql:'].includes(
    databaseUrl.protocol,
  );
  const databaseName = decodeURIComponent(databaseUrl.pathname.slice(1));
  const sslmode = databaseUrl.searchParams.get('sslmode');

  // Neon 주소는 포트를 생략하는 경우가 많아서, 비어 있으면 5432로 봅니다.
  if (
    !protocolIsPostgreSql ||
    databaseUrl.hostname !== seedDatabaseHost ||
    (databaseUrl.port || SEED_DATABASE_PORT) !== SEED_DATABASE_PORT ||
    databaseName !== SEED_DATABASE_NAME ||
    databaseUrl.searchParams.has('host') ||
    databaseUrl.searchParams.has('port') ||
    (databaseUrl.search !== '' && sslmode !== 'require') ||
    databaseUrl.hash !== ''
  ) {
    throw new Error(
      `⚠️  ${seedDatabaseHost}:${SEED_DATABASE_PORT}의 ${SEED_DATABASE_NAME} 데이터베이스에만 시딩을 실행할 수 있습니다`,
    );
  }

  console.log(`🎯 시딩 대상: ${databaseUrl.hostname}/${databaseName}`);

  return databaseUrl.toString();
};

async function seed(db) {
  console.log('🌱 시딩 시작...');

  const counts = await db.transaction(async (tx) => {
    await resetDb(tx);

    const userIdMap = await seedUsers(tx, mockUsers);

    const photoCardIdMap = await seedPhotoCards(tx, mockCards, userIdMap);

    const userCards = await seedUserCards(
      tx,
      mockCards,
      userIdMap,
      photoCardIdMap,
    );

    return {
      users: userIdMap.size,
      photoCards: photoCardIdMap.size,
      userCards: userCards.length,
    };
  });
  console.log('✅ 기존 데이터 삭제 완료');
  console.log(
    `✅ 유저 ${counts.users}명, 포토카드 ${counts.photoCards}장, 보유 카드 ${counts.userCards}개 생성`,
  );
  console.log('✅ 데이터 시딩 완료');
}

const run = async () => {
  const db = postgres({
    contract,
    url: getDevelopmentDatabaseUrl(),
  });

  try {
    await seed(db);
  } catch (error) {
    console.error('❌ 시딩 에러:', error);
    process.exitCode = EXIT_CODE.FAILURE;
  } finally {
    await db.close();
  }
};

if (
  process.argv[1] &&
  import.meta.url === pathToFileURL(process.argv[1]).href
) {
  await run();
}
