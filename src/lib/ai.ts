import { LLMClient, ImageGenerationClient, VideoGenerationClient, TTSClient, Config } from 'coze-coding-dev-sdk';
import { S3Storage } from 'coze-coding-dev-sdk';

// 故事风格类型
export type StoryStyle = 'modern' | 'ancient' | 'anime' | 'ink-wash' | 'fantasy' | 'sci-fi' | 'realistic';

// 故事风格配置
export const STORY_STYLE_CONFIG = {
  modern: {
    name: '现代',
    description: '现代都市、日常生活场景',
    characterPrompt: '现代服装，日常穿着，时尚造型',
    scenePrompt: '现代建筑，城市街景，室内装修',
    artStyle: '自然写实风格',
  },
  ancient: {
    name: '古代',
    description: '古代宫廷、江湖、历史场景',
    characterPrompt: '古代汉服，古装造型，传统服饰',
    scenePrompt: '古典建筑，亭台楼阁，古代街道',
    artStyle: '自然写实风格，古典美学',
  },
  anime: {
    name: '动漫',
    description: '日系动漫风格，卡通化表现',
    characterPrompt: '动漫风格，大眼睛，鲜艳色彩，二次元造型',
    scenePrompt: '动漫背景，卡通化建筑，梦幻色彩',
    artStyle: '日系动漫风格，色彩鲜艳',
  },
  'ink-wash': {
    name: '水墨风',
    description: '中国传统水墨画风格',
    characterPrompt: '水墨风格，传统服饰，留白意境',
    scenePrompt: '山水意境，水墨渲染，古典园林',
    artStyle: '中国传统水墨画风格，水墨渲染',
  },
  fantasy: {
    name: '奇幻',
    description: '魔法、奇幻世界',
    characterPrompt: '奇幻服饰，魔法装备，精灵/兽人等奇幻种族',
    scenePrompt: '奇幻城堡，魔法森林，神秘遗迹',
    artStyle: '自然写实风格，奇幻题材',
  },
  'sci-fi': {
    name: '科幻',
    description: '未来科技、太空场景',
    characterPrompt: '科幻服装，未来造型，科技装备',
    scenePrompt: '未来城市，太空站，高科技建筑',
    artStyle: '自然写实风格，科幻题材',
  },
  realistic: {
    name: '写实',
    description: '真实、生活化的表现',
    characterPrompt: '真实服装，日常造型，自然表现',
    scenePrompt: '真实场景，生活化环境',
    artStyle: '自然写实风格',
  },
} as const;

// 初始化配置
const config = new Config();

// 初始化对象存储
export const storage = new S3Storage({
  endpointUrl: process.env.COZE_BUCKET_ENDPOINT_URL,
  accessKey: "",
  secretKey: "",
  bucketName: process.env.COZE_BUCKET_NAME,
  region: "cn-beijing",
});

// 大语言模型客户端
export const llmClient = new LLMClient(config);

// 生图模型客户端（使用默认模型 Seedream 5.0 Lite）
export const imageClient = new ImageGenerationClient(config);

// 视频生成客户端
export const videoClient = new VideoGenerationClient(config);

// 语音合成客户端
export const ttsClient = new TTSClient(config);

/**
 * 安全解析 JSON（处理不完整的 JSON 响应）
 */
function safeParseJSON(text: string): any {
  // 首先尝试直接解析
  try {
    return JSON.parse(text);
  } catch (e) {
    console.log('[safeParseJSON] Direct parse failed, attempting repair...');
  }

  // 尝试提取 JSON 块
  const jsonMatch = text.match(/\{[\s\S]*\}/);
  if (jsonMatch) {
    try {
      return JSON.parse(jsonMatch[0]);
    } catch (e) {
      console.log('[safeParseJSON] Extracted JSON parse failed, attempting repair...');
    }
  }

  // 尝试修复不完整的 JSON
  try {
    let repaired = text.trim();
    
    // 计算未闭合的花括号和方括号
    let braceCount = 0;
    let bracketCount = 0;
    let inString = false;
    let escapeNext = false;
    
    for (let i = 0; i < repaired.length; i++) {
      const char = repaired[i];
      
      if (escapeNext) {
        escapeNext = false;
        continue;
      }
      
      if (char === '\\') {
        escapeNext = true;
        continue;
      }
      
      if (char === '"' && !escapeNext) {
        inString = !inString;
        continue;
      }
      
      if (!inString) {
        if (char === '{') braceCount++;
        else if (char === '}') braceCount--;
        else if (char === '[') bracketCount++;
        else if (char === ']') bracketCount--;
      }
    }
    
    // 如果在字符串中间被截断，需要先关闭字符串
    if (inString) {
      repaired += '"';
    }
    
    // 关闭未闭合的方括号和花括号
    for (let i = 0; i < bracketCount; i++) {
      repaired += ']';
    }
    for (let i = 0; i < braceCount; i++) {
      repaired += '}';
    }
    
    console.log('[safeParseJSON] Repaired JSON:', repaired.substring(repaired.length - 100));
    
    return JSON.parse(repaired);
  } catch (e) {
    console.error('[safeParseJSON] Failed to repair JSON:', e);
    return null;
  }
}

/**
 * 大语言模型对话（流式）
 */
export async function chatWithLLM(messages: Array<{ role: 'system' | 'user' | 'assistant'; content: string }>, options?: { temperature?: number }) {
  const stream = llmClient.stream(messages, {
    temperature: options?.temperature || 0.7,
  });

  let fullContent = '';
  for await (const chunk of stream) {
    if (chunk.content) {
      fullContent += chunk.content.toString();
    }
  }

  return fullContent;
}

/**
 * 过滤敏感内容（用于生图 API）
 * 生图 API 不接受血腥、暴力等敏感内容，需要过滤
 */
export function filterSensitiveContent(text: string): string {
  // 敏感词汇映射（替换为更中性的描述）
  const sensitiveWords: Record<string, string> = {
    '尸体': '人物',
    '血迹': '痕迹',
    '血腥': '',
    '鲜血': '红色',
    '流血': '',
    '撕咬': '伤痕',
    '残骸': '残破',
    '残肢': '残破',
    '断肢': '残破',
    '砍头': '',
    '斩首': '',
    '谋杀': '冲突',
    '杀害': '冲突',
    '杀戮': '冲突',
    '屠杀': '冲突',
    '酷刑': '折磨',
    '折磨': '痛苦',
    '虐待': '',
    '暴力': '激烈',
    '恐怖': '紧张',
    '惊恐': '紧张',
    '恐惧': '紧张',
  };

  let filteredText = text;

  // 替换敏感词汇
  for (const [word, replacement] of Object.entries(sensitiveWords)) {
    filteredText = filteredText.replace(new RegExp(word, 'g'), replacement);
  }

  // 清理多余的标点符号和空格
  filteredText = filteredText.replace(/[，。、；：！？，。、；：！？]/g, match => match);
  filteredText = filteredText.replace(/\s+/g, ' ').trim();

  return filteredText;
}

