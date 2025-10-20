
# 任务执行打包 dist,并压缩
build_dist:
	rm -rf dist
	rm -f dist.tar
	npm run build
	tar -zcvf dist.tar dist


