import { useEffect, useCallback } from 'react';

export interface ShortcutConfig {
  key: string;
  ctrlKey?: boolean;
  shiftKey?: boolean;
  altKey?: boolean;
  handler: (event: KeyboardEvent) => void;
  description: string;
}

/**
 * 快捷键 Hook
 * @param shortcuts 快捷键配置数组
 */
export function useShortcuts(shortcuts: ShortcutConfig[]) {
  const handleKeyDown = useCallback((event: KeyboardEvent) => {
    // 如果用户正在输入框中输入，不触发快捷键
    const target = event.target as HTMLElement;
    if (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.isContentEditable) {
      return;
    }

    for (const shortcut of shortcuts) {
      const {
        key,
        ctrlKey = false,
        shiftKey = false,
        altKey = false,
        handler,
      } = shortcut;

      // 检查是否匹配快捷键
      const keyMatch = event.key.toLowerCase() === key.toLowerCase();
      const ctrlMatch = event.ctrlKey === ctrlKey;
      const shiftMatch = event.shiftKey === shiftKey;
      const altMatch = event.altKey === altKey;

      if (keyMatch && ctrlMatch && shiftMatch && altMatch) {
        event.preventDefault();
        handler(event);
        break;
      }
    }
  }, [shortcuts]);

  useEffect(() => {
    window.addEventListener('keydown', handleKeyDown);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [handleKeyDown]);
}

/**
 * 预定义的常用快捷键配置
 */
export const COMMON_SHORTCUTS = {
  // 保存
  SAVE: {
    key: 's',
    ctrlKey: true,
    description: '保存',
  },
  // 撤销
  UNDO: {
    key: 'z',
    ctrlKey: true,
    description: '撤销',
  },
  // 重做
  REDO: {
    key: 'y',
    ctrlKey: true,
    description: '重做',
  },
  // 删除
  DELETE: {
    key: 'delete',
    description: '删除',
  },
  // 刷新
  REFRESH: {
    key: 'r',
    ctrlKey: true,
    description: '刷新',
  },
  // 全选
  SELECT_ALL: {
    key: 'a',
    ctrlKey: true,
    description: '全选',
  },
  // 复制
  COPY: {
    key: 'c',
    ctrlKey: true,
    description: '复制',
  },
  // 粘贴
  PASTE: {
    key: 'v',
    ctrlKey: true,
    description: '粘贴',
  },
  // 新建
  NEW: {
    key: 'n',
    ctrlKey: true,
    description: '新建',
  },
  // 搜索
  SEARCH: {
    key: 'f',
    ctrlKey: true,
    description: '搜索',
  },
  // 返回
  BACK: {
    key: 'ArrowLeft',
    altKey: true,
    description: '返回',
  },
  // 前进
  FORWARD: {
    key: 'ArrowRight',
    altKey: true,
    description: '前进',
  },
};

/**
 * 格式化快捷键显示文本
 */
export function formatShortcutKey(shortcut: Omit<ShortcutConfig, 'handler'>): string {
  const parts: string[] = [];
  
  if (shortcut.ctrlKey) parts.push('Ctrl');
  if (shortcut.altKey) parts.push('Alt');
  if (shortcut.shiftKey) parts.push('Shift');
  parts.push(shortcut.key.toUpperCase());
  
  return parts.join(' + ');
}

/**
 * 快捷键帮助组件配置
 */
export function getShortcutHelp(shortcuts: ShortcutConfig[]) {
  return shortcuts
    .filter(s => s.description)
    .map(s => ({
      key: formatShortcutKey(s),
      description: s.description,
    }));
}