/**
 * 过滤人物相关内容（用于场景背景图生成）
 * 场景背景图应该是纯环境，不应该包含任何人物描述
 */
export function filterCharacterContent(text: string): string {
  let filteredText = text;

  // 1. 移除 "Prompt:" 前缀（如果是完整 prompt 字符串）
  filteredText = filteredText.replace(/^Prompt:\s*/i, '');

  // 2. 移除整句包含人物描述的句子（以 An/A + 人名/人物词 开头）
  // 例如: "An emperor in elaborate ornate robes walks..." 
  // 例如: "A young court lady follows..."
  const personNouns = [
    'emperor', 'empress', 'king', 'queen', 'prince', 'princess',
    'man', 'woman', 'boy', 'girl', 'child', 'person', 'people',
    'soldier', 'guard', 'servant', 'court lady', 'official', 'minister',
    'general', 'warrior', 'knight', 'lord', 'lady', 'noble',
    'protagonist', 'character', 'figure', 'human',
  ];

  // 移除以 "An/A + 人物词" 开头的句子
  for (const noun of personNouns) {
    // "An emperor..." 或 "A young court lady..."
    const anPattern = new RegExp(`\\bAn?\\s+(?:\\w+\\s+)?${noun}[^.]*\\.?`, 'gi');
    filteredText = filteredText.replace(anPattern, '');
    // 直接人物词开头的句子
    const directPattern = new RegExp(`\\b${noun}\\b[^.]*\\.?`, 'gi');
    filteredText = filteredText.replace(directPattern, '');
  }

  // 3. 移除人名（大写字母开头）+ 动作描述
  // 例如: "Qin Shi Huang, in elaborate dragon robe"
  filteredText = filteredText.replace(/[A-Z][a-z]+(?:\s+[A-Z]?[a-z]+)*(?:\s+[a-z]+)*\s*(?:,|in|wearing|dressed|standing|sitting|lying|walking|running|looking|watching|staring|with|holding|carrying|walks|stands|sits|lies)[^.]*(?:\.|$)/gi, '');

  // 4. 移除中文名 + 动作描述
  filteredText = filteredText.replace(/[\u4e00-\u9fa5]{2,4}(?:穿着|身着|披着|戴着|拿着|站在|坐在|躺在|走动|奔跑|注视|凝视|走在|站立|行走)[^。！？.]*/g, '');

  // 5. 移除包含人物词的句子
  const personWords = [
    '人物', '角色', '主角', '配角', '男人', '女人', '老人', '小孩', '男孩', '女孩',
    '士兵', '将军', '皇帝', '皇后', '公主', '王子', '大臣', '侍卫', '宫女', '仆人',
    '侍者', '路人', '行人', '观众', '人群',
  ];

  for (const word of personWords) {
    const cnPattern = new RegExp(`[^。]*${word}[^。]*[。]?`, 'g');
    filteredText = filteredText.replace(cnPattern, '');
  }

  // 6. 移除 "The protagonist" 开头的句子
  filteredText = filteredText.replace(/The protagonist[^.]*(?:\.|$)/gi, '');

  // 7. 移除剩余的动作动词短语
  const actionPatterns = [
    /(?:walks?|walked|walking)[^.]*(?:\.|$)/gi,
    /(?:stands?|stood|standing)[^.]*(?:\.|$)/gi,
    /(?:sits?|sat|sitting)[^.]*(?:\.|$)/gi,
    /(?:lies?|lay|lying)[^.]*(?:\.|$)/gi,
    /(?:runs?|ran|running)[^.]*(?:\.|$)/gi,
    /(?:looks?|looked|looking)[^.]*(?:\.|$)/gi,
    /(?:watches?|watched|watching)[^.]*(?:\.|$)/gi,
    /(?:stares?|stared|staring)[^.]*(?:\.|$)/gi,
    /(?:wears?|wore|wearing)[^.]*(?:\.|$)/gi,
    /(?:holds?|held|holding)[^.]*(?:\.|$)/gi,
    /(?:carries?|carried|carrying)[^.]*(?:\.|$)/gi,
    /(?:follows?|followed|following)[^.]*(?:\.|$)/gi,
  ];

  for (const pattern of actionPatterns) {
    filteredText = filteredText.replace(pattern, '');
  }

  // 8. 清理多余的空格、逗号和句号
  filteredText = filteredText.replace(/\s+/g, ' ').trim();
  filteredText = filteredText.replace(/^[,，、;；:：\s.]+/, '');
  filteredText = filteredText.replace(/[,，、;；:：\s.]+$/, '');
  filteredText = filteredText.replace(/[,，]{2,}/g, ',');
  filteredText = filteredText.replace(/\.\s*\./g, '.');
  filteredText = filteredText.replace(/\s*,\s*\./g, '.');

  // 如果过滤后内容太少，返回一个基础的场景描述
  if (filteredText.length < 10) {
    return 'cinematic scene, detailed environment, atmospheric lighting';
  }

  return filteredText;
}

/**
 * AI辅助生成分镜描述
 */
export async function generateStoryboardDescription(storyContent: string, sceneIndex: number) {
  const messages: Array<{ role: 'system' | 'user'; content: string }> = [
    {
      role: 'system',
      content: '你是一个专业的分镜脚本师。根据故事内容，为每个场景生成详细的分镜描述。描述应包括画面内容、角色动作、镜头运动等。'
    },
    {
      role: 'user',
      content: `故事内容：${storyContent}\n\n请为第${sceneIndex}个场景生成分镜描述。`
    }
  ];

  return chatWithLLM(messages, { temperature: 0.8 });
}

/**
 * AI识别故事风格
 * @param storyContent 故事内容
 * @returns 识别出的故事风格
 */
export async function detectStoryStyle(storyContent: string): Promise<StoryStyle> {
  const messages: Array<{ role: 'system' | 'user'; content: string }> = [
    {
      role: 'system',
      content: `你是一个故事风格分析专家。根据故事内容，判断故事属于以下哪种风格：

可用风格：
- modern: 现代都市、日常生活、当代背景
- ancient: 古代宫廷、江湖、历史题材、古装
- anime: 日系动漫风格、二次元、卡通化
- ink-wash: 中国传统水墨画风格、古典山水意境
- fantasy: 奇幻魔法、精灵兽人、魔法世界
- sci-fi: 科幻未来、太空科技、高科技背景
- realistic: 真实写实、生活化、现实主义

请只返回风格的英文代码（modern/ancient/anime/ink-wash/fantasy/sci-fi/realistic），不要返回其他内容。`
    },
    {
      role: 'user',
      content: `故事内容：${storyContent}\n\n请判断这个故事的风格。`
    }
  ];

  const response = await chatWithLLM(messages, { temperature: 0.3 });
  
  // 清理响应，只提取风格代码
  const cleanedResponse = response.trim().toLowerCase();
  
  // 验证是否是有效的风格
  const validStyles: StoryStyle[] = ['modern', 'ancient', 'anime', 'ink-wash', 'fantasy', 'sci-fi', 'realistic'];
  
  if (validStyles.includes(cleanedResponse as StoryStyle)) {
    return cleanedResponse as StoryStyle;
  }
  
  // 如果识别失败，默认返回 modern
  console.warn(`[detectStoryStyle] Failed to detect style, response: "${response}", defaulting to modern`);
  return 'modern';
}

