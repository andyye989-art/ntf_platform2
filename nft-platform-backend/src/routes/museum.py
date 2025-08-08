from flask import Blueprint, request, jsonify
from sqlalchemy import desc, asc, and_, or_
from datetime import datetime
from src.models.user import db
from src.models.museum import VirtualMuseum, MuseumExhibit, MuseumDecoration, MuseumVisit, MuseumTemplate
from src.models.nft import NFTItem
from src.utils.auth import token_required, optional_token
import json

museum_bp = Blueprint('museum', __name__)

@museum_bp.route('/museums', methods=['GET'])
@optional_token
def get_museums(current_user):
    """获取虚拟博物馆列表"""
    try:
        page = request.args.get('page', 1, type=int)
        per_page = min(request.args.get('per_page', 20, type=int), 100)
        owner_id = request.args.get('owner_id', type=int)
        is_public = request.args.get('is_public', type=bool)
        is_featured = request.args.get('is_featured', type=bool)
        theme = request.args.get('theme', '').strip()
        search = request.args.get('search', '').strip()
        sort_by = request.args.get('sort_by', 'created_at')
        sort_order = request.args.get('sort_order', 'desc')
        
        # 构建查询
        query = VirtualMuseum.query
        
        # 过滤条件
        if owner_id:
            query = query.filter(VirtualMuseum.owner_id == owner_id)
        
        if is_public is not None:
            query = query.filter(VirtualMuseum.is_public == is_public)
        
        if is_featured is not None:
            query = query.filter(VirtualMuseum.is_featured == is_featured)
        
        if theme:
            query = query.filter(VirtualMuseum.theme == theme)
        
        if search:
            query = query.filter(
                or_(
                    VirtualMuseum.name.ilike(f'%{search}%'),
                    VirtualMuseum.description.ilike(f'%{search}%')
                )
            )
        
        # 如果不是博物馆拥有者，只显示公开的博物馆
        if not current_user or owner_id != current_user.id:
            query = query.filter(VirtualMuseum.is_public == True)
        
        # 排序
        if sort_by == 'name':
            order_column = VirtualMuseum.name
        elif sort_by == 'visitor_count':
            order_column = VirtualMuseum.visitor_count
        else:
            order_column = VirtualMuseum.created_at
        
        if sort_order == 'asc':
            query = query.order_by(asc(order_column))
        else:
            query = query.order_by(desc(order_column))
        
        # 分页
        pagination = query.paginate(
            page=page, per_page=per_page, error_out=False
        )
        
        museums = []
        for museum in pagination.items:
            museum_data = museum.to_dict()
            museum_data.update({
                'owner': museum.owner.to_dict() if museum.owner else None,
                'exhibit_count': len(museum.exhibits) if museum.exhibits else 0
            })
            museums.append(museum_data)
        
        return jsonify({
            'museums': museums,
            'pagination': {
                'page': page,
                'per_page': per_page,
                'total': pagination.total,
                'pages': pagination.pages,
                'has_next': pagination.has_next,
                'has_prev': pagination.has_prev
            }
        }), 200
        
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@museum_bp.route('/museums', methods=['POST'])
@token_required
def create_museum(current_user):
    """创建虚拟博物馆"""
    try:
        data = request.get_json()
        
        # 验证必需字段
        required_fields = ['name']
        for field in required_fields:
            if not data.get(field):
                return jsonify({'error': f'缺少必需字段: {field}'}), 400
        
        # 检查用户是否已有同名博物馆
        existing_museum = VirtualMuseum.query.filter_by(
            owner_id=current_user.id, name=data['name']
        ).first()
        if existing_museum:
            return jsonify({'error': '您已有同名的博物馆'}), 400
        
        # 创建博物馆
        museum = VirtualMuseum(
            owner_id=current_user.id,
            name=data['name'],
            description=data.get('description', ''),
            theme=data.get('theme', 'modern'),
            layout_template=data.get('layout_template', 'modern'),
            background_color=data.get('background_color', '#ffffff'),
            lighting_config=data.get('lighting_config', {}),
            camera_config=data.get('camera_config', {}),
            is_public=data.get('is_public', True)
        )
        
        db.session.add(museum)
        db.session.commit()
        
        return jsonify({
            'message': '虚拟博物馆创建成功',
            'museum': museum.to_dict()
        }), 201
        
    except Exception as e:
        db.session.rollback()
        return jsonify({'error': str(e)}), 500

