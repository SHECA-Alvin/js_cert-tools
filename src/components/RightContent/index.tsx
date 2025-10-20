import { Space, Button, Popover, Card, Row } from 'antd';
import { DownOutlined } from '@ant-design/icons';
import React, { useState } from 'react';
import { useModel, history } from 'umi';
import ProCard from '@ant-design/pro-card';
import Avatar from './AvatarDropdown';
import Balance from './Balance';
import { SSL_LIST, CERT_LIST } from '@/utils/config'
import styles from './index.less';

const { Meta } = Card;
export type SiderTheme = 'light' | 'dark';

const GlobalHeaderRight: React.FC = () => {
  const {initialState, setInitialState} = useModel('@@initialState');
  const [isOpen, setIsOpen] = useState<boolean>(false)

  if (!initialState || !initialState.settings) {
    return null;
  }

  const { navTheme, layout } = initialState.settings;
  let className = styles.right;

  if ((navTheme === 'dark' && layout === 'top') || layout === 'mix') {
    className = `${styles.right}  ${styles.dark}`;
  }

  const toPath = (item: any) => {
    setTimeout(async () => {
      setIsOpen(false)
      await setInitialState((s) => {
        return {
          ...s,
          footerMarginBottom: 0
        }
      })
      console.log('离开页面', initialState)
    }, 100)
    history.push(item.path)
    window.scrollTo(0, 0)
  }

  const getCardDomList = (list: Array<any>) => {
    return list.map(item => {
      return (
        <ProCard title="" colSpan="50%" className="cardItem" onClick={() => toPath(item)} key={item.path}>
          <img src={item.src} alt="" style={{width: '50px'}} />
          <div className="cardText">
            <p>{item.title}</p>
            {/* <p>2222</p> */}
          </div>
        </ProCard>
      )
    })
  }

  const content = (
    <Row className="poverWrapBox">
      <Row className="leftRow">
        <p className="title">SSL工具</p>
        {
          getCardDomList(SSL_LIST)
        }
      </Row>
  
      <Row className="leftRow">
        <p className="title">证书工具</p>
        {
          getCardDomList(CERT_LIST)
        }
      </Row>
    </Row>
  );

  const onOpenChange = async (open: boolean) => {
    console.log('onOpenChange', open)
    if (!open) {
      setIsOpen(false)
      await setInitialState((s) => {
        return {
          ...s,
          footerMarginBottom: 0
        }
      })
      console.log('关闭0s', initialState)
    }
  }

  const visibleShow = async () => {
    let headerDom = document.querySelector('.ant-pro-fixed-header')
    let elementTop = headerDom?.getBoundingClientRect().top
    let scrollTop = document.documentElement.scrollTop
    const windowHeight = window.innerHeight
    // 计算元素底部到视口顶部的距离
    const elementBottom = elementTop + headerDom?.offsetHeight
    // 计算元素底部到页面底部的距离
    const distanceToBottom = windowHeight - elementBottom
    console.log('2333----',open, elementTop, scrollTop, elementBottom, distanceToBottom)
    if (distanceToBottom < 780) {
      await setInitialState((s) => {
        return {
          ...s,
          footerMarginBottom: 780
        }
      })
      console.log('打开780s', initialState)
    }
    setIsOpen(true)
  }

  return (
    <Space className={styles.headerRightWrap}>
      {/* <Popover content={content} trigger="click" open={isOpen} onOpenChange={onOpenChange} placement="bottomRight">
        <Button type="text" style={{color: 'white'}} onClick={visibleShow}>
          工具箱 
          <DownOutlined />
        </Button>
      </Popover> */}
    </Space>
  );
};
export default GlobalHeaderRight;
