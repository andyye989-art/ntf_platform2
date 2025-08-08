import json
import os
from typing import Dict, List, Optional, Tuple
from web3 import Web3
from eth_account import Account
from decimal import Decimal
import requests
from src.config import Config

class BlockchainService:
    """区块链服务类，处理与智能合约的交互"""
    
    def __init__(self):
        self.config = Config()
        self.w3 = Web3(Web3.HTTPProvider(self.config.WEB3_PROVIDER_URL))
        self.polygon_w3 = Web3(Web3.HTTPProvider(self.config.POLYGON_PROVIDER_URL))
        
        # 加载智能合约ABI
        self._load_contract_abis()
        
        # 初始化合约实例
        self._init_contracts()
    
    def _load_contract_abis(self):
        """加载智能合约ABI"""
        # 这里应该加载实际的合约ABI
        # 为了演示，使用简化的ABI
        self.artifact_nft_abi = [
            {
                "inputs": [
                    {"name": "to", "type": "address"},
                    {"name": "tokenURI", "type": "string"},
                    {"name": "artifactName", "type": "string"},
                    {"name": "originLocation", "type": "string"},
                    {"name": "historicalPeriod", "type": "string"},
                    {"name": "culturalSignificance", "type": "string"},
                    {"name": "royaltyRecipient", "type": "address"},
                    {"name": "royaltyFraction", "type": "uint96"}
                ],
                "name": "mintArtifact",
                "outputs": [{"name": "", "type": "uint256"}],
                "type": "function"
            },
            {
                "inputs": [{"name": "tokenId", "type": "uint256"}],
                "name": "getArtifactInfo",
                "outputs": [
                    {
                        "components": [
                            {"name": "artifactName", "type": "string"},
                            {"name": "originLocation", "type": "string"},
                            {"name": "historicalPeriod", "type": "string"},
                            {"name": "culturalSignificance", "type": "string"},
                            {"name": "creationTimestamp", "type": "uint256"},
                            {"name": "creator", "type": "address"},
                            {"name": "isVerified", "type": "bool"}
                        ],
                        "name": "",
                        "type": "tuple"
                    }
                ],
                "type": "function"
            }
        ]
        
        self.marketplace_abi = [
            {
                "inputs": [
                    {"name": "nftContract", "type": "address"},
                    {"name": "tokenId", "type": "uint256"},
                    {"name": "price", "type": "uint256"}
                ],
                "name": "createFixedPriceListing",
                "outputs": [{"name": "", "type": "uint256"}],
                "type": "function"
            },
            {
                "inputs": [{"name": "listingId", "type": "uint256"}],
                "name": "buyFixedPrice",
                "outputs": [],
                "type": "function"
            }
        ]
        
        self.factory_abi = [
            {
                "inputs": [
                    {"name": "name", "type": "string"},
                    {"name": "symbol", "type": "string"},
                    {"name": "description", "type": "string"},
                    {"name": "coverImage", "type": "string"},
                    {"name": "bannerImage", "type": "string"}
                ],
                "name": "createCollection",
                "outputs": [
                    {"name": "", "type": "uint256"},
                    {"name": "", "type": "address"}
                ],
                "type": "function"
            }
        ]
    
    def _init_contracts(self):
        """初始化合约实例"""
        try:
            # 在开发环境中跳过合约初始化
            if os.getenv('FLASK_ENV') == 'development':
                self.factory_contract = None
                self.marketplace_contract = None
                return
                
            if self.config.ARTIFACT_FACTORY_ADDRESS and self.config.ARTIFACT_FACTORY_ADDRESS != '0x...':
                self.factory_contract = self.w3.eth.contract(
                    address=self.config.ARTIFACT_FACTORY_ADDRESS,
                    abi=self.factory_abi
                )
            else:
                self.factory_contract = None
            
            if self.config.ARTIFACT_MARKETPLACE_ADDRESS and self.config.ARTIFACT_MARKETPLACE_ADDRESS != '0x...':
                self.marketplace_contract = self.w3.eth.contract(
                    address=self.config.ARTIFACT_MARKETPLACE_ADDRESS,
                    abi=self.marketplace_abi
                )
            else:
                self.marketplace_contract = None
        except Exception as e:
            print(f"合约初始化失败: {e}")
            self.factory_contract = None
            self.marketplace_contract = None
    
    def get_nft_contract(self, contract_address: str):
        """获取NFT合约实例"""
        return self.w3.eth.contract(
            address=contract_address,
            abi=self.artifact_nft_abi
        )
    
    def create_collection(self, creator_private_key: str, name: str, symbol: str, 
                         description: str, cover_image: str, banner_image: str) -> Tuple[str, int, str]:
        """创建NFT集合"""
        try:
            account = Account.from_key(creator_private_key)
            
            # 构建交易
            function = self.factory_contract.functions.createCollection(
                name, symbol, description, cover_image, banner_image
            )
            
            # 估算gas费用
            gas_estimate = function.estimateGas({'from': account.address})
            
            # 构建交易参数
            transaction = function.buildTransaction({
                'from': account.address,
                'gas': gas_estimate,
                'gasPrice': self.w3.eth.gas_price,
                'nonce': self.w3.eth.get_transaction_count(account.address),
                'value': self.w3.toWei(0.01, 'ether')  # 创建费用
            })
            
            # 签名交易
            signed_txn = self.w3.eth.account.sign_transaction(transaction, creator_private_key)
            
            # 发送交易
            tx_hash = self.w3.eth.send_raw_transaction(signed_txn.rawTransaction)
            
            # 等待交易确认
            receipt = self.w3.eth.wait_for_transaction_receipt(tx_hash)
            
            # 解析事件获取集合信息
            collection_id = None
            contract_address = None
            
            for log in receipt.logs:
                try:
                    decoded_log = self.factory_contract.events.CollectionCreated().processLog(log)
                    collection_id = decoded_log.args.collectionId
                    contract_address = decoded_log.args.contractAddress
                    break
                except:
                    continue
            
            return tx_hash.hex(), collection_id, contract_address
            
        except Exception as e:
            raise Exception(f"创建集合失败: {str(e)}")
    
    def mint_nft(self, contract_address: str, creator_private_key: str, to_address: str,
                token_uri: str, artifact_name: str, origin_location: str,
                historical_period: str, cultural_significance: str,
                royalty_recipient: str, royalty_fraction: int) -> Tuple[str, int]:
        """铸造NFT"""
        try:
            nft_contract = self.get_nft_contract(contract_address)
            account = Account.from_key(creator_private_key)
            
            # 构建交易
            function = nft_contract.functions.mintArtifact(
                to_address, token_uri, artifact_name, origin_location,
                historical_period, cultural_significance,
                royalty_recipient, royalty_fraction
            )
            
            # 估算gas费用
            gas_estimate = function.estimateGas({'from': account.address})
            
            # 构建交易参数
            transaction = function.buildTransaction({
                'from': account.address,
                'gas': gas_estimate,
                'gasPrice': self.w3.eth.gas_price,
                'nonce': self.w3.eth.get_transaction_count(account.address)
            })
            
            # 签名交易
            signed_txn = self.w3.eth.account.sign_transaction(transaction, creator_private_key)
            
            # 发送交易
            tx_hash = self.w3.eth.send_raw_transaction(signed_txn.rawTransaction)
            
            # 等待交易确认
            receipt = self.w3.eth.wait_for_transaction_receipt(tx_hash)
            
            # 解析事件获取token ID
            token_id = None
            for log in receipt.logs:
                try:
                    decoded_log = nft_contract.events.ArtifactMinted().processLog(log)
                    token_id = decoded_log.args.tokenId
                    break
                except:
                    continue
            
            return tx_hash.hex(), token_id
            
        except Exception as e:
            raise Exception(f"铸造NFT失败: {str(e)}")
    
    def create_listing(self, creator_private_key: str, nft_contract: str,
                      token_id: int, price: Decimal) -> str:
        """创建市场挂单"""
        try:
            account = Account.from_key(creator_private_key)
            price_wei = self.w3.toWei(price, 'ether')
            
            # 构建交易
            function = self.marketplace_contract.functions.createFixedPriceListing(
                nft_contract, token_id, price_wei
            )
            
            # 估算gas费用
            gas_estimate = function.estimateGas({'from': account.address})
            
            # 构建交易参数
            transaction = function.buildTransaction({
                'from': account.address,
                'gas': gas_estimate,
                'gasPrice': self.w3.eth.gas_price,
                'nonce': self.w3.eth.get_transaction_count(account.address)
            })
            
            # 签名交易
            signed_txn = self.w3.eth.account.sign_transaction(transaction, creator_private_key)
            
            # 发送交易
            tx_hash = self.w3.eth.send_raw_transaction(signed_txn.rawTransaction)
            
            return tx_hash.hex()
            
        except Exception as e:
            raise Exception(f"创建挂单失败: {str(e)}")
    
    def buy_nft(self, buyer_private_key: str, listing_id: int, price: Decimal) -> str:
        """购买NFT"""
        try:
            account = Account.from_key(buyer_private_key)
            price_wei = self.w3.toWei(price, 'ether')
            
            # 构建交易
            function = self.marketplace_contract.functions.buyFixedPrice(listing_id)
            
            # 估算gas费用
            gas_estimate = function.estimateGas({
                'from': account.address,
                'value': price_wei
            })
            
            # 构建交易参数
            transaction = function.buildTransaction({
                'from': account.address,
                'gas': gas_estimate,
                'gasPrice': self.w3.eth.gas_price,
                'nonce': self.w3.eth.get_transaction_count(account.address),
                'value': price_wei
            })
            
            # 签名交易
            signed_txn = self.w3.eth.account.sign_transaction(transaction, buyer_private_key)
            
            # 发送交易
            tx_hash = self.w3.eth.send_raw_transaction(signed_txn.rawTransaction)
            
            return tx_hash.hex()
            
        except Exception as e:
            raise Exception(f"购买NFT失败: {str(e)}")
    
    def get_artifact_info(self, contract_address: str, token_id: int) -> Dict:
        """获取文物信息"""
        try:
            nft_contract = self.get_nft_contract(contract_address)
            artifact_info = nft_contract.functions.getArtifactInfo(token_id).call()
            
            return {
                'artifact_name': artifact_info[0],
                'origin_location': artifact_info[1],
                'historical_period': artifact_info[2],
                'cultural_significance': artifact_info[3],
                'creation_timestamp': artifact_info[4],
                'creator': artifact_info[5],
                'is_verified': artifact_info[6]
            }
            
        except Exception as e:
            raise Exception(f"获取文物信息失败: {str(e)}")
    
    def get_transaction_status(self, tx_hash: str) -> Dict:
        """获取交易状态"""
        try:
            receipt = self.w3.eth.get_transaction_receipt(tx_hash)
            transaction = self.w3.eth.get_transaction(tx_hash)
            
            return {
                'status': 'confirmed' if receipt.status == 1 else 'failed',
                'block_number': receipt.blockNumber,
                'gas_used': receipt.gasUsed,
                'gas_price': transaction.gasPrice,
                'from_address': transaction['from'],
                'to_address': transaction.to,
                'value': transaction.value
            }
            
        except Exception as e:
            return {'status': 'pending'}
    
    def get_eth_price(self) -> float:
        """获取ETH价格（USD）"""
        try:
            response = requests.get(
                'https://api.coingecko.com/api/v3/simple/price?ids=ethereum&vs_currencies=usd'
            )
            data = response.json()
            return data['ethereum']['usd']
        except:
            return 0.0
    
    def estimate_gas_fee(self, transaction_data: Dict) -> Dict:
        """估算gas费用"""
        try:
            gas_estimate = self.w3.eth.estimate_gas(transaction_data)
            gas_price = self.w3.eth.gas_price
            
            gas_fee_wei = gas_estimate * gas_price
            gas_fee_eth = self.w3.fromWei(gas_fee_wei, 'ether')
            
            eth_price = self.get_eth_price()
            gas_fee_usd = float(gas_fee_eth) * eth_price
            
            return {
                'gas_estimate': gas_estimate,
                'gas_price': gas_price,
                'gas_fee_wei': gas_fee_wei,
                'gas_fee_eth': float(gas_fee_eth),
                'gas_fee_usd': gas_fee_usd
            }
            
        except Exception as e:
            raise Exception(f"估算gas费用失败: {str(e)}")
    
    def validate_address(self, address: str) -> bool:
        """验证以太坊地址"""
        try:
            return self.w3.isAddress(address)
        except:
            return False
    
    def get_balance(self, address: str) -> Decimal:
        """获取地址余额"""
        try:
            balance_wei = self.w3.eth.get_balance(address)
            balance_eth = self.w3.fromWei(balance_wei, 'ether')
            return Numeric(str(balance_eth))
        except:
            return Numeric('0')

