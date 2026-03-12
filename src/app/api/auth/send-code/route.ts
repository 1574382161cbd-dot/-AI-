import { NextRequest, NextResponse } from 'next/server';
import { userManager } from '@/storage/database';

// POST /api/auth/send-code - 发送验证码
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { phone, type = 'login' } = body;

    // 验证手机号格式
    if (!phone || !/^1[3-9]\d{9}$/.test(phone)) {
      return NextResponse.json(
        { success: false, error: '手机号格式不正确' },
        { status: 400 }
      );
    }

    // 检查是否频繁发送（1分钟内只能发送1次）
    const existingCode = await userManager.findValidVerificationCode(phone, type);
    const now = new Date();
    // 如果有未使用的验证码且离过期还有超过4分钟，则拒绝发送（防止频繁刷验证码）
    if (existingCode && existingCode.expiresAt.getTime() - now.getTime() > 4 * 60 * 1000) {
      return NextResponse.json(
        { success: false, error: '验证码已发送，请勿重复获取' },
        { status: 429 }
      );
    }

    // 生成6位验证码
    const code = Math.floor(100000 + Math.random() * 900000).toString();
    const expiresAt = new Date(Date.now() + 5 * 60 * 1000); // 5分钟后过期

    // 保存验证码
    await userManager.createVerificationCodeWithParams({
      phone,
      code,
      type,
      expiresAt,
    });

    // 模拟发送短信（实际项目中应调用短信服务）
    console.log(`[短信发送] 手机号: ${phone}, 验证码: ${code}, 类型: ${type}`);

    // 开发环境下返回验证码方便测试
    const isDevelopment = process.env.NODE_ENV === 'development';

    return NextResponse.json({
      success: true,
      message: '验证码已发送',
      // 仅在开发环境返回验证码
      ...(isDevelopment && { code }),
    });
  } catch (error) {
    console.error('Error sending verification code:', error);
    return NextResponse.json(
      { success: false, error: '发送验证码失败' },
      { status: 500 }
    );
  }
}
