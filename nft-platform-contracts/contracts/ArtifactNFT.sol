// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

import "@openzeppelin/contracts/token/ERC721/ERC721.sol";
import "@openzeppelin/contracts/token/ERC721/extensions/ERC721URIStorage.sol";
import "@openzeppelin/contracts/token/ERC721/extensions/ERC721Burnable.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/security/Pausable.sol";
import "@openzeppelin/contracts/utils/Counters.sol";
import "@openzeppelin/contracts/security/ReentrancyGuard.sol";

/**
 * @title ArtifactNFT
 * @dev 数字文物NFT智能合约
 * 支持文物数字化、NFT铸造、版税分配等功能
 */
contract ArtifactNFT is ERC721, ERC721URIStorage, ERC721Burnable, Ownable, Pausable, ReentrancyGuard {
    using Counters for Counters.Counter;

    // Token ID计数器
    Counters.Counter private _tokenIdCounter;
    
    // 版税信息结构体
    struct RoyaltyInfo {
        address recipient;
        uint96 royaltyFraction; // 基于10000的分数，例如500表示5%
    }
    
    // 文物信息结构体
    struct ArtifactInfo {
        string artifactName;        // 文物名称
        string originLocation;      // 来源地
        string historicalPeriod;    // 历史时期
        string culturalSignificance; // 文化意义
        uint256 creationTimestamp;  // 创建时间戳
        address creator;            // 创建者地址
        bool isVerified;           // 是否已验证
    }
    
    // 映射：tokenId => 版税信息
    mapping(uint256 => RoyaltyInfo) private _tokenRoyalties;
    
    // 映射：tokenId => 文物信息
    mapping(uint256 => ArtifactInfo) private _artifactInfos;
    
    // 映射：创建者地址 => 是否为认证创建者
    mapping(address => bool) private _verifiedCreators;
    
    // 映射：tokenId => 是否为限量版
    mapping(uint256 => bool) private _limitedEditions;
    
    // 平台费用接收地址
    address private _platformFeeRecipient;
    
    // 平台费用比例（基于10000）
    uint96 private _platformFeeNumerator;
    
    // 最大版税比例（基于10000）
    uint96 public constant MAX_ROYALTY_FRACTION = 1000; // 10%
    
    // 事件定义
    event ArtifactMinted(
        uint256 indexed tokenId,
        address indexed creator,
        address indexed to,
        string tokenURI,
        string artifactName
    );
    
    event RoyaltySet(
        uint256 indexed tokenId,
        address indexed recipient,
        uint96 royaltyFraction
    );
    
    event CreatorVerified(address indexed creator);
    event CreatorUnverified(address indexed creator);
    
    event ArtifactInfoUpdated(
        uint256 indexed tokenId,
        string artifactName,
        string originLocation,
        string historicalPeriod
    );
    
    /**
     * @dev 构造函数
     * @param name NFT集合名称
     * @param symbol NFT集合符号
     * @param platformFeeRecipient 平台费用接收地址
     * @param platformFeeNumerator 平台费用比例
     */
    constructor(
        string memory name,
        string memory symbol,
        address platformFeeRecipient,
        uint96 platformFeeNumerator
    ) ERC721(name, symbol) {
        require(platformFeeRecipient != address(0), "Invalid platform fee recipient");
        require(platformFeeNumerator <= 1000, "Platform fee too high"); // 最大10%
        
        _platformFeeRecipient = platformFeeRecipient;
        _platformFeeNumerator = platformFeeNumerator;
    }
    
    /**
     * @dev 铸造文物NFT
     * @param to 接收者地址
     * @param tokenURI 元数据URI
     * @param artifactName 文物名称
     * @param originLocation 来源地
     * @param historicalPeriod 历史时期
     * @param culturalSignificance 文化意义
     * @param royaltyRecipient 版税接收者
     * @param royaltyFraction 版税比例
     */
    function mintArtifact(
        address to,
        string memory tokenURI,
        string memory artifactName,
        string memory originLocation,
        string memory historicalPeriod,
        string memory culturalSignificance,
        address royaltyRecipient,
        uint96 royaltyFraction
    ) public whenNotPaused nonReentrant returns (uint256) {
        require(to != address(0), "Cannot mint to zero address");
        require(bytes(tokenURI).length > 0, "Token URI cannot be empty");
        require(bytes(artifactName).length > 0, "Artifact name cannot be empty");
        require(royaltyFraction <= MAX_ROYALTY_FRACTION, "Royalty fraction too high");
        
        uint256 tokenId = _tokenIdCounter.current();
        _tokenIdCounter.increment();
        
        // 铸造NFT
        _safeMint(to, tokenId);
        _setTokenURI(tokenId, tokenURI);
        
        // 设置文物信息
        _artifactInfos[tokenId] = ArtifactInfo({
            artifactName: artifactName,
            originLocation: originLocation,
            historicalPeriod: historicalPeriod,
            culturalSignificance: culturalSignificance,
            creationTimestamp: block.timestamp,
            creator: msg.sender,
            isVerified: _verifiedCreators[msg.sender]
        });
        
        // 设置版税信息
        if (royaltyRecipient != address(0) && royaltyFraction > 0) {
            _setTokenRoyalty(tokenId, royaltyRecipient, royaltyFraction);
        }
        
        emit ArtifactMinted(tokenId, msg.sender, to, tokenURI, artifactName);
        
        return tokenId;
    }
    
    /**
     * @dev 批量铸造文物NFT
     * @param to 接收者地址
     * @param tokenURIs 元数据URI数组
     * @param artifactNames 文物名称数组
     * @param royaltyRecipient 版税接收者
     * @param royaltyFraction 版税比例
     */
    function batchMintArtifacts(
        address to,
        string[] memory tokenURIs,
        string[] memory artifactNames,
        address royaltyRecipient,
        uint96 royaltyFraction
    ) public whenNotPaused nonReentrant returns (uint256[] memory) {
        require(tokenURIs.length == artifactNames.length, "Arrays length mismatch");
        require(tokenURIs.length > 0 && tokenURIs.length <= 50, "Invalid batch size");
        
        uint256[] memory tokenIds = new uint256[](tokenURIs.length);
        
        for (uint256 i = 0; i < tokenURIs.length; i++) {
            tokenIds[i] = mintArtifact(
                to,
                tokenURIs[i],
                artifactNames[i],
                "", // originLocation
                "", // historicalPeriod
                "", // culturalSignificance
                royaltyRecipient,
                royaltyFraction
            );
        }
        
        return tokenIds;
    }
    
    /**
     * @dev 设置Token版税信息
     * @param tokenId Token ID
     * @param recipient 版税接收者
     * @param royaltyFraction 版税比例
     */
    function _setTokenRoyalty(
        uint256 tokenId,
        address recipient,
        uint96 royaltyFraction
    ) internal {
        require(royaltyFraction <= MAX_ROYALTY_FRACTION, "Royalty fraction too high");
        require(recipient != address(0), "Invalid royalty recipient");
        
        _tokenRoyalties[tokenId] = RoyaltyInfo(recipient, royaltyFraction);
        emit RoyaltySet(tokenId, recipient, royaltyFraction);
    }
    
    /**
     * @dev 更新文物信息（仅创建者或合约拥有者可调用）
     * @param tokenId Token ID
     * @param artifactName 文物名称
     * @param originLocation 来源地
     * @param historicalPeriod 历史时期
     * @param culturalSignificance 文化意义
     */
    function updateArtifactInfo(
        uint256 tokenId,
        string memory artifactName,
        string memory originLocation,
        string memory historicalPeriod,
        string memory culturalSignificance
    ) public {
        require(_exists(tokenId), "Token does not exist");
        require(
            msg.sender == _artifactInfos[tokenId].creator || msg.sender == owner(),
            "Not authorized to update"
        );
        
        ArtifactInfo storage info = _artifactInfos[tokenId];
        if (bytes(artifactName).length > 0) {
            info.artifactName = artifactName;
        }
        if (bytes(originLocation).length > 0) {
            info.originLocation = originLocation;
        }
        if (bytes(historicalPeriod).length > 0) {
            info.historicalPeriod = historicalPeriod;
        }
        if (bytes(culturalSignificance).length > 0) {
            info.culturalSignificance = culturalSignificance;
        }
        
        emit ArtifactInfoUpdated(tokenId, artifactName, originLocation, historicalPeriod);
    }
    
    /**
     * @dev 验证创建者
     * @param creator 创建者地址
     */
    function verifyCreator(address creator) public onlyOwner {
        require(creator != address(0), "Invalid creator address");
        _verifiedCreators[creator] = true;
        emit CreatorVerified(creator);
    }
    
    /**
     * @dev 取消验证创建者
     * @param creator 创建者地址
     */
    function unverifyCreator(address creator) public onlyOwner {
        _verifiedCreators[creator] = false;
        emit CreatorUnverified(creator);
    }
    
    /**
     * @dev 检查创建者是否已验证
     * @param creator 创建者地址
     */
    function isVerifiedCreator(address creator) public view returns (bool) {
        return _verifiedCreators[creator];
    }
    
    /**
     * @dev 获取文物信息
     * @param tokenId Token ID
     */
    function getArtifactInfo(uint256 tokenId) public view returns (ArtifactInfo memory) {
        require(_exists(tokenId), "Token does not exist");
        return _artifactInfos[tokenId];
    }
    
    /**
     * @dev 获取版税信息
     * @param tokenId Token ID
     * @param salePrice 销售价格
     */
    function royaltyInfo(uint256 tokenId, uint256 salePrice)
        public
        view
        returns (address, uint256)
    {
        RoyaltyInfo memory royalty = _tokenRoyalties[tokenId];
        
        if (royalty.recipient == address(0)) {
            return (address(0), 0);
        }
        
        uint256 royaltyAmount = (salePrice * royalty.royaltyFraction) / 10000;
        return (royalty.recipient, royaltyAmount);
    }
    
    /**
     * @dev 获取平台费用信息
     * @param salePrice 销售价格
     */
    function platformFeeInfo(uint256 salePrice) public view returns (address, uint256) {
        uint256 platformFee = (salePrice * _platformFeeNumerator) / 10000;
        return (_platformFeeRecipient, platformFee);
    }
    
    /**
     * @dev 设置平台费用
     * @param recipient 费用接收者
     * @param feeNumerator 费用比例
     */
    function setPlatformFee(address recipient, uint96 feeNumerator) public onlyOwner {
        require(recipient != address(0), "Invalid recipient");
        require(feeNumerator <= 1000, "Fee too high"); // 最大10%
        
        _platformFeeRecipient = recipient;
        _platformFeeNumerator = feeNumerator;
    }
    
    /**
     * @dev 暂停合约
     */
    function pause() public onlyOwner {
        _pause();
    }
    
    /**
     * @dev 恢复合约
     */
    function unpause() public onlyOwner {
        _unpause();
    }
    
    /**
     * @dev 获取下一个Token ID
     */
    function nextTokenId() public view returns (uint256) {
        return _tokenIdCounter.current();
    }
    
    /**
     * @dev 检查是否支持接口
     */
    function supportsInterface(bytes4 interfaceId)
        public
        view
        override(ERC721, ERC721URIStorage)
        returns (bool)
    {
        return
            interfaceId == 0x2a55205a || // ERC2981 (Royalty Standard)
            super.supportsInterface(interfaceId);
    }
    
    /**
     * @dev 重写_burn函数
     */
    function _burn(uint256 tokenId) internal override(ERC721, ERC721URIStorage) {
        super._burn(tokenId);
        
        // 清除版税信息
        delete _tokenRoyalties[tokenId];
        
        // 清除文物信息
        delete _artifactInfos[tokenId];
    }
    
    /**
     * @dev 重写tokenURI函数
     */
    function tokenURI(uint256 tokenId)
        public
        view
        override(ERC721, ERC721URIStorage)
        returns (string memory)
    {
        return super.tokenURI(tokenId);
    }
    
    /**
     * @dev 重写_beforeTokenTransfer函数
     */
    function _beforeTokenTransfer(
        address from,
        address to,
        uint256 tokenId,
        uint256 batchSize
    ) internal override whenNotPaused {
        super._beforeTokenTransfer(from, to, tokenId, batchSize);
    }
}

