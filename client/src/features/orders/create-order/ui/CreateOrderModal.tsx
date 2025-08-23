import React, { useState, useEffect } from 'react';
import { Modal, Input, Button } from 'antd';
import { userApi } from '../../../../shared/api/user';
import type { Product } from '../../../../entities/product/model/types';
import type { User } from '../../../../shared/types/model';
import styles from './CreateOrderModal.module.scss';

const { TextArea } = Input;

interface CreateOrderModalProps {
  product: Product | null;
  open: boolean;
  onCancel: () => void;
  onCreateOrder: (orderData: OrderData) => void;
}

interface OrderData {
  product: Product;
  quantity: number;
  guestId?: number;
  guestName: string;
  comment?: string;
}

export const CreateOrderModal: React.FC<CreateOrderModalProps> = ({
  product,
  open,
  onCancel,
  onCreateOrder
}) => {
  const [selectedGuest, setSelectedGuest] = useState<User | null>(null);
  const [guestName, setGuestName] = useState('');
  const [comment, setComment] = useState('');
  const [users, setUsers] = useState<User[]>([]);
  const [filteredUsers, setFilteredUsers] = useState<User[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(false);

  // Загрузка пользователей при открытии модалки
  useEffect(() => {
    if (open) {
      fetchUsers();
    }
  }, [open]);

  // Фильтрация пользователей по поисковому запросу
  useEffect(() => {
    if (searchQuery.trim()) {
      const filtered = users.filter(user => 
        user.name.toLowerCase().includes(searchQuery.toLowerCase())
      );
      setFilteredUsers(filtered);
    } else {
      setFilteredUsers(users);
    }
  }, [users, searchQuery]);

  const fetchUsers = async () => {
    try {
      setLoading(true);
      const response = await userApi.getAll();
      setUsers(response.data);
      setFilteredUsers(response.data);
    } catch (error) {
      console.error('Ошибка загрузки пользователей:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleGuestSelect = (user: User) => {
    setSelectedGuest(user);
    setGuestName(user.name);
    setSearchQuery('');
  };

  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setSearchQuery(value);
    setGuestName(value);
    setSelectedGuest(null);
  };

  const handleSubmit = () => {
    if (!product) return;

    onCreateOrder({
      product,
      quantity: 1,
      guestId: selectedGuest?.id,
      guestName: guestName.trim() || '',
      comment: comment.trim() || undefined
    });

    // Сброс формы
    setGuestName('');
    setComment('');
    setSelectedGuest(null);
    setSearchQuery('');
  };

  const handleCancel = () => {
    // Сброс формы при отмене
    setGuestName('');
    setComment('');
    setSelectedGuest(null);
    setSearchQuery('');
    onCancel();
  };

  if (!product) return null;

  const totalPrice = parseFloat(product.price.toString());
  const availableQuantity = product.isComposite 
    ? product.availablePortions || 0 
    : parseFloat(product.stock?.toString() || '0');

  return (
    <Modal
      title="Создать заказ"
      open={open}
      onCancel={handleCancel}
      onOk={handleSubmit}
      okText="Создать заказ"
      cancelText="Отмена"
      width={600}
      okButtonProps={{
        disabled: availableQuantity <= 0
      }}
    >
      <div className={styles.orderForm}>
        {/* Информация о товаре */}
        <div className={styles.productInfo}>
          <h3>Товар</h3>
          <div className={styles.productCard}>
            <div className={styles.productDetails}>
              <span className={styles.productName}>{product.name}</span>
              <span className={styles.productPrice}>{product.price} ₽</span>
              {product.category && (
                <span 
                  className={styles.categoryBadge}
                  style={{ backgroundColor: product.category.color }}
                >
                  {product.category.name}
                </span>
              )}
              {product.isComposite && (
                <span className={styles.compositeLabel}>
                  Коктейль
                </span>
              )}
            </div>
            <div className={styles.availability}>
              {product.isComposite ? (
                <span>Доступно порций: {availableQuantity}</span>
              ) : (
                <span>В наличии: {availableQuantity} {product.unit || 'шт'}</span>
              )}
            </div>
          </div>
        </div>

        {/* Форма заказа */}
        <div className={styles.formFields}>
          <div className={styles.field}>
            <label htmlFor="guestSearch">Выбор гостя</label>
            <div className={styles.guestSelector}>
              <Input
                id="guestSearch"
                value={searchQuery || guestName}
                onChange={handleSearchChange}
                placeholder="Поиск по имени гостя..."
              />
              
              {searchQuery && filteredUsers.length > 0 && (
                <div className={styles.guestDropdown}>
                  {loading ? (
                    <div className={styles.loading}>Загрузка...</div>
                  ) : (
                    filteredUsers.map(user => (
                      <div
                        key={user.id}
                        className={styles.guestOption}
                        onClick={() => handleGuestSelect(user)}
                      >
                        <span className={styles.guestName}>{user.name}</span>
                      </div>
                    ))
                  )}
                </div>
              )}
              
              {selectedGuest && (
                <div className={styles.selectedGuest}>
                  <span>Выбран: {selectedGuest.name}</span>
                  <Button
                    type="text"
                    size="small"
                    onClick={() => {
                      setSelectedGuest(null);
                      setGuestName('');
                      setSearchQuery('');
                    }}
                    className={styles.clearButton}
                  >
                    ✕
                  </Button>
                </div>
              )}
            </div>
          </div>


          <div className={styles.field}>
            <label htmlFor="comment">Комментарий</label>
            <TextArea
              id="comment"
              value={comment}
              onChange={(e) => setComment(e.target.value)}
              placeholder="Дополнительные пожелания..."
              rows={3}
            />
          </div>
        </div>

        {/* Итого */}
        <div className={styles.total}>
          <div className={styles.totalRow}>
            <span>Цена за единицу:</span>
            <span className={styles.totalPrice}>{totalPrice.toFixed(2)} ₽</span>
          </div>
        </div>
      </div>
    </Modal>
  );
};

export default CreateOrderModal;
