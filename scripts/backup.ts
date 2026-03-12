import { exec } from 'child_process';
import { promisify } from 'util';
import fs from 'fs/promises';
import path from 'path';

const execAsync = promisify(exec);

interface BackupConfig {
  databaseUrl: string;
  backupDir: string;
  retentionDays: number;
}

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

async function ensureBackupDir(dir: string) {
  try {
    await fs.mkdir(dir, { recursive: true });
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code !== 'EEXIST') {
      throw error;
    }
  }
}

async function createBackup(config: BackupConfig): Promise<string> {
  const { databaseUrl, backupDir } = config;
  const dbConfig = parseDatabaseUrl(databaseUrl);
  
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
  const backupFile = path.join(backupDir, `backup-${timestamp}.sql`);
  
  console.log(`Starting backup for database: ${dbConfig.database}`);
  console.log(`Backup file: ${backupFile}`);
  
  const env = {
    ...process.env,
    PGPASSWORD: dbConfig.password,
  };
  
  const pgDumpCommand = `pg_dump -h ${dbConfig.host} -p ${dbConfig.port} -U ${dbConfig.user} -d ${dbConfig.database} -F p -f "${backupFile}"`;
  
  try {
    await execAsync(pgDumpCommand, { env });
    console.log('Backup completed successfully');
    return backupFile;
  } catch (error) {
    console.error('Backup failed:', error);
    throw error;
  }
}

async function cleanOldBackups(backupDir: string, retentionDays: number) {
  const files = await fs.readdir(backupDir);
  const now = Date.now();
  const retentionMs = retentionDays * 24 * 60 * 60 * 1000;
  
  for (const file of files) {
    if (!file.startsWith('backup-') || !file.endsWith('.sql')) {
      continue;
    }
    
    const filePath = path.join(backupDir, file);
    const stats = await fs.stat(filePath);
    const fileAge = now - stats.mtimeMs;
    
    if (fileAge > retentionMs) {
      console.log(`Deleting old backup: ${file}`);
      await fs.unlink(filePath);
    }
  }
}

async function main() {
  const databaseUrl = process.env.DATABASE_URL;
  
  if (!databaseUrl) {
    console.error('DATABASE_URL environment variable is required');
    process.exit(1);
  }
  
  const config: BackupConfig = {
    databaseUrl,
    backupDir: process.env.BACKUP_DIR || './backups',
    retentionDays: parseInt(process.env.BACKUP_RETENTION_DAYS || '7', 10),
  };
  
  try {
    await ensureBackupDir(config.backupDir);
    await createBackup(config);
    await cleanOldBackups(config.backupDir, config.retentionDays);
    console.log('Backup process completed');
  } catch (error) {
    console.error('Backup process failed:', error);
    process.exit(1);
  }
}

main();
