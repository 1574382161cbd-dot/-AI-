'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Spinner } from '@/components/ui/spinner';
import { Progress } from '@/components/ui/progress';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useAlert } from '@/lib/alert-context';

interface ProgressStep {
  step: string;
  message: string;
  progress: number;
}

export default function AutoGeneratePage() {
  const router = useRouter();
  const [formData, setFormData] = useState({
    title: '',
    type: '',
    description: '',
    storyContent: '',
  });
  const [generating, setGenerating] = useState(false);
  const [progress, setProgress] = useState<ProgressStep | null>(null);
  const { showError, showWarning } = useAlert();

  const handleAutoGenerate = async () => {
    if (!formData.title || !formData.type || !formData.storyContent) {
      showWarning('请填写所有必填项', '提示');
      return;
    }

    setGenerating(true);
    setProgress(null);

    try {
      const response = await fetch('/api/auto-generate', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(formData),
      });

      if (!response.ok) {
        throw new Error('生成请求失败');
      }

      const reader = response.body?.getReader();
      const decoder = new TextDecoder();

      if (reader) {
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;

          const text = decoder.decode(value);
          const lines = text.split('\n');

          for (const line of lines) {
            if (line.startsWith('data: ')) {
              const data = JSON.parse(line.slice(6));
              
              if (data.step) {
                setProgress({
                  step: data.step,
                  message: data.message,
                  progress: data.progress,
                });
              }
              
              if (data.completed) {
                if (data.success && data.scriptId) {
                  // 生成成功，跳转到剧本详情页
                  setTimeout(() => {
                    router.push(`/scripts/${data.scriptId}?tab=storyboards`);
                  }, 1000);
                } else if (data.success === false) {
                  // 生成失败
                  showError('生成失败，请重试', '错误');
                  setGenerating(false);
                  setProgress(null);
                }
              }
            }
          }
        }
      }
    } catch (error) {
      console.error('Error auto generating:', error);
      showError('生成失败，请重试', '错误');
      setGenerating(false);
      setProgress(null);
    }
  };

  const getStepLabel = (step: string) => {
    const stepMap: Record<string, string> = {
      'script': '创建剧本',
      'characters': '生成角色',
      'images': '生成分镜图片',
      'videos': '生成视频',
      'complete': '完成',
    };
    return stepMap[step] || step;
  };

  const getStepColor = (step: string) => {
    const colorMap: Record<string, string> = {
      'script': 'bg-blue-500',
      'characters': 'bg-purple-500',
      'images': 'bg-green-500',
      'videos': 'bg-orange-500',
      'complete': 'bg-emerald-500',
    };
    return colorMap[step] || 'bg-gray-500';
  };

  return (
    <div className="max-w-3xl mx-auto">
      <div className="mb-6">
        <h1 className="text-3xl font-bold text-gray-900">🚀 一键生成漫剧</h1>
        <p className="text-gray-600 mt-2">
          输入剧本信息，AI 将自动完成角色创建、分镜生成、视频制作的全流程
        </p>
      </div>

      {/* 剧本信息表单 */}
      <Card className={generating ? 'opacity-50 pointer-events-none' : ''}>
        <CardHeader>
          <CardTitle>剧本信息</CardTitle>
          <CardDescription>填写剧本的基本信息</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={(e) => { e.preventDefault(); handleAutoGenerate(); }} className="space-y-6">
            <div className="grid md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="title">剧本标题 *</Label>
                <Input
                  id="title"
                  placeholder="例如：奇幻冒险之旅"
                  value={formData.title}
                  onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                  disabled={generating}
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="type">剧本类型 *</Label>
                <Select
                  value={formData.type}
                  onValueChange={(value) => setFormData({ ...formData, type: value })}
                  disabled={generating}
                  required
                >
                  <SelectTrigger>
                    <SelectValue placeholder="选择剧本类型" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="剧情演绎">剧情演绎</SelectItem>
                    <SelectItem value="旁白解说">旁白解说</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="description">剧本描述</Label>
              <Textarea
                id="description"
                placeholder="简要描述剧本的主题和风格"
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                rows={3}
                disabled={generating}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="storyContent">故事内容 *</Label>
              <Textarea
                id="storyContent"
                placeholder="详细的故事内容，AI 将基于此生成角色、分镜和视频..."
                value={formData.storyContent}
                onChange={(e) => setFormData({ ...formData, storyContent: e.target.value })}
                rows={10}
                disabled={generating}
                required
              />
              <p className="text-sm text-gray-500">
                💡 提示：故事内容越详细，AI 生成的角色、分镜和视频越精准
              </p>
            </div>

            <Button
              type="submit"
              disabled={generating}
              className="w-full bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700"
              size="lg"
            >
              {generating ? (
                <>
                  <Spinner className="mr-2 h-5 w-5" />
                  生成中...
                </>
              ) : (
                '🚀 一键生成漫剧'
              )}
            </Button>
          </form>
        </CardContent>
      </Card>

      {/* 生成进度 */}
      {generating && progress && (
        <Card className="mt-6 border-blue-200 bg-blue-50">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Spinner className="h-5 w-5" />
              生成进度
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* 进度条 */}
            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span className="font-medium">{getStepLabel(progress.step)}</span>
                <span className="text-gray-600">{progress.progress}%</span>
              </div>
              <Progress value={progress.progress} className="h-2" />
            </div>

            {/* 当前任务 */}
            <div className="p-4 bg-white rounded-lg border border-blue-200">
              <p className="text-sm text-gray-700">{progress.message}</p>
            </div>

            {/* 步骤说明 */}
            <div className="grid grid-cols-5 gap-2 text-xs">
              {['script', 'characters', 'images', 'videos', 'complete'].map((step) => (
                <div
                  key={step}
                  className={`text-center p-2 rounded ${
                    progress.step === step
                      ? `${getStepColor(step)} text-white`
                      : 'bg-gray-100 text-gray-400'
                  }`}
                >
                  {getStepLabel(step)}
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* 使用说明 */}
      {!generating && (
        <Card className="mt-6 bg-gradient-to-r from-purple-50 to-pink-50 border-purple-200">
          <CardContent className="pt-6">
            <h3 className="font-semibold text-purple-900 mb-3">📝 自动化流程说明</h3>
            <div className="space-y-2 text-sm text-purple-800">
              <div className="flex items-start gap-2">
                <span className="font-bold min-w-[20px]">1.</span>
                <span>AI 分析剧本内容，识别并创建主要角色</span>
              </div>
              <div className="flex items-start gap-2">
                <span className="font-bold min-w-[20px]">2.</span>
                <span>AI 将故事拆解为关键分镜场景</span>
              </div>
              <div className="flex items-start gap-2">
                <span className="font-bold min-w-[20px]">3.</span>
                <span>AI 为每个分镜生成高质量图片</span>
              </div>
              <div className="flex items-start gap-2">
                <span className="font-bold min-w-[20px]">4.</span>
                <span>AI 将分镜转换为视频并添加旁白</span>
              </div>
              <div className="flex items-start gap-2">
                <span className="font-bold min-w-[20px]">5.</span>
                <span>完成！跳转到剧本详情页查看结果</span>
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
