from datetime import datetime
from flask_sqlalchemy import SQLAlchemy
from sqlalchemy import Column, Integer, String, Text, DateTime, Boolean, Numeric, ForeignKey, Index, JSON, ForeignKey, Index, JSON
from sqlalchemy.orm import relationship
from src.models.user import db

class VirtualMuseum(db.Model):
    """虚拟博物馆模型"""
    __tablename__ = 'virtual_museums'
    
    id = Column(Integer, primary_key=True, autoincrement=True)
    owner_id = Column(Integer, ForeignKey('users.id'), nullable=False)
    name = Column(String(200), nullable=False)
    description = Column(Text)
    theme = Column(String(100))
    layout_template = Column(String(50), default='modern')  # modern, classic, gallery, etc.
    background_color = Column(String(7), default='#ffffff')
    lighting_config = Column(JSON)  # 灯光配置
    camera_config = Column(JSON)  # 相机配置
    is_public = Column(Boolean, default=True)
    is_featured = Column(Boolean, default=False)
    visitor_count = Column(Integer, default=0)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    
    # 关系
    owner = relationship("User", back_populates="virtual_museums")
    exhibits = relationship("MuseumExhibit", back_populates="museum", cascade="all, delete-orphan")
    decorations = relationship("MuseumDecoration", back_populates="museum", cascade="all, delete-orphan")
    visits = relationship("MuseumVisit", back_populates="museum", cascade="all, delete-orphan")
    
    # 索引
    __table_args__ = (
        Index('idx_virtual_museums_owner_id', 'owner_id'),
        Index('idx_virtual_museums_is_public', 'is_public'),
        Index('idx_virtual_museums_is_featured', 'is_featured'),
        Index('idx_virtual_museums_visitor_count', 'visitor_count'),
    )
    
    def to_dict(self, include_exhibits=False, include_decorations=False):
        result = {
            'id': self.id,
            'owner_id': self.owner_id,
            'name': self.name,
            'description': self.description,
            'theme': self.theme,
            'layout_template': self.layout_template,
            'background_color': self.background_color,
            'lighting_config': self.lighting_config,
            'camera_config': self.camera_config,
            'is_public': self.is_public,
            'is_featured': self.is_featured,
            'visitor_count': self.visitor_count,
            'created_at': self.created_at.isoformat() if self.created_at else None,
            'updated_at': self.updated_at.isoformat() if self.updated_at else None
        }
        
        if include_exhibits and self.exhibits:
            result['exhibits'] = [exhibit.to_dict() for exhibit in self.exhibits]
            
        if include_decorations and self.decorations:
            result['decorations'] = [decoration.to_dict() for decoration in self.decorations]
            
        return result

class MuseumExhibit(db.Model):
    """博物馆展品模型"""
    __tablename__ = 'museum_exhibits'
    
    id = Column(Integer, primary_key=True, autoincrement=True)
    museum_id = Column(Integer, ForeignKey('virtual_museums.id'), nullable=False)
    nft_item_id = Column(Integer, ForeignKey('nft_items.id'), nullable=False)
    position_x = Column(Numeric(10, 4), default=0.0)
    position_y = Column(Numeric(10, 4), default=0.0)
    position_z = Column(Numeric(10, 4), default=0.0)
    rotation_x = Column(Numeric(10, 4), default=0.0)
    rotation_y = Column(Numeric(10, 4), default=0.0)
    rotation_z = Column(Numeric(10, 4), default=0.0)
    scale_x = Column(Numeric(10, 4), default=1.0)
    scale_y = Column(Numeric(10, 4), default=1.0)
    scale_z = Column(Numeric(10, 4), default=1.0)
    display_type = Column(String(50), default='pedestal')  # pedestal, wall, floating, etc.
    frame_style = Column(String(50))
    lighting_style = Column(String(50))
    description_text = Column(Text)
    audio_guide_url = Column(Text)
    interaction_enabled = Column(Boolean, default=True)
    sort_order = Column(Integer, default=0)
    created_at = Column(DateTime, default=datetime.utcnow)
    
    # 关系
    museum = relationship("VirtualMuseum", back_populates="exhibits")
    nft_item = relationship("NFTItem", back_populates="museum_exhibits")
    
    # 索引
    __table_args__ = (
        Index('idx_museum_exhibits_museum_id', 'museum_id'),
        Index('idx_museum_exhibits_nft_item_id', 'nft_item_id'),
        Index('idx_museum_exhibits_sort_order', 'museum_id', 'sort_order'),
    )
    
    def to_dict(self):
        return {
            'id': self.id,
            'museum_id': self.museum_id,
            'nft_item_id': self.nft_item_id,
            'position': {
                'x': float(self.position_x),
                'y': float(self.position_y),
                'z': float(self.position_z)
            },
            'rotation': {
                'x': float(self.rotation_x),
                'y': float(self.rotation_y),
                'z': float(self.rotation_z)
            },
            'scale': {
                'x': float(self.scale_x),
                'y': float(self.scale_y),
                'z': float(self.scale_z)
            },
            'display_type': self.display_type,
            'frame_style': self.frame_style,
            'lighting_style': self.lighting_style,
            'description_text': self.description_text,
            'audio_guide_url': self.audio_guide_url,
            'interaction_enabled': self.interaction_enabled,
            'sort_order': self.sort_order,
            'created_at': self.created_at.isoformat() if self.created_at else None
        }

