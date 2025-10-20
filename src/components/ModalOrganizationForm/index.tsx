import React, { useState } from 'react';
import { ModalForm, ProFormSelect, ProFormText, ProFormTextArea } from '@ant-design/pro-form';
import { addOrganization, updateOrganization } from '@/services/api';
import { message } from 'antd';
import { COUNTRY_CODE } from '@/utils/config';

const formItemLayout = {
  labelCol: { span: 6 },
  wrapperCol: { span: 14 },
};

type ModalFormProps = {
  visible: boolean;
  dataSource: any;
  onCancel: (value?: boolean) => void;
};

const ModalFormItem: React.FC<ModalFormProps> = ({ visible, dataSource: { title, record }, onCancel }) => {
  const [loading, setLoading] = useState<boolean>(false);

  const handleOnFinish = async (values: any) => {
    setLoading(true);
    try {
      const params = { ...values };
      if (record?.id) {
        params.id = record?.id;
      }
      const response: any = await (record?.id ? updateOrganization : addOrganization)(params);
      setLoading(false);
      if (response?.code >= 0) {
        message.success('操作成功');
        onCancel(true);
      }
    } catch (error) {
      console.error(error);
      setLoading(false);
    }
  }
  return (
    <ModalForm
      title={title}
      width={520}
      visible={visible}
      submitter={{
        submitButtonProps: {
          loading,
        },
      }}
      onFinish={handleOnFinish}
      modalProps={{
        onCancel: () => onCancel(),
        destroyOnClose: true,
        maskClosable: false,
      }}
      initialValues={record}
      layout="horizontal"
      {...formItemLayout}
    >
      <ProFormText name="orgName" label="组织名称" rules={[
        {
          required: true,
          message: '请输入组织名称',
        }
      ]} />
      <ProFormSelect name="orgCountry" label="组织所在国家" rules={[
        {
          required: true,
          message: '请输入组织所在国家',
        }
      ]} valueEnum={COUNTRY_CODE} showSearch />
      <ProFormText name="orgRegion" label="组织所在省份" rules={[
        {
          required: true,
          message: '请输入组织所在省份',
        }
      ]} />
      <ProFormText name="orgCity" label="组织所在城市" rules={[
        {
          required: true,
          message: '请输入组织所在城市',
        }
      ]} />
      <ProFormTextArea name="orgAddressLine" label="组织详细地址" rules={[
        {
          required: true,
          message: '请输入组织详细地址',
        }
      ]} fieldProps={{
        autoSize: { minRows: 3, maxRows: 5 }
      }} />
      <ProFormText name="orgPhone" label="联系电话" rules={[
        {
          required: true,
          message: '请输入联系电话',
        },
      ]} />
      <ProFormText name="orgPostalCode" label="邮政编码" rules={[
        {
          required: true,
          message: '请输入邮政编码',
        },
      ]} />
    </ModalForm>
  );
}

export default ModalFormItem;
