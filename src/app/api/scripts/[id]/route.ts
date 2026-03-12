import { NextRequest, NextResponse } from "next/server";
import { scriptManager } from "@/storage/database";
import { generateFileUrl } from "@/lib/ai";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const script = await scriptManager.getScriptById(id);

    if (!script) {
      return NextResponse.json(
        { success: false, error: "Script not found" },
        { status: 404 }
      );
    }

    // 转换 fullVideoUrl 为完整的 presigned URL
    const isFullUrl = (url: string | null) => {
      if (!url) return false;
      return url.startsWith('http://') || url.startsWith('https://');
    };

    let processedFullVideoUrl = script.fullVideoUrl;
    if (script.fullVideoUrl && !isFullUrl(script.fullVideoUrl)) {
      try {
        processedFullVideoUrl = await generateFileUrl(script.fullVideoUrl);
      } catch (error) {
        console.error('Error generating URL for full video:', error);
        // 如果 URL 生成失败，保留原始数据
      }
    }

    return NextResponse.json({ 
      success: true, 
      data: {
        ...script,
        fullVideoUrl: processedFullVideoUrl,
      }
    });
  } catch (error) {
    console.error("Error fetching script:", error);
    return NextResponse.json(
      { success: false, error: "Failed to fetch script" },
      { status: 500 }
    );
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await request.json();
    const script = await scriptManager.updateScript(id, body);

    if (!script) {
      return NextResponse.json(
        { success: false, error: "Script not found" },
        { status: 404 }
      );
    }

    return NextResponse.json({ success: true, data: script });
  } catch (error) {
    console.error("Error updating script:", error);
    return NextResponse.json(
      { success: false, error: "Failed to update script" },
      { status: 500 }
    );
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const success = await scriptManager.deleteScript(id);

    if (!success) {
      return NextResponse.json(
        { success: false, error: "Script not found" },
        { status: 404 }
      );
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error deleting script:", error);
    return NextResponse.json(
      { success: false, error: "Failed to delete script" },
      { status: 500 }
    );
  }
}
