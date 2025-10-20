import { recharge } from "@/services/api";
import { ModalForm, ProFormText, ProFormUploadButton } from "@ant-design/pro-form";
import { message } from "antd";
import React, { useState } from "react";

const formItemLayout = {
  labelCol: { span: 4 },
  wrapperCol: { span: 16 },
};

type ModalRechargeProps = {
  visible: boolean;
  onCancel: (value?: boolean) => void;
}

const ModalRecharge: React.FC<ModalRechargeProps> = ({ visible, onCancel }) => {
  const [loading, setLoading] = useState<boolean>(false);

  const handleOnFinish = async (values: any) => {
    setLoading(true);
    try {
      const formData = new FormData();
      Object.keys(values).forEach((key: string) => {
        formData.append(key, Array.isArray(values[key]) ? values[key]?.[0]?.originFileObj : values[key]);
      });
      const response: any = await recharge(formData);
      setLoading(false);
      if (response?.code >= 0) {
        message.success('充值成功');
        onCancel(true);
      }
    } catch (error) {
      console.error(error);
      setLoading(false);
    }
  }

  return (
    <ModalForm
      title="充值"
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
      layout="horizontal"
      {...formItemLayout}
    >
      <ProFormText
        label="充值金额"
        name="amount"
        rules={[
          {
            required: true,
            message: '请输入充值金额',
          },
          {
            pattern: /^([1-9][0-9]*)+(.[0-9]{1,2})?$/,
            message: '请输入数字',
          }
        ]}
      />
      <ProFormUploadButton
        label="凭证"
        name="file"
        fieldProps={{
          beforeUpload: () => {
            return false;
          },
          accept: '.jpg,.jpeg,.png,.gif,.bmp,.pdf',
        }}
        rules={[
          {
            required: true,
            message: '请上传凭证',
          }
        ]}
        max={1}
      />
    </ModalForm>
  );
}

export default ModalRecharge;
