# 数字文物NFT平台智能合约

本项目包含数字文物NFT平台的核心智能合约，支持文物数字化、NFT铸造、链上交易、版税分配等功能。

## 合约架构

### 核心合约

1. **ArtifactNFT.sol** - 文物NFT合约
   - 基于ERC721标准
   - 支持文物信息存储
   - 支持版税功能（ERC2981）
   - 支持批量铸造
   - 支持创建者验证

2. **ArtifactMarketplace.sol** - 交易市场合约
   - 支持固定价格销售
   - 支持拍卖功能
   - 自动版税分配
   - 平台费用管理
   - 竞价系统

3. **ArtifactFactory.sol** - NFT集合工厂合约
   - 批量创建NFT集合
   - 集合管理和验证
   - 创建者认证系统
   - 费用管理

## 功能特性

### NFT功能
- ✅ ERC721标准兼容
- ✅ 文物信息存储（名称、来源、历史时期、文化意义等）
- ✅ 版税支持（ERC2981标准）
- ✅ 批量铸造
- ✅ 元数据URI管理
- ✅ 创建者验证系统
- ✅ 暂停/恢复功能

### 交易市场功能
- ✅ 固定价格销售
- ✅ 拍卖系统
- ✅ 竞价功能
- ✅ 自动版税分配
- ✅ 平台费用管理
- ✅ 拍卖延长机制
- ✅ 资金安全托管

### 工厂合约功能
- ✅ 批量创建NFT集合
- ✅ 集合信息管理
- ✅ 创建者认证
- ✅ 分页查询
- ✅ 费用配置

## 技术规范

### 开发环境
- Solidity ^0.8.19
- Hardhat 开发框架
- OpenZeppelin 合约库
- Ethers.js

### 网络支持
- Ethereum Mainnet
- Ethereum Testnet (Goerli, Sepolia)
- Polygon Mainnet
- Polygon Testnet (Mumbai)

## 安装和使用

### 1. 安装依赖

```bash
npm install
```

### 2. 编译合约

```bash
npm run compile
```

### 3. 运行测试

```bash
npm run test
```

### 4. 部署合约

#### 本地部署
```bash
npm run deploy
```

#### 测试网部署
```bash
npm run deploy:testnet
```

#### 主网部署
```bash
npm run deploy:mainnet
```

### 5. 验证合约

```bash
npm run verify
```

## 环境配置

创建 `.env` 文件并配置以下变量：

```env
PRIVATE_KEY=your_private_key_here
INFURA_API_KEY=your_infura_api_key
ETHERSCAN_API_KEY=your_etherscan_api_key
POLYGONSCAN_API_KEY=your_polygonscan_api_key
COINMARKETCAP_API_KEY=your_coinmarketcap_api_key
```

## 合约地址

部署后的合约地址将保存在 `deployments/` 目录下。

### 测试网地址（示例）
```
ArtifactFactory: 0x...
ArtifactMarketplace: 0x...
```

## 使用示例

### 创建NFT集合

```javascript
const factory = await ethers.getContractAt("ArtifactFactory", factoryAddress);
const tx = await factory.createCollection(
  "Digital Artifacts",
  "DART",
  "A collection of digitized cultural artifacts",
  "https://example.com/cover.jpg",
  "https://example.com/banner.jpg",
  { value: ethers.utils.parseEther("0.01") }
);
```

### 铸造文物NFT

```javascript
const nft = await ethers.getContractAt("ArtifactNFT", nftAddress);
const tx = await nft.mintArtifact(
  userAddress,
  "ipfs://QmTokenURI",
  "唐代青花瓷",
  "西安",
  "唐代",
  "代表唐代制瓷工艺的巅峰",
  creatorAddress,
  500 // 5% 版税
);
```

### 创建市场挂单

```javascript
const marketplace = await ethers.getContractAt("ArtifactMarketplace", marketplaceAddress);
const tx = await marketplace.createFixedPriceListing(
  nftAddress,
  tokenId,
  ethers.utils.parseEther("1.0") // 1 ETH
);
```

## 安全考虑

### 已实现的安全措施
- ✅ 重入攻击防护（ReentrancyGuard）
- ✅ 暂停机制（Pausable）
- ✅ 访问控制（Ownable）
- ✅ 整数溢出防护（Solidity 0.8+）
- ✅ 输入验证
- ✅ 资金安全托管

### 建议的安全实践
- 🔍 合约部署前进行安全审计
- 🔍 使用多重签名钱包管理合约
- 🔍 定期监控合约状态
- 🔍 设置合理的费用上限

## Gas 优化

### 已实现的优化
- ✅ 批量操作支持
- ✅ 存储布局优化
- ✅ 事件日志优化
- ✅ 函数修饰符优化

### Gas 消耗估算
- 创建集合：~2,500,000 gas
- 铸造NFT：~150,000 gas
- 创建挂单：~100,000 gas
- 购买NFT：~80,000 gas

## 测试覆盖率

运行测试覆盖率报告：

```bash
npm run coverage
```

目标覆盖率：
- 语句覆盖率：> 95%
- 分支覆盖率：> 90%
- 函数覆盖率：> 95%
- 行覆盖率：> 95%

## 贡献指南

1. Fork 项目
2. 创建功能分支
3. 提交更改
4. 推送到分支
5. 创建 Pull Request

## 许可证

MIT License

## 联系方式

如有问题或建议，请通过以下方式联系：
- 邮箱：contact@example.com
- GitHub Issues：[项目Issues页面]

## 更新日志

### v1.0.0 (2025-08-04)
- 初始版本发布
- 实现核心NFT功能
- 实现交易市场功能
- 实现工厂合约功能
- 完成测试套件

