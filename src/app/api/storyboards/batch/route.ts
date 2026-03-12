import { NextRequest, NextResponse } from "next/server";
import { storyboardManager } from "@/storage/database";

export async function POST(request: NextRequest) {
  try {
    const { action, storyboardIds } = await request.json();

    if (!action || !Array.isArray(storyboardIds) || storyboardIds.length === 0) {
      return NextResponse.json(
        { success: false, error: "Invalid request" },
        { status: 400 }
      );
    }

    if (action === 'delete') {
      // 批量删除
      await Promise.all(
        storyboardIds.map(id => storyboardManager.deleteStoryboard(id))
      );
      
      return NextResponse.json({
        success: true,
        message: `成功删除 ${storyboardIds.length} 个分镜`,
      });
    } else if (action === 'regenerate') {
      // 批量重新生成（标记为需要重新生成）
      // 这里我们只是更新 isGenerated 状态，实际的重新生成由前端单独调用
      return NextResponse.json({
        success: true,
        message: `已选中 ${storyboardIds.length} 个分镜，请逐个重新生成`,
        storyboardIds,
      });
    } else {
      return NextResponse.json(
        { success: false, error: "Unknown action" },
        { status: 400 }
      );
    }
  } catch (error) {
    console.error("Error in batch operation:", error);
    return NextResponse.json(
      { success: false, error: "操作失败" },
      { status: 500 }
    );
  }
}
