import { getDb } from "coze-coding-dev-sdk";
import { users, loginLogs, operationLogs, verificationCodes } from "./shared/schema";
import type { User, InsertUser, LoginLog, InsertLoginLog, OperationLog, InsertOperationLog, VerificationCode, InsertVerificationCode } from "./shared/schema";
import { eq, and, desc, gt, lte } from "drizzle-orm";

export class UserManager {
  // 根据手机号查找用户
  async findUserByPhone(phone: string): Promise<User | null> {
    const db = await getDb();
    const result = await db.select().from(users).where(eq(users.phone, phone)).limit(1);
    return result[0] || null;
  }

  // 创建用户
  async createUser(data: InsertUser): Promise<User> {
    const db = await getDb();
    const result = await db.insert(users).values(data).returning();
    return result[0];
  }

  // 更新用户
  async updateUser(id: string, data: Partial<InsertUser>): Promise<User | null> {
    const db = await getDb();
    const result = await db.update(users)
      .set({ ...data, updatedAt: new Date() })
      .where(eq(users.id, id))
      .returning();
    return result[0] || null;
  }

  // 根据ID获取用户
  async getUserById(id: string): Promise<User | null> {
    const db = await getDb();
    const result = await db.select().from(users).where(eq(users.id, id)).limit(1);
    return result[0] || null;
  }

  // 查找用户（通过ID）
  async findUserById(id: string): Promise<User | null> {
    return this.getUserById(id);
  }

  // 创建登录日志
  async createLoginLog(data: InsertLoginLog): Promise<LoginLog> {
    const db = await getDb();
    const result = await db.insert(loginLogs).values(data).returning();
    return result[0];
  }

  // 获取用户登录日志
  async getUserLoginLogs(userId: string, limit: number = 50): Promise<LoginLog[]> {
    const db = await getDb();
    return db.select()
      .from(loginLogs)
      .where(eq(loginLogs.userId, userId))
      .orderBy(desc(loginLogs.loginTime))
      .limit(limit);
  }

  // 创建操作日志
  async createOperationLog(data: InsertOperationLog): Promise<OperationLog> {
    const db = await getDb();
    const result = await db.insert(operationLogs).values(data).returning();
    return result[0];
  }

  // 获取用户操作日志
  async getUserOperationLogs(userId: string, limit: number = 100): Promise<OperationLog[]> {
    const db = await getDb();
    return db.select()
      .from(operationLogs)
      .where(eq(operationLogs.userId, userId))
      .orderBy(desc(operationLogs.operationTime))
      .limit(limit);
  }

  // 创建验证码
  async createVerificationCode(data: InsertVerificationCode): Promise<VerificationCode> {
    const db = await getDb();
    const result = await db.insert(verificationCodes).values(data).returning();
    return result[0];
  }

  // 创建验证码（别名，支持params参数）
  async createVerificationCodeWithParams(params: {
    phone: string;
    code: string;
    type: 'login' | 'register' | 'reset_password';
    expiresAt: Date;
  }): Promise<void> {
    const db = await getDb();
    await db.insert(verificationCodes).values(params);
  }

  // 查找最新的有效验证码
  async findValidVerificationCode(phone: string, type: string): Promise<VerificationCode | null> {
    const db = await getDb();
    const now = new Date();
    const result = await db.select()
      .from(verificationCodes)
      .where(
        and(
          eq(verificationCodes.phone, phone),
          eq(verificationCodes.type, type),
          eq(verificationCodes.used, false),
          gt(verificationCodes.expiresAt, now)
        )
      )
      .orderBy(desc(verificationCodes.createdAt))
      .limit(1);
    return result[0] || null;
  }

  // 验证验证码
  async verifyCode(phone: string, code: string, type: string): Promise<boolean> {
    const db = await getDb();
    const now = new Date();
    const result = await db.select()
      .from(verificationCodes)
      .where(
        and(
          eq(verificationCodes.phone, phone),
          eq(verificationCodes.code, code),
          eq(verificationCodes.type, type),
          eq(verificationCodes.used, false),
          gt(verificationCodes.expiresAt, now)
        )
      )
      .limit(1);

    if (result.length === 0) {
      return false;
    }

    // 标记为已使用
    await db.update(verificationCodes)
      .set({ used: true })
      .where(eq(verificationCodes.id, result[0].id));

    return true;
  }

  // 清理过期验证码
  async cleanupExpiredCodes(): Promise<void> {
    const db = await getDb();
    const now = new Date();
    await db.delete(verificationCodes).where(lte(verificationCodes.expiresAt, now));
  }

  // 更新最后登录信息
  async updateLastLogin(userId: string, ip: string): Promise<void> {
    const db = await getDb();
    await db.update(users)
      .set({
        lastLoginAt: new Date(),
        lastLoginIp: ip,
        updatedAt: new Date(),
      })
      .where(eq(users.id, userId));
  }
}

export const userManager = new UserManager();
