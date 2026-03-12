'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';

interface Scene {
  id: string;
  scriptId: string;
  name: string;
  description: string | null;
  backgroundUrl: string | null;
  referenceImageUrl: string | null;
  createdAt: string;
}

interface Script {
  id: string;
  title: string;
}

export default function SceneLibraryPage() {
  const params = useParams();
  const router = useRouter();
  const [scenes, setScenes] = useState<Array<Scene & { scriptTitle: string }>>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    fetchAllScenes();
  }, []);

  const fetchAllScenes = async () => {
    try {
      const response = await fetch('/api/scripts');
      const result = await response.json();

      if (result.success) {
        const scripts: Script[] = result.data;
        const allScenes: Array<Scene & { scriptTitle: string }> = [];

        // 获取每个剧本的场景
        for (const script of scripts) {
          const sceneResponse = await fetch(`/api/scenes?scriptId=${script.id}`);
          const sceneResult = await sceneResponse.json();

          if (sceneResult.success) {
            const scenesWithScriptTitle = sceneResult.data.map((scene: Scene) => ({
              ...scene,
              scriptTitle: script.title,
            }));
            allScenes.push(...scenesWithScriptTitle);
          }
        }

        setScenes(allScenes);
      }
    } catch (error) {
      console.error('Error fetching scenes:', error);
    } finally {
      setLoading(false);
    }
  };

  const filteredScenes = scenes.filter(scene =>
    scene.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    (scene.description && scene.description.toLowerCase().includes(searchQuery.toLowerCase())) ||
    scene.scriptTitle.toLowerCase().includes(searchQuery.toLowerCase())
  );

  if (loading) {
    return (
      <div className="container mx-auto py-6">
        <div className="text-center">加载中...</div>
      </div>
    );
  }

  return (
    <div className="container mx-auto py-6 max-w-6xl">
      <div className="mb-6">
        <Link href={`/scripts/${params.id}?tab=scenes`}>
          <Button variant="ghost">← 返回场景管理</Button>
        </Link>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>全局场景库</CardTitle>
          <CardDescription>浏览所有剧本中的场景，获取灵感和参考</CardDescription>
        </CardHeader>
        <CardContent>
          {/* 搜索框 */}
          <div className="mb-6">
            <Input
              placeholder="搜索场景名称、描述或剧本..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="max-w-md"
            />
          </div>

          {/* 场景列表 */}
          {filteredScenes.length === 0 ? (
            <div className="text-center py-12 text-gray-500">
              {searchQuery ? '没有找到匹配的场景' : '暂无场景'}
            </div>
          ) : (
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
              {filteredScenes.map((scene) => (
                <Card key={scene.id} className="overflow-hidden">
                  <div className="aspect-video bg-gray-100 relative">
                    {scene.backgroundUrl ? (
                      <img
                        src={scene.backgroundUrl}
                        alt={scene.name}
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-gray-400">
                        <span className="text-4xl">🎬</span>
                      </div>
                    )}

                    {/* 参考图指示器 */}
                    {scene.referenceImageUrl && (
                      <div className="absolute top-2 right-2 bg-black/60 text-white text-xs px-2 py-1 rounded-full flex items-center gap-1">
                        <span>🖼️</span>
                        <span>参考图</span>
                      </div>
                    )}
                  </div>
                  <CardContent className="pt-4">
                    <h3 className="font-semibold text-lg mb-1">{scene.name}</h3>
                    <p className="text-xs text-gray-500 mb-2">{scene.scriptTitle}</p>
                    {scene.description && (
                      <p className="text-sm text-gray-600 line-clamp-2 mb-3">
                        {scene.description}
                      </p>
                    )}
                    <div className="flex gap-2">
                      <Button variant="outline" size="sm" asChild>
                        <Link href={`/scripts/${scene.scriptId}?tab=scenes`}>
                          查看详情
                        </Link>
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
