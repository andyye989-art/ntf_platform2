const { expect } = require("chai");
const { ethers } = require("hardhat");

describe("ArtifactNFT", function () {
  let ArtifactNFT;
  let artifactNFT;
  let owner;
  let creator;
  let user1;
  let user2;
  let platformFeeRecipient;

  const PLATFORM_FEE_NUMERATOR = 250; // 2.5%
  const ROYALTY_FRACTION = 500; // 5%

  beforeEach(async function () {
    [owner, creator, user1, user2, platformFeeRecipient] = await ethers.getSigners();

    ArtifactNFT = await ethers.getContractFactory("ArtifactNFT");
    artifactNFT = await ArtifactNFT.deploy(
      "Digital Artifacts",
      "DART",
      platformFeeRecipient.address,
      PLATFORM_FEE_NUMERATOR
    );
    await artifactNFT.deployed();
  });

  describe("部署", function () {
    it("应该正确设置合约名称和符号", async function () {
      expect(await artifactNFT.name()).to.equal("Digital Artifacts");
      expect(await artifactNFT.symbol()).to.equal("DART");
    });

    it("应该正确设置合约拥有者", async function () {
      expect(await artifactNFT.owner()).to.equal(owner.address);
    });

    it("应该正确设置平台费用信息", async function () {
      const [recipient, fee] = await artifactNFT.platformFeeInfo(10000);
      expect(recipient).to.equal(platformFeeRecipient.address);
      expect(fee).to.equal(250); // 2.5% of 10000
    });
  });

  describe("铸造NFT", function () {
    it("应该能够成功铸造文物NFT", async function () {
      const tokenURI = "ipfs://QmTest123";
      const artifactName = "唐代青花瓷";
      const originLocation = "西安";
      const historicalPeriod = "唐代";
      const culturalSignificance = "代表唐代制瓷工艺的巅峰";

      const tx = await artifactNFT.connect(creator).mintArtifact(
        user1.address,
        tokenURI,
        artifactName,
        originLocation,
        historicalPeriod,
        culturalSignificance,
        creator.address,
        ROYALTY_FRACTION
      );

      const receipt = await tx.wait();
      const event = receipt.events?.find(e => e.event === "ArtifactMinted");
      
      expect(event).to.not.be.undefined;
      expect(event.args.creator).to.equal(creator.address);
      expect(event.args.to).to.equal(user1.address);
      expect(event.args.artifactName).to.equal(artifactName);

      // 验证NFT所有权
      expect(await artifactNFT.ownerOf(0)).to.equal(user1.address);
      
      // 验证Token URI
      expect(await artifactNFT.tokenURI(0)).to.equal(tokenURI);
      
      // 验证文物信息
      const artifactInfo = await artifactNFT.getArtifactInfo(0);
      expect(artifactInfo.artifactName).to.equal(artifactName);
      expect(artifactInfo.originLocation).to.equal(originLocation);
      expect(artifactInfo.historicalPeriod).to.equal(historicalPeriod);
      expect(artifactInfo.culturalSignificance).to.equal(culturalSignificance);
      expect(artifactInfo.creator).to.equal(creator.address);
    });

    it("应该能够批量铸造NFT", async function () {
      const tokenURIs = [
        "ipfs://QmTest1",
        "ipfs://QmTest2",
        "ipfs://QmTest3"
      ];
      const artifactNames = [
        "文物1",
        "文物2", 
        "文物3"
      ];

      const tx = await artifactNFT.connect(creator).batchMintArtifacts(
        user1.address,
        tokenURIs,
        artifactNames,
        creator.address,
        ROYALTY_FRACTION
      );

      const receipt = await tx.wait();
      const events = receipt.events?.filter(e => e.event === "ArtifactMinted");
      
      expect(events).to.have.length(3);
      
      // 验证每个NFT
      for (let i = 0; i < 3; i++) {
        expect(await artifactNFT.ownerOf(i)).to.equal(user1.address);
        expect(await artifactNFT.tokenURI(i)).to.equal(tokenURIs[i]);
        
        const artifactInfo = await artifactNFT.getArtifactInfo(i);
        expect(artifactInfo.artifactName).to.equal(artifactNames[i]);
      }
    });

    it("应该拒绝空的Token URI", async function () {
      await expect(
        artifactNFT.connect(creator).mintArtifact(
          user1.address,
          "",
          "文物名称",
          "来源地",
          "历史时期",
          "文化意义",
          creator.address,
          ROYALTY_FRACTION
        )
      ).to.be.revertedWith("Token URI cannot be empty");
    });

    it("应该拒绝空的文物名称", async function () {
      await expect(
        artifactNFT.connect(creator).mintArtifact(
          user1.address,
          "ipfs://QmTest",
          "",
          "来源地",
          "历史时期",
          "文化意义",
          creator.address,
          ROYALTY_FRACTION
        )
      ).to.be.revertedWith("Artifact name cannot be empty");
    });

    it("应该拒绝过高的版税比例", async function () {
      await expect(
        artifactNFT.connect(creator).mintArtifact(
          user1.address,
          "ipfs://QmTest",
          "文物名称",
          "来源地",
          "历史时期",
          "文化意义",
          creator.address,
          1500 // 15% > 10% 最大值
        )
      ).to.be.revertedWith("Royalty fraction too high");
    });
  });

  describe("版税功能", function () {
    beforeEach(async function () {
      await artifactNFT.connect(creator).mintArtifact(
        user1.address,
        "ipfs://QmTest",
        "文物名称",
        "来源地",
        "历史时期",
        "文化意义",
        creator.address,
        ROYALTY_FRACTION
      );
    });

    it("应该正确返回版税信息", async function () {
      const salePrice = ethers.utils.parseEther("1");
      const [recipient, royaltyAmount] = await artifactNFT.royaltyInfo(0, salePrice);
      
      expect(recipient).to.equal(creator.address);
      expect(royaltyAmount).to.equal(salePrice.mul(ROYALTY_FRACTION).div(10000));
    });

    it("应该支持ERC2981接口", async function () {
      const ERC2981_INTERFACE_ID = "0x2a55205a";
      expect(await artifactNFT.supportsInterface(ERC2981_INTERFACE_ID)).to.be.true;
    });
  });

  describe("创建者验证", function () {
    it("应该能够验证创建者", async function () {
      expect(await artifactNFT.isVerifiedCreator(creator.address)).to.be.false;
      
      await artifactNFT.connect(owner).verifyCreator(creator.address);
      
      expect(await artifactNFT.isVerifiedCreator(creator.address)).to.be.true;
    });

    it("应该能够取消验证创建者", async function () {
      await artifactNFT.connect(owner).verifyCreator(creator.address);
      expect(await artifactNFT.isVerifiedCreator(creator.address)).to.be.true;
      
      await artifactNFT.connect(owner).unverifyCreator(creator.address);
      
      expect(await artifactNFT.isVerifiedCreator(creator.address)).to.be.false;
    });

    it("非拥有者不能验证创建者", async function () {
      await expect(
        artifactNFT.connect(user1).verifyCreator(creator.address)
      ).to.be.revertedWith("Ownable: caller is not the owner");
    });
  });

  describe("文物信息更新", function () {
    beforeEach(async function () {
      await artifactNFT.connect(creator).mintArtifact(
        user1.address,
        "ipfs://QmTest",
        "原始名称",
        "原始来源地",
        "原始历史时期",
        "原始文化意义",
        creator.address,
        ROYALTY_FRACTION
      );
    });

    it("创建者应该能够更新文物信息", async function () {
      const newName = "更新后的名称";
      const newLocation = "更新后的来源地";
      const newPeriod = "更新后的历史时期";
      const newSignificance = "更新后的文化意义";

      await artifactNFT.connect(creator).updateArtifactInfo(
        0,
        newName,
        newLocation,
        newPeriod,
        newSignificance
      );

      const artifactInfo = await artifactNFT.getArtifactInfo(0);
      expect(artifactInfo.artifactName).to.equal(newName);
      expect(artifactInfo.originLocation).to.equal(newLocation);
      expect(artifactInfo.historicalPeriod).to.equal(newPeriod);
      expect(artifactInfo.culturalSignificance).to.equal(newSignificance);
    });

    it("合约拥有者应该能够更新文物信息", async function () {
      const newName = "拥有者更新的名称";

      await artifactNFT.connect(owner).updateArtifactInfo(
        0,
        newName,
        "",
        "",
        ""
      );

      const artifactInfo = await artifactNFT.getArtifactInfo(0);
      expect(artifactInfo.artifactName).to.equal(newName);
    });

    it("非授权用户不能更新文物信息", async function () {
      await expect(
        artifactNFT.connect(user2).updateArtifactInfo(
          0,
          "未授权更新",
          "",
          "",
          ""
        )
      ).to.be.revertedWith("Not authorized to update");
    });
  });

  describe("暂停功能", function () {
    it("拥有者应该能够暂停合约", async function () {
      await artifactNFT.connect(owner).pause();
      expect(await artifactNFT.paused()).to.be.true;
    });

    it("暂停时不能铸造NFT", async function () {
      await artifactNFT.connect(owner).pause();
      
      await expect(
        artifactNFT.connect(creator).mintArtifact(
          user1.address,
          "ipfs://QmTest",
          "文物名称",
          "来源地",
          "历史时期",
          "文化意义",
          creator.address,
          ROYALTY_FRACTION
        )
      ).to.be.revertedWith("Pausable: paused");
    });

    it("拥有者应该能够恢复合约", async function () {
      await artifactNFT.connect(owner).pause();
      await artifactNFT.connect(owner).unpause();
      expect(await artifactNFT.paused()).to.be.false;
    });
  });

  describe("销毁NFT", function () {
    beforeEach(async function () {
      await artifactNFT.connect(creator).mintArtifact(
        user1.address,
        "ipfs://QmTest",
        "文物名称",
        "来源地",
        "历史时期",
        "文化意义",
        creator.address,
        ROYALTY_FRACTION
      );
    });

    it("NFT拥有者应该能够销毁NFT", async function () {
      await artifactNFT.connect(user1).burn(0);
      
      await expect(artifactNFT.ownerOf(0)).to.be.revertedWith("ERC721: invalid token ID");
    });

    it("非拥有者不能销毁NFT", async function () {
      await expect(
        artifactNFT.connect(user2).burn(0)
      ).to.be.revertedWith("ERC721: caller is not token owner or approved");
    });
  });
});

