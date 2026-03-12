import { NextRequest, NextResponse } from "next/server";
import { storyboardManager } from "@/storage/database";

/**
 * 自动修复分镜序号
 * 将分镜按当前顺序重新编号，确保序号从 1 开始连续
 */
export async function POST(request: NextRequest) {
  try {
    const { scriptId } = await request.json();

    if (!scriptId) {
      return NextResponse.json(
        { success: false, error: "缺少剧本 ID" },
        { status: 400 }
      );
    }

    // 获取该剧本的所有分镜（已按 sequence 排序）
    const storyboards = await storyboardManager.getStoryboards(scriptId);

    if (storyboards.length === 0) {
      return NextResponse.json({
        success: true,
        message: "没有需要修复的分镜",
        fixedCount: 0,
      });
    }

    // 检查是否需要修复
    let needsFix = false;
    for (let i = 0; i < storyboards.length; i++) {
      if (storyboards[i].sequence !== i + 1) {
        needsFix = true;
        break;
      }
    }

    if (!needsFix) {
      return NextResponse.json({
        success: true,
        message: "分镜序号已经是正确的",
        fixedCount: 0,
      });
    }

    // 修复序号
    let fixedCount = 0;
    for (let i = 0; i < storyboards.length; i++) {
      const correctSequence = i + 1;
      if (storyboards[i].sequence !== correctSequence) {
        await storyboardManager.updateStoryboard(storyboards[i].id, {
          sequence: correctSequence,
        });
        fixedCount++;
      }
    }

    return NextResponse.json({
      success: true,
      message: `已修复 ${fixedCount} 个分镜的序号`,
      fixedCount,
      totalStoryboards: storyboards.length,
    });
  } catch (error) {
    console.error("Error fixing storyboard sequence:", error);
    return NextResponse.json(
      { success: false, error: "修复失败" },
      { status: 500 }
    );
  }
}
