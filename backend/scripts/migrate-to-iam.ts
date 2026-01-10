import { PrismaClient } from '@prisma/client';
import { seedIAM } from '../prisma/seeds/iam.seed';

const prisma = new PrismaClient();

async function migrateToIAM() {
  console.log('🚀 Starting IAM migration...\n');

  try {
    console.log('Step 1: Running Prisma migrations...');
    console.log('Please run: npm run db:migrate\n');

    console.log('Step 2: Seeding IAM data...');
    await seedIAM();

    console.log('\n✅ IAM migration completed successfully!');
    console.log('\n📋 Next steps:');
    console.log('1. Update your routes to use requirePermission instead of requireRole');
    console.log('2. Test the new permission system');
    console.log('3. Monitor the dual-read fallback logs');
    console.log('4. Once stable, remove legacy User.role field usage\n');

  } catch (error) {
    console.error('❌ Migration failed:', error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

if (require.main === module) {
  migrateToIAM();
}

export { migrateToIAM };
