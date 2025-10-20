import { fetchBalance } from "@/services/api";
import { formateMoney } from "@/utils/utils";
import { Button } from "antd";
import React, { useEffect, useState } from "react";
import ModalRecharge from "../ModalRecharge";
import styles from './index.less';

const Balance: React.FC = () => {
  const [balance, setBalance] = useState<number>(0);
  const [visible, setVisible] = useState<boolean>(false);

  const hanleFetchBalance = async () => {
    try {
      const response: any = fetchBalance();
      if (response?.code >= 0) {
        setBalance(response?.data)
      }
    } catch (error) {
      console.error(error);
    }
  }

  const handleChangeModalRecharge = (refresh = false) => {
    if (refresh) {
      hanleFetchBalance();
    }
    setVisible(!visible);
  }

  useEffect(() => {
    hanleFetchBalance();
  }, [])

  return (
    <div className={styles.balance}>
      <span className={styles.title}>余额:</span>
      <span className={styles.description}>{formateMoney(balance)}</span>
      <Button type="primary" onClick={() => handleChangeModalRecharge()}>充值</Button>
      {visible && (
        <ModalRecharge visible={visible} onCancel={handleChangeModalRecharge} />
      )}
    </div>
  );
}

export default Balance;
