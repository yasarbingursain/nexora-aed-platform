import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function testDatabase() {
  try {
    console.log('🔍 Testing database connection...');
    
    // Test basic connection
    await prisma.$connect();
    console.log('✅ Database connection successful');
    
    // Count records in each table
    const orgCount = await prisma.organization.count();
    const userCount = await prisma.user.count();
    const identityCount = await prisma.identity.count();
    const threatCount = await prisma.threat.count();
    const apiKeyCount = await prisma.apiKey.count();
    
    console.log('\n📊 Database Statistics:');
    console.log(`   Organizations: ${orgCount}`);
    console.log(`   Users: ${userCount}`);
    console.log(`   Identities: ${identityCount}`);
    console.log(`   Threats: ${threatCount}`);
    console.log(`   API Keys: ${apiKeyCount}`);
    
    // Get sample data
    const sampleOrg = await prisma.organization.findFirst({
      include: {
        users: true,
        identities: true,
        threats: true
      }
    });
    
    if (sampleOrg) {
      console.log('\n🏢 Sample Organization:');
      console.log(`   Name: ${sampleOrg.name}`);
      console.log(`   Domain: ${sampleOrg.domain}`);
      console.log(`   Subscription: ${sampleOrg.subscriptionTier}`);
      console.log(`   Users: ${sampleOrg.users.length}`);
      console.log(`   Identities: ${sampleOrg.identities.length}`);
      console.log(`   Threats: ${sampleOrg.threats.length}`);
    }
    
    // Test authentication users
    const users = await prisma.user.findMany({
      select: {
        email: true,
        fullName: true,
        role: true,
        isActive: true
      }
    });
    
    console.log('\n👥 Demo Users:');
    users.forEach((user: { email: string; fullName: string; role: string; isActive: boolean }) => {
      console.log(`   ${user.email} (${user.role}) - ${user.isActive ? 'Active' : 'Inactive'}`);
    });
    
    console.log('\n🎉 Database test completed successfully!');
    console.log('\n🔗 Access Prisma Studio at: http://localhost:5555');
    console.log('🔗 Demo Login Credentials:');
    console.log('   Admin: admin@demo.com / demo123');
    console.log('   Client: client@demo.com / demo123');
    
  } catch (error) {
    console.error('❌ Database test failed:', error);
  } finally {
    await prisma.$disconnect();
  }
}

testDatabase();
