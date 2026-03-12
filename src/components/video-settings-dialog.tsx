'use client';

import { useState, useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

export interface VideoSettings {
  resolution: '480p' | '720p';
  duration: number;
  model: 'seedance-1.5';
}

interface VideoSettingsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  settings: VideoSettings;
  onSettingsChange: (settings: VideoSettings) => void;
}

// 可用的视频生成模型
const VIDEO_MODELS = [
  {
    id: 'seedance-1.5' as const,
    name: 'Seedance 1.5 Pro',
    description: '专业视频生成模型，支持音画同步',
  },
];

export function VideoSettingsDialog({
  open,
  onOpenChange,
  settings,
  onSettingsChange,
}: VideoSettingsDialogProps) {
  const [localSettings, setLocalSettings] = useState<VideoSettings>(settings);

  useEffect(() => {
    setLocalSettings(settings);
  }, [settings, open]);

  const handleSave = () => {
    onSettingsChange(localSettings);
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>视频生成设置</DialogTitle>
          <DialogDescription>
            配置视频生成的参数设置
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6 py-4">
          {/* 模型选择 */}
          <div className="space-y-3">
            <Label htmlFor="model">生成模型</Label>
            <Select
              value={localSettings.model}
              onValueChange={(value: 'seedance-1.5') =>
                setLocalSettings(prev => ({ ...prev, model: value }))
              }
            >
              <SelectTrigger id="model">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {VIDEO_MODELS.map((model) => (
                  <SelectItem key={model.id} value={model.id}>
                    <div className="flex flex-col gap-1">
                      <span className="font-medium">{model.name}</span>
                      <span className="text-xs text-muted-foreground">{model.description}</span>
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <p className="text-xs text-muted-foreground">
              Seedance 1.5 Pro 支持音画同步，自动生成背景音效和语音
            </p>
          </div>

          {/* 分辨率选择 */}
          <div className="space-y-3">
            <Label htmlFor="resolution">视频分辨率</Label>
            <Select
              value={localSettings.resolution}
              onValueChange={(value: '480p' | '720p') =>
                setLocalSettings(prev => ({ ...prev, resolution: value }))
              }
            >
              <SelectTrigger id="resolution">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="480p">
                  <div className="flex items-center gap-2">
                    <span>480p</span>
                    <span className="text-xs text-muted-foreground">(854×480, 标清)</span>
                  </div>
                </SelectItem>
                <SelectItem value="720p">
                  <div className="flex items-center gap-2">
                    <span>720p</span>
                    <span className="text-xs text-muted-foreground">(1280×720, 高清)</span>
                  </div>
                </SelectItem>
              </SelectContent>
            </Select>
            <p className="text-xs text-muted-foreground">
              720p 提供更清晰的画质，480p 生成速度更快
            </p>
          </div>

          {/* 时长选择 */}
          <div className="space-y-3">
            <Label htmlFor="duration">视频时长</Label>
            <Select
              value={localSettings.duration.toString()}
              onValueChange={(value) =>
                setLocalSettings(prev => ({ ...prev, duration: parseInt(value) }))
              }
            >
              <SelectTrigger id="duration">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {[4, 5, 6, 7, 8, 9, 10, 11, 12].map((seconds) => (
                  <SelectItem key={seconds} value={seconds.toString()}>
                    {seconds} 秒
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <p className="text-xs text-muted-foreground">
              支持 4-12 秒的视频时长，更长的时间可展示更多内容
            </p>
          </div>

          {/* 提示信息 */}
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
            <p className="text-sm text-blue-800 font-medium mb-2">
              ⚡ 生成提示
            </p>
            <ul className="text-xs text-blue-700 space-y-1 list-disc list-inside">
              <li>视频生成通常需要 30-180 秒</li>
              <li>同一时间只能生成一个视频，避免触发频率限制</li>
              <li>如遇到生成失败，系统会自动重试最多 3 次</li>
            </ul>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            取消
          </Button>
          <Button onClick={handleSave}>
            保存设置
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// 默认设置
export const DEFAULT_VIDEO_SETTINGS: VideoSettings = {
  resolution: '720p',
  duration: 5,
  model: 'seedance-1.5',
};
