'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Spinner } from '@/components/ui/spinner';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { EditStoryboardDialog } from '@/components/edit-storyboard-dialog';
import { useAlert } from '@/lib/alert-context';

interface Script {
  id: string;
  title: string;
  type: string;
  description: string | null;
  storyContent: string | null;
}

interface Character {
  id: string;
  name: string;
  description: string | null;
  appearance: string | null;
  personality: string | null;
  avatarUrl: string | null;
}

interface Scene {
  id: string;
  name: string;
  referenceImageUrl: string | null;
}

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

type Step = 'script' | 'characters' | 'storyboards' | 'images' | 'videos' | 'complete';

export default function WorkflowPage() {
  const params = useParams();
  const router = useRouter();
  const [step, setStep] = useState<Step>('script');
  const [loading, setLoading] = useState(false);

  // 剧本数据
  const [script, setScript] = useState<Script | null>(null);
  const [scriptForm, setScriptForm] = useState({
    title: '',
    type: '',
    description: '',
    storyContent: '',
  });

  // 角色数据
  const [characters, setCharacters] = useState<Character[]>([]);
  const [newCharacter, setNewCharacter] = useState({
    name: '',
    description: '',
    appearance: '',
    personality: '',
  });
  const [generatingCharacter, setGeneratingCharacter] = useState(false);
  const { showError } = useAlert();

  // 场景数据
  const [scenes, setScenes] = useState<any[]>([]);

  // 分镜数据
  const [storyboards, setStoryboards] = useState<Storyboard[]>([]);
  const [newStoryboard, setNewStoryboard] = useState({
    description: '',
    prompt: '',
    characterIds: [] as string[],
  });
  const [editingStoryboard, setEditingStoryboard] = useState<Storyboard | null>(null);
  const [editDialogOpen, setEditDialogOpen] = useState(false);

  useEffect(() => {
    if (params.id) {
      fetchScript();
      fetchCharacters();
      fetchScenes();
      fetchStoryboards();
    }
  }, [params.id]);

  const fetchScript = async () => {
    const response = await fetch(`/api/scripts/${params.id}`);
    const result = await response.json();
    if (result.success) {
      setScript(result.data);
      setScriptForm({
        title: result.data.title,
        type: result.data.type,
        description: result.data.description || '',
        storyContent: result.data.storyContent || '',
      });
    }
  };

  const fetchCharacters = async () => {
    const response = await fetch(`/api/characters?scriptId=${params.id}`);
    const result = await response.json();
    if (result.success) {
      setCharacters(result.data);
    }
  };

  const fetchScenes = async () => {
    const response = await fetch(`/api/scenes?scriptId=${params.id}`);
    const result = await response.json();
    if (result.success) {
      setScenes(result.data);
    }
  };

  const fetchStoryboards = async () => {
    const response = await fetch(`/api/storyboards?scriptId=${params.id}`);
    const result = await response.json();
    if (result.success) {
      setStoryboards(result.data);
    }
  };

  // 步骤 1: 创建/编辑剧本
  const handleSaveScript = async () => {
    setLoading(true);
    try {
      const response = await fetch(`/api/scripts/${params.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(scriptForm),
      });
      const result = await response.json();
      if (result.success) {
        setScript(result.data);
        setStep('characters');
      }
    } catch (error) {
      showError('保存失败，请重试', '错误');
    } finally {
      setLoading(false);
    }
  };

  // 步骤 2: 生成角色
  const handleGenerateCharacter = async () => {
    if (!newCharacter.name.trim()) return;
    
    setGeneratingCharacter(true);
    try {
      const response = await fetch('/api/characters/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          scriptId: params.id,
          characterName: newCharacter.name,
          existingCharacters: characters,
        }),
      });
      const result = await response.json();
      if (result.success) {
        // 解析生成的角色设定
        const lines = result.data.split('\n');
        let description = '';
        let appearance = '';
        let personality = '';
        let currentSection = '';
        
        for (const line of lines) {
          const lowerLine = line.toLowerCase();
          if (lowerLine.includes('描述') || lowerLine.includes('背景')) currentSection = 'description';
          else if (lowerLine.includes('外观')) currentSection = 'appearance';
          else if (lowerLine.includes('性格')) currentSection = 'personality';
          else if (line.trim() && currentSection) {
            if (currentSection === 'description') description += line.trim() + '\n';
            else if (currentSection === 'appearance') appearance += line.trim() + '\n';
            else if (currentSection === 'personality') personality += line.trim() + '\n';
          }
        }
        
        setNewCharacter({
          ...newCharacter,
          description: description.trim(),
          appearance: appearance.trim(),
          personality: personality.trim(),
        });
      }
    } catch (error) {
      showError('生成失败，请重试', '错误');
    } finally {
      setGeneratingCharacter(false);
    }
  };

  const handleSaveCharacter = async () => {
    setLoading(true);
    try {
      const response = await fetch('/api/characters', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          scriptId: params.id,
          ...newCharacter,
        }),
      });
      const result = await response.json();
      if (result.success) {
        setNewCharacter({ name: '', description: '', appearance: '', personality: '' });
        await fetchCharacters();
      }
    } catch (error) {
      showError('保存失败，请重试', '错误');
    } finally {
      setLoading(false);
    }
  };

  // 步骤 3: 生成分镜描述
  const handleGenerateStoryboard = async () => {
    if (!newStoryboard.description.trim()) return;

    setLoading(true);

    try {
      // 调用智能角色识别 API
      const identifyResponse = await fetch('/api/storyboards/identify-character', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          description: newStoryboard.description,
          characters,
        }),
      });

      const identifyResult = await identifyResponse.json();

      let characterIds: string[] = [];
      let prompt = newStoryboard.description;

      if (identifyResult.success && identifyResult.data) {
        const { matchedCharacters } = identifyResult.data;

        // 如果识别到角色，提取所有角色 ID
        if (matchedCharacters && matchedCharacters.length > 0) {
          characterIds = matchedCharacters.map((c: any) => c.id);

          // 在提示词中添加角色名称，明确角色参与
          prompt = newStoryboard.description;

          // 显示识别到的角色信息
          const characterNames = matchedCharacters.map((c: any) => c.name).join('、');
          console.log(`识别到角色: ${characterNames} (共 ${matchedCharacters.length} 个)`);
        }
      }

      setNewStoryboard({
        ...newStoryboard,
        prompt,
        characterIds,
      });
    } catch (error) {
      console.error('识别角色失败:', error);
      // 如果识别失败，仍然使用描述作为提示词
      setNewStoryboard({
        ...newStoryboard,
        prompt: newStoryboard.description,
      });
    } finally {
      setLoading(false);
    }
  };

  const handleSaveStoryboard = async () => {
    setLoading(true);
    try {
      const sequence = storyboards.length + 1;
      const response = await fetch('/api/storyboards', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          scriptId: params.id,
          sequence,
          description: newStoryboard.description,
          prompt: newStoryboard.prompt,
          characterIds: newStoryboard.characterIds.length > 0 ? JSON.stringify(newStoryboard.characterIds) : null,
          generateImage: false,
          isGenerated: false,
        }),
      });
      const result = await response.json();
      if (result.success) {
        setNewStoryboard({ description: '', prompt: '', characterIds: [] });
        await fetchStoryboards();
      }
    } catch (error) {
      showError('保存失败，请重试', '错误');
    } finally {
      setLoading(false);
    }
  };

  // 步骤 4: 生成图片
  const handleGenerateImage = async (storyboardId: string) => {
    setLoading(true);
    try {
      const response = await fetch('/api/storyboards', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          scriptId: params.id,
          id: storyboardId,
          generateImage: true,
          prompt: storyboards.find(s => s.id === storyboardId)?.description,
        }),
      });
      const result = await response.json();
      if (result.success) {
        await fetchStoryboards();
      }
    } catch (error) {
      showError('生成失败，请重试', '错误');
    } finally {
      setLoading(false);
    }
  };

  // 步骤 5: 生成视频
  const handleGenerateVideo = async (storyboardId: string) => {
    setLoading(true);
    try {
      const storyboard = storyboards.find(s => s.id === storyboardId);
      if (!storyboard) return;

      const response = await fetch('/api/generate-video', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          storyboardId,
          description: storyboard.description,
          imageUrl: storyboard.imageUrl,
          model: 'seedance-1.5',
        }),
      });
      const result = await response.json();
      if (result.success) {
        await fetchStoryboards();
      }
    } catch (error) {
      showError('生成失败，请重试', '错误');
    } finally {
      setLoading(false);
    }
  };

  // 编辑分镜
  const handleEditStoryboard = (storyboard: Storyboard) => {
    setEditingStoryboard(storyboard);
    setEditDialogOpen(true);
  };

  // 保存分镜编辑
  const handleSaveStoryboardEdit = async (id: string, data: Partial<Storyboard>) => {
    setLoading(true);
    try {
      const response = await fetch(`/api/storyboards/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });
      const result = await response.json();
      if (result.success) {
        await fetchStoryboards();
      } else {
        throw new Error(result.error || '保存失败');
      }
    } catch (error) {
      console.error('Error saving storyboard edit:', error);
      throw error;
    } finally {
      setLoading(false);
    }
  };

  const renderStepScript = () => (
    <Card>
      <CardHeader>
        <CardTitle>步骤 1: 剧本信息</CardTitle>
        <CardDescription>设置漫剧的基本信息</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid md:grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label>剧本标题</Label>
            <Input
              value={scriptForm.title}
              onChange={(e) => setScriptForm({ ...scriptForm, title: e.target.value })}
              placeholder="输入剧本标题"
            />
          </div>
          <div className="space-y-2">
            <Label>剧本类型</Label>
            <Select
              value={scriptForm.type}
              onValueChange={(value) => setScriptForm({ ...scriptForm, type: value })}
            >
              <SelectTrigger>
                <SelectValue placeholder="选择类型" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="剧情演绎">剧情演绎</SelectItem>
                <SelectItem value="旁白解说">旁白解说</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
        <div className="space-y-2">
          <Label>剧本描述</Label>
          <Textarea
            value={scriptForm.description}
            onChange={(e) => setScriptForm({ ...scriptForm, description: e.target.value })}
            rows={3}
            placeholder="简要描述剧本的主题和风格"
          />
        </div>
        <div className="space-y-2">
          <Label>故事内容</Label>
          <Textarea
            value={scriptForm.storyContent}
            onChange={(e) => setScriptForm({ ...scriptForm, storyContent: e.target.value })}
            rows={8}
            placeholder="详细的故事内容，AI 将基于此生成角色和分镜..."
          />
        </div>
        <div className="flex gap-3">
          <Button onClick={handleSaveScript} disabled={loading}>
            {loading ? <Spinner className="mr-2 h-4 w-4" /> : ''}
            保存并继续
          </Button>
        </div>
      </CardContent>
    </Card>
  );

  const renderStepCharacters = () => (
    <Card>
      <CardHeader>
        <CardTitle>步骤 2: 角色管理</CardTitle>
        <CardDescription>添加和管理剧本中的角色</CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* AI 生成角色 */}
        <div className="p-4 bg-blue-50 rounded-lg border border-blue-200">
          <h4 className="font-semibold mb-3">✨ AI 智能生成角色</h4>
          <div className="flex gap-2 mb-3">
            <Input
              placeholder="输入角色名称"
              value={newCharacter.name}
              onChange={(e) => setNewCharacter({ ...newCharacter, name: e.target.value })}
            />
            <Button onClick={handleGenerateCharacter} disabled={generatingCharacter || !newCharacter.name}>
              {generatingCharacter ? <Spinner className="h-4 w-4" /> : 'AI 生成'}
            </Button>
          </div>
          {newCharacter.description && (
            <div className="space-y-3">
              <div className="space-y-2">
                <Label>描述</Label>
                <Textarea
                  value={newCharacter.description}
                  onChange={(e) => setNewCharacter({ ...newCharacter, description: e.target.value })}
                  rows={2}
                />
              </div>
              <div className="space-y-2">
                <Label>外观</Label>
                <Textarea
                  value={newCharacter.appearance}
                  onChange={(e) => setNewCharacter({ ...newCharacter, appearance: e.target.value })}
                  rows={2}
                />
              </div>
              <div className="space-y-2">
                <Label>性格</Label>
                <Textarea
                  value={newCharacter.personality}
                  onChange={(e) => setNewCharacter({ ...newCharacter, personality: e.target.value })}
                  rows={2}
                />
              </div>
              <Button onClick={handleSaveCharacter} disabled={loading}>
                {loading ? <Spinner className="mr-2 h-4 w-4" /> : ''}
                添加角色
              </Button>
            </div>
          )}
        </div>

        {/* 角色列表 */}
        <div className="grid md:grid-cols-2 gap-4">
          {characters.map((char) => (
            <Card key={char.id}>
              <CardHeader>
                <CardTitle className="text-lg">{char.name}</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2 text-sm">
                {char.description && <div><Label>描述：</Label><p>{char.description}</p></div>}
                {char.appearance && <div><Label>外观：</Label><p>{char.appearance}</p></div>}
              </CardContent>
            </Card>
          ))}
        </div>

        <div className="flex gap-3">
          <Button variant="outline" onClick={() => setStep('script')}>
            ← 上一步
          </Button>
          <Button onClick={() => setStep('storyboards')}>
            下一步 →
          </Button>
        </div>
      </CardContent>
    </Card>
  );

  const renderStepStoryboards = () => (
    <Card>
      <CardHeader>
        <CardTitle>步骤 3: 分镜描述</CardTitle>
        <CardDescription>创建和管理分镜场景描述</CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* 添加分镜 */}
        <div className="p-4 bg-purple-50 rounded-lg border border-purple-200">
          <h4 className="font-semibold mb-3">📝 添加分镜</h4>
          <div className="space-y-3">
            <div className="space-y-2">
              <Label>分镜描述</Label>
              <Textarea
                value={newStoryboard.description}
                onChange={(e) => setNewStoryboard({ ...newStoryboard, description: e.target.value })}
                rows={3}
                placeholder="描述这个分镜的画面内容、角色动作、镜头运动..."
              />
            </div>
            
            {/* 显示识别到的角色 */}
            {newStoryboard.characterIds.length > 0 && (
              <div className="flex items-center gap-2 p-3 bg-blue-50 rounded-lg border border-blue-200 flex-wrap">
                <Badge variant="secondary" className="bg-blue-100 text-blue-700">
                  已识别角色 ({newStoryboard.characterIds.length})
                </Badge>
                {newStoryboard.characterIds.map((charId) => {
                  const character = characters.find(c => c.id === charId);
                  return character ? (
                    <div key={charId} className="flex items-center gap-2 px-2 py-1 bg-white rounded-full border border-blue-200">
                      {character.avatarUrl && (
                        <img
                          src={character.avatarUrl}
                          alt={character.name}
                          className="w-5 h-5 rounded-full object-cover"
                        />
                      )}
                      <span className="text-sm font-medium text-blue-800">{character.name}</span>
                    </div>
                  ) : null;
                })}
                <span className="text-xs text-blue-600 ml-auto">系统已自动关联 {newStoryboard.characterIds.length} 个角色</span>
              </div>
            )}
            
            <div className="flex gap-2">
              <Button onClick={handleGenerateStoryboard} disabled={!newStoryboard.description || loading}>
                {loading ? <Spinner className="mr-2 h-4 w-4" /> : ''}
                生成提示词并识别角色
              </Button>
              <Button onClick={handleSaveStoryboard} disabled={loading}>
                {loading ? <Spinner className="mr-2 h-4 w-4" /> : ''}
                添加分镜
              </Button>
            </div>
          </div>
        </div>

        {/* 分镜列表 */}
        <div className="space-y-4">
          {storyboards.map((sb) => (
            <Card key={sb.id}>
              <CardContent className="pt-6">
                <div className="flex items-start gap-4">
                  <div className="flex-shrink-0">
                    <div className="w-12 h-12 bg-purple-100 rounded-full flex items-center justify-center">
                      <span className="text-xl font-bold text-purple-600">{sb.sequence}</span>
                    </div>
                  </div>
                  <div className="flex-1">
                    <h4 className="font-semibold mb-2">分镜 {sb.sequence}</h4>
                    <p className="text-sm text-gray-600">{sb.description}</p>
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleEditStoryboard(sb)}
                  >
                    编辑
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        <div className="flex gap-3">
          <Button variant="outline" onClick={() => setStep('characters')}>
            ← 上一步
          </Button>
          <Button onClick={() => setStep('images')} disabled={storyboards.length === 0}>
            下一步 →
          </Button>
        </div>
      </CardContent>
    </Card>
  );

  const renderStepImages = () => (
    <Card>
      <CardHeader>
        <CardTitle>步骤 4: 生成分镜图片</CardTitle>
        <CardDescription>AI 为每个分镜生成图片</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid md:grid-cols-2 gap-4">
          {storyboards.map((sb) => (
            <Card key={sb.id}>
              <CardContent className="pt-6">
                <div className="space-y-3">
                  <div className="flex justify-between items-start gap-2">
                    <h4 className="font-semibold">分镜 {sb.sequence}</h4>
                    <div className="flex gap-2">
                      {sb.imageUrl ? (
                        <Badge variant="secondary">已生成</Badge>
                      ) : (
                        <Button size="sm" onClick={() => handleGenerateImage(sb.id)} disabled={loading}>
                          {loading ? <Spinner className="h-4 w-4" /> : '生成图片'}
                        </Button>
                      )}
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleEditStoryboard(sb)}
                      >
                        编辑
                      </Button>
                    </div>
                  </div>
                  <p className="text-sm text-gray-600 line-clamp-2">{sb.description}</p>
                  {sb.imageUrl && (
                    <img src={sb.imageUrl} alt={`分镜 ${sb.sequence}`} className="w-full rounded-lg" />
                  )}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        <div className="flex gap-3">
          <Button variant="outline" onClick={() => setStep('storyboards')}>
            ← 上一步
          </Button>
          <Button onClick={() => setStep('videos')} disabled={!storyboards.some(s => s.imageUrl)}>
            下一步 →
          </Button>
        </div>
      </CardContent>
    </Card>
  );

  const renderStepVideos = () => (
    <Card>
      <CardHeader>
        <CardTitle>步骤 5: 生成视频</CardTitle>
        <CardDescription>将分镜转换为视频</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid md:grid-cols-2 gap-4">
          {storyboards.map((sb) => (
            <Card key={sb.id}>
              <CardContent className="pt-6">
                <div className="space-y-3">
                  <div className="flex justify-between items-start gap-2">
                    <h4 className="font-semibold">分镜 {sb.sequence}</h4>
                    <div className="flex gap-2">
                      {sb.videoUrl ? (
                        <Badge variant="secondary">已生成</Badge>
                      ) : sb.imageUrl ? (
                        <Button size="sm" onClick={() => handleGenerateVideo(sb.id)} disabled={loading}>
                          {loading ? <Spinner className="h-4 w-4" /> : '生成视频'}
                        </Button>
                      ) : (
                        <Badge variant="outline">需要先生成图片</Badge>
                      )}
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleEditStoryboard(sb)}
                      >
                        编辑
                      </Button>
                    </div>
                  </div>
                  <p className="text-sm text-gray-600 line-clamp-2">{sb.description}</p>
                  {sb.videoUrl && (
                    <video src={sb.videoUrl} controls className="w-full rounded-lg" preload="metadata" />
                  )}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        <div className="flex gap-3">
          <Button variant="outline" onClick={() => setStep('images')}>
            ← 上一步
          </Button>
          <Button onClick={() => setStep('complete')} disabled={!storyboards.some(s => s.videoUrl)}>
            完成 →
          </Button>
        </div>
      </CardContent>
    </Card>
  );

  const renderStepComplete = () => (
    <Card>
      <CardHeader>
        <CardTitle className="text-2xl">🎉 完成！</CardTitle>
        <CardDescription>您的漫剧已成功创建</CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="p-6 bg-green-50 rounded-lg border border-green-200">
          <div className="text-center space-y-2">
            <p className="text-2xl font-bold text-green-800">漫剧创建成功！</p>
            <p className="text-green-700">
              {characters.length} 个角色 · {storyboards.length} 个分镜 · {storyboards.filter(s => s.videoUrl).length} 个视频
            </p>
          </div>
        </div>

        <div className="flex gap-3">
          <Link href={`/scripts/${params.id}`}>
            <Button>查看剧本详情</Button>
          </Link>
          <Link href="/scripts">
            <Button variant="outline">返回剧本列表</Button>
          </Link>
        </div>
      </CardContent>
    </Card>
  );

  return (
    <div className="max-w-4xl mx-auto">
      <div className="mb-6">
        <Link href="/scripts" className="text-blue-600 hover:text-blue-700 text-sm">
          ← 返回剧本列表
        </Link>
        <h1 className="text-3xl font-bold text-gray-900 mt-2">人机协同创作</h1>
      </div>

      {/* 步骤指示器 */}
      <div className="mb-6">
        <div className="flex items-center justify-between">
          {[
            { key: 'script', label: '剧本' },
            { key: 'characters', label: '角色' },
            { key: 'storyboards', label: '分镜' },
            { key: 'images', label: '图片' },
            { key: 'videos', label: '视频' },
          ].map((item, index) => {
            const currentStepIndex = ['script', 'characters', 'storyboards', 'images', 'videos'].indexOf(step);
            const itemIndex = index;
            const isActive = step === item.key;
            const isCompleted = itemIndex < currentStepIndex;

            return (
              <div key={item.key} className="flex items-center flex-1">
                <div className={`flex items-center justify-center w-10 h-10 rounded-full ${
                  isActive ? 'bg-blue-600 text-white' :
                  isCompleted ? 'bg-green-500 text-white' :
                  'bg-gray-200 text-gray-600'
                }`}>
                  {isCompleted ? '✓' : index + 1}
                </div>
                <span className={`ml-2 text-sm ${isActive ? 'font-semibold' : 'text-gray-600'}`}>
                  {item.label}
                </span>
                {index < 4 && <div className="flex-1 h-1 mx-4 bg-gray-200 rounded" />}
              </div>
            );
          })}
        </div>
      </div>

      {/* 步骤内容 */}
      {step === 'script' && renderStepScript()}
      {step === 'characters' && renderStepCharacters()}
      {step === 'storyboards' && renderStepStoryboards()}
      {step === 'images' && renderStepImages()}
      {step === 'videos' && renderStepVideos()}
      {step === 'complete' && renderStepComplete()}

      {/* 分镜编辑对话框 */}
      <EditStoryboardDialog
        storyboard={editingStoryboard}
        open={editDialogOpen}
        onOpenChange={setEditDialogOpen}
        onSave={handleSaveStoryboardEdit}
        characters={characters}
        scenes={scenes}
      />
    </div>
  );
}
