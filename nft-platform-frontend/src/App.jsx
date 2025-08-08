import { BrowserRouter as Router, Routes, Route } from 'react-router-dom'
import { useState, useEffect } from 'react'
import './App.css'

// 导入页面组件
import Header from './components/Header'
import Footer from './components/Footer'
import HomePage from './pages/HomePage'
import ExplorePage from './pages/ExplorePage'
import CreatePage from './pages/CreatePage'
import ProfilePage from './pages/ProfilePage'
import MuseumPage from './pages/MuseumPage'
import NFTDetailPage from './pages/NFTDetailPage'
import CollectionPage from './pages/CollectionPage'
import MarketplacePage from './pages/MarketplacePage'

// 导入上下文
import { AuthProvider } from './contexts/AuthContext'
import { Web3Provider } from './contexts/Web3Context'

function App() {
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    // 模拟应用初始化
    const timer = setTimeout(() => {
      setIsLoading(false)
    }, 1000)

    return () => clearTimeout(timer)
  }, [])

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-purple-50 to-blue-50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-purple-600 mx-auto mb-4"></div>
          <h2 className="text-xl font-semibold text-gray-700">加载中...</h2>
          <p className="text-gray-500 mt-2">数字文物NFT平台</p>
        </div>
      </div>
    )
  }

  return (
    <AuthProvider>
      <Web3Provider>
        <Router>
          <div className="min-h-screen bg-gray-50">
            <Header />
            <main className="min-h-screen">
              <Routes>
                <Route path="/" element={<HomePage />} />
                <Route path="/explore" element={<ExplorePage />} />
                <Route path="/create" element={<CreatePage />} />
                <Route path="/profile/:userId?" element={<ProfilePage />} />
                <Route path="/museum/:museumId?" element={<MuseumPage />} />
                <Route path="/marketplace" element={<MarketplacePage />} />
                <Route path="/nft/:nftId" element={<NFTDetailPage />} />
                <Route path="/collection/:collectionId" element={<CollectionPage />} />
                {/* 404 页面 */}
                <Route path="*" element={
                  <div className="min-h-screen flex items-center justify-center bg-gray-50">
                    <div className="text-center">
                      <h1 className="text-4xl font-bold text-gray-900 mb-4">404</h1>
                      <p className="text-gray-600 mb-4">页面未找到</p>
                      <a href="/" className="text-purple-600 hover:text-purple-700">
                        返回首页
                      </a>
                    </div>
                  </div>
                } />
              </Routes>
            </main>
            <Footer />
          </div>
        </Router>
      </Web3Provider>
    </AuthProvider>
  )
}

export default App


