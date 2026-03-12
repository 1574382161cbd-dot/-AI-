import { sql } from "drizzle-orm";
import {
  pgTable,
  text,
  varchar,
  timestamp,
  boolean,
  integer,
  jsonb,
  index,
} from "drizzle-orm/pg-core";
import { createSchemaFactory } from "drizzle-zod";
import { z } from "zod";

// 故事风格类型
export const STORY_STYLES = [
  'modern',      // 现代
  'ancient',     // 古代
  'anime',       // 动漫
  'ink-wash',    // 水墨风
  'fantasy',     // 奇幻
  'sci-fi',      // 科幻
  'realistic',   // 写实
] as const;

export type StoryStyle = typeof STORY_STYLES[number];

// 剧本表
export const scripts = pgTable(
  "scripts",
  {
    id: varchar("id", { length: 36 })
      .primaryKey()
      .default(sql`gen_random_uuid()`),
    title: varchar("title", { length: 255 }).notNull(),
    type: varchar("type", { length: 50 }).notNull(), // 剧情演绎 / 旁白解说
    description: text("description"),
    storyContent: text("story_content"), // 故事内容
    fullVideoUrl: text("full_video_url"), // 完整视频URL
    createdAt: timestamp("created_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true }),
  },
  (table) => ({
    typeIdx: index("scripts_type_idx").on(table.type),
  })
);

// 角色表
export const characters = pgTable(
  "characters",
  {
    id: varchar("id", { length: 36 })
      .primaryKey()
      .default(sql`gen_random_uuid()`),
    scriptId: varchar("script_id", { length: 36 }).notNull(), // 关联剧本
    name: varchar("name", { length: 128 }).notNull(),
    description: text("description"),
    appearance: text("appearance"), // 外观描述
    personality: text("personality"), // 性格特征
    avatarUrl: text("avatar_url"), // 头像URL（对象存储）- 兼容旧数据
    // 三视图字段（用于保持角色一致性）
    frontViewUrl: text("front_view_url"), // 正面视角
    sideViewUrl: text("side_view_url"), // 侧面视角
    threeQuarterViewUrl: text("three_quarter_view_url"), // 四分之三视角
    // 纯色背景颜色（用于三视图生成）
    backgroundColor: varchar("background_color", { length: 50 }), // 如"深蓝灰色"、"暖黄色"
    // 语音定制字段
    voiceStyle: varchar("voice_style", { length: 100 }), // 语音风格（音色ID）
    voiceSpeed: integer("voice_speed"), // 语速（-50到100，0为正常）
    voiceEmotion: varchar("voice_emotion", { length: 50 }), // 默认情绪
    createdAt: timestamp("created_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (table) => ({
    scriptIdx: index("characters_script_idx").on(table.scriptId),
  })
);

// 场景表
export const scenes = pgTable(
  "scenes",
  {
    id: varchar("id", { length: 36 })
      .primaryKey()
      .default(sql`gen_random_uuid()`),
    scriptId: varchar("script_id", { length: 36 }).notNull(), // 关联剧本
    name: varchar("name", { length: 128 }).notNull(),
    description: text("description"),
    backgroundUrl: text("background_url"), // 背景图URL
    referenceImageUrl: text("reference_image_url"), // 场景参考图URL
    createdAt: timestamp("created_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (table) => ({
    scriptIdx: index("scenes_script_idx").on(table.scriptId),
  })
);

// 分镜表
export const storyboards = pgTable(
  "storyboards",
  {
    id: varchar("id", { length: 36 })
      .primaryKey()
      .default(sql`gen_random_uuid()`),
    scriptId: varchar("script_id", { length: 36 }).notNull(), // 关联剧本
    sceneId: varchar("scene_id", { length: 36 }), // 关联场景
    characterIds: text("character_ids"), // 关联角色（存储为 JSON 数组字符串）
    sequence: integer("sequence").notNull(), // 序号
    description: text("description"), // 分镜描述
    prompt: text("prompt"), // 生图提示词
    dialogue: text("dialogue"), // 对话内容（剧情演绎模式）
    speakingCharacterId: varchar("speaking_character_id", { length: 36 }), // 说话角色ID
    imageUrl: text("image_url"), // 分镜图片URL
    videoUrl: text("video_url"), // 视频URL
    audioUrl: text("audio_url"), // 音频URL（旁白）
    duration: integer("duration"), // 时长（秒）
    transitionType: varchar("transition_type", { length: 50 }), // 转场类型（fade, cut, zoom）
    cameraAngle: varchar("camera_angle", { length: 50 }), // 镜头角度（front/side/three_quarter等）
    isGenerated: boolean("is_generated").default(false), // 是否已生成视频
    createdAt: timestamp("created_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (table) => ({
    scriptIdx: index("storyboards_script_idx").on(table.scriptId),
    sequenceIdx: index("storyboards_sequence_idx").on(table.scriptId, table.sequence),
  })
);

// 使用 createSchemaFactory 配置 date coercion
const { createInsertSchema: createCoercedInsertSchema } = createSchemaFactory({
  coerce: { date: true },
});

// Scripts schemas
export const insertScriptSchema = createCoercedInsertSchema(scripts).pick({
  title: true,
  type: true,
  description: true,
  storyContent: true,
});

export const updateScriptSchema = createCoercedInsertSchema(scripts)
  .pick({
    title: true,
    type: true,
    description: true,
    storyContent: true,
    fullVideoUrl: true,
  })
  .extend({
    // 验证时长范围：4-12秒（匹配豆包 Seedance 模型支持的范围）
    duration: z.number().min(4).max(12).optional(),
    // 验证转场类型
    transitionType: z.enum(['cut', 'fade', 'zoom']).optional(),
  })
  .partial();

export type Script = typeof scripts.$inferSelect;
export type InsertScript = z.infer<typeof insertScriptSchema>;
export type UpdateScript = z.infer<typeof updateScriptSchema>;

// Characters schemas
export const insertCharacterSchema = createCoercedInsertSchema(characters).pick({
  scriptId: true,
  name: true,
  description: true,
  appearance: true,
  personality: true,
  avatarUrl: true,
  frontViewUrl: true,
  sideViewUrl: true,
  threeQuarterViewUrl: true,
  backgroundColor: true,
  voiceStyle: true,
  voiceSpeed: true,
  voiceEmotion: true,
}).extend({
  // 验证语速范围：-50到100
  voiceSpeed: z.number().min(-50).max(100).optional().default(0),
  // 验证语音风格
  voiceStyle: z.string().optional().default('zh_female_xiaohe_uranus_bigtts'),
  // 验证情绪
  voiceEmotion: z.string().optional().default('neutral'),
});

export const updateCharacterSchema = createCoercedInsertSchema(characters)
  .pick({
    name: true,
    description: true,
    appearance: true,
    personality: true,
    avatarUrl: true,
    frontViewUrl: true,
    sideViewUrl: true,
    threeQuarterViewUrl: true,
    backgroundColor: true,
    voiceStyle: true,
    voiceSpeed: true,
    voiceEmotion: true,
  })
  .partial();

export type Character = typeof characters.$inferSelect;
export type InsertCharacter = z.infer<typeof insertCharacterSchema>;
export type UpdateCharacter = z.infer<typeof updateCharacterSchema>;

// Scenes schemas
export const insertSceneSchema = createCoercedInsertSchema(scenes).pick({
  scriptId: true,
  name: true,
  description: true,
  backgroundUrl: true,
  referenceImageUrl: true,
});

export const updateSceneSchema = createCoercedInsertSchema(scenes)
  .pick({
    name: true,
    description: true,
    backgroundUrl: true,
    referenceImageUrl: true,
  })
  .extend({
    // 验证时长范围：4-12秒（匹配豆包 Seedance 模型支持的范围）
    duration: z.number().min(4).max(12).optional(),
    // 验证转场类型
    transitionType: z.enum(['cut', 'fade', 'zoom']).optional(),
  })
  .partial();

export type Scene = typeof scenes.$inferSelect;
export type InsertScene = z.infer<typeof insertSceneSchema>;
export type UpdateScene = z.infer<typeof updateSceneSchema>;

// Storyboards schemas
export const insertStoryboardSchema = createCoercedInsertSchema(storyboards)
  .extend({
    // 必需字段
    scriptId: z.string().min(1),
    sequence: z.number().int().positive(),
    description: z.string().min(1),
    // 可选字段及其默认值/验证
    sceneId: z.string().optional().nullable(),
    characterIds: z.string().optional().nullable(),
    prompt: z.string().optional().nullable(),
    dialogue: z.string().optional().nullable(), // 对话内容（剧情演绎模式）
    speakingCharacterId: z.string().optional().nullable(), // 说话角色ID
    imageUrl: z.string().optional().nullable(),
    videoUrl: z.string().optional().nullable(),
    audioUrl: z.string().optional().nullable(),
    // 验证时长范围：4-12秒（匹配豆包 Seedance 模型支持的范围）
    duration: z.number().min(4).max(12).optional().default(5),
    // 验证转场类型
    transitionType: z.enum(['cut', 'fade', 'zoom']).optional().default('cut'),
    // 镜头角度
    cameraAngle: z.enum(['front', 'side', 'three_quarter', 'over_shoulder', 'close_up', 'wide', 'low_angle', 'high_angle']).optional().default('three_quarter'),
    isGenerated: z.boolean().optional().default(false),
  });

export const updateStoryboardSchema = createCoercedInsertSchema(storyboards)
  .pick({
    sceneId: true,
    characterIds: true,
    sequence: true,
    description: true,
    prompt: true,
    dialogue: true,
    speakingCharacterId: true,
    imageUrl: true,
    videoUrl: true,
    audioUrl: true,
    duration: true,
    transitionType: true,
    cameraAngle: true,
    isGenerated: true,
  })
  .extend({
    // 验证时长范围：4-12秒（匹配豆包 Seedance 模型支持的范围）
    duration: z.number().min(4).max(12).optional(),
    // 验证转场类型
    transitionType: z.enum(['cut', 'fade', 'zoom']).optional(),
  })
  .partial();

export type Storyboard = typeof storyboards.$inferSelect;
export type InsertStoryboard = z.infer<typeof insertStoryboardSchema>;
export type UpdateStoryboard = z.infer<typeof updateStoryboardSchema>;

// ==================== 用户认证相关表 ====================

// 用户表
export const users = pgTable(
  "users",
  {
    id: varchar("id", { length: 36 })
      .primaryKey()
      .default(sql`gen_random_uuid()`),
    phone: varchar("phone", { length: 20 }).notNull().unique(), // 手机号
    nickname: varchar("nickname", { length: 100 }), // 昵称
    avatarUrl: text("avatar_url"), // 头像URL
    status: varchar("status", { length: 20 }).notNull().default("active"), // 状态：active, banned
    lastLoginAt: timestamp("last_login_at", { withTimezone: true }), // 最后登录时间
    lastLoginIp: varchar("last_login_ip", { length: 50 }), // 最后登录IP
    createdAt: timestamp("created_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true }),
  },
  (table) => ({
    phoneIdx: index("users_phone_idx").on(table.phone),
    statusIdx: index("users_status_idx").on(table.status),
  })
);

// 登录日志表（溯源追踪）
export const loginLogs = pgTable(
  "login_logs",
  {
    id: varchar("id", { length: 36 })
      .primaryKey()
      .default(sql`gen_random_uuid()`),
    userId: varchar("user_id", { length: 36 }).notNull(), // 关联用户
    phone: varchar("phone", { length: 20 }).notNull(), // 手机号
    loginType: varchar("login_type", { length: 20 }).notNull(), // 登录类型：sms_code
    ip: varchar("ip", { length: 50 }), // IP地址
    userAgent: text("user_agent"), // 用户代理
    deviceInfo: jsonb("device_info"), // 设备信息（JSON）
    location: jsonb("location"), // 位置信息（JSON）
    loginTime: timestamp("login_time", { withTimezone: true })
      .defaultNow()
      .notNull(),
    status: varchar("status", { length: 20 }).notNull(), // 状态：success, failed
    failureReason: text("failure_reason"), // 失败原因
  },
  (table) => ({
    userIdIdx: index("login_logs_user_idx").on(table.userId),
    loginTimeIdx: index("login_logs_time_idx").on(table.loginTime),
    phoneIdx: index("login_logs_phone_idx").on(table.phone),
  })
);

// 操作日志表（审计追踪）
export const operationLogs = pgTable(
  "operation_logs",
  {
    id: varchar("id", { length: 36 })
      .primaryKey()
      .default(sql`gen_random_uuid()`),
    userId: varchar("user_id", { length: 36 }).notNull(), // 操作用户
    action: varchar("action", { length: 100 }).notNull(), // 操作类型
    resource: varchar("resource", { length: 100 }), // 操作资源
    resourceId: varchar("resource_id", { length: 36 }), // 资源ID
    method: varchar("method", { length: 10 }), // HTTP方法
    path: text("path"), // 请求路径
    ip: varchar("ip", { length: 50 }), // IP地址
    userAgent: text("user_agent"), // 用户代理
    requestParams: jsonb("request_params"), // 请求参数
    responseStatus: integer("response_status"), // 响应状态码
    executionTime: integer("execution_time"), // 执行时间（毫秒）
    operationTime: timestamp("operation_time", { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (table) => ({
    userIdIdx: index("operation_logs_user_idx").on(table.userId),
    actionIdx: index("operation_logs_action_idx").on(table.action),
    operationTimeIdx: index("operation_logs_time_idx").on(table.operationTime),
    resourceIdIdx: index("operation_logs_resource_idx").on(table.resource, table.resourceId),
  })
);

// 验证码表
export const verificationCodes = pgTable(
  "verification_codes",
  {
    id: varchar("id", { length: 36 })
      .primaryKey()
      .default(sql`gen_random_uuid()`),
    phone: varchar("phone", { length: 20 }).notNull(), // 手机号
    code: varchar("code", { length: 10 }).notNull(), // 验证码
    type: varchar("type", { length: 20 }).notNull(), // 类型：login, register, reset_password
    expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(), // 过期时间
    used: boolean("used").notNull().default(false), // 是否已使用
    createdAt: timestamp("created_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (table) => ({
    phoneIdx: index("verification_codes_phone_idx").on(table.phone),
    expiresAtIdx: index("verification_codes_expires_idx").on(table.expiresAt),
  })
);

// Users schemas
export const insertUserSchema = createCoercedInsertSchema(users).pick({
  phone: true,
  nickname: true,
  avatarUrl: true,
});

export const updateUserSchema = createCoercedInsertSchema(users)
  .pick({
    nickname: true,
    avatarUrl: true,
    status: true,
  })
  .extend({
    // 验证时长范围：4-12秒（匹配豆包 Seedance 模型支持的范围）
    duration: z.number().min(4).max(12).optional(),
    // 验证转场类型
    transitionType: z.enum(['cut', 'fade', 'zoom']).optional(),
  })
  .partial();

export type User = typeof users.$inferSelect;
export type InsertUser = z.infer<typeof insertUserSchema>;
export type UpdateUser = z.infer<typeof updateUserSchema>;

// LoginLogs schemas
export const insertLoginLogSchema = createCoercedInsertSchema(loginLogs).pick({
  userId: true,
  phone: true,
  loginType: true,
  ip: true,
  userAgent: true,
  deviceInfo: true,
  location: true,
  status: true,
  failureReason: true,
});

export type LoginLog = typeof loginLogs.$inferSelect;
export type InsertLoginLog = z.infer<typeof insertLoginLogSchema>;

// OperationLogs schemas
export const insertOperationLogSchema = createCoercedInsertSchema(operationLogs).pick({
  userId: true,
  action: true,
  resource: true,
  resourceId: true,
  method: true,
  path: true,
  ip: true,
  userAgent: true,
  requestParams: true,
  responseStatus: true,
  executionTime: true,
});

export type OperationLog = typeof operationLogs.$inferSelect;
export type InsertOperationLog = z.infer<typeof insertOperationLogSchema>;

// VerificationCodes schemas
export const insertVerificationCodeSchema = createCoercedInsertSchema(verificationCodes).pick({
  phone: true,
  code: true,
  type: true,
  expiresAt: true,
});

export type VerificationCode = typeof verificationCodes.$inferSelect;
export type InsertVerificationCode = z.infer<typeof insertVerificationCodeSchema>;
