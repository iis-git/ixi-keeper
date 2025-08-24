import React, { useState, useEffect } from 'react';
import { Modal, Form, Input, Button, List, InputNumber, Space, Typography, Divider, message } from 'antd';
import { DeleteOutlined, EditOutlined } from '@ant-design/icons';
import { orderApi } from '../../../../shared/api/order';
import styles from './EditOrderModal.module.scss';

const { Title, Text } = Typography;
const { TextArea } = Input;

interface OrderItem {
  productId: number;
  productName: string;
  quantity: number;
  price: number;
}

interface Order {
  id: number;
  guestName: string;
  orderItems: OrderItem[];
  totalAmount: number;
  status: string;
  comment?: string;
  paymentMethod?: string;
}

interface EditOrderModalProps {
  visible: boolean;
  order: Order | null;
  onClose: () => void;
  onOrderUpdated: () => void;
}

export const EditOrderModal: React.FC<EditOrderModalProps> = ({
  visible,
  order,
  onClose,
  onOrderUpdated
}) => {
  const [form] = Form.useForm();
  const [loading, setLoading] = useState(false);
  const [orderItems, setOrderItems] = useState<OrderItem[]>([]);
  const [editingItem, setEditingItem] = useState<number | null>(null);
  const [editQuantity, setEditQuantity] = useState<number>(1);

  useEffect(() => {
    if (order && visible) {
      form.setFieldsValue({
        guestName: order.guestName,
        comment: order.comment || '',
        paymentMethod: order.paymentMethod || ''
      });
      setOrderItems([...order.orderItems]);
    }
  }, [order, visible, form]);

  const handleRemoveItem = async (itemIndex: number) => {
    if (!order) return;

    try {
      setLoading(true);
      await orderApi.removeItem(order.id, itemIndex);
      
      // Обновляем локальный список
      const newItems = [...orderItems];
      newItems.splice(itemIndex, 1);
      setOrderItems(newItems);
      
      message.success('Позиция удалена');
      onOrderUpdated();
    } catch (error) {
      message.error('Ошибка при удалении позиции');
      console.error('Error removing item:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleUpdateQuantity = (itemIndex: number, newQuantity: number) => {
    if (newQuantity <= 0) return;
    
    // Обновляем только локальное состояние, без сохранения в БД
    const newItems = [...orderItems];
    newItems[itemIndex].quantity = newQuantity;
    setOrderItems(newItems);
    setEditingItem(null);
  };

  const handleUpdateOrder = async (values: any) => {
    if (!order) return;

    try {
      setLoading(true);
      await orderApi.update(order.id, {
        guestName: values.guestName,
        comment: values.comment,
        status: order.status as 'active' | 'completed' | 'cancelled',
        orderItems: orderItems // Сохраняем измененные позиции заказа
      });
      
      message.success('Заказ обновлен');
      onOrderUpdated();
      onClose();
    } catch (error) {
      message.error('Ошибка при обновлении заказа');
      console.error('Error updating order:', error);
    } finally {
      setLoading(false);
    }
  };

  const handlePayOrder = async (paymentMethod: string) => {
    if (!order) return;

    try {
      setLoading(true);
      await orderApi.update(order.id, {
        status: 'completed',
        paymentMethod: paymentMethod as 'cash' | 'card' | 'transfer',
        guestName: form.getFieldValue('guestName'),
        comment: form.getFieldValue('comment')
      });
      
      message.success('Заказ оплачен');
      onOrderUpdated();
      onClose();
    } catch (error) {
      message.error('Ошибка при оплате заказа');
      console.error('Error paying order:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleCloseOrder = async () => {
    if (!order) return;

    try {
      setLoading(true);
      await orderApi.update(order.id, {
        status: 'cancelled',
        guestName: form.getFieldValue('guestName'),
        comment: form.getFieldValue('comment')
      });
      
      message.success('Заказ закрыт');
      onOrderUpdated();
      onClose();
    } catch (error) {
      message.error('Ошибка при закрытии заказа');
      console.error('Error closing order:', error);
    } finally {
      setLoading(false);
    }
  };

  const calculateTotal = () => {
    return orderItems.reduce((sum, item) => sum + (item.price * item.quantity), 0);
  };

  if (!order) return null;

  return (
    <Modal
      title={`Редактирование заказа #${order.id}`}
      open={visible}
      onCancel={onClose}
      width={700}
      footer={null}
      className={styles.editOrderModal}
    >
      <Form
        form={form}
        layout="vertical"
        onFinish={handleUpdateOrder}
        className={styles.form}
      >
        <Form.Item
          label="Имя гостя"
          name="guestName"
          rules={[{ required: true, message: 'Введите имя гостя' }]}
        >
          <Input placeholder="Введите имя гостя" />
        </Form.Item>

        <Form.Item label="Комментарий" name="comment">
          <TextArea 
            placeholder="Комментарий к заказу" 
            rows={3}
            maxLength={500}
          />
        </Form.Item>

        <Divider orientation="left">Позиции заказа</Divider>

        <List
          className={styles.orderItems}
          dataSource={orderItems}
          renderItem={(item, index) => (
            <List.Item
              actions={[
                <Button
                  type="text"
                  icon={<EditOutlined />}
                  onClick={() => {
                    setEditingItem(index);
                    setEditQuantity(item.quantity);
                  }}
                  disabled={loading}
                />,
                <Button
                  type="text"
                  danger
                  icon={<DeleteOutlined />}
                  onClick={() => handleRemoveItem(index)}
                  disabled={loading}
                />
              ]}
            >
              <List.Item.Meta
                title={item.productName}
                description={
                  <Space direction="vertical" size="small">
                    <Text>Цена: {item.price} ₽</Text>
                    {editingItem === index ? (
                      <Space>
                        <InputNumber
                          min={1}
                          value={editQuantity}
                          onChange={(value) => setEditQuantity(value || 1)}
                          size="small"
                        />
                        <Button
                          size="small"
                          type="primary"
                          onClick={() => handleUpdateQuantity(index, editQuantity)}
                        >
                          Сохранить
                        </Button>
                        <Button
                          size="small"
                          onClick={() => setEditingItem(null)}
                        >
                          Отмена
                        </Button>
                      </Space>
                    ) : (
                      <Text>Количество: {item.quantity}</Text>
                    )}
                  </Space>
                }
              />
              <div className={styles.itemTotal}>
                {item.price * item.quantity} ₽
              </div>
            </List.Item>
          )}
        />

        <Divider />

        <div className={styles.totalSection}>
          <Title level={4}>Итого: {calculateTotal()} ₽</Title>
        </div>

        <div className={styles.actions}>
          <Space size="middle">
            <Button
              type="primary"
              htmlType="submit"
              loading={loading}
            >
              Сохранить
            </Button>
            
            <Button
              type="primary"
              style={{ backgroundColor: '#52c41a', borderColor: '#52c41a' }}
              onClick={() => handlePayOrder('cash')}
              loading={loading}
            >
              Оплатить наличными
            </Button>
            
            <Button
              type="primary"
              style={{ backgroundColor: '#1890ff', borderColor: '#1890ff' }}
              onClick={() => handlePayOrder('card')}
              loading={loading}
            >
              Оплатить картой
            </Button>
            
            <Button
              danger
              onClick={handleCloseOrder}
              loading={loading}
            >
              Закрыть заказ
            </Button>
            
            {/* <Button onClick={onClose}>
              Отмена
            </Button> */}
          </Space>
        </div>
      </Form>
    </Modal>
  );
};
