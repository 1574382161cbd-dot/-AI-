/**
 * 全局角色库 - 预设角色模板
 */
export interface CharacterTemplate {
  id: string;
  name: string;
  description: string;
  appearance: string;
  personality: string;
  category: 'protagonist' | 'antagonist' | 'supporting' | 'fantasy' | 'scifi' | 'animal';
  avatarUrl?: string;
  icon?: string;
  tags: string[];
  defaultVoiceStyle?: string;
  defaultVoiceSpeed?: number;
  defaultVoiceEmotion?: string;
}

export const CHARACTER_TEMPLATES: CharacterTemplate[] = [
  // 主角类
  {
    id: 'protagonist-hero',
    name: '勇敢的英雄',
    description: '正义感强，勇敢无畏的主角',
    appearance: '身材高大，眼神坚定，穿着现代休闲装，短发，阳光帅气',
    personality: '勇敢、正义、善良、乐观',
    category: 'protagonist',
    icon: '🦸',
    tags: ['主角', '勇敢', '正义'],
    defaultVoiceStyle: 'zh_male_xuanchuan_bigtts',
    defaultVoiceSpeed: 10,
    defaultVoiceEmotion: 'confident',
  },
  {
    id: 'protagonist-heroine',
    name: '温柔的女主角',
    description: '善良、温柔、有同理心的女主角',
    appearance: '长发，五官精致，穿着优雅的连衣裙，温柔的笑容',
    personality: '温柔、善良、有同理心、坚韧',
    category: 'protagonist',
    icon: '👩',
    tags: ['主角', '温柔', '善良'],
    defaultVoiceStyle: 'zh_female_xiaohe_uranus_bigtts',
    defaultVoiceSpeed: 0,
    defaultVoiceEmotion: 'gentle',
  },
  {
    id: 'protagonist-youth',
    name: '热血少年',
    description: '充满活力的年轻主角',
    appearance: '年轻充满活力，穿着运动服，眼神炯炯有神，充满朝气',
    personality: '热血、活力、乐观、不放弃',
    category: 'protagonist',
    icon: '👦',
    tags: ['主角', '热血', '青春'],
    defaultVoiceStyle: 'zh_male_boy_guangsizhilian_uranus',
    defaultVoiceSpeed: 20,
    defaultVoiceEmotion: 'excited',
  },

  // 反派类
  {
    id: 'antagonist-villain',
    name: '邪恶反派',
    description: '野心勃勃，冷酷无情的反派',
    appearance: '身材高大，面容冷峻，穿着黑色西装，眼神锐利',
    personality: '冷酷、野心、狡猾、无情',
    category: 'antagonist',
    icon: '🦹',
    tags: ['反派', '冷酷', '野心'],
    defaultVoiceStyle: 'zh_male_maoze_duanjun',
    defaultVoiceSpeed: -10,
    defaultVoiceEmotion: 'cold',
  },
  {
    id: 'antagonist-rival',
    name: '竞争对手',
    description: '与主角竞争，但不一定是邪恶的',
    appearance: '英俊潇洒，穿着时尚，自信从容',
    personality: '自信、竞争、骄傲、有能力',
    category: 'antagonist',
    icon: '🎭',
    tags: ['反派', '竞争', '自信'],
    defaultVoiceStyle: 'zh_male_duanjun',
    defaultVoiceSpeed: 0,
    defaultVoiceEmotion: 'proud',
  },

  // 配角类
  {
    id: 'supporting-mentor',
    name: '导师',
    description: '智慧、有经验的长者角色',
    appearance: '年长者，留着胡须，穿着传统的中式服装，眼神慈祥',
    personality: '智慧、耐心、慈祥、有经验',
    category: 'supporting',
    icon: '👴',
    tags: ['配角', '导师', '智慧'],
    defaultVoiceStyle: 'zh_male_elder_yangjiax',
    defaultVoiceSpeed: -20,
    defaultVoiceEmotion: 'calm',
  },
  {
    id: 'supporting-friend',
    name: '好友',
    description: '主角的忠实朋友',
    appearance: '充满活力，笑容灿烂，穿着休闲装，热情开朗',
    personality: '热情、忠诚、幽默、乐观',
    category: 'supporting',
    icon: '🤝',
    tags: ['配角', '好友', '热情'],
    defaultVoiceStyle: 'zh_male_guangxiang',
    defaultVoiceSpeed: 10,
    defaultVoiceEmotion: 'happy',
  },
  {
    id: 'supporting-assistant',
    name: '助手',
    description: '能干、可靠的助手角色',
    appearance: '穿着职业装，干练利落，眼神专注',
    personality: '能干、可靠、细心、专业',
    category: 'supporting',
    icon: '💼',
    tags: ['配角', '助手', '能干'],
    defaultVoiceStyle: 'zh_female_qingxin_bigtts',
    defaultVoiceSpeed: 0,
    defaultVoiceEmotion: 'neutral',
  },

  // 奇幻类
  {
    id: 'fantasy-wizard',
    name: '魔法师',
    description: '神秘的魔法使用者',
    appearance: '穿着华丽的魔法袍，手持法杖，眼神神秘',
    personality: '神秘、智慧、强大、神秘',
    category: 'fantasy',
    icon: '🧙',
    tags: ['奇幻', '魔法', '神秘'],
    defaultVoiceStyle: 'zh_male_elder_yangjiax',
    defaultVoiceSpeed: -15,
    defaultVoiceEmotion: 'mysterious',
  },
  {
    id: 'fantasy-elf',
    name: '精灵',
    description: '美丽、优雅的森林精灵',
    appearance: '尖耳朵，精致的面容，穿着绿色长袍，散发着自然气息',
    personality: '优雅、善良、与自然相连',
    category: 'fantasy',
    icon: '🧝',
    tags: ['奇幻', '精灵', '优雅'],
    defaultVoiceStyle: 'zh_female_xiaohe_uranus_bigtts',
    defaultVoiceSpeed: 5,
    defaultVoiceEmotion: 'gentle',
  },
  {
    id: 'fantasy-dragon',
    name: '龙',
    description: '威严的龙族',
    appearance: '巨大的身躯，闪闪发光的鳞片，威严的表情',
    personality: '威严、强大、古老',
    category: 'fantasy',
    icon: '🐉',
    tags: ['奇幻', '龙', '威严'],
    defaultVoiceStyle: 'zh_male_xuanchuan_bigtts',
    defaultVoiceSpeed: -10,
    defaultVoiceEmotion: 'majestic',
  },

  // 科幻类
  {
    id: 'scifi-robot',
    name: '机器人',
    description: '高科技的智能机器人',
    appearance: '金属身躯，发光的眼睛，未来感十足',
    personality: '理性、忠诚、逻辑性强',
    category: 'scifi',
    icon: '🤖',
    tags: ['科幻', '机器人', '科技'],
    defaultVoiceStyle: 'zh_male_guangxiang',
    defaultVoiceSpeed: 0,
    defaultVoiceEmotion: 'neutral',
  },
  {
    id: 'scifi-captain',
    name: '飞船船长',
    description: '勇敢的星际探险者',
    appearance: '穿着太空服，手持通讯器，眼神坚毅',
    personality: '勇敢、果断、有冒险精神',
    category: 'scifi',
    icon: '🚀',
    tags: ['科幻', '船长', '冒险'],
    defaultVoiceStyle: 'zh_male_duanjun',
    defaultVoiceSpeed: 5,
    defaultVoiceEmotion: 'confident',
  },
  {
    id: 'scifi-scientist',
    name: '科学家',
    description: '天才科学家',
    appearance: '戴着眼镜，穿着白大褂，手中拿着平板电脑',
    personality: '聪明、理性、执着',
    category: 'scifi',
    icon: '🔬',
    tags: ['科幻', '科学家', '聪明'],
    defaultVoiceStyle: 'zh_female_qingxin_bigtts',
    defaultVoiceSpeed: 0,
    defaultVoiceEmotion: 'calm',
  },

  // 动物类
  {
    id: 'animal-cat',
    name: '猫',
    description: '可爱、独立的猫咪',
    appearance: '毛茸茸的身体，灵活的尾巴，可爱的大眼睛',
    personality: '可爱、独立、好奇',
    category: 'animal',
    icon: '🐱',
    tags: ['动物', '猫', '可爱'],
  },
  {
    id: 'animal-dog',
    name: '狗',
    description: '忠诚、热情的狗狗',
    appearance: '摇着尾巴，充满活力的眼神，热情的表情',
    personality: '忠诚、热情、友好',
    category: 'animal',
    icon: '🐕',
    tags: ['动物', '狗', '忠诚'],
  },
  {
    id: 'animal-bird',
    name: '鸟',
    description: '自由飞翔的小鸟',
    appearance: '多彩的羽毛，灵动的眼睛，自由自在',
    personality: '自由、快乐、灵动',
    category: 'animal',
    icon: '🐦',
    tags: ['动物', '鸟', '自由'],
  },
];

