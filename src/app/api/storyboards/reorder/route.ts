import { NextRequest, NextResponse } from "next/server";
import { storyboardManager } from "@/storage/database";

export async function POST(request: NextRequest) {
  try {
    const { storyboardIds } = await request.json();

    if (!Array.isArray(storyboardIds) || storyboardIds.length === 0) {
      return NextResponse.json(
        { success: false, error: "Invalid request" },
        { status: 400 }
      );
    }

    // 更新每个分镜的顺序
    for (let i = 0; i < storyboardIds.length; i++) {
      await storyboardManager.updateStoryboard(storyboardIds[i], {
        sequence: i + 1,
      });
    }
    
    return NextResponse.json({
      success: true,
      message: `成功更新 ${storyboardIds.length} 个分镜的顺序`,
    });
  } catch (error) {
    console.error("Error reordering storyboards:", error);
    return NextResponse.json(
      { success: false, error: "操作失败" },
      { status: 500 }
    );
  }
}
