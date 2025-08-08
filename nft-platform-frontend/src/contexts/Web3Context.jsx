import { createContext, useContext, useState, useEffect } from 'react'

const Web3Context = createContext()

export const useWeb3 = () => {
  const context = useContext(Web3Context)
  if (!context) {
    throw new Error('useWeb3 must be used within a Web3Provider')
  }
  return context
}

export const Web3Provider = ({ children }) => {
  const [account, setAccount] = useState(null)
  const [chainId, setChainId] = useState(null)
  const [isConnected, setIsConnected] = useState(false)
  const [isConnecting, setIsConnecting] = useState(false)
  const [web3, setWeb3] = useState(null)

  // 检查是否已连接钱包
  useEffect(() => {
    checkConnection()
  }, [])

  // 监听账户和网络变化
  useEffect(() => {
    if (window.ethereum) {
      window.ethereum.on('accountsChanged', handleAccountsChanged)
      window.ethereum.on('chainChanged', handleChainChanged)

      return () => {
        window.ethereum.removeListener('accountsChanged', handleAccountsChanged)
        window.ethereum.removeListener('chainChanged', handleChainChanged)
      }
    }
  }, [])

  const checkConnection = async () => {
    if (window.ethereum) {
      try {
        const accounts = await window.ethereum.request({
          method: 'eth_accounts'
        })

        if (accounts.length > 0) {
          setAccount(accounts[0])
          setIsConnected(true)
          
          const chainId = await window.ethereum.request({
            method: 'eth_chainId'
          })
          setChainId(parseInt(chainId, 16))
        }
      } catch (error) {
        console.error('检查钱包连接失败:', error)
      }
    }
  }

  const connectWallet = async () => {
    if (!window.ethereum) {
      throw new Error('请安装MetaMask钱包')
    }

    setIsConnecting(true)

    try {
      const accounts = await window.ethereum.request({
        method: 'eth_requestAccounts'
      })

      if (accounts.length > 0) {
        setAccount(accounts[0])
        setIsConnected(true)
        
        const chainId = await window.ethereum.request({
          method: 'eth_chainId'
        })
        setChainId(parseInt(chainId, 16))

        return accounts[0]
      }
    } catch (error) {
      console.error('连接钱包失败:', error)
      throw error
    } finally {
      setIsConnecting(false)
    }
  }

  const disconnectWallet = () => {
    setAccount(null)
    setChainId(null)
    setIsConnected(false)
    setWeb3(null)
  }

  const handleAccountsChanged = (accounts) => {
    if (accounts.length === 0) {
      disconnectWallet()
    } else {
      setAccount(accounts[0])
    }
  }

  const handleChainChanged = (chainId) => {
    setChainId(parseInt(chainId, 16))
    // 刷新页面以重新初始化应用
    window.location.reload()
  }

  const switchNetwork = async (targetChainId) => {
    if (!window.ethereum) {
      throw new Error('请安装MetaMask钱包')
    }

    try {
      await window.ethereum.request({
        method: 'wallet_switchEthereumChain',
        params: [{ chainId: `0x${targetChainId.toString(16)}` }]
      })
    } catch (error) {
      // 如果网络不存在，尝试添加
      if (error.code === 4902) {
        await addNetwork(targetChainId)
      } else {
        throw error
      }
    }
  }

  const addNetwork = async (chainId) => {
    const networks = {
      1: {
        chainId: '0x1',
        chainName: 'Ethereum Mainnet',
        nativeCurrency: { name: 'ETH', symbol: 'ETH', decimals: 18 },
        rpcUrls: ['https://mainnet.infura.io/v3/'],
        blockExplorerUrls: ['https://etherscan.io/']
      },
      137: {
        chainId: '0x89',
        chainName: 'Polygon Mainnet',
        nativeCurrency: { name: 'MATIC', symbol: 'MATIC', decimals: 18 },
        rpcUrls: ['https://polygon-rpc.com/'],
        blockExplorerUrls: ['https://polygonscan.com/']
      },
      5: {
        chainId: '0x5',
        chainName: 'Goerli Testnet',
        nativeCurrency: { name: 'ETH', symbol: 'ETH', decimals: 18 },
        rpcUrls: ['https://goerli.infura.io/v3/'],
        blockExplorerUrls: ['https://goerli.etherscan.io/']
      }
    }

    const network = networks[chainId]
    if (!network) {
      throw new Error('不支持的网络')
    }

    await window.ethereum.request({
      method: 'wallet_addEthereumChain',
      params: [network]
    })
  }

  const signMessage = async (message) => {
    if (!account) {
      throw new Error('请先连接钱包')
    }

    try {
      const signature = await window.ethereum.request({
        method: 'personal_sign',
        params: [message, account]
      })

      return signature
    } catch (error) {
      console.error('签名失败:', error)
      throw error
    }
  }

  const getBalance = async (address = account) => {
    if (!address) {
      throw new Error('地址不能为空')
    }

    try {
      const balance = await window.ethereum.request({
        method: 'eth_getBalance',
        params: [address, 'latest']
      })

      // 转换为ETH
      return parseInt(balance, 16) / Math.pow(10, 18)
    } catch (error) {
      console.error('获取余额失败:', error)
      throw error
    }
  }

  const getNetworkName = (chainId) => {
    const networks = {
      1: 'Ethereum Mainnet',
      3: 'Ropsten Testnet',
      4: 'Rinkeby Testnet',
      5: 'Goerli Testnet',
      137: 'Polygon Mainnet',
      80001: 'Mumbai Testnet'
    }

    return networks[chainId] || `Unknown Network (${chainId})`
  }

  const value = {
    account,
    chainId,
    isConnected,
    isConnecting,
    web3,
    connectWallet,
    disconnectWallet,
    switchNetwork,
    signMessage,
    getBalance,
    getNetworkName
  }

  return (
    <Web3Context.Provider value={value}>
      {children}
    </Web3Context.Provider>
  )
}

