import json
import os
import hashlib
import requests
from typing import Dict, List, Optional, BinaryIO
from PIL import Image
import ipfshttpclient
from src.config import Config

class IPFSService:
    """IPFS服务类，处理文件上传和元数据管理"""
    
    def __init__(self):
        self.config = Config()
        self.client = None
        self._init_client()
    
    def _init_client(self):
        """初始化IPFS客户端"""
        try:
            if self.config.IPFS_PROJECT_ID and self.config.IPFS_PROJECT_SECRET:
                # 使用Infura IPFS
                auth = (self.config.IPFS_PROJECT_ID, self.config.IPFS_PROJECT_SECRET)
                self.client = ipfshttpclient.connect(
                    self.config.IPFS_API_URL,
                    auth=auth
                )
            else:
                # 使用本地IPFS节点
                self.client = ipfshttpclient.connect('/ip4/127.0.0.1/tcp/5001')
        except Exception as e:
            print(f"IPFS客户端初始化失败: {e}")
            self.client = None
    
    def upload_file(self, file_path: str, file_name: str = None) -> Dict:
        """上传文件到IPFS"""
        try:
            if not self.client:
                raise Exception("IPFS客户端未初始化")
            
            # 上传文件
            result = self.client.add(file_path)
            
            if isinstance(result, list):
                result = result[0]
            
            ipfs_hash = result['Hash']
            file_size = result['Size']
            
            return {
                'ipfs_hash': ipfs_hash,
                'ipfs_url': f"{self.config.IPFS_GATEWAY_URL}{ipfs_hash}",
                'file_name': file_name or os.path.basename(file_path),
                'file_size': file_size,
                'success': True
            }
            
        except Exception as e:
            return {
                'success': False,
                'error': str(e)
            }
    
    def upload_json(self, data: Dict, file_name: str = None) -> Dict:
        """上传JSON数据到IPFS"""
        try:
            if not self.client:
                raise Exception("IPFS客户端未初始化")
            
            # 将数据转换为JSON字符串
            json_data = json.dumps(data, ensure_ascii=False, indent=2)
            
            # 上传JSON数据
            result = self.client.add_json(data)
            ipfs_hash = result
            
            return {
                'ipfs_hash': ipfs_hash,
                'ipfs_url': f"{self.config.IPFS_GATEWAY_URL}{ipfs_hash}",
                'file_name': file_name or f"{ipfs_hash}.json",
                'file_size': len(json_data.encode('utf-8')),
                'success': True
            }
            
        except Exception as e:
            return {
                'success': False,
                'error': str(e)
            }
    
    def upload_image(self, image_path: str, optimize: bool = True) -> Dict:
        """上传图片到IPFS，支持优化"""
        try:
            if optimize:
                # 优化图片
                optimized_path = self._optimize_image(image_path)
                result = self.upload_file(optimized_path)
                
                # 清理临时文件
                if optimized_path != image_path:
                    os.remove(optimized_path)
                
                return result
            else:
                return self.upload_file(image_path)
                
        except Exception as e:
            return {
                'success': False,
                'error': str(e)
            }
    
    def _optimize_image(self, image_path: str, max_size: tuple = (1920, 1920), quality: int = 85) -> str:
        """优化图片大小和质量"""
        try:
            with Image.open(image_path) as img:
                # 转换为RGB模式（如果需要）
                if img.mode in ('RGBA', 'LA', 'P'):
                    img = img.convert('RGB')
                
                # 调整大小
                img.thumbnail(max_size, Image.Resampling.LANCZOS)
                
                # 生成优化后的文件路径
                base_name = os.path.splitext(image_path)[0]
                optimized_path = f"{base_name}_optimized.jpg"
                
                # 保存优化后的图片
                img.save(optimized_path, 'JPEG', quality=quality, optimize=True)
                
                return optimized_path
                
        except Exception as e:
            # 如果优化失败，返回原始路径
            return image_path
    
    def create_nft_metadata(self, name: str, description: str, image_url: str,
                           attributes: List[Dict] = None, animation_url: str = None,
                           external_url: str = None, artifact_info: Dict = None) -> Dict:
        """创建NFT元数据"""
        metadata = {
            "name": name,
            "description": description,
            "image": image_url
        }
        
        if animation_url:
            metadata["animation_url"] = animation_url
        
        if external_url:
            metadata["external_url"] = external_url
        
        if attributes:
            metadata["attributes"] = attributes
        
        # 添加文物特定信息
        if artifact_info:
            metadata["artifact_info"] = artifact_info
        
        # 添加创建时间戳
        import time
        metadata["created_at"] = int(time.time())
        
        return metadata
    
    def upload_nft_metadata(self, metadata: Dict) -> Dict:
        """上传NFT元数据到IPFS"""
        return self.upload_json(metadata, f"metadata_{metadata.get('name', 'unknown')}.json")
    
    def create_collection_metadata(self, name: str, description: str, 
                                 cover_image: str, banner_image: str = None,
                                 external_url: str = None, social_links: Dict = None) -> Dict:
        """创建集合元数据"""
        metadata = {
            "name": name,
            "description": description,
            "image": cover_image
        }
        
        if banner_image:
            metadata["banner_image"] = banner_image
        
        if external_url:
            metadata["external_url"] = external_url
        
        if social_links:
            metadata["social_links"] = social_links
        
        # 添加创建时间戳
        import time
        metadata["created_at"] = int(time.time())
        
        return metadata
    
    def get_file_info(self, ipfs_hash: str) -> Dict:
        """获取IPFS文件信息"""
        try:
            if not self.client:
                raise Exception("IPFS客户端未初始化")
            
            # 获取文件统计信息
            stat = self.client.object.stat(ipfs_hash)
            
            return {
                'ipfs_hash': ipfs_hash,
                'ipfs_url': f"{self.config.IPFS_GATEWAY_URL}{ipfs_hash}",
                'size': stat['CumulativeSize'],
                'links': stat['NumLinks'],
                'success': True
            }
            
        except Exception as e:
            return {
                'success': False,
                'error': str(e)
            }
    
    def pin_file(self, ipfs_hash: str) -> Dict:
        """固定文件到IPFS节点"""
        try:
            if not self.client:
                raise Exception("IPFS客户端未初始化")
            
            self.client.pin.add(ipfs_hash)
            
            return {
                'ipfs_hash': ipfs_hash,
                'pinned': True,
                'success': True
            }
            
        except Exception as e:
            return {
                'success': False,
                'error': str(e)
            }
    
    def unpin_file(self, ipfs_hash: str) -> Dict:
        """取消固定文件"""
        try:
            if not self.client:
                raise Exception("IPFS客户端未初始化")
            
            self.client.pin.rm(ipfs_hash)
            
            return {
                'ipfs_hash': ipfs_hash,
                'unpinned': True,
                'success': True
            }
            
        except Exception as e:
            return {
                'success': False,
                'error': str(e)
            }
    
    def get_pinned_files(self) -> List[str]:
        """获取已固定的文件列表"""
        try:
            if not self.client:
                return []
            
            pinned = self.client.pin.ls()
            return [item['Hash'] for item in pinned]
            
        except Exception as e:
            return []
    
    def download_file(self, ipfs_hash: str, output_path: str) -> Dict:
        """从IPFS下载文件"""
        try:
            # 使用HTTP网关下载
            url = f"{self.config.IPFS_GATEWAY_URL}{ipfs_hash}"
            response = requests.get(url, stream=True)
            response.raise_for_status()
            
            with open(output_path, 'wb') as f:
                for chunk in response.iter_content(chunk_size=8192):
                    f.write(chunk)
            
            return {
                'ipfs_hash': ipfs_hash,
                'output_path': output_path,
                'file_size': os.path.getsize(output_path),
                'success': True
            }
            
        except Exception as e:
            return {
                'success': False,
                'error': str(e)
            }
    
    def validate_ipfs_hash(self, ipfs_hash: str) -> bool:
        """验证IPFS哈希格式"""
        try:
            # 基本格式验证
            if not ipfs_hash or len(ipfs_hash) < 40:
                return False
            
            # 检查是否以Qm开头（IPFS v0哈希）或以b开头（IPFS v1哈希）
            if ipfs_hash.startswith('Qm') and len(ipfs_hash) == 46:
                return True
            elif ipfs_hash.startswith('b') and len(ipfs_hash) > 50:
                return True
            
            return False
            
        except:
            return False
    
    def calculate_file_hash(self, file_path: str) -> str:
        """计算文件哈希值"""
        try:
            hash_sha256 = hashlib.sha256()
            with open(file_path, "rb") as f:
                for chunk in iter(lambda: f.read(4096), b""):
                    hash_sha256.update(chunk)
            return hash_sha256.hexdigest()
        except:
            return ""
    
    def get_gateway_url(self, ipfs_hash: str) -> str:
        """获取IPFS网关URL"""
        return f"{self.config.IPFS_GATEWAY_URL}{ipfs_hash}"
    
    def test_connection(self) -> Dict:
        """测试IPFS连接"""
        try:
            if not self.client:
                return {
                    'connected': False,
                    'error': 'IPFS客户端未初始化'
                }
            
            # 尝试获取节点信息
            node_info = self.client.id()
            
            return {
                'connected': True,
                'node_id': node_info['ID'],
                'addresses': node_info.get('Addresses', [])
            }
            
        except Exception as e:
            return {
                'connected': False,
                'error': str(e)
            }