class MuseumDecoration(db.Model):
    """博物馆装饰模型"""
    __tablename__ = 'museum_decorations'
    
    id = Column(Integer, primary_key=True, autoincrement=True)
    museum_id = Column(Integer, ForeignKey('virtual_museums.id'), nullable=False)
    decoration_type = Column(String(50), nullable=False)  # wall, floor, ceiling, furniture, plant, etc.
    model_url = Column(Text, nullable=False)
    texture_url = Column(Text)
    position_x = Column(Numeric(10, 4), default=0.0)
    position_y = Column(Numeric(10, 4), default=0.0)
    position_z = Column(Numeric(10, 4), default=0.0)
    rotation_x = Column(Numeric(10, 4), default=0.0)
    rotation_y = Column(Numeric(10, 4), default=0.0)
    rotation_z = Column(Numeric(10, 4), default=0.0)
    scale_x = Column(Numeric(10, 4), default=1.0)
    scale_y = Column(Numeric(10, 4), default=1.0)
    scale_z = Column(Numeric(10, 4), default=1.0)
    color = Column(String(7))
    material_properties = Column(JSON)  # 材质属性
    created_at = Column(DateTime, default=datetime.utcnow)
    
    # 关系
    museum = relationship("VirtualMuseum", back_populates="decorations")
    
    # 索引
    __table_args__ = (
        Index('idx_museum_decorations_museum_id', 'museum_id'),
        Index('idx_museum_decorations_type', 'decoration_type'),
    )
    
    def to_dict(self):
        return {
            'id': self.id,
            'museum_id': self.museum_id,
            'decoration_type': self.decoration_type,
            'model_url': self.model_url,
            'texture_url': self.texture_url,
            'position': {
                'x': float(self.position_x),
                'y': float(self.position_y),
                'z': float(self.position_z)
            },
            'rotation': {
                'x': float(self.rotation_x),
                'y': float(self.rotation_y),
                'z': float(self.rotation_z)
            },
            'scale': {
                'x': float(self.scale_x),
                'y': float(self.scale_y),
                'z': float(self.scale_z)
            },
            'color': self.color,
            'material_properties': self.material_properties,
            'created_at': self.created_at.isoformat() if self.created_at else None
        }

class MuseumVisit(db.Model):
    """博物馆访问记录模型"""
    __tablename__ = 'museum_visits'
    
    id = Column(Integer, primary_key=True, autoincrement=True)
    museum_id = Column(Integer, ForeignKey('virtual_museums.id'), nullable=False)
    visitor_id = Column(Integer, ForeignKey('users.id'))
    visitor_ip = Column(String(45))  # 支持IPv6
    visit_duration = Column(Integer)  # 访问时长（秒）
    device_type = Column(String(50))  # desktop, mobile, vr, ar
    browser_info = Column(String(200))
    created_at = Column(DateTime, default=datetime.utcnow)
    
    # 关系
    museum = relationship("VirtualMuseum", back_populates="visits")
    visitor = relationship("User", back_populates="museum_visits")
    
    # 索引
    __table_args__ = (
        Index('idx_museum_visits_museum_id', 'museum_id'),
        Index('idx_museum_visits_visitor_id', 'visitor_id'),
        Index('idx_museum_visits_created_at', 'created_at'),
        Index('idx_museum_visits_device_type', 'device_type'),
    )
    
    def to_dict(self):
        return {
            'id': self.id,
            'museum_id': self.museum_id,
            'visitor_id': self.visitor_id,
            'visitor_ip': self.visitor_ip,
            'visit_duration': self.visit_duration,
            'device_type': self.device_type,
            'browser_info': self.browser_info,
            'created_at': self.created_at.isoformat() if self.created_at else None
        }

class MuseumTemplate(db.Model):
    """博物馆模板模型"""
    __tablename__ = 'museum_templates'
    
    id = Column(Integer, primary_key=True, autoincrement=True)
    name = Column(String(100), nullable=False)
    description = Column(Text)
    preview_image = Column(Text)
    template_data = Column(JSON, nullable=False)  # 模板配置数据
    category = Column(String(50))  # modern, classic, gallery, etc.
    is_premium = Column(Boolean, default=False)
    price = Column(Numeric(10, 2))
    usage_count = Column(Integer, default=0)
    created_by = Column(Integer, ForeignKey('users.id'))
    created_at = Column(DateTime, default=datetime.utcnow)
    
    # 关系
    creator = relationship("User", back_populates="created_templates")
    
    # 索引
    __table_args__ = (
        Index('idx_museum_templates_category', 'category'),
        Index('idx_museum_templates_is_premium', 'is_premium'),
        Index('idx_museum_templates_usage_count', 'usage_count'),
    )
    
    def to_dict(self):
        return {
            'id': self.id,
            'name': self.name,
            'description': self.description,
            'preview_image': self.preview_image,
            'template_data': self.template_data,
            'category': self.category,
            'is_premium': self.is_premium,
            'price': float(self.price) if self.price else None,
            'usage_count': self.usage_count,
            'created_by': self.created_by,
            'created_at': self.created_at.isoformat() if self.created_at else None
        }

