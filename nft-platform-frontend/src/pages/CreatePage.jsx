import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { 
  Upload, 
  Image, 
  Video, 
  FileText, 
  Plus, 
  X, 
  AlertCircle,
  CheckCircle,
  Loader
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { useAuth } from '../contexts/AuthContext'
import { useWeb3 } from '../contexts/Web3Context'

const CreatePage = () => {
  const navigate = useNavigate()
  const { user, isAuthenticated } = useAuth()
  const { account, isConnected } = useWeb3()
  
  const [step, setStep] = useState(1) // 1: 上传文件, 2: 填写信息, 3: 确认创建
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  
  // 文件上传相关
  const [file, setFile] = useState(null)
  const [filePreview, setFilePreview] = useState('')
  const [uploadProgress, setUploadProgress] = useState(0)
  
  // NFT信息
  const [nftData, setNftData] = useState({
    name: '',
    description: '',
    collection_id: '',
    image_url: '',
    animation_url: '',
    model_3d_url: '',
    attributes: [],
    artifact_info: {
      artifact_name: '',
      origin_location: '',
      historical_period: '',
      cultural_significance: '',
      historical_story: '',
      material: '',
      dimensions: '',
      weight: '',
      discovery_location: '',
      current_location: '',
      conservation_status: ''
    }
  })
  
  // 属性管理
  const [newAttribute, setNewAttribute] = useState({
    trait_type: '',
    value: '',
    display_type: '',
    max_value: ''
  })
  
  // 集合列表
  const [collections, setCollections] = useState([])

  useEffect(() => {
    if (!isAuthenticated) {
      navigate('/')
      return
    }
    fetchCollections()
  }, [isAuthenticated, navigate])

  const fetchCollections = async () => {
    try {
      const response = await fetch(`/api/nft/collections?creator_id=${user.id}`, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('auth_token')}`
        }
      })
      if (response.ok) {
        const data = await response.json()
        setCollections(data.collections)
      }
    } catch (error) {
      console.error('获取集合失败:', error)
    }
  }

  const handleFileSelect = (e) => {
    const selectedFile = e.target.files[0]
    if (!selectedFile) return

    // 验证文件类型
    const allowedTypes = ['image/jpeg', 'image/png', 'image/gif', 'video/mp4', 'video/mov']
    if (!allowedTypes.includes(selectedFile.type)) {
      setError('不支持的文件类型。请选择图片或视频文件。')
      return
    }

    // 验证文件大小 (50MB)
    if (selectedFile.size > 50 * 1024 * 1024) {
      setError('文件大小不能超过50MB')
      return
    }

    setFile(selectedFile)
    setError('')

    // 创建预览
    const reader = new FileReader()
    reader.onload = (e) => {
      setFilePreview(e.target.result)
    }
    reader.readAsDataURL(selectedFile)
  }

  const uploadFile = async () => {
    if (!file) return null

    const formData = new FormData()
    formData.append('file', file)

    try {
      const response = await fetch('/api/nft/upload', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('auth_token')}`
        },
        body: formData
      })

      if (!response.ok) {
        throw new Error('文件上传失败')
      }

      const data = await response.json()
      return data.file_info.ipfs_url
    } catch (error) {
      throw new Error('文件上传失败: ' + error.message)
    }
  }

  const handleInputChange = (e) => {
    const { name, value } = e.target
    if (name.startsWith('artifact_')) {
      const fieldName = name.replace('artifact_', '')
      setNftData(prev => ({
        ...prev,
        artifact_info: {
          ...prev.artifact_info,
          [fieldName]: value
        }
      }))
    } else {
      setNftData(prev => ({
        ...prev,
        [name]: value
      }))
    }
  }

  const addAttribute = () => {
    if (!newAttribute.trait_type || !newAttribute.value) {
      setError('请填写属性名称和值')
      return
    }

    setNftData(prev => ({
      ...prev,
      attributes: [...prev.attributes, { ...newAttribute }]
    }))

    setNewAttribute({
      trait_type: '',
      value: '',
      display_type: '',
      max_value: ''
    })
    setError('')
  }

  const removeAttribute = (index) => {
    setNftData(prev => ({
      ...prev,
      attributes: prev.attributes.filter((_, i) => i !== index)
    }))
  }

  const handleNext = async () => {
    if (step === 1) {
      if (!file) {
        setError('请选择要上传的文件')
        return
      }
      setStep(2)
    } else if (step === 2) {
      if (!nftData.name || !nftData.description) {
        setError('请填写NFT名称和描述')
        return
      }
      if (!nftData.collection_id) {
        setError('请选择一个集合')
        return
      }
      setStep(3)
    }
    setError('')
  }

  const handleBack = () => {
    if (step > 1) {
      setStep(step - 1)
      setError('')
    }
  }

  const handleCreate = async () => {
    setLoading(true)
    setError('')

    try {
      // 1. 上传文件到IPFS
      const imageUrl = await uploadFile()
      
      // 2. 创建NFT
      const createData = {
        ...nftData,
        image_url: imageUrl,
        artifact_info: nftData.artifact_info.artifact_name ? nftData.artifact_info : null
      }

      const response = await fetch('/api/nft/items', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('auth_token')}`
        },
        body: JSON.stringify(createData)
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'NFT创建失败')
      }

      const data = await response.json()
      setSuccess('NFT创建成功！')
      
      // 跳转到NFT详情页
      setTimeout(() => {
        navigate(`/nft/${data.nft_item.id}`)
      }, 2000)

    } catch (error) {
      setError(error.message)
    } finally {
      setLoading(false)
    }
  }

  if (!isAuthenticated) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <AlertCircle className="w-16 h-16 text-red-500 mx-auto mb-4" />
          <h2 className="text-2xl font-bold text-gray-900 mb-2">需要登录</h2>
          <p className="text-gray-600 mb-4">请先登录以创建NFT</p>
          <Button onClick={() => navigate('/')}>返回首页</Button>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50 py-12">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-4">创建数字文物NFT</h1>
          <p className="text-lg text-gray-600">将您的珍贵文物数字化，永久保存在区块链上</p>
        </div>

        {/* Progress Steps */}
        <div className="flex items-center justify-center mb-8">
          <div className="flex items-center space-x-4">
            {[1, 2, 3].map((stepNumber) => (
              <div key={stepNumber} className="flex items-center">
                <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium ${
                  step >= stepNumber 
                    ? 'bg-purple-600 text-white' 
                    : 'bg-gray-200 text-gray-600'
                }`}>
                  {stepNumber}
                </div>
                {stepNumber < 3 && (
                  <div className={`w-16 h-1 mx-2 ${
                    step > stepNumber ? 'bg-purple-600' : 'bg-gray-200'
                  }`} />
                )}
              </div>
            ))}
          </div>
        </div>

        {/* Step Labels */}
        <div className="flex justify-center mb-8">
          <div className="flex space-x-16 text-sm">
            <span className={step >= 1 ? 'text-purple-600 font-medium' : 'text-gray-500'}>
              上传文件
            </span>
            <span className={step >= 2 ? 'text-purple-600 font-medium' : 'text-gray-500'}>
              填写信息
            </span>
            <span className={step >= 3 ? 'text-purple-600 font-medium' : 'text-gray-500'}>
              确认创建
            </span>
          </div>
        </div>

        {/* Error/Success Messages */}
        {error && (
          <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg flex items-center space-x-2">
            <AlertCircle className="w-5 h-5 text-red-500" />
            <span className="text-red-600">{error}</span>
          </div>
        )}

        {success && (
          <div className="mb-6 p-4 bg-green-50 border border-green-200 rounded-lg flex items-center space-x-2">
            <CheckCircle className="w-5 h-5 text-green-500" />
            <span className="text-green-600">{success}</span>
          </div>
        )}

        {/* Step Content */}
        <div className="bg-white rounded-lg shadow-lg p-8">
          {step === 1 && (
            <div>
              <h2 className="text-xl font-semibold mb-6">上传文物文件</h2>
              
              {!file ? (
                <div className="border-2 border-dashed border-gray-300 rounded-lg p-12 text-center hover:border-purple-500 transition-colors">
                  <input
                    type="file"
                    id="file-upload"
                    className="hidden"
                    accept="image/*,video/*"
                    onChange={handleFileSelect}
                  />
                  <label htmlFor="file-upload" className="cursor-pointer">
                    <Upload className="w-16 h-16 text-gray-400 mx-auto mb-4" />
                    <h3 className="text-lg font-medium text-gray-900 mb-2">
                      选择文件上传
                    </h3>
                    <p className="text-gray-600 mb-4">
                      支持 JPG, PNG, GIF, MP4, MOV 格式，最大50MB
                    </p>
                    <Button className="bg-purple-600 hover:bg-purple-700">
                      选择文件
                    </Button>
                  </label>
                </div>
              ) : (
                <div className="space-y-4">
                  <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                    <div className="flex items-center space-x-3">
                      {file.type.startsWith('image/') ? (
                        <Image className="w-8 h-8 text-purple-600" />
                      ) : (
                        <Video className="w-8 h-8 text-purple-600" />
                      )}
                      <div>
                        <p className="font-medium">{file.name}</p>
                        <p className="text-sm text-gray-600">
                          {(file.size / 1024 / 1024).toFixed(2)} MB
                        </p>
                      </div>
                    </div>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        setFile(null)
                        setFilePreview('')
                      }}
                    >
                      <X className="w-4 h-4" />
                    </Button>
                  </div>
                  
                  {filePreview && (
                    <div className="mt-4">
                      {file.type.startsWith('image/') ? (
                        <img
                          src={filePreview}
                          alt="预览"
                          className="max-w-full h-64 object-contain mx-auto rounded-lg"
                        />
                      ) : (
                        <video
                          src={filePreview}
                          controls
                          className="max-w-full h-64 mx-auto rounded-lg"
                        />
                      )}
                    </div>
                  )}
                </div>
              )}
            </div>
          )}

          {step === 2 && (
            <div>
              <h2 className="text-xl font-semibold mb-6">填写NFT信息</h2>
              
              <div className="space-y-6">
                {/* 基本信息 */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      NFT名称 *
                    </label>
                    <input
                      type="text"
                      name="name"
                      value={nftData.name}
                      onChange={handleInputChange}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                      placeholder="输入NFT名称"
                    />
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      选择集合 *
                    </label>
                    <select
                      name="collection_id"
                      value={nftData.collection_id}
                      onChange={handleInputChange}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                    >
                      <option value="">选择集合</option>
                      {collections.map((collection) => (
                        <option key={collection.id} value={collection.id}>
                          {collection.name}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    描述 *
                  </label>
                  <textarea
                    name="description"
                    value={nftData.description}
                    onChange={handleInputChange}
                    rows={4}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                    placeholder="描述这件文物的特点、历史背景等..."
                  />
                </div>

                {/* 文物信息 */}
                <div>
                  <h3 className="text-lg font-medium text-gray-900 mb-4">文物详细信息</h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        文物名称
                      </label>
                      <input
                        type="text"
                        name="artifact_artifact_name"
                        value={nftData.artifact_info.artifact_name}
                        onChange={handleInputChange}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                        placeholder="文物的正式名称"
                      />
                    </div>
                    
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        产地
                      </label>
                      <input
                        type="text"
                        name="artifact_origin_location"
                        value={nftData.artifact_info.origin_location}
                        onChange={handleInputChange}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                        placeholder="文物的制作地点"
                      />
                    </div>
                    
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        历史时期
                      </label>
                      <input
                        type="text"
                        name="artifact_historical_period"
                        value={nftData.artifact_info.historical_period}
                        onChange={handleInputChange}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                        placeholder="如：唐代、明朝等"
                      />
                    </div>
                    
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        材质
                      </label>
                      <input
                        type="text"
                        name="artifact_material"
                        value={nftData.artifact_info.material}
                        onChange={handleInputChange}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                        placeholder="如：青铜、陶瓷、玉石等"
                      />
                    </div>
                  </div>
                  
                  <div className="mt-4">
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      文化意义
                    </label>
                    <textarea
                      name="artifact_cultural_significance"
                      value={nftData.artifact_info.cultural_significance}
                      onChange={handleInputChange}
                      rows={3}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                      placeholder="描述文物的文化价值和历史意义..."
                    />
                  </div>
                  
                  <div className="mt-4">
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      历史故事
                    </label>
                    <textarea
                      name="artifact_historical_story"
                      value={nftData.artifact_info.historical_story}
                      onChange={handleInputChange}
                      rows={3}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                      placeholder="讲述与文物相关的历史故事..."
                    />
                  </div>
                </div>

                {/* 属性 */}
                <div>
                  <h3 className="text-lg font-medium text-gray-900 mb-4">属性</h3>
                  
                  {/* 现有属性 */}
                  {nftData.attributes.length > 0 && (
                    <div className="space-y-2 mb-4">
                      {nftData.attributes.map((attr, index) => (
                        <div key={index} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                          <div>
                            <span className="font-medium">{attr.trait_type}:</span>
                            <span className="ml-2">{attr.value}</span>
                          </div>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => removeAttribute(index)}
                          >
                            <X className="w-4 h-4" />
                          </Button>
                        </div>
                      ))}
                    </div>
                  )}
                  
                  {/* 添加新属性 */}
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <input
                      type="text"
                      placeholder="属性名称"
                      value={newAttribute.trait_type}
                      onChange={(e) => setNewAttribute(prev => ({ ...prev, trait_type: e.target.value }))}
                      className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                    />
                    <input
                      type="text"
                      placeholder="属性值"
                      value={newAttribute.value}
                      onChange={(e) => setNewAttribute(prev => ({ ...prev, value: e.target.value }))}
                      className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                    />
                    <Button onClick={addAttribute} variant="outline">
                      <Plus className="w-4 h-4 mr-2" />
                      添加属性
                    </Button>
                  </div>
                </div>
              </div>
            </div>
          )}

          {step === 3 && (
            <div>
              <h2 className="text-xl font-semibold mb-6">确认创建</h2>
              
              <div className="space-y-6">
                {/* 预览 */}
                <div className="border rounded-lg p-6">
                  <h3 className="text-lg font-medium mb-4">NFT预览</h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div>
                      {filePreview && (
                        <div className="aspect-square bg-gray-100 rounded-lg overflow-hidden">
                          {file?.type.startsWith('image/') ? (
                            <img
                              src={filePreview}
                              alt="NFT预览"
                              className="w-full h-full object-cover"
                            />
                          ) : (
                            <video
                              src={filePreview}
                              controls
                              className="w-full h-full object-cover"
                            />
                          )}
                        </div>
                      )}
                    </div>
                    
                    <div className="space-y-4">
                      <div>
                        <h4 className="font-medium text-gray-900">{nftData.name}</h4>
                        <p className="text-gray-600 mt-1">{nftData.description}</p>
                      </div>
                      
                      {nftData.artifact_info.artifact_name && (
                        <div>
                          <h5 className="font-medium text-gray-900">文物信息</h5>
                          <div className="text-sm text-gray-600 space-y-1">
                            <p>名称: {nftData.artifact_info.artifact_name}</p>
                            {nftData.artifact_info.historical_period && (
                              <p>时期: {nftData.artifact_info.historical_period}</p>
                            )}
                            {nftData.artifact_info.origin_location && (
                              <p>产地: {nftData.artifact_info.origin_location}</p>
                            )}
                            {nftData.artifact_info.material && (
                              <p>材质: {nftData.artifact_info.material}</p>
                            )}
                          </div>
                        </div>
                      )}
                      
                      {nftData.attributes.length > 0 && (
                        <div>
                          <h5 className="font-medium text-gray-900">属性</h5>
                          <div className="flex flex-wrap gap-2 mt-2">
                            {nftData.attributes.map((attr, index) => (
                              <span
                                key={index}
                                className="px-2 py-1 bg-purple-100 text-purple-800 text-xs rounded-full"
                              >
                                {attr.trait_type}: {attr.value}
                              </span>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                </div>

                {/* 重要提示 */}
                <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
                  <div className="flex items-start space-x-2">
                    <AlertCircle className="w-5 h-5 text-yellow-600 mt-0.5" />
                    <div>
                      <h4 className="font-medium text-yellow-800">重要提示</h4>
                      <ul className="text-sm text-yellow-700 mt-1 space-y-1">
                        <li>• NFT创建后将无法修改基本信息</li>
                        <li>• 文件将永久存储在IPFS网络上</li>
                        <li>• 创建成功后可以选择铸造到区块链</li>
                        <li>• 请确保所有信息准确无误</li>
                      </ul>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Navigation Buttons */}
          <div className="flex justify-between mt-8">
            <Button
              variant="outline"
              onClick={handleBack}
              disabled={step === 1 || loading}
            >
              上一步
            </Button>
            
            <div className="space-x-4">
              {step < 3 ? (
                <Button
                  onClick={handleNext}
                  className="bg-purple-600 hover:bg-purple-700"
                >
                  下一步
                </Button>
              ) : (
                <Button
                  onClick={handleCreate}
                  disabled={loading}
                  className="bg-purple-600 hover:bg-purple-700"
                >
                  {loading ? (
                    <>
                      <Loader className="w-4 h-4 mr-2 animate-spin" />
                      创建中...
                    </>
                  ) : (
                    '创建NFT'
                  )}
                </Button>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

export default CreatePage

