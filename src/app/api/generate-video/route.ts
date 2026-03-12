import { NextRequest } from "next/server";
import { storyboardManager, scriptManager } from "@/storage/database";
import { generateStoryboardVideo, generateFileUrl, VideoModelId } from "@/lib/ai";

export const maxDuration = 600; // 设置最大超时时间为 10 分钟

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { storyboardId, resolution = '720p', duration = 5, model = 'seedance-1.5' } = body;
    
    // 验证分辨率参数
    const validResolution = ['480p', '720p'].includes(resolution) ? resolution as '480p' | '720p' : '720p';
    // 验证时长参数（4-12秒）
    const validDuration = Math.max(4, Math.min(12, Number(duration) || 5));
    // 验证模型参数
    const validModel = model === 'seedance-1.5' ? model as VideoModelId : 'seedance-1.5';

    if (!storyboardId) {
      return new Response(JSON.stringify({ error: "storyboardId is required" }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    console.log('[generate-video] Starting generation for storyboard:', storyboardId);

    // 获取分镜信息
    const storyboard = await storyboardManager.getStoryboardById(storyboardId);
    if (!storyboard) {
      return new Response(JSON.stringify({ error: '分镜不存在' }), {
        status: 404,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    // 获取剧本信息
    const script = await scriptManager.getScriptById(storyboard.scriptId);
    if (!script) {
      return new Response(JSON.stringify({ error: '剧本不存在' }), {
        status: 404,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    console.log('[generate-video] Storyboard and script loaded');

    // 获取分镜图片 URL
    let storyboardImageUrl: string | undefined = undefined;
    if (storyboard.imageUrl) {
      storyboardImageUrl = await generateFileUrl(storyboard.imageUrl);
    }

    if (!storyboardImageUrl) {
      return new Response(JSON.stringify({ error: '分镜图片不存在，无法生成视频' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    console.log('[generate-video] Starting video generation with audio...');

    // 获取剧本类型
    const scriptType = (script.type === '剧情演绎' || script.type === '旁白解说') 
      ? script.type 
      : '旁白解说' as '剧情演绎' | '旁白解说';

    // 确定对话内容
    let dialogue: string | undefined = undefined;
    if (scriptType === '剧情演绎' && storyboard.dialogue) {
      dialogue = storyboard.dialogue;
      console.log('[generate-video] Using dialogue for video audio:', dialogue);
    }

    // 生成视频（内置音频）
    const videoFileKey = await generateStoryboardVideo(
      storyboardImageUrl,
      storyboard.description || '',
      validDuration,
      validResolution,
      validModel,
      dialogue, // 传入对话内容，模型会自动生成语音
      true // 启用音频生成
    );

    console.log('[generate-video] Video with audio generated, updating storyboard...');

    // 更新分镜
    const updated = await storyboardManager.updateStoryboard(storyboardId, {
      videoUrl: videoFileKey,
      duration: validDuration,
      isGenerated: true,
    });

    if (!updated) {
      return new Response(JSON.stringify({ error: '更新分镜失败' }), {
        status: 500,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    // 生成访问 URL
    const videoUrl = await generateFileUrl(videoFileKey);

    console.log('[generate-video] Done!');

    return new Response(JSON.stringify({
      success: true,
      data: {
        ...updated,
        videoUrl,
      }
    }), {
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (error: any) {
    console.error("Error generating video:", error);
    
    // 提供更友好的错误信息
    let errorMessage = error.message || '视频生成失败';
    if (errorMessage.includes('超时')) {
      errorMessage = '视频生成超时，AI正在处理中，请稍后重试';
    } else if (errorMessage.includes('频繁') || errorMessage.includes('限流')) {
      errorMessage = '请求过于频繁，请等待1-2分钟后再试';
    }
    
    return new Response(JSON.stringify({ error: errorMessage }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
}
