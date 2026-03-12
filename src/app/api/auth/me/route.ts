import { NextRequest, NextResponse } from 'next/server';
import { userManager } from '@/storage/database';
import { cookies } from 'next/headers';

// GET /api/auth/me - 获取当前用户信息
export async function GET(request: NextRequest) {
  try {
    const cookieStore = await cookies();
    const userId = cookieStore.get('user_id')?.value;

    if (!userId) {
      return NextResponse.json(
        { success: false, error: '未登录', data: null },
        { status: 401 }
      );
    }

    const user = await userManager.findUserById(userId);
    if (!user) {
      // 用户不存在，清除无效的 Cookie
      cookieStore.delete('session_token');
      cookieStore.delete('user_id');

      return NextResponse.json(
        { success: false, error: '用户不存在', data: null },
        { status: 401 }
      );
    }

    return NextResponse.json({
      success: true,
      data: {
        user: {
          id: user.id,
          phone: user.phone,
          nickname: user.nickname,
          avatarUrl: user.avatarUrl,
          status: user.status,
          createdAt: user.createdAt,
          lastLoginAt: user.lastLoginAt,
          lastLoginIp: user.lastLoginIp,
        },
      },
    });
  } catch (error) {
    console.error('Error getting user info:', error);
    return NextResponse.json(
      { success: false, error: '获取用户信息失败' },
      { status: 500 }
    );
  }
}
