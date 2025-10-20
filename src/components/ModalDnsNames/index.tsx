import { Modal } from "antd";
import React from "react";
import styles from './index.less';

type ModalDnsNamesProps = {
  visible: boolean,
  onCancel: () => void,
  dataSource: [string],
};

const ModalDnsNames: React.FC<ModalDnsNamesProps> = ({ dataSource, visible, onCancel }) => {
  return (
    <Modal
      title="多域名"
      destroyOnClose
      maskClosable={false}
      visible={visible}
      onCancel={onCancel}
      footer={null}
      centered
    >
      <div className={styles.container}>
        <ul className={styles.content}>
          {dataSource?.map((item: any) => <li key={item}>{item}</li>)}
        </ul>
      </div>
    </Modal>
  );
};

export default ModalDnsNames;
