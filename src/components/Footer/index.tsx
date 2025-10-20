import { DefaultFooter } from '@ant-design/pro-layout';
import type { WithFalse } from '@ant-design/pro-layout/lib/typings';
import type { CSSProperties } from 'react';
import { useModel, history } from 'umi';
import React, { useState, useEffect } from 'react';

type LayoutProps = {
  links?: WithFalse<{
    key?: string;
    title: React.ReactNode;
    href: string;
    blankTarget?: boolean;
  }[]>;
  copyright?: WithFalse<string>;
  style?: CSSProperties;
  className?: string;
  prefixCls?: string;
};

const Footer: React.FC<LayoutProps> = (props) => {
  const {initialState, setInitialState} = useModel('@@initialState');
  const defaultMessage = '上海市数字证书认证中心有限公司';

  const currentYear = new Date().getFullYear();

  const linkDom = <span>
    {currentYear} {defaultMessage} 
    {/* icons by
    <a style={{color: 'rgba(0, 0, 0, 0.45)'}} href='https://icons8.com/' target='_blank'> icons8.com</a> */}
  </span>

  // useEffect(() => {
  //   console.log('footerMarginBottom----', initialState)
  // }, [initialState?.footerMarginBottom])

  return (
    <DefaultFooter
      style={{
        marginBottom: initialState?.footerMarginBottom,
      }}
      copyright={linkDom}
      links={[]}
      {...props}
    />
  );
};

export default Footer;
