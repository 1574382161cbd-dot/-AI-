/**
 * 分镜转场选项配置
 */
export interface TransitionOption {
  value: 'cut' | 'fade' | 'zoom';
  label: string;
  description: string;
  icon?: string;
}

export const TRANSITION_OPTIONS: TransitionOption[] = [
  {
    value: 'cut',
    label: '切镜',
    description: '直接切换，无过渡效果',
    icon: '🔪',
  },
  {
    value: 'fade',
    label: '淡入淡出',
    description: '缓慢渐变过渡',
    icon: '🌫️',
  },
  {
    value: 'zoom',
    label: '缩放',
    description: '通过缩放效果过渡',
    icon: '🔍',
  },
];

/**
 * 根据值获取转场选项
 */
export function getTransitionOption(value: string): TransitionOption | undefined {
  return TRANSITION_OPTIONS.find(opt => opt.value === value);
}

/**
 * 获取转场类型的中文名称
 */
export function getTransitionLabel(value: string): string {
  const option = getTransitionOption(value);
  return option ? option.label : value;
}
