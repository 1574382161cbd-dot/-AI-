import { NextRequest, NextResponse } from "next/server";
import { scriptManager } from "@/storage/database";
import { generateFileUrl } from "@/lib/ai";

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const type = searchParams.get("type") || undefined;

    const scripts = await scriptManager.getScripts({ type });

    // 转换每个剧本的 fullVideoUrl 为完整的 presigned URL
    const isFullUrl = (url: string | null) => {
      if (!url) return false;
      return url.startsWith('http://') || url.startsWith('https://');
    };

    const processedScripts = await Promise.all(
      scripts.map(async (script) => {
        let processedFullVideoUrl = script.fullVideoUrl;
        if (script.fullVideoUrl && !isFullUrl(script.fullVideoUrl)) {
          try {
            processedFullVideoUrl = await generateFileUrl(script.fullVideoUrl);
          } catch (error) {
            console.error('Error generating URL for full video:', script.id, error);
            // 如果 URL 生成失败，保留原始数据
          }
        }
        return {
          ...script,
          fullVideoUrl: processedFullVideoUrl,
        };
      })
    );

    return NextResponse.json({ success: true, data: processedScripts });
  } catch (error) {
    console.error("Error fetching scripts:", error);
    return NextResponse.json(
      { success: false, error: "Failed to fetch scripts" },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const script = await scriptManager.createScript(body);
    return NextResponse.json({ success: true, data: script }, { status: 201 });
  } catch (error) {
    console.error("Error creating script:", error);
    return NextResponse.json(
      { success: false, error: "Failed to create script" },
      { status: 500 }
    );
  }
}
