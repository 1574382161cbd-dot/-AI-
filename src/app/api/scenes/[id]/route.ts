import { NextRequest, NextResponse } from 'next/server';
import { sceneManager } from '@/storage/database';
import { generateFileUrl, extractFileKeyFromUrl } from '@/lib/ai';

// GET /api/scenes/[id] - 获取单个场景
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const scene = await sceneManager.getSceneById(id);

    if (!scene) {
      return NextResponse.json(
        { success: false, error: 'Scene not found' },
        { status: 404 }
      );
    }

    // 生成背景图和参考图的完整 URL
    const backgroundUrl = scene.backgroundUrl ? await generateFileUrl(scene.backgroundUrl) : null;
    const referenceImageUrl = scene.referenceImageUrl ? await generateFileUrl(scene.referenceImageUrl) : null;

    return NextResponse.json({
      success: true,
      data: {
        ...scene,
        backgroundUrl,
        referenceImageUrl,
      },
    });
  } catch (error) {
    console.error('Error fetching scene:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch scene' },
      { status: 500 }
    );
  }
}

// PUT /api/scenes/[id] - 更新场景
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await request.json();
    const { name, description, backgroundUrl, referenceImageUrl } = body;

    const updateData: any = {};
    if (name !== undefined) updateData.name = name;
    if (description !== undefined) updateData.description = description;
    if (backgroundUrl !== undefined) {
      // 如果传入了完整的 URL，提取 fileKey
      updateData.backgroundUrl = extractFileKeyFromUrl(backgroundUrl);
    }
    if (referenceImageUrl !== undefined) {
      // 如果传入了完整的 URL，提取 fileKey
      updateData.referenceImageUrl = extractFileKeyFromUrl(referenceImageUrl);
    }

    const updatedScene = await sceneManager.updateScene(id, updateData);

    if (!updatedScene) {
      return NextResponse.json(
        { success: false, error: 'Scene not found' },
        { status: 404 }
      );
    }

    // 生成背景图和参考图的完整 URL
    const sceneWithUrl = {
      ...updatedScene,
      backgroundUrl: updatedScene.backgroundUrl ? await generateFileUrl(updatedScene.backgroundUrl) : null,
      referenceImageUrl: updatedScene.referenceImageUrl ? await generateFileUrl(updatedScene.referenceImageUrl) : null,
    };

    return NextResponse.json({
      success: true,
      data: sceneWithUrl,
    });
  } catch (error) {
    console.error('Error updating scene:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to update scene' },
      { status: 500 }
    );
  }
}

// DELETE /api/scenes/[id] - 删除场景
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const success = await sceneManager.deleteScene(id);

    if (!success) {
      return NextResponse.json(
        { success: false, error: 'Scene not found' },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      data: { id },
    });
  } catch (error) {
    console.error('Error deleting scene:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to delete scene' },
      { status: 500 }
    );
  }
}
