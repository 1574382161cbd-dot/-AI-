import { eq } from "drizzle-orm";
import { getDb } from "coze-coding-dev-sdk";
import { scenes, insertSceneSchema, updateSceneSchema } from "./shared/schema";
import type { Scene, InsertScene, UpdateScene } from "./shared/schema";

export class SceneManager {
  async createScene(data: InsertScene): Promise<Scene> {
    const db = await getDb();
    const validated = insertSceneSchema.parse(data);
    const [scene] = await db.insert(scenes).values(validated).returning();
    return scene;
  }

  async getScenes(scriptId: string): Promise<Scene[]> {
    const db = await getDb();
    return db
      .select()
      .from(scenes)
      .where(eq(scenes.scriptId, scriptId))
      .orderBy(scenes.createdAt);
  }

  async getSceneById(id: string): Promise<Scene | null> {
    const db = await getDb();
    const [scene] = await db.select().from(scenes).where(eq(scenes.id, id));
    return scene || null;
  }

  async updateScene(id: string, data: UpdateScene): Promise<Scene | null> {
    const db = await getDb();
    const validated = updateSceneSchema.parse(data);
    const [scene] = await db
      .update(scenes)
      .set(validated)
      .where(eq(scenes.id, id))
      .returning();
    return scene || null;
  }

  async deleteScene(id: string): Promise<boolean> {
    const db = await getDb();
    const result = await db.delete(scenes).where(eq(scenes.id, id));
    return (result.rowCount ?? 0) > 0;
  }
}

export const sceneManager = new SceneManager();
