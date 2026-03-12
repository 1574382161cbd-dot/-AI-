/**
 * 场景素材库 - 预设场景模板
 */
export interface SceneTemplate {
  id: string;
  name: string;
  description: string;
  category: 'indoor' | 'outdoor' | 'fantasy' | 'sci-fi' | 'period';
  prompt: string;
  imagePrompt?: string;
  icon?: string;
  tags: string[];
}

export const SCENE_TEMPLATES: SceneTemplate[] = [
  // 室内场景
  {
    id: 'indoor-living-room',
    name: '客厅',
    description: '温馨的家庭客厅',
    category: 'indoor',
    prompt: '温馨的客厅，明亮的自然光从窗户射入，现代化的家具布置',
    imagePrompt: '温馨的客厅，现代化家具，明亮光线，舒适的氛围',
    icon: '🛋️',
    tags: ['家庭', '温馨', '现代'],
  },
  {
    id: 'indoor-bedroom',
    name: '卧室',
    description: '舒适的私人空间',
    category: 'indoor',
    prompt: '舒适的卧室，柔软的床铺，柔和的灯光，安静的休息环境',
    imagePrompt: '舒适的卧室，柔软的床，柔和灯光，安静氛围',
    icon: '🛏️',
    tags: ['休息', '私密', '温馨'],
  },
  {
    id: 'indoor-office',
    name: '办公室',
    description: '专业的工作空间',
    category: 'indoor',
    prompt: '现代办公室，整洁的办公桌，电脑设备，专业的环境',
    imagePrompt: '现代办公室，整洁桌面，电脑设备，专业氛围',
    icon: '💼',
    tags: ['工作', '专业', '现代'],
  },
  {
    id: 'indoor-cafe',
    name: '咖啡馆',
    description: '悠闲的社交场所',
    category: 'indoor',
    prompt: '温馨的咖啡馆，咖啡香气弥漫，舒适的座位，轻松的氛围',
    imagePrompt: '温馨咖啡馆，咖啡香气，舒适座位，轻松氛围',
    icon: '☕',
    tags: ['休闲', '社交', '温馨'],
  },

  // 室外场景
  {
    id: 'outdoor-park',
    name: '公园',
    description: '绿意盎然的公共空间',
    category: 'outdoor',
    prompt: '美丽的公园，绿树成荫，鲜花盛开，阳光明媚',
    imagePrompt: '美丽公园，绿树，鲜花，阳光明媚',
    icon: '🌳',
    tags: ['自然', '休闲', '绿化'],
  },
  {
    id: 'outdoor-beach',
    name: '海滩',
    description: '阳光沙滩的海边',
    category: 'outdoor',
    prompt: '金色的沙滩，蔚蓝的海水，海浪拍打，热带风情',
    imagePrompt: '金色沙滩，蓝色海水，海浪，热带风情',
    icon: '🏖️',
    tags: ['海洋', '热带', '休闲'],
  },
  {
    id: 'outdoor-mountain',
    name: '山地',
    description: '壮丽的山脉景观',
    category: 'outdoor',
    prompt: '巍峨的山脉，云雾缭绕，雄伟壮丽，自然景观',
    imagePrompt: '巍峨山脉，云雾，雄伟壮丽，自然景观',
    icon: '🏔️',
    tags: ['自然', '壮丽', '山脉'],
  },
  {
    id: 'outdoor-city',
    name: '城市街道',
    description: '繁华的都市街道',
    category: 'outdoor',
    prompt: '繁华的城市街道，高楼林立，车水马龙，现代都市',
    imagePrompt: '繁华城市街道，高楼，车流，现代都市',
    icon: '🏙️',
    tags: ['城市', '现代', '繁华'],
  },

  // 奇幻场景
  {
    id: 'fantasy-castle',
    name: '奇幻城堡',
    description: '神秘的魔法城堡',
    category: 'fantasy',
    prompt: '神秘的魔法城堡，高耸的塔楼，奇幻的光芒，童话世界',
    imagePrompt: '神秘魔法城堡，高塔，奇幻光芒，童话世界',
    icon: '🏰',
    tags: ['魔法', '童话', '奇幻'],
  },
  {
    id: 'fantasy-forest',
    name: '魔法森林',
    description: '充满魔力的森林',
    category: 'fantasy',
    prompt: '神秘的魔法森林，发光的植物，奇幻的生物，魔法世界',
    imagePrompt: '神秘魔法森林，发光植物，奇幻生物，魔法世界',
    icon: '🌲',
    tags: ['魔法', '自然', '奇幻'],
  },
  {
    id: 'fantasy-sky',
    name: '天空之城',
    description: '漂浮在空中的城市',
    category: 'fantasy',
    prompt: '漂浮在空中的天空之城，云海缭绕，奇幻建筑，梦幻世界',
    imagePrompt: '漂浮天空之城，云海，奇幻建筑，梦幻世界',
    icon: '☁️',
    tags: ['奇幻', '梦幻', '天空'],
  },

  // 科幻场景
  {
    id: 'scifi-spacestation',
    name: '太空站',
    description: '未来科技的空间站',
    category: 'sci-fi',
    prompt: '未来科技的空间站，高科技设备，星空背景，科幻世界',
    imagePrompt: '未来科技空间站，高科技设备，星空背景，科幻世界',
    icon: '🚀',
    tags: ['科幻', '太空', '未来'],
  },
  {
    id: 'scifi-cybercity',
    name: '赛博朋克城市',
    description: '霓虹闪烁的未来城市',
    category: 'sci-fi',
    prompt: '赛博朋克风格的城市，霓虹灯光，高楼大厦，未来都市',
    imagePrompt: '赛博朋克城市，霓虹灯光，高楼大厦，未来都市',
    icon: '🌃',
    tags: ['科幻', '未来', '赛博朋克'],
  },
  {
    id: 'scifi-lab',
    name: '高科技实验室',
    description: '先进的科研设施',
    category: 'sci-fi',
    prompt: '高科技实验室，精密仪器，未来科技，科研环境',
    imagePrompt: '高科技实验室，精密仪器，未来科技，科研环境',
    icon: '🔬',
    tags: ['科幻', '科技', '实验室'],
  },

  // 古代场景
  {
    id: 'period-palace',
    name: '古代宫殿',
    description: '富丽堂皇的皇宫',
    category: 'period',
    prompt: '古代宫殿，金碧辉煌，雕梁画栋，皇家气派',
    imagePrompt: '古代宫殿，金碧辉煌，雕梁画栋，皇家气派',
    icon: '🏯',
    tags: ['古代', '皇家', '宫殿'],
  },
  {
    id: 'period-market',
    name: '古代集市',
    description: '热闹的古代市集',
    category: 'period',
    prompt: '古代集市，热闹非凡，商贩云集，繁华市井',
    imagePrompt: '古代集市，热闹非凡，商贩云集，繁华市井',
    icon: '🎪',
    tags: ['古代', '市集', '繁华'],
  },
  {
    id: 'period-temple',
    name: '古寺',
    description: '宁静的古刹',
    category: 'period',
    prompt: '古寺僧院，宁静祥和，香火缭绕，佛教文化',
    imagePrompt: '古寺僧院，宁静祥和，香火缭绕，佛教文化',
    icon: '⛩️',
    tags: ['古代', '宗教', '宁静'],
  },
];

export const SCENE_CATEGORIES = [
  { value: 'indoor', label: '室内', icon: '🏠' },
  { value: 'outdoor', label: '室外', icon: '🌳' },
  { value: 'fantasy', label: '奇幻', icon: '✨' },
  { value: 'sci-fi', label: '科幻', icon: '🚀' },
  { value: 'period', label: '古代', icon: '🏛️' },
];

/**
 * 根据分类获取场景模板
 */
export function getSceneTemplatesByCategory(category: string): SceneTemplate[] {
  return SCENE_TEMPLATES.filter(t => t.category === category);
}

/**
 * 根据ID获取场景模板
 */
export function getSceneTemplateById(id: string): SceneTemplate | undefined {
  return SCENE_TEMPLATES.find(t => t.id === id);
}

/**
 * 搜索场景模板
 */
export function searchSceneTemplates(keyword: string): SceneTemplate[] {
  const lowerKeyword = keyword.toLowerCase();
  return SCENE_TEMPLATES.filter(t =>
    t.name.toLowerCase().includes(lowerKeyword) ||
    t.description.toLowerCase().includes(lowerKeyword) ||
    t.tags.some(tag => tag.toLowerCase().includes(lowerKeyword))
  );
}
