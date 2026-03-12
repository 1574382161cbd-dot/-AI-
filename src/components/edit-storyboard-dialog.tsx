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
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Slider } from '@/components/ui/slider';
import { Badge } from '@/components/ui/badge';
import { useAlert } from '@/lib/alert-context';

interface Storyboard {
  id: string;
  sequence: number;
  description: string;
  prompt: string | null;
  imageUrl: string | null;
  videoUrl: string | null;
  duration: number | null;
  transitionType: string | null;
  isGenerated: boolean;
  characterIds: string | null;
  sceneId: string | null;
}

interface Character {
  id: string;
  name: string;
  avatarUrl: string | null;
}

interface Scene {
  id: string;
  name: string;
  referenceImageUrl: string | null;
}

interface EditStoryboardDialogProps {
  storyboard: Storyboard | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSave: (id: string, data: Partial<Storyboard>) => Promise<void>;
  characters: Character[];
  scenes: Scene[];
}

export function EditStoryboardDialog({
  storyboard,
  open,
  onOpenChange,
  onSave,
  characters,
  scenes,
}: EditStoryboardDialogProps) {
  const [description, setDescription] = useState('');
  const [prompt, setPrompt] = useState('');
  const [duration, setDuration] = useState(5);
  const [transitionType, setTransitionType] = useState('cut');
  const [characterIds, setCharacterIds] = useState<string[]>([]);
  const [sceneId, setSceneId] = useState<string>('');
  const [isSaving, setIsSaving] = useState(false);
  const { showError } = useAlert();

  // 当分镜数据变化时，更新表单
  useEffect(() => {
    if (storyboard) {
      setDescription(storyboard.description);
      setPrompt(storyboard.prompt || '');
      setDuration(storyboard.duration || 5);
      setTransitionType(storyboard.transitionType || 'cut');
      
      // 解析 characterIds
      let parsedCharacterIds: string[] = [];
      if (storyboard.characterIds) {
        try {
          if (typeof storyboard.characterIds === 'string') {
            parsedCharacterIds = JSON.parse(storyboard.characterIds);
          } else {
            parsedCharacterIds = storyboard.characterIds;
          }
        } catch (e) {
          console.error('Failed to parse characterIds:', storyboard.characterIds);
        }
      }
      setCharacterIds(parsedCharacterIds);
      
      setSceneId(storyboard.sceneId || 'none');
    }
  }, [storyboard]);

  const handleSave = async () => {
    if (!storyboard) return;

    setIsSaving(true);
    try {
      await onSave(storyboard.id, {
        description,
        prompt,
        duration,
        transitionType,
        characterIds: characterIds.length > 0 ? JSON.stringify(characterIds) : null,
        sceneId: sceneId === 'none' ? null : sceneId,
      });
      onOpenChange(false);
    } catch (error) {
      showError('保存失败，请重试', '错误');
    } finally {
      setIsSaving(false);
    }
  };

  const transitionOptions = [
    { value: 'cut', label: '切换（Cut）' },
    { value: 'fade', label: '淡入淡出（Fade）' },
    { value: 'zoom', label: '缩放（Zoom）' },
  ];

  const durationPresets = [
    { value: 4, label: '4秒 - 快速过渡', desc: '适合简单场景、快速转场' },
    { value: 6, label: '6秒 - 短时长', desc: '适合动作场面、快速对话' },
    { value: 8, label: '8秒 - 标准时长', desc: '适合大多数场景' },
    { value: 10, label: '10秒 - 中长时长', desc: '适合情感场景、详细描写' },
    { value: 12, label: '12秒 - 长时长', desc: '适合复杂场景、氛围营造' },
  ];

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>编辑分镜 #{storyboard?.sequence}</DialogTitle>
          <DialogDescription>
            修改分镜的描述、提示词、时长和转场效果
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6 py-4">
          {/* 分镜图片预览 */}
          {storyboard?.imageUrl && (
            <div className="space-y-2">
              <Label>当前图片</Label>
              <div className="relative aspect-video rounded-lg overflow-hidden bg-black border">
                <img
                  src={storyboard.imageUrl}
                  alt={`分镜 ${storyboard.sequence}`}
                  className="w-full h-full object-contain"
                />
              </div>
            </div>
          )}

          {/* 分镜描述 */}
          <div className="space-y-2">
            <Label htmlFor="description">
              分镜描述 <span className="text-red-500">*</span>
            </Label>
            <Textarea
              id="description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="描述这个分镜的场景内容、角色动作、镜头运动..."
              rows={3}
              className="resize-none"
            />
            <p className="text-xs text-muted-foreground">
              简洁清晰地描述分镜场景，系统将据此生成提示词
            </p>
          </div>

          {/* 提示词 */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label htmlFor="prompt" className="flex items-center gap-2">
                AI 生图提示词
                <Badge variant="outline" className="text-xs">英文</Badge>
              </Label>
              {description && !prompt && (
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => setPrompt(description)}
                  className="text-xs h-6"
                >
                  使用描述作为提示词
                </Button>
              )}
            </div>
            <Textarea
              id="prompt"
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
              placeholder="输入 AI 生图的提示词，如果不填写将使用分镜描述..."
              rows={4}
              className="resize-none font-mono text-sm"
            />
            <div className="space-y-2 mt-2 p-3 bg-blue-50 rounded-lg border border-blue-100">
              <p className="text-xs text-blue-700 font-medium">
                💡 提示词优化建议：
              </p>
              <ul className="text-xs text-blue-600 list-disc list-inside space-y-1">
                <li>场景描述：室内/室外、光线（日光/月光/人工光）、时间</li>
                <li>角色姿态：动作、表情、角度（特写/中景/远景）</li>
                <li>风格设定：动画风格（2D/3D）、色彩、质感</li>
                <li>艺术风格：电影感、插画、油画、水彩</li>
                <li>质量词：高质量、细节丰富、专业渲染</li>
              </ul>
            </div>
          </div>

          {/* 角色选择 - 支持多选 */}
          <div className="space-y-2">
            <Label htmlFor="characters">关联角色（可多选）</Label>
            <div className="space-y-2">
              {characters.map((char) => (
                <div
                  key={char.id}
                  onClick={() => {
                    setCharacterIds(prev =>
                      prev.includes(char.id)
                        ? prev.filter(id => id !== char.id)
                        : [...prev, char.id]
                    );
                  }}
                  className={`flex items-center gap-3 p-2 rounded-lg border cursor-pointer transition-colors ${
                    characterIds.includes(char.id)
                      ? 'bg-blue-50 border-blue-300'
                      : 'bg-gray-50 border-gray-200 hover:bg-gray-100'
                  }`}
                >
                  <div className={`w-5 h-5 rounded border flex items-center justify-center ${
                    characterIds.includes(char.id)
                      ? 'bg-blue-500 border-blue-500'
                      : 'bg-white border-gray-300'
                  }`}>
                    {characterIds.includes(char.id) && (
                      <svg className="w-3 h-3 text-white" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                      </svg>
                    )}
                  </div>
                  {char.avatarUrl && (
                    <img
                      src={char.avatarUrl}
                      alt={char.name}
                      className="w-8 h-8 rounded-full object-cover"
                    />
                  )}
                  <span className="font-medium text-sm">{char.name}</span>
                </div>
              ))}
            </div>
            <p className="text-xs text-muted-foreground">
              选择角色后，生成图片和视频时会参考角色形象，确保角色外观一致（可选择多个角色）
            </p>
          </div>

          {/* 场景选择 */}
          <div className="space-y-2">
            <Label htmlFor="scene">关联场景</Label>
            <Select value={sceneId} onValueChange={setSceneId}>
              <SelectTrigger id="scene">
                <SelectValue placeholder="选择场景（可选）" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="none">无场景</SelectItem>
                {scenes.map((scene) => (
                  <SelectItem key={scene.id} value={scene.id}>
                    <div className="flex items-center gap-2">
                      {scene.referenceImageUrl && (
                        <img
                          src={scene.referenceImageUrl}
                          alt={scene.name}
                          className="w-5 h-5 rounded object-cover"
                        />
                      )}
                      {scene.name}
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <p className="text-xs text-muted-foreground">
              选择场景后，生成图片时会参考场景风格，确保全剧场景风格一致
            </p>
          </div>

          {/* 时长设置 */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <Label htmlFor="duration">分镜时长: {duration} 秒</Label>
              <Badge variant="secondary">支持范围: 4-12秒</Badge>
            </div>
            
            <Slider
              id="duration"
              min={4}
              max={12}
              step={1}
              value={[duration]}
              onValueChange={(value) => setDuration(value[0])}
              className="w-full"
            />
            
            <div className="grid grid-cols-5 gap-2 mt-2">
              {durationPresets.map((preset) => (
                <button
                  key={preset.value}
                  type="button"
                  onClick={() => setDuration(preset.value)}
                  className={`p-2 text-xs rounded-md border transition-colors ${
                    duration === preset.value
                      ? 'bg-blue-50 border-blue-300 text-blue-700 font-medium'
                      : 'bg-gray-50 border-gray-200 text-gray-600 hover:bg-gray-100'
                  }`}
                >
                  <div className="font-medium">{preset.label}</div>
                  <div className="text-[10px] mt-0.5 opacity-80">{preset.desc}</div>
                </button>
              ))}
            </div>
            
            <p className="text-xs text-muted-foreground">
              根据场景复杂度和叙事节奏选择合适时长，时长越长生成时间越久
            </p>
          </div>

          {/* 转场类型 */}
          <div className="space-y-2">
            <Label htmlFor="transition">转场效果</Label>
            <Select value={transitionType} onValueChange={setTransitionType}>
              <SelectTrigger id="transition">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {transitionOptions.map((option) => (
                  <SelectItem key={option.value} value={option.value}>
                    {option.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <div className="grid grid-cols-3 gap-2 mt-2">
              {transitionOptions.map((option) => (
                <div
                  key={option.value}
                  onClick={() => setTransitionType(option.value)}
                  className={`p-2 text-xs rounded-md border cursor-pointer transition-colors ${
                    transitionType === option.value
                      ? 'bg-purple-50 border-purple-300 text-purple-700 font-medium'
                      : 'bg-gray-50 border-gray-200 text-gray-600 hover:bg-gray-100'
                  }`}
                >
                  {option.label}
                </div>
              ))}
            </div>
            <p className="text-xs text-muted-foreground">
              选择该分镜到下一个分镜的过渡效果，影响最终视频的观感
            </p>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={isSaving}>
            取消
          </Button>
          <Button onClick={handleSave} disabled={isSaving || !description.trim()}>
            {isSaving ? '保存中...' : '保存修改'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
