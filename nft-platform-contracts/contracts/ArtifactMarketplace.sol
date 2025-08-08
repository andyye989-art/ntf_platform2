// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

import "@openzeppelin/contracts/security/ReentrancyGuard.sol";
import "@openzeppelin/contracts/security/Pausable.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/token/ERC721/IERC721.sol";
import "@openzeppelin/contracts/token/ERC721/IERC721Receiver.sol";
import "@openzeppelin/contracts/utils/Counters.sol";
import "@openzeppelin/contracts/utils/Address.sol";

/**
 * @title ArtifactMarketplace
 * @dev 数字文物NFT交易市场智能合约
 * 支持固定价格销售、拍卖、版税分配等功能
 */
contract ArtifactMarketplace is ReentrancyGuard, Pausable, Ownable, IERC721Receiver {
    using Counters for Counters.Counter;
    using Address for address payable;

    // 挂单ID计数器
    Counters.Counter private _listingIdCounter;
    
    // 竞价ID计数器
    Counters.Counter private _bidIdCounter;
    
    // 挂单类型枚举
    enum ListingType {
        FixedPrice,  // 固定价格
        Auction      // 拍卖
    }
    
    // 挂单状态枚举
    enum ListingStatus {
        Active,      // 活跃
        Sold,        // 已售出
        Cancelled,   // 已取消
        Expired      // 已过期
    }
    
    // 竞价状态枚举
    enum BidStatus {
        Active,      // 活跃
        Accepted,    // 已接受
        Rejected,    // 已拒绝
        Withdrawn    // 已撤回
    }
    
    // 挂单结构体
    struct Listing {
        uint256 listingId;
        address nftContract;
        uint256 tokenId;
        address seller;
        ListingType listingType;
        uint256 price;
        uint256 startTime;
        uint256 endTime;
        ListingStatus status;
        uint256 highestBid;
        address highestBidder;
        uint256 createdAt;
    }
    
    // 竞价结构体
    struct Bid {
        uint256 bidId;
        uint256 listingId;
        address bidder;
        uint256 amount;
        uint256 expiresAt;
        BidStatus status;
        uint256 createdAt;
    }
    
    // 版税信息结构体
    struct RoyaltyInfo {
        address recipient;
        uint256 amount;
    }
    
    // 映射：挂单ID => 挂单信息
    mapping(uint256 => Listing) private _listings;
    
    // 映射：竞价ID => 竞价信息
    mapping(uint256 => Bid) private _bids;
    
    // 映射：挂单ID => 竞价ID数组
    mapping(uint256 => uint256[]) private _listingBids;
    
    // 映射：用户地址 => 挂单ID数组
    mapping(address => uint256[]) private _userListings;
    
    // 映射：用户地址 => 竞价ID数组
    mapping(address => uint256[]) private _userBids;
    
    // 映射：NFT合约地址 => Token ID => 挂单ID
    mapping(address => mapping(uint256 => uint256)) private _tokenListings;
    
    // 平台费用比例（基于10000）
    uint256 private _platformFeeNumerator = 250; // 2.5%
    
    // 平台费用接收地址
    address private _platformFeeRecipient;
    
    // 最小拍卖持续时间（秒）
    uint256 public constant MIN_AUCTION_DURATION = 3600; // 1小时
    
    // 最大拍卖持续时间（秒）
    uint256 public constant MAX_AUCTION_DURATION = 2592000; // 30天
    
    // 拍卖延长时间（秒）
    uint256 public constant AUCTION_EXTENSION_TIME = 600; // 10分钟
    
    // 最小竞价增幅（基于10000）
    uint256 public constant MIN_BID_INCREMENT = 500; // 5%
    
    // 事件定义
    event ListingCreated(
        uint256 indexed listingId,
        address indexed nftContract,
        uint256 indexed tokenId,
        address seller,
        ListingType listingType,
        uint256 price,
        uint256 startTime,
        uint256 endTime
    );
    
    event ListingCancelled(
        uint256 indexed listingId,
        address indexed seller
    );
    
    event ListingSold(
        uint256 indexed listingId,
        address indexed nftContract,
        uint256 indexed tokenId,
        address seller,
        address buyer,
        uint256 price
    );
    
    event BidPlaced(
        uint256 indexed bidId,
        uint256 indexed listingId,
        address indexed bidder,
        uint256 amount
    );
    
    event BidAccepted(
        uint256 indexed bidId,
        uint256 indexed listingId,
        address indexed bidder,
        uint256 amount
    );
    
    event BidWithdrawn(
        uint256 indexed bidId,
        address indexed bidder,
        uint256 amount
    );
    
    event AuctionExtended(
        uint256 indexed listingId,
        uint256 newEndTime
    );
    
    /**
     * @dev 构造函数
     * @param platformFeeRecipient 平台费用接收地址
     */
    constructor(address platformFeeRecipient) {
        require(platformFeeRecipient != address(0), "Invalid platform fee recipient");
        _platformFeeRecipient = platformFeeRecipient;
    }
    
    /**
     * @dev 创建固定价格挂单
     * @param nftContract NFT合约地址
     * @param tokenId Token ID
     * @param price 价格
     */
    function createFixedPriceListing(
        address nftContract,
        uint256 tokenId,
        uint256 price
    ) public whenNotPaused nonReentrant returns (uint256) {
        require(nftContract != address(0), "Invalid NFT contract");
        require(price > 0, "Price must be greater than 0");
        
        IERC721 nft = IERC721(nftContract);
        require(nft.ownerOf(tokenId) == msg.sender, "Not the owner of the token");
        require(nft.isApprovedForAll(msg.sender, address(this)) || 
                nft.getApproved(tokenId) == address(this), "Contract not approved");
        require(_tokenListings[nftContract][tokenId] == 0, "Token already listed");
        
        uint256 listingId = _listingIdCounter.current();
        _listingIdCounter.increment();
        
        _listings[listingId] = Listing({
            listingId: listingId,
            nftContract: nftContract,
            tokenId: tokenId,
            seller: msg.sender,
            listingType: ListingType.FixedPrice,
            price: price,
            startTime: block.timestamp,
            endTime: 0, // 固定价格无结束时间
            status: ListingStatus.Active,
            highestBid: 0,
            highestBidder: address(0),
            createdAt: block.timestamp
        });
        
        _tokenListings[nftContract][tokenId] = listingId;
        _userListings[msg.sender].push(listingId);
        
        // 托管NFT
        nft.safeTransferFrom(msg.sender, address(this), tokenId);
        
        emit ListingCreated(
            listingId,
            nftContract,
            tokenId,
            msg.sender,
            ListingType.FixedPrice,
            price,
            block.timestamp,
            0
        );
        
        return listingId;
    }
    
    /**
     * @dev 创建拍卖挂单
     * @param nftContract NFT合约地址
     * @param tokenId Token ID
     * @param startingPrice 起始价格
     * @param duration 拍卖持续时间（秒）
     */
    function createAuctionListing(
        address nftContract,
        uint256 tokenId,
        uint256 startingPrice,
        uint256 duration
    ) public whenNotPaused nonReentrant returns (uint256) {
        require(nftContract != address(0), "Invalid NFT contract");
        require(startingPrice > 0, "Starting price must be greater than 0");
        require(duration >= MIN_AUCTION_DURATION && duration <= MAX_AUCTION_DURATION, 
                "Invalid auction duration");
        
        IERC721 nft = IERC721(nftContract);
        require(nft.ownerOf(tokenId) == msg.sender, "Not the owner of the token");
        require(nft.isApprovedForAll(msg.sender, address(this)) || 
                nft.getApproved(tokenId) == address(this), "Contract not approved");
        require(_tokenListings[nftContract][tokenId] == 0, "Token already listed");
        
        uint256 listingId = _listingIdCounter.current();
        _listingIdCounter.increment();
        
        uint256 endTime = block.timestamp + duration;
        
        _listings[listingId] = Listing({
            listingId: listingId,
            nftContract: nftContract,
            tokenId: tokenId,
            seller: msg.sender,
            listingType: ListingType.Auction,
            price: startingPrice,
            startTime: block.timestamp,
            endTime: endTime,
            status: ListingStatus.Active,
            highestBid: 0,
            highestBidder: address(0),
            createdAt: block.timestamp
        });
        
        _tokenListings[nftContract][tokenId] = listingId;
        _userListings[msg.sender].push(listingId);
        
        // 托管NFT
        nft.safeTransferFrom(msg.sender, address(this), tokenId);
        
        emit ListingCreated(
            listingId,
            nftContract,
            tokenId,
            msg.sender,
            ListingType.Auction,
            startingPrice,
            block.timestamp,
            endTime
        );
        
        return listingId;
    }
    
    /**
     * @dev 购买固定价格NFT
     * @param listingId 挂单ID
     */
    function buyFixedPrice(uint256 listingId) public payable whenNotPaused nonReentrant {
        Listing storage listing = _listings[listingId];
        require(listing.status == ListingStatus.Active, "Listing not active");
        require(listing.listingType == ListingType.FixedPrice, "Not a fixed price listing");
        require(msg.value >= listing.price, "Insufficient payment");
        require(msg.sender != listing.seller, "Cannot buy your own listing");
        
        // 更新挂单状态
        listing.status = ListingStatus.Sold;
        delete _tokenListings[listing.nftContract][listing.tokenId];
        
        // 转移NFT
        IERC721(listing.nftContract).safeTransferFrom(
            address(this),
            msg.sender,
            listing.tokenId
        );
        
        // 分配资金
        _distributeFunds(listing.nftContract, listing.tokenId, listing.seller, listing.price);
        
        // 退还多余的ETH
        if (msg.value > listing.price) {
            payable(msg.sender).sendValue(msg.value - listing.price);
        }
        
        emit ListingSold(
            listingId,
            listing.nftContract,
            listing.tokenId,
            listing.seller,
            msg.sender,
            listing.price
        );
    }
    
    /**
     * @dev 对拍卖进行竞价
     * @param listingId 挂单ID
     */
    function placeBid(uint256 listingId) public payable whenNotPaused nonReentrant {
        Listing storage listing = _listings[listingId];
        require(listing.status == ListingStatus.Active, "Listing not active");
        require(listing.listingType == ListingType.Auction, "Not an auction listing");
        require(block.timestamp < listing.endTime, "Auction has ended");
        require(msg.sender != listing.seller, "Cannot bid on your own auction");
        
        uint256 minBidAmount;
        if (listing.highestBid == 0) {
            minBidAmount = listing.price;
        } else {
            minBidAmount = listing.highestBid + (listing.highestBid * MIN_BID_INCREMENT / 10000);
        }
        
        require(msg.value >= minBidAmount, "Bid too low");
        
        // 退还之前的最高竞价
        if (listing.highestBidder != address(0)) {
            payable(listing.highestBidder).sendValue(listing.highestBid);
        }
        
        // 更新最高竞价
        listing.highestBid = msg.value;
        listing.highestBidder = msg.sender;
        
        // 创建竞价记录
        uint256 bidId = _bidIdCounter.current();
        _bidIdCounter.increment();
        
        _bids[bidId] = Bid({
            bidId: bidId,
            listingId: listingId,
            bidder: msg.sender,
            amount: msg.value,
            expiresAt: listing.endTime,
            status: BidStatus.Active,
            createdAt: block.timestamp
        });
        
        _listingBids[listingId].push(bidId);
        _userBids[msg.sender].push(bidId);
        
        // 如果在拍卖结束前10分钟内竞价，延长拍卖时间
        if (listing.endTime - block.timestamp < AUCTION_EXTENSION_TIME) {
            listing.endTime = block.timestamp + AUCTION_EXTENSION_TIME;
            emit AuctionExtended(listingId, listing.endTime);
        }
        
        emit BidPlaced(bidId, listingId, msg.sender, msg.value);
    }
    
    /**
     * @dev 结束拍卖
     * @param listingId 挂单ID
     */
    function endAuction(uint256 listingId) public whenNotPaused nonReentrant {
        Listing storage listing = _listings[listingId];
        require(listing.status == ListingStatus.Active, "Listing not active");
        require(listing.listingType == ListingType.Auction, "Not an auction listing");
        require(block.timestamp >= listing.endTime, "Auction has not ended");
        
        if (listing.highestBidder == address(0)) {
            // 没有竞价，返还NFT给卖家
            listing.status = ListingStatus.Expired;
            IERC721(listing.nftContract).safeTransferFrom(
                address(this),
                listing.seller,
                listing.tokenId
            );
        } else {
            // 有竞价，完成交易
            listing.status = ListingStatus.Sold;
            
            // 转移NFT给最高竞价者
            IERC721(listing.nftContract).safeTransferFrom(
                address(this),
                listing.highestBidder,
                listing.tokenId
            );
            
            // 分配资金
            _distributeFunds(
                listing.nftContract,
                listing.tokenId,
                listing.seller,
                listing.highestBid
            );
            
            emit ListingSold(
                listingId,
                listing.nftContract,
                listing.tokenId,
                listing.seller,
                listing.highestBidder,
                listing.highestBid
            );
        }
        
        delete _tokenListings[listing.nftContract][listing.tokenId];
    }
    
    /**
     * @dev 取消挂单
     * @param listingId 挂单ID
     */
    function cancelListing(uint256 listingId) public whenNotPaused nonReentrant {
        Listing storage listing = _listings[listingId];
        require(listing.status == ListingStatus.Active, "Listing not active");
        require(msg.sender == listing.seller || msg.sender == owner(), "Not authorized");
        
        if (listing.listingType == ListingType.Auction && listing.highestBidder != address(0)) {
            // 拍卖有竞价，退还最高竞价
            payable(listing.highestBidder).sendValue(listing.highestBid);
        }
        
        listing.status = ListingStatus.Cancelled;
        delete _tokenListings[listing.nftContract][listing.tokenId];
        
        // 返还NFT给卖家
        IERC721(listing.nftContract).safeTransferFrom(
            address(this),
            listing.seller,
            listing.tokenId
        );
        
        emit ListingCancelled(listingId, listing.seller);
    }
    
    /**
     * @dev 分配资金（包括版税和平台费用）
     * @param nftContract NFT合约地址
     * @param tokenId Token ID
     * @param seller 卖家地址
     * @param salePrice 销售价格
     */
    function _distributeFunds(
        address nftContract,
        uint256 tokenId,
        address seller,
        uint256 salePrice
    ) internal {
        uint256 remainingAmount = salePrice;
        
        // 计算并支付平台费用
        uint256 platformFee = (salePrice * _platformFeeNumerator) / 10000;
        if (platformFee > 0) {
            payable(_platformFeeRecipient).sendValue(platformFee);
            remainingAmount -= platformFee;
        }
        
        // 尝试获取版税信息
        try this.getRoyaltyInfo(nftContract, tokenId, salePrice) returns (
            address royaltyRecipient,
            uint256 royaltyAmount
        ) {
            if (royaltyRecipient != address(0) && royaltyAmount > 0 && royaltyRecipient != seller) {
                payable(royaltyRecipient).sendValue(royaltyAmount);
                remainingAmount -= royaltyAmount;
            }
        } catch {
            // 如果获取版税信息失败，继续执行
        }
        
        // 支付剩余金额给卖家
        if (remainingAmount > 0) {
            payable(seller).sendValue(remainingAmount);
        }
    }
    
    /**
     * @dev 获取版税信息（外部调用）
     * @param nftContract NFT合约地址
     * @param tokenId Token ID
     * @param salePrice 销售价格
     */
    function getRoyaltyInfo(
        address nftContract,
        uint256 tokenId,
        uint256 salePrice
    ) external view returns (address, uint256) {
        // 尝试调用ERC2981标准的royaltyInfo函数
        try IERC165(nftContract).supportsInterface(0x2a55205a) returns (bool supported) {
            if (supported) {
                (bool success, bytes memory data) = nftContract.staticcall(
                    abi.encodeWithSignature("royaltyInfo(uint256,uint256)", tokenId, salePrice)
                );
                if (success && data.length >= 64) {
                    return abi.decode(data, (address, uint256));
                }
            }
        } catch {}
        
        return (address(0), 0);
    }
    
    /**
     * @dev 获取挂单信息
     * @param listingId 挂单ID
     */
    function getListing(uint256 listingId) public view returns (Listing memory) {
        return _listings[listingId];
    }
    
    /**
     * @dev 获取竞价信息
     * @param bidId 竞价ID
     */
    function getBid(uint256 bidId) public view returns (Bid memory) {
        return _bids[bidId];
    }
    
    /**
     * @dev 获取用户的挂单列表
     * @param user 用户地址
     */
    function getUserListings(address user) public view returns (uint256[] memory) {
        return _userListings[user];
    }
    
    /**
     * @dev 获取用户的竞价列表
     * @param user 用户地址
     */
    function getUserBids(address user) public view returns (uint256[] memory) {
        return _userBids[user];
    }
    
    /**
     * @dev 获取挂单的竞价列表
     * @param listingId 挂单ID
     */
    function getListingBids(uint256 listingId) public view returns (uint256[] memory) {
        return _listingBids[listingId];
    }
    
    /**
     * @dev 设置平台费用
     * @param feeNumerator 费用比例
     * @param feeRecipient 费用接收地址
     */
    function setPlatformFee(uint256 feeNumerator, address feeRecipient) public onlyOwner {
        require(feeNumerator <= 1000, "Fee too high"); // 最大10%
        require(feeRecipient != address(0), "Invalid recipient");
        
        _platformFeeNumerator = feeNumerator;
        _platformFeeRecipient = feeRecipient;
    }
    
    /**
     * @dev 获取平台费用信息
     */
    function getPlatformFeeInfo() public view returns (uint256, address) {
        return (_platformFeeNumerator, _platformFeeRecipient);
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
     * @dev 紧急提取ETH（仅限合约拥有者）
     */
    function emergencyWithdraw() public onlyOwner {
        payable(owner()).sendValue(address(this).balance);
    }
    
    /**
     * @dev 实现IERC721Receiver接口
     */
    function onERC721Received(
        address,
        address,
        uint256,
        bytes calldata
    ) external pure override returns (bytes4) {
        return IERC721Receiver.onERC721Received.selector;
    }
    
    /**
     * @dev 获取下一个挂单ID
     */
    function nextListingId() public view returns (uint256) {
        return _listingIdCounter.current();
    }
    
    /**
     * @dev 获取下一个竞价ID
     */
    function nextBidId() public view returns (uint256) {
        return _bidIdCounter.current();
    }
}