@museum_bp.route('/museums/<int:museum_id>', methods=['GET'])
@optional_token
def get_museum(current_user, museum_id):
    """获取博物馆详情"""
    try:
        museum = VirtualMuseum.query.get_or_404(museum_id)
        
        # 检查访问权限
        if not museum.is_public and (not current_user or museum.owner_id != current_user.id):
            return jsonify({'error': '博物馆不公开'}), 403
        
        # 记录访问
        if current_user and current_user.id != museum.owner_id:
            visit = MuseumVisit(
                museum_id=museum_id,
                visitor_id=current_user.id,
                visitor_ip=request.remote_addr,
                device_type=request.headers.get('User-Agent', '')[:50]
            )
            db.session.add(visit)
            
            # 更新访问计数
            museum.visitor_count += 1
            db.session.commit()
        
        museum_data = museum.to_dict(include_exhibits=True, include_decorations=True)
        museum_data.update({
            'owner': museum.owner.to_dict() if museum.owner else None
        })
        
        # 添加展品的NFT信息
        if museum_data.get('exhibits'):
            for exhibit_data in museum_data['exhibits']:
                exhibit = MuseumExhibit.query.get(exhibit_data['id'])
                if exhibit and exhibit.nft_item:
                    exhibit_data['nft_item'] = exhibit.nft_item.to_dict()
        
        return jsonify({'museum': museum_data}), 200
        
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@museum_bp.route('/museums/<int:museum_id>', methods=['PUT'])
@token_required
def update_museum(current_user, museum_id):
    """更新博物馆信息"""
    try:
        museum = VirtualMuseum.query.get_or_404(museum_id)
        
        # 验证权限
        if museum.owner_id != current_user.id:
            return jsonify({'error': '无权限修改此博物馆'}), 403
        
        data = request.get_json()
        
        # 更新字段
        if 'name' in data:
            museum.name = data['name']
        if 'description' in data:
            museum.description = data['description']
        if 'theme' in data:
            museum.theme = data['theme']
        if 'layout_template' in data:
            museum.layout_template = data['layout_template']
        if 'background_color' in data:
            museum.background_color = data['background_color']
        if 'lighting_config' in data:
            museum.lighting_config = data['lighting_config']
        if 'camera_config' in data:
            museum.camera_config = data['camera_config']
        if 'is_public' in data:
            museum.is_public = data['is_public']
        
        museum.updated_at = datetime.utcnow()
        db.session.commit()
        
        return jsonify({
            'message': '博物馆更新成功',
            'museum': museum.to_dict()
        }), 200
        
    except Exception as e:
        db.session.rollback()
        return jsonify({'error': str(e)}), 500

@museum_bp.route('/museums/<int:museum_id>/exhibits', methods=['POST'])
@token_required
def add_exhibit(current_user, museum_id):
    """添加展品到博物馆"""
    try:
        museum = VirtualMuseum.query.get_or_404(museum_id)
        
        # 验证权限
        if museum.owner_id != current_user.id:
            return jsonify({'error': '无权限修改此博物馆'}), 403
        
        data = request.get_json()
        
        # 验证必需字段
        if not data.get('nft_item_id'):
            return jsonify({'error': '缺少NFT ID'}), 400
        
        # 验证NFT存在且用户拥有
        nft_item = NFTItem.query.get_or_404(data['nft_item_id'])
        if nft_item.current_owner_id != current_user.id:
            return jsonify({'error': '您不拥有此NFT'}), 403
        
        # 检查NFT是否已在此博物馆展出
        existing_exhibit = MuseumExhibit.query.filter_by(
            museum_id=museum_id, nft_item_id=data['nft_item_id']
        ).first()
        if existing_exhibit:
            return jsonify({'error': 'NFT已在此博物馆展出'}), 400
        
        # 创建展品
        exhibit = MuseumExhibit(
            museum_id=museum_id,
            nft_item_id=data['nft_item_id'],
            position_x=data.get('position_x', 0.0),
            position_y=data.get('position_y', 0.0),
            position_z=data.get('position_z', 0.0),
            rotation_x=data.get('rotation_x', 0.0),
            rotation_y=data.get('rotation_y', 0.0),
            rotation_z=data.get('rotation_z', 0.0),
            scale_x=data.get('scale_x', 1.0),
            scale_y=data.get('scale_y', 1.0),
            scale_z=data.get('scale_z', 1.0),
            display_type=data.get('display_type', 'pedestal'),
            frame_style=data.get('frame_style'),
            lighting_style=data.get('lighting_style'),
            description_text=data.get('description_text'),
            audio_guide_url=data.get('audio_guide_url'),
            interaction_enabled=data.get('interaction_enabled', True),
            sort_order=data.get('sort_order', 0)
        )
        
        db.session.add(exhibit)
        db.session.commit()
        
        exhibit_data = exhibit.to_dict()
        exhibit_data['nft_item'] = nft_item.to_dict()
        
        return jsonify({
            'message': '展品添加成功',
            'exhibit': exhibit_data
        }), 201
        
    except Exception as e:
        db.session.rollback()
        return jsonify({'error': str(e)}), 500

