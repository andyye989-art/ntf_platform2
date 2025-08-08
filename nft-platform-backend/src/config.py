import os
from dotenv import load_dotenv

# 加载环境变量
load_dotenv()

class Config:
    """基础配置类"""
    
    # Flask配置
    SECRET_KEY = os.getenv('SECRET_KEY', 'dev-secret-key-change-in-production')
    DEBUG = os.getenv('DEBUG', 'False').lower() == 'true'
    TESTING = os.getenv('TESTING', 'False').lower() == 'true'
    
    # 数据库配置
    SQLALCHEMY_DATABASE_URI = os.getenv('DATABASE_URL', 'sqlite:///data/app.db')
    SQLALCHEMY_TRACK_MODIFICATIONS = False
    SQLALCHEMY_ENGINE_OPTIONS = {
        'pool_pre_ping': True,
        'pool_recycle': 300,
    }
    
    # JWT配置
    JWT_SECRET_KEY = os.getenv('JWT_SECRET_KEY', 'jwt-secret-key-change-in-production')
    JWT_ACCESS_TOKEN_EXPIRES = int(os.getenv('JWT_ACCESS_TOKEN_EXPIRES', '86400'))  # 24小时
    JWT_ALGORITHM = 'HS256'
    
    # 区块链配置
    WEB3_PROVIDER_URL = os.getenv('WEB3_PROVIDER_URL', 'https://mainnet.infura.io/v3/your_project_id')
    POLYGON_PROVIDER_URL = os.getenv('POLYGON_PROVIDER_URL', 'https://polygon-mainnet.infura.io/v3/your_project_id')
    TESTNET_PROVIDER_URL = os.getenv('TESTNET_PROVIDER_URL', 'https://goerli.infura.io/v3/your_project_id')
    
    # 智能合约地址
    ARTIFACT_FACTORY_ADDRESS = os.getenv('ARTIFACT_FACTORY_ADDRESS', '')
    ARTIFACT_MARKETPLACE_ADDRESS = os.getenv('ARTIFACT_MARKETPLACE_ADDRESS', '')
    
    # IPFS配置
    IPFS_API_URL = os.getenv('IPFS_API_URL', 'https://ipfs.infura.io:5001')
    IPFS_GATEWAY_URL = os.getenv('IPFS_GATEWAY_URL', 'https://ipfs.io/ipfs/')
    IPFS_PROJECT_ID = os.getenv('IPFS_PROJECT_ID', '')
    IPFS_PROJECT_SECRET = os.getenv('IPFS_PROJECT_SECRET', '')
    
    # 文件上传配置
    MAX_FILE_SIZE = int(os.getenv('MAX_FILE_SIZE', '10485760'))  # 10MB
    ALLOWED_EXTENSIONS = set(os.getenv('ALLOWED_EXTENSIONS', 'jpg,jpeg,png,gif,mp4,mov,avi,glb,gltf,obj,fbx').split(','))
    UPLOAD_FOLDER = os.path.join(os.path.dirname(os.path.dirname(__file__)), 'uploads')
    
    # 邮件配置
    MAIL_SERVER = os.getenv('MAIL_SERVER', 'smtp.gmail.com')
    MAIL_PORT = int(os.getenv('MAIL_PORT', '587'))
    MAIL_USE_TLS = os.getenv('MAIL_USE_TLS', 'True').lower() == 'true'
    MAIL_USERNAME = os.getenv('MAIL_USERNAME', '')
    MAIL_PASSWORD = os.getenv('MAIL_PASSWORD', '')
    
    # Redis配置
    REDIS_URL = os.getenv('REDIS_URL', 'redis://localhost:6379/0')
    
    # 安全配置
    BCRYPT_LOG_ROUNDS = int(os.getenv('BCRYPT_LOG_ROUNDS', '12'))
    
    # API配置
    API_RATE_LIMIT = int(os.getenv('API_RATE_LIMIT', '100'))
    CORS_ORIGINS = os.getenv('CORS_ORIGINS', '*')
    
    # 平台配置
    PLATFORM_NAME = os.getenv('PLATFORM_NAME', 'Digital Artifact NFT Platform')
    PLATFORM_FEE_PERCENTAGE = float(os.getenv('PLATFORM_FEE_PERCENTAGE', '2.5'))
    MIN_PRICE = float(os.getenv('MIN_PRICE', '0.001'))
    
    # 分页配置
    DEFAULT_PAGE_SIZE = 20
    MAX_PAGE_SIZE = 100
    
    # 缓存配置
    CACHE_TYPE = 'simple'
    CACHE_DEFAULT_TIMEOUT = 300  # 5分钟

class DevelopmentConfig(Config):
    """开发环境配置"""
    DEBUG = True
    TESTING = False

class TestingConfig(Config):
    """测试环境配置"""
    DEBUG = False
    TESTING = True
    SQLALCHEMY_DATABASE_URI = 'sqlite:///:memory:'
    WTF_CSRF_ENABLED = False

class ProductionConfig(Config):
    """生产环境配置"""
    DEBUG = False
    TESTING = False
    
    # 生产环境安全配置
    SESSION_COOKIE_SECURE = True
    SESSION_COOKIE_HTTPONLY = True
    SESSION_COOKIE_SAMESITE = 'Lax'

# 配置映射
config = {
    'development': DevelopmentConfig,
    'testing': TestingConfig,
    'production': ProductionConfig,
    'default': DevelopmentConfig
}

