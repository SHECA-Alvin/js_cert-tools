// https://umijs.org/config/
import { defineConfig } from 'umi';
import { join } from 'path';

import defaultSettings from './defaultSettings';
import proxy from './proxy';
import routes from './routes';
import { SubresourceIntegrityPlugin } from "webpack-subresource-integrity";

const { REACT_APP_ENV } = process.env;

export default defineConfig({
  // chainWebpack(memo, { env, webpack }) {
  //   memo.module
  //     .rule('worker')
  //     .test(/\.worker\.js$/)
  //     .use('worker')
  //     .loader('worker-loader')
  //     .options({ inline: 'no-fallback' })
  // },
  // chainWebpack(config) {
  //   console.log('env.NODE_ENV----', process.env.NODE_ENV)
  //   if (process.env.NODE_ENV === 'production') {
  //     // 1. 启用 crossOriginLoading（必需）
  //     config.output.set('crossOriginLoading', 'anonymous');
      
  //     // 2. 确保 JS 文件有哈希名
  //     config.output
  //       .set('filename', 'static/js/[name].[contenthash:8].js')
  //       .set('chunkFilename', 'static/js/[name].[contenthash:8].chunk.js');
      
  //     // 3. 确保 CSS 文件有哈希名 - 使用安全的 tap 方法
  //     if (config.plugins.has('mini-css-extract-plugin')) {
  //       config.plugin('mini-css-extract-plugin').tap((args = [{}]) => {
  //         const [options = {}] = args;
  //         return [{
  //           ...options,
  //           filename: 'static/css/[name].[contenthash:8].css',
  //           chunkFilename: 'static/css/[name].[contenthash:8].chunk.css'
  //         }];
  //       });
  //     }
  //     // 4. ✅ 正确添加 SRI 插件 - 使用 new 创建实例
  //     config.plugin('subresource-integrity')
  //       .use(new SubresourceIntegrityPlugin({
  //         hashFuncNames: ['sha384', 'sha512'],
  //         enabled: true
  //       }));
  //   }
  // },
  extraBabelPlugins: [process.env.NODE_ENV === 'production' ? 'transform-remove-console' : ''],
  hash: true,
  antd: {},
  dva: {
    hmr: true,
  },
  layout: {
    // https://umijs.org/zh-CN/plugins/plugin-layout
    locale: true,
    siderWidth: 208,
    ...defaultSettings,
  },
  // https://umijs.org/zh-CN/plugins/plugin-locale
  locale: {
    // default zh-CN
    default: 'zh-CN',
    antd: true,
    // default true, when it is true, will use `navigator.language` overwrite default
    baseNavigator: true,
  },
  dynamicImport: {
    loading: '@ant-design/pro-layout/es/PageLoading',
  },
  targets: {
    ie: 11,
  },
  // umi routes: https://umijs.org/docs/routing
  routes,
  // Theme for antd: https://ant.design/docs/react/customize-theme-cn
  theme: {
    'primary-color': defaultSettings.primaryColor,
    'root-entry-name': 'default',
  },
  // esbuild is father build tools
  // https://umijs.org/plugins/plugin-esbuild
  esbuild: {},
  title: false,
  ignoreMomentLocale: true,
  proxy: proxy[REACT_APP_ENV || 'dev'],
  manifest: {
    basePath: '/',
  },
  // Fast Refresh 热更新
  fastRefresh: {},
  // openAPI: [
  //   {
  //     requestLibPath: "import { request } from 'umi'",
  //     // 或者使用在线的版本
  //     // schemaPath: "https://gw.alipayobjects.com/os/antfincdn/M%24jrzTTYJN/oneapi.json"
  //     schemaPath: join(__dirname, 'oneapi.json'),
  //     mock: false,
  //   },
  //   {
  //     requestLibPath: "import { request } from 'umi'",
  //     schemaPath: 'https://gw.alipayobjects.com/os/antfincdn/CA1dOm%2631B/openapi.json',
  //     projectName: 'swagger',
  //   },
  // ],
  nodeModulesTransform: { type: 'none' },
  mfsu: {},
  webpack5: {},
  exportStatic: {},
  history: { type: 'hash' },
  publicPath: process.env.NODE_ENV === 'production' ? '/' : '/',
  // base: process.env.NODE_ENV === 'production' ? '/v2/' : '/',
});
