#!/bin/bash

# 设置源目录和目标目录
SOURCE_DIR="/Users/tuxy/Codes/Windsurf-Test1/duiyi1"
BACKUP_BASE_DIR="/Users/tuxy/Codes/Windsurf-Test1/Backup1/duiyi"

# 创建时间戳格式的目录名
TIMESTAMP=$(date +"%Y%m%d-%H%M")
BACKUP_DIR="${BACKUP_BASE_DIR}/duiyi-${TIMESTAMP}"

# 确保备份基础目录存在
mkdir -p "${BACKUP_BASE_DIR}"

# 创建新的备份目录
mkdir -p "${BACKUP_DIR}"

# 复制客户端关键文件
echo "Backing up client files..."
mkdir -p "${BACKUP_DIR}/go-game/client/src"
mkdir -p "${BACKUP_DIR}/go-game/client/public"

# 复制客户端源代码和配置文件
cp -r "${SOURCE_DIR}/go-game/client/src" "${BACKUP_DIR}/go-game/client/"
cp -r "${SOURCE_DIR}/go-game/client/public" "${BACKUP_DIR}/go-game/client/"
cp "${SOURCE_DIR}/go-game/client/package.json" "${BACKUP_DIR}/go-game/client/"
cp "${SOURCE_DIR}/go-game/client/tsconfig.json" "${BACKUP_DIR}/go-game/client/"
cp "${SOURCE_DIR}/go-game/client/tsconfig.node.json" "${BACKUP_DIR}/go-game/client/"
cp "${SOURCE_DIR}/go-game/client/vite.config.ts" "${BACKUP_DIR}/go-game/client/"
cp "${SOURCE_DIR}/go-game/client/index.html" "${BACKUP_DIR}/go-game/client/"

# 复制服务器端关键文件
echo "Backing up server files..."
mkdir -p "${BACKUP_DIR}/go-game/server/src"

# 复制服务器端源代码和配置文件
cp -r "${SOURCE_DIR}/go-game/server/src" "${BACKUP_DIR}/go-game/server/"
cp "${SOURCE_DIR}/go-game/server/package.json" "${BACKUP_DIR}/go-game/server/"
cp "${SOURCE_DIR}/go-game/server/tsconfig.json" "${BACKUP_DIR}/go-game/server/"
cp "${SOURCE_DIR}/go-game/server/tsconfig.build.json" "${BACKUP_DIR}/go-game/server/"
cp "${SOURCE_DIR}/go-game/server/nest-cli.json" "${BACKUP_DIR}/go-game/server/"

# 复制项目根目录的配置文件
cp "${SOURCE_DIR}/package.json" "${BACKUP_DIR}/" 2>/dev/null || :
cp "${SOURCE_DIR}/package-lock.json" "${BACKUP_DIR}/" 2>/dev/null || :
cp "${SOURCE_DIR}/README.md" "${BACKUP_DIR}/" 2>/dev/null || :

# 创建.gitignore文件
cat > "${BACKUP_DIR}/.gitignore" << EOL
**/node_modules/
**/dist/
**/.env
**/*.log
EOL

echo "Backup completed at: ${BACKUP_DIR}"

# 显示备份大小
BACKUP_SIZE=$(du -sh "${BACKUP_DIR}" | cut -f1)
echo "Backup size: ${BACKUP_SIZE}"
