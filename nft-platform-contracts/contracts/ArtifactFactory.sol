// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

import "./ArtifactNFT.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/security/Pausable.sol";
import "@openzeppelin/contracts/utils/Counters.sol";

/**
 * @title ArtifactFactory
 * @dev 文物NFT工厂合约，用于创建和管理文物NFT集合
 */
contract ArtifactFactory is Ownable, Pausable {
    using Counters for Counters.Counter;
    
    // 集合ID计数器
    Counters.Counter private _collectionIdCounter;
    
    // 集合信息结构体
    struct CollectionInfo {
        uint256 collectionId;
        address contractAddress;
        address creator;
        string name;
        string symbol;
        string description;
        string coverImage;
        string bannerImage;
        uint256 createdAt;
        bool isVerified;
        bool isActive;
    }
    
    // 映射：集合ID => 集合信息
    mapping(uint256 => CollectionInfo) private _collections;
    
    // 映射：合约地址 => 集合ID
    mapping(address => uint256) private _contractToCollection;
    
    // 映射：创建者地址 => 集合ID数组
    mapping(address => uint256[]) private _creatorCollections;
    
    // 映射：创建者地址 => 是否为认证创建者
    mapping(address => bool) private _verifiedCreators;
    
    // 所有集合ID数组
    uint256[] private _allCollections;
    
    // 平台费用接收地址
    address private _platformFeeRecipient;
    
    // 平台费用比例（基于10000）
    uint96 private _platformFeeNumerator;
    
    // 创建集合费用
    uint256 private _collectionCreationFee;
    
    // 事件定义
    event CollectionCreated(
        uint256 indexed collectionId,
        address indexed contractAddress,
        address indexed creator,
        string name,
        string symbol
    );
    
    event CollectionVerified(
        uint256 indexed collectionId,
        address indexed contractAddress
    );
    
    event CollectionUnverified(
        uint256 indexed collectionId,
        address indexed contractAddress
    );
    
    event CollectionDeactivated(
        uint256 indexed collectionId,
        address indexed contractAddress
    );
    
    event CreatorVerified(address indexed creator);
    event CreatorUnverified(address indexed creator);
    
    event CollectionInfoUpdated(
        uint256 indexed collectionId,
        string name,
        string description,
        string coverImage,
        string bannerImage
    );
    
    /**
     * @dev 构造函数
     * @param platformFeeRecipient 平台费用接收地址
     * @param platformFeeNumerator 平台费用比例
     * @param collectionCreationFee 创建集合费用
     */
    constructor(
        address platformFeeRecipient,
        uint96 platformFeeNumerator,
        uint256 collectionCreationFee
    ) {
        require(platformFeeRecipient != address(0), "Invalid platform fee recipient");
        require(platformFeeNumerator <= 1000, "Platform fee too high"); // 最大10%
        
        _platformFeeRecipient = platformFeeRecipient;
        _platformFeeNumerator = platformFeeNumerator;
        _collectionCreationFee = collectionCreationFee;
    }
    
    /**
     * @dev 创建文物NFT集合
     * @param name 集合名称
     * @param symbol 集合符号
     * @param description 集合描述
     * @param coverImage 封面图片URL
     * @param bannerImage 横幅图片URL
     */
    function createCollection(
        string memory name,
        string memory symbol,
        string memory description,
        string memory coverImage,
        string memory bannerImage
    ) public payable whenNotPaused returns (uint256, address) {
        require(bytes(name).length > 0, "Name cannot be empty");
        require(bytes(symbol).length > 0, "Symbol cannot be empty");
        require(msg.value >= _collectionCreationFee, "Insufficient creation fee");
        
        // 部署新的ArtifactNFT合约
        ArtifactNFT newCollection = new ArtifactNFT(
            name,
            symbol,
            _platformFeeRecipient,
            _platformFeeNumerator
        );
        
        // 将合约所有权转移给创建者
        newCollection.transferOwnership(msg.sender);
        
        uint256 collectionId = _collectionIdCounter.current();
        _collectionIdCounter.increment();
        
        // 创建集合信息
        _collections[collectionId] = CollectionInfo({
            collectionId: collectionId,
            contractAddress: address(newCollection),
            creator: msg.sender,
            name: name,
            symbol: symbol,
            description: description,
            coverImage: coverImage,
            bannerImage: bannerImage,
            createdAt: block.timestamp,
            isVerified: _verifiedCreators[msg.sender],
            isActive: true
        });
        
        // 更新映射
        _contractToCollection[address(newCollection)] = collectionId;
        _creatorCollections[msg.sender].push(collectionId);
        _allCollections.push(collectionId);
        
        // 收取创建费用
        if (_collectionCreationFee > 0) {
            payable(_platformFeeRecipient).transfer(_collectionCreationFee);
        }
        
        // 退还多余的ETH
        if (msg.value > _collectionCreationFee) {
            payable(msg.sender).transfer(msg.value - _collectionCreationFee);
        }
        
        emit CollectionCreated(
            collectionId,
            address(newCollection),
            msg.sender,
            name,
            symbol
        );
        
        return (collectionId, address(newCollection));
    }
    
    /**
     * @dev 批量创建文物NFT集合
     * @param names 集合名称数组
     * @param symbols 集合符号数组
     * @param descriptions 集合描述数组
     */
    function batchCreateCollections(
        string[] memory names,
        string[] memory symbols,
        string[] memory descriptions
    ) public payable whenNotPaused returns (uint256[] memory, address[] memory) {
        require(names.length == symbols.length && symbols.length == descriptions.length, 
                "Arrays length mismatch");
        require(names.length > 0 && names.length <= 10, "Invalid batch size");
        require(msg.value >= _collectionCreationFee * names.length, "Insufficient creation fee");
        
        uint256[] memory collectionIds = new uint256[](names.length);
        address[] memory contractAddresses = new address[](names.length);
        
        for (uint256 i = 0; i < names.length; i++) {
            (uint256 collectionId, address contractAddress) = _createSingleCollection(
                names[i],
                symbols[i],
                descriptions[i],
                "",
                ""
            );
            collectionIds[i] = collectionId;
            contractAddresses[i] = contractAddress;
        }
        
        // 收取创建费用
        uint256 totalFee = _collectionCreationFee * names.length;
        if (totalFee > 0) {
            payable(_platformFeeRecipient).transfer(totalFee);
        }
        
        // 退还多余的ETH
        if (msg.value > totalFee) {
            payable(msg.sender).transfer(msg.value - totalFee);
        }
        
        return (collectionIds, contractAddresses);
    }
    
    /**
     * @dev 内部函数：创建单个集合
     */
    function _createSingleCollection(
        string memory name,
        string memory symbol,
        string memory description,
        string memory coverImage,
        string memory bannerImage
    ) internal returns (uint256, address) {
        require(bytes(name).length > 0, "Name cannot be empty");
        require(bytes(symbol).length > 0, "Symbol cannot be empty");
        
        // 部署新的ArtifactNFT合约
        ArtifactNFT newCollection = new ArtifactNFT(
            name,
            symbol,
            _platformFeeRecipient,
            _platformFeeNumerator
        );
        
        // 将合约所有权转移给创建者
        newCollection.transferOwnership(msg.sender);
        
        uint256 collectionId = _collectionIdCounter.current();
        _collectionIdCounter.increment();
        
        // 创建集合信息
        _collections[collectionId] = CollectionInfo({
            collectionId: collectionId,
            contractAddress: address(newCollection),
            creator: msg.sender,
            name: name,
            symbol: symbol,
            description: description,
            coverImage: coverImage,
            bannerImage: bannerImage,
            createdAt: block.timestamp,
            isVerified: _verifiedCreators[msg.sender],
            isActive: true
        });
        
        // 更新映射
        _contractToCollection[address(newCollection)] = collectionId;
        _creatorCollections[msg.sender].push(collectionId);
        _allCollections.push(collectionId);
        
        emit CollectionCreated(
            collectionId,
            address(newCollection),
            msg.sender,
            name,
            symbol
        );
        
        return (collectionId, address(newCollection));
    }
    
    /**
     * @dev 更新集合信息
     * @param collectionId 集合ID
     * @param name 新名称
     * @param description 新描述
     * @param coverImage 新封面图片
     * @param bannerImage 新横幅图片
     */
    function updateCollectionInfo(
        uint256 collectionId,
        string memory name,
        string memory description,
        string memory coverImage,
        string memory bannerImage
    ) public {
        require(collectionId < _collectionIdCounter.current(), "Collection does not exist");
        
        CollectionInfo storage collection = _collections[collectionId];
        require(collection.creator == msg.sender || msg.sender == owner(), 
                "Not authorized to update");
        require(collection.isActive, "Collection is not active");
        
        if (bytes(name).length > 0) {
            collection.name = name;
        }
        if (bytes(description).length > 0) {
            collection.description = description;
        }
        if (bytes(coverImage).length > 0) {
            collection.coverImage = coverImage;
        }
        if (bytes(bannerImage).length > 0) {
            collection.bannerImage = bannerImage;
        }
        
        emit CollectionInfoUpdated(collectionId, name, description, coverImage, bannerImage);
    }
    
    /**
     * @dev 验证集合
     * @param collectionId 集合ID
     */
    function verifyCollection(uint256 collectionId) public onlyOwner {
        require(collectionId < _collectionIdCounter.current(), "Collection does not exist");
        
        CollectionInfo storage collection = _collections[collectionId];
        require(collection.isActive, "Collection is not active");
        
        collection.isVerified = true;
        
        emit CollectionVerified(collectionId, collection.contractAddress);
    }
    
    /**
     * @dev 取消验证集合
     * @param collectionId 集合ID
     */
    function unverifyCollection(uint256 collectionId) public onlyOwner {
        require(collectionId < _collectionIdCounter.current(), "Collection does not exist");
        
        CollectionInfo storage collection = _collections[collectionId];
        collection.isVerified = false;
        
        emit CollectionUnverified(collectionId, collection.contractAddress);
    }
    
    /**
     * @dev 停用集合
     * @param collectionId 集合ID
     */
    function deactivateCollection(uint256 collectionId) public onlyOwner {
        require(collectionId < _collectionIdCounter.current(), "Collection does not exist");
        
        CollectionInfo storage collection = _collections[collectionId];
        collection.isActive = false;
        
        emit CollectionDeactivated(collectionId, collection.contractAddress);
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
     * @dev 获取集合信息
     * @param collectionId 集合ID
     */
    function getCollection(uint256 collectionId) public view returns (CollectionInfo memory) {
        require(collectionId < _collectionIdCounter.current(), "Collection does not exist");
        return _collections[collectionId];
    }
    
    /**
     * @dev 根据合约地址获取集合信息
     * @param contractAddress 合约地址
     */
    function getCollectionByContract(address contractAddress) public view returns (CollectionInfo memory) {
        uint256 collectionId = _contractToCollection[contractAddress];
        require(collectionId < _collectionIdCounter.current(), "Collection does not exist");
        return _collections[collectionId];
    }
    
    /**
     * @dev 获取创建者的集合列表
     * @param creator 创建者地址
     */
    function getCreatorCollections(address creator) public view returns (uint256[] memory) {
        return _creatorCollections[creator];
    }
    
    /**
     * @dev 获取所有集合ID
     */
    function getAllCollections() public view returns (uint256[] memory) {
        return _allCollections;
    }
    
    /**
     * @dev 获取活跃集合数量
     */
    function getActiveCollectionCount() public view returns (uint256) {
        uint256 count = 0;
        for (uint256 i = 0; i < _allCollections.length; i++) {
            if (_collections[_allCollections[i]].isActive) {
                count++;
            }
        }
        return count;
    }
    
    /**
     * @dev 获取已验证集合数量
     */
    function getVerifiedCollectionCount() public view returns (uint256) {
        uint256 count = 0;
        for (uint256 i = 0; i < _allCollections.length; i++) {
            if (_collections[_allCollections[i]].isVerified && _collections[_allCollections[i]].isActive) {
                count++;
            }
        }
        return count;
    }
    
    /**
     * @dev 分页获取集合列表
     * @param offset 偏移量
     * @param limit 限制数量
     * @param onlyActive 是否只返回活跃集合
     * @param onlyVerified 是否只返回已验证集合
     */
    function getCollectionsPaginated(
        uint256 offset,
        uint256 limit,
        bool onlyActive,
        bool onlyVerified
    ) public view returns (CollectionInfo[] memory, uint256) {
        require(limit > 0 && limit <= 100, "Invalid limit");
        
        uint256[] memory filteredCollections = new uint256[](_allCollections.length);
        uint256 filteredCount = 0;
        
        // 过滤集合
        for (uint256 i = 0; i < _allCollections.length; i++) {
            uint256 collectionId = _allCollections[i];
            CollectionInfo memory collection = _collections[collectionId];
            
            bool include = true;
            if (onlyActive && !collection.isActive) {
                include = false;
            }
            if (onlyVerified && !collection.isVerified) {
                include = false;
            }
            
            if (include) {
                filteredCollections[filteredCount] = collectionId;
                filteredCount++;
            }
        }
        
        // 计算返回数量
        uint256 start = offset;
        uint256 end = offset + limit;
        if (end > filteredCount) {
            end = filteredCount;
        }
        if (start >= filteredCount) {
            return (new CollectionInfo[](0), filteredCount);
        }
        
        uint256 returnCount = end - start;
        CollectionInfo[] memory result = new CollectionInfo[](returnCount);
        
        for (uint256 i = 0; i < returnCount; i++) {
            result[i] = _collections[filteredCollections[start + i]];
        }
        
        return (result, filteredCount);
    }
    
    /**
     * @dev 设置创建集合费用
     * @param fee 新的费用
     */
    function setCollectionCreationFee(uint256 fee) public onlyOwner {
        _collectionCreationFee = fee;
    }
    
    /**
     * @dev 获取创建集合费用
     */
    function getCollectionCreationFee() public view returns (uint256) {
        return _collectionCreationFee;
    }
    
    /**
     * @dev 设置平台费用
     * @param recipient 费用接收地址
     * @param feeNumerator 费用比例
     */
    function setPlatformFee(address recipient, uint96 feeNumerator) public onlyOwner {
        require(recipient != address(0), "Invalid recipient");
        require(feeNumerator <= 1000, "Fee too high"); // 最大10%
        
        _platformFeeRecipient = recipient;
        _platformFeeNumerator = feeNumerator;
    }
    
    /**
     * @dev 获取平台费用信息
     */
    function getPlatformFeeInfo() public view returns (address, uint96) {
        return (_platformFeeRecipient, _platformFeeNumerator);
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
     * @dev 提取合约余额
     */
    function withdraw() public onlyOwner {
        payable(owner()).transfer(address(this).balance);
    }
    
    /**
     * @dev 获取下一个集合ID
     */
    function nextCollectionId() public view returns (uint256) {
        return _collectionIdCounter.current();
    }
}

