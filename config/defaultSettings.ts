import { Settings as LayoutSettings } from '@ant-design/pro-layout';

const Settings: LayoutSettings & {
  pwa?: boolean;
  logo?: string;
} = {
  navTheme: 'dark',
  // 拂晓蓝
  primaryColor: '#40a9ff',
  // primaryColor: '#FA8334',
  layout: 'top',
  contentWidth: 'Fluid',
  headerHeight: 48,
  fixedHeader: true,
  fixSiderbar: true,
  colorWeak: false,
  // splitMenus: false,
  title: '',
  pwa: false,
  logo: '',
  iconfontUrl: '',
};

export default Settings;
