'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter, usePathname, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Checkbox } from '@/components/ui/checkbox';
import { Progress } from '@/components/ui/progress';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { useShortcuts, COMMON_SHORTCUTS } from '@/hooks/useShortcuts';
import { DragDropContext, Droppable, Draggable, DropResult } from '@hello-pangea/dnd';
import { getTransitionLabel } from '@/lib/transitionOptions';
import { EditStoryboardDialog } from '@/components/edit-storyboard-dialog';
import { ImagePreviewDialog } from '@/components/image-preview-dialog';
import { VideoSettingsDialog, VideoSettings, DEFAULT_VIDEO_SETTINGS } from '@/components/video-settings-dialog';
import { useAlert } from '@/lib/alert-context';

interface Script {
  id: string;
  title: string;
  type: string;
  description: string | null;
  storyContent: string | null;
  fullVideoUrl: string | null;
  createdAt: string;
  updatedAt: string | null;
}

interface Character {
  id: string;
  name: string;
  description: string | null;
  appearance: string | null;
  personality: string | null;
  avatarUrl: string | null;
  frontViewUrl?: string | null;
  sideViewUrl?: string | null;
  threeQuarterViewUrl?: string | null;
  createdAt: string;
  voiceStyle?: string | null;
  voiceSpeed?: number | null;
  voiceEmotion?: string | null;
}

interface Scene {
  id: string;
  scriptId: string;
  name: string;
  description: string | null;
  backgroundUrl: string | null;
  referenceImageUrl: string | null;
  createdAt: string;
}

