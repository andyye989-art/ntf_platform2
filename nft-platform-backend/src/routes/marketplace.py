from flask import Blueprint, request, jsonify
from sqlalchemy import desc, asc, and_, or_
from datetime import datetime, timedelta
from decimal import Decimal
from src.models.user import db
from src.models.nft import NFTItem
from src.models.transaction import Transaction, MarketListing, Bid
from src.utils.auth import token_required, optional_token
from src.services.blockchain_service import BlockchainService

marketplace_bp = Blueprint('marketplace', __name__)

# 初始化服务
blockchain_service = BlockchainService()

@marketplace_bp.route('/listings', methods=['GET'])
@optional_token
def get_listings(current_user):
    """获取市场挂单列表"""
    try:
        page = request.args.get('page', 1, type=int)
        per_page = min(request.args.get('per_page', 20, type=int), 100)
        listing_type = request.args.get('type', '')  # fixed_price, auction
        status = request.args.get('status', 'active')
        collection_id = request.args.get('collection_id', type=int)
        seller_id = request.args.get('seller_id', type=int)
        min_price = request.args.get('min_price', type=float)
        max_price = request.args.get('max_price', type=float)
        currency = request.args.get('currency', 'ETH')
        sort_by = request.args.get('sort_by', 'created_at')
        sort_order = request.args.get('sort_order', 'desc')
        
        # 构建查询
        query = MarketListing.query
        
        # 过滤条件
        if status:
            query = query.filter(MarketListing.status == status)
        
        if listing_type:
            query = query.filter(MarketListing.listing_type == listing_type)
        
        if collection_id:
            query = query.join(NFTItem).filter(NFTItem.collection_id == collection_id)
        
        if seller_id:
            query = query.filter(MarketListing.seller_id == seller_id)
        
        if min_price is not None:
            query = query.filter(MarketListing.price >= min_price)
        
        if max_price is not None:
            query = query.filter(MarketListing.price <= max_price)
        
        if currency:
            query = query.filter(MarketListing.currency == currency)
        
        # 过滤过期的拍卖
        if listing_type == 'auction':
            query = query.filter(
                or_(
                    MarketListing.end_time.is_(None),
                    MarketListing.end_time > datetime.utcnow()
                )
            )
        
        # 排序
        if sort_by == 'price':
            order_column = MarketListing.price
        elif sort_by == 'end_time':
            order_column = MarketListing.end_time
        else:
            order_column = MarketListing.created_at
        
        if sort_order == 'asc':
            query = query.order_by(asc(order_column))
        else:
            query = query.order_by(desc(order_column))
        
        # 分页
        pagination = query.paginate(
            page=page, per_page=per_page, error_out=False
        )
        
        listings = []
        for listing in pagination.items:
            listing_data = listing.to_dict()
            listing_data.update({
                'nft_item': listing.nft_item.to_dict() if listing.nft_item else None,
                'seller': listing.seller.to_dict() if listing.seller else None
            })
            
            # 添加拍卖的最高竞价信息
            if listing.listing_type == 'auction':
                highest_bid = Bid.query.filter_by(
                    listing_id=listing.id, status='active'
                ).order_by(desc(Bid.bid_amount)).first()
                
                if highest_bid:
                    listing_data['highest_bid'] = highest_bid.to_dict()
                    listing_data['highest_bid']['bidder'] = highest_bid.bidder.to_dict()
            
            listings.append(listing_data)
        
        return jsonify({
            'listings': listings,
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

@marketplace_bp.route('/listings', methods=['POST'])
@token_required
def create_listing(current_user):
    """创建市场挂单"""
    try:
        data = request.get_json()
        
        # 验证必需字段
        required_fields = ['nft_item_id', 'listing_type', 'price', 'currency']
        for field in required_fields:
            if not data.get(field):
                return jsonify({'error': f'缺少必需字段: {field}'}), 400
        
        # 验证NFT存在且用户拥有
        nft_item = NFTItem.query.get_or_404(data['nft_item_id'])
        if nft_item.current_owner_id != current_user.id:
            return jsonify({'error': '您不拥有此NFT'}), 403
        
        if not nft_item.is_minted:
            return jsonify({'error': 'NFT尚未铸造'}), 400
        
        # 检查是否已有活跃挂单
        existing_listing = MarketListing.query.filter_by(
            nft_item_id=data['nft_item_id'], status='active'
        ).first()
        if existing_listing:
            return jsonify({'error': 'NFT已有活跃挂单'}), 400
        
        # 验证挂单类型和参数
        listing_type = data['listing_type']
        if listing_type not in ['fixed_price', 'auction']:
            return jsonify({'error': '无效的挂单类型'}), 400
        
        price = Numeric(str(data['price']))
        if price <= 0:
            return jsonify({'error': '价格必须大于0'}), 400
        
        # 创建挂单
        listing = MarketListing(
            nft_item_id=data['nft_item_id'],
            seller_id=current_user.id,
            listing_type=listing_type,
            price=price,
            currency=data['currency'],
            start_time=datetime.utcnow()
        )
        
        # 拍卖特定参数
        if listing_type == 'auction':
            duration_hours = data.get('duration_hours', 24)
            if duration_hours < 1 or duration_hours > 720:  # 1小时到30天
                return jsonify({'error': '拍卖持续时间必须在1-720小时之间'}), 400
            
            listing.end_time = datetime.utcnow() + timedelta(hours=duration_hours)
        
        db.session.add(listing)
        db.session.flush()  # 获取ID
        
        # 创建区块链挂单
        try:
            tx_hash = blockchain_service.create_listing(
                creator_private_key="0x...",  # 实际应用中需要安全处理
                nft_contract=nft_item.collection.contract_address,
                token_id=int(nft_item.token_id),
                price=price
            )
        except Exception as e:
            db.session.rollback()
            return jsonify({'error': f'区块链挂单创建失败: {str(e)}'}), 500
        
        db.session.commit()
        
        return jsonify({
            'message': '挂单创建成功',
            'listing': listing.to_dict(),
            'transaction_hash': tx_hash
        }), 201
        
    except Exception as e:
        db.session.rollback()
        return jsonify({'error': str(e)}), 500

@marketplace_bp.route('/listings/<int:listing_id>', methods=['GET'])
@optional_token
def get_listing(current_user, listing_id):
    """获取挂单详情"""
    try:
        listing = MarketListing.query.get_or_404(listing_id)
        
        listing_data = listing.to_dict(include_bids=True)
        listing_data.update({
            'nft_item': listing.nft_item.to_dict() if listing.nft_item else None,
            'seller': listing.seller.to_dict() if listing.seller else None
        })
        
        # 添加竞价者信息
        if listing_data.get('bids'):
            for bid_data in listing_data['bids']:
                bid = Bid.query.get(bid_data['id'])
                bid_data['bidder'] = bid.bidder.to_dict() if bid.bidder else None
        
        return jsonify({'listing': listing_data}), 200
        
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@marketplace_bp.route('/listings/<int:listing_id>/buy', methods=['POST'])
@token_required
def buy_nft(current_user, listing_id):
    """购买NFT（固定价格）"""
    try:
        listing = MarketListing.query.get_or_404(listing_id)
        
        # 验证挂单状态
        if listing.status != 'active':
            return jsonify({'error': '挂单不可用'}), 400
        
        if listing.listing_type != 'fixed_price':
            return jsonify({'error': '此挂单不是固定价格销售'}), 400
        
        if listing.seller_id == current_user.id:
            return jsonify({'error': '不能购买自己的NFT'}), 400
        
        # 验证用户余额（这里简化处理）
        user_balance = blockchain_service.get_balance(current_user.wallet_address)
        if user_balance < listing.price:
            return jsonify({'error': '余额不足'}), 400
        
        try:
            # 执行区块链购买交易
            tx_hash = blockchain_service.buy_nft(
                buyer_private_key="0x...",  # 实际应用中需要安全处理
                listing_id=listing_id,
                price=listing.price
            )
        except Exception as e:
            return jsonify({'error': f'区块链交易失败: {str(e)}'}), 500
        
        # 更新数据库
        listing.status = 'sold'
        
        # 更新NFT所有者
        nft_item = listing.nft_item
        old_owner_id = nft_item.current_owner_id
        nft_item.current_owner_id = current_user.id
        
        # 创建交易记录
        transaction = Transaction(
            nft_item_id=nft_item.id,
            transaction_hash=tx_hash,
            transaction_type='sale',
            from_user_id=old_owner_id,
            to_user_id=current_user.id,
            price=listing.price,
            currency=listing.currency,
            status='pending'
        )
        
        db.session.add(transaction)
        db.session.commit()
        
        return jsonify({
            'message': 'NFT购买成功',
            'transaction_hash': tx_hash,
            'transaction': transaction.to_dict()
        }), 200
        
    except Exception as e:
        db.session.rollback()
        return jsonify({'error': str(e)}), 500

@marketplace_bp.route('/listings/<int:listing_id>/bid', methods=['POST'])
@token_required
def place_bid(current_user, listing_id):
    """对拍卖进行竞价"""
    try:
        listing = MarketListing.query.get_or_404(listing_id)
        
        # 验证挂单状态
        if listing.status != 'active':
            return jsonify({'error': '挂单不可用'}), 400
        
        if listing.listing_type != 'auction':
            return jsonify({'error': '此挂单不是拍卖'}), 400
        
        if listing.seller_id == current_user.id:
            return jsonify({'error': '不能对自己的拍卖竞价'}), 400
        
        # 检查拍卖是否已结束
        if listing.end_time and listing.end_time <= datetime.utcnow():
            return jsonify({'error': '拍卖已结束'}), 400
        
        data = request.get_json()
        bid_amount = Numeric(str(data.get('bid_amount', 0)))
        
        if bid_amount <= 0:
            return jsonify({'error': '竞价金额必须大于0'}), 400
        
        # 获取当前最高竞价
        highest_bid = Bid.query.filter_by(
            listing_id=listing_id, status='active'
        ).order_by(desc(Bid.bid_amount)).first()
        
        # 验证竞价金额
        min_bid = listing.price
        if highest_bid:
            min_bid = highest_bid.bid_amount * Numeric('1.05')  # 至少高出5%
        
        if bid_amount < min_bid:
            return jsonify({
                'error': f'竞价金额必须至少为 {min_bid} {listing.currency}'
            }), 400
        
        # 验证用户余额
        user_balance = blockchain_service.get_balance(current_user.wallet_address)
        if user_balance < bid_amount:
            return jsonify({'error': '余额不足'}), 400
        
        # 取消用户之前的竞价
        previous_bid = Bid.query.filter_by(
            listing_id=listing_id, bidder_id=current_user.id, status='active'
        ).first()
        if previous_bid:
            previous_bid.status = 'withdrawn'
        
        # 创建新竞价
        bid = Bid(
            listing_id=listing_id,
            bidder_id=current_user.id,
            bid_amount=bid_amount,
            currency=listing.currency,
            expires_at=listing.end_time
        )
        
        db.session.add(bid)
        
        # 如果在拍卖结束前10分钟内竞价，延长拍卖时间
        if listing.end_time:
            time_remaining = listing.end_time - datetime.utcnow()
            if time_remaining.total_seconds() < 600:  # 10分钟
                listing.end_time = datetime.utcnow() + timedelta(minutes=10)
        
        db.session.commit()
        
        return jsonify({
            'message': '竞价成功',
            'bid': bid.to_dict(),
            'new_end_time': listing.end_time.isoformat() if listing.end_time else None
        }), 201
        
    except Exception as e:
        db.session.rollback()
        return jsonify({'error': str(e)}), 500

@marketplace_bp.route('/listings/<int:listing_id>/end-auction', methods=['POST'])
@token_required
def end_auction(current_user, listing_id):
    """结束拍卖"""
    try:
        listing = MarketListing.query.get_or_404(listing_id)
        
        # 验证权限（卖家或管理员可以结束拍卖）
        if listing.seller_id != current_user.id and current_user.id != 1:
            return jsonify({'error': '无权限结束此拍卖'}), 403
        
        if listing.status != 'active':
            return jsonify({'error': '拍卖不可用'}), 400
        
        if listing.listing_type != 'auction':
            return jsonify({'error': '此挂单不是拍卖'}), 400
        
        # 检查拍卖是否可以结束
        if listing.end_time and listing.end_time > datetime.utcnow():
            return jsonify({'error': '拍卖尚未到期'}), 400
        
        # 获取最高竞价
        highest_bid = Bid.query.filter_by(
            listing_id=listing_id, status='active'
        ).order_by(desc(Bid.bid_amount)).first()
        
        if not highest_bid:
            # 没有竞价，拍卖流拍
            listing.status = 'expired'
            db.session.commit()
            
            return jsonify({
                'message': '拍卖流拍，无人竞价',
                'listing': listing.to_dict()
            }), 200
        
        # 有竞价，完成交易
        try:
            # 执行区块链交易
            tx_hash = blockchain_service.buy_nft(
                buyer_private_key="0x...",  # 实际应用中需要安全处理
                listing_id=listing_id,
                price=highest_bid.bid_amount
            )
        except Exception as e:
            return jsonify({'error': f'区块链交易失败: {str(e)}'}), 500
        
        # 更新数据库
        listing.status = 'sold'
        highest_bid.status = 'accepted'
        
        # 更新NFT所有者
        nft_item = listing.nft_item
        old_owner_id = nft_item.current_owner_id
        nft_item.current_owner_id = highest_bid.bidder_id
        
        # 创建交易记录
        transaction = Transaction(
            nft_item_id=nft_item.id,
            transaction_hash=tx_hash,
            transaction_type='auction',
            from_user_id=old_owner_id,
            to_user_id=highest_bid.bidder_id,
            price=highest_bid.bid_amount,
            currency=listing.currency,
            status='pending'
        )
        
        db.session.add(transaction)
        db.session.commit()
        
        return jsonify({
            'message': '拍卖结束，交易完成',
            'transaction_hash': tx_hash,
            'winning_bid': highest_bid.to_dict(),
            'transaction': transaction.to_dict()
        }), 200
        
    except Exception as e:
        db.session.rollback()
        return jsonify({'error': str(e)}), 500

@marketplace_bp.route('/listings/<int:listing_id>/cancel', methods=['POST'])
@token_required
def cancel_listing(current_user, listing_id):
    """取消挂单"""
    try:
        listing = MarketListing.query.get_or_404(listing_id)
        
        # 验证权限
        if listing.seller_id != current_user.id:
            return jsonify({'error': '无权限取消此挂单'}), 403
        
        if listing.status != 'active':
            return jsonify({'error': '挂单不可用'}), 400
        
        # 如果是拍卖且有竞价，不能取消
        if listing.listing_type == 'auction':
            active_bids = Bid.query.filter_by(
                listing_id=listing_id, status='active'
            ).count()
            if active_bids > 0:
                return jsonify({'error': '拍卖有竞价，无法取消'}), 400
        
        # 更新挂单状态
        listing.status = 'cancelled'
        
        # 取消所有相关竞价
        Bid.query.filter_by(listing_id=listing_id, status='active').update(
            {'status': 'withdrawn'}
        )
        
        db.session.commit()
        
        return jsonify({
            'message': '挂单已取消',
            'listing': listing.to_dict()
        }), 200
        
    except Exception as e:
        db.session.rollback()
        return jsonify({'error': str(e)}), 500

@marketplace_bp.route('/transactions', methods=['GET'])
@optional_token
def get_transactions(current_user):
    """获取交易记录"""
    try:
        page = request.args.get('page', 1, type=int)
        per_page = min(request.args.get('per_page', 20, type=int), 100)
        transaction_type = request.args.get('type', '')
        user_id = request.args.get('user_id', type=int)
        nft_item_id = request.args.get('nft_item_id', type=int)
        status = request.args.get('status', '')
        
        # 构建查询
        query = Transaction.query
        
        # 过滤条件
        if transaction_type:
            query = query.filter(Transaction.transaction_type == transaction_type)
        
        if user_id:
            query = query.filter(
                or_(
                    Transaction.from_user_id == user_id,
                    Transaction.to_user_id == user_id
                )
            )
        
        if nft_item_id:
            query = query.filter(Transaction.nft_item_id == nft_item_id)
        
        if status:
            query = query.filter(Transaction.status == status)
        
        # 排序
        query = query.order_by(desc(Transaction.created_at))
        
        # 分页
        pagination = query.paginate(
            page=page, per_page=per_page, error_out=False
        )
        
        transactions = []
        for transaction in pagination.items:
            transaction_data = transaction.to_dict()
            transaction_data.update({
                'nft_item': transaction.nft_item.to_dict() if transaction.nft_item else None,
                'from_user': transaction.from_user.to_dict() if transaction.from_user else None,
                'to_user': transaction.to_user.to_dict() if transaction.to_user else None
            })
            transactions.append(transaction_data)
        
        return jsonify({
            'transactions': transactions,
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

@marketplace_bp.route('/stats', methods=['GET'])
@optional_token
def get_marketplace_stats(current_user):
    """获取市场统计数据"""
    try:
        # 活跃挂单数量
        active_listings = MarketListing.query.filter_by(status='active').count()
        
        # 24小时交易量
        yesterday = datetime.utcnow() - timedelta(days=1)
        daily_volume = db.session.query(
            db.func.sum(Transaction.price)
        ).filter(
            Transaction.created_at >= yesterday,
            Transaction.status == 'confirmed'
        ).scalar() or 0
        
        # 总交易量
        total_volume = db.session.query(
            db.func.sum(Transaction.price)
        ).filter(Transaction.status == 'confirmed').scalar() or 0
        
        # 总交易数量
        total_transactions = Transaction.query.filter_by(status='confirmed').count()
        
        # 平均价格
        avg_price = db.session.query(
            db.func.avg(Transaction.price)
        ).filter(Transaction.status == 'confirmed').scalar() or 0
        
        return jsonify({
            'stats': {
                'active_listings': active_listings,
                'daily_volume': float(daily_volume),
                'total_volume': float(total_volume),
                'total_transactions': total_transactions,
                'average_price': float(avg_price)
            }
        }), 200
        
    except Exception as e:
        return jsonify({'error': str(e)}), 500

