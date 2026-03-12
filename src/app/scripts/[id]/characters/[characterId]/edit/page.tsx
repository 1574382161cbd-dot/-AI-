'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { VOICE_OPTIONS, EMOTION_OPTIONS, VOICE_CATEGORIES } from '@/lib/voiceOptions';
import { Sparkles, User, FileText, Smile, Mic, Image as ImageIcon } from 'lucide-react';
import { useAlert } from '@/lib/alert-context';

interface Character {
  id: string;
  scriptId: string;
  name: string;
  description: string | null;
  appearance: string | null;
  personality: string | null;
  avatarUrl: string | null;
  voiceStyle: string | null;
  voiceSpeed: number | null;
  voiceEmotion: string | null;
}

interface VoiceConfig {
  style: string;
  speed: number;
  emotion: string;
}

export default function EditCharacterPage() {
  const params = useParams();
  const router = useRouter();
  const searchParams = useSearchParams();
  const returnUrl = searchParams.get('returnUrl');
  const { showError, showSuccess, showWarning } = useAlert();

  const [character, setCharacter] = useState<Character | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [regeneratingAvatar, setRegeneratingAvatar] = useState(false);
  const [generatedImages, setGeneratedImages] = useState<Array<{ url: string; fileKey: string; label: string }>>([]);
  const [selectedImage, setSelectedImage] = useState<{ url: string; fileKey: string; label: string } | null>(null);

  const [formData, setFormData] = useState({
    name: '',
    description: '',
    appearance: '',
    personality: '',
  });

  const [voiceConfig, setVoiceConfig] = useState<VoiceConfig>({
    style: 'zh_female_xiaohe_uranus_bigtts',
    speed: 0,
    emotion: 'neutral',
  });

  const [activeTab, setActiveTab] = useState<'basic' | 'appearance' | 'personality' | 'voice'>('basic');

  useEffect(() => {
    fetchCharacter();
  }, [params.characterId]);

  const fetchCharacter = async () => {
    try {
      const response = await fetch(`/api/characters/${params.characterId}`);
      const result = await response.json();

      if (result.success) {
        setCharacter(result.data);
        setFormData({
          name: result.data.name,
          description: result.data.description || '',
          appearance: result.data.appearance || '',
          personality: result.data.personality || '',
        });
        setVoiceConfig({
          style: result.data.voiceStyle || 'zh_female_xiaohe_uranus_bigtts',
          speed: result.data.voiceSpeed || 0,
          emotion: result.data.voiceEmotion || 'neutral',
        });
      } else {
        showError('角色不存在', '错误');
        router.push(returnUrl || `/scripts/${params.id}?tab=characters`);
      }
    } catch (error) {
      console.error('Error fetching character:', error);
      showError('加载失败，请重试', '错误');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.name) {
      showWarning('请输入角色名称', '提示');
      return;
    }

    setSaving(true);

    try {
      const response = await fetch(`/api/characters/${params.characterId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: formData.name,
          description: formData.description,
          appearance: formData.appearance,
          personality: formData.personality,
          voiceStyle: voiceConfig.style,
          voiceSpeed: voiceConfig.speed,
          voiceEmotion: voiceConfig.emotion,
        }),
      });

      const result = await response.json();

      if (result.success) {
        showSuccess('保存成功！', '成功');
        router.push(returnUrl || `/scripts/${params.id}?tab=characters`);
      } else {
        showError('保存失败：' + (result.error || '未知错误'), '错误');
      }
    } catch (error) {
      console.error('Error updating character:', error);
      showError('保存失败，请重试', '错误');
    } finally {
      setSaving(false);
    }
  };

  const handleRegenerateAvatar = async () => {
    if (!formData.appearance) {
      showWarning('请先填写外观描述', '提示');
      return;
    }

    setRegeneratingAvatar(true);
    setGeneratedImages([]);
    setSelectedImage(null);

    try {
      const response = await fetch('/api/characters/generate-images', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ appearance: formData.appearance, count: 4 }),
      });

      const result = await response.json();

      if (result.success && result.data.length > 0) {
        setGeneratedImages(result.data);
        setActiveTab('appearance');
      } else {
        showError('图片生成失败', '错误');
      }
    } catch (error) {
      console.error('Error generating images:', error);
      showError('图片生成失败，请重试', '错误');
    } finally {
      setRegeneratingAvatar(false);
    }
  };

  const handleAvatarChange = async (image: { url: string; fileKey: string; label: string }) => {
    setSelectedImage(image);

    try {
      const response = await fetch(`/api/characters/${params.characterId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ avatarUrl: image.fileKey }),
      });

      const result = await response.json();

      if (result.success) {
        showSuccess('角色形象更新成功！', '成功');
        await fetchCharacter(); // 重新加载角色数据
      } else {
        showError('更新失败', '错误');
      }
    } catch (error) {
      console.error('Error updating avatar:', error);
      showError('更新失败，请重试', '错误');
    }
  };

  function getVoiceById(id: string) {
    return VOICE_OPTIONS.find(v => v.id === id);
  }

  if (loading) {
    return (
      <div className="container mx-auto py-6">
        <div className="text-center">加载中...</div>
      </div>
    );
  }

  return (
    <div className="container mx-auto py-6 max-w-5xl">
      <div className="mb-6">
        <Link href={returnUrl || `/scripts/${params.id}?tab=characters`}>
          <Button variant="ghost">← 返回</Button>
        </Link>
      </div>

      <div className="grid lg:grid-cols-3 gap-6">
        {/* 左侧：角色预览 */}
        <div className="lg:col-span-1">
          <Card>
            <CardHeader>
              <CardTitle>角色预览</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* 角色形象 */}
              <div className="aspect-square bg-gray-100 rounded-lg overflow-hidden border-2 border-gray-200">
                {character?.avatarUrl ? (
                  <img
                    src={character.avatarUrl}
                    alt={character.name}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-gray-400">
                    <User className="h-16 w-16" />
                  </div>
                )}
              </div>

              {/* 角色名称 */}
              <div>
                <h2 className="text-2xl font-bold">{character?.name}</h2>
                {character?.description && (
                  <p className="text-gray-600 text-sm mt-1 line-clamp-3">{character.description}</p>
                )}
              </div>

              {/* 语音配置 */}
              <div className="pt-4 border-t space-y-2">
                <div className="flex items-center gap-2">
                  <Mic className="h-4 w-4 text-gray-500" />
                  <span className="text-sm font-medium">语音风格：</span>
                  <Badge variant="outline">
                    {getVoiceById(voiceConfig.style)?.name}
                  </Badge>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-sm font-medium">语速：</span>
                  <Badge variant="outline">
                    {voiceConfig.speed > 0 ? '+' : ''}{voiceConfig.speed}
                  </Badge>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-sm font-medium">情绪：</span>
                  <Badge variant="outline">
                    {EMOTION_OPTIONS.find(e => e.id === voiceConfig.emotion)?.name}
                  </Badge>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* 右侧：编辑表单 */}
        <div className="lg:col-span-2">
          <Card>
            <CardHeader>
              <CardTitle>编辑角色</CardTitle>
              <CardDescription>完善角色信息，确保人物描述准确</CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleSubmit}>
                <Tabs value={activeTab} onValueChange={(value) => setActiveTab(value as any)}>
                  <TabsList className="grid w-full grid-cols-4">
                    <TabsTrigger value="basic" className="flex items-center gap-2">
                      <FileText className="h-4 w-4" />
                      基本信息
                    </TabsTrigger>
                    <TabsTrigger value="appearance" className="flex items-center gap-2">
                      <ImageIcon className="h-4 w-4" />
                      外观设定
                    </TabsTrigger>
                    <TabsTrigger value="personality" className="flex items-center gap-2">
                      <Smile className="h-4 w-4" />
                      性格特征
                    </TabsTrigger>
                    <TabsTrigger value="voice" className="flex items-center gap-2">
                      <Mic className="h-4 w-4" />
                      语音配置
                    </TabsTrigger>
                  </TabsList>

                  {/* 基本信息 */}
                  <TabsContent value="basic" className="space-y-4 mt-4">
                    <div>
                      <Label htmlFor="name">角色名称 *</Label>
                      <Input
                        id="name"
                        placeholder="例如：小明、公主、魔法师..."
                        value={formData.name}
                        onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                      />
                    </div>

                    <div>
                      <Label htmlFor="description">角色描述</Label>
                      <Textarea
                        id="description"
                        placeholder="详细描述角色的背景故事、身份、角色定位等..."
                        value={formData.description}
                        onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                        rows={8}
                        className="resize-none"
                      />
                      <p className="text-xs text-gray-500 mt-2">
                        💡 描述角色的背景故事、身份、在故事中的角色定位等，这有助于AI更好地理解角色
                      </p>
                    </div>
                  </TabsContent>

                  {/* 外观设定 */}
                  <TabsContent value="appearance" className="space-y-4 mt-4">
                    <div>
                      <Label htmlFor="appearance">外观描述 *</Label>
                      <Textarea
                        id="appearance"
                        placeholder="详细描述角色的外貌、服装、发型、体型、肤色等..."
                        value={formData.appearance}
                        onChange={(e) => setFormData({ ...formData, appearance: e.target.value })}
                        rows={8}
                        className="resize-none"
                      />
                      <p className="text-xs text-gray-500 mt-2">
                        💡 详细的外观描述有助于AI生成准确的角色形象。建议包含：发型、发色、眼睛颜色、面部特征、体型、服装风格等
                      </p>
                    </div>

                    {/* 重新生成形象 */}
                    <div className="pt-4 border-t">
                      <div className="flex items-center justify-between mb-3">
                        <Label>重新生成形象</Label>
                        <Button
                          type="button"
                          onClick={handleRegenerateAvatar}
                          disabled={!formData.appearance || regeneratingAvatar}
                          size="sm"
                        >
                          {regeneratingAvatar ? '生成中...' : '生成新形象'}
                        </Button>
                      </div>

                      {/* 生成的图片 */}
                      {generatedImages.length > 0 && (
                        <div className="grid grid-cols-2 gap-3">
                          {generatedImages.map((image, index) => (
                            <div
                              key={index}
                              className={`relative cursor-pointer rounded-lg overflow-hidden border-2 transition-all ${
                                selectedImage?.fileKey === image.fileKey
                                  ? 'border-blue-500 shadow-lg'
                                  : 'border-gray-200 hover:border-gray-400'
                              }`}
                              onClick={() => handleAvatarChange(image)}
                            >
                              <img
                                src={image.url}
                                alt={`角色形象选项 ${index + 1}`}
                                className="w-full aspect-square object-cover"
                              />
                              <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/60 to-transparent p-2">
                                <p className="text-white text-xs">{image.label}</p>
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  </TabsContent>

                  {/* 性格特征 */}
                  <TabsContent value="personality" className="space-y-4 mt-4">
                    <div>
                      <Label htmlFor="personality">性格特征</Label>
                      <Textarea
                        id="personality"
                        placeholder="详细描述角色的性格、习惯、说话方式、行为模式、价值观等..."
                        value={formData.personality}
                        onChange={(e) => setFormData({ ...formData, personality: e.target.value })}
                        rows={8}
                        className="resize-none"
                      />
                      <p className="text-xs text-gray-500 mt-2">
                        💡 详细的性格描述有助于AI更好地把握角色的行为和对话风格。建议包含：性格特点、说话方式、行为习惯、价值观、优点缺点等
                      </p>
                    </div>

                    {/* 性格提示 */}
                    <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                      <h4 className="font-semibold text-blue-900 mb-2">💡 性格描述建议</h4>
                      <ul className="text-sm text-blue-800 space-y-1 list-disc list-inside">
                        <li>包含性格特点：勇敢、善良、幽默、内向等</li>
                        <li>描述说话方式：语气、口头禅、表达习惯</li>
                        <li>说明行为模式：遇事反应、决策方式</li>
                        <li>提及价值观：信仰、道德准则、人生追求</li>
                        <li>列举优缺点：让角色更立体真实</li>
                      </ul>
                    </div>
                  </TabsContent>

                  {/* 语音配置 */}
                  <TabsContent value="voice" className="space-y-6 mt-4">
                    {/* 语音风格选择 */}
                    <div>
                      <Label htmlFor="voiceStyle">语音风格 *</Label>
                      <p className="text-sm text-gray-500 mb-3">选择角色的音色</p>
                      <div className="space-y-4">
                        {Object.entries(VOICE_CATEGORIES).map(([categoryKey, categoryName]) => (
                          <div key={categoryKey}>
                            <h4 className="text-sm font-semibold text-gray-700 mb-2">{categoryName}</h4>
                            <div className="grid grid-cols-2 gap-2">
                              {VOICE_OPTIONS.filter(v => v.category === categoryKey).map(voice => (
                                <button
                                  key={voice.id}
                                  type="button"
                                  onClick={() => setVoiceConfig({ ...voiceConfig, style: voice.id })}
                                  className={`p-3 text-left rounded-lg border-2 transition-all ${
                                    voiceConfig.style === voice.id
                                      ? 'border-blue-500 bg-blue-50'
                                      : 'border-gray-200 hover:border-gray-400'
                                  }`}
                                >
                                  <div className="font-medium text-sm">{voice.name}</div>
                                  <div className="text-xs text-gray-500 mt-1">{voice.description}</div>
                                </button>
                              ))}
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>

                    {/* 语速设置 */}
                    <div>
                      <Label htmlFor="voiceSpeed">语速: {voiceConfig.speed > 0 ? '+' : ''}{voiceConfig.speed}</Label>
                      <p className="text-sm text-gray-500 mb-3">调整角色说话的快慢（-50 到 100，0 为正常）</p>
                      <input
                        id="voiceSpeed"
                        type="range"
                        min="-50"
                        max="100"
                        value={voiceConfig.speed}
                        onChange={(e) => setVoiceConfig({ ...voiceConfig, speed: Number(e.target.value) })}
                        className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer"
                      />
                      <div className="flex justify-between text-xs text-gray-500 mt-1">
                        <span>慢速 (-50)</span>
                        <span>正常 (0)</span>
                        <span>快速 (100)</span>
                      </div>
                    </div>

                    {/* 情绪选择 */}
                    <div>
                      <Label htmlFor="voiceEmotion">默认情绪 *</Label>
                      <p className="text-sm text-gray-500 mb-3">选择角色的默认说话情绪</p>
                      <div className="grid grid-cols-3 gap-2">
                        {EMOTION_OPTIONS.map(emotion => (
                          <button
                            key={emotion.id}
                            type="button"
                            onClick={() => setVoiceConfig({ ...voiceConfig, emotion: emotion.id })}
                            className={`p-3 text-center rounded-lg border-2 transition-all ${
                              voiceConfig.emotion === emotion.id
                                ? 'border-blue-500 bg-blue-50'
                                : 'border-gray-200 hover:border-gray-400'
                            }`}
                          >
                            <div className="font-medium text-sm">{emotion.name}</div>
                            <div className="text-xs text-gray-500 mt-1">{emotion.description}</div>
                          </button>
                        ))}
                      </div>
                    </div>
                  </TabsContent>
                </Tabs>

                {/* 操作按钮 */}
                <div className="flex gap-3 pt-6 mt-6 border-t">
                  <Link href={returnUrl || `/scripts/${params.id}?tab=characters`}>
                    <Button type="button" variant="outline" disabled={saving}>
                      取消
                    </Button>
                  </Link>
                  <Button type="submit" disabled={saving} className="flex-1">
                    {saving ? '保存中...' : '保存更改'}
                  </Button>
                </div>
              </form>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
