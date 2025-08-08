import { Link } from 'react-router-dom'
import { 
  Palette, 
  Twitter, 
  Github, 
  Mail, 
  MessageCircle,
  Heart
} from 'lucide-react'

const Footer = () => {
  const currentYear = new Date().getFullYear()

  const footerLinks = {
    platform: [
      { name: '探索NFT', href: '/explore' },
      { name: '创建NFT', href: '/create' },
      { name: '交易市场', href: '/marketplace' },
      { name: '虚拟博物馆', href: '/museum' }
    ],
    resources: [
      { name: '帮助中心', href: '/help' },
      { name: '开发者文档', href: '/docs' },
      { name: 'API接口', href: '/api-docs' },
      { name: '白皮书', href: '/whitepaper' }
    ],
    community: [
      { name: '博客', href: '/blog' },
      { name: '论坛', href: '/forum' },
      { name: '活动', href: '/events' },
      { name: '合作伙伴', href: '/partners' }
    ],
    legal: [
      { name: '服务条款', href: '/terms' },
      { name: '隐私政策', href: '/privacy' },
      { name: '版权声明', href: '/copyright' },
      { name: '免责声明', href: '/disclaimer' }
    ]
  }

  const socialLinks = [
    { name: 'Twitter', icon: Twitter, href: 'https://twitter.com' },
    { name: 'GitHub', icon: Github, href: 'https://github.com' },
    { name: '微信', icon: MessageCircle, href: '#' },
    { name: '邮箱', icon: Mail, href: 'mailto:contact@nft-platform.com' }
  ]

  return (
    <footer className="bg-gray-900 text-white">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Main Footer Content */}
        <div className="py-12">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-6 gap-8">
            {/* Brand Section */}
            <div className="lg:col-span-2">
              <Link to="/" className="flex items-center space-x-2 mb-4">
                <div className="w-8 h-8 bg-gradient-to-br from-purple-600 to-blue-600 rounded-lg flex items-center justify-center">
                  <Palette className="w-5 h-5 text-white" />
                </div>
                <span className="text-xl font-bold">数字文物NFT平台</span>
              </Link>
              <p className="text-gray-400 mb-6 max-w-md">
                连接传统文化与数字未来，让珍贵文物在区块链上永续传承。
                创建、收藏、交易独一无二的数字文物NFT，打造专属虚拟博物馆。
              </p>
              
              {/* Social Links */}
              <div className="flex space-x-4">
                {socialLinks.map((social) => (
                  <a
                    key={social.name}
                    href={social.href}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="w-10 h-10 bg-gray-800 rounded-lg flex items-center justify-center hover:bg-gray-700 transition-colors"
                    aria-label={social.name}
                  >
                    <social.icon className="w-5 h-5" />
                  </a>
                ))}
              </div>
            </div>

            {/* Platform Links */}
            <div>
              <h3 className="text-lg font-semibold mb-4">平台功能</h3>
              <ul className="space-y-3">
                {footerLinks.platform.map((link) => (
                  <li key={link.name}>
                    <Link
                      to={link.href}
                      className="text-gray-400 hover:text-white transition-colors"
                    >
                      {link.name}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>

            {/* Resources Links */}
            <div>
              <h3 className="text-lg font-semibold mb-4">资源中心</h3>
              <ul className="space-y-3">
                {footerLinks.resources.map((link) => (
                  <li key={link.name}>
                    <Link
                      to={link.href}
                      className="text-gray-400 hover:text-white transition-colors"
                    >
                      {link.name}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>

            {/* Community Links */}
            <div>
              <h3 className="text-lg font-semibold mb-4">社区</h3>
              <ul className="space-y-3">
                {footerLinks.community.map((link) => (
                  <li key={link.name}>
                    <Link
                      to={link.href}
                      className="text-gray-400 hover:text-white transition-colors"
                    >
                      {link.name}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>

            {/* Legal Links */}
            <div>
              <h3 className="text-lg font-semibold mb-4">法律条款</h3>
              <ul className="space-y-3">
                {footerLinks.legal.map((link) => (
                  <li key={link.name}>
                    <Link
                      to={link.href}
                      className="text-gray-400 hover:text-white transition-colors"
                    >
                      {link.name}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </div>

        {/* Newsletter Subscription */}
        <div className="border-t border-gray-800 py-8">
          <div className="flex flex-col md:flex-row items-center justify-between">
            <div className="mb-4 md:mb-0">
              <h3 className="text-lg font-semibold mb-2">订阅我们的资讯</h3>
              <p className="text-gray-400">获取最新的NFT动态和平台更新</p>
            </div>
            <div className="flex w-full md:w-auto">
              <input
                type="email"
                placeholder="输入您的邮箱地址"
                className="flex-1 md:w-64 px-4 py-2 bg-gray-800 border border-gray-700 rounded-l-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent text-white placeholder-gray-400"
              />
              <button className="px-6 py-2 bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700 rounded-r-lg font-medium transition-colors">
                订阅
              </button>
            </div>
          </div>
        </div>

        {/* Bottom Bar */}
        <div className="border-t border-gray-800 py-6">
          <div className="flex flex-col md:flex-row items-center justify-between">
            <div className="flex items-center space-x-1 text-gray-400 mb-4 md:mb-0">
              <span>© {currentYear} 数字文物NFT平台. 保留所有权利.</span>
            </div>
            
            <div className="flex items-center space-x-1 text-gray-400">
              <span>Made with</span>
              <Heart className="w-4 h-4 text-red-500 fill-current" />
              <span>for cultural heritage preservation</span>
            </div>
          </div>
        </div>

        {/* Additional Info */}
        <div className="border-t border-gray-800 py-4">
          <div className="text-center text-sm text-gray-500">
            <p>
              本平台致力于文物数字化保护与传承，所有NFT均基于区块链技术确保真实性和唯一性。
              <br />
              支持的区块链网络：Ethereum、Polygon | 合作博物馆：故宫博物院、中国国家博物馆等
            </p>
          </div>
        </div>
      </div>
    </footer>
  )
}

export default Footer

