#!/bin/bash

PORT=3004

echo "Checking port ${PORT}..."

# 使用多种方法查找进程
echo "Method 1: Using lsof..."
pid_lsof=$(lsof -t -i:${PORT})

echo "Method 2: Using netstat..."
pid_netstat=$(netstat -vanp tcp | grep ${PORT} | awk '{print $9}')

echo "Method 3: Looking for Node.js processes..."
pid_node=$(ps aux | grep "node" | grep -v grep | awk '{print $2}')

# 合并所有找到的进程ID
all_pids="$pid_lsof $pid_netstat $pid_node"

if [ -n "$all_pids" ]; then
    echo "Found process(es): $all_pids"
    echo "Killing processes..."
    for pid in $all_pids; do
        if [ -n "$pid" ]; then
            echo "Killing process $pid..."
            kill -9 $pid 2>/dev/null || echo "Failed to kill process $pid"
        fi
    done
    echo "Waiting for port to be released..."
    sleep 2
else
    echo "No process found using standard methods"
fi

# 强制释放端口（仅适用于 macOS）
echo "Attempting to reset port ${PORT}..."
sudo lsof -i :${PORT} && sudo kill -9 $(sudo lsof -t -i:${PORT}) 2>/dev/null
sudo pfctl -F all -f /etc/pf.conf 2>/dev/null || true

echo "Port cleanup completed"
