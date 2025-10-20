import React from "react";
import styles from './index.less';

type ListContainerProps = {
  title: string,
  list: any[],
};

const ListContainer: React.FC<ListContainerProps> = ({ title, list }) => {
  return (
    <div className={styles.listContainer}>
      <h3>{title}</h3>
      <table>
        {list?.map((item: any) => (
          <tbody key={item?.key}>
            <tr>
              <td className={styles.itemLable}>{item?.label}</td>
              <td className={styles.itemValue}>
                {
                  Array.isArray(item?.value) ? item?.value?.map((key: string) => {
                    return <div key={key}>{key}</div>
                  }) : item?.value
                }
              </td>
            </tr>
          </tbody>
        ))}
      </table>
    </div>
  );
};

export default ListContainer;