/**
 * AI生成角色设定
 */
export async function generateCharacterDesign(characterName: string, storyContext: string, storyStyle?: StoryStyle) {
  let systemContent = '你是一个角色设计师。根据角色名和故事背景，生成详细的角色设定，包括外观、性格、服饰等。';
  
  // 如果有故事风格，添加风格要求
  if (storyStyle && STORY_STYLE_CONFIG[storyStyle]) {
    const styleConfig = STORY_STYLE_CONFIG[storyStyle];
    systemContent += `\n\n重要：这个故事是${styleConfig.name}风格。角色的${styleConfig.characterPrompt}。所有角色设定必须符合${styleConfig.name}风格，避免出现时代或风格混乱。`;
  }
  
  const messages: Array<{ role: 'system' | 'user'; content: string }> = [
    {
      role: 'system',
      content: systemContent
    },
    {
      role: 'user',
      content: `角色名：${characterName}\n故事背景：${storyContext}\n\n请生成这个角色的详细设定。`
    }
  ];

  return chatWithLLM(messages, { temperature: 0.7 });
}

/**
 * 生成场景背景图
 * @param description 场景描述
 * @param count 生成数量（默认1张）
 * @param storyStyle 故事风格（用于统一视觉风格）
 * @param customHeaders 自定义请求头（从 API 路由中传入）
 */
export async function generateSceneImages(
  description: string, 
  count: number = 1, 
  storyStyle?: StoryStyle
) {
  const images = [];
  
  // 使用全局客户端
  const client = imageClient;

  // 过滤敏感内容和人物描述
  let filteredDescription = filterSensitiveContent(description);
  
  // 进一步过滤人物相关的关键词
  filteredDescription = filteredDescription
    .replace(/人[物们]/g, '')
    .replace(/角色/g, '')
    .replace(/人物/g, '')
    .replace(/身影/g, '')
    .replace(/身体/g, '')
    .replace(/站立/g, '')
    .replace(/坐着/g, '')
    .replace(/行走/g, '')
    .replace(/奔跑/g, '')
    .replace(/动作/g, '');

  for (let i = 0; i < count; i++) {
    // 根据故事风格确定艺术风格
    let artStyle = '自然写实风格';
    let sceneStylePrompt = '';
    
    if (storyStyle && STORY_STYLE_CONFIG[storyStyle]) {
      const styleConfig = STORY_STYLE_CONFIG[storyStyle];
      artStyle = styleConfig.artStyle;
      sceneStylePrompt = `, ${styleConfig.scenePrompt}，风格统一`;
    }
    
    // 强调纯背景场景，绝对不包含人物
    const prompt = `${filteredDescription}, ${artStyle}，电影级场景背景，纯环境背景图，绝对没有人物，no people, no characters, no figures, no humans, empty scene, 纯背景，纯场景，环境氛围感强，细节丰富${sceneStylePrompt}`;

    console.log('[generateSceneImages] Generating pure background scene with prompt:', prompt.substring(0, 200) + '...');

    const response = await client.generate({
      prompt,
      size: '2K',
      watermark: false,
    });

    const helper = client.getResponseHelper(response);
    if (!helper.success) {
      console.error(`Failed to generate scene image ${i + 1}:`, helper.errorMessages);
      continue;
    }

    const imageUrl = helper.imageUrls[0];
    if (!imageUrl) {
      console.error(`No image URL returned for scene image ${i + 1}`);
      continue;
    }

    // 下载图片并上传到对象存储
    const imageResponse = await fetch(imageUrl);
    const imageBuffer = Buffer.from(await imageResponse.arrayBuffer());

    const fileKey = await storage.uploadFile({
      fileContent: imageBuffer,
      fileName: `scenes/${Date.now()}_scene${i}.png`,
      contentType: 'image/png',
    });

    const signedUrl = await storage.generatePresignedUrl({
      key: fileKey,
      expireTime: 86400,
    });

    images.push({
      url: signedUrl,
      fileKey,
    });
  }

  return images;
}

/**
 * 角色三视图结果
 */
export interface CharacterThreeView {
  frontView: { url: string; fileKey: string };
  sideView: { url: string; fileKey: string };
  threeQuarterView: { url: string; fileKey: string };
}

/**
 * 生成角色三视图（正面、侧面、四分之三视角）
 * 用于保持角色在运镜时的一致性
 * 
 * 【模板格式】
 * - 所有角色背景均为纯色，无环境细节
 * - 漫剧风格：线条、色彩、网点等
 * - 背景颜色暗示角色氛围
 * 
 * @param appearance 角色外观描述（用户提供的完整描述）
 * @param backgroundColor 纯色背景颜色（可选，如"深蓝灰色"、"暖黄色"）
 * @param storyStyle 故事风格
 * @returns 三视图结果
 */
