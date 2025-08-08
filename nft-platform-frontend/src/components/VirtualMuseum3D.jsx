import { useRef, useEffect, useState } from 'react'
import { 
  Maximize, 
  Minimize, 
  RotateCcw, 
  ZoomIn, 
  ZoomOut, 
  Move, 
  Eye, 
  Settings,
  Palette,
  Layout,
  Info
} from 'lucide-react'
import { Button } from '@/components/ui/button'

const VirtualMuseum3D = ({ museumId, nfts = [], onNFTClick }) => {
  const canvasRef = useRef(null)
  const [isFullscreen, setIsFullscreen] = useState(false)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState(null)
  const [viewMode, setViewMode] = useState('walk') // walk, fly, orbit
  const [showControls, setShowControls] = useState(true)
  const [selectedNFT, setSelectedNFT] = useState(null)
  const [cameraPosition, setCameraPosition] = useState({ x: 0, y: 1.6, z: 5 })
  const [cameraRotation, setCameraRotation] = useState({ x: 0, y: 0, z: 0 })

  // 模拟3D场景数据
  const [scene, setScene] = useState({
    walls: [
      { id: 1, position: [0, 0, -10], size: [20, 8, 0.5], color: '#f5f5f5' },
      { id: 2, position: [-10, 0, 0], size: [0.5, 8, 20], color: '#f5f5f5' },
      { id: 3, position: [10, 0, 0], size: [0.5, 8, 20], color: '#f5f5f5' },
      { id: 4, position: [0, 0, 10], size: [20, 8, 0.5], color: '#f5f5f5' }
    ],
    floor: { position: [0, -4, 0], size: [20, 0.1, 20], color: '#e0e0e0' },
    ceiling: { position: [0, 4, 0], size: [20, 0.1, 20], color: '#ffffff' },
    lighting: {
      ambient: { intensity: 0.4, color: '#ffffff' },
      directional: { intensity: 0.8, color: '#ffffff', position: [5, 10, 5] },
      spotlights: [
        { position: [-5, 3, -5], target: [-5, 0, -5], intensity: 1.0 },
        { position: [5, 3, -5], target: [5, 0, -5], intensity: 1.0 },
        { position: [-5, 3, 5], target: [-5, 0, 5], intensity: 1.0 },
        { position: [5, 3, 5], target: [5, 0, 5], intensity: 1.0 }
      ]
    }
  })

  useEffect(() => {
    initializeMuseum()
  }, [museumId])

  useEffect(() => {
    if (canvasRef.current) {
      setupCanvas()
      renderScene()
    }
  }, [scene, cameraPosition, cameraRotation])

  const initializeMuseum = async () => {
    setIsLoading(true)
    setError(null)
    
    try {
      // 模拟加载博物馆配置
      await new Promise(resolve => setTimeout(resolve, 1000))
      
      // 在实际应用中，这里会从API获取博物馆的3D配置
      const museumConfig = {
        theme: 'modern',
        wallColor: '#f5f5f5',
        floorColor: '#e0e0e0',
        lighting: 'warm'
      }
      
      setIsLoading(false)
    } catch (err) {
      setError('加载虚拟博物馆失败')
      setIsLoading(false)
    }
  }

  const setupCanvas = () => {
    const canvas = canvasRef.current
    if (!canvas) return

    const ctx = canvas.getContext('2d')
    canvas.width = canvas.offsetWidth
    canvas.height = canvas.offsetHeight

    // 设置基本样式
    ctx.fillStyle = '#f0f0f0'
    ctx.fillRect(0, 0, canvas.width, canvas.height)
  }

  const renderScene = () => {
    const canvas = canvasRef.current
    if (!canvas) return

    const ctx = canvas.getContext('2d')
    ctx.clearRect(0, 0, canvas.width, canvas.height)

    // 绘制背景渐变
    const gradient = ctx.createLinearGradient(0, 0, 0, canvas.height)
    gradient.addColorStop(0, '#e6f3ff')
    gradient.addColorStop(1, '#f0f8ff')
    ctx.fillStyle = gradient
    ctx.fillRect(0, 0, canvas.width, canvas.height)

    // 绘制地板网格
    drawFloorGrid(ctx, canvas.width, canvas.height)

    // 绘制墙壁
    drawWalls(ctx, canvas.width, canvas.height)

    // 绘制NFT展示框架
    drawNFTFrames(ctx, canvas.width, canvas.height)

    // 绘制UI元素
    drawUI(ctx, canvas.width, canvas.height)
  }

  const drawFloorGrid = (ctx, width, height) => {
    ctx.strokeStyle = '#d0d0d0'
    ctx.lineWidth = 1
    ctx.setLineDash([5, 5])

    const gridSize = 50
    const offsetX = (width / 2) % gridSize
    const offsetY = (height * 0.8) % gridSize

    // 垂直线
    for (let x = offsetX; x < width; x += gridSize) {
      ctx.beginPath()
      ctx.moveTo(x, height * 0.6)
      ctx.lineTo(x, height)
      ctx.stroke()
    }

    // 水平线
    for (let y = height * 0.6 + offsetY; y < height; y += gridSize) {
      ctx.beginPath()
      ctx.moveTo(0, y)
      ctx.lineTo(width, y)
      ctx.stroke()
    }

    ctx.setLineDash([])
  }

  const drawWalls = (ctx, width, height) => {
    // 后墙
    ctx.fillStyle = '#f8f8f8'
    ctx.fillRect(0, 0, width, height * 0.6)

    // 墙壁阴影效果
    const shadowGradient = ctx.createLinearGradient(0, 0, 0, height * 0.6)
    shadowGradient.addColorStop(0, 'rgba(0,0,0,0.1)')
    shadowGradient.addColorStop(1, 'rgba(0,0,0,0.05)')
    ctx.fillStyle = shadowGradient
    ctx.fillRect(0, 0, width, height * 0.6)
  }

  const drawNFTFrames = (ctx, width, height) => {
    if (!nfts || nfts.length === 0) return

    const frameWidth = 120
    const frameHeight = 120
    const spacing = 40
    const startX = (width - (nfts.length * (frameWidth + spacing) - spacing)) / 2
    const wallY = height * 0.2

    nfts.forEach((nft, index) => {
      const x = startX + index * (frameWidth + spacing)
      const y = wallY

      // 绘制画框
      ctx.fillStyle = '#8B4513'
      ctx.fillRect(x - 5, y - 5, frameWidth + 10, frameHeight + 10)

      // 绘制内框
      ctx.fillStyle = '#ffffff'
      ctx.fillRect(x, y, frameWidth, frameHeight)

      // 绘制NFT预览（简化版）
      if (nft.image_url) {
        ctx.fillStyle = '#e0e0e0'
        ctx.fillRect(x + 10, y + 10, frameWidth - 20, frameHeight - 40)
        
        // 绘制标题
        ctx.fillStyle = '#333333'
        ctx.font = '12px Arial'
        ctx.textAlign = 'center'
        const title = nft.name.length > 15 ? nft.name.substring(0, 15) + '...' : nft.name
        ctx.fillText(title, x + frameWidth / 2, y + frameHeight - 10)
      }

      // 绘制聚光灯效果
      const spotlightGradient = ctx.createRadialGradient(
        x + frameWidth / 2, y + frameHeight / 2, 0,
        x + frameWidth / 2, y + frameHeight / 2, frameWidth
      )
      spotlightGradient.addColorStop(0, 'rgba(255,255,255,0.3)')
      spotlightGradient.addColorStop(1, 'rgba(255,255,255,0)')
      ctx.fillStyle = spotlightGradient
      ctx.fillRect(x, y, frameWidth, frameHeight)

      // 检查鼠标悬停（简化版）
      if (selectedNFT === nft.id) {
        ctx.strokeStyle = '#6366f1'
        ctx.lineWidth = 3
        ctx.strokeRect(x - 2, y - 2, frameWidth + 4, frameHeight + 4)
      }
    })
  }

  const drawUI = (ctx, width, height) => {
    // 绘制十字准星
    if (viewMode === 'walk') {
      ctx.strokeStyle = '#ffffff'
      ctx.lineWidth = 2
      const centerX = width / 2
      const centerY = height / 2
      const size = 10

      ctx.beginPath()
      ctx.moveTo(centerX - size, centerY)
      ctx.lineTo(centerX + size, centerY)
      ctx.moveTo(centerX, centerY - size)
      ctx.lineTo(centerX, centerY + size)
      ctx.stroke()
    }

    // 绘制小地图
    drawMinimap(ctx, width, height)
  }

  const drawMinimap = (ctx, width, height) => {
    const mapSize = 120
    const mapX = width - mapSize - 20
    const mapY = 20

    // 地图背景
    ctx.fillStyle = 'rgba(0,0,0,0.7)'
    ctx.fillRect(mapX, mapY, mapSize, mapSize)

    // 地图边框
    ctx.strokeStyle = '#ffffff'
    ctx.lineWidth = 2
    ctx.strokeRect(mapX, mapY, mapSize, mapSize)

    // 房间轮廓
    ctx.strokeStyle = '#ffffff'
    ctx.lineWidth = 1
    ctx.strokeRect(mapX + 10, mapY + 10, mapSize - 20, mapSize - 20)

    // 玩家位置
    const playerX = mapX + mapSize / 2
    const playerY = mapY + mapSize / 2
    ctx.fillStyle = '#ff0000'
    ctx.beginPath()
    ctx.arc(playerX, playerY, 3, 0, Math.PI * 2)
    ctx.fill()

    // 玩家朝向
    ctx.strokeStyle = '#ff0000'
    ctx.lineWidth = 2
    ctx.beginPath()
    ctx.moveTo(playerX, playerY)
    ctx.lineTo(
      playerX + Math.cos(cameraRotation.y) * 15,
      playerY + Math.sin(cameraRotation.y) * 15
    )
    ctx.stroke()
  }

  const handleCanvasClick = (event) => {
    const canvas = canvasRef.current
    if (!canvas) return

    const rect = canvas.getBoundingClientRect()
    const x = event.clientX - rect.left
    const y = event.clientY - rect.top

    // 检查是否点击了NFT
    const frameWidth = 120
    const frameHeight = 120
    const spacing = 40
    const startX = (canvas.width - (nfts.length * (frameWidth + spacing) - spacing)) / 2
    const wallY = canvas.height * 0.2

    nfts.forEach((nft, index) => {
      const frameX = startX + index * (frameWidth + spacing)
      const frameY = wallY

      if (x >= frameX && x <= frameX + frameWidth && 
          y >= frameY && y <= frameY + frameHeight) {
        setSelectedNFT(nft.id)
        if (onNFTClick) {
          onNFTClick(nft)
        }
      }
    })
  }

  const handleKeyDown = (event) => {
    const moveSpeed = 0.1
    const rotateSpeed = 0.05

    switch (event.key) {
      case 'w':
      case 'W':
        setCameraPosition(prev => ({
          ...prev,
          z: prev.z - moveSpeed * Math.cos(cameraRotation.y),
          x: prev.x - moveSpeed * Math.sin(cameraRotation.y)
        }))
        break
      case 's':
      case 'S':
        setCameraPosition(prev => ({
          ...prev,
          z: prev.z + moveSpeed * Math.cos(cameraRotation.y),
          x: prev.x + moveSpeed * Math.sin(cameraRotation.y)
        }))
        break
      case 'a':
      case 'A':
        setCameraPosition(prev => ({
          ...prev,
          x: prev.x - moveSpeed * Math.cos(cameraRotation.y),
          z: prev.z + moveSpeed * Math.sin(cameraRotation.y)
        }))
        break
      case 'd':
      case 'D':
        setCameraPosition(prev => ({
          ...prev,
          x: prev.x + moveSpeed * Math.cos(cameraRotation.y),
          z: prev.z - moveSpeed * Math.sin(cameraRotation.y)
        }))
        break
      case 'ArrowLeft':
        setCameraRotation(prev => ({ ...prev, y: prev.y - rotateSpeed }))
        break
      case 'ArrowRight':
        setCameraRotation(prev => ({ ...prev, y: prev.y + rotateSpeed }))
        break
      case 'ArrowUp':
        setCameraRotation(prev => ({ ...prev, x: Math.max(-Math.PI/3, prev.x - rotateSpeed) }))
        break
      case 'ArrowDown':
        setCameraRotation(prev => ({ ...prev, x: Math.min(Math.PI/3, prev.x + rotateSpeed) }))
        break
    }
  }

  const toggleFullscreen = () => {
    if (!isFullscreen) {
      canvasRef.current?.requestFullscreen?.()
    } else {
      document.exitFullscreen?.()
    }
    setIsFullscreen(!isFullscreen)
  }

  const resetCamera = () => {
    setCameraPosition({ x: 0, y: 1.6, z: 5 })
    setCameraRotation({ x: 0, y: 0, z: 0 })
  }

  useEffect(() => {
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [cameraRotation])

  if (isLoading) {
    return (
      <div className="w-full h-96 bg-gray-100 rounded-lg flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-600 mx-auto mb-4"></div>
          <p className="text-gray-600">加载虚拟博物馆中...</p>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="w-full h-96 bg-gray-100 rounded-lg flex items-center justify-center">
        <div className="text-center text-red-600">
          <p>{error}</p>
          <Button onClick={initializeMuseum} className="mt-4">
            重试
          </Button>
        </div>
      </div>
    )
  }

  return (
    <div className="relative w-full h-96 bg-black rounded-lg overflow-hidden">
      {/* 3D Canvas */}
      <canvas
        ref={canvasRef}
        className="w-full h-full cursor-crosshair"
        onClick={handleCanvasClick}
        tabIndex={0}
        style={{ outline: 'none' }}
      />

      {/* 控制面板 */}
      {showControls && (
        <div className="absolute top-4 left-4 bg-black bg-opacity-70 rounded-lg p-4 text-white">
          <div className="flex items-center space-x-2 mb-2">
            <Eye className="w-4 h-4" />
            <span className="text-sm">视角模式: {viewMode}</span>
          </div>
          <div className="text-xs text-gray-300">
            <p>WASD: 移动</p>
            <p>方向键: 转向</p>
            <p>点击: 选择NFT</p>
          </div>
        </div>
      )}

      {/* 工具栏 */}
      <div className="absolute top-4 right-4 flex flex-col space-y-2">
        <Button
          size="sm"
          variant="outline"
          onClick={toggleFullscreen}
          className="bg-black bg-opacity-70 text-white border-gray-600 hover:bg-gray-800"
        >
          {isFullscreen ? <Minimize className="w-4 h-4" /> : <Maximize className="w-4 h-4" />}
        </Button>
        
        <Button
          size="sm"
          variant="outline"
          onClick={resetCamera}
          className="bg-black bg-opacity-70 text-white border-gray-600 hover:bg-gray-800"
        >
          <RotateCcw className="w-4 h-4" />
        </Button>
        
        <Button
          size="sm"
          variant="outline"
          onClick={() => setShowControls(!showControls)}
          className="bg-black bg-opacity-70 text-white border-gray-600 hover:bg-gray-800"
        >
          <Settings className="w-4 h-4" />
        </Button>
      </div>

      {/* 底部信息栏 */}
      <div className="absolute bottom-4 left-4 right-4 bg-black bg-opacity-70 rounded-lg p-3 text-white">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <div className="text-sm">
              位置: ({cameraPosition.x.toFixed(1)}, {cameraPosition.y.toFixed(1)}, {cameraPosition.z.toFixed(1)})
            </div>
            <div className="text-sm">
              朝向: {(cameraRotation.y * 180 / Math.PI).toFixed(0)}°
            </div>
          </div>
          
          <div className="flex items-center space-x-2">
            <Button
              size="sm"
              variant={viewMode === 'walk' ? 'default' : 'outline'}
              onClick={() => setViewMode('walk')}
              className="text-xs"
            >
              <Move className="w-3 h-3 mr-1" />
              漫游
            </Button>
            <Button
              size="sm"
              variant={viewMode === 'orbit' ? 'default' : 'outline'}
              onClick={() => setViewMode('orbit')}
              className="text-xs"
            >
              <Eye className="w-3 h-3 mr-1" />
              环绕
            </Button>
          </div>
        </div>
      </div>

      {/* NFT信息弹窗 */}
      {selectedNFT && (
        <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 bg-white rounded-lg shadow-xl p-6 max-w-sm">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold">NFT详情</h3>
            <Button
              size="sm"
              variant="ghost"
              onClick={() => setSelectedNFT(null)}
            >
              ×
            </Button>
          </div>
          
          {(() => {
            const nft = nfts.find(n => n.id === selectedNFT)
            if (!nft) return null
            
            return (
              <div>
                <img
                  src={nft.image_url || '/api/placeholder/200/200'}
                  alt={nft.name}
                  className="w-full h-32 object-cover rounded mb-3"
                />
                <h4 className="font-medium mb-2">{nft.name}</h4>
                <p className="text-sm text-gray-600 mb-3">{nft.description}</p>
                <div className="flex space-x-2">
                  <Button size="sm" className="flex-1">
                    查看详情
                  </Button>
                  <Button size="sm" variant="outline">
                    <Info className="w-4 h-4" />
                  </Button>
                </div>
              </div>
            )
          })()}
        </div>
      )}
    </div>
  )
}

export default VirtualMuseum3D

