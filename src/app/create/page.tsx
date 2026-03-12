'use client';

import { useState } from 'react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
import { AlertCircle, Loader2, Sparkles } from 'lucide-react';
import { useRouter } from 'next/navigation';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

interface GenerateProgress {
  status: string;
  step: string;
  steps?: Array<{
    name: string;
    status: 'pending' | 'in_progress' | 'completed';
    current?: number;
    total?: number;
    result?: any;
  }>;
  script?: any;
  characters?: any[];
  storyboards?: any[];
  videos?: any[];
}

export default function AutoGeneratePage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [progress, setProgress] = useState<GenerateProgress | null>(null);
  const [scriptType, setScriptType] = useState<string>('剧情演绎');

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setProgress(null);

    const formData = new FormData(e.currentTarget);
    const title = formData.get('title') as string;
    const description = formData.get('description') as string;
    const charactersInput = formData.get('characters') as string;
    const scenesInput = formData.get('scenes') as string;

    // 解析角色描述
    let characterDescriptions: Array<{name: string; appearance: string}> = [];
    if (charactersInput && charactersInput.trim()) {
      characterDescriptions = charactersInput.split('\n')
        .map(line => line.trim())
        .filter(line => line.includes('：') || line.includes(':'))
        .map(line => {
          const separator = line.includes('：') ? '：' : ':';
          const [name, appearance] = line.split(separator).map(s => s.trim());
          return { name, appearance };
        });
    }

    // 解析场景描述
    let sceneDescriptions: Array<{name: string; description: string}> = [];
    if (scenesInput && scenesInput.trim()) {
      sceneDescriptions = scenesInput.split('\n')
        .map(line => line.trim())
        .filter(line => line.includes('：') || line.includes(':'))
        .map(line => {
          const separator = line.includes('：') ? '：' : ':';
          const [name, description] = line.split(separator).map(s => s.trim());
          return { name, description };
        });
    }

    try {
      const response = await fetch('/api/auto-generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title,
          type: scriptType,
          description: '',
          storyContent: description,
          characterDescriptions, // 用户提供的角色描述
          sceneDescriptions, // 用户提供的场景描述
        }),
      });

      if (!response.ok) {
        throw new Error('生成失败');
      }

      const reader = response.body?.getReader();
      const decoder = new TextDecoder();

      if (reader) {
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;

          const text = decoder.decode(value);
          const lines = text.split('\n').filter(line => line.trim());

          for (const line of lines) {
            if (line.startsWith('data: ')) {
              const data = JSON.parse(line.slice(6));
              if (data.error) {
                setError(data.error);
                setLoading(false);
                return;
              }

              // 检查是否完成
              if (data.completed && data.success && data.scriptId) {
                setLoading(false);
                router.push(`/scripts/${data.scriptId}`);
                return;
              }

              // 更新进度
              setProgress({
                status: 'generating',
                step: data.message || data.step,
                steps: data.steps,
                script: data.script,
                characters: data.characters,
                storyboards: data.storyboards,
                videos: data.videos,
              });
            }
          }
        }
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : '生成失败');
      setLoading(false);
    }
  };

  return (
    <div className="max-w-2xl mx-auto py-12">
      <div className="mb-8">
        <h1 className="text-4xl font-bold text-gray-900 mb-2">
          <Sparkles className="inline-block w-10 h-10 mr-2 text-purple-600" />
          一键生成漫剧
        </h1>
        <p className="text-gray-600">输入您的创意，AI将自动生成完整的漫剧</p>
      </div>

      {!loading && !progress && (
        <Card>
          <CardHeader>
            <CardTitle>输入创意</CardTitle>
            <CardDescription>简单描述您的故事想法，AI将自动生成剧本、角色、分镜和视频</CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label htmlFor="title" className="block text-sm font-medium mb-2">
                  漫剧标题
                </label>
                <Input
                  id="title"
                  name="title"
                  placeholder="例如：星际旅行"
                  required
                />
              </div>

              <div>
                <label htmlFor="type" className="block text-sm font-medium mb-2">
                  剧本类型
                </label>
                <Select value={scriptType} onValueChange={setScriptType}>
                  <SelectTrigger>
                    <SelectValue placeholder="选择剧本类型" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="剧情演绎">剧情演绎 - 角色对话和互动</SelectItem>
                    <SelectItem value="旁白解说">旁白解说 - 画面描述和讲解</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div>
                <label htmlFor="description" className="block text-sm font-medium mb-2">
                  故事创意
                </label>
                <Textarea
                  id="description"
                  name="description"
                  placeholder="例如：一个年轻的宇航员在太空中遇到了神秘的外星人，他们一起探索未知的星系..."
                  rows={4}
                  required
                />
              </div>

              <div>
                <label htmlFor="characters" className="block text-sm font-medium mb-2">
                  角色形象描述 <span className="text-gray-400">(可选，AI将据此生成角色形象)</span>
                </label>
                <Textarea
                  id="characters"
                  name="characters"
                  placeholder="例如：&#10;小明：年轻男子，黑色短发，穿着白色宇航服，眼神坚毅&#10;外星人：身高2米，皮肤是淡蓝色，有三只眼睛，友善的表情"
                  rows={4}
                />
                <p className="text-xs text-gray-500 mt-1">每行一个角色，格式：角色名：形象描述</p>
              </div>

              <div>
                <label htmlFor="scenes" className="block text-sm font-medium mb-2">
                  场景描述 <span className="text-gray-400">(可选，AI将据此生成纯场景背景图)</span>
                </label>
                <Textarea
                  id="scenes"
                  name="scenes"
                  placeholder="例如：&#10;太空站内部：高科技感的太空站走廊，金属墙壁，闪烁的指示灯，舷窗外是星空&#10;外星星球：紫色的天空，奇异的植物，发光的矿石"
                  rows={4}
                />
                <p className="text-xs text-gray-500 mt-1">每行一个场景，格式：场景名：环境描述（场景图不包含人物）</p>
              </div>

              <Button type="submit" className="w-full" size="lg">
                <Sparkles className="mr-2 h-5 w-5" />
                开始生成
              </Button>
            </form>
          </CardContent>
        </Card>
      )}

      {loading && progress && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Loader2 className="h-6 w-6 animate-spin" />
              正在生成中...
            </CardTitle>
            <CardDescription>AI正在为您创作漫剧，请稍候</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* 当前步骤 */}
            <div className="space-y-2">
              <div className="text-sm font-medium">当前步骤</div>
              <div className="text-lg">{progress.step}</div>
            </div>

            {/* 详细步骤列表 */}
            {progress.steps && progress.steps.length > 0 && (
              <div className="space-y-3">
                <div className="text-sm font-medium text-gray-700">生成进度</div>
                {progress.steps.map((step, index) => (
                  <div
                    key={index}
                    className={`p-3 rounded-lg border ${
                      step.status === 'completed'
                        ? 'bg-green-50 border-green-200'
                        : step.status === 'in_progress'
                        ? 'bg-blue-50 border-blue-200'
                        : 'bg-gray-50 border-gray-200'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        {step.status === 'completed' ? (
                          <span className="text-green-600">✓</span>
                        ) : step.status === 'in_progress' ? (
                          <Loader2 className="h-4 w-4 text-blue-600 animate-spin" />
                        ) : (
                          <span className="text-gray-400">{index + 1}</span>
                        )}
                        <span className="text-sm font-medium">{step.name}</span>
                      </div>
                      {step.current !== undefined && step.total && (
                        <span className="text-xs text-gray-600">
                          {step.current}/{step.total}
                        </span>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* 已生成内容预览 */}
            {progress.script && (
              <div className="bg-blue-50 p-4 rounded-lg border border-blue-200">
                <div className="text-sm font-medium text-blue-900 mb-1">✓ 剧本已生成</div>
                <div className="text-sm text-blue-700">{progress.script.title}</div>
              </div>
            )}

            {progress.characters && progress.characters.length > 0 && (
              <div className="bg-green-50 p-4 rounded-lg border border-green-200">
                <div className="text-sm font-medium text-green-900 mb-1">
                  ✓ 角色已生成 ({progress.characters.length} 个)
                </div>
                <div className="text-sm text-green-700">
                  {progress.characters.map((c: any) => c.name).join(', ')}
                </div>
              </div>
            )}

            {progress.storyboards && progress.storyboards.length > 0 && (
              <div className="bg-purple-50 p-4 rounded-lg border border-purple-200">
                <div className="text-sm font-medium text-purple-900 mb-1">
                  ✓ 分镜已生成 ({progress.storyboards.length} 个)
                </div>
                {progress.storyboards.slice(0, 3).map((sb: any, idx: number) => (
                  <div key={idx} className="text-xs text-purple-700 mt-1">
                    {sb.sequence}. {sb.description.slice(0, 50)}...
                  </div>
                ))}
              </div>
            )}

            {progress.videos && progress.videos.length > 0 && (
              <div className="bg-orange-50 p-4 rounded-lg border border-orange-200">
                <div className="text-sm font-medium text-orange-900 mb-1">
                  ✓ 视频已生成 ({progress.videos.length} 个)
                </div>
              </div>
            )}

            <div className="text-sm text-gray-500 mt-4">
              生成完成后将自动跳转到剧本详情页
            </div>
          </CardContent>
        </Card>
      )}

      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4 mt-4">
          <div className="flex items-start gap-3">
            <AlertCircle className="h-5 w-5 text-red-600 mt-0.5" />
            <div className="flex-1">
              <div className="font-medium text-red-900">生成失败</div>
              <div className="text-sm text-red-700 mt-1">{error}</div>
            </div>
          </div>
        </div>
      )}

      <div className="mt-8 text-center">
        <Link href="/scripts">
          <Button variant="ghost">
            返回剧本列表
          </Button>
        </Link>
      </div>
    </div>
  );
}