@museum_bp.route('/museums/<int:museum_id>/exhibits/<int:exhibit_id>', methods=['PUT'])
@token_required
def update_exhibit(current_user, museum_id, exhibit_id):
    """更新展品位置和属性"""
    try:
        museum = VirtualMuseum.query.get_or_404(museum_id)
        exhibit = MuseumExhibit.query.get_or_404(exhibit_id)
        
        # 验证权限
        if museum.owner_id != current_user.id or exhibit.museum_id != museum_id:
            return jsonify({'error': '无权限修改此展品'}), 403
        
        data = request.get_json()
        
        # 更新位置
        if 'position_x' in data:
            exhibit.position_x = data['position_x']
        if 'position_y' in data:
            exhibit.position_y = data['position_y']
        if 'position_z' in data:
            exhibit.position_z = data['position_z']
        
        # 更新旋转
        if 'rotation_x' in data:
            exhibit.rotation_x = data['rotation_x']
        if 'rotation_y' in data:
            exhibit.rotation_y = data['rotation_y']
        if 'rotation_z' in data:
            exhibit.rotation_z = data['rotation_z']
        
        # 更新缩放
        if 'scale_x' in data:
            exhibit.scale_x = data['scale_x']
        if 'scale_y' in data:
            exhibit.scale_y = data['scale_y']
        if 'scale_z' in data:
            exhibit.scale_z = data['scale_z']
        
        # 更新其他属性
        if 'display_type' in data:
            exhibit.display_type = data['display_type']
        if 'frame_style' in data:
            exhibit.frame_style = data['frame_style']
        if 'lighting_style' in data:
            exhibit.lighting_style = data['lighting_style']
        if 'description_text' in data:
            exhibit.description_text = data['description_text']
        if 'audio_guide_url' in data:
            exhibit.audio_guide_url = data['audio_guide_url']
        if 'interaction_enabled' in data:
            exhibit.interaction_enabled = data['interaction_enabled']
        if 'sort_order' in data:
            exhibit.sort_order = data['sort_order']
        
        db.session.commit()
        
        return jsonify({
            'message': '展品更新成功',
            'exhibit': exhibit.to_dict()
        }), 200
        
    except Exception as e:
        db.session.rollback()
        return jsonify({'error': str(e)}), 500

@museum_bp.route('/museums/<int:museum_id>/exhibits/<int:exhibit_id>', methods=['DELETE'])
@token_required
def remove_exhibit(current_user, museum_id, exhibit_id):
    """从博物馆移除展品"""
    try:
        museum = VirtualMuseum.query.get_or_404(museum_id)
        exhibit = MuseumExhibit.query.get_or_404(exhibit_id)
        
        # 验证权限
        if museum.owner_id != current_user.id or exhibit.museum_id != museum_id:
            return jsonify({'error': '无权限移除此展品'}), 403
        
        db.session.delete(exhibit)
        db.session.commit()
        
        return jsonify({'message': '展品移除成功'}), 200
        
    except Exception as e:
        db.session.rollback()
        return jsonify({'error': str(e)}), 500