function CharacterList({ scriptId, returnUrl, refreshKey }: { scriptId: string; returnUrl?: string; refreshKey?: number }) {
  const [characters, setCharacters] = useState<Character[]>([]);
  const [loading, setLoading] = useState(true);
  const [regeneratingAvatar, setRegeneratingAvatar] = useState<Record<string, boolean>>({});
  const { showSuccess, showError, showConfirm, showWarning } = useAlert();

  useEffect(() => {
    fetchCharacters();
  }, [scriptId, refreshKey]);

  const fetchCharacters = async () => {
    try {
      const response = await fetch(`/api/characters?scriptId=${scriptId}`);
      const result = await response.json();

      if (result.success) {
        setCharacters(result.data);
      }
    } catch (error) {
      console.error('Error fetching characters:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleRegenerateAvatar = async (characterId: string) => {
    showConfirm({
      title: '重新生成角色形象',
      message: '确定要重新生成这个角色的形象吗？这将替换当前的形象图片。',
      onConfirm: async () => {
        await performRegenerateAvatar(characterId);
      },
    });
  };

  const performRegenerateAvatar = async (characterId: string) => {
    setRegeneratingAvatar(prev => ({ ...prev, [characterId]: true }));

    try {
      const character = characters.find(c => c.id === characterId);
      if (!character || !character.appearance) {
        showError('角色外观信息缺失');
        return;
      }

      const response = await fetch('/api/characters/generate-images', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ appearance: character.appearance, count: 1 }),
      });

      const result = await response.json();

      if (result.success && result.data.length > 0) {
        // 更新角色的头像
        const updateResponse = await fetch(`/api/characters/${characterId}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ avatarUrl: result.data[0].fileKey }),
        });

        const updateResult = await updateResponse.json();

        if (updateResult.success) {
          await fetchCharacters();
          showSuccess('角色形象重新生成成功！');
        } else {
          showWarning('生成失败了，请稍后再试一下~', '提示');
        }
      } else {
        showWarning('生成失败了，请稍后再试一下~', '提示');
      }
    } catch (error) {
      console.error('Error regenerating avatar:', error);
      showWarning('生成失败了，请稍后再试一下~', '提示');
    } finally {
      setRegeneratingAvatar(prev => ({ ...prev, [characterId]: false }));
    }
  };

  const deleteCharacter = async (id: string) => {
    showConfirm({
      title: '删除角色',
      message: '确定要删除这个角色吗？',
      onConfirm: async () => {
        try {
          const response = await fetch(`/api/characters/${id}`, {
            method: 'DELETE',
          });
          const result = await response.json();

          if (result.success) {
            setCharacters(characters.filter(c => c.id !== id));
            showSuccess('角色删除成功');
          } else {
            showError('删除失败');
          }
        } catch (error) {
          console.error('Error deleting character:', error);
          showError('删除失败');
        }
      },
    });
  };

  if (loading) {
    return <div className="text-center py-8 text-gray-500">加载中...</div>;
  }

  if (characters.length === 0) {
    return (
      <div className="text-center py-8">
        <p className="text-gray-500 mb-4">暂无角色</p>
        <Link href={`/scripts/${scriptId}/characters/create`}>
          <Button>创建第一个角色</Button>
        </Link>
      </div>
    );
  }

  return (
    <div className="grid md:grid-cols-2 gap-4">
      {characters.map((character) => {
        // 检查是否有三视图
        const hasThreeView = character.frontViewUrl || character.sideViewUrl || character.threeQuarterViewUrl;
        const displayUrl = character.threeQuarterViewUrl || character.frontViewUrl || character.avatarUrl;
        
        return (
          <Card key={character.id}>
            <CardContent className="pt-6">
              <div className="flex gap-4">
                {/* 角色形象 - 展示三视图 */}
                <div className="flex-shrink-0">
                  {hasThreeView ? (
                    // 有三视图时，展示三个视角
                    <div className="flex gap-1">
                      {character.frontViewUrl && (
                        <img
                          src={character.frontViewUrl}
                          alt={`${character.name} - 正面`}
                          className="w-16 h-24 object-cover rounded-lg border border-gray-200"
                          title="正面视角"
                        />
                      )}
                      {character.sideViewUrl && (
                        <img
                          src={character.sideViewUrl}
                          alt={`${character.name} - 侧面`}
                          className="w-16 h-24 object-cover rounded-lg border border-gray-200"
                          title="侧面视角"
                        />
                      )}
                      {character.threeQuarterViewUrl && (
                        <img
                          src={character.threeQuarterViewUrl}
                          alt={`${character.name} - 四分之三`}
                          className="w-16 h-24 object-cover rounded-lg border border-gray-200"
                          title="四分之三视角"
                        />
                      )}
                    </div>
                  ) : displayUrl ? (
                    // 没有三视图但有头像时，显示头像
                    <img
                      src={displayUrl}
                      alt={character.name}
                      className="w-24 h-24 object-cover rounded-lg border-2 border-gray-200"
                    />
                  ) : (
                    <div className="w-24 h-24 bg-gray-100 rounded-lg flex items-center justify-center border-2 border-dashed border-gray-300">
                      <span className="text-3xl">👤</span>
                    </div>
                  )}
                </div>

                {/* 角色信息 */}
                <div className="flex-1 min-w-0">
                  <h3 className="font-semibold text-lg mb-2">{character.name}</h3>

                  {/* 三视图指示器 */}
                  {hasThreeView && (
                    <div className="flex gap-1 mb-2">
                      {character.frontViewUrl && (
                        <Badge variant="secondary" className="text-xs bg-blue-100 text-blue-700">正面</Badge>
                      )}
                      {character.sideViewUrl && (
                        <Badge variant="secondary" className="text-xs bg-green-100 text-green-700">侧面</Badge>
                      )}
                      {character.threeQuarterViewUrl && (
                        <Badge variant="secondary" className="text-xs bg-purple-100 text-purple-700">四分之三</Badge>
                      )}
                    </div>
                  )}

                  {character.appearance && (
                    <p className="text-sm text-gray-600 mb-2 line-clamp-2">
                      {character.appearance}
                    </p>
                  )}

                  {/* 语音配置 */}
                  {character.voiceStyle && (
                    <div className="flex gap-1 mb-2">
                      <Badge variant="outline" className="text-xs">
                        {(character.voiceSpeed ?? 0) > 0 ? `+${character.voiceSpeed}` : character.voiceSpeed ?? 0} 语速
                      </Badge>
                      <Badge variant="outline" className="text-xs">
                        {character.voiceEmotion}
                      </Badge>
                    </div>
                  )}

                  {/* 操作按钮 */}
                  <div className="flex gap-2 mt-3">
                    <Link href={`/scripts/${scriptId}/characters/${character.id}/edit${returnUrl ? `?returnUrl=${encodeURIComponent(returnUrl)}` : ''}`}>
                      <Button variant="outline" size="sm">
                        编辑
                      </Button>
                    </Link>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleRegenerateAvatar(character.id)}
                      disabled={regeneratingAvatar[character.id]}
                    >
                      {regeneratingAvatar[character.id] ? '生成中...' : '重新生成形象'}
                    </Button>
                    <Button
                      variant="destructive"
                      size="sm"
                      onClick={() => deleteCharacter(character.id)}
                    >
                      删除
                    </Button>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}

function SceneList({ scriptId, returnUrl, refreshKey }: { scriptId: string; returnUrl?: string; refreshKey?: number }) {
  const [scenes, setScenes] = useState<Scene[]>([]);
  const [loading, setLoading] = useState(true);
  const { showSuccess, showError, showConfirm } = useAlert();

  useEffect(() => {
    fetchScenes();
  }, [scriptId, refreshKey]);

  const fetchScenes = async () => {
    try {
      const response = await fetch(`/api/scenes?scriptId=${scriptId}`);
      const result = await response.json();

      if (result.success) {
        setScenes(result.data);
      }
    } catch (error) {
      console.error('Error fetching scenes:', error);
    } finally {
      setLoading(false);
    }
  };

  const deleteScene = async (id: string) => {
    showConfirm({
      title: '删除场景',
      message: '确定要删除这个场景吗？',
      onConfirm: async () => {
        try {
          const response = await fetch(`/api/scenes/${id}`, {
            method: 'DELETE',
          });
          const result = await response.json();

          if (result.success) {
            setScenes(scenes.filter(s => s.id !== id));
            showSuccess('场景删除成功');
          } else {
            showError('删除失败');
          }
        } catch (error) {
          console.error('Error deleting scene:', error);
          showError('删除失败');
        }
      },
    });
  };

  if (loading) {
    return <div className="text-center py-8 text-gray-500">加载中...</div>;
  }

  if (scenes.length === 0) {
    return (
      <div className="text-center py-8">
        <p className="text-gray-500 mb-4">暂无场景</p>
        <Link href={`/scripts/${scriptId}/scenes/create`}>
          <Button>创建第一个场景</Button>
        </Link>
      </div>
    );
  }

  return (
    <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
      {scenes.map((scene) => (
        <Card key={scene.id}>
          <CardContent className="pt-6">
            {/* 场景背景图 */}
            <div className="aspect-video bg-gray-100 rounded-lg overflow-hidden mb-4 relative">
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

            {/* 场景信息 */}
            <div className="space-y-2">
              <h3 className="font-semibold text-lg">{scene.name}</h3>

              {scene.description && (
                <p className="text-sm text-gray-600 line-clamp-2">
                  {scene.description}
                </p>
              )}

              {/* 操作按钮 */}
              <div className="flex gap-2 pt-2">
                <Link href={`/scripts/${scriptId}/scenes/${scene.id}/edit${returnUrl ? `?returnUrl=${encodeURIComponent(returnUrl)}` : ''}`}>
                  <Button variant="outline" size="sm">
                    编辑
                  </Button>
                </Link>
                <Button
                  variant="destructive"
                  size="sm"
                  onClick={() => deleteScene(scene.id)}
                >
                  删除
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}

export default function ScriptDetailPage() {
  const params = useParams();
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const currentUrl = `${pathname}?${searchParams.toString()}`;

  const [script, setScript] = useState<Script | null>(null);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(false);
  const [formData, setFormData] = useState({
    title: '',
    type: '',
    description: '',
    storyContent: '',
  });

  const [generatingFullVideo, setGeneratingFullVideo] = useState(false);
  const [regeneratingAll, setRegeneratingAll] = useState(false);
  const [regeneratingAllCharacters, setRegeneratingAllCharacters] = useState(false);
  const [regeneratingAllScenes, setRegeneratingAllScenes] = useState(false);
  const [regenerateProgress, setRegenerateProgress] = useState<{
    step: string;
    message: string;
    progress: number;
    steps?: Array<{ name: string; status: 'pending' | 'in_progress' | 'completed'; detail?: string }>;
  }>({
    step: '',
    message: '',
    progress: 0,
  });

  const [videoGenerationProgress, setVideoGenerationProgress] = useState<{
    storyboardId: string | null;
    startTime: number | null;
  }>({
    storyboardId: null,
    startTime: null,
  });

  // 刷新键，用于强制子组件重新加载数据
  const [refreshKey, setRefreshKey] = useState(0);

  // 视频设置状态
  const [videoSettings, setVideoSettings] = useState<VideoSettings>(DEFAULT_VIDEO_SETTINGS);
  const [showVideoSettings, setShowVideoSettings] = useState(false);

  const { showSuccess, showError, showConfirm, showInfo, showWarning } = useAlert();

  useEffect(() => {
    fetchScript();
  }, [params.id]);

  const fetchScript = async () => {
    try {
      const response = await fetch(`/api/scripts/${params.id}`);
      const result = await response.json();

      if (result.success) {
        setScript(result.data);
        setFormData({
          title: result.data.title,
          type: result.data.type,
          description: result.data.description || '',
          storyContent: result.data.storyContent || '',
        });
      } else {
        showError('剧本不存在', '错误');
        router.push('/scripts');
      }
    } catch (error) {
      console.error('Error fetching script:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleUpdate = async (e: React.FormEvent) => {
    e.preventDefault();

    try {
      const response = await fetch(`/api/scripts/${params.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(formData),
      });

      const result = await response.json();

      if (result.success) {
        setScript(result.data);
        setEditing(false);
        showSuccess('剧本更新成功');
      } else {
        showError('更新失败');
      }
    } catch (error) {
      console.error('Error updating script:', error);
      showError('更新失败');
    }
  };

  const handleGenerateFullVideo = async () => {
    if (!script) {
      showError('剧本信息未加载');
      return;
    }

    showConfirm({
      title: '生成完整视频',
      message: '确定要生成完整视频吗？这可能需要几分钟时间。',
      onConfirm: async () => {
        await performGenerateFullVideo();
      },
    });
  };

  const performGenerateFullVideo = async () => {
    if (!script) return;

    setGeneratingFullVideo(true);

    try {
      const response = await fetch(`/api/scripts/${script.id}/generate-full-video`, {
        method: 'POST',
      });

      const result = await response.json();

      if (result.success) {
        // 重新获取剧本信息
        await fetchScript();
        showSuccess('完整视频生成成功！');
      } else {
        showWarning('生成失败了，请稍后再试一下~', '提示');
      }
    } catch (error) {
      console.error('Error generating full video:', error);
      showWarning('生成失败了，请稍后再试一下~', '提示');
    } finally {
      setGeneratingFullVideo(false);
    }
  };

  const handleRegenerateFullVideo = async () => {
    if (!script) {
      showError('剧本信息未加载');
      return;
    }

    showConfirm({
      title: '重新生成完整视频',
      message: '确定要重新生成完整视频吗？这将覆盖之前生成的视频。',
      onConfirm: async () => {
        await performRegenerateFullVideo();
      },
    });
  };

  const performRegenerateFullVideo = async () => {
    if (!script) return;

    setGeneratingFullVideo(true);

    try {
      const response = await fetch(`/api/scripts/${script.id}/regenerate-full-video`, {
        method: 'POST',
      });

      const result = await response.json();

      if (result.success) {
        // 重新获取剧本信息
        await fetchScript();
        showSuccess('完整视频重新生成成功！');
      } else {
        showWarning('生成失败了，请稍后再试一下~', '提示');
      }
    } catch (error) {
      console.error('Error regenerating full video:', error);
      showWarning('生成失败了，请稍后再试一下~', '提示');
    } finally {
      setGeneratingFullVideo(false);
    }
  };

  const handleRegenerateBasicInfo = async () => {
    if (!script) {
      showError('剧本信息未加载');
      return;
    }

    showConfirm({
      title: '重新生成基本信息',
      message: '确定要重新生成剧本的基本信息吗？\n\n这将重新生成剧本的标题、类型和描述，但不会修改故事内容的核心情节。',
      onConfirm: async () => {
        await performRegenerateBasicInfo();
      },
    });
  };

  const performRegenerateBasicInfo = async () => {
    if (!script) return;

    setRegeneratingAll(true);

    try {
      const response = await fetch(`/api/scripts/${script.id}/regenerate-basic-info`, {
        method: 'POST',
      });

      const result = await response.json();

      if (result.success) {
        // 重新获取剧本信息
        await fetchScript();
        showSuccess('基本信息重新生成成功！');
      } else {
        showWarning('生成失败了，请稍后再试一下~', '提示');
      }
    } catch (error) {
      console.error('Error regenerating basic info:', error);
      showWarning('生成失败了，请稍后再试一下~', '提示');
    } finally {
      setRegeneratingAll(false);
    }
  };

  const handleRegenerateAllCharacters = async () => {
    if (!script) {
      showError('剧本信息未加载');
      return;
    }

    showConfirm({
      title: '重新生成所有角色',
      message: '确定要重新生成所有角色吗？\n\n这将删除现有的所有角色，并根据剧本内容重新识别和生成角色。',
      onConfirm: async () => {
        await performRegenerateAllCharacters();
      },
    });
  };

  const performRegenerateAllCharacters = async () => {
    if (!script) return;

    setRegeneratingAllCharacters(true);

    try {
      const response = await fetch(`/api/scripts/${script.id}/regenerate-all-characters`, {
        method: 'POST',
      });

      const result = await response.json();

      if (result.success) {
        showSuccess(`成功重新生成 ${result.data.length} 个角色！`);
        // 重新获取角色列表（使用全局组件的内部刷新机制）
        window.location.reload();
      } else {
        showWarning('生成失败了，请稍后再试一下~', '提示');
      }
    } catch (error) {
      console.error('Error regenerating all characters:', error);
      showWarning('生成失败了，请稍后再试一下~', '提示');
    } finally {
      setRegeneratingAllCharacters(false);
    }
  };

  const handleRegenerateAllScenes = async () => {
    showConfirm({
      title: '重新生成所有场景',
      message: '确定要重新生成所有场景吗？\n\n这将删除现有的所有场景，并根据剧本内容重新识别和生成场景。',
      onConfirm: async () => {
        if (!script) {
          showError('剧本信息未加载', '错误');
          return;
        }

        setRegeneratingAllScenes(true);

        try {
          const response = await fetch(`/api/scripts/${script.id}/regenerate-all-scenes`, {
            method: 'POST',
          });

          const result = await response.json();

          if (result.success) {
            showSuccess(`成功重新生成 ${result.data.length} 个场景！`, '成功');
            // 重新获取场景列表（使用全局组件的内部刷新机制）
            window.location.reload();
          } else {
            showWarning('生成失败了，请稍后再试一下~', '提示');
          }
        } catch (error) {
          console.error('Error regenerating all scenes:', error);
          showWarning('生成失败了，请稍后再试一下~', '提示');
        } finally {
          setRegeneratingAllScenes(false);
        }
      },
    });
  };

  const handleRegenerateAll = async () => {
    showConfirm({
      title: '全部重新生成',
      message: '确定要全部重新生成吗？这将删除所有现有的角色、场景、分镜，并重新生成全新的内容。\n\n⚠️ 此操作不可逆！',
      onConfirm: async () => {
        if (!script) {
          showError('剧本信息未加载', '错误');
          return;
        }

        if (!script.storyContent) {
          showError('剧本故事内容为空，无法重新生成', '错误');
          return;
        }

        setRegeneratingAll(true);
        setRegenerateProgress({
          step: 'init',
          message: '开始重新生成...',
          progress: 0,
        });

        try {
          const response = await fetch(`/api/scripts/${script.id}/regenerate-all`, {
            method: 'POST',
          });

          if (!response.ok) {
            throw new Error('Failed to start regeneration');
          }

          // 处理流式响应
          const reader = response.body?.getReader();
          const decoder = new TextDecoder();

          if (!reader) {
            throw new Error('No response body');
          }

          while (true) {
            const { done, value } = await reader.read();
            if (done) break;

            const chunk = decoder.decode(value);
            const lines = chunk.split('\n');

            for (const line of lines) {
              if (line.startsWith('data: ')) {
                const data = line.slice(6);
                try {
                  const progress = JSON.parse(data);
                  
                  if (progress.step === 'error') {
                    showWarning('生成失败了，请稍后再试一下~', '提示');
                    return;
                  }

                  if (progress.step === 'complete') {
                    showSuccess('全部重新生成完成！', '成功');
                    // 重新获取数据
                    await fetchScript();
                    // 强制子组件重新加载
                    setRefreshKey(prev => prev + 1);
                    setRegeneratingAll(false);
                    return;
                  }

                  setRegenerateProgress({
                    step: progress.step,
                    message: progress.message,
                    progress: progress.progress,
                    steps: progress.steps,
                  });
                } catch (e) {
                  console.error('Failed to parse progress:', e);
                }
              }
            }
          }
        } catch (error) {
          console.error('Error regenerating all:', error);
          showWarning('生成失败了，请稍后再试一下~', '提示');
        } finally {
          setRegeneratingAll(false);
        }
      },
    });
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center py-12">
        <div className="text-lg text-gray-600">加载中...</div>
      </div>
    );
  }

  if (!script) {
    return null;
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-start">
        <div>
          <Link href="/scripts" className="text-blue-600 hover:text-blue-700 text-sm">
            ← 返回剧本列表
          </Link>
          <h1 className="text-3xl font-bold text-gray-900 mt-2">{script.title}</h1>
          <p className="text-gray-600 mt-1">
            <Badge>{script.type}</Badge>
          </p>
        </div>
        <div className="flex gap-2">
          <Button
            variant="outline"
            onClick={() => setShowVideoSettings(true)}
            title="视频生成设置"
          >
            ⚙️ 视频设置
          </Button>
          {!editing && (
            <Button onClick={() => setEditing(true)}>编辑剧本</Button>
          )}
        </div>
      </div>

      {/* 重新生成进度提示 */}
      {regeneratingAll && (
        <Card className="bg-orange-50 border-orange-200">
          <CardContent className="pt-6">
            <div className="flex items-center gap-4">
              <div className="flex-1">
                <p className="font-medium text-orange-900 mb-2">🔄 {regenerateProgress.message}</p>
                <Progress value={regenerateProgress.progress} className="h-2" />
                {regenerateProgress.steps && (
                  <div className="mt-3 space-y-1">
                    {regenerateProgress.steps.map((step, index) => (
                      <div key={index} className="flex items-center gap-2 text-sm">
                        {step.status === 'completed' && <span className="text-green-600">✓</span>}
                        {step.status === 'in_progress' && <span className="text-orange-600">⟳</span>}
                        {step.status === 'pending' && <span className="text-gray-400">○</span>}
                        <span className={step.status === 'completed' ? 'text-green-700' : step.status === 'in_progress' ? 'text-orange-700' : 'text-gray-600'}>
                          {step.name}
                          {step.detail && ` - ${step.detail}`}
                        </span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* 视频生成进度提示 */}
      {videoGenerationProgress.storyboardId && videoGenerationProgress.startTime && (
        <Card className="bg-blue-50 border-blue-200">
          <CardContent className="pt-6">
            <div className="flex items-center gap-4">
              <div className="flex-1">
                <p className="font-medium text-blue-900 mb-2">⏳ 正在生成视频...</p>
                <Progress value={50} className="h-2" />
                <p className="text-sm text-blue-700 mt-2">
                  预计剩余时间：约 {Math.max(0, 45 - Math.floor((Date.now() - videoGenerationProgress.startTime) / 1000))} 秒
                </p>
              </div>
              <div className="text-sm text-blue-600">
                AI正在精心制作您的视频，请耐心等待...
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      <Tabs defaultValue="info" className="w-full">
        <TabsList className="grid w-full grid-cols-5">
          <TabsTrigger value="info">基本信息</TabsTrigger>
          <TabsTrigger value="characters">角色管理</TabsTrigger>
          <TabsTrigger value="scenes">场景管理</TabsTrigger>
          <TabsTrigger value="storyboards">分镜管理</TabsTrigger>
          <TabsTrigger value="full-video">完整视频</TabsTrigger>
        </TabsList>

        {/* 基本信息标签 */}
        <TabsContent value="info" className="space-y-4">
          {/* 操作按钮组 */}
          <div className="flex gap-3">
            {!editing && (
              <Button onClick={() => setEditing(true)}>编辑剧本</Button>
            )}
            <Button
              onClick={handleRegenerateBasicInfo}
              disabled={regeneratingAll}
              variant={regeneratingAll ? "secondary" : "default"}
              className={regeneratingAll ? "bg-orange-500 hover:bg-orange-600 text-white" : ""}
            >
              {regeneratingAll ? '重新生成中...' : '🔄 重新生成基本信息'}
            </Button>
          </div>

          {editing ? (
            <Card>
              <CardHeader>
                <CardTitle>编辑剧本</CardTitle>
                <CardDescription>修改剧本信息</CardDescription>
              </CardHeader>
              <CardContent>
                <form onSubmit={handleUpdate} className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="title">剧本标题</Label>
                    <Input
                      id="title"
                      value={formData.title}
                      onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                      required
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="description">剧本描述</Label>
                    <Textarea
                      id="description"
                      value={formData.description}
                      onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                      rows={3}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="storyContent">故事内容</Label>
                    <Textarea
                      id="storyContent"
                      value={formData.storyContent}
                      onChange={(e) => setFormData({ ...formData, storyContent: e.target.value })}
                      rows={8}
                    />
                  </div>

                  <div className="flex gap-3 pt-4">
                    <Button type="submit">保存修改</Button>
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => setEditing(false)}
                    >
                      取消
                    </Button>
                  </div>
                </form>
              </CardContent>
            </Card>
          ) : (
            <div className="grid md:grid-cols-2 gap-6">
              <Card>
                <CardHeader>
                  <CardTitle>剧本信息</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div>
                    <Label className="text-sm text-gray-600">类型</Label>
                    <p className="font-medium">{script.type}</p>
                  </div>
                  <div>
                    <Label className="text-sm text-gray-600">描述</Label>
                    <p className="text-gray-800">{script.description || '暂无描述'}</p>
                  </div>
                  <div>
                    <Label className="text-sm text-gray-600">创建时间</Label>
                    <p className="text-sm text-gray-600">
                      {new Date(script.createdAt).toLocaleString('zh-CN')}
                    </p>
                  </div>
                  {script.updatedAt && (
                    <div>
                      <Label className="text-sm text-gray-600">更新时间</Label>
                      <p className="text-sm text-gray-600">
                        {new Date(script.updatedAt).toLocaleString('zh-CN')}
                      </p>
                    </div>
                  )}
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>故事内容</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-gray-800 whitespace-pre-wrap">
                    {script.storyContent || '暂无故事内容'}
                  </p>
                </CardContent>
              </Card>
            </div>
          )}
        </TabsContent>

        {/* 角色管理标签 */}
        <TabsContent value="characters">
          <Card>
            <CardHeader>
              <div className="flex justify-between items-center">
                <div>
                  <CardTitle>角色管理</CardTitle>
                  <CardDescription>管理剧本中的角色</CardDescription>
                </div>
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    onClick={handleRegenerateAllCharacters}
                    disabled={regeneratingAllCharacters}
                  >
                    {regeneratingAllCharacters ? '重新生成中...' : '🔄 全部重新生成'}
                  </Button>
                  <Link href={`/scripts/${script.id}/characters/library`}>
                    <Button variant="outline">👥 全局角色库</Button>
                  </Link>
                  <Link href={`/scripts/${script.id}/characters/create`}>
                    <Button>添加角色</Button>
                  </Link>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <CharacterList scriptId={script.id} returnUrl={currentUrl} refreshKey={refreshKey} />
            </CardContent>
          </Card>
        </TabsContent>

        {/* 场景管理标签 */}
        <TabsContent value="scenes">
          <Card>
            <CardHeader>
              <div className="flex justify-between items-center">
                <div>
                  <CardTitle>场景管理</CardTitle>
                  <CardDescription>管理剧本中的场景</CardDescription>
                </div>
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    onClick={handleRegenerateAllScenes}
                    disabled={regeneratingAllScenes}
                  >
                    {regeneratingAllScenes ? '重新生成中...' : '🔄 全部重新生成'}
                  </Button>
                  <Link href={`/scripts/${script.id}/scenes/library`}>
                    <Button variant="outline">📚 场景素材库</Button>
                  </Link>
                  <Link href={`/scripts/${script.id}/scenes/create`}>
                    <Button>添加场景</Button>
                  </Link>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <SceneList scriptId={script.id} returnUrl={currentUrl} refreshKey={refreshKey} />
            </CardContent>
          </Card>
        </TabsContent>

        {/* 分镜管理标签 */}
        <TabsContent value="storyboards">
          <Card>
            <CardHeader>
              <div className="flex justify-between items-center">
                <div>
                  <CardTitle>分镜管理</CardTitle>
                  <CardDescription>管理剧本的分镜内容</CardDescription>
                </div>
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    onClick={async () => {
                      try {
                        const response = await fetch('/api/storyboards/fix-sequence', {
                          method: 'POST',
                          headers: { 'Content-Type': 'application/json' },
                          body: JSON.stringify({ scriptId: script.id }),
                        });
                        const data = await response.json();
                        if (data.success) {
                          showSuccess(data.message, '修复成功');
                          setRefreshKey(prev => prev + 1);
                        } else {
                          showError(data.error || '修复失败', '错误');
                        }
                      } catch (error) {
                        showError('修复失败', '错误');
                      }
                    }}
                  >
                    🔢 修复序号
                  </Button>
                  <Button
                    variant="outline"
                    onClick={() => {
                      showConfirm({
                        title: '重新生成分镜',
                        message: '确定要重新生成分镜描述、图片和视频吗？\n\n这将删除现有的所有分镜并重新生成。',
                        onConfirm: () => {
                          handleRegenerateAll();
                        },
                      });
                    }}
                    disabled={regeneratingAll}
                  >
                    {regeneratingAll ? '重新生成中...' : '🔄 全部重新生成'}
                  </Button>
                  <Link href={`/scripts/${script.id}/storyboards/create`}>
                    <Button>生成分镜</Button>
                  </Link>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <StoryboardList scriptId={script.id} videoSettings={videoSettings} refreshKey={refreshKey} />
            </CardContent>
          </Card>
        </TabsContent>

        {/* 完整视频标签 */}
        <TabsContent value="full-video">
          <Card>
            <CardHeader>
              <div className="flex justify-between items-center">
                <div>
                  <CardTitle>完整视频</CardTitle>
                  <CardDescription>将所有分镜拼接成完整漫剧视频</CardDescription>
                </div>
                {!script.fullVideoUrl && (
                  <Button
                    onClick={handleGenerateFullVideo}
                    disabled={generatingFullVideo}
                  >
                    {generatingFullVideo ? '生成中...' : '生成完整视频'}
                  </Button>
                )}
              </div>
            </CardHeader>
            <CardContent>
              {script.fullVideoUrl ? (
                <div className="space-y-4">
                  <div className="aspect-video bg-black rounded-lg overflow-hidden">
                    <video
                      src={script.fullVideoUrl}
                      controls
                      className="w-full h-full"
                      preload="metadata"
                    >
                      您的浏览器不支持视频播放
                    </video>
                  </div>
                  <div className="flex gap-3">
                    <Button variant="outline" onClick={handleRegenerateFullVideo} disabled={generatingFullVideo}>
                      {generatingFullVideo ? '重新生成中...' : '重新生成'}
                    </Button>
                  </div>
                </div>
              ) : generatingFullVideo ? (
                <div className="text-center py-12">
                  <div className="text-lg text-gray-600 mb-2">正在生成完整视频...</div>
                  <p className="text-sm text-gray-500">这可能需要几分钟时间，请耐心等待</p>
                </div>
              ) : (
                <div className="text-center py-12">
                  <p className="text-gray-500 mb-4">还没有生成完整视频</p>
                  <p className="text-sm text-gray-400">请先生成所有分镜的视频，然后点击"生成完整视频"按钮</p>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* 视频设置对话框 */}
      <VideoSettingsDialog
        open={showVideoSettings}
        onOpenChange={setShowVideoSettings}
        settings={videoSettings}
        onSettingsChange={setVideoSettings}
      />
    </div>
  );
}

interface Storyboard {
  id: string;
  sequence: number;
  description: string;
  prompt: string | null;
  dialogue: string | null; // 对话内容（剧情演绎模式）
  speakingCharacterId: string | null; // 说话角色ID
  imageUrl: string | null;
  videoUrl: string | null;
  audioUrl: string | null;
  isGenerated: boolean;
  createdAt: string;
  duration: number | null;
  transitionType: string | null;
  characterIds: string | null;
  sceneId: string | null;
}

function StoryboardList({ scriptId, videoSettings, refreshKey }: { scriptId: string; videoSettings: VideoSettings; refreshKey?: number }) {
  const [storyboards, setStoryboards] = useState<Storyboard[]>([]);
  const [loading, setLoading] = useState(true);
  const [regeneratingImage, setRegeneratingImage] = useState<Record<string, boolean>>({});
  const [regeneratingVideo, setRegeneratingVideo] = useState<Record<string, boolean>>({});
  const [isAnyVideoGenerating, setIsAnyVideoGenerating] = useState(false); // 全局视频生成锁
  const [regenerateSuccess, setRegenerateSuccess] = useState<Record<string, { type: 'image' | 'video', fileName: string, timestamp: number }>>({});
  const [videoGenerationProgress, setVideoGenerationProgress] = useState<{
    storyboardId: string | null;
    startTime: number | null;
  }>({
    storyboardId: null,
    startTime: null,
  });
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [selectAll, setSelectAll] = useState(false);
  const [batchActionLoading, setBatchActionLoading] = useState(false);
  
  // 批量生成视频状态
  const [batchGeneratingVideos, setBatchGeneratingVideos] = useState(false);
  const [batchVideoProgress, setBatchVideoProgress] = useState<{
    current: number;
    total: number;
    message: string;
    successCount: number;
    failCount: number;
  } | null>(null);
  
  const [editingStoryboard, setEditingStoryboard] = useState<Storyboard | null>(null);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [imagePreviewOpen, setImagePreviewOpen] = useState(false);
  const [previewImageUrl, setPreviewImageUrl] = useState<string | null>(null);
  const [characters, setCharacters] = useState<Character[]>([]);
  const [scenes, setScenes] = useState<Scene[]>([]);
  const { showSuccess, showError, showConfirm, showWarning } = useAlert();

  useEffect(() => {
    fetchStoryboards();
    fetchCharacters();
    fetchScenes();
  }, [scriptId, refreshKey]);

  const fetchCharacters = async () => {
    try {
      const response = await fetch(`/api/characters?scriptId=${scriptId}`);
      const result = await response.json();
      if (result.success) {
        setCharacters(result.data);
      }
    } catch (error) {
      console.error('Error fetching characters:', error);
    }
  };

  const fetchScenes = async () => {
    try {
      const response = await fetch(`/api/scenes?scriptId=${scriptId}`);
      const result = await response.json();
      if (result.success) {
        setScenes(result.data);
      }
    } catch (error) {
      console.error('Error fetching scenes:', error);
    }
  };

  // 快捷键支持
  useShortcuts([
    {
      ...COMMON_SHORTCUTS.SELECT_ALL,
      handler: () => {
        if (storyboards.length > 0) {
          handleSelectAll(!selectAll);
        }
      },
    },
    {
      ...COMMON_SHORTCUTS.DELETE,
      handler: () => {
        if (selectedIds.size > 0) {
          handleBatchDelete();
        }
      },
    },
  ]);

  const fetchStoryboards = async () => {
    try {
      const response = await fetch(`/api/storyboards?scriptId=${scriptId}`);
      const result = await response.json();

      if (result.success) {
        setStoryboards(result.data);
      }
    } catch (error) {
      console.error('Error fetching storyboards:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSelectAll = (checked: boolean) => {
    setSelectAll(checked);
    if (checked) {
      setSelectedIds(new Set(storyboards.map(s => s.id)));
    } else {
      setSelectedIds(new Set());
    }
  };

  const handleSelectOne = (id: string, checked: boolean) => {
    const newSelected = new Set(selectedIds);
    if (checked) {
      newSelected.add(id);
    } else {
      newSelected.delete(id);
    }
    setSelectedIds(newSelected);
    setSelectAll(newSelected.size === storyboards.length);
  };

  const handleBatchDelete = async () => {
    if (selectedIds.size === 0) {
      showError('请先选择要删除的分镜', '提示');
      return;
    }

    showConfirm({
      title: '批量删除分镜',
      message: `确定要删除选中的 ${selectedIds.size} 个分镜吗？`,
      onConfirm: async () => {
        setBatchActionLoading(true);

        try {
          const response = await fetch('/api/storyboards/batch', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              action: 'delete',
              storyboardIds: Array.from(selectedIds),
            }),
          });

          const result = await response.json();

          if (result.success) {
            showSuccess(result.message, '成功');
            setSelectedIds(new Set());
            setSelectAll(false);
            await fetchStoryboards();
          } else {
            showError('删除失败', '错误');
          }
        } catch (error) {
          console.error('Error batch deleting:', error);
          showError('删除失败，请重试', '错误');
        } finally {
          setBatchActionLoading(false);
        }
      },
    });
  };

  const handleBatchRegenerate = async () => {
    if (selectedIds.size === 0) {
      showError('请先选择要重新生成分镜图片', '提示');
      return;
    }

    showConfirm({
      title: '批量重新生成分镜图片',
      message: `确定要重新生成选中的 ${selectedIds.size} 个分镜图片吗？`,
      onConfirm: async () => {
        setBatchActionLoading(true);

        try {
          const response = await fetch('/api/storyboards/batch', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              action: 'regenerate',
              storyboardIds: Array.from(selectedIds),
            }),
          });

          const result = await response.json();

          if (result.success) {
            // 逐个调用重新生成图片 API
            const ids = result.storyboardIds || Array.from(selectedIds);
            for (const id of ids) {
              await handleRegenerateImage(id);
            }
            setSelectedIds(new Set());
            setSelectAll(false);
          } else {
            showWarning('生成失败了，请稍后再试一下~', '提示');
          }
        } catch (error) {
          console.error('Error batch regenerating:', error);
          showWarning('生成失败了，请稍后再试一下~', '提示');
        } finally {
          setBatchActionLoading(false);
        }
      },
    });
  };

  // 一键生成所有分镜视频
  const handleBatchGenerateVideos = async () => {
    // 检查是否有其他视频正在生成
    if (isAnyVideoGenerating || batchGeneratingVideos) {
      showError('已有视频正在生成中，请等待完成后再试', '提示');
      return;
    }

    // 过滤出有图片但没有视频的分镜
    const storyboardsWithImage = storyboards.filter(s => s.imageUrl && !s.videoUrl);
    const storyboardsToRegenerate = storyboards.filter(s => s.imageUrl && s.videoUrl);
    
    if (storyboardsWithImage.length === 0 && storyboardsToRegenerate.length === 0) {
      showError('没有可生成视频的分镜（需要有分镜图片）', '提示');
      return;
    }

    const totalWithImage = storyboardsWithImage.length + storyboardsToRegenerate.length;
    const message = storyboardsToRegenerate.length > 0
      ? `共有 ${totalWithImage} 个分镜有图片。\n\n• ${storyboardsWithImage.length} 个待生成视频\n• ${storyboardsToRegenerate.length} 个已有视频（将重新生成）\n\n⏰ 预计每个视频需要 1-5 分钟，总计约 ${Math.ceil(totalWithImage * 3)} 分钟\n\n⚠️ 温馨提示：视频生成过程中请保持页面打开，耐心等待。`
      : `共有 ${totalWithImage} 个分镜待生成视频。\n\n⏰ 预计每个视频需要 1-5 分钟，总计约 ${Math.ceil(totalWithImage * 3)} 分钟\n\n⚠️ 温馨提示：视频生成过程中请保持页面打开，耐心等待。`;

    showConfirm({
      title: '一键生成所有分镜视频',
      message,
      onConfirm: async () => {
        setBatchGeneratingVideos(true);
        setIsAnyVideoGenerating(true);
        setBatchVideoProgress({
          current: 0,
          total: totalWithImage,
          message: '准备开始生成...',
          successCount: 0,
          failCount: 0,
        });

        // 获取所有有图片的分镜ID
        const allStoryboardIds = storyboards.filter(s => s.imageUrl).map(s => s.id);

        try {
          const response = await fetch('/api/storyboards/batch-generate-videos', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              storyboardIds: allStoryboardIds,
              resolution: videoSettings.resolution,
              model: videoSettings.model,
            }),
          });

          // 处理流式响应
          const reader = response.body?.getReader();
          const decoder = new TextDecoder();

          if (!reader) {
            throw new Error('无法读取响应流');
          }

          let buffer = '';

          while (true) {
            const { done, value } = await reader.read();
            if (done) break;

            buffer += decoder.decode(value, { stream: true });
            const lines = buffer.split('\n');
            buffer = lines.pop() || '';

            for (const line of lines) {
              if (line.startsWith('data: ')) {
                try {
                  const data = JSON.parse(line.slice(6));
                  
                  if (data.type === 'start') {
                    setBatchVideoProgress(prev => prev ? {
                      ...prev,
                      message: data.message,
                    } : null);
                  } else if (data.type === 'progress') {
                    setBatchVideoProgress(prev => prev ? {
                      ...prev,
                      current: data.storyboardId ? prev.current + 1 : prev.current,
                      message: data.message,
                    } : null);
                  } else if (data.type === 'success') {
                    setBatchVideoProgress(prev => prev ? {
                      ...prev,
                      current: prev.current,
                      message: data.message,
                      successCount: prev.successCount + 1,
                    } : null);
                  } else if (data.type === 'error') {
                    setBatchVideoProgress(prev => prev ? {
                      ...prev,
                      current: prev.current,
                      message: data.message,
                      failCount: prev.failCount + 1,
                    } : null);
                  } else if (data.type === 'complete') {
                    setBatchVideoProgress(prev => prev ? {
                      ...prev,
                      message: data.message,
                      successCount: data.successCount,
                      failCount: data.failCount,
                    } : null);
                  }
                } catch (e) {
                  console.error('Error parsing SSE data:', e);
                }
              }
            }
          }

          // 刷新分镜列表
          await fetchStoryboards();
          
          // 显示完成提示
          const finalProgress = batchVideoProgress;
          if (finalProgress) {
            if (finalProgress.failCount === 0) {
              showSuccess(`所有视频生成完成！成功生成 ${finalProgress.successCount} 个视频`, '完成');
            } else {
              showWarning(`视频生成完成！成功: ${finalProgress.successCount}, 失败: ${finalProgress.failCount}`, '完成');
            }
          }
        } catch (error) {
          console.error('Error batch generating videos:', error);
          showWarning('生成失败了，请稍后再试一下~', '提示');
        } finally {
          setBatchGeneratingVideos(false);
          setIsAnyVideoGenerating(false);
          setBatchVideoProgress(null);
        }
      },
    });
  };

  const handleDragEnd = async (result: DropResult) => {
    const { source, destination } = result;

    if (!destination) {
      return;
    }

    if (source.index === destination.index) {
      return;
    }

    const newStoryboards = Array.from(storyboards);
    const [reorderedItem] = newStoryboards.splice(source.index, 1);
    newStoryboards.splice(destination.index, 0, reorderedItem);

    // 更新前端状态
    setStoryboards(newStoryboards);

    // 更新后端顺序
    try {
      const response = await fetch('/api/storyboards/reorder', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          storyboardIds: newStoryboards.map(s => s.id),
        }),
      });

      const result = await response.json();

      if (!result.success) {
        showError('排序更新失败', '错误');
        await fetchStoryboards(); // 恢复原始顺序
      }
    } catch (error) {
      console.error('Error reordering storyboards:', error);
      showError('排序更新失败，请重试', '错误');
      await fetchStoryboards(); // 恢复原始顺序
    }
  };

  const handleEditStoryboard = (storyboard: Storyboard) => {
    setEditingStoryboard(storyboard);
    setEditDialogOpen(true);
  };

  const handlePreviewImage = (imageUrl: string) => {
    setPreviewImageUrl(imageUrl);
    setImagePreviewOpen(true);
  };

  const handleSaveStoryboardEdit = async (id: string, data: Partial<Storyboard>) => {
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
    }
  };

  const handleRegenerateImage = async (storyboardId: string) => {
    showConfirm({
      title: '重新生成分镜图片',
      message: '确定要重新生成这个分镜的图片吗？',
      onConfirm: async () => {
        setRegeneratingImage(prev => ({ ...prev, [storyboardId]: true }));

        try {
          const response = await fetch(`/api/storyboards/${storyboardId}/regenerate-image`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ storyboardId }),
          });

          const result = await response.json();

          if (result.success) {
            await fetchStoryboards();
            // 提取文件名
            const fileName = result.data.imageUrl ? result.data.imageUrl.split('/').pop() || 'image.png' : 'image.png';
            // 显示文件名标签
            setRegenerateSuccess(prev => ({
              ...prev,
              [storyboardId]: { type: 'image', fileName, timestamp: Date.now() }
            }));
            // 3秒后自动隐藏标签
            setTimeout(() => {
              setRegenerateSuccess(prev => {
                const { [storyboardId]: _, ...rest } = prev;
                return rest;
              });
            }, 3000);
          } else {
            showWarning(`生成失败了，请稍后再试一下~`, '提示');
          }
        } catch (error) {
          console.error('Error regenerating image:', error);
          showWarning('生成失败了，请稍后再试一下~', '提示');
        } finally {
          setRegeneratingImage(prev => ({ ...prev, [storyboardId]: false }));
        }
      },
    });
  };

  // 删除分镜
  const handleDeleteStoryboard = async (storyboardId: string, sequence: number) => {
    showConfirm({
      title: '删除分镜',
      message: `确定要删除分镜 ${sequence} 吗？此操作无法撤销。`,
      onConfirm: async () => {
        try {
          const response = await fetch(`/api/storyboards/${storyboardId}`, {
            method: 'DELETE',
          });

          const result = await response.json();

          if (result.success) {
            showSuccess('分镜已删除');
            await fetchStoryboards();
          } else {
            throw new Error(result.error || '删除失败');
          }
        } catch (error: any) {
          console.error('Error deleting storyboard:', error);
          showError('删除失败，请重试');
        }
      },
    });
  };

  const handleRegenerateVideo = async (storyboardId: string) => {
    // 检查是否有其他视频正在生成
    if (isAnyVideoGenerating) {
      showError('已有视频正在生成中，请等待当前视频生成完成后再试', '提示');
      return;
    }

    showConfirm({
      title: '重新生成分镜视频',
      message: '确定要重新生成这个分镜的视频吗？\n\n⏰ 预计需要 1-5 分钟\n• AI 视频生成可能需要较长时间\n• 视频处理：约 10-20 秒\n\n请耐心等待，不要关闭页面...',
      onConfirm: async () => {
        setRegeneratingVideo(prev => ({ ...prev, [storyboardId]: true }));
        setIsAnyVideoGenerating(true); // 设置全局锁
        setVideoGenerationProgress({
          storyboardId,
          startTime: Date.now(),
        });

        try {
          const response = await fetch(`/api/storyboards/${storyboardId}/regenerate-video`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              resolution: videoSettings.resolution,
              model: videoSettings.model,
            }),
          });

          const result = await response.json();

          if (result.success && result.data) {
            await fetchStoryboards();
            // 提取文件名
            const fileName = result.data.videoUrl ? result.data.videoUrl.split('/').pop() || 'video.mp4' : 'video.mp4';
            // 显示文件名标签
            setRegenerateSuccess(prev => ({
              ...prev,
              [storyboardId]: { type: 'video', fileName, timestamp: Date.now() }
            }));
            // 3秒后自动隐藏标签
            setTimeout(() => {
              setRegenerateSuccess(prev => {
                const { [storyboardId]: _, ...rest } = prev;
                return rest;
              });
            }, 3000);
            showSuccess('视频生成完成！', '成功');
          } else {
            throw new Error(result.error || '视频生成失败');
          }
        } catch (error: any) {
          console.error('Error regenerating video:', error);
          showWarning('生成失败了，请稍后再试一下~', '提示');
        } finally {
          setRegeneratingVideo(prev => ({ ...prev, [storyboardId]: false }));
          setIsAnyVideoGenerating(false); // 释放全局锁
          setVideoGenerationProgress({
            storyboardId: null,
            startTime: null,
          });
        }
      },
    });
  };

  if (loading) {
    return <div className="text-center py-8 text-gray-500">加载中...</div>;
  }

  if (storyboards.length === 0) {
    return (
      <div className="text-center py-8">
        <p className="text-gray-500 mb-4">暂无分镜</p>
        <Link href={`/scripts/${scriptId}/storyboards/create`}>
          <Button>创建第一个分镜</Button>
        </Link>
      </div>
    );
  }

  return (
    <DragDropContext onDragEnd={handleDragEnd}>
      <div className="space-y-4">
        {/* 批量操作工具栏 */}
        <div className="flex items-center justify-between bg-gray-50 p-3 rounded-lg border">
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2">
              <Checkbox
                id="selectAll"
                checked={selectAll}
                onCheckedChange={handleSelectAll}
              />
              <Label htmlFor="selectAll" className="text-sm cursor-pointer">
                全选 ({selectedIds.size}/{storyboards.length})
              </Label>
            </div>

            {selectedIds.size > 0 && (
              <div className="flex items-center gap-2">
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button size="sm" variant="outline" disabled={batchActionLoading}>
                      批量操作
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="start">
                    <DropdownMenuItem onClick={handleBatchDelete}>
                      删除选中 ({selectedIds.size})
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={handleBatchRegenerate}>
                      重新生成图片 ({selectedIds.size})
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => {
                    setSelectedIds(new Set());
                    setSelectAll(false);
                  }}
                >
                  取消选择
                </Button>
              </div>
            )}
          </div>

          {/* 一键生成视频按钮 */}
          <Button
            onClick={handleBatchGenerateVideos}
            disabled={batchGeneratingVideos || isAnyVideoGenerating}
            className="bg-gradient-to-r from-blue-500 to-purple-600 hover:from-blue-600 hover:to-purple-700"
          >
            {batchGeneratingVideos ? (
              <>
                <span className="animate-spin mr-2">⏳</span>
                生成中...
              </>
            ) : (
              <>🎬 一键生成所有视频</>
            )}
          </Button>
        </div>

        {/* 批量视频生成进度提示 */}
        {batchGeneratingVideos && batchVideoProgress && (
          <Card className="bg-blue-50 border-blue-200">
            <CardContent className="pt-6">
              <div className="flex items-center gap-4">
                <div className="flex-shrink-0">
                  <div className="w-12 h-12 rounded-full bg-blue-100 flex items-center justify-center">
                    <span className="text-2xl animate-pulse">🎬</span>
                  </div>
                </div>
                <div className="flex-1">
                  <p className="font-medium text-blue-900 mb-2">
                    {batchVideoProgress.message}
                  </p>
                  <Progress 
                    value={(batchVideoProgress.current / batchVideoProgress.total) * 100} 
                    className="h-2 mb-2"
                  />
                  <div className="flex items-center justify-between text-sm text-blue-700">
                    <span>
                      进度: {batchVideoProgress.current}/{batchVideoProgress.total}
                    </span>
                    <span className="flex gap-4">
                      <span className="text-green-600">✓ 成功: {batchVideoProgress.successCount}</span>
                      <span className="text-red-600">✗ 失败: {batchVideoProgress.failCount}</span>
                    </span>
                  </div>
                </div>
              </div>
              <div className="mt-4 p-3 bg-blue-100 rounded-lg">
                <p className="text-sm text-blue-800">
                  ⏳ <strong>温馨提示：</strong>视频生成过程中请保持页面打开，耐心等待。每个视频约需 1-5 分钟，请勿刷新或关闭页面。
                </p>
              </div>
            </CardContent>
          </Card>
        )}

        {/* 分镜列表 */}
        <Droppable droppableId="storyboards">
          {(provided) => (
            <div
              {...provided.droppableProps}
              ref={provided.innerRef}
              className="space-y-4"
            >
              {storyboards.map((storyboard, index) => (
                <Draggable
                  key={storyboard.id}
                  draggableId={storyboard.id}
                  index={index}
                >
                  {(provided, snapshot) => (
                    <div
                      ref={provided.innerRef}
                      {...provided.draggableProps}
                      {...provided.dragHandleProps}
                      className={selectedIds.has(storyboard.id) ? 'ring-2 ring-blue-500' : ''}
                    >
                      <Card
                        className={snapshot.isDragging ? 'shadow-lg rotate-1' : ''}
                      >
                        <CardContent className="pt-6">
                          <div className="flex gap-4">
                            {/* 拖拽手柄 */}
                            <div className="flex items-center pt-1 text-gray-400">
                              <svg
                                xmlns="http://www.w3.org/2000/svg"
                                width="20"
                                height="20"
                                viewBox="0 0 24 24"
                                fill="none"
                                stroke="currentColor"
                                strokeWidth="2"
                                strokeLinecap="round"
                                strokeLinejoin="round"
                              >
                                <circle cx="9" cy="12" r="1" />
                                <circle cx="9" cy="5" r="1" />
                                <circle cx="9" cy="19" r="1" />
                                <circle cx="15" cy="12" r="1" />
                                <circle cx="15" cy="5" r="1" />
                                <circle cx="15" cy="19" r="1" />
                              </svg>
                            </div>

                            {/* 复选框 */}
                            <div className="flex items-center pt-1">
                              <Checkbox
                                checked={selectedIds.has(storyboard.id)}
                                onCheckedChange={(checked) => handleSelectOne(storyboard.id, checked as boolean)}
                              />
                            </div>

                            {storyboard.imageUrl && (
                              <div
                                className="flex-shrink-0 cursor-pointer hover:opacity-80 transition-opacity"
                                onClick={() => handlePreviewImage(storyboard.imageUrl!)}
                                title="点击查看大图"
                              >
                                <img
                                  src={`${storyboard.imageUrl}${storyboard.imageUrl.includes('?') ? '&' : '?'}_t=${Date.now()}`}
                                  alt={`分镜 ${storyboard.sequence}`}
                                  className="w-32 h-24 object-cover rounded-lg border-2 border-transparent hover:border-blue-500 transition-all"
                                />
                              </div>
                            )}
                            <div className="flex-1 min-w-0">
                              <div className="flex items-start justify-between mb-2">
                                <div className="flex items-center gap-3 flex-wrap">
                                  <h4 className="font-semibold">
                                    分镜 {storyboard.sequence}
                                  </h4>
                                  <Badge variant="outline" className="text-xs">
                                    {storyboard.duration || 5}秒
                                  </Badge>
                                  {storyboard.transitionType && (
                                    <Badge variant="outline" className="text-xs">
                                      {getTransitionLabel(storyboard.transitionType)}
                                    </Badge>
                                  )}
                                  {storyboard.isGenerated && (
                                    <Badge variant="secondary" className="ml-2">已生成视频</Badge>
                                  )}
                                  {regenerateSuccess[storyboard.id] && (
                                    <Badge variant="default" className="text-xs ml-2">
                                      重新生成{regenerateSuccess[storyboard.id].type === 'image' ? '图片' : '视频'}成功 `{regenerateSuccess[storyboard.id].fileName}`
                                    </Badge>
                                  )}
                                </div>
                                {/* 分镜操作按钮 */}
                                <div className="flex gap-2 flex-wrap">
                                  <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={() => handleEditStoryboard(storyboard)}
                                  >
                                    编辑
                                  </Button>
                                  <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={() => handleDeleteStoryboard(storyboard.id, storyboard.sequence)}
                                    className="text-red-600 hover:text-red-700 hover:bg-red-50"
                                  >
                                    删除
                                  </Button>
                                  <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={() => handleRegenerateImage(storyboard.id)}
                                    disabled={regeneratingImage[storyboard.id] || batchActionLoading}
                                  >
                                    {regeneratingImage[storyboard.id] ? '生成中...' : '重新生成图片'}
                                  </Button>
                                  <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={() => handleRegenerateVideo(storyboard.id)}
                                    disabled={isAnyVideoGenerating || batchActionLoading}
                                  >
                                    {regeneratingVideo[storyboard.id] ? '⏳ 生成中 (约40秒)' : '重新生成视频'}
                                  </Button>
                                </div>
                              </div>
                              {/* 对话内容（剧情演绎模式） */}
                              {storyboard.dialogue && (
                                <div className="bg-blue-50 border-l-4 border-blue-400 p-3 mb-2 rounded-r">
                                  <p className="text-sm text-blue-800 font-medium">💬 {storyboard.dialogue}</p>
                                </div>
                              )}
                              <p className="text-sm text-gray-600 mb-2">{storyboard.description}</p>
                              {storyboard.videoUrl ? (
                                <div className="mt-4">
                                  <div className="relative rounded-lg overflow-hidden bg-black">
                                    {/* 只显示视频播放器 */}
                                    <video
                                      src={`${storyboard.videoUrl}${storyboard.videoUrl.includes('?') ? '&' : '?'}_t=${Date.now()}`}
                                      controls
                                      className="w-full max-w-md"
                                      preload="metadata"
                                    >
                                      您的浏览器不支持视频播放
                                    </video>
                                  </div>
                                </div>
                              ) : (
                                <div className="mt-4 p-4 bg-gray-50 rounded-lg border border-dashed border-gray-300 text-center">
                                  <p className="text-sm text-gray-500">视频正在生成中...</p>
                                </div>
                              )}
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    </div>
                  )}
                </Draggable>
              ))}
              {provided.placeholder}
            </div>
          )}
        </Droppable>

        {/* 分镜编辑对话框 */}
        <EditStoryboardDialog
          storyboard={editingStoryboard}
          open={editDialogOpen}
          onOpenChange={setEditDialogOpen}
          onSave={handleSaveStoryboardEdit}
          characters={characters}
          scenes={scenes}
        />

        {/* 图片预览对话框 */}
        <ImagePreviewDialog
          open={imagePreviewOpen}
          onOpenChange={setImagePreviewOpen}
          imageUrl={previewImageUrl}
          alt="分镜图片预览"
        />
      </div>
    </DragDropContext>
  );
}
