#!/bin/sh

# 启动 node 后端
node /backend/dist/main.js &

# 启动 nginx（前端服务）
nginx -g "daemon off;"



