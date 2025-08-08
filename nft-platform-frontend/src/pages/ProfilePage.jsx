import { useState, useEffect } from 'react'
import { useParams, useLocation, Link } from 'react-router-dom'
import { 
  User, 
  Settings, 
  Edit, 
  Copy, 
  ExternalLink,
  Grid,
  List,
  Heart,
  Eye,
  Share2,
  Plus,
  CheckCircle,
  AlertCircle
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { useAuth } from '../contexts/AuthContext'
import { useWeb3 } from '../contexts/Web3Context'

const ProfilePage = () => {
  const { userId } = useParams()
  const location = useLocation()
  const { user: currentUser, isAuthenticated } = useAuth()
  const { account } = useWeb3()
  
  const [user, setUser] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [activeTab, setActiveTab] = useState('created') // created, collected, liked, activity
  const [viewMode, setViewMode] = useState('grid') // grid, list
  const [isEditing, setIsEditing] = useState(false)
  const [copied, setCopied] = useState(false)
  
  // 数据状态
  const [nfts, setNfts] = useState([])
  const [collections, setCollections] = useState([])
  const [activities, setActivities] = useState([])
  const [stats, setStats] = useState({
    created: 0,
    collected: 0,
    liked: 0,
    volume: 0
  })
  
  // 编辑表单
  const [editForm, setEditForm] = useState({
    username: '',
    bio: '',
    website: '',
    twitter: '',
    instagram: ''
  })

  const isOwnProfile = !userId || (currentUser && currentUser.id.toString() === userId)

  useEffect(() => {
    const params = new URLSearchParams(location.search)
    const tab = params.get('tab')
    if (tab && ['created', 'collected', 'liked', 'activity', 'settings'].includes(tab)) {
      setActiveTab(tab)
    }
  }, [location.search])

  useEffect(() => {
    fetchUserData()
  }, [userId, currentUser])

  useEffect(() => {
    if (user) {
      fetchTabData(activeTab)
    }
  }, [user, activeTab])

  const fetchUserData = async () => {
    setLoading(true)
    setError('')
    
    try {
      let targetUserId = userId
      if (!targetUserId && currentUser) {
        targetUserId = currentUser.id
      }
      
      if (!targetUserId) {
        setError('用户不存在')
        return
      }

      const response = await fetch(`/api/users/${targetUserId}`)
      if (!response.ok) {
        throw new Error('用户不存在')
      }
      
      const data = await response.json()
      setUser(data.user)
      setStats(data.stats)
      
      // 初始化编辑表单
      setEditForm({
        username: data.user.username || '',
        bio: data.user.bio || '',
        website: data.user.website || '',
        twitter: data.user.twitter || '',
        instagram: data.user.instagram || ''
      })
      
    } catch (error) {
      setError(error.message)
    } finally {
      setLoading(false)
    }
  }

  const fetchTabData = async (tab) => {
    if (!user) return
    
    try {
      let endpoint = ''
      switch (tab) {
        case 'created':
          endpoint = `/api/nft/items?creator_id=${user.id}`
          break
        case 'collected':
          endpoint = `/api/nft/items?owner_id=${user.id}`
          break
        case 'liked':
          endpoint = `/api/users/${user.id}/liked`
          break
        case 'activity':
          endpoint = `/api/users/${user.id}/activities`
          break
        default:
          return
      }

      const response = await fetch(endpoint)
      if (response.ok) {
        const data = await response.json()
        
        switch (tab) {
          case 'created':
          case 'collected':
          case 'liked':
            setNfts(data.items || [])
            break
          case 'activity':
            setActivities(data.activities || [])
            break
        }
      }
    } catch (error) {
      console.error('获取数据失败:', error)
    }
  }

  const handleCopyAddress = async () => {
    if (user?.wallet_address) {
      try {
        await navigator.clipboard.writeText(user.wallet_address)
        setCopied(true)
        setTimeout(() => setCopied(false), 2000)
      } catch (error) {
        console.error('复制失败:', error)
      }
    }
  }

  const handleEditSubmit = async (e) => {
    e.preventDefault()
    
    try {
      const response = await fetch(`/api/users/${currentUser.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('auth_token')}`
        },
        body: JSON.stringify(editForm)
      })

      if (response.ok) {
        const data = await response.json()
        setUser(data.user)
        setIsEditing(false)
      } else {
        throw new Error('更新失败')
      }
    } catch (error) {
      setError(error.message)
    }
  }

  const formatAddress = (address) => {
    if (!address) return ''
    return `${address.slice(0, 6)}...${address.slice(-4)}`
  }

  const renderNFTCard = (nft, index) => (
    <div key={nft.id} className="bg-white rounded-xl overflow-hidden shadow-lg hover:shadow-xl transition-all duration-300 group">
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
          {nft.collection?.name || '未分类'}
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
    </div>
  )

  const renderActivityItem = (activity, index) => (
    <div key={index} className="flex items-center space-x-4 p-4 bg-white rounded-lg shadow">
      <div className="w-12 h-12 bg-purple-100 rounded-full flex items-center justify-center">
        {activity.type === 'mint' && <Plus className="w-6 h-6 text-purple-600" />}
        {activity.type === 'transfer' && <ExternalLink className="w-6 h-6 text-blue-600" />}
        {activity.type === 'sale' && <CheckCircle className="w-6 h-6 text-green-600" />}
      </div>
      <div className="flex-1">
        <p className="font-medium text-gray-900">{activity.description}</p>
        <p className="text-sm text-gray-600">{activity.timestamp}</p>
      </div>
      {activity.price && (
        <div className="text-right">
          <p className="font-bold text-purple-600">{activity.price} ETH</p>
        </div>
      )}
    </div>
  )

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-600"></div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <AlertCircle className="w-16 h-16 text-red-500 mx-auto mb-4" />
          <h2 className="text-2xl font-bold text-gray-900 mb-2">出错了</h2>
          <p className="text-gray-600">{error}</p>
        </div>
      </div>
    )
  }

  if (!user) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <User className="w-16 h-16 text-gray-400 mx-auto mb-4" />
          <h2 className="text-2xl font-bold text-gray-900 mb-2">用户不存在</h2>
          <p className="text-gray-600">找不到指定的用户</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Profile Header */}
      <div className="bg-gradient-to-br from-purple-600 to-blue-600 text-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
          <div className="flex flex-col md:flex-row items-center space-y-6 md:space-y-0 md:space-x-8">
            {/* Avatar */}
            <div className="relative">
              <div className="w-32 h-32 bg-white bg-opacity-20 rounded-full flex items-center justify-center">
                {user.avatar_url ? (
                  <img
                    src={user.avatar_url}
                    alt={user.username}
                    className="w-32 h-32 rounded-full object-cover"
                  />
                ) : (
                  <User className="w-16 h-16 text-white" />
                )}
              </div>
              {isOwnProfile && (
                <button className="absolute bottom-0 right-0 w-8 h-8 bg-purple-500 rounded-full flex items-center justify-center hover:bg-purple-600 transition-colors">
                  <Edit className="w-4 h-4 text-white" />
                </button>
              )}
            </div>

            {/* User Info */}
            <div className="flex-1 text-center md:text-left">
              <div className="flex flex-col md:flex-row md:items-center md:space-x-4 mb-4">
                <h1 className="text-3xl font-bold">{user.username}</h1>
                {isOwnProfile && (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setIsEditing(true)}
                    className="border-white text-white hover:bg-white hover:text-purple-600 mt-2 md:mt-0"
                  >
                    <Edit className="w-4 h-4 mr-2" />
                    编辑资料
                  </Button>
                )}
              </div>

              {user.bio && (
                <p className="text-purple-100 mb-4 max-w-2xl">{user.bio}</p>
              )}

              {/* Wallet Address */}
              {user.wallet_address && (
                <div className="flex items-center justify-center md:justify-start space-x-2 mb-4">
                  <code className="px-3 py-1 bg-white bg-opacity-20 rounded-full text-sm">
                    {formatAddress(user.wallet_address)}
                  </code>
                  <button
                    onClick={handleCopyAddress}
                    className="p-1 hover:bg-white hover:bg-opacity-20 rounded transition-colors"
                  >
                    {copied ? (
                      <CheckCircle className="w-4 h-4 text-green-300" />
                    ) : (
                      <Copy className="w-4 h-4" />
                    )}
                  </button>
                  <a
                    href={`https://etherscan.io/address/${user.wallet_address}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="p-1 hover:bg-white hover:bg-opacity-20 rounded transition-colors"
                  >
                    <ExternalLink className="w-4 h-4" />
                  </a>
                </div>
              )}

              {/* Social Links */}
              <div className="flex items-center justify-center md:justify-start space-x-4">
                {user.website && (
                  <a
                    href={user.website}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-purple-100 hover:text-white transition-colors"
                  >
                    网站
                  </a>
                )}
                {user.twitter && (
                  <a
                    href={`https://twitter.com/${user.twitter}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-purple-100 hover:text-white transition-colors"
                  >
                    Twitter
                  </a>
                )}
                {user.instagram && (
                  <a
                    href={`https://instagram.com/${user.instagram}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-purple-100 hover:text-white transition-colors"
                  >
                    Instagram
                  </a>
                )}
              </div>
            </div>

            {/* Stats */}
            <div className="grid grid-cols-2 md:grid-cols-1 gap-4 text-center">
              <div>
                <div className="text-2xl font-bold">{stats.created}</div>
                <div className="text-purple-100 text-sm">已创建</div>
              </div>
              <div>
                <div className="text-2xl font-bold">{stats.collected}</div>
                <div className="text-purple-100 text-sm">已收藏</div>
              </div>
              <div>
                <div className="text-2xl font-bold">{stats.volume.toFixed(2)}</div>
                <div className="text-purple-100 text-sm">交易量 (ETH)</div>
              </div>
              <div>
                <div className="text-2xl font-bold">{stats.liked}</div>
                <div className="text-purple-100 text-sm">获赞数</div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="bg-white border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between">
            <div className="flex space-x-8">
              {[
                { key: 'created', label: '已创建', count: stats.created },
                { key: 'collected', label: '已收藏', count: stats.collected },
                { key: 'liked', label: '已点赞', count: stats.liked },
                { key: 'activity', label: '活动记录' }
              ].map((tab) => (
                <button
                  key={tab.key}
                  onClick={() => setActiveTab(tab.key)}
                  className={`py-4 px-2 border-b-2 font-medium text-sm ${
                    activeTab === tab.key
                      ? 'border-purple-500 text-purple-600'
                      : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                  }`}
                >
                  {tab.label}
                  {tab.count !== undefined && (
                    <span className="ml-2 bg-gray-100 text-gray-600 py-0.5 px-2 rounded-full text-xs">
                      {tab.count}
                    </span>
                  )}
                </button>
              ))}
              {isOwnProfile && (
                <button
                  onClick={() => setActiveTab('settings')}
                  className={`py-4 px-2 border-b-2 font-medium text-sm ${
                    activeTab === 'settings'
                      ? 'border-purple-500 text-purple-600'
                      : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                  }`}
                >
                  <Settings className="w-4 h-4 inline mr-1" />
                  设置
                </button>
              )}
            </div>

            {/* View Mode Toggle */}
            {['created', 'collected', 'liked'].includes(activeTab) && (
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
            )}
          </div>
        </div>
      </div>

      {/* Tab Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {['created', 'collected', 'liked'].includes(activeTab) && (
          <div className={viewMode === 'grid' 
            ? 'grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6'
            : 'space-y-4'
          }>
            {nfts.length > 0 ? (
              nfts.map(renderNFTCard)
            ) : (
              <div className="col-span-full text-center py-12 text-gray-500">
                <p>暂无内容</p>
              </div>
            )}
          </div>
        )}

        {activeTab === 'activity' && (
          <div className="space-y-4">
            {activities.length > 0 ? (
              activities.map(renderActivityItem)
            ) : (
              <div className="text-center py-12 text-gray-500">
                <p>暂无活动记录</p>
              </div>
            )}
          </div>
        )}

        {activeTab === 'settings' && isOwnProfile && (
          <div className="max-w-2xl">
            <div className="bg-white rounded-lg shadow p-6">
              <h2 className="text-xl font-semibold mb-6">编辑资料</h2>
              <form onSubmit={handleEditSubmit} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    用户名
                  </label>
                  <input
                    type="text"
                    value={editForm.username}
                    onChange={(e) => setEditForm(prev => ({ ...prev, username: e.target.value }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    个人简介
                  </label>
                  <textarea
                    value={editForm.bio}
                    onChange={(e) => setEditForm(prev => ({ ...prev, bio: e.target.value }))}
                    rows={3}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    网站
                  </label>
                  <input
                    type="url"
                    value={editForm.website}
                    onChange={(e) => setEditForm(prev => ({ ...prev, website: e.target.value }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                  />
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Twitter
                    </label>
                    <input
                      type="text"
                      value={editForm.twitter}
                      onChange={(e) => setEditForm(prev => ({ ...prev, twitter: e.target.value }))}
                      placeholder="username"
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                    />
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Instagram
                    </label>
                    <input
                      type="text"
                      value={editForm.instagram}
                      onChange={(e) => setEditForm(prev => ({ ...prev, instagram: e.target.value }))}
                      placeholder="username"
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                    />
                  </div>
                </div>
                
                <div className="flex space-x-4">
                  <Button type="submit" className="bg-purple-600 hover:bg-purple-700">
                    保存更改
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => setIsEditing(false)}
                  >
                    取消
                  </Button>
                </div>
              </form>
            </div>
          </div>
        )}
      </div>

      {/* Edit Modal */}
      {isEditing && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg max-w-md w-full p-6">
            <h3 className="text-lg font-semibold mb-4">编辑资料</h3>
            <form onSubmit={handleEditSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  用户名
                </label>
                <input
                  type="text"
                  value={editForm.username}
                  onChange={(e) => setEditForm(prev => ({ ...prev, username: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  个人简介
                </label>
                <textarea
                  value={editForm.bio}
                  onChange={(e) => setEditForm(prev => ({ ...prev, bio: e.target.value }))}
                  rows={3}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                />
              </div>
              
              <div className="flex space-x-4">
                <Button type="submit" className="bg-purple-600 hover:bg-purple-700">
                  保存
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setIsEditing(false)}
                >
                  取消
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}

export default ProfilePage

