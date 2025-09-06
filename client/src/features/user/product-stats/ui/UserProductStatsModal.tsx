import { FC, useState, useEffect } from 'react';
import { Modal, Table, Spin, message } from 'antd';
import { BarChartOutlined } from '@ant-design/icons';
import axios from 'axios';
import styles from './UserProductStatsModal.module.scss';

interface ProductStat {
  productId: number;
  productName: string;
  unit: string;
  totalQuantity: number;
  totalAmount: number;
  totalCostAmount: number;
  profit: number;
  orderCount: number;
  lastOrderDate: string;
}

interface UserProductStatsModalProps {
  userId: number;
  userName: string;
  visible: boolean;
  onClose: () => void;
}

export const UserProductStatsModal: FC<UserProductStatsModalProps> = ({
  userId,
  userName,
  visible,
  onClose
}) => {
  const [stats, setStats] = useState<ProductStat[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    console.log('Modal useEffect triggered:', { visible, userId });
    if (visible && userId) {
      console.log('Calling fetchProductStats...');
      fetchProductStats();
    }
  }, [visible, userId]);

  // Сброс данных при закрытии модального окна
  useEffect(() => {
    if (!visible) {
      setStats([]);
    }
  }, [visible]);

  const fetchProductStats = async () => {
    try {
      setLoading(true);
      console.log('Fetching stats for userId:', userId);
      const response = await axios.get(`http://localhost:3020/api/users/${userId}/product-stats`);
      console.log('API response:', response);
      console.log('Response data:', response.data);
      console.log('Is array?', Array.isArray(response.data));
      setStats(response.data || []);
    } catch (error) {
      console.error('Error fetching product stats:', error);
      message.error('Не удалось загрузить статистику товаров');
      setStats([]);
    } finally {
      setLoading(false);
    }
  };

  const formatDate = (dateString: string) => {
    if (!dateString) return '—';
    return new Date(dateString).toLocaleDateString('ru-RU');
  };

  const formatNumber = (num: number) => {
    return num.toLocaleString('ru-RU', { 
      minimumFractionDigits: 0,
      maximumFractionDigits: 2 
    });
  };

  const columns = [
    {
      title: 'Товар',
      dataIndex: 'productName',
      key: 'productName',
      width: '25%',
      render: (text: string) => <strong>{text}</strong>
    },
    {
      title: 'Количество',
      dataIndex: 'totalQuantity',
      key: 'totalQuantity',
      width: '15%',
      render: (quantity: number, record: ProductStat) => 
        `${formatNumber(quantity)} ${record.unit}`,
      sorter: (a: ProductStat, b: ProductStat) => a.totalQuantity - b.totalQuantity,
      defaultSortOrder: 'descend' as const
    },
    {
      title: 'Сумма',
      dataIndex: 'totalAmount',
      key: 'totalAmount',
      width: '15%',
      render: (amount: number) => `${formatNumber(amount)} ₾`,
      sorter: (a: ProductStat, b: ProductStat) => a.totalAmount - b.totalAmount
    },
    {
      title: 'Заказов',
      dataIndex: 'orderCount',
      key: 'orderCount',
      width: '10%',
      sorter: (a: ProductStat, b: ProductStat) => a.orderCount - b.orderCount
    },
    {
      title: 'Себестоимость',
      dataIndex: 'totalCostAmount',
      key: 'totalCostAmount',
      width: '15%',
      render: (amount: number) => `${formatNumber(amount)} ₾`,
      sorter: (a: ProductStat, b: ProductStat) => a.totalCostAmount - b.totalCostAmount
    },
    {
      title: 'Прибыль',
      dataIndex: 'profit',
      key: 'profit',
      width: '15%',
      render: (profit: number) => (
        <span style={{ color: profit >= 0 ? '#52c41a' : '#ff4d4f' }}>
          {formatNumber(profit)} ₾
        </span>
      ),
      sorter: (a: ProductStat, b: ProductStat) => a.profit - b.profit
    },
    {
      title: 'Последний заказ',
      dataIndex: 'lastOrderDate',
      key: 'lastOrderDate',
      width: '20%',
      render: (date: string) => formatDate(date),
      sorter: (a: ProductStat, b: ProductStat) => 
        new Date(a.lastOrderDate).getTime() - new Date(b.lastOrderDate).getTime()
    }
  ];

  const totalAmount = Array.isArray(stats) ? stats.reduce((sum, stat) => sum + stat.totalAmount, 0) : 0;
  const totalCostAmount = Array.isArray(stats) ? stats.reduce((sum, stat) => sum + stat.totalCostAmount, 0) : 0;
  const totalProfit = Array.isArray(stats) ? stats.reduce((sum, stat) => sum + stat.profit, 0) : 0;
  const totalOrders = Array.isArray(stats) ? stats.reduce((sum, stat) => sum + stat.orderCount, 0) : 0;
  
  // Рассчитываем средний чек (общая сумма / количество заказов)
  const averageCheck = totalOrders > 0 ? Math.round(totalAmount / totalOrders) : 0;
  
  // Находим любимый напиток (товар с наибольшим общим количеством)
  const favoriteProduct = Array.isArray(stats) && stats.length > 0 
    ? stats.reduce((prev, current) => {
        console.log(`Сравниваем: ${prev.productName} (${prev.totalQuantity} шт) vs ${current.productName} (${current.totalQuantity} шт)`);
        return (prev.totalQuantity > current.totalQuantity) ? prev : current;
      })
    : null;
  
  console.log('Любимый товар:', favoriteProduct);

  return (
    <Modal
      title={
        <div className={styles.modalTitle}>
          <BarChartOutlined />
          <span>Статистика заказов: {userName}</span>
        </div>
      }
      open={visible}
      onCancel={onClose}
      footer={null}
      width={900}
      className={styles.statsModal}
    >
      {loading ? (
        <div className={styles.loading}>
          <Spin size="large" />
          <p>Загрузка статистики...</p>
        </div>
      ) : (
        <>
          {stats.length > 0 ? (
            <>
              <div className={styles.summaryCards}>
                <div className={styles.summaryCard}>
                  <div className={styles.summaryValue}>{averageCheck} ₾</div>
                  <div className={styles.summaryLabel}>Средний чек</div>
                </div>
                <div className={styles.summaryCard}>
                  <div className={styles.summaryValue}>
                    {favoriteProduct ? favoriteProduct.productName : '—'}
                  </div>
                  <div className={styles.summaryLabel}>Любимый напиток</div>
                </div>
                <div className={styles.summaryCard}>
                  <div className={styles.summaryValue}>{formatNumber(totalAmount)} ₾</div>
                  <div className={styles.summaryLabel}>Общая сумма</div>
                </div>
                <div className={styles.summaryCard}>
                  <div className={styles.summaryValue}>{formatNumber(totalCostAmount)} ₾</div>
                  <div className={styles.summaryLabel}>Себестоимость</div>
                </div>
                <div className={styles.summaryCard}>
                  <div className={styles.summaryValue} style={{ color: totalProfit >= 0 ? '#52c41a' : '#ff4d4f' }}>
                    {formatNumber(totalProfit)} ₾
                  </div>
                  <div className={styles.summaryLabel}>Прибыль</div>
                </div>
                <div className={styles.summaryCard}>
                  <div className={styles.summaryValue}>{totalOrders}</div>
                  <div className={styles.summaryLabel}>Всего заказов</div>
                </div>
              </div>

              <Table
                columns={columns}
                dataSource={Array.isArray(stats) ? stats : []}
                rowKey="productId"
                pagination={{
                  pageSize: 10,
                  showSizeChanger: true,
                  showQuickJumper: true,
                  showTotal: (total, range) => 
                    `${range[0]}-${range[1]} из ${total} товаров`
                }}
                size="small"
                className={styles.statsTable}
              />
            </>
          ) : (
            <div className={styles.noData}>
              <BarChartOutlined className={styles.noDataIcon} />
              <h3>Нет данных</h3>
              <p>У этого пользователя пока нет завершенных заказов</p>
            </div>
          )}
        </>
      )}
    </Modal>
  );
};
