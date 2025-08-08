import { useState, useEffect } from 'react'
import { Link, useLocation } from 'react-router-dom'
import { Search, Filter, ArrowRight, Heart, Eye } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { motion } from 'framer-motion'

const ExplorePage = () => {
  const location = useLocation()
  const [nfts, setNfts] = useState([])
  const [collections, setCollections] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [activeTab, setActiveTab] = useState('nfts') // 'nfts' or 'collections'
  const [searchQuery, setSearchQuery] = useState('')
  const [filters, setFilters] = useState({
    category: '',
    priceRange: '',
    status: 'all',
    sortBy: 'created_at',
    sortOrder: 'desc'
  })
  const [pagination, setPagination] = useState({
    page: 1,
    per_page: 20,
    total: 0,
    pages: 0
  })

  useEffect(() => {
    const params = new URLSearchParams(location.search)
    const search = params.get('search')
    if (search) {
      setSearchQuery(search)
      // Optionally, trigger a search immediately
      // fetchSearchResults(search, activeTab, filters, 1)
    }
  }, [location.search])

  useEffect(() => {
    fetchData(activeTab, searchQuery, filters, pagination.page)
  }, [activeTab, searchQuery, filters, pagination.page])

  const fetchData = async (tab, query, currentFilters, page) => {
    setLoading(true)
    setError(null)
    try {
      let url = `/api/nft/${tab}?page=${page}&per_page=${currentFilters.per_page}`
      if (query) {
        url += `&search=${encodeURIComponent(query)}`
      }
      if (currentFilters.category) {
        url += `&category=${currentFilters.category}`
      }
      if (currentFilters.status && currentFilters.status !== 'all') {
        url += `&status=${currentFilters.status}`
      }
      if (currentFilters.sortBy) {
        url += `&sort_by=${currentFilters.sortBy}`
      }
      if (currentFilters.sortOrder) {
        url += `&sort_order=${currentFilters.sortOrder}`
      }

      const response = await fetch(url)
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`)
      }
      const data = await response.json()

      if (tab === 'nfts') {
        setNfts(data.items)
      } else {
        setCollections(data.collections)
      }
      setPagination(data.pagination)
    } catch (e) {
      setError('加载数据失败，请稍后重试。')
      console.error('Fetch error:', e)
    } finally {
      setLoading(false)
    }
  }

  const handleSearchSubmit = (e) => {
    e.preventDefault()
    setPagination(prev => ({ ...prev, page: 1 })) // Reset to first page on new search
    fetchData(activeTab, searchQuery, filters, 1)
  }

  const handleFilterChange = (e) => {
    const { name, value } = e.target
    setFilters(prev => ({
      ...prev,
      [name]: value
    }))
    setPagination(prev => ({ ...prev, page: 1 })) // Reset to first page on filter change
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
        <div className="absolute top-4 right-4 bg-black bg-opacity-50 rounded-full p-2">
          <Heart className="w-4 h-4 text-white" />
        </div>
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
        <h3 className="text-lg font-semibold text-gray-900 mb-2">
          {nft.name}
        </h3>
        <p className="text-gray-600 text-sm mb-3">
          by {nft.creator?.username || '未知'}
        </p>
        <div className="flex items-center justify-between">
          <div className="text-lg font-bold text-purple-600">
            {nft.current_price ? `${nft.current_price} ETH` : '未定价'}
          </div>
          <Link to={`/nft/${nft.id}`}>
            <Button size="sm" className="bg-gradient-to-r from-purple-600 to-blue-600">
              查看详情
            </Button>
          </Link>
        </div>
      </div>
    </motion.div>
  )

  const renderCollectionCard = (collection, index) => (
    <motion.div
      key={collection.id}
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3, delay: index * 0.05 }}
      className="bg-white rounded-xl overflow-hidden shadow-lg hover:shadow-xl transition-all duration-300 group"
    >
      <div className="relative overflow-hidden">
        <img
          src={collection.cover_image || '/api/placeholder/300/300'}
          alt={collection.name}
          className="w-full h-64 object-cover group-hover:scale-105 transition-transform duration-300"
        />
        <div className="absolute bottom-4 left-4 right-4">
          <div className="bg-white bg-opacity-90 backdrop-blur-sm rounded-lg p-3">
            <div className="flex items-center justify-between text-sm">
              <div className="flex items-center space-x-2">
                <span className="text-gray-600">{collection.total_items || 0} Items</span>
              </div>
              <div className="flex items-center space-x-2">
                <span className="text-gray-600">Floor: {collection.floor_price || 'N/A'} ETH</span>
              </div>
            </div>
          </div>
        </div>
      </div>
      <div className="p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-2">
          {collection.name}
        </h3>
        <p className="text-gray-600 text-sm mb-3">
          by {collection.creator?.username || '未知'}
        </p>
        <div className="flex items-center justify-between">
          <div className="text-lg font-bold text-purple-600">
            {collection.volume_traded ? `${collection.volume_traded} ETH` : '0 ETH'}
          </div>
          <Link to={`/collection/${collection.id}`}>
            <Button size="sm" className="bg-gradient-to-r from-purple-600 to-blue-600">
              查看集合
            </Button>
          </Link>
        </div>
      </div>
    </motion.div>
  )

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Hero Section */}
      <section className="bg-gradient-to-br from-purple-600 to-blue-600 text-white py-16">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h1 className="text-4xl font-bold mb-4">探索数字文物</h1>
          <p className="text-xl text-purple-100">发现独一无二的文化遗产NFT</p>
          <form onSubmit={handleSearchSubmit} className="mt-8 max-w-2xl mx-auto">
            <div className="relative">
              <Search className="absolute left-4 top-1/2 transform -translate-y-1/2 text-gray-300 w-5 h-5" />
              <input
                type="text"
                placeholder="搜索NFT、集合、关键词..."
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
        </div>
      </section>

      {/* Main Content */}
      <section className="py-12">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          {/* Tabs and Filters */}
          <div className="flex flex-col md:flex-row justify-between items-center mb-8 space-y-4 md:space-y-0">
            {/* Tabs */}
            <div className="flex space-x-4">
              <Button
                variant={activeTab === 'nfts' ? 'default' : 'outline'}
                onClick={() => setActiveTab('nfts')}
                className={activeTab === 'nfts' ? 'bg-purple-600 text-white' : 'border-purple-600 text-purple-600 hover:bg-purple-50'}
              >
                NFTs
              </Button>
              <Button
                variant={activeTab === 'collections' ? 'default' : 'outline'}
                onClick={() => setActiveTab('collections')}
                className={activeTab === 'collections' ? 'bg-purple-600 text-white' : 'border-purple-600 text-purple-600 hover:bg-purple-50'}
              >
                集合
              </Button>
            </div>

            {/* Filters */}
            <div className="flex items-center space-x-4">
              <div className="relative">
                <select
                  name="sortBy"
                  value={filters.sortBy}
                  onChange={handleFilterChange}
                  className="block w-full pl-3 pr-10 py-2 text-base border-gray-300 focus:outline-none focus:ring-purple-500 focus:border-purple-500 sm:text-sm rounded-md"
                >
                  <option value="created_at">最新</option>
                  <option value="name">名称</option>
                  {activeTab === 'nfts' && (
                    <>
                      <option value="current_price">价格</option>
                      <option value="views">浏览量</option>
                      <option value="likes">点赞数</option>
                    </>
                  )}
                  {activeTab === 'collections' && (
                    <>
                      <option value="volume_traded">交易量</option>
                      <option value="floor_price">地板价</option>
                    </>
                  )}
                </select>
                <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-2 text-gray-700">
                  <ChevronDown className="h-4 w-4" />
                </div>
              </div>
              <div className="relative">
                <select
                  name="sortOrder"
                  value={filters.sortOrder}
                  onChange={handleFilterChange}
                  className="block w-full pl-3 pr-10 py-2 text-base border-gray-300 focus:outline-none focus:ring-purple-500 focus:border-purple-500 sm:text-sm rounded-md"
                >
                  <option value="desc">降序</option>
                  <option value="asc">升序</option>
                </select>
                <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-2 text-gray-700">
                  <ChevronDown className="h-4 w-4" />
                </div>
              </div>
              <Button variant="outline" className="flex items-center space-x-2">
                <Filter className="w-4 h-4" />
                <span>更多筛选</span>
              </Button>
            </div>
          </div>

          {/* Content Grid */}
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
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
                {activeTab === 'nfts' ? (
                  nfts.length > 0 ? (
                    nfts.map(renderNFTCard)
                  ) : (
                    <div className="col-span-full text-center py-10 text-gray-600">
                      <p>没有找到符合条件的NFT。</p>
                    </div>
                  )
                ) : (
                  collections.length > 0 ? (
                    collections.map(renderCollectionCard)
                  ) : (
                    <div className="col-span-full text-center py-10 text-gray-600">
                      <p>没有找到符合条件的集合。</p>
                    </div>
                  )
                )}
              </div>

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

export default ExplorePage

