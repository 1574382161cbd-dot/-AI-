import { NextRequest, NextResponse } from 'next/server';
import { userManager } from '@/storage/database';
import { cookies } from 'next/headers';
import crypto from 'crypto';

interface LoginRequest {
  phone: string;
  code: string;
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { phone, code } = body as LoginRequest;

    // 验证手机号格式
    if (!phone || !/^1[3-9]\d{9}$/.test(phone)) {
      // 记录失败日志
      const clientIp = getClientIp(request);
      const userAgent = request.headers.get('user-agent') || '';
      
      await userManager.createLoginLog({
        userId: 'unknown',
        phone,
        loginType: 'sms_code',
        ip: clientIp,
        userAgent,
        status: 'failed',
        failureReason: '手机号格式不正确',
      });

      return NextResponse.json(
        { success: false, error: '手机号格式不正确' },
        { status: 400 }
      );
    }

    // 验证验证码
    const isValid = await userManager.verifyCode(phone, code, 'login');
    if (!isValid) {
      // 记录失败日志
      const clientIp = getClientIp(request);
      const userAgent = request.headers.get('user-agent') || '';

      await userManager.createLoginLog({
        userId: 'unknown',
        phone,
        loginType: 'sms_code',
        ip: clientIp,
        userAgent,
        status: 'failed',
        failureReason: '验证码错误或已过期',
      });

      return NextResponse.json(
        { success: false, error: '验证码错误或已过期' },
        { status: 401 }
      );
    }

    // 查找或创建用户
    let user = await userManager.findUserByPhone(phone);
    const isNewUser = !user;

    if (isNewUser) {
      // 新用户注册
      user = await userManager.createUser({
        phone,
        nickname: `用户${phone.slice(-4)}`,
      });
    }

    // 获取客户端信息
    const clientIp = getClientIp(request);
    const userAgent = request.headers.get('user-agent') || '';

    // 记录成功登录日志
    if (!user) {
      throw new Error('用户信息获取失败');
    }

    await userManager.createLoginLog({
      userId: user.id,
      phone,
      loginType: 'sms_code',
      ip: clientIp,
      userAgent,
      status: 'success',
    });

    // 更新最后登录信息
    await userManager.updateLastLogin(user.id, clientIp);

    // 生成 Session Token
    const sessionToken = crypto.randomUUID();
    const cookieStore = await cookies();
    
    // 设置 Session Cookie（24小时有效）
    cookieStore.set('session_token', sessionToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 60 * 60 * 24, // 24小时
      path: '/',
    });

    // 设置用户信息 Cookie
    cookieStore.set('user_id', user.id, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 60 * 60 * 24,
      path: '/',
    });

    return NextResponse.json({
      success: true,
      message: isNewUser ? '登录成功，欢迎新用户！' : '登录成功',
      data: {
        user: {
          id: user.id,
          phone: user.phone,
          nickname: user.nickname,
          avatarUrl: user.avatarUrl,
        },
        isNewUser,
      },
    });
  } catch (error) {
    console.error('Error in login:', error);
    return NextResponse.json(
      { success: false, error: '登录失败，请重试' },
      { status: 500 }
    );
  }
}

// 获取客户端 IP
function getClientIp(request: NextRequest): string {
  const forwarded = request.headers.get('x-forwarded-for');
  const realIp = request.headers.get('x-real-ip');
  const ip = request.headers.get('CF-Connecting-IP');

  if (forwarded) {
    return forwarded.split(',')[0].trim();
  }
  if (realIp) {
    return realIp;
  }
  if (ip) {
    return ip;
  }
  return 'unknown';
}
