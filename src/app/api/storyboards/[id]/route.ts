import { NextRequest, NextResponse } from 'next/server';
import { storyboardManager } from '@/storage/database';
import { cookies } from 'next/headers';

// GET /api/storyboards/[id] - 获取单个分镜
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const storyboard = await storyboardManager.getStoryboardById(id);

    if (!storyboard) {
      return NextResponse.json(
        { success: false, error: '分镜不存在' },
        { status: 404 }
      );
    }

    // 兼容旧数据：将 characterId 转换为 characterIds 数组
    let characterIds: string[] | null = null;
    if (storyboard.characterIds) {
      try {
        characterIds = JSON.parse(storyboard.characterIds);
      } catch (e) {
        console.error('Failed to parse characterIds:', storyboard.characterIds);
      }
    } else if ((storyboard as any).characterId) {
      characterIds = [(storyboard as any).characterId];
    }

    return NextResponse.json({
      success: true,
      data: {
        ...storyboard,
        characterIds,
      },
    });
  } catch (error) {
    console.error('Error getting storyboard:', error);
    return NextResponse.json(
      { success: false, error: '获取分镜失败' },
      { status: 500 }
    );
  }
}

// PUT /api/storyboards/[id] - 更新分镜
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await request.json();

    // 验证必填字段
    if (!body.description && !body.prompt && !body.duration && !body.transitionType) {
      return NextResponse.json(
        { success: false, error: '至少提供一个需要更新的字段' },
        { status: 400 }
      );
    }

    const updatedStoryboard = await storyboardManager.updateStoryboard(id, body);

    if (!updatedStoryboard) {
      return NextResponse.json(
        { success: false, error: '分镜不存在' },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      message: '分镜更新成功',
      data: updatedStoryboard,
    });
  } catch (error) {
    console.error('Error updating storyboard:', error);
    return NextResponse.json(
      { success: false, error: '更新分镜失败' },
      { status: 500 }
    );
  }
}

// DELETE /api/storyboards/[id] - 删除分镜
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const success = await storyboardManager.deleteStoryboard(id);

    if (!success) {
      return NextResponse.json(
        { success: false, error: '分镜不存在' },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      message: '分镜删除成功',
    });
  } catch (error) {
    console.error('Error deleting storyboard:', error);
    return NextResponse.json(
      { success: false, error: '删除分镜失败' },
      { status: 500 }
    );
  }
}
