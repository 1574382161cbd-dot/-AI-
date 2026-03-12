import { useEffect, useRef } from 'react';

interface DraftData<T> {
  scriptId?: string;
  data: T;
  timestamp: number;
}

/**
 * 自动保存草稿的 Hook
 * @param data 要保存的数据
 * @param scriptId 剧本ID（用于区分不同剧本的草稿）
 * @param interval 保存间隔（毫秒），默认30000（30秒）
 */
export function useAutoDraft<T extends Record<string, any>>(
  data: T,
  scriptId?: string,
  interval: number = 30000
) {
  const draftKey = scriptId ? `draft-script-${scriptId}` : 'draft-new-script';
  const saveTimerRef = useRef<NodeJS.Timeout | null>(null);

  // 保存草稿到 localStorage
  const saveDraft = () => {
    try {
      const draftData: DraftData<T> = {
        scriptId,
        data,
        timestamp: Date.now(),
      };
      localStorage.setItem(draftKey, JSON.stringify(draftData));
      console.log('草稿已保存:', new Date().toLocaleTimeString());
    } catch (error) {
      console.error('保存草稿失败:', error);
    }
  };

  // 从 localStorage 恢复草稿
  const loadDraft = (): T | null => {
    try {
      const saved = localStorage.getItem(draftKey);
      if (!saved) return null;

      const draftData: DraftData<T> = JSON.parse(saved);
      
      // 检查草稿是否过期（24小时）
      const isExpired = Date.now() - draftData.timestamp > 24 * 60 * 60 * 1000;
      if (isExpired) {
        localStorage.removeItem(draftKey);
        return null;
      }

      return draftData.data;
    } catch (error) {
      console.error('加载草稿失败:', error);
      return null;
    }
  };

  // 清除草稿
  const clearDraft = () => {
    try {
      localStorage.removeItem(draftKey);
      console.log('草稿已清除');
    } catch (error) {
      console.error('清除草稿失败:', error);
    }
  };

  // 检查是否存在草稿
  const hasDraft = (): boolean => {
    try {
      const saved = localStorage.getItem(draftKey);
      if (!saved) return false;

      const draftData: DraftData<T> = JSON.parse(saved);
      const isExpired = Date.now() - draftData.timestamp > 24 * 60 * 60 * 1000;
      return !isExpired;
    } catch (error) {
      return false;
    }
  };

  // 获取草稿时间
  const getDraftTimestamp = (): number | null => {
    try {
      const saved = localStorage.getItem(draftKey);
      if (!saved) return null;

      const draftData: DraftData<T> = JSON.parse(saved);
      return draftData.timestamp;
    } catch (error) {
      return null;
    }
  };

  // 设置定时保存
  useEffect(() => {
    // 定时保存
    saveTimerRef.current = setInterval(saveDraft, interval);

    // 组件卸载时清理定时器
    return () => {
      if (saveTimerRef.current) {
        clearInterval(saveTimerRef.current);
      }
    };
  }, [data, draftKey, interval]);

  // 组件卸载时保存一次
  useEffect(() => {
    return () => {
      saveDraft();
    };
  }, []);

  return {
    saveDraft,
    loadDraft,
    clearDraft,
    hasDraft,
    getDraftTimestamp,
  };
}

/**
 * 格式化草稿时间
 */
export function formatDraftTime(timestamp: number): string {
  const now = Date.now();
  const diff = now - timestamp;

  const minutes = Math.floor(diff / 60000);
  const hours = Math.floor(minutes / 60);
  const days = Math.floor(hours / 24);

  if (days > 0) {
    return `${days}天前`;
  } else if (hours > 0) {
    return `${hours}小时前`;
  } else if (minutes > 0) {
    return `${minutes}分钟前`;
  } else {
    return '刚刚';
  }
}
