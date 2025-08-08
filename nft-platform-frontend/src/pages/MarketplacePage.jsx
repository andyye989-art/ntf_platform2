import { useState, useEffect } from 'react'
import { Link, useLocation } from 'react-router-dom'
import { 
  Search, 
  Filter, 
  TrendingUp, 
  Clock, 
  Heart, 
  Eye, 
  ChevronDown,
  Grid,
  List,
  AlertCircle
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { motion } from 'framer-motion'

const MarketplacePage = () => {
  const location = useLocation()
  const [nfts, setNfts] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [searchQuery, setSearchQuery] = useState('')
  const [viewMode, setViewMode] = useState('grid') // grid, list
  const [filters, setFilters] = useState({
    category: '',
    priceRange: '',
    status: 'for_sale', // for_sale, auction, sold
    sortBy: 'created_at',
    sortOrder: 'desc',
    minPrice: '',
    maxPrice: ''
  })
  const [pagination, setPagination] = useState({
    page: 1,
    per_page: 20,
    total: 0,
    pages: 0
  })
  const [showFilters, setShowFilters] = useState(false)
  const [stats, setStats] = useState({
    totalVolume: 0,
    totalSales: 0,
    averagePrice: 0,
    activeListings: 0
  })

  useEffect(() => {
    const params = new URLSearchParams(location.search)
    const search = params.get('search')
    if (search) {
      setSearchQuery(search)
    }
  }, [location.search])

  useEffect(() => {
    fetchMarketplaceData()
    fetchMarketplaceStats()
  }, [searchQuery, filters, pagination.page])

  const fetchMarketplaceData = async () => {
    setLoading(true)
    setError(null)
    try {
      let url = `/api/marketplace/items?page=${pagination.page}&per_page=${pagination.per_page}`
      
      if (searchQuery) {
        url += `&search=${encodeURIComponent(searchQuery)}`
      }
      if (filters.category) {
        url += `&category=${filters.category}`
      }
      if (filters.status && filters.status !== 'all') {
        url += `&status=${filters.status}`
      }
      if (filters.minPrice) {
        url += `&min_price=${filters.minPrice}`
      }
      if (filters.maxPrice) {
        url += `&max_price=${filters.maxPrice}`
      }
      if (filters.sortBy) {
        url += `&sort_by=${filters.sortBy}`
      }
      if (filters.sortOrder) {
        url += `&sort_order=${filters.sortOrder}`
      }

      const response = await fetch(url)
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`)
      }
      const data = await response.json()

      setNfts(data.items)
      setPagination(data.pagination)
    } catch (e) {
      setError('加载数据失败，请稍后重试。')
      console.error('Fetch error:', e)
    } finally {
      setLoading(false)
    }
  }

  const fetchMarketplaceStats = async () => {
    try {
      const response = await fetch('/api/marketplace/stats')
      if (response.ok) {
        const data = await response.json()
        setStats(data.stats)
      }
    } catch (error) {
      console.error('获取市场统计失败:', error)
    }
  }

  const handleSearchSubmit = (e) => {
    e.preventDefault()
    setPagination(prev => ({ ...prev, page: 1 }))
    fetchMarketplaceData()
  }

  const handleFilterChange = (e) => {
    const { name, value } = e.target
    setFilters(prev => ({
      ...prev,
      [name]: value
    }))
    setPagination(prev => ({ ...prev, page: 1 }))
  }

  const handlePageChange = (newPage) => {
    if (newPage > 0 && newPage <= pagination.pages) {
      setPagination(prev => ({ ...prev, page: newPage }))
    }
  }

  const renderNFTCard = (nft, index) => (
    <motion.div
      key={nft.id}
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3, delay: index * 0.05 }}
      className="bg-white rounded-xl overflow-hidden shadow-lg hover:shadow-xl transition-all duration-300 group"
    >
      <div className="relative overflow-hidden">
        <img
          src={nft.image_url || '/api/placeholder/300/300'}
          alt={nft.name}
          className="w-full h-64 object-cover group-hover:scale-105 transition-transform duration-300"
        />
        
        {/* Status Badge */}
        <div className="absolute top-4 left-4">
          {nft.status === 'auction' && (
            <span className="bg-red-500 text-white px-2 py-1 rounded-full text-xs font-medium">
              拍卖中
            </span>
          )}
          {nft.status === 'for_sale' && (
            <span className="bg-green-500 text-white px-2 py-1 rounded-full text-xs font-medium">
              在售
            </span>
          )}
        </div>

        {/* Like Button */}
        <div className="absolute top-4 right-4 bg-black bg-opacity-50 rounded-full p-2">
          <Heart className="w-4 h-4 text-white" />
        </div>

        {/* Stats Overlay */}
        <div className="absolute bottom-4 left-4 right-4">
          <div className="bg-white bg-opacity-90 backdrop-blur-sm rounded-lg p-3">
            <div className="flex items-center justify-between text-sm">
              <div className="flex items-center space-x-2">
                <Eye className="w-4 h-4 text-gray-500" />
                <span className="text-gray-600">{nft.views || 0}</span>
              </div>
              <div className="flex items-center space-x-2">
                <Heart className="w-4 h-4 text-red-500" />
                <span className="text-gray-600">{nft.likes || 0}</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-2 truncate">
          {nft.name}
        </h3>
        <p className="text-gray-600 text-sm mb-3">
          by {nft.creator?.username || '未知'}
        </p>
        
        {/* Price Info */}
        <div className="flex items-center justify-between mb-4">
          <div>
            <div className="text-sm text-gray-600">当前价格</div>
            <div className="text-lg font-bold text-purple-600">
              {nft.current_price ? `${nft.current_price} ETH` : '未定价'}
            </div>
          </div>
          {nft.status === 'auction' && nft.auction_end_time && (
            <div className="text-right">
              <div className="text-sm text-gray-600">剩余时间</div>
              <div className="text-sm font-medium text-red-600 flex items-center">
                <Clock className="w-3 h-3 mr-1" />
                2天 5小时
              </div>
            </div>
          )}
        </div>

        {/* Action Buttons */}
        <div className="flex space-x-2">
          <Link to={`/nft/${nft.id}`} className="flex-1">
            <Button size="sm" className="w-full bg-gradient-to-r from-purple-600 to-blue-600">
              查看详情
            </Button>
          </Link>
          {nft.status === 'for_sale' && (
            <Button size="sm" variant="outline" className="px-3">
              立即购买
            </Button>
          )}
          {nft.status === 'auction' && (
            <Button size="sm" variant="outline" className="px-3">
              出价
            </Button>
          )}
        </div>
      </div>
    </motion.div>
  )

  const renderNFTListItem = (nft, index) => (
    <motion.div
      key={nft.id}
      initial={{ opacity: 0, x: -20 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ duration: 0.3, delay: index * 0.05 }}
      className="bg-white rounded-lg shadow-lg p-4 hover:shadow-xl transition-shadow"
    >
      <div className="flex items-center space-x-4">
        <img
          src={nft.image_url || '/api/placeholder/100/100'}
          alt={nft.name}
          className="w-16 h-16 object-cover rounded-lg"
        />
        <div className="flex-1">
          <h3 className="font-semibold text-gray-900">{nft.name}</h3>
          <p className="text-sm text-gray-600">by {nft.creator?.username || '未知'}</p>
        </div>
        <div className="text-right">
          <div className="text-lg font-bold text-purple-600">
            {nft.current_price ? `${nft.current_price} ETH` : '未定价'}
          </div>
          <div className="text-sm text-gray-600">
            {nft.status === 'auction' ? '拍卖中' : '在售'}
          </div>
        </div>
        <div className="flex space-x-2">
          <Link to={`/nft/${nft.id}`}>
            <Button size="sm" variant="outline">查看</Button>
          </Link>
          <Button size="sm" className="bg-purple-600">
            {nft.status === 'auction' ? '出价' : '购买'}
          </Button>
        </div>
      </div>
    </motion.div>
  )

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Hero Section */}
      <section className="bg-gradient-to-br from-purple-600 to-blue-600 text-white py-16">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-8">
            <h1 className="text-4xl font-bold mb-4">NFT交易市场</h1>
            <p className="text-xl text-purple-100">发现、购买和交易独特的数字文物</p>
          </div>

          {/* Search Bar */}
          <form onSubmit={handleSearchSubmit} className="max-w-2xl mx-auto">
            <div className="relative">
              <Search className="absolute left-4 top-1/2 transform -translate-y-1/2 text-gray-300 w-5 h-5" />
              <input
                type="text"
                placeholder="搜索NFT、集合、创作者..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-12 pr-4 py-3 rounded-full bg-white bg-opacity-20 border border-white border-opacity-30 text-white placeholder-gray-200 focus:outline-none focus:ring-2 focus:ring-white focus:border-transparent"
              />
              <Button
                type="submit"
                className="absolute right-2 top-1/2 transform -translate-y-1/2 bg-white text-purple-600 hover:bg-gray-100 rounded-full px-6 py-2"
              >
                搜索
              </Button>
            </div>
          </form>

          {/* Stats */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-6 mt-12">
            <div className="text-center">
              <div className="text-2xl font-bold">{stats.totalVolume.toFixed(2)} ETH</div>
              <div className="text-purple-100 text-sm">总交易量</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold">{stats.totalSales}</div>
              <div className="text-purple-100 text-sm">总销售数</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold">{stats.averagePrice.toFixed(3)} ETH</div>
              <div className="text-purple-100 text-sm">平均价格</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold">{stats.activeListings}</div>
              <div className="text-purple-100 text-sm">在售商品</div>
            </div>
          </div>
        </div>
      </section>

      {/* Main Content */}
      <section className="py-12">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          {/* Filters and Controls */}
          <div className="flex flex-col md:flex-row justify-between items-center mb-8 space-y-4 md:space-y-0">
            {/* Filter Toggles */}
            <div className="flex items-center space-x-4">
              <Button
                variant="outline"
                onClick={() => setShowFilters(!showFilters)}
                className="flex items-center space-x-2"
              >
                <Filter className="w-4 h-4" />
                <span>筛选</span>
              </Button>

              {/* Quick Filters */}
              <div className="flex space-x-2">
                {[
                  { key: 'for_sale', label: '在售' },
                  { key: 'auction', label: '拍卖' },
                  { key: 'sold', label: '已售' }
                ].map((status) => (
                  <Button
                    key={status.key}
                    variant={filters.status === status.key ? 'default' : 'outline'}
                    size="sm"
                    onClick={() => handleFilterChange({ target: { name: 'status', value: status.key } })}
                    className={filters.status === status.key ? 'bg-purple-600 text-white' : ''}
                  >
                    {status.label}
                  </Button>
                ))}
              </div>
            </div>

            {/* Sort and View Controls */}
            <div className="flex items-center space-x-4">
              {/* Sort */}
              <div className="flex items-center space-x-2">
                <span className="text-sm text-gray-600">排序:</span>
                <select
                  name="sortBy"
                  value={filters.sortBy}
                  onChange={handleFilterChange}
                  className="text-sm border border-gray-300 rounded px-2 py-1 focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                >
                  <option value="created_at">最新</option>
                  <option value="current_price">价格</option>
                  <option value="views">浏览量</option>
                  <option value="likes">点赞数</option>
                </select>
                <select
                  name="sortOrder"
                  value={filters.sortOrder}
                  onChange={handleFilterChange}
                  className="text-sm border border-gray-300 rounded px-2 py-1 focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                >
                  <option value="desc">降序</option>
                  <option value="asc">升序</option>
                </select>
              </div>

              {/* View Mode */}
              <div className="flex items-center space-x-2">
                <button
                  onClick={() => setViewMode('grid')}
                  className={`p-2 rounded ${
                    viewMode === 'grid' ? 'bg-purple-100 text-purple-600' : 'text-gray-400 hover:text-gray-600'
                  }`}
                >
                  <Grid className="w-4 h-4" />
                </button>
                <button
                  onClick={() => setViewMode('list')}
                  className={`p-2 rounded ${
                    viewMode === 'list' ? 'bg-purple-100 text-purple-600' : 'text-gray-400 hover:text-gray-600'
                  }`}
                >
                  <List className="w-4 h-4" />
                </button>
              </div>
            </div>
          </div>

          {/* Advanced Filters */}
          {showFilters && (
            <div className="bg-white rounded-lg shadow p-6 mb-8">
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    分类
                  </label>
                  <select
                    name="category"
                    value={filters.category}
                    onChange={handleFilterChange}
                    className="w-full border border-gray-300 rounded px-3 py-2 focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                  >
                    <option value="">所有分类</option>
                    <option value="ancient">古代文物</option>
                    <option value="modern">现代艺术</option>
                    <option value="digital">数字艺术</option>
                  </select>
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    最低价格 (ETH)
                  </label>
                  <input
                    type="number"
                    name="minPrice"
                    value={filters.minPrice}
                    onChange={handleFilterChange}
                    step="0.001"
                    min="0"
                    className="w-full border border-gray-300 rounded px-3 py-2 focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                    placeholder="0.000"
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    最高价格 (ETH)
                  </label>
                  <input
                    type="number"
                    name="maxPrice"
                    value={filters.maxPrice}
                    onChange={handleFilterChange}
                    step="0.001"
                    min="0"
                    className="w-full border border-gray-300 rounded px-3 py-2 focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                    placeholder="0.000"
                  />
                </div>
                
                <div className="flex items-end">
                  <Button
                    onClick={() => {
                      setFilters({
                        category: '',
                        priceRange: '',
                        status: 'for_sale',
                        sortBy: 'created_at',
                        sortOrder: 'desc',
                        minPrice: '',
                        maxPrice: ''
                      })
                    }}
                    variant="outline"
                    className="w-full"
                  >
                    重置筛选
                  </Button>
                </div>
              </div>
            </div>
          )}

          {/* Content Grid/List */}
          {loading ? (
            <div className="text-center py-10">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-600 mx-auto mb-4"></div>
              <p className="text-gray-600">加载中...</p>
            </div>
          ) : error ? (
            <div className="text-center py-10 text-red-600">
              <AlertCircle className="w-12 h-12 mx-auto mb-4" />
              <p>{error}</p>
            </div>
          ) : (
            <>
              {viewMode === 'grid' ? (
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
                  {nfts.length > 0 ? (
                    nfts.map(renderNFTCard)
                  ) : (
                    <div className="col-span-full text-center py-10 text-gray-600">
                      <p>没有找到符合条件的NFT。</p>
                    </div>
                  )}
                </div>
              ) : (
                <div className="space-y-4">
                  {nfts.length > 0 ? (
                    nfts.map(renderNFTListItem)
                  ) : (
                    <div className="text-center py-10 text-gray-600">
                      <p>没有找到符合条件的NFT。</p>
                    </div>
                  )}
                </div>
              )}

              {/* Pagination */}
              {pagination.total > 0 && (
                <div className="flex justify-center items-center space-x-4 mt-12">
                  <Button
                    variant="outline"
                    onClick={() => handlePageChange(pagination.page - 1)}
                    disabled={!pagination.has_prev}
                  >
                    上一页
                  </Button>
                  <span className="text-gray-700">
                    页 {pagination.page} / {pagination.pages}
                  </span>
                  <Button
                    variant="outline"
                    onClick={() => handlePageChange(pagination.page + 1)}
                    disabled={!pagination.has_next}
                  >
                    下一页
                  </Button>
                </div>
              )}
            </>
          )}
        </div>
      </section>
    </div>
  )
}

export default MarketplacePage