export async function generateCharacterThreeView(
  appearance: string,
  backgroundColor?: string,
  storyStyle?: StoryStyle
): Promise<CharacterThreeView | null> {
  console.log('[generateCharacterThreeView] Generating three-view for character');
  console.log('[generateCharacterThreeView] Appearance:', appearance.substring(0, 100) + '...');
  console.log('[generateCharacterThreeView] Background color:', backgroundColor || '未指定');
  
  const client = imageClient;
  const filteredAppearance = filterSensitiveContent(appearance);

  // 默认背景色（如果用户未指定）
  const bgColor = backgroundColor || '浅灰色';

  // 三视图配置 - 保持用户原始描述，只添加视角和纯色背景
  const viewConfigs = [
    {
      key: 'frontView' as const,
      viewName: '正面视角',
      prompt: `${filteredAppearance}，正面视角，正对镜头，全身像，对称姿势，漫剧风格，纯色背景为${bgColor}，无环境细节，清晰的面部特征，角色设计图`,
    },
    {
      key: 'sideView' as const,
      viewName: '侧面视角',
      prompt: `${filteredAppearance}，侧面视角，侧脸轮廓，全身像，站姿笔直，漫剧风格，纯色背景为${bgColor}，无环境细节，侧脸轮廓清晰，角色设计图`,
    },
    {
      key: 'threeQuarterView' as const,
      viewName: '四分之三视角',
      prompt: `${filteredAppearance}，四分之三视角，45度角，上半身像，漫剧风格，纯色背景为${bgColor}，无环境细节，最常见的叙事角度，角色设计图`,
    },
  ];

  const results: Partial<CharacterThreeView> = {};

  for (const config of viewConfigs) {
    console.log(`[generateCharacterThreeView] Generating ${config.viewName}...`);

    try {
      const response = await client.generate({
        prompt: config.prompt,
        size: '2K',
        watermark: false,
      });

      const helper = client.getResponseHelper(response);
      if (!helper.success || !helper.imageUrls[0]) {
        console.error(`[generateCharacterThreeView] Failed to generate ${config.viewName}:`, helper.errorMessages);
        continue;
      }

      // 下载图片并上传到对象存储
      const imageResponse = await fetch(helper.imageUrls[0]);
      const imageBuffer = Buffer.from(await imageResponse.arrayBuffer());

      const fileKey = await storage.uploadFile({
        fileContent: imageBuffer,
        fileName: `characters/three-view/${Date.now()}_${config.key}.png`,
        contentType: 'image/png',
      });

      const signedUrl = await storage.generatePresignedUrl({
        key: fileKey,
        expireTime: 86400,
      });

      results[config.key] = {
        url: signedUrl,
        fileKey,
      };

      console.log(`[generateCharacterThreeView] ${config.viewName} generated successfully`);
    } catch (error) {
      console.error(`[generateCharacterThreeView] Error generating ${config.viewName}:`, error);
    }
  }

  // 检查是否所有视图都生成成功
  if (results.frontView && results.sideView && results.threeQuarterView) {
    return results as CharacterThreeView;
  }

  // 如果部分成功，也返回结果（允许部分视图缺失）
  if (results.frontView || results.sideView || results.threeQuarterView) {
    console.warn('[generateCharacterThreeView] Partial three-view generated');
    return results as CharacterThreeView;
  }

  return null;
}

/**
 * 生成多个角色形象选项
 * @param appearance 角色外观描述
 * @param count 生成数量
 * @param storyStyle 故事风格
 * @param customHeaders 自定义请求头（从 API 路由中传入）
 */
export async function generateCharacterImages(
  appearance: string, 
  count: number = 4, 
  storyStyle?: StoryStyle
) {
  const images = [];
  
  // 使用全局客户端
  const client = imageClient;

  // 过滤敏感内容
  const filteredAppearance = filterSensitiveContent(appearance);

  // 为每个选项添加一些变体
  const variants = [
    'front view, full body',
    'three-quarter view, portrait',
    'action pose, dynamic angle',
    'side view, character design sheet',
  ];

  // 根据故事风格确定艺术风格
  let artStyle = '自然写实风格';
  if (storyStyle && STORY_STYLE_CONFIG[storyStyle]) {
    artStyle = STORY_STYLE_CONFIG[storyStyle].artStyle;
  }

  for (let i = 0; i < count && i < variants.length; i++) {
    const prompt = `${filteredAppearance}, ${variants[i]}, ${artStyle}，电影级人物质感，细节丰富，白底，角色设计`;

    const response = await client.generate({
      prompt,
      size: '2K',
      watermark: false,
    });

    const helper = client.getResponseHelper(response);
    if (!helper.success) {
      console.error(`Failed to generate character image ${i + 1}:`, helper.errorMessages);
      continue;
    }

    const imageUrl = helper.imageUrls[0];
    if (!imageUrl) {
      console.error(`No image URL returned for option ${i + 1}`);
      continue;
    }

    // 下载图片并上传到对象存储
    const imageResponse = await fetch(imageUrl);
    const imageBuffer = Buffer.from(await imageResponse.arrayBuffer());

    const fileKey = await storage.uploadFile({
      fileContent: imageBuffer,
      fileName: `characters/${Date.now()}_option${i}.png`,
      contentType: 'image/png',
    });

    const signedUrl = await storage.generatePresignedUrl({
      key: fileKey,
      expireTime: 86400,
    });

    images.push({
      url: signedUrl,
      fileKey,
      label: variants[i],
    });
  }

  return images;
}

/**
 * 生成分镜图片
 * @param prompt 基础提示词
 * @param size 图片尺寸
 * @param characterImageUrls 角色形象 URL 列表（用于保持角色一致性）
 * @param sceneBackgroundUrl 场景背景图 URL（用于保持场景一致性）
 * @param storyStyle 故事风格（用于统一视觉风格）
 * @param customHeaders 自定义请求头（从 API 路由中传入）
 */
export async function generateStoryboardImage(
  prompt: string,
  size: '2K' | '4K' = '2K',
  characterImageUrls: string[] = [],
  sceneBackgroundUrl?: string,
  sceneReferenceUrl?: string,
  storyStyle?: StoryStyle
) {
  // 使用全局客户端
  const client = imageClient;
  
  // 过滤敏感内容
  let enhancedPrompt = filterSensitiveContent(prompt);

  // 根据故事风格添加风格描述
  let artStyle = '自然写实风格';
  if (storyStyle && STORY_STYLE_CONFIG[storyStyle]) {
    const styleConfig = STORY_STYLE_CONFIG[storyStyle];
    artStyle = styleConfig.artStyle;
    
    // 添加场景风格提示
    if (!enhancedPrompt.includes('风格') && !enhancedPrompt.includes('style')) {
      enhancedPrompt += `, ${artStyle}，${styleConfig.scenePrompt}，画面风格统一，避免时代混乱`;
    }
  } else {
    // 默认风格
    if (!enhancedPrompt.includes('风格') && !enhancedPrompt.includes('style')) {
      enhancedPrompt += ', 自然写实风格，电影级画面质感，细节丰富，光影自然';
    }
  }

  // 如果有角色形象，添加角色一致性描述
  if (characterImageUrls.length > 0) {
    enhancedPrompt += ', 角色外观与参考图保持一致，相同的五官特征、发型和服装';
  }

  // 如果有场景背景或参考图，添加场景一致性描述
  if (sceneBackgroundUrl || sceneReferenceUrl) {
    enhancedPrompt += ', 场景环境与参考图风格一致';
  }

  // 构建参考图列表（角色形象 + 场景背景 + 场景参考）
  const referenceImages: string[] = [];
  
  // 添加角色形象参考（最多支持2个角色参考）
  characterImageUrls.slice(0, 2).forEach(url => {
    referenceImages.push(url);
  });
  
  // 添加场景背景参考
  if (sceneBackgroundUrl) {
    referenceImages.push(sceneBackgroundUrl);
  }
  
  // 添加场景参考图
  if (sceneReferenceUrl) {
    referenceImages.push(sceneReferenceUrl);
  }

  console.log('[generateStoryboardImage] Generating image with params:', {
    promptLength: enhancedPrompt.length,
    characterCount: characterImageUrls.length,
    hasSceneBackground: !!sceneBackgroundUrl,
    hasSceneReference: !!sceneReferenceUrl,
    referenceCount: referenceImages.length,
    storyStyle,
  });

  const response = await client.generate({
    prompt: enhancedPrompt,
    size,
    watermark: false,
    image: referenceImages.length > 0 ? referenceImages : undefined,
  });

  const helper = client.getResponseHelper(response);

  if (!helper.success) {
    throw new Error(helper.errorMessages.join(', '));
  }

  // 下载图片并上传到对象存储
  const imageUrl = helper.imageUrls[0];
  const imageResponse = await fetch(imageUrl);
  const imageBuffer = Buffer.from(await imageResponse.arrayBuffer());

  const fileKey = await storage.uploadFile({
    fileContent: imageBuffer,
    fileName: `storyboards/${Date.now()}.png`,
    contentType: 'image/png',
  });

  return {
    imageUrl: await storage.generatePresignedUrl({ key: fileKey, expireTime: 86400 }),
    fileKey,
  };
}

