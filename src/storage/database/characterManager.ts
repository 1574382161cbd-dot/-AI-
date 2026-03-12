import { eq, and, SQL } from "drizzle-orm";
import { getDb } from "coze-coding-dev-sdk";
import {
  characters,
  insertCharacterSchema,
  updateCharacterSchema,
} from "./shared/schema";
import type { Character, InsertCharacter, UpdateCharacter } from "./shared/schema";

export class CharacterManager {
  async createCharacter(data: InsertCharacter): Promise<Character> {
    const db = await getDb();
    const validated = insertCharacterSchema.parse(data);
    const [character] = await db.insert(characters).values(validated).returning();
    return character;
  }

  async getCharacters(scriptId: string): Promise<Character[]> {
    const db = await getDb();
    return db
      .select()
      .from(characters)
      .where(eq(characters.scriptId, scriptId))
      .orderBy(characters.createdAt);
  }

  async getCharacterById(id: string): Promise<Character | null> {
    const db = await getDb();
    const [character] = await db
      .select()
      .from(characters)
      .where(eq(characters.id, id));
    return character || null;
  }

  async updateCharacter(id: string, data: UpdateCharacter): Promise<Character | null> {
    const db = await getDb();
    const validated = updateCharacterSchema.parse(data);
    const [character] = await db
      .update(characters)
      .set(validated)
      .where(eq(characters.id, id))
      .returning();
    return character || null;
  }

  async deleteCharacter(id: string): Promise<boolean> {
    const db = await getDb();
    const result = await db.delete(characters).where(eq(characters.id, id));
    return (result.rowCount ?? 0) > 0;
  }
}

export const characterManager = new CharacterManager();
