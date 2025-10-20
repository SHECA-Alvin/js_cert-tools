import { InboxOutlined } from "@ant-design/icons";
import { Modal, Upload } from "antd";
import React from "react";

type ModalUploadProps = {
  visible: boolean,
  title?: string | React.ReactNode,
  uploadProps: any,
  onCancel: () => void,
}

const ModalUpload: React.FC<ModalUploadProps> = ({ visible, title = "上传文件", onCancel, uploadProps }) => {
  return (
    <Modal
      title={title}
      visible={visible}
      destroyOnClose
      maskClosable={false}
      onCancel={onCancel}
      footer={null}
    >
      <Upload.Dragger {...uploadProps}>
        <p className="ant-upload-drag-icon">
          <InboxOutlined />
        </p>
        <p className="ant-upload-text">点击上传文件</p>
        <p className="ant-upload-hint">
          上传文件
        </p>
      </Upload.Dragger>
    </Modal>
  );
}

export default ModalUpload;
