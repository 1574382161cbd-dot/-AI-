import { NextRequest, NextResponse } from "next/server";
import { storyboardManager, characterManager, sceneManager, scriptManager } from "@/storage/database";
import { generateStoryboardImage, generateFileUrl } from "@/lib/ai";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { storyboardId } = body;

    if (!storyboardId) {
      return NextResponse.json(
        { success: false, error: "storyboardId is required" },
        { status: 400 }
      );
    }

    // 获取分镜信息
    const storyboard = await storyboardManager.getStoryboardById(storyboardId);
    if (!storyboard) {
      return NextResponse.json(
        { success: false, error: "Storyboard not found" },
        { status: 404 }
      );
    }

    // 获取剧本信息，获取 storyStyle
    let storyStyle: string | undefined = undefined;
    if (storyboard.scriptId) {
      const script = await scriptManager.getScriptById(storyboard.scriptId);
      if (script) {
        storyStyle = (script as any).storyStyle;
      }
    }

    // 获取所有关联角色的形象
    const characterImageUrls: string[] = [];
    
    // 兼容旧数据：优先使用 characterIds，其次使用 characterId
    let characterIds: string[] = [];
    if (storyboard.characterIds) {
      try {
        characterIds = JSON.parse(storyboard.characterIds);
      } catch (e) {
        console.error('Failed to parse characterIds:', storyboard.characterIds);
      }
    }
    // 如果没有 characterIds，但有旧的 characterId
    if (characterIds.length === 0 && (storyboard as any).characterId) {
      characterIds = [(storyboard as any).characterId];
    }
    
    // 获取所有角色的形象
    for (const characterId of characterIds) {
      const character = await characterManager.getCharacterById(characterId);
      if (character && character.avatarUrl) {
        const avatarUrl = await generateFileUrl(character.avatarUrl);
        characterImageUrls.push(avatarUrl);
      }
    }

    // 获取场景背景图和参考图
    let sceneBackgroundUrl: string | undefined = undefined;
    let sceneReferenceUrl: string | undefined = undefined;
    if (storyboard.sceneId) {
      const scene = await sceneManager.getSceneById(storyboard.sceneId);
      if (scene) {
        if (scene.backgroundUrl) {
          sceneBackgroundUrl = await generateFileUrl(scene.backgroundUrl);
        }
        if (scene.referenceImageUrl) {
          sceneReferenceUrl = await generateFileUrl(scene.referenceImageUrl);
        }
      }
    }

    // 生成分镜图片
    const imageData = await generateStoryboardImage(
      storyboard.prompt || '',
      '2K',
      characterImageUrls,
      sceneBackgroundUrl,
      sceneReferenceUrl,
      storyStyle as any
    );

    // 更新分镜图片
    const updatedStoryboard = await storyboardManager.updateStoryboard(storyboardId, {
      imageUrl: imageData.fileKey,
    });

    return NextResponse.json({
      success: true,
      data: {
        ...updatedStoryboard,
        imageUrl: imageData.imageUrl,
      },
    });
  } catch (error) {
    console.error("Error regenerating storyboard image:", error);
    return NextResponse.json(
      { success: false, error: "Failed to regenerate storyboard image" },
      { status: 500 }
    );
  }
}
