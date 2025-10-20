import { DefaultFooter } from '@ant-design/pro-layout';
import type { WithFalse } from '@ant-design/pro-layout/lib/typings';
import type { CSSProperties } from 'react';
import { useModel, history } from 'umi';
import React, { useState, useEffect } from 'react';
import {Button, message, Skeleton, Space, Tabs, Spin, Alert} from "antd";

const TipInfo: React.FC = (props) => {

  return (
    <Alert
      style={{margin: '0 auto', width: '64%', marginTop: '20px'}}
      message={<p style={{fontWeight: 500, fontSize: '14px'}}>声明:</p>}
      description={
        <div style={{fontSize: '12px'}}>
          <p>1. 本工具代码完全前端实现，打开此网页后，可断网使用！</p>
        </div>
      }
      type="success"
      showIcon={true}
    />
  );
};

export default TipInfo;
