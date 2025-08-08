import { useState } from 'react'
import { X, Wallet, Copy, ExternalLink, CheckCircle, AlertCircle } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { useWeb3 } from '../contexts/Web3Context'

const WalletModal = ({ isOpen, onClose }) => {
  const [isConnecting, setIsConnecting] = useState(false)
  const [error, setError] = useState('')
  const [copied, setCopied] = useState(false)

  const {
    account,
    chainId,
    isConnected,
    connectWallet,
    disconnectWallet,
    switchNetwork,
    getBalance,
    getNetworkName
  } = useWeb3()

  if (!isOpen) return null

  const handleConnect = async () => {
    setIsConnecting(true)
    setError('')

    try {
      await connectWallet()
    } catch (error) {
      if (error.code === 4001) {
        setError('用户拒绝了连接请求')
      } else if (error.code === -32002) {
        setError('请检查MetaMask，可能有待处理的连接请求')
      } else {
        setError('连接失败，请确保已安装MetaMask钱包')
      }
    } finally {
      setIsConnecting(false)
    }
  }

  const handleDisconnect = () => {
    disconnectWallet()
    onClose()
  }

  const handleCopyAddress = async () => {
    if (account) {
      try {
        await navigator.clipboard.writeText(account)
        setCopied(true)
        setTimeout(() => setCopied(false), 2000)
      } catch (error) {
        console.error('复制失败:', error)
      }
    }
  }

  const handleSwitchToMainnet = async () => {
    try {
      await switchNetwork(1) // Ethereum Mainnet
    } catch (error) {
      setError('切换网络失败')
    }
  }

  const handleSwitchToPolygon = async () => {
    try {
      await switchNetwork(137) // Polygon Mainnet
    } catch (error) {
      setError('切换网络失败')
    }
  }

  const formatAddress = (address) => {
    if (!address) return ''
    return `${address.slice(0, 6)}...${address.slice(-4)}`
  }

  const getNetworkColor = (chainId) => {
    switch (chainId) {
      case 1:
        return 'bg-blue-100 text-blue-800'
      case 137:
        return 'bg-purple-100 text-purple-800'
      case 5:
        return 'bg-yellow-100 text-yellow-800'
      default:
        return 'bg-gray-100 text-gray-800'
    }
  }

  const supportedNetworks = [
    { id: 1, name: 'Ethereum Mainnet', color: 'bg-blue-500' },
    { id: 137, name: 'Polygon Mainnet', color: 'bg-purple-500' },
    { id: 5, name: 'Goerli Testnet', color: 'bg-yellow-500' }
  ]

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg max-w-md w-full">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b">
          <h2 className="text-xl font-semibold">
            {isConnected ? '钱包信息' : '连接钱包'}
          </h2>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6">
          {error && (
            <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg flex items-center space-x-2">
              <AlertCircle className="w-4 h-4 text-red-500" />
              <span className="text-red-600 text-sm">{error}</span>
            </div>
          )}

          {!isConnected ? (
            /* Not Connected State */
            <div className="space-y-4">
              <div className="text-center">
                <div className="w-16 h-16 bg-gradient-to-br from-purple-100 to-blue-100 rounded-full flex items-center justify-center mx-auto mb-4">
                  <Wallet className="w-8 h-8 text-purple-600" />
                </div>
                <h3 className="text-lg font-medium mb-2">连接您的钱包</h3>
                <p className="text-gray-600 text-sm">
                  连接钱包以创建、购买和交易NFT
                </p>
              </div>

              {/* MetaMask Connect Button */}
              <Button
                onClick={handleConnect}
                disabled={isConnecting}
                className="w-full h-12 bg-gradient-to-r from-orange-500 to-yellow-500 hover:from-orange-600 hover:to-yellow-600 text-white"
              >
                <div className="flex items-center space-x-3">
                  <div className="w-6 h-6 bg-white rounded-full flex items-center justify-center">
                    <span className="text-orange-500 font-bold text-sm">M</span>
                  </div>
                  <span>{isConnecting ? '连接中...' : 'MetaMask'}</span>
                </div>
              </Button>

              {/* Other Wallets */}
              <div className="space-y-2">
                <Button
                  variant="outline"
                  disabled
                  className="w-full h-12 opacity-50"
                >
                  <div className="flex items-center space-x-3">
                    <div className="w-6 h-6 bg-blue-500 rounded-full"></div>
                    <span>WalletConnect (即将支持)</span>
                  </div>
                </Button>

                <Button
                  variant="outline"
                  disabled
                  className="w-full h-12 opacity-50"
                >
                  <div className="flex items-center space-x-3">
                    <div className="w-6 h-6 bg-purple-500 rounded-full"></div>
                    <span>Coinbase Wallet (即将支持)</span>
                  </div>
                </Button>
              </div>

              {/* Info */}
              <div className="mt-6 p-4 bg-blue-50 rounded-lg">
                <h4 className="font-medium text-blue-900 mb-2">什么是钱包？</h4>
                <p className="text-blue-700 text-sm">
                  钱包用于发送、接收、存储和显示数字资产。它也是您在Web3应用中的身份验证方式。
                </p>
              </div>
            </div>
          ) : (
            /* Connected State */
            <div className="space-y-4">
              {/* Account Info */}
              <div className="p-4 bg-green-50 border border-green-200 rounded-lg">
                <div className="flex items-center space-x-2 mb-2">
                  <CheckCircle className="w-5 h-5 text-green-500" />
                  <span className="font-medium text-green-800">钱包已连接</span>
                </div>
                
                <div className="space-y-3">
                  {/* Address */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      钱包地址
                    </label>
                    <div className="flex items-center space-x-2">
                      <code className="flex-1 px-3 py-2 bg-gray-100 rounded text-sm font-mono">
                        {formatAddress(account)}
                      </code>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={handleCopyAddress}
                        className="px-2"
                      >
                        {copied ? (
                          <CheckCircle className="w-4 h-4 text-green-500" />
                        ) : (
                          <Copy className="w-4 h-4" />
                        )}
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => window.open(`https://etherscan.io/address/${account}`, '_blank')}
                        className="px-2"
                      >
                        <ExternalLink className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>

                  {/* Network */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      当前网络
                    </label>
                    <div className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium ${getNetworkColor(chainId)}`}>
                      {getNetworkName(chainId)}
                    </div>
                  </div>
                </div>
              </div>

              {/* Network Switching */}
              <div>
                <h4 className="font-medium text-gray-900 mb-3">支持的网络</h4>
                <div className="space-y-2">
                  {supportedNetworks.map((network) => (
                    <button
                      key={network.id}
                      onClick={() => switchNetwork(network.id)}
                      disabled={chainId === network.id}
                      className={`w-full flex items-center justify-between p-3 border rounded-lg transition-colors ${
                        chainId === network.id
                          ? 'border-green-500 bg-green-50'
                          : 'border-gray-200 hover:border-gray-300 hover:bg-gray-50'
                      }`}
                    >
                      <div className="flex items-center space-x-3">
                        <div className={`w-3 h-3 rounded-full ${network.color}`}></div>
                        <span className="font-medium">{network.name}</span>
                      </div>
                      {chainId === network.id && (
                        <CheckCircle className="w-5 h-5 text-green-500" />
                      )}
                    </button>
                  ))}
                </div>
              </div>

              {/* Actions */}
              <div className="space-y-2 pt-4 border-t">
                <Button
                  variant="outline"
                  onClick={() => window.open(`https://etherscan.io/address/${account}`, '_blank')}
                  className="w-full"
                >
                  <ExternalLink className="w-4 h-4 mr-2" />
                  在区块浏览器中查看
                </Button>
                
                <Button
                  variant="outline"
                  onClick={handleDisconnect}
                  className="w-full text-red-600 border-red-200 hover:bg-red-50"
                >
                  断开连接
                </Button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

export default WalletModal

