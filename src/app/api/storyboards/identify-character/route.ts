import { NextRequest, NextResponse } from "next/server";
import { chatWithLLM } from "@/lib/ai";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { description, characters } = body;

    if (!description) {
      return NextResponse.json(
        { success: false, error: "description is required" },
        { status: 400 }
      );
    }

    if (!characters || !Array.isArray(characters)) {
      return NextResponse.json(
        { success: false, error: "characters is required" },
        { status: 400 }
      );
    }

    // 如果没有角色，直接返回空
    if (characters.length === 0) {
      return NextResponse.json({
        success: true,
        data: {
          matchedCharacters: [],
          unmatchedText: description,
        },
      });
    }

    // 构建角色名称列表
    const characterNames = characters.map((c: any) => c.name);
    const characterNamesStr = characterNames.join('、');

    // 使用 LLM 分析分镜描述，识别涉及的角色
    const messages = [
      {
        role: "system" as const,
        content: `你是一个专业的角色识别助手。根据分镜描述，识别该分镜中涉及的角色。

请分析分镜描述，并返回：
1. 匹配到的角色名称列表（从提供的角色列表中选择）
2. 未匹配的文本（描述中不涉及角色的部分）

请以 JSON 格式返回，格式如下：
{
  "matchedCharacters": ["角色名1", "角色名2"],
  "unmatchedText": "未匹配的文本描述"
}

重要提示：
- 只返回在提供的角色列表中存在的角色名称
- 如果没有涉及任何角色，返回空数组
- 角色名称必须与提供的角色列表完全一致（包括大小写、空格）`,
      },
      {
        role: "user" as const,
        content: `分镜描述：${description}\n\n角色列表：${characterNamesStr}\n\n请识别该分镜中涉及的角色。`,
      },
    ];

    const response = await chatWithLLM(messages, { temperature: 0.1 });

    // 解析 LLM 返回的 JSON
    try {
      const jsonMatch = response.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        const parsed = JSON.parse(jsonMatch[0]);
        const matchedCharacterNames = parsed.matchedCharacters || [];

        // 匹配角色 ID
        const matchedCharacters = matchedCharacterNames
          .map((name: string) => {
            const character = characters.find((c: any) => c.name === name);
            return character ? { id: character.id, name: character.name } : null;
          })
          .filter(Boolean);

        return NextResponse.json({
          success: true,
          data: {
            matchedCharacters,
            unmatchedText: parsed.unmatchedText || description,
          },
        });
      }
    } catch (e) {
      console.error('Failed to parse character identification JSON:', e);
    }

    // 如果解析失败，返回空
    return NextResponse.json({
      success: true,
      data: {
        matchedCharacters: [],
        unmatchedText: description,
      },
    });
  } catch (error) {
    console.error("Error identifying characters:", error);
    return NextResponse.json(
      { success: false, error: "识别角色失败" },
      { status: 500 }
    );
  }
}