@museum_bp.route('/museums/<int:museum_id>/decorations', methods=['POST'])
@token_required
def add_decoration(current_user, museum_id):
    """添加装饰到博物馆"""
    try:
        museum = VirtualMuseum.query.get_or_404(museum_id)
        
        # 验证权限
        if museum.owner_id != current_user.id:
            return jsonify({'error': '无权限修改此博物馆'}), 403
        
        data = request.get_json()
        
        # 验证必需字段
        required_fields = ['decoration_type', 'model_url']
        for field in required_fields:
            if not data.get(field):
                return jsonify({'error': f'缺少必需字段: {field}'}), 400
        
        # 创建装饰
        decoration = MuseumDecoration(
            museum_id=museum_id,
            decoration_type=data['decoration_type'],
            model_url=data['model_url'],
            texture_url=data.get('texture_url'),
            position_x=data.get('position_x', 0.0),
            position_y=data.get('position_y', 0.0),
            position_z=data.get('position_z', 0.0),
            rotation_x=data.get('rotation_x', 0.0),
            rotation_y=data.get('rotation_y', 0.0),
            rotation_z=data.get('rotation_z', 0.0),
            scale_x=data.get('scale_x', 1.0),
            scale_y=data.get('scale_y', 1.0),
            scale_z=data.get('scale_z', 1.0),
            color=data.get('color'),
            material_properties=data.get('material_properties', {})
        )
        
        db.session.add(decoration)
        db.session.commit()
        
        return jsonify({
            'message': '装饰添加成功',
            'decoration': decoration.to_dict()
        }), 201
        
    except Exception as e:
        db.session.rollback()
        return jsonify({'error': str(e)}), 500

@museum_bp.route('/museums/<int:museum_id>/decorations/<int:decoration_id>', methods=['DELETE'])
@token_required
def remove_decoration(current_user, museum_id, decoration_id):
    """移除博物馆装饰"""
    try:
        museum = VirtualMuseum.query.get_or_404(museum_id)
        decoration = MuseumDecoration.query.get_or_404(decoration_id)
        
        # 验证权限
        if museum.owner_id != current_user.id or decoration.museum_id != museum_id:
            return jsonify({'error': '无权限移除此装饰'}), 403
        
        db.session.delete(decoration)
        db.session.commit()
        
        return jsonify({'message': '装饰移除成功'}), 200
        
    except Exception as e:
        db.session.rollback()
        return jsonify({'error': str(e)}), 500

@museum_bp.route('/templates', methods=['GET'])
@optional_token
def get_templates(current_user):
    """获取博物馆模板列表"""
    try:
        page = request.args.get('page', 1, type=int)
        per_page = min(request.args.get('per_page', 20, type=int), 100)
        category = request.args.get('category', '').strip()
        is_premium = request.args.get('is_premium', type=bool)
        sort_by = request.args.get('sort_by', 'usage_count')
        sort_order = request.args.get('sort_order', 'desc')
        
        # 构建查询
        query = MuseumTemplate.query
        
        # 过滤条件
        if category:
            query = query.filter(MuseumTemplate.category == category)
        
        if is_premium is not None:
            query = query.filter(MuseumTemplate.is_premium == is_premium)
        
        # 排序
        if sort_by == 'name':
            order_column = MuseumTemplate.name
        elif sort_by == 'price':
            order_column = MuseumTemplate.price
        elif sort_by == 'created_at':
            order_column = MuseumTemplate.created_at
        else:
            order_column = MuseumTemplate.usage_count
        
        if sort_order == 'asc':
            query = query.order_by(asc(order_column))
        else:
            query = query.order_by(desc(order_column))
        
        # 分页
        pagination = query.paginate(
            page=page, per_page=per_page, error_out=False
        )
        
        templates = [template.to_dict() for template in pagination.items]
        
        return jsonify({
            'templates': templates,
            'pagination': {
                'page': page,
                'per_page': per_page,
                'total': pagination.total,
                'pages': pagination.pages,
                'has_next': pagination.has_next,
                'has_prev': pagination.has_prev
            }
        }), 200
        
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@museum_bp.route('/museums/<int:museum_id>/apply-template/<int:template_id>', methods=['POST'])
@token_required
def apply_template(current_user, museum_id, template_id):
    """应用模板到博物馆"""
    try:
        museum = VirtualMuseum.query.get_or_404(museum_id)
        template = MuseumTemplate.query.get_or_404(template_id)
        
        # 验证权限
        if museum.owner_id != current_user.id:
            return jsonify({'error': '无权限修改此博物馆'}), 403
        
        # 检查是否为付费模板（这里简化处理）
        if template.is_premium and template.price > 0:
            # 实际应用中需要处理支付逻辑
            pass
        
        # 应用模板配置
        template_data = template.template_data
        
        if 'layout_template' in template_data:
            museum.layout_template = template_data['layout_template']
        if 'background_color' in template_data:
            museum.background_color = template_data['background_color']
        if 'lighting_config' in template_data:
            museum.lighting_config = template_data['lighting_config']
        if 'camera_config' in template_data:
            museum.camera_config = template_data['camera_config']
        
        # 更新模板使用次数
        template.usage_count += 1
        
        museum.updated_at = datetime.utcnow()
        db.session.commit()
        
        return jsonify({
            'message': '模板应用成功',
            'museum': museum.to_dict()
        }), 200
        
    except Exception as e:
        db.session.rollback()
        return jsonify({'error': str(e)}), 500

