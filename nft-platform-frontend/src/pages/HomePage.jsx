import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { 
  ArrowRight, 
  Sparkles, 
  Shield, 
  Globe, 
  TrendingUp,
  Users,
  Palette,
  Museum,
  Play,
  Star,
  Eye,
  Heart
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { motion } from 'framer-motion'

const HomePage = () => {
  const [featuredNFTs, setFeaturedNFTs] = useState([])
  const [stats, setStats] = useState({
    totalNFTs: 0,
    totalUsers: 0,
    totalVolume: 0,
    totalMuseums: 0
  })

  useEffect(() => {
    // 模拟获取数据
    setFeaturedNFTs([
      {
        id: 1,
        name: '青花瓷花瓶',
        image: '/api/placeholder/300/300',
        price: '2.5 ETH',
        creator: '故宫博物院',
        likes: 234,
        views: 1520
      },
      {
        id: 2,
        name: '唐三彩骆驼',
        image: '/api/placeholder/300/300',
        price: '1.8 ETH',
        creator: '中国国家博物馆',
        likes: 189,
        views: 980
      },
      {
        id: 3,
        name: '明代景泰蓝',
        image: '/api/placeholder/300/300',
        price: '3.2 ETH',
        creator: '首都博物馆',
        likes: 156,
        views: 750
      },
      {
        id: 4,
        name: '汉代玉璧',
        image: '/api/placeholder/300/300',
        price: '4.1 ETH',
        creator: '陕西历史博物馆',
        likes: 298,
        views: 1340
      }
    ])

    setStats({
      totalNFTs: 12580,
      totalUsers: 45200,
      totalVolume: 892.5,
      totalMuseums: 156
    })
  }, [])

  const features = [
    {
      icon: Shield,
      title: '区块链认证',
      description: '每件数字文物都经过区块链技术认证，确保真实性和唯一性'
    },
    {
      icon: Museum,
      title: '虚拟博物馆',
      description: '创建专属3D虚拟博物馆，沉浸式展示您的数字藏品'
    },
    {
      icon: Globe,
      title: '全球交易',
      description: '支持全球范围内的安全交易，让文物价值得到充分体现'
    },
    {
      icon: Sparkles,
      title: '文化传承',
      description: '数字化保护珍贵文物，让传统文化在数字时代永续传承'
    }
  ]

  const testimonials = [
    {
      name: '张文博',
      role: '故宫博物院数字化部门主任',
      content: '这个平台为我们的文物数字化保护工作提供了全新的思路，区块链技术确保了数字文物的真实性。',
      avatar: '/api/placeholder/60/60'
    },
    {
      name: '李收藏',
      role: '资深文物收藏家',
      content: '通过虚拟博物馆功能，我可以向全世界展示我的收藏，这种体验前所未有。',
      avatar: '/api/placeholder/60/60'
    },
    {
      name: '王艺术',
      role: '数字艺术创作者',
      content: '平台的创作工具非常专业，让我能够轻松地将传统文物转化为精美的数字艺术品。',
      avatar: '/api/placeholder/60/60'
    }
  ]

  return (
    <div className="min-h-screen">
      {/* Hero Section */}
      <section className="relative bg-gradient-to-br from-purple-900 via-blue-900 to-indigo-900 text-white overflow-hidden">
        <div className="absolute inset-0 bg-black opacity-20"></div>
        <div className="absolute inset-0">
          <div className="absolute top-20 left-20 w-72 h-72 bg-purple-500 rounded-full mix-blend-multiply filter blur-xl opacity-20 animate-blob"></div>
          <div className="absolute top-40 right-20 w-72 h-72 bg-yellow-500 rounded-full mix-blend-multiply filter blur-xl opacity-20 animate-blob animation-delay-2000"></div>
          <div className="absolute -bottom-8 left-40 w-72 h-72 bg-pink-500 rounded-full mix-blend-multiply filter blur-xl opacity-20 animate-blob animation-delay-4000"></div>
        </div>
        
        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-24 lg:py-32">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.8 }}
            >
              <h1 className="text-4xl lg:text-6xl font-bold mb-6 leading-tight">
                数字文物
                <span className="bg-gradient-to-r from-yellow-400 to-orange-500 bg-clip-text text-transparent">
                  NFT平台
                </span>
              </h1>
              <p className="text-xl lg:text-2xl mb-8 text-gray-200 leading-relaxed">
                连接传统文化与数字未来，让珍贵文物在区块链上永续传承
              </p>
              <div className="flex flex-col sm:flex-row gap-4">
                <Link to="/explore">
                  <Button size="lg" className="bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700 text-lg px-8 py-3">
                    开始探索
                    <ArrowRight className="ml-2 w-5 h-5" />
                  </Button>
                </Link>
                <Link to="/create">
                  <Button size="lg" variant="outline" className="border-white text-white hover:bg-white hover:text-gray-900 text-lg px-8 py-3">
                    创建NFT
                    <Sparkles className="ml-2 w-5 h-5" />
                  </Button>
                </Link>
              </div>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.8, delay: 0.2 }}
              className="relative"
            >
              <div className="relative z-10 bg-white bg-opacity-10 backdrop-blur-lg rounded-2xl p-8 border border-white border-opacity-20">
                <div className="grid grid-cols-2 gap-6">
                  <div className="text-center">
                    <div className="text-3xl font-bold text-yellow-400">{stats.totalNFTs.toLocaleString()}</div>
                    <div className="text-sm text-gray-300">数字文物</div>
                  </div>
                  <div className="text-center">
                    <div className="text-3xl font-bold text-green-400">{stats.totalUsers.toLocaleString()}</div>
                    <div className="text-sm text-gray-300">注册用户</div>
                  </div>
                  <div className="text-center">
                    <div className="text-3xl font-bold text-blue-400">{stats.totalVolume}K ETH</div>
                    <div className="text-sm text-gray-300">交易总额</div>
                  </div>
                  <div className="text-center">
                    <div className="text-3xl font-bold text-purple-400">{stats.totalMuseums}</div>
                    <div className="text-sm text-gray-300">虚拟博物馆</div>
                  </div>
                </div>
              </div>
            </motion.div>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="py-20 bg-gray-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-3xl lg:text-4xl font-bold text-gray-900 mb-4">
              为什么选择我们的平台
            </h2>
            <p className="text-xl text-gray-600 max-w-3xl mx-auto">
              我们致力于通过先进的区块链技术，为文物数字化保护和传承提供最专业的解决方案
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
            {features.map((feature, index) => (
              <motion.div
                key={index}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5, delay: index * 0.1 }}
                className="bg-white rounded-xl p-6 shadow-lg hover:shadow-xl transition-shadow"
              >
                <div className="w-12 h-12 bg-gradient-to-br from-purple-500 to-blue-500 rounded-lg flex items-center justify-center mb-4">
                  <feature.icon className="w-6 h-6 text-white" />
                </div>
                <h3 className="text-xl font-semibold text-gray-900 mb-2">
                  {feature.title}
                </h3>
                <p className="text-gray-600">
                  {feature.description}
                </p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Featured NFTs Section */}
      <section className="py-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between mb-12">
            <div>
              <h2 className="text-3xl lg:text-4xl font-bold text-gray-900 mb-4">
                精选数字文物
              </h2>
              <p className="text-xl text-gray-600">
                发现最珍贵的数字化文物藏品
              </p>
            </div>
            <Link to="/explore">
              <Button variant="outline" size="lg">
                查看全部
                <ArrowRight className="ml-2 w-4 h-4" />
              </Button>
            </Link>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {featuredNFTs.map((nft, index) => (
              <motion.div
                key={nft.id}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5, delay: index * 0.1 }}
                className="bg-white rounded-xl overflow-hidden shadow-lg hover:shadow-xl transition-all duration-300 group"
              >
                <div className="relative overflow-hidden">
                  <img
                    src={nft.image}
                    alt={nft.name}
                    className="w-full h-64 object-cover group-hover:scale-105 transition-transform duration-300"
                  />
                  <div className="absolute top-4 right-4 bg-black bg-opacity-50 rounded-full p-2">
                    <Heart className="w-4 h-4 text-white" />
                  </div>
                  <div className="absolute bottom-4 left-4 right-4">
                    <div className="bg-white bg-opacity-90 backdrop-blur-sm rounded-lg p-3">
                      <div className="flex items-center justify-between text-sm">
                        <div className="flex items-center space-x-2">
                          <Eye className="w-4 h-4 text-gray-500" />
                          <span className="text-gray-600">{nft.views}</span>
                        </div>
                        <div className="flex items-center space-x-2">
                          <Heart className="w-4 h-4 text-red-500" />
                          <span className="text-gray-600">{nft.likes}</span>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
                <div className="p-6">
                  <h3 className="text-lg font-semibold text-gray-900 mb-2">
                    {nft.name}
                  </h3>
                  <p className="text-gray-600 text-sm mb-3">
                    by {nft.creator}
                  </p>
                  <div className="flex items-center justify-between">
                    <div className="text-lg font-bold text-purple-600">
                      {nft.price}
                    </div>
                    <Button size="sm" className="bg-gradient-to-r from-purple-600 to-blue-600">
                      查看详情
                    </Button>
                  </div>
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Virtual Museum Preview */}
      <section className="py-20 bg-gradient-to-br from-purple-50 to-blue-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
            <motion.div
              initial={{ opacity: 0, x: -20 }}
              whileInView={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.8 }}
            >
              <h2 className="text-3xl lg:text-4xl font-bold text-gray-900 mb-6">
                沉浸式虚拟博物馆体验
              </h2>
              <p className="text-xl text-gray-600 mb-8">
                使用最新的3D技术和VR设备，创建属于您的专属数字博物馆。
                让访客能够身临其境地欣赏您的珍贵藏品。
              </p>
              <div className="space-y-4 mb-8">
                <div className="flex items-center space-x-3">
                  <div className="w-2 h-2 bg-purple-500 rounded-full"></div>
                  <span className="text-gray-700">3D虚拟环境展示</span>
                </div>
                <div className="flex items-center space-x-3">
                  <div className="w-2 h-2 bg-purple-500 rounded-full"></div>
                  <span className="text-gray-700">VR/AR设备支持</span>
                </div>
                <div className="flex items-center space-x-3">
                  <div className="w-2 h-2 bg-purple-500 rounded-full"></div>
                  <span className="text-gray-700">自定义装饰和布局</span>
                </div>
                <div className="flex items-center space-x-3">
                  <div className="w-2 h-2 bg-purple-500 rounded-full"></div>
                  <span className="text-gray-700">多人在线参观</span>
                </div>
              </div>
              <div className="flex space-x-4">
                <Link to="/museum">
                  <Button size="lg" className="bg-gradient-to-r from-purple-600 to-blue-600">
                    体验虚拟博物馆
                    <Museum className="ml-2 w-5 h-5" />
                  </Button>
                </Link>
                <Button size="lg" variant="outline">
                  <Play className="mr-2 w-5 h-5" />
                  观看演示
                </Button>
              </div>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, x: 20 }}
              whileInView={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.8 }}
              className="relative"
            >
              <div className="relative bg-gradient-to-br from-purple-600 to-blue-600 rounded-2xl p-8 text-white">
                <div className="absolute top-4 right-4">
                  <div className="w-3 h-3 bg-green-400 rounded-full animate-pulse"></div>
                </div>
                <h3 className="text-xl font-semibold mb-4">虚拟博物馆实时数据</h3>
                <div className="space-y-4">
                  <div className="flex justify-between">
                    <span>在线访客</span>
                    <span className="font-bold">1,234</span>
                  </div>
                  <div className="flex justify-between">
                    <span>展品总数</span>
                    <span className="font-bold">5,678</span>
                  </div>
                  <div className="flex justify-between">
                    <span>博物馆数量</span>
                    <span className="font-bold">156</span>
                  </div>
                  <div className="flex justify-between">
                    <span>今日访问</span>
                    <span className="font-bold">12,890</span>
                  </div>
                </div>
              </div>
            </motion.div>
          </div>
        </div>
      </section>

      {/* Testimonials Section */}
      <section className="py-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-3xl lg:text-4xl font-bold text-gray-900 mb-4">
              用户评价
            </h2>
            <p className="text-xl text-gray-600">
              听听我们的用户怎么说
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {testimonials.map((testimonial, index) => (
              <motion.div
                key={index}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5, delay: index * 0.1 }}
                className="bg-white rounded-xl p-6 shadow-lg"
              >
                <div className="flex items-center mb-4">
                  {[...Array(5)].map((_, i) => (
                    <Star key={i} className="w-5 h-5 text-yellow-400 fill-current" />
                  ))}
                </div>
                <p className="text-gray-600 mb-6 italic">
                  "{testimonial.content}"
                </p>
                <div className="flex items-center">
                  <img
                    src={testimonial.avatar}
                    alt={testimonial.name}
                    className="w-12 h-12 rounded-full mr-4"
                  />
                  <div>
                    <div className="font-semibold text-gray-900">
                      {testimonial.name}
                    </div>
                    <div className="text-sm text-gray-600">
                      {testimonial.role}
                    </div>
                  </div>
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-20 bg-gradient-to-r from-purple-600 to-blue-600 text-white">
        <div className="max-w-4xl mx-auto text-center px-4 sm:px-6 lg:px-8">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8 }}
          >
            <h2 className="text-3xl lg:text-4xl font-bold mb-6">
              准备好开始您的数字文物之旅了吗？
            </h2>
            <p className="text-xl mb-8 text-purple-100">
              加入我们的平台，探索、创建和交易独一无二的数字文物NFT
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Link to="/register">
                <Button size="lg" className="bg-white text-purple-600 hover:bg-gray-100 text-lg px-8 py-3">
                  立即注册
                  <ArrowRight className="ml-2 w-5 h-5" />
                </Button>
              </Link>
              <Link to="/explore">
                <Button size="lg" variant="outline" className="border-white text-white hover:bg-white hover:text-purple-600 text-lg px-8 py-3">
                  开始探索
                </Button>
              </Link>
            </div>
          </motion.div>
        </div>
      </section>
    </div>
  )
}

export default HomePage

