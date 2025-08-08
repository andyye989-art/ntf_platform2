from flask_sqlalchemy import SQLAlchemy
from datetime import datetime
from sqlalchemy import Column, Integer, String, Text, DateTime, Boolean, Numeric, Index

db = SQLAlchemy()

class User(db.Model):
    __tablename__ = 'users'
    
    id = Column(Integer, primary_key=True, autoincrement=True)
    username = Column(String(80), unique=True, nullable=False)
    email = Column(String(120), unique=True, nullable=False)
    password_hash = Column(String(255), nullable=False)
    wallet_address = Column(String(42), unique=True)
    avatar_url = Column(Text)
    bio = Column(Text)
    website = Column(String(200))
    twitter_handle = Column(String(50))
    instagram_handle = Column(String(50))
    is_verified = Column(Boolean, default=False)
    is_creator = Column(Boolean, default=False)
    is_active = Column(Boolean, default=True)
    email_verified = Column(Boolean, default=False)
    two_factor_enabled = Column(Boolean, default=False)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    last_login_at = Column(DateTime)
    
    # 关系
    collections = db.relationship("NFTCollection", back_populates="creator", lazy='dynamic')
    created_nfts = db.relationship("NFTItem", foreign_keys="NFTItem.creator_id", back_populates="creator", lazy='dynamic')
    owned_nfts = db.relationship("NFTItem", foreign_keys="NFTItem.current_owner_id", back_populates="current_owner", lazy='dynamic')
    sent_transactions = db.relationship("Transaction", foreign_keys="Transaction.from_user_id", back_populates="from_user", lazy='dynamic')
    received_transactions = db.relationship("Transaction", foreign_keys="Transaction.to_user_id", back_populates="to_user", lazy='dynamic')
    market_listings = db.relationship("MarketListing", back_populates="seller", lazy='dynamic')
    bids = db.relationship("Bid", back_populates="bidder", lazy='dynamic')
    virtual_museums = db.relationship("VirtualMuseum", back_populates="owner", lazy='dynamic')
    museum_visits = db.relationship("MuseumVisit", back_populates="visitor", lazy='dynamic')
    created_templates = db.relationship("MuseumTemplate", back_populates="creator", lazy='dynamic')
    
    # 索引
    __table_args__ = (
        Index('idx_users_username', 'username'),
        Index('idx_users_email', 'email'),
        Index('idx_users_wallet_address', 'wallet_address'),
        Index('idx_users_is_verified', 'is_verified'),
        Index('idx_users_is_creator', 'is_creator'),
        Index('idx_users_is_active', 'is_active'),
    )
    
    def to_dict(self, include_sensitive=False):
        result = {
            'id': self.id,
            'username': self.username,
            'wallet_address': self.wallet_address,
            'avatar_url': self.avatar_url,
            'bio': self.bio,
            'website': self.website,
            'twitter_handle': self.twitter_handle,
            'instagram_handle': self.instagram_handle,
            'is_verified': self.is_verified,
            'is_creator': self.is_creator,
            'is_active': self.is_active,
            'created_at': self.created_at.isoformat() if self.created_at else None,
            'updated_at': self.updated_at.isoformat() if self.updated_at else None
        }
        
        if include_sensitive:
            result.update({
                'email': self.email,
                'email_verified': self.email_verified,
                'two_factor_enabled': self.two_factor_enabled,
                'last_login_at': self.last_login_at.isoformat() if self.last_login_at else None
            })
            
        return result