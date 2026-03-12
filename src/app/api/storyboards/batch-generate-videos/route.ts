import { NextRequest, NextResponse } from "next/server";
import { storyboardManager, scriptManager } from "@/storage/database";
import { generateStoryboardVideo, generateFileUrl, VideoModelId } from "@/lib/ai";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { storyboardIds, resolution = '720p', model = 'seedance-1.5' } = body;
    
    // 验证分辨率参数
    const validResolution = ['480p', '720p'].includes(resolution) ? resolution as '480p' | '720p' : '720p';
    // 验证模型参数
    const validModel = model === 'seedance-1.5' ? model as VideoModelId : 'seedance-1.5';

    if (!Array.isArray(storyboardIds) || storyboardIds.length === 0) {
      return NextResponse.json(
        { success: false, error: "请选择要生成视频的分镜" },
        { status: 400 }
      );
    }

    // 创建支持流式响应
    const encoder = new TextEncoder();
    let isClientConnected = true;
    
    const stream = new ReadableStream({
      async start(controller) {
        const safeSend = (data: string) => {
          if (!isClientConnected) return false;
          try {
            controller.enqueue(encoder.encode(data));
            return true;
          } catch (e) {
            console.error('Failed to send data:', e);
            isClientConnected = false;
            return false;
          }
        };

        const sendProgress = (data: any) => {
          safeSend(`data: ${JSON.stringify(data)}\n\n`);
        };

        const results: Array<{
          storyboardId: string;
          success: boolean;
          videoUrl?: string;
          error?: string;
        }> = [];

        const total = storyboardIds.length;

        // 发送开始信号
        sendProgress({
          type: 'start',
          message: `开始生成 ${total} 个分镜视频`,
          total,
        });

        for (let i = 0; i < storyboardIds.length; i++) {
          const storyboardId = storyboardIds[i];
          
          try {
            // 获取分镜信息
            const storyboard = await storyboardManager.getStoryboardById(storyboardId);
            if (!storyboard) {
              results.push({
                storyboardId,
                success: false,
                error: '分镜不存在',
              });
              sendProgress({
                type: 'error',
                storyboardId,
                message: `分镜 ${i + 1}/${total} 不存在`,
                progress: Math.round(((i + 1) / total) * 100),
              });
              continue;
            }

            // 检查是否有分镜图片
            if (!storyboard.imageUrl) {
              results.push({
                storyboardId,
                success: false,
                error: '分镜图片不存在',
              });
              sendProgress({
                type: 'error',
                storyboardId,
                message: `分镜 "${storyboard.description?.substring(0, 20)}..." 没有图片`,
                progress: Math.round(((i + 1) / total) * 100),
              });
              continue;
            }

            // 发送进度
            sendProgress({
              type: 'progress',
              storyboardId,
              message: `正在生成分镜 ${i + 1}/${total} 的视频（含音频）...`,
              description: storyboard.description?.substring(0, 50),
              progress: Math.round(((i + 0.5) / total) * 100),
            });

            // 获取分镜图片 URL
            const isFullUrl = storyboard.imageUrl.startsWith('http://') || storyboard.imageUrl.startsWith('https://');
            const storyboardImageUrl = isFullUrl ? storyboard.imageUrl : await generateFileUrl(storyboard.imageUrl);

            // 获取剧本信息
            const script = await scriptManager.getScriptById(storyboard.scriptId);
            const scriptType = (script?.type === '剧情演绎' || script?.type === '旁白解说') 
              ? script.type 
              : '旁白解说' as '剧情演绎' | '旁白解说';

            // 确定对话内容
            let dialogue: string | undefined = undefined;
            if (scriptType === '剧情演绎' && storyboard.dialogue) {
              dialogue = storyboard.dialogue;
              console.log(`[batch-generate-videos] Storyboard ${storyboardId} using dialogue:`, dialogue);
            }

            // 生成视频（内置音频）
            const duration = storyboard.duration || 5;
            const videoFileKey = await generateStoryboardVideo(
              storyboardImageUrl,
              storyboard.description || '',
              duration,
              validResolution,
              validModel,
              dialogue, // 传入对话内容，模型会自动生成语音
              true // 启用音频生成
            );

            // 更新分镜
            await storyboardManager.updateStoryboard(storyboardId, {
              videoUrl: videoFileKey,
              duration,
              isGenerated: true,
            });

            // 生成访问 URL
            const videoUrl = await generateFileUrl(videoFileKey);

            results.push({
              storyboardId,
              success: true,
              videoUrl,
            });

            // 发送成功进度
            sendProgress({
              type: 'success',
              storyboardId,
              message: `分镜 ${i + 1}/${total} 视频生成完成`,
              progress: Math.round(((i + 1) / total) * 100),
              videoUrl,
            });

          } catch (error: any) {
            console.error(`Error generating video for storyboard ${storyboardId}:`, error);
            
            // 提供更友好的错误信息
            let errorMessage = error.message || '视频生成失败';
            if (errorMessage.includes('超时')) {
              errorMessage = '视频生成超时，请稍后重试';
            } else if (errorMessage.includes('频繁') || errorMessage.includes('限流')) {
              errorMessage = '请求过于频繁，请稍后重试';
            }
            
            results.push({
              storyboardId,
              success: false,
              error: errorMessage,
            });
            sendProgress({
              type: 'error',
              storyboardId,
              message: `分镜 ${i + 1}/${total} 视频生成失败: ${errorMessage}`,
              progress: Math.round(((i + 1) / total) * 100),
            });
          }
        }

        // 发送完成信号
        const successCount = results.filter(r => r.success).length;
        const failCount = results.length - successCount;
        
        sendProgress({
          type: 'complete',
          message: `视频生成完成！成功: ${successCount}, 失败: ${failCount}`,
          successCount,
          failCount,
          results,
        });

        try {
          controller.close();
        } catch (e) {
          // 忽略关闭错误
        }
      },
    });

    return new Response(stream, {
      headers: {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        'Connection': 'keep-alive',
      },
    });
  } catch (error) {
    console.error('Error in batch video generation:', error);
    return NextResponse.json(
      { success: false, error: '批量生成视频失败' },
      { status: 500 }
    );
  }
}
