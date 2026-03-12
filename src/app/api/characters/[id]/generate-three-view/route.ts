import { NextRequest, NextResponse } from "next/server";
import { characterManager } from "@/storage/database";
import { generateCharacterThreeView, generateFileUrl } from "@/lib/ai";

/**
 * 生成角色三视图 API
 * POST /api/characters/[id]/generate-three-view
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    
    // 获取角色信息
    const character = await characterManager.getCharacterById(id);
    if (!character) {
      return NextResponse.json(
        { success: false, error: "角色不存在" },
        { status: 404 }
      );
    }

    if (!character.appearance) {
      return NextResponse.json(
        { success: false, error: "角色缺少外观描述" },
        { status: 400 }
      );
    }

    console.log(`[generate-three-view] 开始为角色 ${character.name} 生成三视图`);

    // 获取剧本信息以获取故事风格
    // TODO: 可以从请求中传入故事风格
    
    // 生成三视图
    const threeViewData = await generateCharacterThreeView(
      character.appearance,
      character.backgroundColor || undefined,
      undefined // 故事风格
    );

    if (!threeViewData) {
      return NextResponse.json(
        { success: false, error: "三视图生成失败" },
        { status: 500 }
      );
    }

    // 更新角色记录
    const updatedCharacter = await characterManager.updateCharacter(id, {
      avatarUrl: threeViewData.threeQuarterView?.fileKey || threeViewData.frontView?.fileKey || character.avatarUrl,
      frontViewUrl: threeViewData.frontView?.fileKey,
      sideViewUrl: threeViewData.sideView?.fileKey,
      threeQuarterViewUrl: threeViewData.threeQuarterView?.fileKey,
    });

    if (!updatedCharacter) {
      return NextResponse.json(
        { success: false, error: "更新角色失败" },
        { status: 500 }
      );
    }

    // 返回带签名 URL 的结果
    const result = {
      ...updatedCharacter,
      avatarUrl: updatedCharacter.avatarUrl ? await generateFileUrl(updatedCharacter.avatarUrl) : null,
      frontViewUrl: updatedCharacter.frontViewUrl ? await generateFileUrl(updatedCharacter.frontViewUrl) : null,
      sideViewUrl: updatedCharacter.sideViewUrl ? await generateFileUrl(updatedCharacter.sideViewUrl) : null,
      threeQuarterViewUrl: updatedCharacter.threeQuarterViewUrl ? await generateFileUrl(updatedCharacter.threeQuarterViewUrl) : null,
    };

    console.log(`[generate-three-view] 角色 ${character.name} 三视图生成完成`);

    return NextResponse.json({
      success: true,
      data: result,
      threeView: {
        frontView: threeViewData.frontView ? { url: await generateFileUrl(threeViewData.frontView.fileKey) } : null,
        sideView: threeViewData.sideView ? { url: await generateFileUrl(threeViewData.sideView.fileKey) } : null,
        threeQuarterView: threeViewData.threeQuarterView ? { url: await generateFileUrl(threeViewData.threeQuarterView.fileKey) } : null,
      },
    });
  } catch (error) {
    console.error("[generate-three-view] Error:", error);
    return NextResponse.json(
      { success: false, error: "三视图生成失败" },
      { status: 500 }
    );
  }
}
