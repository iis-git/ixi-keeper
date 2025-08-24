import React, { useState, useEffect } from 'react';
import { Modal, Input, Button } from 'antd';
import { userApi } from '../../../../shared/api/user';
import type { Product } from '../../../../entities/product/model/types';
import type { User } from '../../../../shared/types/model';
import styles from './CreateOrderModal.module.scss';

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

  const handleLocationSelect = (location: string) => {
    setGuestName(location);
    setSelectedGuest(null);
    setSearchQuery('');
  };

  const handleSubmit = () => {
    if (!product) return;

    // Определяем нужно ли назначить заказ пользователю с id=4
    const needsDefaultUser = () => {
      const name = guestName.trim().toLowerCase();
      if (!name) return true; // Пустое имя
      
      // Проверяем ключевые слова
      const keywords = ['стол', 'бар', 'улица', 'гость'];
      return keywords.some(keyword => name.includes(keyword));
    };

    onCreateOrder({
      product,
      quantity: 1,
      guestId: selectedGuest?.id || (needsDefaultUser() ? 4 : undefined),
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
          <div className={styles.productCard}>
            <div className={styles.productDetails}>
              <span className={styles.productName}>{product.name}</span>
              <span className={styles.productPrice}>{product.price} ₽</span>
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
          {/* Кнопки быстрого выбора */}
          <div className={styles.field}>
            <label>Быстрый выбор</label>
            <div className={styles.locationButtons}>
              <Button 
                type="default" 
                onClick={() => handleLocationSelect('Стол')}
                className={`${styles.locationButton} ${styles.tableButton}`}
              >
                Стол
              </Button>
              <Button 
                type="default" 
                onClick={() => handleLocationSelect('Бар')}
                className={`${styles.locationButton} ${styles.barButton}`}
              >
                Бар
              </Button>
              <Button 
                type="default" 
                onClick={() => handleLocationSelect('Улица')}
                className={`${styles.locationButton} ${styles.streetButton}`}
              >
                Улица
              </Button>
            </div>
          </div>
          
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
                    size="large"
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


        </div>

     
        
      </div>
    </Modal>
  );
};

export default CreateOrderModal;
