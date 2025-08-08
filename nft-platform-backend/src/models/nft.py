from datetime import datetime
from flask_sqlalchemy import SQLAlchemy
from sqlalchemy import Column, Integer, String, Text, DateTime, Boolean, Numeric, ForeignKey, Index
from sqlalchemy.orm import relationship
from src.models.user import db

class NFTCollection(db.Model):
    """NFT集合模型"""
    __tablename__ = 'nft_collections'
    
    id = Column(Integer, primary_key=True, autoincrement=True)
    creator_id = Column(Integer, ForeignKey('users.id'), nullable=False)
    contract_address = Column(String(42), unique=True, nullable=False)
    name = Column(String(100), nullable=False)
    symbol = Column(String(10), nullable=False)
    description = Column(Text)
    cover_image = Column(Text)
    banner_image = Column(Text)
    royalty_percentage = Column(Numeric(5, 2), default=0.00)
    total_supply = Column(Integer, default=0)
    floor_price = Column(Numeric(20, 8))
    volume_traded = Column(Numeric(20, 8), default=0.00)
    is_verified = Column(Boolean, default=False)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    
    # 关系
    creator = relationship("User", back_populates="collections")
    nft_items = relationship("NFTItem", back_populates="collection", cascade="all, delete-orphan")
    
    # 索引
    __table_args__ = (
        Index('idx_collections_creator_id', 'creator_id'),
        Index('idx_collections_contract_address', 'contract_address'),
        Index('idx_collections_verified', 'is_verified'),
    )
    
    def to_dict(self):
        return {
            'id': self.id,
            'creator_id': self.creator_id,
            'contract_address': self.contract_address,
            'name': self.name,
            'symbol': self.symbol,
            'description': self.description,
            'cover_image': self.cover_image,
            'banner_image': self.banner_image,
            'royalty_percentage': float(self.royalty_percentage) if self.royalty_percentage else 0.0,
            'total_supply': self.total_supply,
            'floor_price': float(self.floor_price) if self.floor_price else None,
            'volume_traded': float(self.volume_traded) if self.volume_traded else 0.0,
            'is_verified': self.is_verified,
            'created_at': self.created_at.isoformat() if self.created_at else None,
            'updated_at': self.updated_at.isoformat() if self.updated_at else None
        }

class NFTItem(db.Model):
    """NFT藏品模型"""
    __tablename__ = 'nft_items'
    
    id = Column(Integer, primary_key=True, autoincrement=True)
    collection_id = Column(Integer, ForeignKey('nft_collections.id'), nullable=False)
    token_id = Column(String(100), nullable=False)
    creator_id = Column(Integer, ForeignKey('users.id'), nullable=False)
    current_owner_id = Column(Integer, ForeignKey('users.id'), nullable=False)
    name = Column(String(200), nullable=False)
    description = Column(Text)
    image_url = Column(Text, nullable=False)
    animation_url = Column(Text)
    model_3d_url = Column(Text)
    metadata_uri = Column(Text, nullable=False)
    metadata_hash = Column(String(64))
    rarity_rank = Column(Integer)
    rarity_score = Column(Numeric(10, 4))
    is_minted = Column(Boolean, default=False)
    mint_transaction_hash = Column(String(66))
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    
    # 关系
    collection = relationship("NFTCollection", back_populates="nft_items")
    creator = relationship("User", foreign_keys=[creator_id], back_populates="created_nfts")
    current_owner = relationship("User", foreign_keys=[current_owner_id], back_populates="owned_nfts")
    attributes = relationship("NFTAttribute", back_populates="nft_item", cascade="all, delete-orphan")
    artifact_info = relationship("ArtifactInfo", back_populates="nft_item", uselist=False, cascade="all, delete-orphan")
    transactions = relationship("Transaction", back_populates="nft_item")
    market_listings = relationship("MarketListing", back_populates="nft_item")
    museum_exhibits = relationship("MuseumExhibit", back_populates="nft_item")
    
    # 索引
    __table_args__ = (
        Index('idx_nft_items_collection_id', 'collection_id'),
        Index('idx_nft_items_creator_id', 'creator_id'),
        Index('idx_nft_items_current_owner_id', 'current_owner_id'),
        Index('idx_nft_items_token_id', 'token_id'),
        Index('idx_nft_items_collection_token', 'collection_id', 'token_id'),
    )
    
    def to_dict(self, include_attributes=True, include_artifact_info=True):
        result = {
            'id': self.id,
            'collection_id': self.collection_id,
            'token_id': self.token_id,
            'creator_id': self.creator_id,
            'current_owner_id': self.current_owner_id,
            'name': self.name,
            'description': self.description,
            'image_url': self.image_url,
            'animation_url': self.animation_url,
            'model_3d_url': self.model_3d_url,
            'metadata_uri': self.metadata_uri,
            'metadata_hash': self.metadata_hash,
            'rarity_rank': self.rarity_rank,
            'rarity_score': float(self.rarity_score) if self.rarity_score else None,
            'is_minted': self.is_minted,
            'mint_transaction_hash': self.mint_transaction_hash,
            'created_at': self.created_at.isoformat() if self.created_at else None,
            'updated_at': self.updated_at.isoformat() if self.updated_at else None
        }
        
        if include_attributes and self.attributes:
            result['attributes'] = [attr.to_dict() for attr in self.attributes]
        
        if include_artifact_info and self.artifact_info:
            result['artifact_info'] = self.artifact_info.to_dict()
            
        return result

