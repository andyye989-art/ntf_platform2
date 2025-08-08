from flask import Blueprint, request, jsonify
from sqlalchemy import desc, asc, and_, or_
from src.models.user import db
from src.models.nft import NFTCollection, NFTItem, NFTAttribute, ArtifactInfo, ArtifactImage
from src.utils.auth import token_required, optional_token, creator_required
from src.services.blockchain_service import BlockchainService
from src.services.ipfs_service import IPFSService
import os
import uuid
from werkzeug.utils import secure_filename

nft_bp = Blueprint('nft', __name__)

# 初始化服务
blockchain_service = BlockchainService()
ipfs_service = IPFSService()

@nft_bp.route('/collections', methods=['GET'])
@optional_token
def get_collections(current_user):
    """获取NFT集合列表"""
    try:
        page = request.args.get('page', 1, type=int)
        per_page = min(request.args.get('per_page', 20, type=int), 100)
        verified_only = request.args.get('verified_only', 'false').lower() == 'true'
        creator_id = request.args.get('creator_id', type=int)
        search = request.args.get('search', '').strip()
        sort_by = request.args.get('sort_by', 'created_at')
        sort_order = request.args.get('sort_order', 'desc')
        
        # 构建查询
        query = NFTCollection.query
        
        # 过滤条件
        if verified_only:
            query = query.filter(NFTCollection.is_verified == True)
        
        if creator_id:
            query = query.filter(NFTCollection.creator_id == creator_id)
        
        if search:
            query = query.filter(
                or_(
                    NFTCollection.name.ilike(f'%{search}%'),
                    NFTCollection.description.ilike(f'%{search}%')
                )
            )
        
        # 排序
        if sort_by == 'name':
            order_column = NFTCollection.name
        elif sort_by == 'volume_traded':
            order_column = NFTCollection.volume_traded
        elif sort_by == 'floor_price':
            order_column = NFTCollection.floor_price
        else:
            order_column = NFTCollection.created_at
        
        if sort_order == 'asc':
            query = query.order_by(asc(order_column))
        else:
            query = query.order_by(desc(order_column))
        
        # 分页
        pagination = query.paginate(
            page=page, per_page=per_page, error_out=False
        )
        
        collections = [collection.to_dict() for collection in pagination.items]
        
        return jsonify({
            'collections': collections,
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

@nft_bp.route('/collections', methods=['POST'])
@creator_required
def create_collection(current_user):
    """创建NFT集合"""
    try:
        data = request.get_json()
        
        # 验证必需字段
        required_fields = ['name', 'symbol', 'description']
        for field in required_fields:
            if not data.get(field):
                return jsonify({'error': f'缺少必需字段: {field}'}), 400
        
        # 检查集合名称是否已存在
        existing_collection = NFTCollection.query.filter_by(
            name=data['name'], creator_id=current_user.id
        ).first()
        if existing_collection:
            return jsonify({'error': '集合名称已存在'}), 400
        
        # 创建区块链集合
        try:
            # 这里需要用户提供私钥或使用托管钱包
            # 为了演示，假设用户已经授权
            tx_hash, collection_id, contract_address = blockchain_service.create_collection(
                creator_private_key="0x...",  # 实际应用中需要安全处理
                name=data['name'],
                symbol=data['symbol'],
                description=data['description'],
                cover_image=data.get('cover_image', ''),
                banner_image=data.get('banner_image', '')
            )
        except Exception as e:
            return jsonify({'error': f'区块链集合创建失败: {str(e)}'}), 500
        
        # 创建数据库记录
        collection = NFTCollection(
            creator_id=current_user.id,
            contract_address=contract_address,
            name=data['name'],
            symbol=data['symbol'],
            description=data['description'],
            cover_image=data.get('cover_image'),
            banner_image=data.get('banner_image'),
            royalty_percentage=data.get('royalty_percentage', 0.0)
        )
        
        db.session.add(collection)
        db.session.commit()
        
        return jsonify({
            'message': '集合创建成功',
            'collection': collection.to_dict(),
            'transaction_hash': tx_hash
        }), 201
        
    except Exception as e:
        db.session.rollback()
        return jsonify({'error': str(e)}), 500

@nft_bp.route('/collections/<int:collection_id>', methods=['GET'])
@optional_token
def get_collection(current_user, collection_id):
    """获取集合详情"""
    try:
        collection = NFTCollection.query.get_or_404(collection_id)
        
        # 获取集合统计信息
        total_items = NFTItem.query.filter_by(collection_id=collection_id).count()
        minted_items = NFTItem.query.filter_by(
            collection_id=collection_id, is_minted=True
        ).count()
        
        collection_data = collection.to_dict()
        collection_data.update({
            'total_items': total_items,
            'minted_items': minted_items,
            'creator': collection.creator.to_dict() if collection.creator else None
        })
        
        return jsonify({'collection': collection_data}), 200
        
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@nft_bp.route('/collections/<int:collection_id>/items', methods=['GET'])
@optional_token
def get_collection_items(current_user, collection_id):
    """获取集合中的NFT列表"""
    try:
        # 验证集合存在
        collection = NFTCollection.query.get_or_404(collection_id)
        
        page = request.args.get('page', 1, type=int)
        per_page = min(request.args.get('per_page', 20, type=int), 100)
        minted_only = request.args.get('minted_only', 'false').lower() == 'true'
        owner_id = request.args.get('owner_id', type=int)
        search = request.args.get('search', '').strip()
        sort_by = request.args.get('sort_by', 'created_at')
        sort_order = request.args.get('sort_order', 'desc')
        
        # 构建查询
        query = NFTItem.query.filter_by(collection_id=collection_id)
        
        # 过滤条件
        if minted_only:
            query = query.filter(NFTItem.is_minted == True)
        
        if owner_id:
            query = query.filter(NFTItem.current_owner_id == owner_id)
        
        if search:
            query = query.filter(
                or_(
                    NFTItem.name.ilike(f'%{search}%'),
                    NFTItem.description.ilike(f'%{search}%')
                )
            )
        
        # 排序
        if sort_by == 'name':
            order_column = NFTItem.name
        elif sort_by == 'rarity_rank':
            order_column = NFTItem.rarity_rank
        elif sort_by == 'rarity_score':
            order_column = NFTItem.rarity_score
        else:
            order_column = NFTItem.created_at
        
        if sort_order == 'asc':
            query = query.order_by(asc(order_column))
        else:
            query = query.order_by(desc(order_column))
        
        # 分页
        pagination = query.paginate(
            page=page, per_page=per_page, error_out=False
        )
        
        items = []
        for item in pagination.items:
            item_data = item.to_dict()
            item_data.update({
                'creator': item.creator.to_dict() if item.creator else None,
                'current_owner': item.current_owner.to_dict() if item.current_owner else None
            })
            items.append(item_data)
        
        return jsonify({
            'items': items,
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

@nft_bp.route('/items', methods=['POST'])
@creator_required
def create_nft_item(current_user):
    """创建NFT藏品"""
    try:
        data = request.get_json()
        
        # 验证必需字段
        required_fields = ['collection_id', 'name', 'description', 'image_url']
        for field in required_fields:
            if not data.get(field):
                return jsonify({'error': f'缺少必需字段: {field}'}), 400
        
        # 验证集合存在且用户有权限
        collection = NFTCollection.query.get_or_404(data['collection_id'])
        if collection.creator_id != current_user.id:
            return jsonify({'error': '无权限在此集合中创建NFT'}), 403
        
        # 创建NFT藏品
        nft_item = NFTItem(
            collection_id=data['collection_id'],
            creator_id=current_user.id,
            current_owner_id=current_user.id,
            name=data['name'],
            description=data['description'],
            image_url=data['image_url'],
            animation_url=data.get('animation_url'),
            model_3d_url=data.get('model_3d_url'),
            metadata_uri='',  # 稍后更新
            token_id=''  # 稍后更新
        )
        
        db.session.add(nft_item)
        db.session.flush()  # 获取ID
        
        # 创建属性
        if data.get('attributes'):
            for attr_data in data['attributes']:
                attribute = NFTAttribute(
                    nft_item_id=nft_item.id,
                    trait_type=attr_data['trait_type'],
                    value=attr_data['value'],
                    display_type=attr_data.get('display_type'),
                    max_value=attr_data.get('max_value'),
                    rarity_percentage=attr_data.get('rarity_percentage')
                )
                db.session.add(attribute)
        
        # 创建文物信息
        if data.get('artifact_info'):
            artifact_data = data['artifact_info']
            artifact_info = ArtifactInfo(
                nft_item_id=nft_item.id,
                artifact_name=artifact_data.get('artifact_name', data['name']),
                origin_location=artifact_data.get('origin_location'),
                historical_period=artifact_data.get('historical_period'),
                cultural_significance=artifact_data.get('cultural_significance'),
                historical_story=artifact_data.get('historical_story'),
                material=artifact_data.get('material'),
                dimensions=artifact_data.get('dimensions'),
                weight=artifact_data.get('weight'),
                discovery_location=artifact_data.get('discovery_location'),
                current_location=artifact_data.get('current_location'),
                conservation_status=artifact_data.get('conservation_status'),
                created_by=current_user.id,
                updated_by=current_user.id
            )
            db.session.add(artifact_info)
        
        # 创建元数据并上传到IPFS
        metadata = ipfs_service.create_nft_metadata(
            name=data['name'],
            description=data['description'],
            image_url=data['image_url'],
            attributes=data.get('attributes', []),
            animation_url=data.get('animation_url'),
            artifact_info=data.get('artifact_info')
        )
        
        # 上传元数据到IPFS
        ipfs_result = ipfs_service.upload_nft_metadata(metadata)
        if not ipfs_result['success']:
            return jsonify({'error': f'元数据上传失败: {ipfs_result["error"]}'}), 500
        
        # 更新元数据URI
        nft_item.metadata_uri = ipfs_result['ipfs_url']
        
        db.session.commit()
        
        return jsonify({
            'message': 'NFT藏品创建成功',
            'nft_item': nft_item.to_dict(),
            'metadata_ipfs': ipfs_result
        }), 201
        
    except Exception as e:
        db.session.rollback()
        return jsonify({'error': str(e)}), 500

@nft_bp.route('/items/<int:item_id>/mint', methods=['POST'])
@creator_required
def mint_nft(current_user, item_id):
    """铸造NFT到区块链"""
    try:
        nft_item = NFTItem.query.get_or_404(item_id)
        
        # 验证权限
        if nft_item.creator_id != current_user.id:
            return jsonify({'error': '无权限铸造此NFT'}), 403
        
        if nft_item.is_minted:
            return jsonify({'error': 'NFT已经铸造'}), 400
        
        data = request.get_json()
        to_address = data.get('to_address', current_user.wallet_address)
        
        if not to_address:
            return jsonify({'error': '缺少接收地址'}), 400
        
        # 获取集合信息
        collection = nft_item.collection
        
        # 获取文物信息
        artifact_info = nft_item.artifact_info
        
        try:
            # 铸造NFT到区块链
            tx_hash, token_id = blockchain_service.mint_nft(
                contract_address=collection.contract_address,
                creator_private_key="0x...",  # 实际应用中需要安全处理
                to_address=to_address,
                token_uri=nft_item.metadata_uri,
                artifact_name=artifact_info.artifact_name if artifact_info else nft_item.name,
                origin_location=artifact_info.origin_location if artifact_info else '',
                historical_period=artifact_info.historical_period if artifact_info else '',
                cultural_significance=artifact_info.cultural_significance if artifact_info else '',
                royalty_recipient=current_user.wallet_address,
                royalty_fraction=int(collection.royalty_percentage * 100)  # 转换为基点
            )
        except Exception as e:
            return jsonify({'error': f'区块链铸造失败: {str(e)}'}), 500
        
        # 更新数据库
        nft_item.token_id = str(token_id)
        nft_item.is_minted = True
        nft_item.mint_transaction_hash = tx_hash
        
        # 更新集合总供应量
        collection.total_supply += 1
        
        db.session.commit()
        
        return jsonify({
            'message': 'NFT铸造成功',
            'nft_item': nft_item.to_dict(),
            'transaction_hash': tx_hash,
            'token_id': token_id
        }), 200
        
    except Exception as e:
        db.session.rollback()
        return jsonify({'error': str(e)}), 500

@nft_bp.route('/items/<int:item_id>', methods=['GET'])
@optional_token
def get_nft_item(current_user, item_id):
    """获取NFT藏品详情"""
    try:
        nft_item = NFTItem.query.get_or_404(item_id)
        
        item_data = nft_item.to_dict()
        item_data.update({
            'collection': nft_item.collection.to_dict() if nft_item.collection else None,
            'creator': nft_item.creator.to_dict() if nft_item.creator else None,
            'current_owner': nft_item.current_owner.to_dict() if nft_item.current_owner else None
        })
        
        return jsonify({'nft_item': item_data}), 200
        
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@nft_bp.route('/upload', methods=['POST'])
@creator_required
def upload_file(current_user):
    """上传文件到IPFS"""
    try:
        if 'file' not in request.files:
            return jsonify({'error': '没有文件'}), 400
        
        file = request.files['file']
        if file.filename == '':
            return jsonify({'error': '没有选择文件'}), 400
        
        # 验证文件类型
        allowed_extensions = {'jpg', 'jpeg', 'png', 'gif', 'mp4', 'mov', 'avi', 'glb', 'gltf', 'obj', 'fbx'}
        file_ext = file.filename.rsplit('.', 1)[1].lower() if '.' in file.filename else ''
        
        if file_ext not in allowed_extensions:
            return jsonify({'error': '不支持的文件类型'}), 400
        
        # 保存临时文件
        filename = secure_filename(file.filename)
        temp_path = os.path.join('/tmp', f"{uuid.uuid4()}_{filename}")
        file.save(temp_path)
        
        try:
            # 上传到IPFS
            if file_ext in {'jpg', 'jpeg', 'png', 'gif'}:
                result = ipfs_service.upload_image(temp_path, optimize=True)
            else:
                result = ipfs_service.upload_file(temp_path, filename)
            
            # 清理临时文件
            os.remove(temp_path)
            
            if result['success']:
                return jsonify({
                    'message': '文件上传成功',
                    'file_info': result
                }), 200
            else:
                return jsonify({'error': result['error']}), 500
                
        except Exception as e:
            # 清理临时文件
            if os.path.exists(temp_path):
                os.remove(temp_path)
            raise e
        
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@nft_bp.route('/search', methods=['GET'])
@optional_token
def search_nfts(current_user):
    """搜索NFT"""
    try:
        query_text = request.args.get('q', '').strip()
        page = request.args.get('page', 1, type=int)
        per_page = min(request.args.get('per_page', 20, type=int), 100)
        category = request.args.get('category', '')  # collection, item
        
        if not query_text:
            return jsonify({'error': '搜索关键词不能为空'}), 400
        
        results = {'collections': [], 'items': []}
        
        if category in ['', 'collection']:
            # 搜索集合
            collections_query = NFTCollection.query.filter(
                or_(
                    NFTCollection.name.ilike(f'%{query_text}%'),
                    NFTCollection.description.ilike(f'%{query_text}%')
                )
            ).limit(per_page)
            
            results['collections'] = [col.to_dict() for col in collections_query.all()]
        
        if category in ['', 'item']:
            # 搜索NFT藏品
            items_query = NFTItem.query.filter(
                or_(
                    NFTItem.name.ilike(f'%{query_text}%'),
                    NFTItem.description.ilike(f'%{query_text}%')
                )
            ).limit(per_page)
            
            items = []
            for item in items_query.all():
                item_data = item.to_dict()
                item_data['collection'] = item.collection.to_dict() if item.collection else None
                items.append(item_data)
            
            results['items'] = items
        
        return jsonify({
            'query': query_text,
            'results': results
        }), 200
        
    except Exception as e:
        return jsonify({'error': str(e)}), 500