/**
 * 可用的视频生成模型
 */
export const VIDEO_MODELS = {
  'seedance-1.5': {
    id: 'doubao-seedance-1-5-pro-251215',
    name: 'Seedance 1.5 Pro',
    description: '稳定可靠的视频生成模型',
  },
  // Note: Seedance 2.0 Pro model is not yet available in the SDK
  // Will be added when the model becomes available
} as const;

export type VideoModelId = keyof typeof VIDEO_MODELS;

/**
 * 生成分镜视频（带音频）
 * @param storyboardImageUrl 分镜图片 URL（作为视频首帧，保持画面一致性）
 * @param actionDescription 动作描述（描述视频中的动作和变化）
 * @param duration 视频时长（秒，4-12秒）
 * @param resolution 视频分辨率（480p, 720p）
 * @param model 视频生成模型
 * @param dialogue 对话内容（用于生成语音，格式：角色说的话）
 * @param generateAudio 是否生成音频（默认 true）
 */
export async function generateStoryboardVideo(
  storyboardImageUrl: string,
  actionDescription: string,
  duration: number = 5,
  resolution: '480p' | '720p' = '720p',
  model: VideoModelId = 'seedance-1.5',
  dialogue?: string,
  generateAudio: boolean = true
): Promise<string> {
  const modelConfig = VIDEO_MODELS[model];
  
  console.log('[generateStoryboardVideo] Generating video with params:', {
    hasFirstFrame: !!storyboardImageUrl,
    actionDescription: actionDescription.substring(0, 50),
    duration,
    model: modelConfig.name,
    hasDialogue: !!dialogue,
    generateAudio,
  });

  try {
    // 构建 prompt：如果有对话内容，将其加入 prompt 以生成语音
    // 根据 Seedance 1.5 Pro 文档，对话内容放在引号中可触发语音生成
    let promptText = actionDescription;
    if (dialogue && dialogue.trim()) {
      // 将对话内容加入 prompt，格式：动作描述，角色说："对话内容"
      promptText = `${actionDescription}，角色说："${dialogue.trim()}"`;
    }

    console.log('[generateStoryboardVideo] Prompt text:', promptText.substring(0, 100));

    // 使用分镜图片作为首帧 + 文本提示
    const content = [
      // 首帧图片
      {
        type: 'image_url' as const,
        image_url: {
          url: storyboardImageUrl,
        },
        role: 'first_frame' as const,
      },
      // 动作描述 + 对话
      {
        type: 'text' as const,
        text: promptText,
      } as const,
    ];

    // 直接调用 SDK，使用指定的模型
    const response = await videoClient.videoGeneration(content as any, {
      model: modelConfig.id,
      duration,
      ratio: '16:9',
      resolution,
      watermark: false,
      generateAudio, // 启用音频生成
      // 不设置 maxWaitTime，使用 SDK 默认的 900 秒
    });

    console.log('[generateStoryboardVideo] Response received:', {
      hasVideoUrl: !!response.videoUrl,
      status: response.response?.status,
      taskId: response.response?.id,
    });

    if (!response.videoUrl) {
      throw new Error('视频生成失败');
    }

    // 下载视频并上传到对象存储
    const videoResponse = await fetch(response.videoUrl);
    const videoBuffer = Buffer.from(await videoResponse.arrayBuffer());

    const fileKey = await storage.uploadFile({
      fileContent: videoBuffer,
      fileName: `videos/${Date.now()}.mp4`,
      contentType: 'video/mp4',
    });

    return fileKey;
  } catch (error: any) {
    console.error('[generateStoryboardVideo] Full error:', error);
    console.error('[generateStoryboardVideo] Error details:', {
      message: error.message,
      statusCode: error.statusCode,
      response: error.response,
    });
    
    // 直接抛出错误，不使用降级方案
    throw error;
  }
}

// 转场类型
export type TransitionType = 'cut' | 'fade' | 'zoom';

// 带转场信息的视频
export interface VideoWithTransition {
  videoKey: string;
  transitionType?: TransitionType; // 该视频之后使用的转场效果
  duration?: number; // 视频时长（秒）
}

/**
 * 获取视频时长（使用 ffprobe）
 */
async function getVideoDuration(ffprobePath: string | undefined, videoPath: string): Promise<number> {
  const { execSync } = require('child_process');
  const ffprobe = ffprobePath || 'ffprobe';
  
  try {
    const output = execSync(
      `"${ffprobe}" -v error -show_entries format=duration -of default=noprint_wrappers=1:nokey=1 "${videoPath}"`,
      { encoding: 'utf-8' }
    ).trim();
    return parseFloat(output);
  } catch (error) {
    console.error('[getVideoDuration] Error:', error);
    return 5; // 默认 5 秒
  }
}

/**
 * 将多个分镜视频拼接成完整视频（支持转场特效）
 */
