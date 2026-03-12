import { NextRequest, NextResponse } from "next/server";
import { scriptManager, characterManager, storyboardManager, sceneManager } from "@/storage/database";
import { chatWithLLM, generateCharacterImages, generateCharacterThreeView, generateSceneImages, generateStoryboardImage, generateStoryboardVideo, generateNarrationAudio, generateFileUrl, mergeAudioAndVideo, detectStoryStyle } from "@/lib/ai";

// 导入安全 JSON 解析函数（需要在 ai.ts 中导出）
function safeParseJSON(text: string): any {
  // 首先尝试直接解析
  try {
    return JSON.parse(text);
  } catch (e) {
    // 继续尝试修复
  }

  // 尝试提取 JSON 块
  const jsonMatch = text.match(/\{[\s\S]*\}/);
  if (jsonMatch) {
    try {
      return JSON.parse(jsonMatch[0]);
    } catch (e) {
      // 继续尝试修复
    }
  }

  // 尝试修复不完整的 JSON
  try {
    let repaired = text.trim();
    
    // 计算未闭合的花括号和方括号
    let braceCount = 0;
    let bracketCount = 0;
    let inString = false;
    let escapeNext = false;
    
    for (let i = 0; i < repaired.length; i++) {
      const char = repaired[i];
      
      if (escapeNext) {
        escapeNext = false;
        continue;
      }
      
      if (char === '\\') {
        escapeNext = true;
        continue;
      }
      
      if (char === '"' && !escapeNext) {
        inString = !inString;
        continue;
      }
      
      if (!inString) {
        if (char === '{') braceCount++;
        else if (char === '}') braceCount--;
        else if (char === '[') bracketCount++;
        else if (char === ']') bracketCount--;
      }
    }
    
    // 如果在字符串中间被截断，需要先关闭字符串
    if (inString) {
      repaired += '"';
    }
    
    // 关闭未闭合的方括号和花括号
    for (let i = 0; i < bracketCount; i++) {
      repaired += ']';
    }
    for (let i = 0; i < braceCount; i++) {
      repaired += '}';
    }
    
    console.log('[safeParseJSON] Repaired JSON, length:', repaired.length);
    
    return JSON.parse(repaired);
  } catch (e) {
    console.error('[safeParseJSON] Failed to repair JSON:', e);
    return null;
  }
}

