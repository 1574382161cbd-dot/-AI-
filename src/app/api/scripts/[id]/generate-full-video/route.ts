import { NextRequest, NextResponse } from "next/server";
import { storyboardManager, scriptManager } from "@/storage/database";
import { generateFileUrl, concatenateVideos, VideoWithTransition } from "@/lib/ai";

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

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

    // 按顺序排列分镜
    storyboardsWithVideo.sort((a, b) => a.sequence - b.sequence);

    // 提取视频信息和转场类型
    const videoData: VideoWithTransition[] = storyboardsWithVideo.map(sb => ({
      videoKey: sb.videoUrl!,
      transitionType: sb.transitionType as 'cut' | 'fade' | 'zoom' | undefined,
      duration: sb.duration || 5,
    }));

    console.log('[generate-full-video] Video data with transitions:', 
      videoData.map((v, i) => ({
        index: i,
        transition: v.transitionType || 'none',
        duration: v.duration
      }))
    );

    // 拼接视频（带转场特效）
    const fullVideoKey = await concatenateVideos(videoData);

    // 保存到数据库
    await scriptManager.updateScript(id, {
      fullVideoUrl: fullVideoKey,
    });

    // 生成访问 URL
    const fullVideoUrl = await generateFileUrl(fullVideoKey);

    return NextResponse.json({
      success: true,
      data: {
        videoKey: fullVideoKey,
        videoUrl: fullVideoUrl,
        storyboardCount: storyboardsWithVideo.length,
      },
    });
  } catch (error) {
    console.error("Error generating full video:", error);
    return NextResponse.json(
      { success: false, error: "Failed to generate full video" },
      { status: 500 }
    );
  }
}
