import type { Metadata } from 'next';
import { Inspector } from 'react-dev-inspector';
import Link from 'next/link';
import './globals.css';
import { AlertProvider } from '@/lib/alert-context';

export const metadata: Metadata = {
  title: {
    default: '漫剧创作平台',
    template: '%s | 漫剧创作平台',
  },
  description: 'AI驱动的漫剧创作平台，从剧本到视频一站式生成',
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const isDev = process.env.NODE_ENV === 'development';

  return (
    <html lang="zh-CN">
      <body className={`antialiased bg-gray-50 min-h-screen`}>
        <AlertProvider>
          {isDev && <Inspector />}
          <nav className="bg-white border-b border-gray-200 sticky top-0 z-50">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
              <div className="flex justify-between h-16">
                <div className="flex items-center">
                  <Link href="/" className="text-xl font-bold text-gray-900 hover:text-blue-600 transition-colors">
                    🎭 漫剧创作平台
                  </Link>
                </div>
                <div className="flex items-center space-x-4">
                  <Link href="/" className="text-gray-700 hover:text-blue-600 px-3 py-2 rounded-md text-sm font-medium transition-colors">
                    首页
                  </Link>
                  <Link href="/scripts" className="text-gray-700 hover:text-blue-600 px-3 py-2 rounded-md text-sm font-medium transition-colors">
                    剧本管理
                  </Link>
                  <Link href="/create" className="bg-gradient-to-r from-blue-600 to-purple-600 text-white px-4 py-2 rounded-md text-sm font-medium hover:from-blue-700 hover:to-purple-700 transition-colors">
                    🚀 一键生成
                  </Link>
                  <Link href="/create" className="bg-white text-gray-900 px-4 py-2 rounded-md text-sm font-medium hover:bg-gray-50 transition-colors border border-gray-300">
                    创建剧本
                  </Link>
                </div>
              </div>
            </div>
          </nav>
          <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
            {children}
          </main>
        </AlertProvider>
      </body>
    </html>
  );
}
