'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { useAlert } from '@/lib/alert-context';

interface Script {
  id: string;
  title: string;
  type: string;
  description: string | null;
  createdAt: string;
}

export default function ScriptsPage() {
  const [scripts, setScripts] = useState<Script[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<string>('all');
  const { showError, showConfirm } = useAlert();

  useEffect(() => {
    fetchScripts();
  }, [filter]);

  const fetchScripts = async () => {
    try {
      const url = filter === 'all'
        ? '/api/scripts'
        : `/api/scripts?type=${filter}`;
      const response = await fetch(url);
      const result = await response.json();

      if (result.success) {
        setScripts(result.data);
      }
    } catch (error) {
      console.error('Error fetching scripts:', error);
    } finally {
      setLoading(false);
    }
  };

  const deleteScript = async (id: string) => {
    showConfirm({
      title: '删除剧本',
      message: '确定要删除这个剧本吗？',
      onConfirm: async () => {
        try {
          const response = await fetch(`/api/scripts/${id}`, {
            method: 'DELETE',
          });
          const result = await response.json();

          if (result.success) {
            setScripts(scripts.filter(s => s.id !== id));
          } else {
            showError('删除失败', '错误');
          }
        } catch (error) {
          console.error('Error deleting script:', error);
          showError('删除失败', '错误');
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

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">剧本管理</h1>
          <p className="text-gray-600 mt-1">管理您的漫剧剧本</p>
        </div>
        <Link href="/create">
          <Button>创建新剧本</Button>
        </Link>
      </div>

      {/* Filter Tabs */}
      <div className="flex gap-2">
        <Button
          variant={filter === 'all' ? 'default' : 'outline'}
          onClick={() => setFilter('all')}
        >
          全部
        </Button>
        <Button
          variant={filter === '剧情演绎' ? 'default' : 'outline'}
          onClick={() => setFilter('剧情演绎')}
        >
          剧情演绎
        </Button>
        <Button
          variant={filter === '旁白解说' ? 'default' : 'outline'}
          onClick={() => setFilter('旁白解说')}
        >
          旁白解说
        </Button>
      </div>

      {/* Scripts Grid */}
      {scripts.length === 0 ? (
        <div className="text-center py-12 bg-white rounded-xl shadow-sm">
          <p className="text-gray-500 mb-4">暂无剧本</p>
          <Link href="/create">
            <Button>创建第一个剧本</Button>
          </Link>
        </div>
      ) : (
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
          {scripts.map((script) => (
            <Card key={script.id} className="hover:shadow-lg transition-shadow">
              <CardHeader>
                <div className="flex justify-between items-start">
                  <CardTitle className="text-lg line-clamp-1">
                    {script.title}
                  </CardTitle>
                  <Badge variant="secondary">{script.type}</Badge>
                </div>
                <CardDescription className="line-clamp-2">
                  {script.description || '暂无描述'}
                </CardDescription>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-gray-500">
                  创建于 {new Date(script.createdAt).toLocaleDateString('zh-CN')}
                </p>
              </CardContent>
              <CardFooter className="flex gap-2 justify-end">
                <Link href={`/workflow/${script.id}`}>
                  <Button variant="outline" size="sm" className="bg-blue-50 border-blue-300 text-blue-700 hover:bg-blue-100">
                    🎬 人机协同
                  </Button>
                </Link>
                <Link href={`/scripts/${script.id}`}>
                  <Button variant="outline" size="sm">
                    查看详情
                  </Button>
                </Link>
                <Button
                  variant="destructive"
                  size="sm"
                  onClick={() => deleteScript(script.id)}
                >
                  删除
                </Button>
              </CardFooter>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
