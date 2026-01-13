import { prisma } from './src/lib/prisma';

async function checkMetaAccount() {
  try {
    // Get all users
    const users = await prisma.user.findMany({
      select: {
        id: true,
        email: true,
        name: true,
      },
    });

    console.log('📋 Users in database:', users.length);
    
    for (const user of users) {
      console.log(`\n👤 User: ${user.email} (${user.id})`);
      
      // Check MetaAccount
      const metaAccount = await prisma.metaAccount.findUnique({
        where: { userId: user.id },
        select: {
          id: true,
          metaUserId: true,
          accessToken: true,
          accessTokenExpires: true,
          adAccountId: true,
          pageId: true,
        },
      });

      if (metaAccount) {
        console.log('  ✅ MetaAccount found:');
        console.log('    - Meta User ID:', metaAccount.metaUserId);
        console.log('    - Has Access Token:', !!metaAccount.accessToken);
        console.log('    - Token Length:', metaAccount.accessToken?.length || 0);
        console.log('    - Token Expires:', metaAccount.accessTokenExpires);
        console.log('    - Ad Account ID:', metaAccount.adAccountId);
        console.log('    - Page ID:', metaAccount.pageId);
      } else {
        console.log('  ❌ No MetaAccount found');
      }

      // Check Account table (NextAuth)
      const accounts = await prisma.account.findMany({
        where: { userId: user.id },
        select: {
          provider: true,
          access_token: true,
          providerAccountId: true,
        },
      });

      if (accounts.length > 0) {
        console.log('  📱 NextAuth Accounts:');
        accounts.forEach((acc) => {
          console.log(`    - ${acc.provider}: Has Token = ${!!acc.access_token}, Length = ${acc.access_token?.length || 0}`);
          if (acc.provider === 'facebook') {
            console.log(`      Facebook ID: ${acc.providerAccountId}`);
            console.log(`      Token Preview: ${acc.access_token?.substring(0, 20)}...`);
          }
        });
      } else {
        console.log('  ❌ No NextAuth accounts found');
      }
    }
  } catch (error) {
    console.error('Error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

checkMetaAccount();
