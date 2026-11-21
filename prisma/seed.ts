import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

// معرّفات ثابتة ليسهل الاختبار اليدوي
export const SEED_SLOTS = Array.from({ length: 8 }, (_, i) => {
  const start = new Date(Date.UTC(2030, 0, 15, 9 + Math.floor(i / 2), (i % 2) * 30));
  return {
    id: `00000000-0000-4000-8000-00000000000${i + 1}`,
    startsAt: start,
    endsAt: new Date(start.getTime() + 30 * 60 * 1000),
  };
});

async function main() {
  for (const slot of SEED_SLOTS) {
    await prisma.slot.upsert({ where: { id: slot.id }, update: {}, create: slot });
  }
  console.log(`Seeded ${SEED_SLOTS.length} slots`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
