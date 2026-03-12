import { NextResponse } from 'next/server';
import { db } from '@/storage/database';

interface HealthCheckResult {
  status: 'healthy' | 'unhealthy';
  timestamp: string;
  uptime: number;
  version: string;
  checks: {
    database: {
      status: 'ok' | 'error';
      latency?: number;
      error?: string;
    };
    environment: {
      status: 'ok' | 'warning';
      missing?: string[];
    };
  };
}

export async function GET() {
  const startTime = Date.now();
  const healthCheck: HealthCheckResult = {
    status: 'healthy',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    version: process.env.npm_package_version || '0.1.0',
    checks: {
      database: {
        status: 'ok',
      },
      environment: {
        status: 'ok',
      },
    },
  };

  try {
    const dbStart = Date.now();
    await db.execute('SELECT 1');
    healthCheck.checks.database.latency = Date.now() - dbStart;
  } catch (error) {
    healthCheck.checks.database.status = 'error';
    healthCheck.checks.database.error = error instanceof Error ? error.message : 'Unknown database error';
    healthCheck.status = 'unhealthy';
  }

  const requiredEnvVars = ['DATABASE_URL'];
  const missingEnvVars = requiredEnvVars.filter(envVar => !process.env[envVar]);
  
  if (missingEnvVars.length > 0) {
    healthCheck.checks.environment.status = 'warning';
    healthCheck.checks.environment.missing = missingEnvVars;
  }

  const statusCode = healthCheck.status === 'healthy' ? 200 : 503;
  
  return NextResponse.json(healthCheck, { status: statusCode });
}

export async function HEAD() {
  try {
    await db.execute('SELECT 1');
    return new NextResponse(null, { status: 200 });
  } catch {
    return new NextResponse(null, { status: 503 });
  }
}
