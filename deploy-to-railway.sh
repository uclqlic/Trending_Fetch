#!/bin/bash

echo "🚀 Deploying to Railway"
echo "========================"

# 颜色定义
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# 检查是否已经配置了远程仓库
if ! git remote | grep -q origin; then
    echo -e "${YELLOW}⚠️  No remote repository configured${NC}"
    echo ""
    echo "Please follow these steps:"
    echo ""
    echo "1. Create a new repository on GitHub:"
    echo "   https://github.com/new"
    echo "   Repository name: hots-data-collector (or your preferred name)"
    echo ""
    echo "2. After creating the repository, run:"
    echo -e "${GREEN}   git remote add origin https://github.com/YOUR_USERNAME/YOUR_REPO.git${NC}"
    echo ""
    echo "3. Push the code:"
    echo -e "${GREEN}   git push -u origin main${NC}"
    echo ""
    exit 1
fi

# 获取远程仓库URL
REMOTE_URL=$(git config --get remote.origin.url)
echo -e "${GREEN}✅ Remote repository: ${REMOTE_URL}${NC}"

# 检查是否有未提交的更改
if [[ -n $(git status -s) ]]; then
    echo -e "${YELLOW}⚠️  You have uncommitted changes${NC}"
    echo "Committing changes..."
    git add .
    git commit -m "Update: $(date '+%Y-%m-%d %H:%M:%S')"
fi

# 推送到GitHub
echo ""
echo "📤 Pushing to GitHub..."
git push origin main

if [ $? -eq 0 ]; then
    echo -e "${GREEN}✅ Successfully pushed to GitHub${NC}"
else
    echo -e "${RED}❌ Failed to push to GitHub${NC}"
    echo "Please check your GitHub credentials and try again"
    exit 1
fi

# Railway部署指引
echo ""
echo "========================================="
echo "📦 Now deploy to Railway:"
echo "========================================="
echo ""
echo "Option 1: Using Railway CLI"
echo "----------------------------"
echo "1. Install Railway CLI (if not installed):"
echo -e "${GREEN}   npm install -g @railway/cli${NC}"
echo ""
echo "2. Login to Railway:"
echo -e "${GREEN}   railway login${NC}"
echo ""
echo "3. Link to existing project or create new:"
echo -e "${GREEN}   railway link${NC}"
echo ""
echo "4. Deploy the services:"
echo -e "${GREEN}   # Deploy Go API service"
echo "   railway up --service hots-api"
echo ""
echo "   # Deploy data collector service"
echo "   cd data-collector"
echo "   railway up --service data-collector${NC}"
echo ""
echo ""
echo "Option 2: Using Railway Dashboard"
echo "----------------------------------"
echo "1. Go to https://railway.app"
echo "2. Create New Project → Deploy from GitHub repo"
echo "3. Select your repository: ${REMOTE_URL}"
echo "4. Create two services:"
echo "   - Service 1: hots-api (root directory)"
echo "   - Service 2: data-collector (/data-collector directory)"
echo ""
echo "5. Configure environment variables for data-collector:"
echo "   API_BASE_URL=http://hots-api.railway.internal:8081/api/hot"
echo "   SUPABASE_URL=your_supabase_url"
echo "   SUPABASE_KEY=your_supabase_key"
echo "   OPENAI_API_KEY=your_openai_key"
echo "   PLATFORMS=baidu,toutiao,douban,xhs,36kr,juejin,ithome,weibo,bili,zhihu"
echo "   COLLECTION_SCHEDULE=*/15 * * * *"
echo ""
echo -e "${GREEN}✅ Your code is ready to deploy!${NC}"