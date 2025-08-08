import { useState, useEffect } from 'react'
import { useParams, Link } from 'react-router-dom'
import { 
  Heart, 
  Share2, 
  ExternalLink, 
  Eye, 
  Clock, 
  User, 
  Tag, 
  History, 
  AlertCircle,
  CheckCircle,
  Copy,
  Loader
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { useAuth } from '../contexts/AuthContext'
import { useWeb3 } from '../contexts/Web3Context'

const NFTDetailPage = () => {
  const { nftId } = useParams()
  const { user, isAuthenticated } = useAuth()
  const { account, isConnected } = useWeb3()
  
  const [nft, setNft] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [isLiked, setIsLiked] = useState(false)
  const [likeCount, setLikeCount] = useState(0)
  const [activeTab, setActiveTab] = useState('details') // details, history, offers
  const [copied, setCopied] = useState(false)
  const [buyLoading, setBuyLoading] = useState(false)
  const [makeOfferLoading, setMakeOfferLoading] = useState(false)
  const [offerAmount, setOfferAmount] = useState('')
  const [showOfferModal, setShowOfferModal] = useState(false)

  useEffect(() => {
    fetchNFTDetails()
  }, [nftId])

  useEffect(() => {
    if (nft && isAuthenticated) {
      checkLikeStatus()
    }
  }, [nft, isAuthenticated])

  const fetchNFTDetails = async () => {
    setLoading(true)
    setError(null)
    try {
      const response = await fetch(`/api/nft/items/${nftId}`)
      if (!response.ok) {
        throw new Error('NFT不存在')
      }
      const data = await response.json()
      setNft(data.nft_item)
      setLikeCount(data.nft_item.likes || 0)
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  const checkLikeStatus = async () => {
    try {
      const response = await fetch(`/api/nft/items/${nftId}/like-status`, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('auth_token')}`
        }
      })
      if (response.ok) {
        const data = await response.json()
        setIsLiked(data.is_liked)
      }
    } catch (error) {
      console.error('检查点赞状态失败:', error)
    }
  }

  const handleLike = async () => {
    if (!isAuthenticated) {
      alert('请先登录')
      return
    }

    try {
      const response = await fetch(`/api/nft/items/${nftId}/like`, {
        method: isLiked ? 'DELETE' : 'POST',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('auth_token')}`
        }
      })

      if (response.ok) {
        setIsLiked(!isLiked)
        setLikeCount(prev => isLiked ? prev - 1 : prev + 1)
      }
    } catch (error) {
      console.error('点赞操作失败:', error)
    }
  }

  const handleShare = async () => {
    try {
      await navigator.share({
        title: nft.name,
        text: nft.description,
        url: window.location.href
      })
    } catch (error) {
      // 如果不支持原生分享，复制链接
      try {
        await navigator.clipboard.writeText(window.location.href)
        setCopied(true)
        setTimeout(() => setCopied(false), 2000)
      } catch (clipboardError) {
        console.error('分享失败:', clipboardError)
      }
    }
  }

  const handleBuyNow = async () => {
    if (!isConnected) {
      alert('请先连接钱包')
      return
    }

    setBuyLoading(true)
    try {
      // 这里应该调用智能合约进行购买
      const response = await fetch(`/api/nft/items/${nftId}/buy`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('auth_token')}`
        },
        body: JSON.stringify({
          buyer_address: account,
          price: nft.current_price
        })
      })

      if (response.ok) {
        alert('购买成功！')
        fetchNFTDetails() // 刷新数据
      } else {
        throw new Error('购买失败')
      }
    } catch (error) {
      alert('购买失败: ' + error.message)
    } finally {
      setBuyLoading(false)
    }
  }

  const handleMakeOffer = async () => {
    if (!isConnected) {
      alert('请先连接钱包')
      return
    }

    if (!offerAmount || parseFloat(offerAmount) <= 0) {
      alert('请输入有效的出价金额')
      return
    }

    setMakeOfferLoading(true)
    try {
      const response = await fetch(`/api/nft/items/${nftId}/offers`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('auth_token')}`
        },
        body: JSON.stringify({
          bidder_address: account,
          amount: parseFloat(offerAmount)
        })
      })

      if (response.ok) {
        alert('出价成功！')
        setShowOfferModal(false)
        setOfferAmount('')
      } else {
        throw new Error('出价失败')
      }
    } catch (error) {
      alert('出价失败: ' + error.message)
    } finally {
      setMakeOfferLoading(false)
    }
  }

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

  if (!nft) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <AlertCircle className="w-16 h-16 text-gray-400 mx-auto mb-4" />
          <h2 className="text-2xl font-bold text-gray-900 mb-2">NFT不存在</h2>
          <p className="text-gray-600">找不到指定的NFT</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Left Column - Image/Media */}
          <div className="space-y-4">
            <div className="bg-white rounded-xl overflow-hidden shadow-lg">
              <div className="aspect-square bg-gray-100">
                {nft.image_url ? (
                  <img
                    src={nft.image_url}
                    alt={nft.name}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-gray-400">
                    <span>暂无图片</span>
                  </div>
                )}
              </div>
            </div>

            {/* Properties */}
            {nft.attributes && nft.attributes.length > 0 && (
              <div className="bg-white rounded-xl p-6 shadow-lg">
                <h3 className="text-lg font-semibold mb-4">属性</h3>
                <div className="grid grid-cols-2 gap-4">
                  {nft.attributes.map((attr, index) => (
                    <div key={index} className="bg-gray-50 rounded-lg p-3 text-center">
                      <div className="text-sm text-gray-600">{attr.trait_type}</div>
                      <div className="font-medium">{attr.value}</div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Right Column - Details */}
          <div className="space-y-6">
            {/* Basic Info */}
            <div className="bg-white rounded-xl p-6 shadow-lg">
              <div className="flex items-center justify-between mb-4">
                <Link
                  to={`/collection/${nft.collection?.id}`}
                  className="text-purple-600 hover:text-purple-700 font-medium"
                >
                  {nft.collection?.name || '未分类'}
                </Link>
                <div className="flex items-center space-x-2">
                  <button
                    onClick={handleLike}
                    className={`p-2 rounded-full transition-colors ${
                      isLiked ? 'bg-red-100 text-red-600' : 'bg-gray-100 text-gray-600 hover:bg-red-100 hover:text-red-600'
                    }`}
                  >
                    <Heart className={`w-5 h-5 ${isLiked ? 'fill-current' : ''}`} />
                  </button>
                  <span className="text-sm text-gray-600">{likeCount}</span>
                  <button
                    onClick={handleShare}
                    className="p-2 rounded-full bg-gray-100 text-gray-600 hover:bg-blue-100 hover:text-blue-600 transition-colors"
                  >
                    {copied ? (
                      <CheckCircle className="w-5 h-5 text-green-600" />
                    ) : (
                      <Share2 className="w-5 h-5" />
                    )}
                  </button>
                </div>
              </div>

              <h1 className="text-3xl font-bold text-gray-900 mb-4">{nft.name}</h1>
              
              <div className="flex items-center space-x-4 mb-6">
                <div className="flex items-center space-x-2">
                  <Eye className="w-4 h-4 text-gray-500" />
                  <span className="text-sm text-gray-600">{nft.views || 0} 次浏览</span>
                </div>
                <div className="flex items-center space-x-2">
                  <Heart className="w-4 h-4 text-gray-500" />
                  <span className="text-sm text-gray-600">{likeCount} 次点赞</span>
                </div>
              </div>

              {/* Owner Info */}
              <div className="flex items-center justify-between mb-6">
                <div>
                  <div className="text-sm text-gray-600">拥有者</div>
                  <Link
                    to={`/profile/${nft.owner?.id}`}
                    className="flex items-center space-x-2 text-purple-600 hover:text-purple-700"
                  >
                    <User className="w-4 h-4" />
                    <span className="font-medium">{nft.owner?.username || '未知'}</span>
                  </Link>
                </div>
                <div>
                  <div className="text-sm text-gray-600">创作者</div>
                  <Link
                    to={`/profile/${nft.creator?.id}`}
                    className="flex items-center space-x-2 text-purple-600 hover:text-purple-700"
                  >
                    <User className="w-4 h-4" />
                    <span className="font-medium">{nft.creator?.username || '未知'}</span>
                  </Link>
                </div>
              </div>

              {/* Price and Actions */}
              {nft.current_price && (
                <div className="border-t pt-6">
                  <div className="mb-4">
                    <div className="text-sm text-gray-600">当前价格</div>
                    <div className="text-3xl font-bold text-gray-900">{nft.current_price} ETH</div>
                  </div>

                  <div className="flex space-x-4">
                    <Button
                      onClick={handleBuyNow}
                      disabled={buyLoading || !isConnected}
                      className="flex-1 bg-purple-600 hover:bg-purple-700"
                    >
                      {buyLoading ? (
                        <>
                          <Loader className="w-4 h-4 mr-2 animate-spin" />
                          购买中...
                        </>
                      ) : (
                        '立即购买'
                      )}
                    </Button>
                    <Button
                      variant="outline"
                      onClick={() => setShowOfferModal(true)}
                      disabled={!isConnected}
                      className="flex-1"
                    >
                      出价
                    </Button>
                  </div>
                </div>
              )}
            </div>

            {/* Description */}
            <div className="bg-white rounded-xl p-6 shadow-lg">
              <h3 className="text-lg font-semibold mb-4">描述</h3>
              <p className="text-gray-700 leading-relaxed">{nft.description}</p>
            </div>

            {/* Artifact Info */}
            {nft.artifact_info && (
              <div className="bg-white rounded-xl p-6 shadow-lg">
                <h3 className="text-lg font-semibold mb-4">文物信息</h3>
                <div className="space-y-3">
                  {nft.artifact_info.artifact_name && (
                    <div>
                      <span className="text-sm text-gray-600">文物名称：</span>
                      <span className="font-medium">{nft.artifact_info.artifact_name}</span>
                    </div>
                  )}
                  {nft.artifact_info.historical_period && (
                    <div>
                      <span className="text-sm text-gray-600">历史时期：</span>
                      <span className="font-medium">{nft.artifact_info.historical_period}</span>
                    </div>
                  )}
                  {nft.artifact_info.origin_location && (
                    <div>
                      <span className="text-sm text-gray-600">产地：</span>
                      <span className="font-medium">{nft.artifact_info.origin_location}</span>
                    </div>
                  )}
                  {nft.artifact_info.material && (
                    <div>
                      <span className="text-sm text-gray-600">材质：</span>
                      <span className="font-medium">{nft.artifact_info.material}</span>
                    </div>
                  )}
                  {nft.artifact_info.cultural_significance && (
                    <div>
                      <span className="text-sm text-gray-600">文化意义：</span>
                      <p className="text-gray-700 mt-1">{nft.artifact_info.cultural_significance}</p>
                    </div>
                  )}
                  {nft.artifact_info.historical_story && (
                    <div>
                      <span className="text-sm text-gray-600">历史故事：</span>
                      <p className="text-gray-700 mt-1">{nft.artifact_info.historical_story}</p>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Tabs */}
            <div className="bg-white rounded-xl shadow-lg">
              <div className="border-b">
                <div className="flex space-x-8 px-6">
                  {[
                    { key: 'details', label: '详情' },
                    { key: 'history', label: '交易历史' },
                    { key: 'offers', label: '出价记录' }
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
                    </button>
                  ))}
                </div>
              </div>

              <div className="p-6">
                {activeTab === 'details' && (
                  <div className="space-y-4">
                    <div className="grid grid-cols-2 gap-4 text-sm">
                      <div>
                        <span className="text-gray-600">合约地址：</span>
                        <div className="font-mono text-xs">{nft.contract_address || '未铸造'}</div>
                      </div>
                      <div>
                        <span className="text-gray-600">Token ID：</span>
                        <div className="font-mono">{nft.token_id || '未铸造'}</div>
                      </div>
                      <div>
                        <span className="text-gray-600">区块链：</span>
                        <div>{nft.blockchain || 'Ethereum'}</div>
                      </div>
                      <div>
                        <span className="text-gray-600">创建时间：</span>
                        <div>{new Date(nft.created_at).toLocaleDateString()}</div>
                      </div>
                    </div>
                  </div>
                )}

                {activeTab === 'history' && (
                  <div className="space-y-4">
                    <p className="text-gray-600">暂无交易历史</p>
                  </div>
                )}

                {activeTab === 'offers' && (
                  <div className="space-y-4">
                    <p className="text-gray-600">暂无出价记录</p>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Make Offer Modal */}
      {showOfferModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg max-w-md w-full p-6">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-xl font-semibold">出价</h2>
              <button
                onClick={() => setShowOfferModal(false)}
                className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  出价金额 (ETH)
                </label>
                <input
                  type="number"
                  step="0.001"
                  min="0"
                  value={offerAmount}
                  onChange={(e) => setOfferAmount(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                  placeholder="0.000"
                />
              </div>

              <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
                <div className="flex items-start space-x-2">
                  <AlertCircle className="w-5 h-5 text-yellow-600 mt-0.5" />
                  <div>
                    <h4 className="font-medium text-yellow-800">注意事项</h4>
                    <ul className="text-sm text-yellow-700 mt-1 space-y-1">
                      <li>• 出价需要锁定相应的ETH</li>
                      <li>• 出价有效期为7天</li>
                      <li>• 卖家可以随时接受您的出价</li>
                    </ul>
                  </div>
                </div>
              </div>

              <div className="flex space-x-4">
                <Button
                  onClick={handleMakeOffer}
                  disabled={makeOfferLoading || !offerAmount}
                  className="flex-1 bg-purple-600 hover:bg-purple-700"
                >
                  {makeOfferLoading ? (
                    <>
                      <Loader className="w-4 h-4 mr-2 animate-spin" />
                      出价中...
                    </>
                  ) : (
                    '确认出价'
                  )}
                </Button>
                <Button
                  variant="outline"
                  onClick={() => setShowOfferModal(false)}
                  className="flex-1"
                >
                  取消
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default NFTDetailPage

