'use client';

import { useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { TRANSITION_OPTIONS } from '@/lib/transitionOptions';
import { useAlert } from '@/lib/alert-context';

export default function CreateStoryboardPage() {
  const params = useParams();
  const router = useRouter();
  const { showError, showSuccess } = useAlert();
  const [loading, setLoading] = useState(false);
  const [description, setDescription] = useState('');
  const [generateImage, setGenerateImage] = useState(true);
  const [duration, setDuration] = useState(5); // 默认 5 秒
  const [transitionType, setTransitionType] = useState<'cut' | 'fade' | 'zoom'>('cut');

  const handleGenerate = async () => {
    if (!description.trim()) {
      showError('请输入分镜描述');
      return;
    }

    setLoading(true);

    try {
      // 获取当前剧本的分镜数量
      const storyboardResponse = await fetch(`/api/storyboards?scriptId=${params.id}`);
      const storyboardResult = await storyboardResponse.json();
      const sequence = storyboardResult.success ? storyboardResult.data.length + 1 : 1;

      const response = await fetch('/api/storyboards', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          scriptId: params.id,
          sequence,
          description,
          prompt: description,
          generateImage,
          duration,
          transitionType, // 添加转场类型
          isGenerated: false,
        }),
      });

      const result = await response.json();

      if (result.success) {
        showSuccess('分镜创建成功');
        router.push(`/scripts/${params.id}?tab=storyboards`);
      } else {
        showError(`生成失败：${result.error || '未知错误'}`);
      }
    } catch (error) {
      console.error('Error creating storyboard:', error);
      showError('生成失败，请重试');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-2xl mx-auto">
      <div className="mb-6">
        <Button variant="ghost" onClick={() => router.back()} className="mb-4">
          ← 返回
        </Button>
        <h1 className="text-3xl font-bold text-gray-900">创建分镜</h1>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>分镜内容</CardTitle>
          <CardDescription>描述这个分镜的画面和动作</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-6">
            <div className="space-y-2">
              <Label htmlFor="description">分镜描述 *</Label>
              <Textarea
                id="description"
                placeholder="例如：主角站在山顶，俯瞰下方的小镇，夕阳西下，风吹过头发..."
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                rows={6}
              />
              <p className="text-sm text-gray-500">
                描述要尽量详细，这将用于生成分镜图片
              </p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="duration">分镜时长: {duration} 秒</Label>
              <input
                id="duration"
                type="range"
                min="4"
                max="12"
                step="1"
                value={duration}
                onChange={(e) => setDuration(Number(e.target.value))}
                className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer"
              />
              <div className="flex justify-between text-xs text-gray-500">
                <span>4秒（快速）</span>
                <span>8秒（标准）</span>
                <span>12秒（详细）</span>
              </div>
              <p className="text-xs text-gray-500 mt-1">
                💡 时长范围：4-12 秒（匹配 AI 视频生成模型支持范围）
              </p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="transition">转场类型</Label>
              <Select value={transitionType} onValueChange={(value) => setTransitionType(value as 'cut' | 'fade' | 'zoom')}>
                <SelectTrigger id="transition">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {TRANSITION_OPTIONS.map((option) => (
                    <SelectItem key={option.value} value={option.value}>
                      <div className="flex items-center gap-2">
                        <span>{option.icon}</span>
                        <div>
                          <div className="font-medium">{option.label}</div>
                          <div className="text-xs text-gray-500">{option.description}</div>
                        </div>
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="flex items-center space-x-2">
              <input
                type="checkbox"
                id="generateImage"
                checked={generateImage}
                onChange={(e) => setGenerateImage(e.target.checked)}
                className="rounded border-gray-300"
              />
              <Label htmlFor="generateImage" className="cursor-pointer">
                AI 自动生成分镜图片
              </Label>
            </div>

            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
              <h4 className="font-semibold text-blue-900 mb-2">💡 提示</h4>
              <ul className="text-sm text-blue-800 space-y-1 list-disc list-inside">
                <li>描述画面内容、角色动作、镜头运动</li>
                <li>可以描述光线、颜色、氛围</li>
                <li>启用 AI 生图会自动创建分镜图片</li>
              </ul>
            </div>

            <div className="flex gap-3 pt-4">
              <Button
                onClick={handleGenerate}
                disabled={loading}
                className="flex-1"
              >
                {loading ? '生成中...' : '生成分镜'}
              </Button>
              <Button
                variant="outline"
                onClick={() => router.back()}
                disabled={loading}
              >
                取消
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
