import { getDb } from 'coze-coding-dev-sdk';
import { sql } from 'drizzle-orm';

async function migrate() {
  console.log('🔄 Starting database migration...');
  
  try {
    const db = await getDb();
    
    // 检查 story_style 列是否已存在
    const checkResult = await db.execute(sql`
      SELECT column_name 
      FROM information_schema.columns 
      WHERE table_name = 'scripts' AND column_name = 'story_style'
    `);
    
    if (checkResult.rows.length > 0) {
      console.log('✅ story_style column already exists, skipping migration');
      return;
    }
    
    // 添加 story_style 列
    console.log('📝 Adding story_style column to scripts table...');
    await db.execute(sql`
      ALTER TABLE scripts 
      ADD COLUMN story_style VARCHAR(50)
    `);
    
    // 添加索引
    console.log('📝 Creating index on story_style...');
    await db.execute(sql`
      CREATE INDEX IF NOT EXISTS scripts_style_idx ON scripts(story_style)
    `);
    
    console.log('✅ Migration completed successfully!');
  } catch (error) {
    console.error('❌ Migration failed:', error);
    throw error;
  }
}

migrate().catch(console.error);
