import React from 'react';
import Footer from '@/components/Footer';
import styles from './index.less';

type UserLayoutProps = {
  children: React.ReactNode;
  title?: string;
};

const UserLayout: React.FC<UserLayoutProps> = ({ children, title }) => {
  return (
    <div className={styles.layout}>
      <div className={styles.layoutContent}>
        <div className={styles.navContent}>
          <div className={styles.mainContent}>
            <div className={styles.mainCard}>
              <div className={styles.mianLeft} />
              <div className={styles.mianRight}>
                {title && (
                  <div className={styles.title}>{title}</div>
                )}
                {children}
              </div>
            </div>
          </div>
        </div>
      </div>
      <Footer className={styles.footer} />
    </div>
  );
};

export default UserLayout;
