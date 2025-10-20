

# FROM nginx:alpine

# RUN apk update && apk add --no-cache nodejs npm

FROM harbor.sheca.com/artifacts/prod/node:nginx

# 拷贝后端代码并安装依赖
COPY nodeproject/dist/ /backend/dist/

#拷贝静态文件 css 图片等
COPY nodeproject/public/ /backend/public/

#拷贝 install文件
COPY nodeproject/package.json /backend/dist/package.json


RUN cd /backend/dist && npm install --production







#复制配置文件到docker镜像中
COPY dist.tar /dist.tar

#在docker镜像中解压文件
RUN tar -zxvf dist.tar



#复制配置文件到docker镜像中
COPY ./nginx.conf /etc/nginx/nginx.conf
#复制配置文件到docker镜像中
COPY ./dist.tar /dist.tar
#在docker镜像中解压文件
RUN tar -zxvf dist.tar
#在docker镜像中将文件移动位置，将dist文件夹下内容移动到 html文件中
RUN mv dist/* /usr/share/nginx/html/


# 拷贝启动脚本
COPY start.sh /start.sh
RUN chmod +x /start.sh

EXPOSE 80
#EXPOSE 3000
CMD ["/start.sh"]
