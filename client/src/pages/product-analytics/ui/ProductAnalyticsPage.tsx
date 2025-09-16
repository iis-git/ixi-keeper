import React, { useState, useEffect } from 'react';
import { Table, Card, Statistic, Row, Col, Spin, message, Tag, Button, Input, Select, Alert, DatePicker, ConfigProvider } from 'antd';
import ruRU from 'antd/locale/ru_RU';
import dayjs from 'dayjs';
import 'dayjs/locale/ru';
import { analyticsApi, ProductAnalytic } from '../../../shared/api/analytics';
import { categoryApi, Category } from '../../../shared/api/categoryApi';
import styles from './ProductAnalyticsPage.module.scss';

const { Search } = Input;
const { Option } = Select;

export const ProductAnalyticsPage: React.FC = () => {
  dayjs.locale('ru');
  const [stats, setStats] = useState<ProductAnalytic[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [sortInfo, setSortInfo] = useState<{ columnKey: string; order: 'ascend' | 'descend' } | null>({ columnKey: 'totalAmount', order: 'descend' });
  const [pagination, setPagination] = useState({ current: 1, pageSize: 15, total: 0 });
  const [period, setPeriod] = useState('all');
  const [categories, setCategories] = useState<Category[]>([]);
  const [selectedCategory, setSelectedCategory] = useState<number | undefined>(undefined);
  const [customRange, setCustomRange] = useState<{ startDate?: string; endDate?: string }>({});
  const [dateRange, setDateRange] = useState<any>(null);
  const [guestType, setGuestType] = useState<string | undefined>(undefined);

  const resetFilters = () => {
    setSearchTerm('');
    setSelectedCategory(undefined);
    setSortInfo({ columnKey: 'totalAmount', order: 'descend' });
    setPeriod('all');
    setCustomRange({});
    setDateRange(null);
    setGuestType(undefined);
    setPagination(prev => ({ ...prev, current: 1, pageSize: 15 }));
  };

  useEffect(() => {
    const fetchCategories = async () => {
      try {
        const fetchedCategories = await categoryApi.getAllCategories();
        setCategories(fetchedCategories);
      } catch (error) {
        message.error('Не удалось загрузить список категорий');
      }
    };

    fetchCategories();
  }, []);

  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        const params: Parameters<typeof analyticsApi.getProductAnalytics>[0] = {
          page: pagination.current,
          pageSize: pagination.pageSize,
          // Если выбран произвольный диапазон, игнорируем предустановленный период
          period: (customRange.startDate || customRange.endDate) ? undefined : (period === 'all' ? undefined : period),
          search: searchTerm || undefined,
          sortBy: sortInfo ? sortInfo.columnKey : undefined,
          sortOrder: sortInfo ? (sortInfo.order === 'ascend' ? 'ASC' : 'DESC') : undefined,
          categoryId: selectedCategory,
          startDate: customRange.startDate,
          endDate: customRange.endDate,
          guestType: guestType,
        };
        console.log('Fetching analytics with params:', params);
        const response = await analyticsApi.getProductAnalytics(params);
        console.log('Received analytics data:', response);
        setStats(response.stats);
        setPagination(prev => ({ ...prev, total: response.total }));
      } catch (err) {
        setError('Не удалось загрузить аналитику');
        message.error('Не удалось загрузить аналитику');
        console.error(err);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [pagination.current, pagination.pageSize, period, searchTerm, sortInfo, selectedCategory, customRange.startDate, customRange.endDate, guestType]);

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('ru-RU', {
      style: 'currency',
      currency: 'RUB',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(value);
  };

  const formatNumber = (value: number, decimals: number = 1) => {
    return new Intl.NumberFormat('ru-RU', {
      minimumFractionDigits: 0,
      maximumFractionDigits: decimals,
    }).format(value);
  };

  const getSummaryStats = () => {
    const totalRevenue = stats.reduce((acc, item) => acc + item.totalAmount, 0);
    const totalCost = stats.reduce((acc, item) => acc + item.totalCostAmount, 0);
    const totalProfit = totalRevenue - totalCost;
    const totalOrders = stats.reduce((acc, item) => acc + item.orderCount, 0);
    const averageMargin = totalRevenue > 0 ? (totalProfit / totalRevenue) * 100 : 0;
    const totalWriteOffCost = stats.reduce((acc, item) => acc + (item.writeOffCostAmount || 0), 0);

    return { totalRevenue, totalProfit, totalOrders, averageMargin, totalWriteOffCost };
  };

  const { totalRevenue, totalProfit, totalOrders, averageMargin, totalWriteOffCost } = getSummaryStats();

  const columns = [
    {
      title: 'Товар',
      dataIndex: 'productName',
      key: 'productName',
      render: (text: string, record: ProductAnalytic) => (
        <div>
          <div className={styles.productName}>{text}</div>
          {record.category && (
            <Tag color={record.category.color} className={styles.categoryTag}>
              {record.category.name}
            </Tag>
          )}
        </div>
      ),
    },
    {
      title: 'Количество',
      dataIndex: 'totalQuantity',
      key: 'totalQuantity',
      render: (value: number, record: ProductAnalytic) => `${formatNumber(value)} ${record.unit}`,
      sorter: true,
    },
    {
      title: 'Выручка',
      dataIndex: 'totalAmount',
      key: 'totalAmount',
      render: (value: number) => formatCurrency(value),
      sorter: true,
    },
    {
      title: 'Себестоимость',
      dataIndex: 'totalCostAmount',
      key: 'totalCostAmount',
      render: (value: number) => formatCurrency(value),
      sorter: true,
    },
    {
      title: 'Прибыль',
      dataIndex: 'profit',
      key: 'profit',
      render: (value: number) => (
        <span className={value >= 0 ? styles.profitPositive : styles.profitNegative}>
          {formatCurrency(value)}
        </span>
      ),
      sorter: true,
    },
    {
      title: 'Маржа',
      dataIndex: 'profitMargin',
      key: 'profitMargin',
      render: (value: number) => (
        <span className={value >= 0 ? styles.profitPositive : styles.profitNegative}>
          {formatNumber(value)}%
        </span>
      ),
      sorter: true,
    },
    {
      title: 'Списания',
      dataIndex: 'writeOffQuantity',
      key: 'writeOffQuantity',
      render: (value: number, record: ProductAnalytic) => value ? `${formatNumber(value)} ${record.unit}` : '—',
    },
    {
      title: 'Прибыль (нетто)',
      dataIndex: 'netProfit',
      key: 'netProfit',
      render: (value: number | undefined) => value !== undefined ? (
        <span className={value >= 0 ? styles.profitPositive : styles.profitNegative}>
          {formatCurrency(value)}
        </span>
      ) : '—',
      // сортировка по нетто-метрикам на бэкенде не поддерживается (расчет после выборки)
    },
    {
      title: 'Маржа (нетто)',
      dataIndex: 'netMargin',
      key: 'netMargin',
      render: (value: number | undefined) => value !== undefined ? (
        <span className={value >= 0 ? styles.profitPositive : styles.profitNegative}>
          {formatNumber(value)}%
        </span>
      ) : '—',
      // сортировка по нетто-метрикам на бэкенде не поддерживается (расчет после выборки)
    },
    {
      title: 'Заказов',
      dataIndex: 'orderCount',
      key: 'orderCount',
      sorter: true,
    },
    {
      title: 'Среднее за заказ',
      dataIndex: 'averageOrderQuantity',
      key: 'averageOrderQuantity',
      render: (value: number, record: ProductAnalytic) => `${formatNumber(value)} ${record.unit}`,
      sorter: true,
    },
    {
      title: 'Последний заказ',
      dataIndex: 'lastOrderDate',
      key: 'lastOrderDate',
      render: (date: string | null) => (date ? new Date(date).toLocaleDateString('ru-RU') : '—'),
      sorter: true,
    },
  ];

  const handleTableChange = (newPagination: any, _: any, newSorter: any) => {
    const sorter = Array.isArray(newSorter) ? newSorter[0] : newSorter;
    setPagination(prev => ({ ...prev, current: newPagination.current, pageSize: newPagination.pageSize }));
    if (sorter && sorter.field && sorter.order) {
      setSortInfo({ columnKey: sorter.field, order: sorter.order });
    } else {
      setSortInfo({ columnKey: 'totalAmount', order: 'descend' });
    }
  };

  if (error) {
    return <div className={styles.container}><Alert message="Ошибка" description={error} type="error" showIcon /></div>;
  }

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <h1>Аналитика товаров</h1>
        <div>
          <Button onClick={() => { setPagination(p => ({...p, current: 1})); }} loading={loading}>
            Обновить
          </Button>
          <Button onClick={resetFilters} style={{ marginLeft: 8 }} danger>
            Сбросить фильтры
          </Button>
        </div>
      </div>

      {/* Сводная статистика */}
      <Row gutter={[16, 16]} className={styles.statsRow}>
        <Col span={4}>
          <Card>
            <Statistic
              title="Общая выручка"
              value={totalRevenue}
              formatter={(value) => formatCurrency(Number(value))}
            />
          </Card>
        </Col>
        <Col span={4}>
          <Card>
            <Statistic
              title="Общая прибыль"
              value={totalProfit}
              formatter={(value) => formatCurrency(Number(value))}
              valueStyle={{ color: totalProfit >= 0 ? '#3f8600' : '#cf1322' }}
            />
          </Card>
        </Col>
        <Col span={4}>
          <Card>
            <Statistic
              title="Всего заказов"
              value={totalOrders}
            />
          </Card>
        </Col>
        <Col span={4}>
          <Card>
            <Statistic
              title="Средняя маржа"
              value={averageMargin}
              formatter={(value) => `${formatNumber(Number(value))}%`}
              valueStyle={{ color: averageMargin >= 0 ? '#3f8600' : '#cf1322' }}
            />
          </Card>
        </Col>
        <Col span={4}>
          <Card>
            <Statistic
              title="Списания (себестоимость)"
              value={totalWriteOffCost}
              formatter={(value) => formatCurrency(Number(value))}
              valueStyle={{ color: '#cf1322' }}
            />
          </Card>
        </Col>
      </Row>

      {/* Фильтры и поиск */}
      <ConfigProvider locale={ruRU}>
      <Card className={styles.filtersCard}>
        <Row gutter={[16, 16]} align="middle">
          <Col xs={24} md={8}>
            <Search
              placeholder="Поиск по названию товара"
              onSearch={(value) => { setSearchTerm(value); setPagination(p => ({...p, current: 1})); }}
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              style={{ width: `100%` }}
              size="large"
              enterButton
            />
          </Col>
          <Col xs={24} md={4}>
            <Select
              allowClear
              placeholder="Все категории"
              value={selectedCategory}
              onChange={(value) => { setSelectedCategory(value); setPagination(p => ({...p, current: 1})); }}
              style={{ width: `100%` }}
              size="large"
            >
              {categories.map(cat => (
                <Option key={cat.id} value={cat.id}>{cat.name}</Option>
              ))}
            </Select>
          </Col>

          <Col xs={24} md={4}>
            <Select
              allowClear
              placeholder="Тип гостя"
              value={guestType}
              onChange={(value) => { setGuestType(value); setPagination(p => ({...p, current: 1})); }}
              style={{ width: `100%` }}
              size="large"
            >
              <Option value="owner">Владелец</Option>
              <Option value="regular">Постоянный</Option>
              <Option value="guest">Гость</Option>
              <Option value="bartender">Бармен</Option>
            </Select>
          </Col>


          <Col xs={24} md={4}>
            <Select
              value={sortInfo?.columnKey}
              onChange={(value) => setSortInfo(si => ({ ...si, columnKey: value, order: si?.order || 'descend' }))}
              style={{ width: `100%` }}
              size="large"
            >
              <Option value="totalQuantity">Количество</Option>
              <Option value="totalAmount">Выручка</Option>
              <Option value="profit">Прибыль</Option>
              <Option value="profitMargin">Маржа</Option>
              <Option value="orderCount">Заказы</Option>
            </Select>
          </Col>
          <Col xs={24} md={4}>
            <Select
              value={sortInfo?.order}
              onChange={(value) => setSortInfo(si => ({ ...si, order: value, columnKey: si?.columnKey || 'totalAmount' }))}
              style={{ width: 220 }}
              size="large"
            >
              <Option value="descend">По убыванию</Option>
              <Option value="ascend">По возрастанию</Option>
            </Select>
          </Col>
          <Col xs={24} md={8}>
            <DatePicker.RangePicker
                allowClear
                style={{ width: `100%` }}
                placeholder={["Начальная дата", "Конечная дата"]}
                size="large"
                onChange={(dates: any) => {
                  const start = dates?.[0] ? dates[0].format('YYYY-MM-DD') : undefined;
                  const end = dates?.[1] ? dates[1].format('YYYY-MM-DD') : undefined;
                  setCustomRange({ startDate: start, endDate: end });
                  setPagination(p => ({ ...p, current: 1 }));
                  setDateRange(dates);
                }}
                value={dateRange}
            />
          </Col>
        </Row>
      </Card>
      </ConfigProvider>

      {/* Таблица */}
      <Card className={styles.tableCard}>
        <Spin spinning={loading}>
          <Table
            columns={columns}
            dataSource={stats}
            rowKey="productId"
            pagination={pagination}
            loading={loading}
            onChange={handleTableChange}
            scroll={{ x: 1200 }}
          />
        </Spin>
      </Card>
    </div>
  );
};