interface AutoGenerateProgress {
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

export async function POST(request: NextRequest) {
  const body = await request.json();
  const { title, type, description, storyContent, characterDescriptions, sceneDescriptions } = body;

  if (!title || !type || !storyContent) {
    return NextResponse.json(
      { success: false, error: "Missing required fields" },
      { status: 400 }
    );
  }

  // 解析用户提供的角色描述
  interface CharacterDescription { 
    name: string; 
    appearance: string; 
    backgroundColor?: string; // 纯色背景颜色（如"深蓝灰色"、"暖黄色"）
  }
  const userCharacterDescriptions: CharacterDescription[] = Array.isArray(characterDescriptions) ? characterDescriptions : [];
  
  // 解析用户提供的场景描述
  interface SceneDescription { name: string; description: string; }
  const userSceneDescriptions: SceneDescription[] = Array.isArray(sceneDescriptions) ? sceneDescriptions : [];

  console.log('[auto-generate] User provided character descriptions:', userCharacterDescriptions.length);
  console.log('[auto-generate] User provided scene descriptions:', userSceneDescriptions.length);

  // 创建支持流式响应
  const encoder = new TextEncoder();
  let isClientConnected = true; // 跟踪客户端连接状态
  
  const stream = new ReadableStream({
    async start(controller) {
      // 安全发送函数
      const safeSend = (data: string) => {
        if (!isClientConnected) return false;
        try {
          controller.enqueue(encoder.encode(data));
          return true;
        } catch (e) {
          console.error('Failed to send data, client may have disconnected:', e);
          isClientConnected = false;
          return false;
        }
      };

      const sendProgress = (progress: AutoGenerateProgress) => {
        safeSend(`data: ${JSON.stringify(progress)}\n\n`);
      };

      // 初始化步骤列表（新增场景生成步骤）
      const initSteps = () => [
        { name: '创建剧本', status: 'pending' as const },
        { name: '分析角色', status: 'pending' as const },
        { name: '分析场景', status: 'pending' as const },
        { name: '生成分镜描述', status: 'pending' as const },
        { name: '生成分镜图片', status: 'pending' as const },
        { name: '生成分镜视频', status: 'pending' as const },
      ];

      const updateStep = (steps: AutoGenerateProgress['steps'], index: number, status: 'pending' | 'in_progress' | 'completed', detail?: string) => {
        if (steps) {
          steps[index] = { ...steps[index], status, detail };
        }
      };

      let steps = initSteps();
      let totalSteps = steps.length;

      try {
        // ==================== 步骤 1: 创建剧本 ====================
        updateStep(steps, 0, 'in_progress', '正在分析故事风格...');
        sendProgress({
          step: 'script',
          message: '正在分析故事风格...',
          progress: 3,
          currentStepIndex: 0,
          totalSteps,
          steps: [...steps],
        });

        // 识别故事风格（用于后续生成，但不存储到数据库）
        const storyStyle = await detectStoryStyle(storyContent);
        console.log('[auto-generate] Detected story style:', storyStyle);

        updateStep(steps, 0, 'in_progress', '正在创建剧本...');
        sendProgress({
          step: 'script',
          message: '正在创建剧本...',
          progress: 5,
          currentStepIndex: 0,
          totalSteps,
          steps: [...steps],
        });

        const script = await scriptManager.createScript({
          title,
          type,
          description,
          storyContent,
        });

        updateStep(steps, 0, 'completed');

        // ==================== 步骤 2: AI 分析并生成角色 ====================
        updateStep(steps, 1, 'in_progress', '正在分析剧本，识别角色...');
        sendProgress({
          step: 'characters',
          message: '正在分析剧本，识别角色...',
          progress: 10,
          currentStepIndex: 1,
          totalSteps,
          steps: [...steps],
        });

        // 如果用户提供了角色描述，使用用户的描述；否则使用 AI 生成的角色
        let characters;
        if (userCharacterDescriptions && userCharacterDescriptions.length > 0) {
          // 使用用户提供的角色描述
          characters = userCharacterDescriptions.map(char => ({
            name: char.name,
            description: `故事中的角色：${char.name}`,
            appearance: char.appearance,
            backgroundColor: char.backgroundColor, // 纯色背景颜色
            personality: '',
          }));
          console.log('[auto-generate] Using user-provided character descriptions:', characters.length);
        } else {
          // 使用 AI 生成角色
          characters = await generateCharacters(script);
          console.log('[auto-generate] Using AI-generated characters:', characters.length);
        }
        
        const createdCharacters = [];
        for (let i = 0; i < characters.length; i++) {
          const char = characters[i];
          const progress = 10 + (i + 1) * 3;
          
          sendProgress({
            step: 'characters',
            message: `正在创建角色: ${char.name}...`,
            progress,
            currentStepIndex: 1,
            totalSteps,
            steps: [...steps],
          });

          const createdChar = await characterManager.createCharacter({
            scriptId: script.id,
            ...char,
          });

          // 生成角色形象（三视图）
          if (char.appearance) {
            sendProgress({
              step: 'characters',
              message: `正在生成角色 ${char.name} 的三视图（正面、侧面、四分之三视角）...`,
              progress,
              currentStepIndex: 1,
              totalSteps,
              steps: [...steps],
            });

            // 生成角色三视图（传入背景颜色）
            const threeViewData = await generateCharacterThreeView(
              char.appearance, 
              char.backgroundColor, // 用户指定的纯色背景
              storyStyle
            );
            
            if (threeViewData) {
              const updatedChar = await characterManager.updateCharacter(createdChar.id, {
                avatarUrl: threeViewData.threeQuarterView?.fileKey || threeViewData.frontView?.fileKey,
                frontViewUrl: threeViewData.frontView?.fileKey,
                sideViewUrl: threeViewData.sideView?.fileKey,
                threeQuarterViewUrl: threeViewData.threeQuarterView?.fileKey,
                backgroundColor: char.backgroundColor, // 保存背景颜色
              });
              
              if (updatedChar) {
                createdCharacters.push({
                  ...updatedChar,
                  avatarUrl: threeViewData.threeQuarterView?.fileKey || threeViewData.frontView?.fileKey,
                  avatarImageUrl: threeViewData.threeQuarterView?.url || threeViewData.frontView?.url,
                  frontViewImageUrl: threeViewData.frontView?.url,
                  sideViewImageUrl: threeViewData.sideView?.url,
                  threeQuarterViewImageUrl: threeViewData.threeQuarterView?.url,
                });
              }
            } else {
              // 如果三视图生成失败，回退到单图生成
              console.log(`[auto-generate] Three-view generation failed for ${char.name}, falling back to single image`);
              const characterImages = await generateCharacterImages(char.appearance, 1, storyStyle);
              
              if (characterImages.length > 0) {
                const updatedChar = await characterManager.updateCharacter(createdChar.id, {
                  avatarUrl: characterImages[0].fileKey,
                  backgroundColor: char.backgroundColor,
                });
                
                if (updatedChar) {
                  createdCharacters.push({
                    ...updatedChar,
                    avatarUrl: characterImages[0].fileKey,
                    avatarImageUrl: characterImages[0].url,
                  });
                }
              } else {
                createdCharacters.push(createdChar);
              }
            }
          } else {
            createdCharacters.push(createdChar);
          }

          safeSend(`data: ${JSON.stringify({
            step: 'characters',
            message: `已创建角色: ${char.name}`,
            progress,
            characters: createdCharacters,
          })}\n\n`);
        }

        updateStep(steps, 1, 'completed');

        // ==================== 步骤 3: AI 分析并生成场景 ====================
        updateStep(steps, 2, 'in_progress', '正在分析剧本，识别场景...');
        sendProgress({
          step: 'scenes',
          message: '正在分析剧本，识别场景...',
          progress: 25,
          currentStepIndex: 2,
          totalSteps,
          steps: [...steps],
        });

        // 如果用户提供了场景描述，使用用户的描述；否则使用 AI 生成的场景
        let scenes;
        if (userSceneDescriptions && userSceneDescriptions.length > 0) {
          // 使用用户提供的场景描述
          scenes = userSceneDescriptions.map(scene => ({
            name: scene.name,
            description: scene.description,
          }));
          console.log('[auto-generate] Using user-provided scene descriptions:', scenes.length);
        } else {
          // 使用 AI 生成场景
          scenes = await generateScenes(script);
          console.log('[auto-generate] Using AI-generated scenes:', scenes.length);
        }
        
        const createdScenes = [];
        for (let i = 0; i < scenes.length; i++) {
          const scene = scenes[i];
          const progress = 25 + (i + 1) * 3;
          
          sendProgress({
            step: 'scenes',
            message: `正在创建场景: ${scene.name}...`,
            progress,
            currentStepIndex: 2,
            totalSteps,
            steps: [...steps],
          });

          const createdScene = await sceneManager.createScene({
            scriptId: script.id,
            name: scene.name,
            description: scene.description,
          });

          // 生成场景背景图
          sendProgress({
            step: 'scenes',
            message: `正在生成场景 ${scene.name} 的背景图...`,
            progress,
            currentStepIndex: 2,
            totalSteps,
            steps: [...steps],
          });

          const sceneImages = await generateSceneImages(scene.description, 1, storyStyle);
          
          if (sceneImages.length > 0) {
            const updatedScene = await sceneManager.updateScene(createdScene.id, {
              backgroundUrl: sceneImages[0].fileKey,
            });
            
            if (updatedScene) {
              createdScenes.push({
                ...updatedScene,
                backgroundImageUrl: sceneImages[0].url,
              });
            }
          } else {
            createdScenes.push(createdScene);
          }

          safeSend(`data: ${JSON.stringify({
            step: 'scenes',
            message: `已创建场景: ${scene.name}`,
            progress,
            scenes: createdScenes,
          })}\n\n`);
        }

        updateStep(steps, 2, 'completed');

        // ==================== 步骤 4: AI 生成分镜描述 ====================
        updateStep(steps, 3, 'in_progress', '正在生成分镜描述...');
        sendProgress({
          step: 'storyboards',
          message: '正在生成分镜描述...',
          progress: 40,
          currentStepIndex: 3,
          totalSteps,
          steps: [...steps],
        });

        const storyboardDescriptions = await generateStoryboardDescriptions(script, createdCharacters, createdScenes);
        updateStep(steps, 3, 'completed');

        // ==================== 步骤 5: 生成分镜图片 ====================
        updateStep(steps, 4, 'in_progress', `正在生成 ${storyboardDescriptions.length} 个分镜的图片...`);
        sendProgress({
          step: 'images',
          message: `正在生成 ${storyboardDescriptions.length} 个分镜的图片...`,
          progress: 45,
          currentStepIndex: 4,
          totalSteps,
          steps: [...steps],
        });

        const createdStoryboards = [];
        for (let i = 0; i < storyboardDescriptions.length; i++) {
          const sb = storyboardDescriptions[i];
          const progress = 45 + (i + 1) * 5;
          
          sendProgress({
            step: 'images',
            message: `正在生成分镜 ${i + 1}/${storyboardDescriptions.length} 的图片...`,
            progress,
            currentStepIndex: 4,
            totalSteps,
            steps: [...steps],
          });

          // 获取关联的角色形象 URL（根据镜头角度选择合适的视角）
          const characterImageUrls: string[] = [];
          const cameraAngle = sb.cameraAngle || 'three_quarter';
          
          if (sb.characterIds && sb.characterIds.length > 0) {
            for (const charId of sb.characterIds) {
              const char = createdCharacters.find(c => c.id === charId);
              if (char) {
                // 根据镜头角度获取合适的角色视角图片
                let characterUrl = getCharacterImageUrlByAngle(char, cameraAngle);
                
                if (characterUrl) {
                  // 如果是存储路径，生成预签名 URL
                  if (!characterUrl.startsWith('http')) {
                    characterUrl = await generateFileUrl(characterUrl);
                  }
                  characterImageUrls.push(characterUrl);
                } else if ((char as any).avatarImageUrl) {
                  characterImageUrls.push((char as any).avatarImageUrl);
                } else if (char.avatarUrl) {
                  const url = await generateFileUrl(char.avatarUrl);
                  characterImageUrls.push(url);
                }
              }
            }
          }

          // 获取关联的场景背景图和参考图 URL
          let sceneBackgroundUrl: string | undefined = undefined;
          let sceneReferenceUrl: string | undefined = undefined;
          if (sb.sceneId) {
            const scene = createdScenes.find(s => s.id === sb.sceneId);
            if (scene) {
              if ((scene as any).backgroundImageUrl) {
                sceneBackgroundUrl = (scene as any).backgroundImageUrl;
              } else if (scene.backgroundUrl) {
                sceneBackgroundUrl = await generateFileUrl(scene.backgroundUrl);
              }
              if ((scene as any).referenceImageUrl) {
                sceneReferenceUrl = (scene as any).referenceImageUrl;
              } else if (scene.referenceImageUrl) {
                sceneReferenceUrl = await generateFileUrl(scene.referenceImageUrl);
              }
            }
          }

          // 生成分镜图片（参考角色和场景）
          const imageData = await generateStoryboardImage(
            sb.description || '',
            '2K',
            characterImageUrls,
            sceneBackgroundUrl,
            sceneReferenceUrl,
            storyStyle
          );

          // 创建分镜记录
          const createdSb = await storyboardManager.createStoryboard({
            scriptId: script.id,
            sceneId: sb.sceneId,
            characterIds: sb.characterIds && sb.characterIds.length > 0 ? JSON.stringify(sb.characterIds) : null,
            sequence: sb.sequence,
            description: sb.description,
            prompt: sb.prompt,
            dialogue: sb.dialogue, // 对话内容（剧情演绎模式）
            speakingCharacterId: sb.speakingCharacterId, // 说话人ID
            imageUrl: imageData.fileKey,
            duration: sb.duration || 5,
            transitionType: sb.transitionType || 'cut',
            cameraAngle: cameraAngle, // 镜头角度
            isGenerated: false,
          });

          createdStoryboards.push({
            ...createdSb,
            imageUrl: imageData.fileKey,
            imageUrlForDisplay: imageData.imageUrl,
          });

          // 发送分镜创建进度
          safeSend(`data: ${JSON.stringify({
            step: 'images',
            message: `已生成分镜 ${i + 1}/${storyboardDescriptions.length} 的图片`,
            progress,
            storyboard: createdSb,
            imageUrl: imageData.imageUrl,
          })}\n\n`);
        }

        updateStep(steps, 4, 'completed');

        // ==================== 步骤 6: 生成分镜视频 ====================
        updateStep(steps, 5, 'in_progress', `正在生成 ${createdStoryboards.length} 个分镜的视频...`);
        sendProgress({
          step: 'videos',
          message: `正在生成 ${createdStoryboards.length} 个分镜的视频...`,
          progress: 70,
          currentStepIndex: 5,
          totalSteps,
          steps: [...steps],
        });

        for (let i = 0; i < createdStoryboards.length; i++) {
          const sb = createdStoryboards[i];
          const progress = 70 + (i + 1) * 5;
          
          sendProgress({
            step: 'videos',
            message: `正在生成分镜 ${i + 1}/${createdStoryboards.length} 的视频...`,
            progress,
            currentStepIndex: 5,
            totalSteps,
            steps: [...steps],
          });

          // 生成分镜图片的可访问 URL
          const storyboardImageUrl = (sb as any).imageUrlForDisplay || await generateFileUrl(sb.imageUrl!);

          // 提取动作描述（从分镜描述中提取动作部分）
          const actionDescription = sb.description || '';

          try {
            // 生成视频（使用分镜图片作为首帧）
            const videoFileKey = await generateStoryboardVideo(
              storyboardImageUrl,
              actionDescription,
              5
            );

            // 根据剧本类型生成音频
            const audioData = await generateNarrationAudio(sb.description || '', type);

            // 合并音频和视频
            const mergedVideoKey = await mergeAudioAndVideo(videoFileKey, audioData.fileKey);

            // 更新分镜记录
            await storyboardManager.updateStoryboard(sb.id, {
              videoUrl: mergedVideoKey, // 使用合并后的视频
              audioUrl: audioData.fileKey, // 还是保留原始音频
              duration: 5,
              isGenerated: true,
            });

            // 发送视频生成进度
            const videoUrl = await generateFileUrl(mergedVideoKey);
            safeSend(`data: ${JSON.stringify({
              step: 'videos',
              message: `已生成分镜 ${i + 1}/${createdStoryboards.length} 的视频`,
              progress,
              storyboardId: sb.id,
              videoUrl,
              audioUrl: audioData.audioUrl,
            })}\n\n`);
          } catch (videoError) {
            console.error(`Failed to generate video for storyboard ${sb.id}:`, videoError);
            // 单个视频生成失败不中断整个流程
            safeSend(`data: ${JSON.stringify({
              step: 'videos',
              message: `分镜 ${i + 1}/${createdStoryboards.length} 视频生成失败，跳过`,
              progress,
              storyboardId: sb.id,
              error: '视频生成失败',
            })}\n\n`);
          }

          // 添加延迟，避免触发 API 频率限制（每个视频生成后等待 5 秒）
          if (i < createdStoryboards.length - 1) {
            await new Promise(resolve => setTimeout(resolve, 5000));
          }
        }

        updateStep(steps, 5, 'completed');

        // ==================== 完成 ====================
        sendProgress({
          step: 'complete',
          message: '全流程生成完成！',
          progress: 100,
          currentStepIndex: 6,
          totalSteps,
          steps: steps.map(s => ({ ...s, status: 'completed' as const })),
        });
        
        safeSend(`data: ${JSON.stringify({ 
          success: true, 
          scriptId: script.id,
          characters: createdCharacters.length,
          scenes: createdScenes.length,
          storyboards: createdStoryboards.length,
          completed: true
        })}\n\n`);

      } catch (error) {
        console.error('Auto generation error:', error);
        safeSend(`data: ${JSON.stringify({ success: false, error: '生成失败', completed: true })}\n\n`);
      } finally {
        controller.close();
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
}

// AI 生成角色列表
async function generateCharacters(script: any) {
  const messages: Array<{ role: 'system' | 'user'; content: string }> = [
    {
      role: 'system',
      content: `你是一个角色设计专家。根据剧本内容，识别并列出所有主要角色。

【重要规则 - 角色形象拆分】
如果一个角色在故事中有多个不同的形象（例如：年轻/年老、便装/正装、日常/战斗、不同时期的造型等），必须拆分成多个独立的角色条目！

例如：
- "张三（青年）" 和 "张三（中年）" 应该是两个独立的角色
- "李四（便装）" 和 "李四（官服）" 应该是两个独立的角色
- 每个拆分后的角色都要有完整独立的外观描述

对于每个角色，提供以下信息：
1. 角色名称（如有多个形象，在名称后标注，如"小明（青年）"、"小明（中年）"）
2. 角色描述（背景、身份等）
3. 外观描述（外貌、服装等，要非常详细具体，用于生成角色形象，包括：
   - 面部特征（眼睛、鼻子、嘴巴、脸型等）
   - 发型发色
   - 服装服饰（款式、颜色、材质）
   - 体型体态
   - 年龄感
   - 气质特征）
4. 性格特征

请以 JSON 格式返回：
{
  "characters": [
    {
      "name": "角色名（形象标注）",
      "description": "角色描述",
      "appearance": "详细的外观描述，包括面部特征、发型、服装、体型、年龄感、气质等",
      "personality": "性格特征"
    }
  ]
}`
    },
    {
      role: 'user',
      content: `剧本类型：${script.type}\n剧本标题：${script.title}\n故事内容：${script.storyContent || ''}

请识别并列出这个剧本中的所有主要角色。
注意：如果同一角色有多个不同形象，必须拆分成多个独立的角色条目！`
    }
  ];

  const response = await chatWithLLM(messages);
  
  try {
    // 使用安全 JSON 解析
    const data = safeParseJSON(response);
    if (data && data.characters) {
      return data.characters;
    }
    
    // 尝试提取 JSON 块
    const jsonMatch = response.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      const fallbackData = safeParseJSON(jsonMatch[0]);
      if (fallbackData && fallbackData.characters) {
        return fallbackData.characters;
      }
    }
  } catch (e) {
    console.error('Failed to parse characters JSON:', e, '\nResponse:', response.substring(0, 500));
  }
  
  return [];
}

// AI 生成场景列表
async function generateScenes(script: any) {
  const messages: Array<{ role: 'system' | 'user'; content: string }> = [
    {
      role: 'system',
      content: `你是一个场景设计专家。根据剧本内容，识别并列出所有主要场景。

【重要规则 - 纯背景场景】
场景描述必须只描述环境和背景，绝对不要出现任何人物、角色、人影！
场景应该是纯粹的背景环境，用于作为分镜的背景图层。

对于每个场景，提供以下信息：
1. 场景名称
2. 场景描述（只描述环境，不要出现人物！）包括：
   - 建筑结构（建筑风格、材质、年代感）
   - 室内/室外环境
   - 自然元素（植物、天空、地面等）
   - 光线效果（光源、光影、色调）
   - 氛围营造（天气、时间、情绪感）
   - 道具陈设（家具、装饰品等，但不要描述有人在使用）

请以 JSON 格式返回：
{
  "scenes": [
    {
      "name": "场景名称",
      "description": "详细的纯背景场景描述（不要出现任何人物！），包括建筑、环境、光线、氛围、道具等"
    }
  ]
}`
    },
    {
      role: 'user',
      content: `剧本类型：${script.type}\n剧本标题：${script.title}\n故事内容：${script.storyContent || ''}

请识别并列出这个剧本中的所有主要场景。
注意：场景描述必须是纯背景，绝对不要出现任何人物！`
    }
  ];

  const response = await chatWithLLM(messages);
  
  try {
    // 使用安全 JSON 解析
    const data = safeParseJSON(response);
    if (data && data.scenes) {
      return data.scenes;
    }
    
    // 尝试提取 JSON 块
    const jsonMatch = response.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      const fallbackData = safeParseJSON(jsonMatch[0]);
      if (fallbackData && fallbackData.scenes) {
        return fallbackData.scenes;
      }
    }
  } catch (e) {
    console.error('Failed to parse scenes JSON:', e, '\nResponse:', response.substring(0, 500));
  }
  
  return [];
}

// AI 生成分镜描述（增强版：关联角色和场景，支持动态数量和镜头角度）
async function generateStoryboardDescriptions(script: any, characters: any[], scenes: any[]) {
  // 构建详细的角色信息（包含不同形象）
  const characterInfo = characters.map(c => 
    `【${c.name}】外观：${c.appearance || '无描述'}`
  ).join('\n');
  
  // 构建详细的场景信息
  const sceneInfo = scenes.map(s => 
    `【${s.name}】环境：${s.description || '无描述'}`
  ).join('\n');
  
  const characterNames = characters.map(c => c.name).join('、');
  const sceneNames = scenes.map(s => s.name).join('、');
  
  const isDrama = script.type === '剧情演绎';
  
  // 计算故事内容的预估分镜数量（根据字数和场景数）
  const storyLength = (script.storyContent || '').length;
  const sceneCount = scenes.length;
  const estimatedStoryboards = Math.max(5, Math.min(50, Math.ceil(storyLength / 200) + sceneCount * 2));
  
  // 根据剧本类型构建不同的 system prompt
  const systemPrompt = isDrama 
    ? `你是一个专业的分镜脚本师。根据故事内容，生成详细的分镜描述。

【核心原则】
这是"剧情演绎"类型，需要将故事拆解为角色对话驱动的分镜：
- 每个分镜应该包含一句角色对话或关键动作
- 对话内容直接来自故事原文或合理改编
- 配音时会使用该句对话作为配音内容

【分镜生成规则】
1. 数量：根据故事长度和复杂度，生成足够完整呈现故事的分镜数量（不限制数量，有多少内容就生成多少）
2. 序号：从 1 开始连续递增（1, 2, 3...），不能跳号
3. 对话提取：从故事中提取关键对话，每个分镜一句
4. 说话人标注：必须明确标注这句话是谁说的
5. 角色匹配：每个分镜必须明确出现了哪些角色
6. 场景匹配：每个分镜必须明确在哪个场景
7. 镜头角度：根据画面需要选择合适的镜头角度

【镜头角度说明】
- front: 正面视角，角色正对镜头
- side: 侧面视角，角色侧面对着镜头
- three_quarter: 四分之三视角，最常见的叙事角度
- over_shoulder: 过肩镜头，从一人肩膀看向另一人
- close_up: 特写镜头，面部或细节特写
- wide: 广角镜头，展示环境和人物关系
- low_angle: 仰视镜头，表现角色威严或力量
- high_angle: 俯视镜头，表现角色弱小或环境全貌

每个分镜需要包含：
- sequence: 分镜序号（从1开始连续编号）
- description: 分镜描述（角色动作、表情、场景氛围）
- prompt: 生图提示词（完整画面描述，包含角色外观+动作+场景背景+光影）
- dialogue: 对话内容（该分镜中角色说的话，只包含对话文本，不要包含说话人名字）
- speakingCharacterName: 说话人名称（谁在说这句话）
- characterNames: 角色名称数组（画面中出现的所有角色）
- sceneName: 场景名称
- cameraAngle: 镜头角度（front/side/three_quarter/over_shoulder/close_up/wide/low_angle/high_angle）
- duration: 时长（4-12秒）

请以 JSON 格式返回：
{
  "storyboards": [
    {
      "sequence": 1,
      "description": "小明看着窗外的雨，表情忧郁",
      "prompt": "年轻男子，黑色短发，穿着白色衬衫，忧郁的表情，望向窗外，雨天背景，室内光线昏暗，电影级光影效果",
      "dialogue": "这场雨，什么时候才能停呢？",
      "speakingCharacterName": "小明",
      "characterNames": ["小明"],
      "sceneName": "小明的房间",
      "cameraAngle": "three_quarter",
      "duration": 5
    }
  ]
}`
    : `你是一个专业的分镜脚本师。根据故事内容，生成详细的分镜描述。

【核心原则】
这是"旁白解说"类型，由旁白讲述整个故事：
- 每个分镜的配音是旁白内容
- 画面配合旁白描述展示

【分镜生成规则】
1. 数量：根据故事长度和复杂度，生成足够完整呈现故事的分镜数量（不限制数量，有多少内容就生成多少）
2. 序号：从 1 开始连续递增（1, 2, 3...），不能跳号
3. 角色匹配：每个分镜必须明确出现了哪些角色
4. 场景匹配：每个分镜必须明确在哪个场景
5. 镜头角度：根据画面需要选择合适的镜头角度

【镜头角度说明】
- front: 正面视角，角色正对镜头
- side: 侧面视角，角色侧面对着镜头
- three_quarter: 四分之三视角，最常见的叙事角度
- over_shoulder: 过肩镜头，从一人肩膀看向另一人
- close_up: 特写镜头，面部或细节特写
- wide: 广角镜头，展示环境和人物关系
- low_angle: 仰视镜头，表现角色威严或力量
- high_angle: 俯视镜头，表现角色弱小或环境全貌

每个分镜需要包含：
- sequence: 分镜序号（从1开始连续编号）
- description: 分镜描述（也是旁白配音的内容）
- prompt: 生图提示词（完整画面描述，包含角色外观+动作+场景背景+光影）
- characterNames: 角色名称数组（画面中出现的所有角色）
- sceneName: 场景名称
- cameraAngle: 镜头角度（front/side/three_quarter/over_shoulder/close_up/wide/low_angle/high_angle）
- duration: 时长（4-12秒）

请以 JSON 格式返回：
{
  "storyboards": [
    {
      "sequence": 1,
      "description": "这是一个雨夜，小明独自站在窗前，望着窗外的雨滴发呆。",
      "prompt": "年轻男子，黑色短发，穿着白色衬衫，望向窗外，雨天背景，室内光线昏暗，电影级光影效果",
      "characterNames": ["小明"],
      "sceneName": "小明的房间",
      "cameraAngle": "three_quarter",
      "duration": 5
    }
  ]
}`;

  const messages: Array<{ role: 'system' | 'user'; content: string }> = [
    {
      role: 'system',
      content: systemPrompt
    },
    {
      role: 'user',
      content: `剧本类型：${script.type}
剧本标题：${script.title}
故事内容：${script.storyContent || ''}

=== 角色表（每个角色有完整的外观描述） ===
${characterInfo || '无角色'}

=== 场景表（每个场景有完整的环境描述） ===
${sceneInfo || '无场景'}

请生成完整的分镜脚本，确保：
1. 分镜序号从1开始连续编号
2. 每个分镜正确引用角色和场景
3. 生图提示词必须包含角色的具体外观和场景的环境描述
4. 分镜数量根据故事内容动态决定（预估需要 ${estimatedStoryboards} 个左右）
5. ${isDrama ? '每个分镜必须包含对话内容和说话人' : '描述内容将作为旁白配音'}
6. 根据画面构图选择合适的镜头角度
7. 返回完整的 JSON 数据`
    }
  ];

  const response = await chatWithLLM(messages);
  
  console.log('[generateStoryboardDescriptions] LLM response length:', response.length);
  
  try {
    // 使用安全 JSON 解析
    const data = safeParseJSON(response);
    
    if (data && data.storyboards && Array.isArray(data.storyboards)) {
      console.log('[generateStoryboardDescriptions] Parsed storyboards count:', data.storyboards.length);
      // 处理分镜数据，将角色名称转换为 ID，并重新排序序号
      return processStoryboardData(data.storyboards, characters, scenes, isDrama);
    }
    
    // 尝试提取 JSON 块
    const jsonMatch = response.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      const fallbackData = safeParseJSON(jsonMatch[0]);
      if (fallbackData && fallbackData.storyboards && Array.isArray(fallbackData.storyboards)) {
        console.log('[generateStoryboardDescriptions] Fallback parsed storyboards count:', fallbackData.storyboards.length);
        return processStoryboardData(fallbackData.storyboards, characters, scenes, isDrama);
      }
    }
  } catch (e) {
    console.error('Failed to parse storyboards JSON:', e, '\nResponse:', response.substring(0, 500));
  }
  
  return [];
}

// 处理分镜数据的辅助函数
function processStoryboardData(storyboards: any[], characters: any[], scenes: any[], isDrama: boolean = false) {
  // 过滤掉无效的分镜数据
  const validStoryboards = storyboards.filter(sb => 
    sb && (sb.description || sb.prompt)
  );
  
  console.log('[processStoryboardData] Valid storyboards:', validStoryboards.length, '/', storyboards.length, 'isDrama:', isDrama);
  
  // 重新排序序号，确保从 1 开始连续
  return validStoryboards.map((sb: any, index: number) => {
    // 查找角色 ID
    const characterIds: string[] = [];
    if (sb.characterNames && Array.isArray(sb.characterNames)) {
      for (const charName of sb.characterNames) {
        const char = characters.find(c => c.name === charName);
        if (char) {
          characterIds.push(char.id);
        }
      }
    }

    // 查找场景 ID
    let sceneId: string | undefined = undefined;
    if (sb.sceneName) {
      const scene = scenes.find(s => s.name === sb.sceneName);
      if (scene) {
        sceneId = scene.id;
      }
    }

    // 查找说话人 ID（剧情演绎模式）
    let speakingCharacterId: string | undefined = undefined;
    if (isDrama && sb.speakingCharacterName) {
      const speaker = characters.find(c => c.name === sb.speakingCharacterName);
      if (speaker) {
        speakingCharacterId = speaker.id;
      }
    }

    const result: any = {
      sequence: index + 1, // 强制重新排序，确保连续
      description: sb.description || '',
      prompt: sb.prompt || sb.description || '',
      characterIds,
      sceneId,
      duration: sb.duration || 5,
      transitionType: 'cut' as const,
      cameraAngle: sb.cameraAngle || 'three_quarter', // 默认四分之三视角
    };

    // 剧情演绎模式添加对话相关字段
    if (isDrama) {
      result.dialogue = sb.dialogue || '';
      result.speakingCharacterId = speakingCharacterId;
    }

    return result;
  });
}

// 根据镜头角度获取角色合适的视角图片 URL
function getCharacterImageUrlByAngle(character: any, cameraAngle: string): string | null {
  // 如果角色有三视图，根据镜头角度选择
  if (character.frontViewUrl || character.sideViewUrl || character.threeQuarterViewUrl) {
    switch (cameraAngle) {
      case 'front':
      case 'close_up':
        return character.frontViewUrl || character.threeQuarterViewUrl || character.avatarUrl;
      case 'side':
        return character.sideViewUrl || character.threeQuarterViewUrl || character.avatarUrl;
      case 'three_quarter':
      case 'over_shoulder':
      case 'wide':
      case 'low_angle':
      case 'high_angle':
      default:
        return character.threeQuarterViewUrl || character.frontViewUrl || character.avatarUrl;
    }
  }
  
  // 回退到旧的单图模式
  return character.avatarUrl;
}
