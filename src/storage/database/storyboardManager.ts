import { eq, and, SQL, sql } from "drizzle-orm";
import { getDb } from "coze-coding-dev-sdk";
import {
  storyboards,
  insertStoryboardSchema,
  updateStoryboardSchema,
} from "./shared/schema";
import type { Storyboard, InsertStoryboard, UpdateStoryboard } from "./shared/schema";

export class StoryboardManager {
  async createStoryboard(data: InsertStoryboard): Promise<Storyboard> {
    const db = await getDb();
    const validated = insertStoryboardSchema.parse(data);
    const [storyboard] = await db.insert(storyboards).values(validated).returning();
    return storyboard;
  }

  async getStoryboards(scriptId: string): Promise<Storyboard[]> {
    const db = await getDb();
    return db
      .select()
      .from(storyboards)
      .where(eq(storyboards.scriptId, scriptId))
      .orderBy(storyboards.sequence);
  }

  async getStoryboardById(id: string): Promise<Storyboard | null> {
    const db = await getDb();
    const [storyboard] = await db
      .select()
      .from(storyboards)
      .where(eq(storyboards.id, id));
    return storyboard || null;
  }

  async updateStoryboard(
    id: string,
    data: UpdateStoryboard
  ): Promise<Storyboard | null> {
    const db = await getDb();
    const validated = updateStoryboardSchema.parse(data);
    const [storyboard] = await db
      .update(storyboards)
      .set(validated)
      .where(eq(storyboards.id, id))
      .returning();
    return storyboard || null;
  }

  async deleteStoryboard(id: string): Promise<boolean> {
    const db = await getDb();
    const result = await db.delete(storyboards).where(eq(storyboards.id, id));
    return (result.rowCount ?? 0) > 0;
  }

  async getNextSequence(scriptId: string): Promise<number> {
    const db = await getDb();
    const [result] = await db
      .select({ maxSequence: sql`MAX(${storyboards.sequence})` })
      .from(storyboards)
      .where(eq(storyboards.scriptId, scriptId));
    return (result?.maxSequence as number) ?? 0 + 1;
  }

  async reorderStoryboards(
    scriptId: string,
    storyboardIds: string[]
  ): Promise<void> {
    const db = await getDb();
    for (let i = 0; i < storyboardIds.length; i++) {
      await db
        .update(storyboards)
        .set({ sequence: i + 1 })
        .where(eq(storyboards.id, storyboardIds[i]));
    }
  }
}

export const storyboardManager = new StoryboardManager();
