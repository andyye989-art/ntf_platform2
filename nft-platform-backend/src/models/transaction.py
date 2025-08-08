from datetime import datetime
from flask_sqlalchemy import SQLAlchemy
from sqlalchemy import Column, Integer, String, Text, DateTime, Boolean, Numeric, ForeignKey, Index, JSON, ForeignKey, Index
from sqlalchemy.orm import relationship
from src.models.user import db

class Transaction(db.Model):
    """交易记录模型"""
    __tablename__ = 'transactions'
    
    id = Column(Integer, primary_key=True, autoincrement=True)
    nft_item_id = Column(Integer, ForeignKey('nft_items.id'), nullable=False)
    transaction_hash = Column(String(66), unique=True, nullable=False)
    transaction_type = Column(String(50), nullable=False)  # mint, transfer, sale, auction
    from_address = Column(String(42))
    to_address = Column(String(42))
    from_user_id = Column(Integer, ForeignKey('users.id'))
    to_user_id = Column(Integer, ForeignKey('users.id'))
    price = Column(Numeric(20, 8))
    currency = Column(String(10))  # ETH, MATIC, etc.
    gas_fee = Column(Numeric(20, 8))
    royalty_fee = Column(Numeric(20, 8))
    platform_fee = Column(Numeric(20, 8))
    block_number = Column(Integer)
    block_timestamp = Column(DateTime)
    status = Column(String(20), default='pending')  # pending, confirmed, failed
    created_at = Column(DateTime, default=datetime.utcnow)
    
    # 关系
    nft_item = relationship("NFTItem", back_populates="transactions")
    from_user = relationship("User", foreign_keys=[from_user_id], back_populates="sent_transactions")
    to_user = relationship("User", foreign_keys=[to_user_id], back_populates="received_transactions")
    
    # 索引
    __table_args__ = (
        Index('idx_transactions_nft_item_id', 'nft_item_id'),
        Index('idx_transactions_transaction_hash', 'transaction_hash'),
        Index('idx_transactions_from_user_id', 'from_user_id'),
        Index('idx_transactions_to_user_id', 'to_user_id'),
        Index('idx_transactions_type', 'transaction_type'),
        Index('idx_transactions_status', 'status'),
        Index('idx_transactions_block_timestamp', 'block_timestamp'),
    )
    
    def to_dict(self):
        return {
            'id': self.id,
            'nft_item_id': self.nft_item_id,
            'transaction_hash': self.transaction_hash,
            'transaction_type': self.transaction_type,
            'from_address': self.from_address,
            'to_address': self.to_address,
            'from_user_id': self.from_user_id,
            'to_user_id': self.to_user_id,
            'price': float(self.price) if self.price else None,
            'currency': self.currency,
            'gas_fee': float(self.gas_fee) if self.gas_fee else None,
            'royalty_fee': float(self.royalty_fee) if self.royalty_fee else None,
            'platform_fee': float(self.platform_fee) if self.platform_fee else None,
            'block_number': self.block_number,
            'block_timestamp': self.block_timestamp.isoformat() if self.block_timestamp else None,
            'status': self.status,
            'created_at': self.created_at.isoformat() if self.created_at else None
        }

class MarketListing(db.Model):
    """市场挂单模型"""
    __tablename__ = 'market_listings'
    
    id = Column(Integer, primary_key=True, autoincrement=True)
    nft_item_id = Column(Integer, ForeignKey('nft_items.id'), nullable=False)
    seller_id = Column(Integer, ForeignKey('users.id'), nullable=False)
    listing_type = Column(String(20), nullable=False)  # fixed_price, auction
    price = Column(Numeric(20, 8), nullable=False)
    currency = Column(String(10), nullable=False)
    start_time = Column(DateTime)
    end_time = Column(DateTime)
    status = Column(String(20), default='active')  # active, sold, cancelled, expired
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    
    # 关系
    nft_item = relationship("NFTItem", back_populates="market_listings")
    seller = relationship("User", back_populates="market_listings")
    bids = relationship("Bid", back_populates="listing", cascade="all, delete-orphan")
    
    # 索引
    __table_args__ = (
        Index('idx_market_listings_nft_item_id', 'nft_item_id'),
        Index('idx_market_listings_seller_id', 'seller_id'),
        Index('idx_market_listings_status', 'status'),
        Index('idx_market_listings_listing_type', 'listing_type'),
        Index('idx_market_listings_price', 'price'),
        Index('idx_market_listings_end_time', 'end_time'),
    )
    
    def to_dict(self, include_bids=False):
        result = {
            'id': self.id,
            'nft_item_id': self.nft_item_id,
            'seller_id': self.seller_id,
            'listing_type': self.listing_type,
            'price': float(self.price),
            'currency': self.currency,
            'start_time': self.start_time.isoformat() if self.start_time else None,
            'end_time': self.end_time.isoformat() if self.end_time else None,
            'status': self.status,
            'created_at': self.created_at.isoformat() if self.created_at else None,
            'updated_at': self.updated_at.isoformat() if self.updated_at else None
        }
        
        if include_bids and self.bids:
            result['bids'] = [bid.to_dict() for bid in self.bids]
            
        return result

class Bid(db.Model):
    """竞价记录模型"""
    __tablename__ = 'bids'
    
    id = Column(Integer, primary_key=True, autoincrement=True)
    listing_id = Column(Integer, ForeignKey('market_listings.id'), nullable=False)
    bidder_id = Column(Integer, ForeignKey('users.id'), nullable=False)
    bid_amount = Column(Numeric(20, 8), nullable=False)
    currency = Column(String(10), nullable=False)
    status = Column(String(20), default='active')  # active, accepted, rejected, withdrawn
    expires_at = Column(DateTime)
    created_at = Column(DateTime, default=datetime.utcnow)
    
    # 关系
    listing = relationship("MarketListing", back_populates="bids")
    bidder = relationship("User", back_populates="bids")
    
    # 索引
    __table_args__ = (
        Index('idx_bids_listing_id', 'listing_id'),
        Index('idx_bids_bidder_id', 'bidder_id'),
        Index('idx_bids_status', 'status'),
        Index('idx_bids_bid_amount', 'bid_amount'),
        Index('idx_bids_expires_at', 'expires_at'),
    )
    
    def to_dict(self):
        return {
            'id': self.id,
            'listing_id': self.listing_id,
            'bidder_id': self.bidder_id,
            'bid_amount': float(self.bid_amount),
            'currency': self.currency,
            'status': self.status,
            'expires_at': self.expires_at.isoformat() if self.expires_at else None,
            'created_at': self.created_at.isoformat() if self.created_at else None
        }

