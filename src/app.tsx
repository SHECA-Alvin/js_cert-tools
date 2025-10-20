import type { Settings as LayoutSettings } from '@ant-design/pro-layout';
import { PageLoading } from '@ant-design/pro-layout';
import type { RequestConfig, RunTimeLayoutConfig } from 'umi';
import { history } from 'umi';
import RightContent from '@/components/RightContent';
import Footer from '@/components/Footer';
// import { fetchUserInfo as queryCurrentUser } from '@/services/api';
import { message } from 'antd';
import Logo from '../public/logo.png';
import GlobalMessage from "@/components/GlobalMessage";
import { Spin } from "antd";

const loginPath = '/user/login';
const WHITE_LIST: string[] = [
  '/user/login',
  '/user/register',
  '/user/forget-password',
  '/user/reset-password',
  '/user/account-active',
];

const IGNORE_LIST: string[] = [];

const filterPath = () => { 
  return WHITE_LIST.every((item) => !history?.location?.pathname?.startsWith(item));
};

/** 获取用户信息比较慢的时候会展示一个 loading */
export const initialStateConfig = {
  loading: <PageLoading />,
};

/**
 * @see  https://umijs.org/zh-CN/plugins/plugin-initial-state
 * */
export async function getInitialState(): Promise<{
  settings?: Partial<LayoutSettings>;
  currentUser?: any;
  footerMarginBottom: number,
  fetchUserInfo?: () => Promise<any>;
}> {
  // const fetchUserInfo = async () => {
  //   try {
  //     const msg = await queryCurrentUser();
  //     return msg.data;
  //   } catch (error) {
  //     history.push(loginPath);
  //   }
  //   return undefined;
  // };
  // 未登录，不执行
  // if (filterPath()) {
  //   const currentUser = await fetchUserInfo();
  //   return {
  //     fetchUserInfo,
  //     currentUser,
  //     settings: {},
  //   };
  // }
  return {
    // fetchUserInfo,
    settings: {},
    footerMarginBottom: 0
  };
}

// ProLayout 支持的api https://procomponents.ant.design/components/layout
export const layout: RunTimeLayoutConfig = ({ initialState }) => {
  return {
    rightContentRender: () => <RightContent />,
    disableContentMargin: false,
    waterMarkProps: {
      content: initialState?.currentUser?.name,
    },
    footerRender: () => <Footer />,
    onPageChange: () => {
      // 如果没有登录，重定向到 login
      // if (!initialState?.currentUser && filterPath()) {
      //   history.push(loginPath);
      // }
    },
    links: [],
    menuHeaderRender: undefined,
    // 自定义 403 页面
    // unAccessible: <div>unAccessible</div>,
    // 增加一个 loading 的状态
    // childrenRender: (children) => {
    //   if (initialState.loading) return <PageLoading />;
    //   return children;
    // },
    ...initialState?.settings,
    logo: Logo,
  };
};

const errorMsgMap = {
  200: '服务器成功返回请求的数据。',
  201: '新建或修改数据成功。',
  202: '一个请求已经进入后台排队（异步任务）。',
  204: '删除数据成功。',
  400: '发出的请求有错误，服务器没有进行新建或修改数据的操作。',
  401: '用户没有权限（令牌、用户名、密码错误）。',
  403: '用户得到授权，但是访问是被禁止的。',
  404: '发出的请求针对的是不存在的记录，服务器没有进行操作。',
  405: '请求方法不被允许。',
  406: '请求的格式不可得。',
  410: '请求的资源被永久删除，且不会再得到的。',
  422: '当创建一个对象时，发生一个验证错误。',
  500: '服务器发生错误，请检查服务器。',
  502: '网关错误。',
  503: '服务不可用，服务器暂时过载或维护。',
  504: '网关超时。',
};

let modal: any
const responseInterceptors: any = async (response: Response) => {
  modal?.destroy()
  const contentType = response.headers.get('Content-Type');
  if (contentType && contentType.match(/application\/json/i)) {
    const res = await response.clone().json();
    // 获取成功结果返回
    if (res?.code >= 0 || IGNORE_LIST.indexOf(response?.url) !== -1) {
      return res;
    }
    if (IGNORE_LIST.indexOf(response?.url) === -1) {
      message.error(res?.errors);
    }
  } else {
    return response;
  }

  // if (response?.status === 401) {
  //   return history.push('/user/login');
  // }

  return false;
};

export const request: RequestConfig = {
  timeout: 50000,
  errorHandler: (error: any) => {
    modal?.destroy();
    const { response, data } = error;
    if (response) {
      // console.log(error.response, data);
      // 不同状态码判断
      if (response.url) {
        message.error(data.error || errorMsgMap[response.status] || '服务器错误');
      }
      return false;
    } else {
      message.error('服务器错误')
    }

    return false;
  },

  requestInterceptors: [
    (url, options) => {
    // 拦截请求配置，进行个性化处理。
      // console.log('req--url', url, options)
      // @ts-ignore
      if (!options.headers?.noLoading) {
        modal = GlobalMessage(
          {
            content: <div style={{display: 'flex', justifyContent: 'center', alignContent: 'center'}}><Spin tip="loading"/>
            </div>,
          }
        );
      }
      return { url, options }
    }
  ],
  // middlewares: [middlewaresFirst],
  responseInterceptors: [responseInterceptors],
};

