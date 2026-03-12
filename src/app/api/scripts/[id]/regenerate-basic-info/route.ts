import { NextRequest, NextResponse } from "next/server";
import { scriptManager } from "@/storage/database";
import { chatWithLLM } from "@/lib/ai";

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

    // 使用 LLM 重新生成基本信息
    const messages = [
      {
        role: "system" as const,
        content: `你是一个专业的编剧助手。根据原始故事内容，重新生成剧本的基本信息。

请重新生成：
1. 剧本标题（更加吸引人和准确）
2. 剧本类型（剧情演绎 或 旁白解说）
3. 剧本描述（简洁有力的描述）
4. 故事内容（优化和完善原有的故事内容）

请以 JSON 格式返回，格式如下：
{
  "title": "新的标题",
  "type": "剧情演绎",
  "description": "简洁的描述",
  "storyContent": "优化后的故事内容"
}

要求：
- 保持原有的故事核心和情节不变
- 标题要更有吸引力和代表性
- 描述要简洁有力，概括故事主题
- 故事内容要更加完善和详细
- 如果原文写得好，可以保持原文
- 只返回 JSON，不要返回其他文字`,
      },
      {
        role: "user" as const,
        content: `当前剧本信息：
- 标题：${script.title}
- 类型：${script.type}
- 描述：${script.description || '无'}
- 故事内容：${script.storyContent || '无'}

请重新生成基本信息，使其更加完善和吸引人。`,
      },
    ];

    const response = await chatWithLLM(messages, { temperature: 0.7 });
    
    console.log('[regenerate-basic-info] LLM Response:', response.substring(0, 500));

    // 解析 LLM 返回的 JSON - 用最简单直接的方法
    let parsed: any = null;
    
    // 方法 1: 直接尝试解析
    try {
      parsed = JSON.parse(response);
    } catch (e) {
      console.log('[regenerate-basic-info] Direct parse failed');
    }
    
    // 方法 2: 提取 JSON 部分
    if (!parsed) {
      try {
        const jsonMatch = response.match(/\{[\s\S]*\}/);
        if (jsonMatch) {
          parsed = JSON.parse(jsonMatch[0]);
        }
      } catch (e) {
        console.log('[regenerate-basic-info] JSON extract parse failed');
      }
    }
    
    // 方法 3: 如果还是不行，用手动提取
    if (!parsed) {
      console.log('[regenerate-basic-info] Using manual extraction');
      parsed = {
        title: script.title,
        type: script.type,
        description: script.description || '',
        storyContent: response.substring(0, 2000) // 用响应作为新内容
      };
    }

    // 确保有必要的字段
    const updateData = {
      title: parsed.title || script.title,
      type: parsed.type || script.type,
      description: parsed.description || script.description || '',
      storyContent: parsed.storyContent || script.storyContent || '',
    };

    // 更新剧本
    const updated = await scriptManager.updateScript(id, updateData);

    if (!updated) {
      return NextResponse.json(
        { success: false, error: "更新剧本失败" },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      message: "基本信息重新生成成功",
      data: updated,
    });
  } catch (error) {
    console.error("Error regenerating basic info:", error);
    return NextResponse.json(
      { success: false, error: "重新生成基本信息失败" },
      { status: 500 }
    );
  }
}
