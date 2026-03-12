import { NextRequest, NextResponse } from "next/server";
import { scriptManager, characterManager, storyboardManager } from "@/storage/database";
import { chatWithLLM, generateCharacterImages, generateStoryboardImage, generateStoryboardVideo, generateNarrationAudio, generateFileUrl, mergeAudioAndVideo } from "@/lib/ai";

interface RegenerateAllProgress {
  step: string;
  message: string;
  progress: number;
  currentStepIndex?: number;
  totalSteps?: number;
  steps?: Array<{
    name: string;
    status: 'pending' | 'in_progress' | 'completed';
    detail?: string;
  }>;
}

export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id: scriptId } = await params;

  // 获取剧本信息
  const script = await scriptManager.getScriptById(scriptId);
  if (!script) {
    return NextResponse.json(
      { success: false, error: "Script not found" },
      { status: 404 }
    );
  }

  // 创建支持流式响应
  const encoder = new TextEncoder();
  const stream = new ReadableStream({
    async start(controller) {
      const sendProgress = (progress: RegenerateAllProgress) => {
        controller.enqueue(
          encoder.encode(`data: ${JSON.stringify(progress)}\n\n`)
        );
      };

      // 初始化步骤列表
      const steps = [
        { name: '清理旧数据', status: 'pending' as const, detail: '' as string },
        { name: '重新生成角色', status: 'pending' as const, detail: '' as string },
        { name: '生成分镜描述', status: 'pending' as const, detail: '' as string },
        { name: '生成分镜图片', status: 'pending' as const, detail: '' as string },
        { name: '生成分镜视频', status: 'pending' as const, detail: '' as string },
      ];

      const updateStep = (index: number, status: 'pending' | 'in_progress' | 'completed', detail?: string) => {
        (steps[index] as any).status = status;
        if (detail !== undefined) {
          steps[index].detail = detail;
        }
      };

      try {
        // 步骤 1: 清理旧数据
        updateStep(0, 'in_progress', '正在清理旧数据...');
        sendProgress({
          step: 'cleanup',
          message: '正在清理旧数据...',
          progress: 5,
          currentStepIndex: 0,
          totalSteps: 5,
          steps: [...steps],
        });

        // 删除所有分镜
        const storyboards = await storyboardManager.getStoryboards(scriptId);
        for (const sb of storyboards) {
          await storyboardManager.deleteStoryboard(sb.id);
        }

        // 删除所有角色
        const existingCharacters = await characterManager.getCharacters(scriptId);
        for (const char of existingCharacters) {
          await characterManager.deleteCharacter(char.id);
        }

        updateStep(0, 'completed');
        sendProgress({
          step: 'cleanup',
          message: '已清理旧数据',
          progress: 10,
          currentStepIndex: 0,
          totalSteps: 5,
          steps: [...steps],
        });

        // 步骤 2: 重新生成角色
        updateStep(1, 'in_progress', '正在分析剧本，识别角色...');
        sendProgress({
          step: 'characters',
          message: '正在分析剧本，识别角色...',
          progress: 10,
          currentStepIndex: 1,
          totalSteps: 5,
          steps: [...steps],
        });

        // 调用生成角色的函数
        const characters = await generateCharacters(script);
        
        const createdCharacters = [];
        for (let i = 0; i < characters.length; i++) {
          const char = characters[i];
          const progress = 10 + (i + 1) * 5;
          
          sendProgress({
            step: 'characters',
            message: `正在创建角色: ${char.name}...`,
            progress,
            currentStepIndex: 1,
            totalSteps: 5,
            steps: [...steps],
          });

          const createdChar = await characterManager.createCharacter({
            scriptId: script.id,
            ...char,
          });

          // 生成角色形象
          if (char.appearance) {
            sendProgress({
              step: 'characters',
              message: `正在生成角色 ${char.name} 的形象...`,
              progress,
              currentStepIndex: 1,
              totalSteps: 5,
              steps: [...steps],
            });

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

          sendProgress({
            step: 'characters',
            message: `已创建角色: ${char.name}`,
            progress,
            currentStepIndex: 1,
            totalSteps: 5,
            steps: [...steps],
          });
        }

        updateStep(1, 'completed');

        // 步骤 3: AI 生成分镜描述
        updateStep(2, 'in_progress', '正在生成分镜描述...');
        sendProgress({
          step: 'storyboards',
          message: '正在生成分镜描述...',
          progress: 40,
          currentStepIndex: 2,
          totalSteps: 5,
          steps: [...steps],
        });

        const storyboardDescriptions = await generateStoryboardDescriptions(script, createdCharacters);
        updateStep(2, 'completed');

        // 步骤 4: 生成分镜图片
        updateStep(3, 'in_progress', `正在生成 ${storyboardDescriptions.length} 个分镜的图片...`);
        sendProgress({
          step: 'images',
          message: `正在生成 ${storyboardDescriptions.length} 个分镜的图片...`,
          progress: 40,
          currentStepIndex: 3,
          totalSteps: 5,
          steps: [...steps],
        });

        const createdStoryboards = [];
        for (let i = 0; i < storyboardDescriptions.length; i++) {
          const sb = storyboardDescriptions[i];
          const progress = 40 + (i + 1) * 8;
          
          sendProgress({
            step: 'images',
            message: `正在生成分镜 ${i + 1}/${storyboardDescriptions.length} 的图片...`,
            progress,
            currentStepIndex: 3,
            totalSteps: 5,
            steps: [...steps],
          });

          // 匹配角色 ID 和获取角色形象（支持多角色）
          let characterIds: string[] = [];
          let characterAvatarUrls: string[] = [];
          if (sb.characters && sb.characters.length > 0) {
            for (const charName of sb.characters) {
              const character = createdCharacters.find((c: any) => c.name === charName);
              if (character) {
                characterIds.push(character.id);
                if (character.avatarUrl) {
                  characterAvatarUrls.push(await generateFileUrl(character.avatarUrl));
                }
              }
            }
          }

          // 生成分镜图片（传递角色形象以保持角色一致性）
          const imageData = await generateStoryboardImage(
            sb.prompt,
            '2K',
            characterAvatarUrls  // 传入角色形象 URL 数组
          );

          // 创建分镜记录
          const createdSb = await storyboardManager.createStoryboard({
            scriptId: script.id,
            sequence: sb.sequence,
            description: sb.description,
            prompt: sb.prompt,
            imageUrl: imageData.fileKey,
            characterIds: characterIds.length > 0 ? JSON.stringify(characterIds) : null,
            duration: sb.duration || 5,
            transitionType: sb.transitionType || 'cut',
            cameraAngle: sb.cameraAngle || 'three_quarter',
            isGenerated: false,
          });

          createdStoryboards.push({
            ...createdSb,
            imageUrl: imageData.imageUrl,
          });

          sendProgress({
            step: 'images',
            message: `已生成分镜 ${i + 1}/${storyboardDescriptions.length} 的图片`,
            progress,
          });
        }

        updateStep(3, 'completed');
        updateStep(4, 'completed');

        // 发送完成信号
        sendProgress({
          step: 'complete',
          message: '全部重新生成完成！',
          progress: 100,
          currentStepIndex: 4,
          totalSteps: 5,
          steps: steps.map(s => ({ ...s, status: 'completed' as const })),
        });

      } catch (error) {
        console.error('Error in regenerate all:', error);
        controller.enqueue(
          encoder.encode(`data: ${JSON.stringify({
            step: 'error',
            message: `生成失败: ${error instanceof Error ? error.message : 'Unknown error'}`,
            progress: 0,
          })}\n\n`)
        );
      } finally {
        controller.close();
      }
    },
  });

  return new NextResponse(stream, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      'Connection': 'keep-alive',
    },
  });
}

