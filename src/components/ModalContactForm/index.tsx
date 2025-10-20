import React, { useState } from 'react';
import { ModalForm, ProFormText } from '@ant-design/pro-form';
import { addContact, updateContact } from '@/services/api';
import { message } from 'antd';

const formItemLayout = {
  labelCol: { span: 4 },
  wrapperCol: { span: 16 },
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
      const response: any = await (record?.id ? updateContact : addContact)(params);
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
      <ProFormText name="firstName" label="姓" rules={[
        {
          required: true,
          message: '请输入姓',
        }
      ]} />
      <ProFormText name="lastName" label="名" rules={[
        {
          required: true,
          message: '请输入名字',
        }
      ]} />
      <ProFormText name="email" label="邮箱" rules={[
        {
          required: true,
          message: '请输入邮箱',
        },
        {
          type: 'email',
          message: '请输入正确的邮箱地址',
        },
      ]} />
      <ProFormText name="phone" label="电话" rules={[
        {
          required: true,
          message: '请输入电话号码',
        },
        {
          pattern: /^1[3456789]\d{9}$/,
          message: '请输入正确的电话号码',
        }
      ]} />
      <ProFormText name="title" label="职位" rules={[
        {
          required: true,
          message: '请输入职位',
        },
      ]} />
    </ModalForm>
  );
}

export default ModalFormItem;
