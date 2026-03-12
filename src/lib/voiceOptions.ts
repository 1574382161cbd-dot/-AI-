/**
 * 语音选项配置
 * 基于豆包语音支持的音色
 */

export interface VoiceOption {
  id: string;
  name: string;
  category: 'general' | 'audiobook' | 'video' | 'roleplay';
  gender: 'male' | 'female' | 'child';
  description: string;
}

export const VOICE_OPTIONS: VoiceOption[] = [
  // 通用音色
  {
    id: 'zh_female_xiaohe_uranus_bigtts',
    name: '小禾',
    category: 'general',
    gender: 'female',
    description: '默认通用音色，适合各种场景',
  },
  {
    id: 'zh_female_vv_uranus_bigtts',
    name: 'Vivi',
    category: 'general',
    gender: 'female',
    description: '中英双语，适合国际化场景',
  },
  {
    id: 'zh_male_m191_uranus_bigtts',
    name: '云舟',
    category: 'general',
    gender: 'male',
    description: '稳重男声，适合旁白解说',
  },
  {
    id: 'zh_male_taocheng_uranus_bigtts',
    name: '小天',
    category: 'general',
    gender: 'male',
    description: '年轻男声，适合现代题材',
  },

  // 有声读物/朗读
  {
    id: 'zh_female_xueayi_saturn_bigtts',
    name: '雪阿姨',
    category: 'audiobook',
    gender: 'female',
    description: '儿童有声读物专用音色',
  },

  // 视频配音
  {
    id: 'zh_male_dayi_saturn_bigtts',
    name: '大义',
    category: 'video',
    gender: 'male',
    description: '男声配音，适合视频解说',
  },
  {
    id: 'zh_female_mizai_saturn_bigtts',
    name: '米在',
    category: 'video',
    gender: 'female',
    description: '女声配音，自然亲切',
  },
  {
    id: 'zh_female_jitangnv_saturn_bigtts',
    name: '激情女声',
    category: 'video',
    gender: 'female',
    description: '富有感染力，适合励志内容',
  },
  {
    id: 'zh_female_meilinvyou_saturn_bigtts',
    name: '迷人女友',
    category: 'video',
    gender: 'female',
    description: '温柔甜美，适合恋爱题材',
  },
  {
    id: 'zh_female_santongyongns_saturn_bigtts',
    name: '甜美女声',
    category: 'video',
    gender: 'female',
    description: '甜美可爱，适合轻快内容',
  },
  {
    id: 'zh_male_ruyayichen_saturn_bigtts',
    name: '优雅男声',
    category: 'video',
    gender: 'male',
    description: '优雅稳重，适合正式场合',
  },

  // 角色扮演
  {
    id: 'saturn_zh_female_keainvsheng_tob',
    name: '可爱女声',
    category: 'roleplay',
    gender: 'female',
    description: '可爱活泼，适合萌系角色',
  },
  {
    id: 'saturn_zh_female_tiaopigongzhu_tob',
    name: '调皮公主',
    category: 'roleplay',
    gender: 'female',
    description: '调皮可爱，适合活泼角色',
  },
  {
    id: 'saturn_zh_male_shuanglangshaonian_tob',
    name: '爽朗少年',
    category: 'roleplay',
    gender: 'male',
    description: '爽朗阳光，适合少年角色',
  },
  {
    id: 'saturn_zh_male_tiancaitongzhuo_tob',
    name: '天才同桌',
    category: 'roleplay',
    gender: 'male',
    description: '聪明理性，适合学霸角色',
  },
  {
    id: 'saturn_zh_female_cancan_tob',
    name: '聪明灿灿',
    category: 'roleplay',
    gender: 'female',
    description: '聪明伶俐，适合智慧角色',
  },
];

export const VOICE_CATEGORIES = {
  general: '通用',
  audiobook: '有声读物',
  video: '视频配音',
  roleplay: '角色扮演',
} as const;

export const EMOTION_OPTIONS = [
  { id: 'neutral', name: '平静', description: '正常语气' },
  { id: 'happy', name: '开心', description: '愉快语气' },
  { id: 'sad', name: '悲伤', description: '低沉语气' },
  { id: 'angry', name: '愤怒', description: '激动语气' },
  { id: 'calm', name: '温柔', description: '温和语气' },
  { id: 'excited', name: '兴奋', description: '激昂语气' },
];

/**
 * 根据类别筛选语音选项
 */
export function filterVoicesByCategory(category: VoiceOption['category']): VoiceOption[] {
  return VOICE_OPTIONS.filter(voice => voice.category === category);
}

/**
 * 根据性别筛选语音选项
 */
export function filterVoicesByGender(gender: VoiceOption['gender']): VoiceOption[] {
  return VOICE_OPTIONS.filter(voice => voice.gender === gender);
}

/**
 * 根据ID获取语音选项
 */
export function getVoiceById(id: string): VoiceOption | undefined {
  return VOICE_OPTIONS.find(voice => voice.id === id);
}
