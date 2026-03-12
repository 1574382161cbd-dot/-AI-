import { exec } from 'child_process';
import { promisify } from 'util';
import fs from 'fs/promises';
import path from 'path';

const execAsync = promisify(exec);

function parseDatabaseUrl(url: string) {
  const regex = /postgresql:\/\/([^:]+):([^@]+)@([^:]+):(\d+)\/(.+)/;
  const match = url.match(regex);
  
  if (!match) {
    throw new Error('Invalid DATABASE_URL format');
  }
  
  return {
    user: match[1],
    password: match[2],
    host: match[3],
    port: match[4],
    database: match[5],
  };
}

async function restore(backupFile: string) {
  const databaseUrl = process.env.DATABASE_URL;
  
  if (!databaseUrl) {
    console.error('DATABASE_URL environment variable is required');
    process.exit(1);
  }
  
  if (!backupFile) {
    console.error('Backup file path is required');
    console.error('Usage: npx tsx scripts/restore.ts <backup-file>');
    process.exit(1);
  }
  
  const dbConfig = parseDatabaseUrl(databaseUrl);
  
  console.log(`Starting restore from: ${backupFile}`);
  console.log(`Target database: ${dbConfig.database}`);
  
  const env = {
    ...process.env,
    PGPASSWORD: dbConfig.password,
  };
  
  const psqlCommand = `psql -h ${dbConfig.host} -p ${dbConfig.port} -U ${dbConfig.user} -d ${dbConfig.database} -f "${backupFile}"`;
  
  try {
    await execAsync(psqlCommand, { env });
    console.log('Restore completed successfully');
  } catch (error) {
    console.error('Restore failed:', error);
    throw error;
  }
}

const backupFile = process.argv[2];
restore(backupFile);