export async function concatenateVideos(
  videoKeysOrData: string[] | VideoWithTransition[],
  outputFileName: string = 'full_video.mp4'
): Promise<string> {
  // 统一转换为 VideoWithTransition 格式
  const videoData: VideoWithTransition[] = videoKeysOrData.length > 0 && typeof videoKeysOrData[0] === 'string'
    ? (videoKeysOrData as string[]).map(key => ({ videoKey: key }))
    : videoKeysOrData as VideoWithTransition[];

  if (videoData.length === 0) {
    throw new Error('No videos to concatenate');
  }

  console.log(`[concatenateVideos] Starting with ${videoData.length} videos`);

  const ffmpeg = require('fluent-ffmpeg');
  const path = require('path');
  const fs = require('fs');
  const { execSync } = require('child_process');

  // 动态检测 ffmpeg 路径
  const projectRoot = process.cwd();
  const ffmpegPaths = [
    // pnpm 安装的 ffmpeg 路径（优先）
    path.join(projectRoot, 'node_modules/.pnpm/@ffmpeg-installer+linux-x64@4.1.0/node_modules/@ffmpeg-installer/linux-x64/ffmpeg'),
    path.join(projectRoot, 'node_modules/@ffmpeg-installer/linux-x64/ffmpeg'),
    // 系统路径
    '/usr/bin/ffmpeg',
    '/usr/local/bin/ffmpeg',
    '/opt/ffmpeg/bin/ffmpeg',
    process.env.FFMPEG_PATH,
  ].filter(Boolean);

  let ffmpegPath: string | undefined;
  let ffprobePath: string | undefined;
  
  for (const testPath of ffmpegPaths) {
    if (testPath && fs.existsSync(testPath)) {
      ffmpegPath = testPath;
      ffprobePath = testPath.replace('ffmpeg', 'ffprobe');
      ffmpeg.setFfmpegPath(ffmpegPath);
      if (fs.existsSync(ffprobePath)) {
        ffmpeg.setFfprobePath(ffprobePath);
      }
      console.log(`[concatenateVideos] ffmpeg found at: ${ffmpegPath}`);
      break;
    }
  }

  if (!ffmpegPath) {
    throw new Error('Cannot find ffmpeg. Please install ffmpeg or @ffmpeg-installer/ffmpeg');
  }

  // 创建临时目录
  const tempDir = path.join('/tmp', `video_merge_${Date.now()}`);
  fs.mkdirSync(tempDir, { recursive: true });

  try {
    // 下载所有视频到临时目录
    const videoPaths: string[] = [];
    const durations: number[] = [];
    const transitions: (TransitionType | undefined)[] = [];

    for (let i = 0; i < videoData.length; i++) {
      const { videoKey, transitionType } = videoData[i];
      console.log(`[concatenateVideos] Downloading video ${i + 1}/${videoData.length}: ${videoKey}`);
      
      const signedUrl = await storage.generatePresignedUrl({ key: videoKey, expireTime: 3600 });
      const response = await fetch(signedUrl);
      
      if (!response.ok) {
        throw new Error(`Failed to download video ${i}: ${response.status} ${response.statusText}`);
      }
      
      const buffer = Buffer.from(await response.arrayBuffer());
      console.log(`[concatenateVideos] Video ${i} downloaded, size: ${buffer.length} bytes`);

      const localPath = path.join(tempDir, `video_${i}.mp4`);
      fs.writeFileSync(localPath, buffer);
      videoPaths.push(localPath);
      
      // 获取视频时长
      const duration = await getVideoDuration(ffprobePath, localPath);
      durations.push(duration);
      transitions.push(transitionType);
      
      console.log(`[concatenateVideos] Video ${i} saved, duration: ${duration}s, transition: ${transitionType || 'none'}`);
    }

    // 输出文件路径
    const outputPath = path.join(tempDir, outputFileName);

    // 检查是否有转场效果（除了 cut 或 undefined）
    const hasTransitions = transitions.some(t => t && t !== 'cut');

    if (!hasTransitions) {
      // 没有转场效果，使用简单的 concat 模式
      console.log('[concatenateVideos] No transitions, using simple concat mode...');
      
      const listFilePath = path.join(tempDir, 'filelist.txt');
      const fileContent = videoPaths.map(p => `file '${p}'`).join('\n');
      fs.writeFileSync(listFilePath, fileContent);

      await new Promise<void>((resolve, reject) => {
        ffmpeg()
          .input(listFilePath)
          .inputOptions(['-f', 'concat', '-safe', '0'])
          .outputOptions(['-c', 'copy'])
          .output(outputPath)
          .on('start', (cmd: string) => console.log('[concatenateVideos] ffmpeg command:', cmd))
          .on('end', () => resolve())
          .on('error', (err: Error) => {
            console.error('[concatenateVideos] Simple concat failed, trying re-encode:', err.message);
            // 尝试重新编码
            ffmpeg()
              .input(listFilePath)
              .inputOptions(['-f', 'concat', '-safe', '0'])
              .outputOptions(['-c:v', 'libx264', '-preset', 'fast', '-crf', '23', '-c:a', 'aac'])
              .output(outputPath)
              .on('end', () => resolve())
              .on('error', (err2: Error) => reject(err2))
              .run();
          })
          .run();
      });
    } else {
      // 有转场效果，使用 xfade 滤镜
      console.log('[concatenateVideos] Applying transition effects...');
      
      // 转场时长（秒）
      const transitionDuration = 0.5;
      
      // 构建滤镜链
      if (videoPaths.length === 1) {
        // 只有一个视频，直接复制
        fs.copyFileSync(videoPaths[0], outputPath);
      } else {
        // 计算每个视频的实际时长（用于转场计算）
        const effectiveDurations = durations.map((d, i) => {
          // 最后一个视频不需要考虑后续转场
          if (i === durations.length - 1) return d;
          // 如果有转场，减去转场时长
          const trans = transitions[i];
          return trans && trans !== 'cut' ? d - transitionDuration : d;
        });

        // 构建复杂的滤镜链
        // 使用 xfade 滤镜进行转场
        let filterComplex = '';
        let currentLabel = '[0:v]';
        let currentAudioLabel = '[0:a]';
        
        // xfade 转场类型映射
        const xfadeTransitions: Record<TransitionType, string> = {
          'cut': 'fade', // cut 也用 fade，但时长为 0
          'fade': 'fade',
          'zoom': 'zoomin',
        };

        // 逐个合并视频
        for (let i = 0; i < videoPaths.length - 1; i++) {
          const trans = transitions[i] || 'cut';
          const xfadeType = xfadeTransitions[trans];
          const offset = effectiveDurations.slice(0, i + 1).reduce((a, b) => a + b, 0);
          const transDur = trans === 'cut' ? 0.1 : transitionDuration; // cut 用极短的过渡
          
          const outputLabel = `[v${i}]`;
          const audioOutputLabel = `[a${i}]`;
          
          if (i === 0) {
            // 第一个转场
            filterComplex += `[0:v][1:v]xfade=transition=${xfadeType}:duration=${transDur}:offset=${offset}${outputLabel};`;
            filterComplex += `[0:a][1:a]acrossfade=d=${transDur}${audioOutputLabel};`;
          } else {
            // 后续转场
            filterComplex += `[v${i-1}][${i+1}:v]xfade=transition=${xfadeType}:duration=${transDur}:offset=${offset}${outputLabel};`;
            filterComplex += `[a${i-1}][${i+1}:a]acrossfade=d=${transDur}${audioOutputLabel};`;
          }
        }

        // 最后一个输出标签
        const finalVideoLabel = `[v${videoPaths.length - 2}]`;
        const finalAudioLabel = `[a${videoPaths.length - 2}]`;

        // 构建 ffmpeg 命令
        const inputArgs = videoPaths.flatMap(p => ['-i', p]);
        
        // 对于大量视频，xfade 滤镜链会非常复杂
        // 使用简化方案：逐对合并视频
        console.log('[concatenateVideos] Using sequential merge with transitions...');
        
        let mergedPath = videoPaths[0];
        let mergedDuration = durations[0];
        
        for (let i = 1; i < videoPaths.length; i++) {
          const trans = transitions[i - 1] || 'cut';
          const outputPath2 = path.join(tempDir, `merged_${i}.mp4`);
          
          if (trans === 'cut') {
            // 直接拼接，无转场
            const listFile = path.join(tempDir, `list_${i}.txt`);
            fs.writeFileSync(listFile, `file '${mergedPath}'\nfile '${videoPaths[i]}'`);
            
            execSync(
              `"${ffmpegPath}" -y -f concat -safe 0 -i "${listFile}" -c copy "${outputPath2}"`,
              { stdio: 'inherit' }
            );
          } else {
            // 使用 xfade 转场
            const xfadeType = trans === 'zoom' ? 'zoomin' : 'fade';
            const transDur = transitionDuration;
            const offset = mergedDuration - transDur;
            
            console.log(`[concatenateVideos] Merging ${i-1} and ${i} with ${trans} transition at offset ${offset}s`);
            
            // 构建滤镜
            const filter = `[0:v][1:v]xfade=transition=${xfadeType}:duration=${transDur}:offset=${offset}[v];` +
                          `[0:a][1:a]acrossfade=d=${transDur}[a]`;
            
            try {
              execSync(
                `"${ffmpegPath}" -y -i "${mergedPath}" -i "${videoPaths[i]}" ` +
                `-filter_complex "${filter}" ` +
                `-map "[v]" -map "[a]" ` +
                `-c:v libx264 -preset fast -crf 23 ` +
                `-c:a aac -b:a 192k ` +
                `"${outputPath2}"`,
                { stdio: 'inherit' }
              );
            } catch (e) {
              // 如果转场失败，回退到简单拼接
              console.log(`[concatenateVideos] xfade failed, falling back to concat...`);
              const listFile = path.join(tempDir, `list_${i}.txt`);
              fs.writeFileSync(listFile, `file '${mergedPath}'\nfile '${videoPaths[i]}'`);
              execSync(
                `"${ffmpegPath}" -y -f concat -safe 0 -i "${listFile}" -c copy "${outputPath2}"`,
                { stdio: 'inherit' }
              );
            }
          }
          
          mergedPath = outputPath2;
          mergedDuration += durations[i] - (trans !== 'cut' ? transitionDuration : 0);
        }
        
        // 最终输出
        fs.copyFileSync(mergedPath, outputPath);
      }
    }

    // 读取合并后的视频
    console.log('[concatenateVideos] Reading merged video file...');
    const mergedVideoBuffer = fs.readFileSync(outputPath);
    console.log(`[concatenateVideos] Merged video size: ${mergedVideoBuffer.length} bytes`);

    // 上传到对象存储
    console.log('[concatenateVideos] Uploading merged video to storage...');
    const fileKey = await storage.uploadFile({
      fileContent: mergedVideoBuffer,
      fileName: `full-videos/${Date.now()}_${Math.random().toString(36).substr(2, 9)}.mp4`,
      contentType: 'video/mp4',
    });

    console.log('[concatenateVideos] Video uploaded successfully, key:', fileKey);
    return fileKey;
  } finally {
    // 清理临时目录
    try {
      fs.rmSync(tempDir, { recursive: true, force: true });
    } catch (error) {
      console.error('Failed to clean up temp directory:', error);
    }
  }
}

