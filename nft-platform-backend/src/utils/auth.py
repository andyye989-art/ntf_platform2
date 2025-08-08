import jwt
import bcrypt
from datetime import datetime, timedelta
from functools import wraps
from flask import request, jsonify, current_app
from src.models.user import User, db
from src.config import Config

class AuthService:
    """认证服务类"""
    
    @staticmethod
    def hash_password(password: str) -> str:
        """哈希密码"""
        salt = bcrypt.gensalt(rounds=Config.BCRYPT_LOG_ROUNDS)
        return bcrypt.hashpw(password.encode('utf-8'), salt).decode('utf-8')
    
    @staticmethod
    def verify_password(password: str, hashed_password: str) -> bool:
        """验证密码"""
        return bcrypt.checkpw(password.encode('utf-8'), hashed_password.encode('utf-8'))
    
    @staticmethod
    def generate_token(user_id: int, expires_in: int = None) -> str:
        """生成JWT令牌"""
        if expires_in is None:
            expires_in = Config.JWT_ACCESS_TOKEN_EXPIRES
        
        payload = {
            'user_id': user_id,
            'exp': datetime.utcnow() + timedelta(seconds=expires_in),
            'iat': datetime.utcnow()
        }
        
        return jwt.encode(
            payload,
            Config.JWT_SECRET_KEY,
            algorithm=Config.JWT_ALGORITHM
        )
    
    @staticmethod
    def verify_token(token: str) -> dict:
        """验证JWT令牌"""
        try:
            payload = jwt.decode(
                token,
                Config.JWT_SECRET_KEY,
                algorithms=[Config.JWT_ALGORITHM]
            )
            return {'valid': True, 'user_id': payload['user_id']}
        except jwt.ExpiredSignatureError:
            return {'valid': False, 'error': 'Token已过期'}
        except jwt.InvalidTokenError:
            return {'valid': False, 'error': 'Token无效'}
    
    @staticmethod
    def get_current_user(token: str) -> User:
        """根据令牌获取当前用户"""
        result = AuthService.verify_token(token)
        if result['valid']:
            return User.query.get(result['user_id'])
        return None

def token_required(f):
    """需要令牌的装饰器"""
    @wraps(f)
    def decorated(*args, **kwargs):
        token = None
        
        # 从请求头获取令牌
        if 'Authorization' in request.headers:
            auth_header = request.headers['Authorization']
            try:
                token = auth_header.split(" ")[1]  # Bearer <token>
            except IndexError:
                return jsonify({'error': '令牌格式无效'}), 401
        
        if not token:
            return jsonify({'error': '缺少访问令牌'}), 401
        
        # 验证令牌
        result = AuthService.verify_token(token)
        if not result['valid']:
            return jsonify({'error': result['error']}), 401
        
        # 获取用户信息
        current_user = User.query.get(result['user_id'])
        if not current_user or not current_user.is_active:
            return jsonify({'error': '用户不存在或已被禁用'}), 401
        
        # 将用户信息传递给路由函数
        return f(current_user, *args, **kwargs)
    
    return decorated

def optional_token(f):
    """可选令牌的装饰器"""
    @wraps(f)
    def decorated(*args, **kwargs):
        current_user = None
        
        # 尝试从请求头获取令牌
        if 'Authorization' in request.headers:
            auth_header = request.headers['Authorization']
            try:
                token = auth_header.split(" ")[1]
                result = AuthService.verify_token(token)
                if result['valid']:
                    current_user = User.query.get(result['user_id'])
            except:
                pass
        
        return f(current_user, *args, **kwargs)
    
    return decorated

def admin_required(f):
    """需要管理员权限的装饰器"""
    @wraps(f)
    def decorated(*args, **kwargs):
        token = None
        
        if 'Authorization' in request.headers:
            auth_header = request.headers['Authorization']
            try:
                token = auth_header.split(" ")[1]
            except IndexError:
                return jsonify({'error': '令牌格式无效'}), 401
        
        if not token:
            return jsonify({'error': '缺少访问令牌'}), 401
        
        result = AuthService.verify_token(token)
        if not result['valid']:
            return jsonify({'error': result['error']}), 401
        
        current_user = User.query.get(result['user_id'])
        if not current_user or not current_user.is_active:
            return jsonify({'error': '用户不存在或已被禁用'}), 401
        
        # 检查管理员权限（这里简化为检查用户ID为1）
        if current_user.id != 1:
            return jsonify({'error': '需要管理员权限'}), 403
        
        return f(current_user, *args, **kwargs)
    
    return decorated

def creator_required(f):
    """需要创建者权限的装饰器"""
    @wraps(f)
    def decorated(*args, **kwargs):
        token = None
        
        if 'Authorization' in request.headers:
            auth_header = request.headers['Authorization']
            try:
                token = auth_header.split(" ")[1]
            except IndexError:
                return jsonify({'error': '令牌格式无效'}), 401
        
        if not token:
            return jsonify({'error': '缺少访问令牌'}), 401
        
        result = AuthService.verify_token(token)
        if not result['valid']:
            return jsonify({'error': result['error']}), 401
        
        current_user = User.query.get(result['user_id'])
        if not current_user or not current_user.is_active:
            return jsonify({'error': '用户不存在或已被禁用'}), 401
        
        if not current_user.is_creator:
            return jsonify({'error': '需要创建者权限'}), 403
        
        return f(current_user, *args, **kwargs)
    
    return decorated

def validate_wallet_signature(message: str, signature: str, wallet_address: str) -> bool:
    """验证钱包签名"""
    try:
        from eth_account.messages import encode_defunct
        from eth_account import Account
        
        # 编码消息
        message_encoded = encode_defunct(text=message)
        
        # 恢复签名者地址
        recovered_address = Account.recover_message(message_encoded, signature=signature)
        
        # 比较地址（不区分大小写）
        return recovered_address.lower() == wallet_address.lower()
        
    except Exception as e:
        print(f"钱包签名验证失败: {e}")
        return False

def generate_nonce() -> str:
    """生成随机数用于钱包登录"""
    import secrets
    return secrets.token_hex(16)

class WalletAuth:
    """钱包认证类"""
    
    @staticmethod
    def generate_login_message(wallet_address: str, nonce: str) -> str:
        """生成钱包登录消息"""
        return f"请签名此消息以验证您的钱包所有权。\n\n钱包地址: {wallet_address}\n随机数: {nonce}\n时间戳: {datetime.utcnow().isoformat()}"
    
    @staticmethod
    def verify_wallet_login(wallet_address: str, signature: str, nonce: str) -> bool:
        """验证钱包登录"""
        message = WalletAuth.generate_login_message(wallet_address, nonce)
        return validate_wallet_signature(message, signature, wallet_address)

