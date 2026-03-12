import { NextRequest, NextResponse } from "next/server";
import { scriptManager, characterManager } from "@/storage/database";
import { chatWithLLM, generateCharacterImages, generateFileUrl } from "@/lib/ai";

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

    // 使用 LLM 分析剧本，识别角色
    const messages = [
      {
        role: "system" as const,
        content: `你是一个专业的角色识别助手。根据剧本内容，识别故事中的所有角色。

请识别以下信息：
1. 角色名称
2. 角色描述（背景、身份、作用）
3. 角色外观（外貌特征、穿着打扮）
4. 角色性格（性格特点、行为习惯）

请以 JSON 格式返回，格式如下：
{
  "characters": [
    {
      "name": "角色名称",
      "description": "角色描述",
      "appearance": "角色外观描述",
      "personality": "角色性格描述"
    }
  ]
}

要求：
- 识别所有主要角色和重要配角
- 角色名称要清晰明确
- 描述要详细具体
- 确保角色之间有区分度`,
      },
      {
        role: "user" as const,
        content: `剧本内容：${script.storyContent || '无'}

请识别这个故事中的所有角色。`,
      },
    ];

    const response = await chatWithLLM(messages, { temperature: 0.5 });

    // 解析 LLM 返回的 JSON
    try {
      const jsonMatch = response.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        const parsed = JSON.parse(jsonMatch[0]);
        const characters = parsed.characters || [];

        if (characters.length === 0) {
          return NextResponse.json(
            { success: false, error: "未识别到任何角色" },
            { status: 400 }
          );
        }

        // 删除旧角色
        const existingCharacters = await characterManager.getCharacters(id);
        for (const char of existingCharacters) {
          await characterManager.deleteCharacter(char.id);
        }

        // 创建新角色
        const createdCharacters = [];
        for (const char of characters) {
          const createdChar = await characterManager.createCharacter({
            scriptId: id,
            name: char.name,
            description: char.description,
            appearance: char.appearance,
            personality: char.personality,
            voiceSpeed: 50, // 默认语速
            voiceStyle: 'zh_female_qingxin', // 默认音色
            voiceEmotion: 'normal', // 默认情绪
          });

          // 生成角色形象
          if (char.appearance) {
            const characterImages = await generateCharacterImages(char.appearance, 1);

            if (characterImages.length > 0) {
              const updatedChar = await characterManager.updateCharacter(createdChar.id, {
                avatarUrl: characterImages[0].fileKey,
              });

              if (updatedChar) {
                createdCharacters.push({
                  ...updatedChar,
                  avatarUrl: characterImages[0].fileKey,
                });
              }
            } else {
              createdCharacters.push(createdChar);
            }
          } else {
            createdCharacters.push(createdChar);
          }
        }

        return NextResponse.json({
          success: true,
          message: `成功重新生成 ${createdCharacters.length} 个角色`,
          data: createdCharacters,
        });
      }
    } catch (e) {
      console.error('Failed to parse characters JSON:', e);
    }

    return NextResponse.json(
      { success: false, error: "解析角色信息失败" },
      { status: 500 }
    );
  } catch (error) {
    console.error("Error regenerating all characters:", error);
    return NextResponse.json(
      { success: false, error: "重新生成角色失败" },
      { status: 500 }
    );
  }
}