class NFTAttribute(db.Model):
    """NFT属性模型"""
    __tablename__ = 'nft_attributes'
    
    id = Column(Integer, primary_key=True, autoincrement=True)
    nft_item_id = Column(Integer, ForeignKey('nft_items.id'), nullable=False)
    trait_type = Column(String(100), nullable=False)
    value = Column(String(200), nullable=False)
    display_type = Column(String(50))
    max_value = Column(Numeric(20, 8))
    rarity_percentage = Column(Numeric(5, 2))
    
    # 关系
    nft_item = relationship("NFTItem", back_populates="attributes")
    
    # 索引
    __table_args__ = (
        Index('idx_nft_attributes_nft_item_id', 'nft_item_id'),
        Index('idx_nft_attributes_trait_type', 'trait_type'),
        Index('idx_nft_attributes_trait_value', 'trait_type', 'value'),
    )
    
    def to_dict(self):
        return {
            'id': self.id,
            'nft_item_id': self.nft_item_id,
            'trait_type': self.trait_type,
            'value': self.value,
            'display_type': self.display_type,
            'max_value': float(self.max_value) if self.max_value else None,
            'rarity_percentage': float(self.rarity_percentage) if self.rarity_percentage else None
        }

class ArtifactInfo(db.Model):
    """文物信息模型"""
    __tablename__ = 'artifact_info'
    
    id = Column(Integer, primary_key=True, autoincrement=True)
    nft_item_id = Column(Integer, ForeignKey('nft_items.id'), nullable=False)
    artifact_name = Column(String(200), nullable=False)
    origin_location = Column(String(200))
    historical_period = Column(String(100))
    cultural_significance = Column(Text)
    historical_story = Column(Text)
    material = Column(String(100))
    dimensions = Column(String(100))
    weight = Column(String(50))
    discovery_date = Column(DateTime)
    discovery_location = Column(String(200))
    current_location = Column(String(200))
    conservation_status = Column(String(100))
    created_by = Column(Integer, ForeignKey('users.id'), nullable=False)
    updated_by = Column(Integer, ForeignKey('users.id'), nullable=False)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    
    # 关系
    nft_item = relationship("NFTItem", back_populates="artifact_info")
    created_by_user = relationship("User", foreign_keys=[created_by])
    updated_by_user = relationship("User", foreign_keys=[updated_by])
    artifact_images = relationship("ArtifactImage", back_populates="artifact_info", cascade="all, delete-orphan")
    
    # 索引
    __table_args__ = (
        Index('idx_artifact_info_nft_item_id', 'nft_item_id'),
        Index('idx_artifact_info_created_by', 'created_by'),
    )
    
    def to_dict(self, include_images=True):
        result = {
            'id': self.id,
            'nft_item_id': self.nft_item_id,
            'artifact_name': self.artifact_name,
            'origin_location': self.origin_location,
            'historical_period': self.historical_period,
            'cultural_significance': self.cultural_significance,
            'historical_story': self.historical_story,
            'material': self.material,
            'dimensions': self.dimensions,
            'weight': self.weight,
            'discovery_date': self.discovery_date.isoformat() if self.discovery_date else None,
            'discovery_location': self.discovery_location,
            'current_location': self.current_location,
            'conservation_status': self.conservation_status,
            'created_by': self.created_by,
            'updated_by': self.updated_by,
            'created_at': self.created_at.isoformat() if self.created_at else None,
            'updated_at': self.updated_at.isoformat() if self.updated_at else None
        }
        
        if include_images and self.artifact_images:
            result['artifact_images'] = [img.to_dict() for img in self.artifact_images]
            
        return result

class ArtifactImage(db.Model):
    """文物图片模型"""
    __tablename__ = 'artifact_images'
    
    id = Column(Integer, primary_key=True, autoincrement=True)
    artifact_info_id = Column(Integer, ForeignKey('artifact_info.id'), nullable=False)
    image_url = Column(Text, nullable=False)
    image_type = Column(String(50), nullable=False)  # front, back, detail, etc.
    description = Column(Text)
    sort_order = Column(Integer, default=0)
    created_at = Column(DateTime, default=datetime.utcnow)
    
    # 关系
    artifact_info = relationship("ArtifactInfo", back_populates="artifact_images")
    
    # 索引
    __table_args__ = (
        Index('idx_artifact_images_artifact_info_id', 'artifact_info_id'),
        Index('idx_artifact_images_sort_order', 'artifact_info_id', 'sort_order'),
    )
    
    def to_dict(self):
        return {
            'id': self.id,
            'artifact_info_id': self.artifact_info_id,
            'image_url': self.image_url,
            'image_type': self.image_type,
            'description': self.description,
            'sort_order': self.sort_order,
            'created_at': self.created_at.isoformat() if self.created_at else None
        }