// AI 生成角色
async function generateCharacters(script: any) {
  const messages: Array<{ role: 'system' | 'user'; content: string }> = [
    {
      role: 'system',
      content: `你是一个专业的角色设计师。根据故事内容，识别并生成所有角色的详细信息。

对于每个角色，提供：
1. 名字
2. 描述（角色在故事中的身份、背景）
3. 外观（详细的五官、身材、服装、发型等）
4. 性格（性格特征、行为习惯、说话方式）

请以 JSON 格式返回，格式如下：
{
  "characters": [
    {
      "name": "角色名",
      "description": "角色描述",
      "appearance": "外观描述",
      "personality": "性格特征"
    }
  ]
}

要求：
- 名字要简洁好记
- 外观描述要详细具体，便于 AI 生成形象
- 性格特征要鲜明突出
- 确保角色名字的格式统一（中文或英文）`
    },
    {
      role: 'user',
      content: `剧本类型：${script.type}\n剧本标题：${script.title}\n故事内容：${script.storyContent || ''}\n\n请识别这个故事中的所有角色，并生成详细的角色设定。`
    }
  ];

  const response = await chatWithLLM(messages, { temperature: 0.7 });

  // 尝试解析 JSON
  try {
    const jsonMatch = response.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      const parsed = JSON.parse(jsonMatch[0]);
      return parsed.characters || [];
    }
  } catch (e) {
    console.error('Failed to parse characters JSON:', e);
  }

  // 如果解析失败，返回默认角色
  return [
    {
      name: '主角',
      description: '故事的主角',
      appearance: '普通人的外貌，穿着日常服装',
      personality: '善良勇敢',
    }
  ];
}

