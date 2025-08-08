import { useState, useEffect, useRef } from 'react'
import { Link } from 'react-router-dom'
import { 
  Museum as MuseumIcon, 
  Plus, 
  Edit, 
  Eye, 
  Share2, 
  Settings, 
  Layout, 
  Palette, 
  X, 
  AlertCircle,
  CheckCircle,
  Loader,
  Play,
  VolumeX,
  Volume2,
  Maximize
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { useAuth } from '../contexts/AuthContext'
import VirtualMuseum3D from '../components/VirtualMuseum3D'

const MuseumPage = () => {
  const { user, isAuthenticated } = useAuth()
  const [museums, setMuseums] = useState([])
  const [selectedMuseum, setSelectedMuseum] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [isCreating, setIsCreating] = useState(false)
  const [newMuseumName, setNewMuseumName] = useState('')
  const [newMuseumDescription, setNewMuseumDescription] = useState('')
  const [isEditing, setIsEditing] = useState(false)
  const [editMuseumData, setEditMuseumData] = useState(null)
  const [museumNFTs, setMuseumNFTs] = useState([])
  const [is3DMode, setIs3DMode] = useState(false)
  const [isVRMode, setIsVRMode] = useState(false)

  useEffect(() => {
    if (isAuthenticated) {
      fetchMuseums()
    } else {
      setLoading(false)
      setError('请登录以查看您的虚拟博物馆。')
    }
  }, [isAuthenticated])

  useEffect(() => {
    if (selectedMuseum) {
      fetchMuseumNFTs(selectedMuseum.id)
    }
  }, [selectedMuseum])

  const fetchMuseums = async () => {
    setLoading(true)
    setError(null)
    try {
      const response = await fetch(`/api/museums?owner_id=${user.id}`, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('auth_token')}`
        }
      })
      if (!response.ok) {
        throw new Error('获取博物馆列表失败')
      }
      const data = await response.json()
      setMuseums(data.museums)
      if (data.museums.length > 0) {
        setSelectedMuseum(data.museums[0]) // 默认选中第一个博物馆
      }
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  const fetchMuseumNFTs = async (museumId) => {
    try {
      const response = await fetch(`/api/museums/${museumId}/nfts`, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('auth_token')}`
        }
      })
      if (response.ok) {
        const data = await response.json()
        setMuseumNFTs(data.nfts || [])
      }
    } catch (error) {
      console.error('获取博物馆NFT失败:', error)
    }
  }

  const handleCreateMuseum = async (e) => {
    e.preventDefault()
    setLoading(true)
    setError(null)
    try {
      const response = await fetch('/api/museums', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('auth_token')}`
        },
        body: JSON.stringify({
          name: newMuseumName,
          description: newMuseumDescription,
          owner_id: user.id
        })
      })
      if (!response.ok) {
        throw new Error('创建博物馆失败')
      }
      await response.json()
      setIsCreating(false)
      setNewMuseumName('')
      setNewMuseumDescription('')
      fetchMuseums() // 刷新列表
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  const handleEditMuseum = async (e) => {
    e.preventDefault()
    setLoading(true)
    setError(null)
    try {
      const response = await fetch(`/api/museums/${editMuseumData.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('auth_token')}`
        },
        body: JSON.stringify(editMuseumData)
      })
      if (!response.ok) {
        throw new Error('更新博物馆信息失败')
      }
      await response.json()
      setIsEditing(false)
      setEditMuseumData(null)
      fetchMuseums() // 刷新列表
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  const handleNFTClick = (nft) => {
    // 处理3D场景中NFT点击事件
    console.log('NFT clicked:', nft)
    // 可以打开NFT详情模态框或跳转到详情页
  }

  const enterVRMode = () => {
    if ('xr' in navigator) {
      navigator.xr.isSessionSupported('immersive-vr').then((supported) => {
        if (supported) {
          setIsVRMode(true)
          // 在实际应用中，这里会启动WebXR会话
          alert('VR模式启动中...')
        } else {
          alert('您的设备不支持VR模式')
        }
      })
    } else {
      alert('您的浏览器不支持WebXR')
    }
  }

  const renderMuseumCard = (museum) => (
    <div key={museum.id} className="bg-white rounded-lg shadow-md p-6 flex flex-col items-center text-center">
      <MuseumIcon className="w-16 h-16 text-purple-600 mb-4" />
      <h3 className="text-xl font-semibold mb-2">{museum.name}</h3>
      <p className="text-gray-600 text-sm mb-4 line-clamp-3">{museum.description}</p>
      <div className="flex space-x-2">
        <Button variant="outline" size="sm" onClick={() => setSelectedMuseum(museum)}>
          <Eye className="w-4 h-4 mr-2" />
          查看
        </Button>
        <Button variant="outline" size="sm" onClick={() => { setIsEditing(true); setEditMuseumData(museum) }}>
          <Edit className="w-4 h-4 mr-2" />
          编辑
        </Button>
      </div>
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

  return (
    <div className="min-h-screen bg-gray-50 py-12">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="flex justify-between items-center mb-8">
          <h1 className="text-3xl font-bold text-gray-900">我的虚拟博物馆</h1>
          <Button onClick={() => setIsCreating(true)} className="bg-purple-600 hover:bg-purple-700">
            <Plus className="w-5 h-5 mr-2" />
            创建新博物馆
          </Button>
        </div>

        {/* Museum List */}
        {museums.length === 0 && !isCreating ? (
          <div className="bg-white rounded-lg shadow-lg p-8 text-center">
            <MuseumIcon className="w-20 h-20 text-gray-400 mx-auto mb-6" />
            <h2 className="text-2xl font-semibold mb-4">您还没有创建任何博物馆</h2>
            <p className="text-gray-600 mb-6">立即创建您的第一个虚拟博物馆，展示您的数字文物！</p>
            <Button onClick={() => setIsCreating(true)} className="bg-purple-600 hover:bg-purple-700">
              <Plus className="w-5 h-5 mr-2" />
              创建新博物馆
            </Button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-12">
            {museums.map(renderMuseumCard)}
          </div>
        )}

        {/* Selected Museum Details */}
        {selectedMuseum && (
          <div className="bg-white rounded-lg shadow-lg overflow-hidden">
            {/* Museum Header */}
            <div className="bg-gradient-to-r from-purple-600 to-blue-600 text-white p-6">
              <div className="flex justify-between items-center">
                <div>
                  <h2 className="text-2xl font-bold mb-2">{selectedMuseum.name}</h2>
                  <p className="text-purple-100">{selectedMuseum.description}</p>
                </div>
                <div className="flex space-x-2">
                  <Button variant="outline" className="border-white text-white hover:bg-white hover:text-purple-600">
                    <Share2 className="w-4 h-4 mr-2" />
                    分享
                  </Button>
                  <Button variant="outline" className="border-white text-white hover:bg-white hover:text-purple-600">
                    <Settings className="w-4 h-4 mr-2" />
                    设置
                  </Button>
                </div>
              </div>
            </div>

            {/* View Mode Toggle */}
            <div className="border-b bg-gray-50 px-6 py-4">
              <div className="flex items-center justify-between">
                <div className="flex space-x-4">
                  <Button
                    variant={!is3DMode ? 'default' : 'outline'}
                    onClick={() => setIs3DMode(false)}
                    className={!is3DMode ? 'bg-purple-600 text-white' : ''}
                  >
                    <Layout className="w-4 h-4 mr-2" />
                    2D视图
                  </Button>
                  <Button
                    variant={is3DMode ? 'default' : 'outline'}
                    onClick={() => setIs3DMode(true)}
                    className={is3DMode ? 'bg-purple-600 text-white' : ''}
                  >
                    <Eye className="w-4 h-4 mr-2" />
                    3D漫游
                  </Button>
                </div>

                <div className="flex space-x-2">
                  <Button variant="outline" onClick={enterVRMode}>
                    <Maximize className="w-4 h-4 mr-2" />
                    VR模式
                  </Button>
                  <Button variant="outline">
                    <Palette className="w-4 h-4 mr-2" />
                    装饰
                  </Button>
                </div>
              </div>
            </div>

            {/* Museum Content */}
            <div className="p-6">
              {is3DMode ? (
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <h3 className="text-xl font-semibold">3D虚拟博物馆</h3>
                    <div className="flex items-center space-x-2 text-sm text-gray-600">
                      <span>使用WASD移动，方向键转向，点击NFT查看详情</span>
                    </div>
                  </div>
                  
                  <VirtualMuseum3D
                    museumId={selectedMuseum.id}
                    nfts={museumNFTs}
                    onNFTClick={handleNFTClick}
                  />
                  
                  <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                    <div className="flex items-start space-x-2">
                      <Eye className="w-5 h-5 text-blue-600 mt-0.5" />
                      <div>
                        <h4 className="font-medium text-blue-900">3D虚拟体验</h4>
                        <p className="text-sm text-blue-700 mt-1">
                          在3D环境中漫游您的博物馆，近距离欣赏每一件数字文物。支持VR设备获得更沉浸的体验。
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="space-y-6">
                  <h3 className="text-xl font-semibold">博物馆藏品</h3>
                  
                  {museumNFTs.length > 0 ? (
                    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
                      {museumNFTs.map((nft) => (
                        <div key={nft.id} className="bg-white rounded-lg shadow-md overflow-hidden hover:shadow-lg transition-shadow">
                          <img
                            src={nft.image_url || '/api/placeholder/200/200'}
                            alt={nft.name}
                            className="w-full h-48 object-cover"
                          />
                          <div className="p-4">
                            <h4 className="font-semibold mb-2">{nft.name}</h4>
                            <p className="text-sm text-gray-600 mb-3 line-clamp-2">{nft.description}</p>
                            <Link to={`/nft/${nft.id}`}>
                              <Button size="sm" className="w-full">
                                查看详情
                              </Button>
                            </Link>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="text-center py-12 bg-gray-50 rounded-lg">
                      <MuseumIcon className="w-16 h-16 text-gray-400 mx-auto mb-4" />
                      <h4 className="text-lg font-medium text-gray-900 mb-2">暂无藏品</h4>
                      <p className="text-gray-600 mb-4">开始添加您的NFT到这个博物馆</p>
                      <Link to="/create">
                        <Button>
                          <Plus className="w-4 h-4 mr-2" />
                          创建NFT
                        </Button>
                      </Link>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Create Museum Modal */}
      {isCreating && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg max-w-md w-full p-6">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-xl font-semibold">创建新博物馆</h2>
              <Button variant="ghost" size="icon" onClick={() => setIsCreating(false)}>
                <X className="w-5 h-5" />
              </Button>
            </div>
            <form onSubmit={handleCreateMuseum} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">博物馆名称</label>
                <input
                  type="text"
                  value={newMuseumName}
                  onChange={(e) => setNewMuseumName(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">描述</label>
                <textarea
                  value={newMuseumDescription}
                  onChange={(e) => setNewMuseumDescription(e.target.value)}
                  rows={3}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                />
              </div>
              <Button type="submit" className="w-full bg-purple-600 hover:bg-purple-700" disabled={loading}>
                {loading ? <Loader className="w-4 h-4 mr-2 animate-spin" /> : null}
                创建
              </Button>
            </form>
          </div>
        </div>
      )}

      {/* Edit Museum Modal */}
      {isEditing && editMuseumData && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg max-w-md w-full p-6">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-xl font-semibold">编辑博物馆</h2>
              <Button variant="ghost" size="icon" onClick={() => setIsEditing(false)}>
                <X className="w-5 h-5" />
              </Button>
            </div>
            <form onSubmit={handleEditMuseum} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">博物馆名称</label>
                <input
                  type="text"
                  value={editMuseumData.name}
                  onChange={(e) => setEditMuseumData(prev => ({ ...prev, name: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">描述</label>
                <textarea
                  value={editMuseumData.description}
                  onChange={(e) => setEditMuseumData(prev => ({ ...prev, description: e.target.value }))}
                  rows={3}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                />
              </div>
              <Button type="submit" className="w-full bg-purple-600 hover:bg-purple-700" disabled={loading}>
                {loading ? <Loader className="w-4 h-4 mr-2 animate-spin" /> : null}
                保存更改
              </Button>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}

export default MuseumPage