/**
 * 将音频和视频合并成一个文件
 * @param videoKey 视频文件的 storage key
 * @param audioKey 音频文件的 storage key
 * @returns 合并后的文件 key
 */
export async function mergeAudioAndVideo(
  videoKey: string,
  audioKey: string
): Promise<string> {
  console.log('[mergeAudioAndVideo] Starting merge process');

  const ffmpeg = require('fluent-ffmpeg');
  const path = require('path');
  const fs = require('fs');

  // 动态检测 ffmpeg 路径
  let ffmpegFound = false;
  
  // pnpm 安装的 ffmpeg 路径（需要检查多个可能的位置）
  const projectRoot = process.cwd();
  const pnpmFfmpegPaths = [
    // pnpm 结构 - 直接指定版本路径
    path.join(projectRoot, 'node_modules/.pnpm/@ffmpeg-installer+linux-x64@4.1.0/node_modules/@ffmpeg-installer/linux-x64/ffmpeg'),
    // 普通结构
    path.join(projectRoot, 'node_modules/@ffmpeg-installer/linux-x64/ffmpeg'),
    // monorepo 结构
    path.join(projectRoot, '../../node_modules/.pnpm/@ffmpeg-installer+linux-x64@4.1.0/node_modules/@ffmpeg-installer/linux-x64/ffmpeg'),
  ];

  // 先检查 pnpm 路径
  for (const ffmpegPath of pnpmFfmpegPaths) {
    if (fs.existsSync(ffmpegPath)) {
      ffmpeg.setFfmpegPath(ffmpegPath);
      console.log(`[mergeAudioAndVideo] ffmpeg found via pnpm at: ${ffmpegPath}`);
      ffmpegFound = true;
      break;
    }
  }

  // 尝试使用 @ffmpeg-installer/ffmpeg 包
  if (!ffmpegFound) {
    try {
      const ffmpegInstaller = require('@ffmpeg-installer/ffmpeg');
      if (ffmpegInstaller.path && fs.existsSync(ffmpegInstaller.path)) {
        ffmpeg.setFfmpegPath(ffmpegInstaller.path);
        console.log(`[mergeAudioAndVideo] ffmpeg found via @ffmpeg-installer at: ${ffmpegInstaller.path}`);
        ffmpegFound = true;
      }
    } catch (e) {
      console.log('[mergeAudioAndVideo] @ffmpeg-installer/ffmpeg not available:', e);
    }
  }

  // 如果仍然找不到，尝试系统路径
  if (!ffmpegFound) {
    const systemPaths = [
      '/usr/bin/ffmpeg',
      '/usr/local/bin/ffmpeg',
      '/opt/ffmpeg/bin/ffmpeg',
      process.env.FFMPEG_PATH,
    ].filter(Boolean);

    for (const ffmpegPath of systemPaths) {
      if (ffmpegPath && fs.existsSync(ffmpegPath)) {
        ffmpeg.setFfmpegPath(ffmpegPath);
        const ffprobePath = ffmpegPath.replace('ffmpeg', 'ffprobe');
        if (fs.existsSync(ffprobePath)) {
          ffmpeg.setFfprobePath(ffprobePath);
        }
        console.log(`[mergeAudioAndVideo] ffmpeg found at: ${ffmpegPath}`);
        ffmpegFound = true;
        break;
      }
    }
  }

  if (!ffmpegFound) {
    throw new Error('Cannot find ffmpeg. Please install ffmpeg or @ffmpeg-installer/ffmpeg');
  }

  // 创建临时目录
  const tempDir = path.join('/tmp', `audio_video_merge_${Date.now()}`);
  fs.mkdirSync(tempDir, { recursive: true });

  try {
    // 下载视频文件
    console.log('[mergeAudioAndVideo] Downloading video file...');
    const videoSignedUrl = await storage.generatePresignedUrl({ key: videoKey, expireTime: 3600 });
    const videoResponse = await fetch(videoSignedUrl);
    const videoBuffer = Buffer.from(await videoResponse.arrayBuffer());
    const videoPath = path.join(tempDir, 'video.mp4');
    fs.writeFileSync(videoPath, videoBuffer);
    console.log(`[mergeAudioAndVideo] Video downloaded, size: ${videoBuffer.length} bytes`);

    // 下载音频文件
    console.log('[mergeAudioAndVideo] Downloading audio file...');
    const audioSignedUrl = await storage.generatePresignedUrl({ key: audioKey, expireTime: 3600 });
    const audioResponse = await fetch(audioSignedUrl);
    const audioBuffer = Buffer.from(await audioResponse.arrayBuffer());
    const audioPath = path.join(tempDir, 'audio.mp3');
    fs.writeFileSync(audioPath, audioBuffer);
    console.log(`[mergeAudioAndVideo] Audio downloaded, size: ${audioBuffer.length} bytes`);

    // 输出文件路径
    const outputPath = path.join(tempDir, 'merged.mp4');

    console.log('[mergeAudioAndVideo] Starting ffmpeg merge...');

    // 使用 ffmpeg 合并音频和视频
    await new Promise<void>((resolve, reject) => {
      const command = ffmpeg()
        .input(videoPath)
        .input(audioPath)
        .outputOptions([
          '-c:v', 'copy',  // 视频直接复制，不重新编码
          '-c:a', 'aac',   // 音频重新编码为 aac
          '-map', '0:v:0', // 使用第一个输入的视频
          '-map', '1:a:0', // 使用第二个输入的音频
          '-shortest',     // 以较短的时长为准
        ])
        .output(outputPath)
        .on('start', (commandLine: string) => {
          console.log('[mergeAudioAndVideo] ffmpeg command:', commandLine);
        })
        .on('progress', (progress: any) => {
          console.log('[mergeAudioAndVideo] ffmpeg progress:', progress.percent ? `${Math.round(progress.percent)}%` : 'processing...');
        })
        .on('end', () => {
          console.log('[mergeAudioAndVideo] ffmpeg merge completed');
          resolve();
        })
        .on('error', (err: Error, stdout: string, stderr: string) => {
          console.error('[mergeAudioAndVideo] ffmpeg error:', err.message);
          console.error('[mergeAudioAndVideo] ffmpeg stderr:', stderr);
          reject(err);
        });

      command.run();
    });

    // 读取合并后的文件
    console.log('[mergeAudioAndVideo] Reading merged file...');
    const mergedBuffer = fs.readFileSync(outputPath);
    console.log(`[mergeAudioAndVideo] Merged file size: ${mergedBuffer.length} bytes`);

    // 上传到对象存储
    console.log('[mergeAudioAndVideo] Uploading merged file...');
    const fileKey = await storage.uploadFile({
      fileContent: mergedBuffer,
      fileName: `merged-videos/${Date.now()}_${Math.random().toString(36).substr(2, 9)}.mp4`,
      contentType: 'video/mp4',
    });

    console.log('[mergeAudioAndVideo] Done! File key:', fileKey);
    return fileKey;
  } finally {
    // 清理临时目录
    try {
      fs.rmSync(tempDir, { recursive: true, force: true });
    } catch (error) {
      console.error('Failed to clean up temp directory:', error);
    }
  }
}

