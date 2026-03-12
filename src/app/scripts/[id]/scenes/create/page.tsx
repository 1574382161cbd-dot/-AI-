'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useAlert } from '@/lib/alert-context';

export default function CreateScenePage() {
  const params = useParams();
  const router = useRouter();
  const { showError, showWarning, showSuccess } = useAlert();
  const [loading, setLoading] = useState(false);
  const [generatingImage, setGeneratingImage] = useState(false);
  const [generatedImages, setGeneratedImages] = useState<string[]>([]);
  const [formData, setFormData] = useState({
    name: '',
    description: '',
  });
  const [selectedBackground, setSelectedBackground] = useState<string | null>(null);
  const [selectedReferenceImage, setSelectedReferenceImage] = useState<string | null>(null);
  const [imageStyle, setImageStyle] = useState('cinematic');
  const [activeTab, setActiveTab] = useState<'background' | 'reference'>('background');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.name) {
      showError('请输入场景名称');
      return;
    }

    setLoading(true);

    try {
      const response = await fetch('/api/scenes', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          scriptId: params.id,
          name: formData.name,
          description: formData.description,
          backgroundUrl: selectedBackground,
          referenceImageUrl: selectedReferenceImage,
        }),
      });

      const result = await response.json();

      if (result.success) {
        router.push(`/scripts/${params.id}?tab=scenes`);
      } else {
        showError('创建失败：' + (result.error || '未知错误'));
      }
    } catch (error) {
      console.error('Error creating scene:', error);
      showError('创建失败，请重试');
    } finally {
      setLoading(false);
    }
  };

  const handleGenerateImage = async () => {
    if (!formData.description) {
      showError('请先输入场景描述');
      return;
    }

    setGeneratingImage(true);
    setGeneratedImages([]);
    setSelectedBackground(null);

    try {
      const response = await fetch('/api/scenes/generate-image', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          description: formData.description,
          count: 4,
          style: imageStyle,
        }),
      });

      const result = await response.json();

      // 兼容两种返回格式: result.data 或 result.images
      const imageList = result.data || result.images;
      
      if (result.success && imageList && imageList.length > 0) {
        const imageUrls = imageList.map((img: any) => img.url);
        setGeneratedImages(imageUrls);
      } else {
        showError('图片生成失败: ' + (result.error || '未知错误'));
      }
    } catch (error) {
      console.error('Error generating image:', error);
      showError('图片生成失败，请重试');
    } finally {
      setGeneratingImage(false);
    }
  };

  return (
    <div className="container mx-auto py-6 max-w-4xl">
      <div className="mb-6">
        <Link href={`/scripts/${params.id}?tab=scenes`}>
          <Button variant="ghost">← 返回场景管理</Button>
        </Link>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>创建新场景</CardTitle>
          <CardDescription>为剧本创建场景并生成背景图</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-6">
            {/* 场景名称 */}
            <div className="space-y-2">
              <Label htmlFor="name">场景名称 *</Label>
              <Input
                id="name"
                placeholder="例如：森林小屋、城市街道"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                disabled={loading}
              />
            </div>

            {/* 场景描述 */}
            <div className="space-y-2">
              <Label htmlFor="description">场景描述 *</Label>
              <Textarea
                id="description"
                placeholder="详细描述场景的环境、氛围、时间等，例如：一个宁静的森林小屋，周围是高大的松树，阳光透过树叶洒在木质门廊上"
                rows={4}
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                disabled={loading}
              />
            </div>

            {/* 图片风格 */}
            <div className="space-y-2">
              <Label htmlFor="style">图片风格</Label>
              <Select value={imageStyle} onValueChange={setImageStyle} disabled={loading || generatingImage}>
                <SelectTrigger id="style">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="cinematic">电影感</SelectItem>
                  <SelectItem value="anime">动漫风格</SelectItem>
                  <SelectItem value="realistic">写实风格</SelectItem>
                  <SelectItem value="fantasy">奇幻风格</SelectItem>
                  <SelectItem value="watercolor">水彩风格</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* 图片生成区域 */}
            <Tabs value={activeTab} onValueChange={(value) => setActiveTab(value as 'background' | 'reference')}>
              <TabsList className="grid w-full grid-cols-2">
                <TabsTrigger value="background">背景图</TabsTrigger>
                <TabsTrigger value="reference">参考图</TabsTrigger>
              </TabsList>

              <TabsContent value="background" className="space-y-2">
                <div className="space-y-2">
                  <Button
                    type="button"
                    onClick={handleGenerateImage}
                    disabled={!formData.description || generatingImage || loading}
                    className="w-full"
                  >
                    {generatingImage ? '生成中...' : '生成场景背景图'}
                  </Button>
                </div>

                {/* 生成的背景图选择 */}
                {generatedImages.length > 0 && (
                  <div className="space-y-2">
                    <Label>选择背景图</Label>
                    <div className="grid grid-cols-2 gap-4">
                      {generatedImages.map((imageUrl, index) => (
                        <div
                          key={index}
                          className={`relative aspect-video rounded-lg overflow-hidden cursor-pointer border-2 transition-all ${
                            selectedBackground === imageUrl
                              ? 'border-primary ring-2 ring-primary'
                              : 'border-gray-200 hover:border-gray-300'
                          }`}
                          onClick={() => setSelectedBackground(imageUrl)}
                        >
                          <img
                            src={imageUrl}
                            alt={`背景图 ${index + 1}`}
                            className="w-full h-full object-cover"
                          />
                          {selectedBackground === imageUrl && (
                            <div className="absolute top-2 right-2 bg-primary text-primary-foreground rounded-full w-6 h-6 flex items-center justify-center text-xs">
                              ✓
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </TabsContent>

              <TabsContent value="reference" className="space-y-2">
                <div className="space-y-2">
                  <Button
                    type="button"
                    onClick={handleGenerateImage}
                    disabled={!formData.description || generatingImage || loading}
                    className="w-full"
                  >
                    {generatingImage ? '生成中...' : '生成场景参考图'}
                  </Button>
                  <p className="text-xs text-gray-500">
                    参考图将用于后续分镜生成时保持场景风格一致
                  </p>
                </div>

                {/* 生成的参考图选择 */}
                {generatedImages.length > 0 && (
                  <div className="space-y-2">
                    <Label>选择参考图</Label>
                    <div className="grid grid-cols-2 gap-4">
                      {generatedImages.map((imageUrl, index) => (
                        <div
                          key={index}
                          className={`relative aspect-video rounded-lg overflow-hidden cursor-pointer border-2 transition-all ${
                            selectedReferenceImage === imageUrl
                              ? 'border-primary ring-2 ring-primary'
                              : 'border-gray-200 hover:border-gray-300'
                          }`}
                          onClick={() => setSelectedReferenceImage(imageUrl)}
                        >
                          <img
                            src={imageUrl}
                            alt={`参考图 ${index + 1}`}
                            className="w-full h-full object-cover"
                          />
                          {selectedReferenceImage === imageUrl && (
                            <div className="absolute top-2 right-2 bg-primary text-primary-foreground rounded-full w-6 h-6 flex items-center justify-center text-xs">
                              ✓
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </TabsContent>
            </Tabs>

            {/* 提交按钮 */}
            <div className="flex gap-2 pt-4">
              <Button type="submit" disabled={loading || (!formData.name && !formData.description)}>
                {loading ? '创建中...' : '创建场景'}
              </Button>
              <Link href={`/scripts/${params.id}?tab=scenes`}>
                <Button type="button" variant="outline" disabled={loading}>
                  取消
                </Button>
              </Link>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