// AI 生成分镜描述
async function generateStoryboardDescriptions(script: any, characters: any[]) {
  const characterNames = characters.map(c => c.name).join('、');

  const messages: Array<{ role: 'system' | 'user'; content: string }> = [
    {
      role: 'system',
      content: `你是一个专业的分镜脚本师和视觉艺术家。根据故事内容，将其拆解为 3-6 个关键分镜场景。

对于每个分镜，提供：
1. 序号（从 1 开始）
2. 详细描述（包括画面内容、角色动作、表情、镜头运动、光线氛围）
3. 生图提示词（用于 AI 生成图片，必须包含以下要素）：
   - 主体描述：明确描述画面中的主要人物、动物、物体
   - 动作与表情：详细描述人物的姿态、动作、表情、眼神
   - 场景环境：描述背景、地点、建筑、自然景观
   - 光线与色彩：说明光线的来源、方向、强弱，以及整体色调
   - 镜头角度：说明是特写、中景、远景、俯视、仰视等
   - 风格说明：统一使用"自然写实风格，电影级画面质感，细节丰富"
4. 涉及角色（该分镜中出现的角色名称列表，如果没有则返回空数组）
5. 时长（视频时长，单位秒，建议 3-10 秒）
6. 转场类型（cut/fade/zoom 三选一）

请以 JSON 格式返回，格式如下：
{
  "storyboards": [
    {
      "sequence": 1,
      "description": "分镜描述",
      "prompt": "详细的生图提示词，包含主体、动作、场景、光线、镜头、风格等要素",
      "characters": ["角色名1", "角色名2"],
      "duration": 5,
      "transitionType": "cut"
    }
  ]
}

重要提示：
- 剧情演绎类型：侧重角色互动、表情细节和情感表达，多用中景、特写镜头
- 旁白解说类型：侧重画面描述和内容展示，多用远景、全景镜头
- prompt 必须用中文描述，清晰明确，避免模糊表述
- 确保角色名称与提供的角色列表中的名称一致
- 如果某个分镜涉及特定角色，要在 prompt 中明确描述该角色的外貌特征`
    },
    {
      role: 'user',
      content: `剧本类型：${script.type}\n剧本标题：${script.title}\n故事内容：${script.storyContent || ''}\n\n涉及角色：${characterNames}\n\n请将这个故事拆解为 3-6 个关键分镜场景，为每个分镜生成详细的画面描述和高质量的生图提示词。`
    }
  ];

  const response = await chatWithLLM(messages, { temperature: 0.8 });

  // 尝试解析 JSON
  try {
    const jsonMatch = response.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      const parsed = JSON.parse(jsonMatch[0]);
      return parsed.storyboards || [];
    }
  } catch (e) {
    console.error('Failed to parse storyboards JSON:', e);
  }

  // 如果解析失败，返回默认分镜
  return [
    {
      sequence: 1,
      description: '开场场景',
      prompt: '自然写实风格，电影级画面质感，细节丰富的开场场景，全景镜头',
      characters: [],
      duration: 5,
      transitionType: 'cut'
    }
  ];
}
