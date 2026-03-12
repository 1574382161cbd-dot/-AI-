'use client';

import { useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Spinner } from '@/components/ui/spinner';
import { CheckCircle2, Sparkles } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { VOICE_OPTIONS, EMOTION_OPTIONS, VOICE_CATEGORIES } from '@/lib/voiceOptions';
import { useAlert } from '@/lib/alert-context';

interface CharacterImage {
  url: string;
  fileKey: string;
  label: string;
}

interface VoiceConfig {
  style: string;
  speed: number;
  emotion: string;
}

export default function CreateCharacterPage() {
  const params = useParams();
  const router = useRouter();
  const { showError, showWarning, showSuccess } = useAlert();
  const [loading, setLoading] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [generatingImages, setGeneratingImages] = useState(false);
  const [generatingThreeView, setGeneratingThreeView] = useState(false); // 三视图生成状态
  const [characterName, setCharacterName] = useState('');
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    appearance: '',
    personality: '',
    backgroundColor: '', // 纯色背景颜色
  });
  const [generated, setGenerated] = useState(false);
  const [characterImages, setCharacterImages] = useState<CharacterImage[]>([]);
  const [selectedImage, setSelectedImage] = useState<CharacterImage | null>(null);
  const [voiceConfig, setVoiceConfig] = useState<VoiceConfig>({
    style: 'zh_female_xiaohe_uranus_bigtts',
    speed: 0,
    emotion: 'neutral',
  });
  const [step, setStep] = useState<'info' | 'design' | 'images' | 'voice' | 'confirm'>('info');

  const handleGenerateDesign = async () => {
    if (!characterName.trim()) {
      showWarning('请输入角色名称', '提示');
      return;
    }

    setGenerating(true);

    try {
      const charactersResponse = await fetch(`/api/characters?scriptId=${params.id}`);
      const charactersResult = await charactersResponse.json();

      const response = await fetch('/api/characters/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          scriptId: params.id,
          characterName,
          existingCharacters: charactersResult.success ? charactersResult.data : [],
        }),
      });

      const result = await response.json();

      if (result.success) {
        const generatedData = parseCharacterResult(result.data, characterName);
        setFormData(generatedData);
        setGenerated(true);
        setStep('design');
      } else {
        showError('生成失败，请重试', '错误');
      }
    } catch (error) {
      console.error('Error generating character:', error);
      showError('生成失败，请重试', '错误');
    } finally {
      setGenerating(false);
    }
  };

  const handleGenerateImages = async () => {
    if (!formData.appearance) {
      showWarning('请先填写外观描述', '提示');
      return;
    }

    setGeneratingImages(true);

    try {
      const response = await fetch('/api/characters/generate-images', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ appearance: formData.appearance, count: 4 }),
      });

      const result = await response.json();

      if (result.success && result.data.length > 0) {
        setCharacterImages(result.data);
        setStep('images');
      } else {
        showError('图片生成失败，请重试', '错误');
      }
    } catch (error) {
      console.error('Error generating character images:', error);
      showError('图片生成失败', '错误');
    } finally {
      setGeneratingImages(false);
    }
  };

  const parseCharacterResult = (text: string, name: string) => {
    let description = '';
    let appearance = '';
    let personality = '';

    const lines = text.split('\n');
    let currentSection = '';

    for (const line of lines) {
      const lowerLine = line.toLowerCase();

      if (lowerLine.includes('描述') || lowerLine.includes('背景') || lowerLine.includes('设定')) {
        currentSection = 'description';
      } else if (lowerLine.includes('外观') || lowerLine.includes('形象') || lowerLine.includes('外貌')) {
        currentSection = 'appearance';
      } else if (lowerLine.includes('性格') || lowerLine.includes('个性') || lowerLine.includes('性格特点')) {
        currentSection = 'personality';
      } else if (line.trim() && currentSection) {
        if (currentSection === 'description') {
          description += line.trim() + '\n';
        } else if (currentSection === 'appearance') {
          appearance += line.trim() + '\n';
        } else if (currentSection === 'personality') {
          personality += line.trim() + '\n';
        }
      }
    }

    if (!description && !appearance && !personality) {
      description = text;
    }

    return {
      name,
      description: description.trim(),
      appearance: appearance.trim(),
      personality: personality.trim(),
      backgroundColor: '', // 默认为空，用户可以手动填写
    };
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.name) {
      showWarning('请填写角色名称', '提示');
      return;
    }

    if (!selectedImage) {
      showWarning('请选择角色形象', '提示');
      return;
    }

    setLoading(true);

    try {
      const response = await fetch('/api/characters', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          scriptId: params.id,
          ...formData,
          avatarUrl: selectedImage.fileKey,
          voiceStyle: voiceConfig.style,
          voiceSpeed: voiceConfig.speed,
          voiceEmotion: voiceConfig.emotion,
        }),
      });

      const result = await response.json();

      if (result.success && result.data?.id) {
        // 角色创建成功，自动生成三视图
        setLoading(false);
        setGeneratingThreeView(true);
        
        try {
          const threeViewResponse = await fetch(`/api/characters/${result.data.id}/generate-three-view`, {
            method: 'POST',
          });
          
          const threeViewResult = await threeViewResponse.json();
          
          if (threeViewResult.success) {
            showSuccess('角色创建成功，三视图已生成！');
          } else {
            console.warn('三视图生成失败:', threeViewResult.error);
            showSuccess('角色创建成功！（三视图生成失败，可稍后重新生成）');
          }
        } catch (threeViewError) {
          console.error('三视图生成出错:', threeViewError);
          showSuccess('角色创建成功！（三视图生成失败，可稍后重新生成）');
        } finally {
          setGeneratingThreeView(false);
        }
        
        router.push(`/scripts/${params.id}?tab=characters`);
      } else {
        showError('创建失败，请重试', '错误');
      }
    } catch (error) {
      console.error('Error creating character:', error);
      showError('创建失败，请重试', '错误');
    } finally {
      setLoading(false);
    }
  };

  const steps = [
    { id: 'info', title: '基本信息', icon: 1 },
    { id: 'design', title: '角色设计', icon: 2 },
    { id: 'images', title: '形象选择', icon: 3 },
    { id: 'voice', title: '语音设置', icon: 4 },
    { id: 'confirm', title: '确认创建', icon: 5 },
  ];

  return (
    <div className="max-w-4xl mx-auto">
      <div className="mb-6">
        <Button variant="ghost" onClick={() => router.back()} className="mb-4">
          ← 返回
        </Button>
        <h1 className="text-3xl font-bold text-gray-900">创建角色</h1>
      </div>

      {/* 步骤指示器 */}
      <div className="mb-8">
        <div className="flex items-center justify-between">
          {steps.map((s, i) => (
            <div key={s.id} className="flex items-center flex-1">
              <div className={`flex items-center justify-center w-10 h-10 rounded-full ${
                step === s.id
                  ? 'bg-blue-600 text-white'
                  : steps.findIndex(currentStep => currentStep.id === s.id) < steps.findIndex(currentStep => currentStep.id === step)
                  ? 'bg-green-600 text-white'
                  : 'bg-gray-200 text-gray-600'
              }`}>
                {steps.findIndex(currentStep => currentStep.id === s.id) < steps.findIndex(currentStep => currentStep.id === step) ? (
                  <CheckCircle2 className="h-6 w-6" />
                ) : (
                  <span className="font-semibold">{s.icon}</span>
                )}
              </div>
              <span className={`ml-2 text-sm font-medium ${
                step === s.id ? 'text-blue-600' : 'text-gray-600'
              }`}>
                {s.title}
              </span>
              {i < steps.length - 1 && (
                <div className="flex-1 h-0.5 bg-gray-200 mx-4" />
              )}
            </div>
          ))}
        </div>
      </div>

      {/* 步骤 1: 基本信息 */}
      {step === 'info' && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Sparkles className="h-5 w-5 text-blue-600" />
              第一步：基本信息
            </CardTitle>
            <CardDescription>输入角色名称，AI 将为您生成详细的角色设定</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div>
                <Label htmlFor="characterName">角色名称 *</Label>
                <Input
                  id="characterName"
                  placeholder="例如：小明、公主、魔法师..."
                  value={characterName}
                  onChange={(e) => setCharacterName(e.target.value)}
                  disabled={generating}
                />
              </div>

              <Button
                onClick={handleGenerateDesign}
                disabled={generating || !characterName.trim()}
                className="w-full"
              >
                {generating ? (
                  <>
                    <Spinner className="mr-2 h-4 w-4" />
                    AI 正在生成角色设定...
                  </>
                ) : (
                  'AI 生成角色设定'
                )}
              </Button>

              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                <h4 className="font-semibold text-blue-900 mb-2">💡 提示</h4>
                <p className="text-sm text-blue-800">
                  输入角色名称后，AI 将自动生成角色的描述、外观和性格设定，您可以在下一步进行调整。
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* 步骤 2: 角色设计 */}
      {step === 'design' && (
        <Card>
          <CardHeader>
            <CardTitle>第二步：角色设计</CardTitle>
            <CardDescription>查看并编辑 AI 生成的角色设定</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div>
                <Label htmlFor="name">角色名称 *</Label>
                <Input
                  id="name"
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
                  rows={6}
                  className="resize-none"
                />
                <p className="text-xs text-gray-500 mt-1">
                  💡 描述角色的背景故事、身份、在故事中的角色定位等，这有助于AI更好地理解角色
                </p>
              </div>

              <div>
                <Label htmlFor="appearance">外观描述 *</Label>
                <Textarea
                  id="appearance"
                  placeholder="详细描述角色的外貌、服装、发型、体型、肤色等..."
                  value={formData.appearance}
                  onChange={(e) => setFormData({ ...formData, appearance: e.target.value })}
                  rows={6}
                  className="resize-none"
                />
                <p className="text-xs text-gray-500 mt-1">
                  💡 详细的外观描述有助于AI生成准确的角色形象。建议包含：发型、发色、眼睛颜色、面部特征、体型、服装风格等
                </p>
              </div>

              <div>
                <Label htmlFor="personality">性格特征</Label>
                <Textarea
                  id="personality"
                  placeholder="详细描述角色的性格、习惯、说话方式、行为模式、价值观等..."
                  value={formData.personality}
                  onChange={(e) => setFormData({ ...formData, personality: e.target.value })}
                  rows={6}
                  className="resize-none"
                />
                <p className="text-xs text-gray-500 mt-1">
                  💡 详细的性格描述有助于AI更好地把握角色的行为和对话风格。建议包含：性格特点、说话方式、行为习惯、价值观、优点缺点等
                </p>
              </div>

              <div>
                <Label htmlFor="backgroundColor">纯色背景颜色</Label>
                <Input
                  id="backgroundColor"
                  placeholder="例如：深蓝灰色、暖黄色、深红色..."
                  value={formData.backgroundColor}
                  onChange={(e) => setFormData({ ...formData, backgroundColor: e.target.value })}
                />
                <p className="text-xs text-gray-500 mt-1">
                  💡 纯色背景用于三视图生成，颜色暗示角色所处的时代、氛围或性格。例如：陈远志（深蓝灰）→压抑、赵高（暖黄）→古代宫廷
                </p>
              </div>

              <div className="flex gap-3 pt-4 border-t">
                <Button onClick={() => setStep('info')} variant="outline">
                  上一步
                </Button>
                <Button
                  onClick={handleGenerateImages}
                  disabled={!formData.appearance || generatingImages}
                  className="flex-1"
                >
                  {generatingImages ? (
                    <>
                      <Spinner className="mr-2 h-4 w-4" />
                      AI 正在生成角色形象...
                    </>
                  ) : (
                    'AI 生成角色形象'
                  )}
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* 步骤 3: 形象选择 */}
      {step === 'images' && (
        <Card>
          <CardHeader>
            <CardTitle>第三步：形象选择</CardTitle>
            <CardDescription>从 AI 生成的 4 张角色形象中选择一张</CardDescription>
          </CardHeader>
          <CardContent>
            {generatingImages ? (
              <div className="text-center py-12">
                <Spinner className="h-12 w-12 mx-auto mb-4" />
                <p className="text-gray-600">AI 正在生成角色形象，请稍候...</p>
              </div>
            ) : (
              <>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  {characterImages.map((image, index) => (
                    <div
                      key={index}
                      className={`relative cursor-pointer rounded-lg overflow-hidden border-2 transition-all ${
                        selectedImage?.fileKey === image.fileKey
                          ? 'border-blue-500 shadow-lg'
                          : 'border-gray-200 hover:border-gray-400'
                      }`}
                      onClick={() => setSelectedImage(image)}
                    >
                      <img
                        src={image.url}
                        alt={`角色形象选项 ${index + 1}`}
                        className="w-full aspect-square object-cover"
                      />
                      {selectedImage?.fileKey === image.fileKey && (
                        <div className="absolute top-2 right-2 bg-blue-500 text-white rounded-full p-1">
                          <CheckCircle2 className="h-5 w-5" />
                        </div>
                      )}
                      <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/60 to-transparent p-2">
                        <p className="text-white text-xs">{image.label}</p>
                      </div>
                    </div>
                  ))}
                </div>

                <div className="flex gap-3 mt-6 pt-4 border-t">
                  <Button onClick={() => setStep('design')} variant="outline">
                    上一步
                  </Button>
                  <Button
                    onClick={() => setStep('voice')}
                    disabled={!selectedImage}
                    className="flex-1"
                  >
                    下一步：语音设置
                  </Button>
                </div>
              </>
            )}
          </CardContent>
        </Card>
      )}

      {/* 步骤 4: 语音设置 */}
      {step === 'voice' && (
        <Card>
          <CardHeader>
            <CardTitle>第四步：语音设置</CardTitle>
            <CardDescription>为角色配置语音风格、语速和默认情绪</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-6">
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

              <div className="flex gap-3 pt-4 border-t">
                <Button onClick={() => setStep('images')} variant="outline">
                  上一步
                </Button>
                <Button onClick={() => setStep('confirm')} className="flex-1">
                  下一步：确认创建
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* 步骤 5: 确认创建 */}
      {step === 'confirm' && (
        <Card>
          <CardHeader>
            <CardTitle>第五步：确认创建</CardTitle>
            <CardDescription>请确认角色信息无误后创建</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-6">
              <div className="flex gap-6">
                <div className="flex-shrink-0">
                  {selectedImage && (
                    <img
                      src={selectedImage.url}
                      alt="角色形象"
                      className="w-32 h-32 object-cover rounded-lg"
                    />
                  )}
                </div>
                <div className="flex-1">
                  <h3 className="text-xl font-semibold mb-2">{formData.name}</h3>
                  <p className="text-gray-600 text-sm mb-2">{formData.description}</p>
                  <div className="space-y-1">
                    <p><strong>外观：</strong>{formData.appearance}</p>
                    <p><strong>性格：</strong>{formData.personality}</p>
                    <p>
                      <strong>语音：</strong>
                      {getVoiceById(voiceConfig.style)?.name}（
                      {voiceConfig.speed > 0 ? '+' : ''}{voiceConfig.speed}，
                      {EMOTION_OPTIONS.find(e => e.id === voiceConfig.emotion)?.name}
                      ）
                    </p>
                  </div>
                </div>
              </div>

              {/* 三视图生成提示 */}
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                <div className="flex items-start gap-3">
                  <Sparkles className="h-5 w-5 text-blue-600 mt-0.5" />
                  <div>
                    <p className="text-sm font-medium text-blue-800">创建后将自动生成三视图</p>
                    <p className="text-xs text-blue-600 mt-1">
                      为确保角色在运镜时的一致性，系统将自动生成正面、侧面、四分之三三个视角的形象图
                    </p>
                  </div>
                </div>
              </div>

              <form onSubmit={handleSubmit}>
                <div className="flex gap-3 pt-4 border-t">
                  <Button type="button" onClick={() => setStep('voice')} variant="outline">
                    上一步
                  </Button>
                  <Button type="submit" disabled={loading || generatingThreeView} className="flex-1">
                    {loading ? '创建中...' : generatingThreeView ? '正在生成三视图...' : '确认创建'}
                  </Button>
                </div>
              </form>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );

  function getVoiceById(id: string) {
    return VOICE_OPTIONS.find(v => v.id === id);
  }
}
