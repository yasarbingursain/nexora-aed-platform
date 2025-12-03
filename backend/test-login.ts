import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function testLogin() {
  try {
    const user = await prisma.user.findUnique({
      where: { email: 'client@demo.com' },
      include: { organization: true },
    });

    if (!user) {
      console.log('❌ User not found');
      return;
    }

    console.log('✅ User found:', {
      email: user.email,
      fullName: user.fullName,
      role: user.role,
      isActive: user.isActive,
      mfaEnabled: user.mfaEnabled,
      organizationId: user.organizationId,
    });

    const isPasswordValid = await bcrypt.compare('demo123', user.passwordHash);
    console.log('Password valid:', isPasswordValid);

  } catch (error) {
    console.error('Error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

testLogin();
