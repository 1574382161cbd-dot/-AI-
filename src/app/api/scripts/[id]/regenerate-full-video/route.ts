import { NextRequest, NextResponse } from "next/server";
import { storyboardManager, scriptManager } from "@/storage/database";
import { generateFileUrl, concatenateVideos } from "@/lib/ai";

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    console.log(`[regenerate-full-video] Starting for script: ${id}`);

    // 获取该剧本的所有分镜
    const storyboards = await storyboardManager.getStoryboards(id);

    if (!storyboards || storyboards.length === 0) {
      return NextResponse.json(
        { success: false, error: "No storyboards found" },
        { status: 404 }
      );
    }

    // 检查所有分镜是否已生成视频
    const storyboardsWithVideo = storyboards.filter(sb => sb.videoUrl);

    if (storyboardsWithVideo.length === 0) {
      return NextResponse.json(
        { success: false, error: "No videos found in storyboards" },
        { status: 400 }
      );
    }

    if (storyboardsWithVideo.length < storyboards.length) {
      return NextResponse.json(
        {
          success: false,
          error: `${storyboards.length - storyboardsWithVideo.length} storyboards do not have videos yet`
        },
        { status: 400 }
      );
    }

    console.log(`[regenerate-full-video] Found ${storyboardsWithVideo.length} storyboards with videos`);

    // 按顺序排列分镜
    storyboardsWithVideo.sort((a, b) => a.sequence - b.sequence);

    // 提取所有 videoKey
    const videoKeys = storyboardsWithVideo
      .map(sb => sb.videoUrl)
      .filter((url): url is string => url !== null);

    // 拼接视频
    console.log('[regenerate-full-video] Starting video concatenation...');
    const fullVideoKey = await concatenateVideos(videoKeys);

    // 保存到数据库
    await scriptManager.updateScript(id, {
      fullVideoUrl: fullVideoKey,
    });

    // 生成访问 URL
    const fullVideoUrl = await generateFileUrl(fullVideoKey);

    console.log('[regenerate-full-video] Done! Video key:', fullVideoKey);

    return NextResponse.json({
      success: true,
      data: {
        videoKey: fullVideoKey,
        videoUrl: fullVideoUrl,
        storyboardCount: storyboardsWithVideo.length,
      },
    });
  } catch (error) {
    console.error("Error regenerating full video:", error);
    return NextResponse.json(
      { success: false, error: "Failed to regenerate full video" },
      { status: 500 }
    );
  }
}
