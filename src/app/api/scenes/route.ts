import { NextRequest, NextResponse } from 'next/server';
import { sceneManager } from '@/storage/database';
import { generateFileUrl, extractFileKeyFromUrl } from '@/lib/ai';

// GET /api/scenes?scriptId=xxx - 获取剧本的所有场景
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const scriptId = searchParams.get('scriptId');

    if (!scriptId) {
      return NextResponse.json(
        { success: false, error: 'scriptId is required' },
        { status: 400 }
      );
    }

    const sceneList = await sceneManager.getScenes(scriptId);

    // 为每个场景的背景图生成完整 URL
    const scenesWithUrls = await Promise.all(
      sceneList.map(async (scene) => ({
        ...scene,
        backgroundUrl: scene.backgroundUrl ? await generateFileUrl(scene.backgroundUrl) : null,
        referenceImageUrl: scene.referenceImageUrl ? await generateFileUrl(scene.referenceImageUrl) : null,
      }))
    );

    return NextResponse.json({
      success: true,
      data: scenesWithUrls,
    });
  } catch (error) {
    console.error('Error fetching scenes:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch scenes' },
      { status: 500 }
    );
  }
}

// POST /api/scenes - 创建场景
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { scriptId, name, description, backgroundUrl, referenceImageUrl } = body;

    if (!scriptId || !name) {
      return NextResponse.json(
        { success: false, error: 'scriptId and name are required' },
        { status: 400 }
      );
    }

    // 如果传入了完整的 URL，提取 fileKey
    const bgFileKey = backgroundUrl ? extractFileKeyFromUrl(backgroundUrl) : null;
    const refFileKey = referenceImageUrl ? extractFileKeyFromUrl(referenceImageUrl) : null;

    const newScene = await sceneManager.createScene({
      scriptId,
      name,
      description,
      backgroundUrl: bgFileKey,
      referenceImageUrl: refFileKey,
    });

    // 生成背景图和参考图的完整 URL
    const sceneWithUrl = {
      ...newScene,
      backgroundUrl: newScene.backgroundUrl ? await generateFileUrl(newScene.backgroundUrl) : null,
      referenceImageUrl: newScene.referenceImageUrl ? await generateFileUrl(newScene.referenceImageUrl) : null,
    };

    return NextResponse.json({
      success: true,
      data: sceneWithUrl,
    });
  } catch (error) {
    console.error('Error creating scene:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to create scene' },
      { status: 500 }
    );
  }
}
