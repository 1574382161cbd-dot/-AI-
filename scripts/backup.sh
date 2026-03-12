#!/bin/bash

# Database Backup Script
# Usage: ./scripts/backup.sh

set -e

BACKUP_DIR="${BACKUP_DIR:-./backups}"
RETENTION_DAYS="${BACKUP_RETENTION_DAYS:-7}"

echo "Starting database backup..."
echo "Backup directory: $BACKUP_DIR"
echo "Retention: $RETENTION_DAYS days"

mkdir -p "$BACKUP_DIR"

if [ -z "$DATABASE_URL" ]; then
    echo "Error: DATABASE_URL environment variable is required"
    exit 1
fi

npx tsx scripts/backup.ts

echo "Backup completed successfully"
