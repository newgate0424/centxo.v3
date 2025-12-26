const { Client } = require('pg');
const { PrismaClient } = require('@prisma/client');
require('dotenv').config();

const prisma = new PrismaClient();

// PostgreSQL connection string from user
const PG_URL = 'postgresql://postgres.bhiwplfhvtokcxproxro:pLB8yKhjKFI2QlNt@aws-1-ap-south-1.pooler.supabase.com:5432/postgres';

async function migrate() {
  const pgClient = new Client({
    connectionString: PG_URL,
    ssl: {
      rejectUnauthorized: false
    }
  });

  try {
    await pgClient.connect();
    console.log('Connected to PostgreSQL');

    // List of tables to migrate in order (respecting foreign keys)
    const tables = [
      { name: 'User', prisma: prisma.user },
      { name: 'Account', prisma: prisma.account },
      { name: 'Session', prisma: prisma.session },
      { name: 'AdAccount', prisma: prisma.adAccount },
      { name: 'ActivityLog', prisma: prisma.activityLog },
      { name: 'ExportConfig', prisma: prisma.exportConfig },
      { name: 'SyncData', prisma: prisma.syncData },
      { name: 'ExchangeRate', prisma: prisma.exchangeRate },
      { name: 'DashboardGoal', prisma: prisma.dashboardGoal },
      { name: 'AllowedEmail', prisma: prisma.allowedEmail },
      { name: 'PasswordResetToken', prisma: prisma.passwordResetToken },
    ];

    for (const table of tables) {
      console.log(`Migrating table: ${table.name}...`);
      
      // Fetch data from PG
      // Note: Table names in PG might be lowercase or quoted
      const res = await pgClient.query(`SELECT * FROM "${table.name}"`);
      const rows = res.rows;

      if (rows.length === 0) {
        console.log(`No data found for ${table.name}, skipping.`);
        continue;
      }

      console.log(`Found ${rows.length} rows in ${table.name}. Inserting into MySQL...`);

      // Clear existing data in MySQL (Optional, but safer for clean migration)
      // await table.prisma.deleteMany({});

      // Insert into MySQL
      // We use createMany if supported, or loop through
      try {
        // Prisma's createMany is efficient
        await table.prisma.createMany({
          data: rows,
          skipDuplicates: true, // Skip if already exists
        });
        console.log(`Successfully migrated ${table.name}`);
      } catch (err) {
        console.error(`Error migrating ${table.name}:`, err.message);
        // Fallback to individual inserts if createMany fails (e.g. due to JSON fields or specific types)
        console.log(`Attempting individual inserts for ${table.name}...`);
        let successCount = 0;
        for (const row of rows) {
          try {
            await table.prisma.create({ data: row });
            successCount++;
          } catch (e) {
            // Ignore duplicates or other errors for individual rows
          }
        }
        console.log(`Migrated ${successCount}/${rows.length} rows for ${table.name}`);
      }
    }

    console.log('Migration completed successfully!');
  } catch (err) {
    console.error('Migration failed:', err);
  } finally {
    await pgClient.end();
    await prisma.$disconnect();
  }
}

migrate();
