'use client';

import { useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { CHARACTER_TEMPLATES, CHARACTER_CATEGORIES, searchCharacterTemplates, getCharacterTemplatesByCategory, CharacterTemplate } from '@/lib/characterTemplates';
import { useAlert } from '@/lib/alert-context';

export default function CharacterLibraryPage() {
  const params = useParams();
  const router = useRouter();
  const { showError } = useAlert();
  const [searchKeyword, setSearchKeyword] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [loading, setLoading] = useState(false);

  // 过滤角色模板
  const filteredTemplates = (() => {
    let templates = CHARACTER_TEMPLATES;

    // 按分类过滤
    if (selectedCategory !== 'all') {
      templates = getCharacterTemplatesByCategory(selectedCategory);
    }

    // 按关键词搜索
    if (searchKeyword) {
      templates = searchCharacterTemplates(searchKeyword).filter(t =>
        selectedCategory === 'all' || t.category === selectedCategory
      );
    }

    return templates;
  })();

  const handleUseTemplate = async (template: CharacterTemplate) => {
    setLoading(true);

    try {
      const response = await fetch('/api/characters', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          scriptId: params.id,
          name: template.name,
          description: template.description,
          appearance: template.appearance,
          personality: template.personality,
          avatarUrl: null,
          voiceStyle: template.defaultVoiceStyle,
          voiceSpeed: template.defaultVoiceSpeed || 0,
          voiceEmotion: template.defaultVoiceEmotion || 'neutral',
        }),
      });

      const result = await response.json();

      if (result.success) {
        router.push(`/scripts/${params.id}?tab=characters`);
      } else {
        showError('创建角色失败', '错误');
      }
    } catch (error) {
      console.error('Error creating character:', error);
      showError('创建角色失败', '错误');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-6xl mx-auto py-6">
      {/* 头部 */}
      <div className="mb-6">
        <Button variant="ghost" onClick={() => router.back()} className="mb-4">
          ← 返回
        </Button>
        <h1 className="text-3xl font-bold text-gray-900">全局角色库</h1>
        <p className="text-gray-600 mt-1">选择预设角色模板快速创建角色</p>
      </div>

      {/* 搜索和过滤 */}
      <div className="flex gap-4 mb-6">
        <div className="flex-1">
          <Input
            placeholder="搜索角色..."
            value={searchKeyword}
            onChange={(e) => setSearchKeyword(e.target.value)}
          />
        </div>
        <div className="w-48">
          <Select value={selectedCategory} onValueChange={setSelectedCategory}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">全部分类</SelectItem>
              {CHARACTER_CATEGORIES.map((cat) => (
                <SelectItem key={cat.value} value={cat.value}>
                  {cat.icon} {cat.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* 角色模板列表 */}
      <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
        {filteredTemplates.map((template) => (
          <Card key={template.id} className="hover:shadow-lg transition-shadow">
            <CardHeader>
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-2">
                  <span className="text-2xl">{template.icon}</span>
                  <CardTitle className="text-lg">{template.name}</CardTitle>
                </div>
                <Badge variant="outline" className="text-xs">
                  {CHARACTER_CATEGORIES.find(c => c.value === template.category)?.label}
                </Badge>
              </div>
              <CardDescription>{template.description}</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="text-xs text-gray-500">
                <div className="font-medium mb-1">外观:</div>
                <div className="line-clamp-2">{template.appearance}</div>
              </div>
              <div className="text-xs text-gray-500">
                <div className="font-medium mb-1">性格:</div>
                <div className="line-clamp-2">{template.personality}</div>
              </div>
              <div className="flex flex-wrap gap-1">
                {template.tags.map((tag) => (
                  <Badge key={tag} variant="secondary" className="text-xs">
                    {tag}
                  </Badge>
                ))}
              </div>
              {template.defaultVoiceStyle && (
                <div className="text-xs text-gray-500">
                  <div className="font-medium mb-1">语音配置:</div>
                  <div>音色: {template.defaultVoiceStyle}</div>
                  {template.defaultVoiceSpeed !== undefined && (
                    <div>语速: {template.defaultVoiceSpeed}</div>
                  )}
                  {template.defaultVoiceEmotion && (
                    <div>情绪: {template.defaultVoiceEmotion}</div>
                  )}
                </div>
              )}
              <Button
                onClick={() => handleUseTemplate(template)}
                disabled={loading}
                className="w-full"
              >
                使用此角色
              </Button>
            </CardContent>
          </Card>
        ))}
      </div>

      {filteredTemplates.length === 0 && (
        <div className="text-center py-12 bg-gray-50 rounded-lg">
          <p className="text-gray-500">没有找到匹配的角色模板</p>
        </div>
      )}
    </div>
  );
}
