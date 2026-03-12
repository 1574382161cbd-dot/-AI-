import { NextRequest, NextResponse } from "next/server";
import { storyboardManager, characterManager, sceneManager } from "@/storage/database";
import { generateStoryboardDescription, generateStoryboardImage, generateFileUrl } from "@/lib/ai";

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const scriptId = searchParams.get("scriptId");

    if (!scriptId) {
      return NextResponse.json(
        { success: false, error: "scriptId is required" },
        { status: 400 }
      );
    }

    const storyboards = await storyboardManager.getStoryboards(scriptId);
    
    // 为每个分镜生成访问 URL
    const storyboardsWithUrls = await Promise.all(
      storyboards.map(async (sb) => {
        try {
          // 兼容旧数据：将 characterId 转换为 characterIds 数组
          let characterIds: string[] | null = null;
          
          // 优先使用新的 characterIds 字段
          if (sb.characterIds) {
            try {
              characterIds = JSON.parse(sb.characterIds);
            } catch (e) {
              console.error('Failed to parse characterIds:', sb.characterIds);
            }
          }
          // 如果没有 characterIds，但 有旧的 characterId，则转换
          else if ((sb as any).characterId) {
            characterIds = [(sb as any).characterId];
          }

          // 检查是否是完整URL（旧数据），如果是则直接使用，否则生成签名URL
          const isFullUrl = (url: string | null) => {
            if (!url) return false;
            return url.startsWith('http://') || url.startsWith('https://');
          };

          return {
            ...sb,
            characterIds, // 解析后的数组
            imageUrl: isFullUrl(sb.imageUrl) 
              ? sb.imageUrl 
              : (sb.imageUrl ? await generateFileUrl(sb.imageUrl) : null),
            videoUrl: isFullUrl(sb.videoUrl)
              ? sb.videoUrl
              : (sb.videoUrl ? await generateFileUrl(sb.videoUrl) : null),
            audioUrl: isFullUrl(sb.audioUrl)
              ? sb.audioUrl
              : (sb.audioUrl ? await generateFileUrl(sb.audioUrl) : null),
          };
        } catch (error) {
          console.error('Error generating URL for storyboard:', sb.id, error);
          // 如果某个分镜的 URL 生成失败，保留原始数据并继续
          return {
            ...sb,
            imageUrl: sb.imageUrl,
            videoUrl: sb.videoUrl,
            audioUrl: sb.audioUrl,
          };
        }
      })
    );
    
    return NextResponse.json({ success: true, data: storyboardsWithUrls });
  } catch (error) {
    console.error("Error fetching storyboards:", error);
    return NextResponse.json(
      { success: false, error: "Failed to fetch storyboards" },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    
    // 如果需要 AI 生成分镜描述
    if (body.aiGenerate) {
      const scriptResponse = await fetch(`/api/scripts/${body.scriptId}`);
      const scriptResult = await scriptResponse.json();
      
      if (scriptResult.success) {
        const description = await generateStoryboardDescription(
          scriptResult.data.storyContent || '',
          body.sequence || 1
        );
        body.description = description;
      }
    }
    
    // 如果需要 AI 生成图片
    let imageData: { imageUrl: string; fileKey: string } | null = null;
    if (body.generateImage && body.prompt) {
      // 获取角色形象（如果分镜有关联角色）
      let characterImageUrls: string[] = [];
      
      // 解析 characterIds JSON 字符串为数组
      let characterIds: string[] = [];
      if (body.characterIds) {
        try {
          characterIds = typeof body.characterIds === 'string' 
            ? JSON.parse(body.characterIds) 
            : body.characterIds;
        } catch (e) {
          console.error('Failed to parse characterIds:', body.characterIds);
        }
      }

      // 获取所有关联角色的形象
      for (const charId of characterIds) {
        const character = await characterManager.getCharacterById(charId);
        if (character && character.avatarUrl) {
          characterImageUrls.push(await generateFileUrl(character.avatarUrl));
        }
      }

      // 获取场景背景图和参考图（如果分镜有关联场景）
      let sceneBackgroundUrl: string | undefined = undefined;
      let sceneReferenceUrl: string | undefined = undefined;
      if (body.sceneId) {
        const scene = await sceneManager.getSceneById(body.sceneId);
        if (scene) {
          if (scene.backgroundUrl) {
            sceneBackgroundUrl = await generateFileUrl(scene.backgroundUrl);
          }
          if (scene.referenceImageUrl) {
            sceneReferenceUrl = await generateFileUrl(scene.referenceImageUrl);
          }
        }
      }

      // 生成分镜图片（使用角色形象、场景背景图和参考图）
      imageData = await generateStoryboardImage(
        body.prompt,
        '2K',
        characterImageUrls,  // 角色形象 URL 数组
        sceneBackgroundUrl,  // 场景背景图
        sceneReferenceUrl    // 场景参考图
      );
      body.imageUrl = imageData.fileKey;
    }

    const storyboard = await storyboardManager.createStoryboard(body);

    return NextResponse.json({
      success: true,
      data: {
        ...storyboard,
        imageUrl: imageData?.imageUrl,
      }
    }, { status: 201 });
  } catch (error) {
    console.error("Error creating storyboard:", error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json(
      { success: false, error: errorMessage },
      { status: 500 }
    );
  }
}
