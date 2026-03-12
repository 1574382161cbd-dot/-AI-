import Link from 'next/link';

export default function HomePage() {
  return (
    <div className="space-y-12">
      {/* Hero Section */}
      <div className="text-center py-12">
        <h1 className="text-5xl font-bold text-gray-900 mb-6">
          AI驱动的漫剧创作平台
        </h1>
        <p className="text-xl text-gray-600 max-w-3xl mx-auto mb-8">
          从剧本创作到视频生成，一站式完成漫剧制作。支持剧情演绎和旁白解说两种模式。
        </p>
        <div className="flex justify-center gap-4 flex-wrap">
          <Link
            href="/create"
            className="bg-gradient-to-r from-blue-600 to-purple-600 text-white px-8 py-3 rounded-lg text-lg font-medium hover:from-blue-700 hover:to-purple-700 transition-colors shadow-lg"
          >
            🚀 一键生成漫剧
          </Link>
          <Link
            href="/create"
            className="bg-white text-gray-900 px-8 py-3 rounded-lg text-lg font-medium hover:bg-gray-50 transition-colors border border-gray-300"
          >
            创建剧本
          </Link>
          <Link
            href="/scripts"
            className="bg-gray-100 text-gray-700 px-8 py-3 rounded-lg text-lg font-medium hover:bg-gray-200 transition-colors"
          >
            浏览剧本
          </Link>
        </div>
      </div>

      {/* Features Section */}
      <div className="grid md:grid-cols-3 gap-8 py-12">
        <div className="bg-white p-6 rounded-xl shadow-md hover:shadow-lg transition-shadow">
          <div className="text-4xl mb-4">📝</div>
          <h3 className="text-xl font-semibold mb-3 text-gray-900">剧本创作</h3>
          <p className="text-gray-600">
            AI辅助创作剧本，支持剧情演绎和旁白解说两种模式，自动生成角色和场景设定。
          </p>
        </div>

        <div className="bg-white p-6 rounded-xl shadow-md hover:shadow-lg transition-shadow">
          <div className="text-4xl mb-4">🎬</div>
          <h3 className="text-xl font-semibold mb-3 text-gray-900">分镜生成</h3>
          <p className="text-gray-600">
            智能拆解剧本生成分镜，AI自动绘制场景图片，支持自定义角色和场景描述。
          </p>
        </div>

        <div className="bg-white p-6 rounded-xl shadow-md hover:shadow-lg transition-shadow">
          <div className="text-4xl mb-4">🎥</div>
          <h3 className="text-xl font-semibold mb-3 text-gray-900">视频制作</h3>
          <p className="text-gray-600">
            分镜一键转视频，支持AI配音和背景音乐，快速生成高质量漫剧内容。
          </p>
        </div>
      </div>

      {/* Process Section */}
      <div className="bg-white rounded-xl shadow-md p-8 py-12">
        <h2 className="text-3xl font-bold text-center mb-12 text-gray-900">
          创作流程
        </h2>
        <div className="grid md:grid-cols-4 gap-6">
          <div className="text-center">
            <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <span className="text-2xl font-bold text-blue-600">1</span>
            </div>
            <h4 className="font-semibold mb-2 text-gray-900">创建剧本</h4>
            <p className="text-sm text-gray-600">选择类型，输入故事梗概</p>
          </div>

          <div className="text-center">
            <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <span className="text-2xl font-bold text-blue-600">2</span>
            </div>
            <h4 className="font-semibold mb-2 text-gray-900">设定角色</h4>
            <p className="text-sm text-gray-600">定义角色外观和性格</p>
          </div>

          <div className="text-center">
            <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <span className="text-2xl font-bold text-blue-600">3</span>
            </div>
            <h4 className="font-semibold mb-2 text-gray-900">生成分镜</h4>
            <p className="text-sm text-gray-600">AI自动拆解并绘制</p>
          </div>

          <div className="text-center">
            <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <span className="text-2xl font-bold text-blue-600">4</span>
            </div>
            <h4 className="font-semibold mb-2 text-gray-900">生成视频</h4>
            <p className="text-sm text-gray-600">一键导出漫剧视频</p>
          </div>
        </div>
      </div>
    </div>
  );
}