@museum_bp.route('/museums/<int:museum_id>/visits', methods=['GET'])
@token_required
def get_museum_visits(current_user, museum_id):
    """获取博物馆访问记录"""
    try:
        museum = VirtualMuseum.query.get_or_404(museum_id)
        
        # 验证权限（只有博物馆拥有者可以查看访问记录）
        if museum.owner_id != current_user.id:
            return jsonify({'error': '无权限查看访问记录'}), 403
        
        page = request.args.get('page', 1, type=int)
        per_page = min(request.args.get('per_page', 20, type=int), 100)
        
        # 查询访问记录
        pagination = MuseumVisit.query.filter_by(museum_id=museum_id).order_by(
            desc(MuseumVisit.created_at)
        ).paginate(page=page, per_page=per_page, error_out=False)
        
        visits = []
        for visit in pagination.items:
            visit_data = visit.to_dict()
            visit_data['visitor'] = visit.visitor.to_dict() if visit.visitor else None
            visits.append(visit_data)
        
        return jsonify({
            'visits': visits,
            'pagination': {
                'page': page,
                'per_page': per_page,
                'total': pagination.total,
                'pages': pagination.pages,
                'has_next': pagination.has_next,
                'has_prev': pagination.has_prev
            }
        }), 200
        
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@museum_bp.route('/museums/<int:museum_id>/stats', methods=['GET'])
@token_required
def get_museum_stats(current_user, museum_id):
    """获取博物馆统计数据"""
    try:
        museum = VirtualMuseum.query.get_or_404(museum_id)
        
        # 验证权限
        if museum.owner_id != current_user.id:
            return jsonify({'error': '无权限查看统计数据'}), 403
        
        # 总访问次数
        total_visits = MuseumVisit.query.filter_by(museum_id=museum_id).count()
        
        # 独立访客数
        unique_visitors = db.session.query(MuseumVisit.visitor_id).filter_by(
            museum_id=museum_id
        ).distinct().count()
        
        # 今日访问次数
        today = datetime.utcnow().date()
        today_visits = MuseumVisit.query.filter(
            MuseumVisit.museum_id == museum_id,
            db.func.date(MuseumVisit.created_at) == today
        ).count()
        
        # 展品数量
        exhibit_count = MuseumExhibit.query.filter_by(museum_id=museum_id).count()
        
        # 装饰数量
        decoration_count = MuseumDecoration.query.filter_by(museum_id=museum_id).count()
        
        # 平均访问时长
        avg_duration = db.session.query(
            db.func.avg(MuseumVisit.visit_duration)
        ).filter(
            MuseumVisit.museum_id == museum_id,
            MuseumVisit.visit_duration.isnot(None)
        ).scalar() or 0
        
        return jsonify({
            'stats': {
                'total_visits': total_visits,
                'unique_visitors': unique_visitors,
                'today_visits': today_visits,
                'exhibit_count': exhibit_count,
                'decoration_count': decoration_count,
                'average_visit_duration': float(avg_duration)
            }
        }), 200
        
    except Exception as e:
        return jsonify({'error': str(e)}), 500