/**
 * 生成旁白音频或角色对话音频
 * @param text 文本内容
 * @param scriptType 剧本类型：'剧情演绎' 或 '旁白解说'
 * @param speaker 说话人（仅剧情演绎时需要）
 * @param options 额外的语音配置
 */
export async function generateNarrationAudio(
  text: string,
  scriptType: '剧情演绎' | '旁白解说' = '旁白解说',
  speaker: string = 'zh_female_xiaohe_uranus_bigtts',
  options?: {
    speechRate?: number; // 语速（-50到100，0为正常）
    loudnessRate?: number; // 音量（-50到100，0为正常）
  }
) {
  // 根据剧本类型调整文本内容
  let finalText = text;

  if (scriptType === '剧情演绎') {
    // 剧情演绎模式：简化文本，更适合角色对话
    finalText = text.replace(/，/g, '，').replace(/。/g, '。').replace(/！/g, '！');
    // 可以添加更多处理逻辑
  } else {
    // 旁白解说模式：添加适当的停顿和语气
    finalText = text.replace(/，/g, '，').replace(/。/g, '。');
  }

  const response = await ttsClient.synthesize({
    uid: 'narration',
    text: finalText,
    speaker,
    audioFormat: 'mp3',
    sampleRate: 24000,
    speechRate: options?.speechRate || 0,
    loudnessRate: options?.loudnessRate || 0,
  });

  // 下载音频并上传到对象存储
  const audioResponse = await fetch(response.audioUri);
  const audioBuffer = Buffer.from(await audioResponse.arrayBuffer());

  const fileKey = await storage.uploadFile({
    fileContent: audioBuffer,
    fileName: `narrations/${Date.now()}.mp3`,
    contentType: 'audio/mpeg',
  });

  return {
    audioUrl: await storage.generatePresignedUrl({ key: fileKey, expireTime: 86400 }),
    fileKey,
  };
}

/**
 * 上传文件到对象存储
 */
export async function uploadFileToStorage(file: File, folder: string = 'uploads') {
  const buffer = Buffer.from(await file.arrayBuffer());

  const fileKey = await storage.uploadFile({
    fileContent: buffer,
    fileName: `${folder}/${Date.now()}_${file.name}`,
    contentType: file.type,
  });

  return {
    fileKey,
    url: await storage.generatePresignedUrl({ key: fileKey, expireTime: 86400 }),
  };
}

/**
 * 生成文件的访问URL
 */
export async function generateFileUrl(fileKey: string, expireTime: number = 3600) {
  return storage.generatePresignedUrl({ key: fileKey, expireTime });
}

/**
 * 从 S3 URL 中提取 fileKey
 * @param url S3 完整 URL
 * @returns fileKey
 */
export function extractFileKeyFromUrl(url: string): string {
  try {
    const urlObj = new URL(url);
    // 移除查询参数
    const pathWithoutQuery = urlObj.pathname;
    // 移除开头的斜杠
    return pathWithoutQuery.startsWith('/') ? pathWithoutQuery.slice(1) : pathWithoutQuery;
  } catch (error) {
    console.error('Failed to extract file key from URL:', error);
    return url;
  }
}
