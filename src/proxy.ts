import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';

// 排除不需要记录日志的路径
const EXCLUDE_PATHS = [
  '/api/auth/send-code',
  '/api/auth/login',
  '/api/auth/logout',
  '/api/auth/me',
  '/_next',
  '/favicon.ico',
  '/static',
];

export async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // 检查是否需要排除
  if (EXCLUDE_PATHS.some(path => pathname.startsWith(path))) {
    return NextResponse.next();
  }

  // 获取用户ID
  const cookieStore = await cookies();
  const userId = cookieStore.get('user_id')?.value || 'anonymous';

  // 记录开始时间
  const startTime = Date.now();

  // 继续处理请求
  const response = NextResponse.next();

  // 请求处理完成后记录日志
  response.headers.set('x-start-time', startTime.toString());
  response.headers.set('x-user-id', userId);

  return response;
}

export const config = {
  matcher: [
    /*
     * 匹配所有路径，除了:
     * - _next/static (静态文件)
     * - _next/image (图片优化文件)
     * - favicon.ico (favicon文件)
     * - public文件夹
     */
    '/((?!_next/static|_next/image|favicon.ico|public).*)',
  ],
};
