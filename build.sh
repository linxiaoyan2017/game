#!/bin/bash

# AI进化游戏构建脚本
echo "🚀 开始构建AI进化游戏..."

# 创建发布目录
if [ -d "dist" ]; then
    echo "📁 清理旧的构建文件..."
    rm -rf dist
fi

mkdir -p dist

# 复制静态文件
echo "📋 复制静态文件..."
cp index.html dist/
cp -r css dist/
cp -r js dist/
cp -r assets dist/
cp README.md dist/
cp package.json dist/

# 优化HTML - 压缩空白
echo "🔧 优化HTML..."
sed 's/>[[:space:]]*</></g' index.html > dist/index.html.tmp
mv dist/index.html.tmp dist/index.html

# 创建生产环境的package.json
echo "📦 创建生产环境配置..."
cat > dist/package.json << 'EOF'
{
  "name": "ai-evolution-game",
  "version": "1.0.0",
  "description": "5分钟AI进化游戏 - 从比特到数字上帝的赛博朋克合成游戏",
  "main": "index.html",
  "scripts": {
    "start": "python3 -m http.server 8080",
    "start-alt": "python -m http.server 8080"
  },
  "keywords": ["game", "AI", "evolution", "cyberpunk", "web", "canvas", "merging"],
  "author": "AI Evolution Team",
  "license": "MIT"
}
EOF

# 生成部署清单
echo "📋 生成部署清单..."
find dist -type f > dist/MANIFEST.txt

# 计算构建大小
BUILD_SIZE=$(du -sh dist | cut -f1)
echo "✅ 构建完成！"
echo "📊 构建大小: $BUILD_SIZE"
echo "🌐 部署命令: cd dist && python3 -m http.server 8080"
echo "🔗 访问地址: http://localhost:8080"