export const CHARACTER_CATEGORIES = [
  { value: 'protagonist', label: '主角', icon: '🦸' },
  { value: 'antagonist', label: '反派', icon: '🦹' },
  { value: 'supporting', label: '配角', icon: '👥' },
  { value: 'fantasy', label: '奇幻', icon: '✨' },
  { value: 'scifi', label: '科幻', icon: '🚀' },
  { value: 'animal', label: '动物', icon: '🐾' },
];

/**
 * 根据分类获取角色模板
 */
export function getCharacterTemplatesByCategory(category: string): CharacterTemplate[] {
  return CHARACTER_TEMPLATES.filter(t => t.category === category);
}

/**
 * 根据ID获取角色模板
 */
export function getCharacterTemplateById(id: string): CharacterTemplate | undefined {
  return CHARACTER_TEMPLATES.find(t => t.id === id);
}

/**
 * 搜索角色模板
 */
export function searchCharacterTemplates(keyword: string): CharacterTemplate[] {
  const lowerKeyword = keyword.toLowerCase();
  return CHARACTER_TEMPLATES.filter(t =>
    t.name.toLowerCase().includes(lowerKeyword) ||
    t.description.toLowerCase().includes(lowerKeyword) ||
    t.tags.some(tag => tag.toLowerCase().includes(lowerKeyword))
  );
}
