import { PrismaClient, Role, PlanTier } from '@prisma/client';

const prisma = new PrismaClient();

async function main(): Promise<void> {
  const admin = await prisma.user.upsert({
    where: { email: 'admin@myhorrorstory.com' },
    update: {},
    create: {
      email: 'admin@myhorrorstory.com',
      passwordHash: 'replace_with_argon2_hash',
      displayName: 'System Curator',
      tier: PlanTier.PREMIUM,
      acceptedTermsAt: new Date(),
      acceptedPrivacyAt: new Date(),
      ageGateConfirmedAt: new Date(),
      roles: {
        createMany: {
          data: [{ role: Role.ADMIN }, { role: Role.SUPER_ADMIN }]
        }
      }
    }
  });

  await prisma.story.upsert({
    where: { slug: 'static-between-stations' },
    update: {},
    create: {
      slug: 'static-between-stations',
      title: 'Static Between Stations',
      hook: 'A pirate frequency calls each player by name before anyone speaks.',
      subgenre: 'psychological horror',
      tone: 'CINEMATIC',
      targetSessionMinutes: 90,
      soloSuitability: 5,
      partySuitability: 5,
      ageWarnings: ['psychological distress', 'threat'],
      location: 'Abandoned commuter rail control annex',
      version: 'v1',
      published: true,
      chapters: {
        create: {
          index: 1,
          title: 'Ghost Signal',
          synopsis: 'Investigators intercept an impossible transmission.'
        }
      }
    }
  });

  await prisma.auditLog.create({
    data: {
      actorUserId: admin.id,
      action: 'seed.completed',
      entityType: 'system',
      entityId: 'bootstrap',
      metadata: { source: 'packages/db/prisma/seed.ts' }
    }
  });
}

main()
  .then(async () => {
    await prisma.$disconnect();
  })
  .catch(async (error) => {
    console.error(error);
    await prisma.$disconnect();
    process.exit(1);
  });
