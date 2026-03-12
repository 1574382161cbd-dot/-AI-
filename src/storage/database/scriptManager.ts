import { eq, and, SQL } from "drizzle-orm";
import { getDb } from "coze-coding-dev-sdk";
import {
  scripts,
  insertScriptSchema,
  updateScriptSchema,
} from "./shared/schema";
import type { Script, InsertScript, UpdateScript } from "./shared/schema";

export class ScriptManager {
  async createScript(data: InsertScript): Promise<Script> {
    const db = await getDb();
    const validated = insertScriptSchema.parse(data);
    
    const [script] = await db.insert(scripts).values(validated).returning({
      id: scripts.id,
      title: scripts.title,
      type: scripts.type,
      description: scripts.description,
      storyContent: scripts.storyContent,
      fullVideoUrl: scripts.fullVideoUrl,
      createdAt: scripts.createdAt,
      updatedAt: scripts.updatedAt,
    });
    
    // 添加默认的 storyStyle（不在数据库中存储）
    return { ...script, storyStyle: 'modern' } as Script;
  }

  async getScripts(options: {
    skip?: number;
    limit?: number;
    type?: string;
  } = {}): Promise<Script[]> {
    const { skip = 0, limit = 100, type } = options;
    const db = await getDb();

    let results: any[];
    
    if (type) {
      results = await db
        .select({
          id: scripts.id,
          title: scripts.title,
          type: scripts.type,
          description: scripts.description,
          storyContent: scripts.storyContent,
          fullVideoUrl: scripts.fullVideoUrl,
          createdAt: scripts.createdAt,
          updatedAt: scripts.updatedAt,
        })
        .from(scripts)
        .where(eq(scripts.type, type))
        .limit(limit)
        .offset(skip)
        .orderBy(scripts.createdAt);
    } else {
      results = await db
        .select({
          id: scripts.id,
          title: scripts.title,
          type: scripts.type,
          description: scripts.description,
          storyContent: scripts.storyContent,
          fullVideoUrl: scripts.fullVideoUrl,
          createdAt: scripts.createdAt,
          updatedAt: scripts.updatedAt,
        })
        .from(scripts)
        .limit(limit)
        .offset(skip)
        .orderBy(scripts.createdAt);
    }
    
    // 添加默认的 storyStyle
    return results.map(script => ({ ...script, storyStyle: 'modern' } as Script));
  }

  async getScriptById(id: string): Promise<Script | null> {
    const db = await getDb();
    const [script] = await db
      .select({
        id: scripts.id,
        title: scripts.title,
        type: scripts.type,
        description: scripts.description,
        storyContent: scripts.storyContent,
        fullVideoUrl: scripts.fullVideoUrl,
        createdAt: scripts.createdAt,
        updatedAt: scripts.updatedAt,
      })
      .from(scripts)
      .where(eq(scripts.id, id));
    
    if (!script) return null;
    
    // 添加默认的 storyStyle
    return { ...script, storyStyle: 'modern' } as Script;
  }

  async updateScript(id: string, data: UpdateScript): Promise<Script | null> {
    const db = await getDb();
    const validated = updateScriptSchema.parse(data);
    
    // 移除可能不存在的字段
    const updateData: any = { ...validated, updatedAt: new Date() };
    delete updateData.storyStyle;
    
    const [script] = await db
      .update(scripts)
      .set(updateData)
      .where(eq(scripts.id, id))
      .returning({
        id: scripts.id,
        title: scripts.title,
        type: scripts.type,
        description: scripts.description,
        storyContent: scripts.storyContent,
        fullVideoUrl: scripts.fullVideoUrl,
        createdAt: scripts.createdAt,
        updatedAt: scripts.updatedAt,
      });
    
    if (!script) return null;
    
    // 添加默认的 storyStyle
    return { ...script, storyStyle: 'modern' } as Script;
  }

  async deleteScript(id: string): Promise<boolean> {
    const db = await getDb();
    const result = await db.delete(scripts).where(eq(scripts.id, id));
    return (result.rowCount ?? 0) > 0;
  }
}

export const scriptManager = new ScriptManager();
