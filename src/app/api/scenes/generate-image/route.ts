import { NextRequest, NextResponse } from 'next/server';
import { imageClient, storage, filterSensitiveContent, filterCharacterContent } from '@/lib/ai';

// POST /api/scenes/generate-image - 生成场景背景图（纯背景，无人物）
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { description, count = 1 } = body;

    if (!description) {
      return NextResponse.json(
        { success: false, error: 'description is required' },
        { status: 400 }
      );
    }

    const images = [];

    // 过滤敏感内容
    let filteredDescription = filterSensitiveContent(description);
    
    // 过滤人物描述 - 场景背景图应该是纯环境
    filteredDescription = filterCharacterContent(filteredDescription);
    
    // 进一步过滤人物相关的关键词
    filteredDescription = filteredDescription
      .replace(/人[物们]/g, '')
      .replace(/角色/g, '')
      .replace(/身影/g, '')
      .replace(/站立/g, '')
      .replace(/坐着/g, '')
      .replace(/行走/g, '')
      .replace(/奔跑/g, '')
      .replace(/动作/g, '');
    
    // 强调纯背景，绝对无人物
    const scenePrompt = `${filteredDescription}, 电影级场景背景，纯环境背景图，绝对没有人物，no people, no characters, no figures, no humans, empty scene, 纯背景，纯场景，自然写实风格，细节丰富，氛围感强，风格统一`;

    console.log('[generate-scene-image] Generating pure background scene');

    // 生成多张图片
    for (let i = 0; i < count; i++) {
      try {
        const response = await imageClient.generate({
          prompt: scenePrompt,
          size: '2K',
          watermark: false,
        });

        const helper = imageClient.getResponseHelper(response);

        if (!helper.success) {
          console.error(`Failed to generate scene image ${i + 1}:`, helper.errorMessages);
          continue;
        }

        const imageUrl = helper.imageUrls[0];
        if (!imageUrl) {
          console.error(`No image URL returned for image ${i + 1}`);
          continue;
        }

        // 下载图片并上传到对象存储
        const imageResponse = await fetch(imageUrl);
        const imageBuffer = Buffer.from(await imageResponse.arrayBuffer());

        const fileKey = await storage.uploadFile({
          fileContent: imageBuffer,
          fileName: `scenes/${Date.now()}_${i}.png`,
          contentType: 'image/png',
        });

        const signedUrl = await storage.generatePresignedUrl({
          key: fileKey,
          expireTime: 86400,
        });

        images.push({
          url: signedUrl,
          fileKey,
        });

      } catch (genError) {
        console.error(`Error generating scene image ${i + 1}:`, genError);
      }
    }

    if (images.length === 0) {
      return NextResponse.json(
        { success: false, error: 'Failed to generate scene images' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      data: images,
    });
  } catch (error) {
    console.error('Error generating scene image:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to generate scene image' },
      { status: 500 }
    );
  }
}
