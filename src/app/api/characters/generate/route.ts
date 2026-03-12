import { NextRequest, NextResponse } from "next/server";
import { generateCharacterDesign } from "@/lib/ai";
import { scriptManager } from "@/storage/database";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { scriptId, characterName, existingCharacters } = body;

    if (!scriptId) {
      return NextResponse.json(
        { success: false, error: "scriptId is required" },
        { status: 400 }
      );
    }

    // 直接从数据库获取剧本信息
    const script = await scriptManager.getScriptById(scriptId);

    if (!script) {
      return NextResponse.json(
        { success: false, error: "Script not found" },
        { status: 404 }
      );
    }

    // 构建上下文信息
    let context = `剧本类型：${script.type}\n`;
    context += `剧本标题：${script.title}\n`;
    if (script.description) {
      context += `剧本描述：${script.description}\n`;
    }
    if (script.storyContent) {
      context += `故事内容：${script.storyContent}\n`;
    }

    if (existingCharacters && existingCharacters.length > 0) {
      context += `\n已有角色：\n`;
      existingCharacters.forEach((char: { name: string }) => {
        context += `- ${char.name}\n`;
      });
    }

    // AI 生成角色设定
    const characterDesign = await generateCharacterDesign(
      characterName || '新角色',
      context
    );

    return NextResponse.json({
      success: true,
      data: characterDesign,
    });
  } catch (error) {
    console.error("Error generating character:", error);
    return NextResponse.json(
      { success: false, error: "Failed to generate character" },
      { status: 500 }
    );
  }
}
