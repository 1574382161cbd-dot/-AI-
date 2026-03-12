import { NextRequest, NextResponse } from "next/server";
import { scriptManager, sceneManager } from "@/storage/database";
import { chatWithLLM, generateSceneImages, generateFileUrl } from "@/lib/ai";

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    // 获取剧本信息
    const script = await scriptManager.getScriptById(id);
    if (!script) {
      return NextResponse.json(
        { success: false, error: "剧本不存在" },
        { status: 404 }
      );
    }

    // 获取故事风格
    const storyStyle = (script as any).storyStyle;

    // 使用 LLM 分析剧本，识别场景
    const messages = [
      {
        role: "system" as const,
        content: `你是一个专业的场景识别助手。根据剧本内容，识别故事中的主要场景。

请识别以下信息：
1. 场景名称（地点名称）
2. 场景描述（环境特点、氛围）
3. 场景背景描述（用于生成背景图的详细描述）

请以 JSON 格式返回，格式如下：
{
  "scenes": [
    {
      "name": "场景名称",
      "description": "场景描述",
      "backgroundDescription": "详细的背景描述，用于生成背景图"
    }
  ]
}

要求：
- 识别所有主要场景（通常 3-6 个）
- 场景名称要清晰明确
- 描述要详细具体
- 背景描述要适合 AI 生成图片，包含光线、氛围、风格等要素`,
      },
      {
        role: "user" as const,
        content: `剧本内容：${script.storyContent || '无'}

请识别这个故事中的所有主要场景。`,
      },
    ];

    const response = await chatWithLLM(messages, { temperature: 0.5 });

    // 解析 LLM 返回的 JSON
    try {
      const jsonMatch = response.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        const parsed = JSON.parse(jsonMatch[0]);
        const scenes = parsed.scenes || [];

        if (scenes.length === 0) {
          return NextResponse.json(
            { success: false, error: "未识别到任何场景" },
            { status: 400 }
          );
        }

        // 删除旧场景
        const existingScenes = await sceneManager.getScenes(id);
        for (const scene of existingScenes) {
          await sceneManager.deleteScene(scene.id);
        }

        // 创建新场景
        const createdScenes = [];
        for (const scene of scenes) {
          const createdScene = await sceneManager.createScene({
            scriptId: id,
            name: scene.name,
            description: scene.description,
          });

          // 生成场景背景图（纯背景，无人物）
          if (scene.backgroundDescription) {
            const sceneImages = await generateSceneImages(
              scene.backgroundDescription,
              1,
              storyStyle
            );

            if (sceneImages.length > 0) {
              const updatedScene = await sceneManager.updateScene(createdScene.id, {
                backgroundUrl: sceneImages[0].fileKey,
              });

              if (updatedScene) {
                createdScenes.push({
                  ...updatedScene,
                  backgroundImageUrl: sceneImages[0].url,
                });
              }
            } else {
              createdScenes.push(createdScene);
            }
          } else {
            createdScenes.push(createdScene);
          }
        }

        return NextResponse.json({
          success: true,
          message: `成功重新生成 ${createdScenes.length} 个场景`,
          data: createdScenes,
        });
      }
    } catch (e) {
      console.error('Failed to parse scenes JSON:', e);
    }

    return NextResponse.json(
      { success: false, error: "解析场景信息失败" },
      { status: 500 }
    );
  } catch (error) {
    console.error("Error regenerating all scenes:", error);
    return NextResponse.json(
      { success: false, error: "重新生成场景失败" },
      { status: 500 }
    );
  }
}
