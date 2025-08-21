#!/bin/bash

# 激活Miniconda环境
source ~/miniconda/bin/activate nft_backend

# 进入后端项目目录
cd /home/ubuntu/nft-platform-backend

# 设置Flask环境变量
export FLASK_APP=src/main.py
export FLASK_ENV=development

# 启动Flask应用
flask run --host=0.0.0.0 --port=5000


