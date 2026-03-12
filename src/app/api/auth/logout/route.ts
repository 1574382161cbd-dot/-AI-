import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';

// POST /api/auth/logout - 登出
export async function POST(request: NextRequest) {
  try {
    const cookieStore = await cookies();

    // 清除所有认证相关的 Cookie
    cookieStore.delete('session_token');
    cookieStore.delete('user_id');

    return NextResponse.json({
      success: true,
      message: '登出成功',
    });
  } catch (error) {
    console.error('Error in logout:', error);
    return NextResponse.json(
      { success: false, error: '登出失败' },
      { status: 500 }
    );
  }
}
