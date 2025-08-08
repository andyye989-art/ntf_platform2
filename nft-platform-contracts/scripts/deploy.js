const { ethers } = require("hardhat");

async function main() {
  console.log("开始部署数字文物NFT平台智能合约...");

  // 获取部署者账户
  const [deployer] = await ethers.getSigners();
  console.log("部署者地址:", deployer.address);
  console.log("部署者余额:", ethers.utils.formatEther(await deployer.getBalance()), "ETH");

  // 部署参数配置
  const platformFeeRecipient = deployer.address; // 平台费用接收地址
  const platformFeeNumerator = 250; // 2.5% 平台费用
  const collectionCreationFee = ethers.utils.parseEther("0.01"); // 0.01 ETH 创建集合费用

  console.log("\n=== 部署配置 ===");
  console.log("平台费用接收地址:", platformFeeRecipient);
  console.log("平台费用比例:", platformFeeNumerator / 100, "%");
  console.log("创建集合费用:", ethers.utils.formatEther(collectionCreationFee), "ETH");

  // 1. 部署 ArtifactFactory 合约
  console.log("\n=== 部署 ArtifactFactory 合约 ===");
  const ArtifactFactory = await ethers.getContractFactory("ArtifactFactory");
  const artifactFactory = await ArtifactFactory.deploy(
    platformFeeRecipient,
    platformFeeNumerator,
    collectionCreationFee
  );
  await artifactFactory.deployed();
  console.log("ArtifactFactory 合约地址:", artifactFactory.address);

  // 2. 部署 ArtifactMarketplace 合约
  console.log("\n=== 部署 ArtifactMarketplace 合约 ===");
  const ArtifactMarketplace = await ethers.getContractFactory("ArtifactMarketplace");
  const artifactMarketplace = await ArtifactMarketplace.deploy(platformFeeRecipient);
  await artifactMarketplace.deployed();
  console.log("ArtifactMarketplace 合约地址:", artifactMarketplace.address);

  // 3. 创建示例NFT集合（可选）
  console.log("\n=== 创建示例NFT集合 ===");
  const createCollectionTx = await artifactFactory.createCollection(
    "Digital Artifacts",
    "DART",
    "A collection of digitized cultural artifacts",
    "https://example.com/cover.jpg",
    "https://example.com/banner.jpg",
    { value: collectionCreationFee }
  );
  const receipt = await createCollectionTx.wait();
  
  // 从事件中获取集合信息
  const collectionCreatedEvent = receipt.events?.find(
    (event) => event.event === "CollectionCreated"
  );
  
  if (collectionCreatedEvent) {
    const [collectionId, contractAddress] = collectionCreatedEvent.args;
    console.log("示例集合ID:", collectionId.toString());
    console.log("示例集合合约地址:", contractAddress);
  }

  // 4. 验证部署结果
  console.log("\n=== 验证部署结果 ===");
  
  // 验证 ArtifactFactory
  const factoryOwner = await artifactFactory.owner();
  const factoryFeeInfo = await artifactFactory.getPlatformFeeInfo();
  console.log("ArtifactFactory 拥有者:", factoryOwner);
  console.log("ArtifactFactory 平台费用信息:", {
    recipient: factoryFeeInfo[0],
    feeNumerator: factoryFeeInfo[1].toString()
  });

  // 验证 ArtifactMarketplace
  const marketplaceOwner = await artifactMarketplace.owner();
  const marketplaceFeeInfo = await artifactMarketplace.getPlatformFeeInfo();
  console.log("ArtifactMarketplace 拥有者:", marketplaceOwner);
  console.log("ArtifactMarketplace 平台费用信息:", {
    feeNumerator: marketplaceFeeInfo[0].toString(),
    recipient: marketplaceFeeInfo[1]
  });

  // 5. 保存部署信息到文件
  const deploymentInfo = {
    network: hre.network.name,
    deployer: deployer.address,
    timestamp: new Date().toISOString(),
    contracts: {
      ArtifactFactory: {
        address: artifactFactory.address,
        constructorArgs: [platformFeeRecipient, platformFeeNumerator, collectionCreationFee.toString()]
      },
      ArtifactMarketplace: {
        address: artifactMarketplace.address,
        constructorArgs: [platformFeeRecipient]
      }
    },
    configuration: {
      platformFeeRecipient,
      platformFeeNumerator,
      collectionCreationFee: collectionCreationFee.toString()
    }
  };

  const fs = require("fs");
  const deploymentPath = `./deployments/${hre.network.name}-deployment.json`;
  
  // 确保部署目录存在
  if (!fs.existsSync("./deployments")) {
    fs.mkdirSync("./deployments");
  }
  
  fs.writeFileSync(deploymentPath, JSON.stringify(deploymentInfo, null, 2));
  console.log("\n部署信息已保存到:", deploymentPath);

  console.log("\n=== 部署完成 ===");
  console.log("请保存以下合约地址:");
  console.log("ArtifactFactory:", artifactFactory.address);
  console.log("ArtifactMarketplace:", artifactMarketplace.address);
  
  // 如果是测试网，提供验证命令
  if (hre.network.name !== "hardhat" && hre.network.name !== "localhost") {
    console.log("\n=== 合约验证命令 ===");
    console.log(`npx hardhat verify --network ${hre.network.name} ${artifactFactory.address} "${platformFeeRecipient}" ${platformFeeNumerator} "${collectionCreationFee.toString()}"`);
    console.log(`npx hardhat verify --network ${hre.network.name} ${artifactMarketplace.address} "${platformFeeRecipient}"`);
  }
}

// 错误处理
main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error("部署失败:", error);
    process.exit(1);
  });

