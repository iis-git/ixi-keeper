import { FC, useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Row, Col, Input, InputNumber, Select, Checkbox, Button } from 'antd';
import { User } from '../../../../entities/user/model/types';
import { userApi } from '../../../../shared/api/user';
import { handleApiError } from '../../../../shared/api/base';
import styles from './UserForm.module.scss';

interface UserFormProps {
  userId?: number;
  initialData?: User;
}

export const UserForm: FC<UserFormProps> = ({ userId, initialData }) => {
  const navigate = useNavigate();
  const isEditMode = userId !== undefined;
  
  const [formData, setFormData] = useState<Partial<User>>(initialData || {
    name: '',
    phone: '',
    comment: '',
    isDebtor: false,
    totalOrdersAmount: 0,
    visitCount: 0,
    averageCheck: 0,
    guestType: 'guest',
    discountPercent: 0,
  });
  
  const [loading, setLoading] = useState<boolean>(isEditMode && !initialData);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (isEditMode && userId !== undefined && !initialData) {
      fetchUser();
    }
  }, [userId, initialData]);

  const fetchUser = async (): Promise<void> => {
    try {
      const response = await userApi.getById(userId!);
      setFormData(prev => ({
        ...prev,
        ...response.data,
        guestType: (response.data as any).guestType ?? 'guest',
        discountPercent: Number((response.data as any).discountPercent ?? 0)
      }));
      setLoading(false);
    } catch (err: any) {
      const errorMessage = handleApiError(err);
      setError(`Не удалось загрузить данные пользователя. ${errorMessage}`);
      setLoading(false);
    }
  };

  const handleGuestTypeChange = (value: 'owner' | 'guest' | 'regular' | 'bartender'): void => {
    setFormData(prev => ({ ...prev, guestType: value }));
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>): void => {
    const { name, value, type } = e.target;
    setFormData({
      ...formData,
      [name]: type === 'checkbox' ? (e.target as HTMLInputElement).checked : 
             (name === 'name' || name === 'phone' || name === 'comment') ? value : Number(value)
    });
  };

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>): Promise<void> => {
    e.preventDefault();
    
    try {
      if (isEditMode && userId !== undefined) {
        await userApi.update(userId, formData);
      } else {
        await userApi.create(formData);
      }
      navigate('/users');
    } catch (err: any) {
      const errorMessage = handleApiError(err);
      setError(`Не удалось сохранить пользователя. ${errorMessage}`);
    }
  };

  if (loading) {
    return <div className={styles.loading}>Загрузка...</div>;
  }

  if (error) {
    return <div className={styles.error}>{error}</div>;
  }

  return (
    <form onSubmit={handleSubmit} className={styles.userForm}>
      <Row gutter={[16, 16]}>
        <Col xs={24} md={12}>
          <div className={styles.formGroup}>
            <label htmlFor="name">Имя</label>
            <Input
              id="name"
              name="name"
              value={formData.name}
              onChange={handleChange}
              size="large"
              required
            />
          </div>
        </Col>
        <Col xs={24} md={12}>
          <div className={styles.formGroup}>
            <label htmlFor="phone">Номер телефона</label>
            <Input
              id="phone"
              name="phone"
              value={formData.phone || ''}
              onChange={handleChange}
              size="large"
            />
          </div>
        </Col>

        <Col xs={24} md={12}>
          <div className={styles.formGroup}>
            <label htmlFor="guestType">Тип гостя</label>
            <Select
              id="guestType"
              value={(formData.guestType as any) || 'guest'}
              onChange={handleGuestTypeChange}
              size="large"
              style={{ width: '100%' }}
              options={[
                { value: 'owner', label: 'Владелец' },
                { value: 'guest', label: 'Гость' },
                { value: 'regular', label: 'Постоянник' },
                { value: 'bartender', label: 'Бармен' },
              ]}
            />
          </div>
        </Col>
        <Col xs={24} md={12}>
          <div className={styles.formGroup}>
            <label htmlFor="discountPercent">Постоянная скидка, %</label>
            <InputNumber
              id="discountPercent"
              value={formData.discountPercent ?? 0}
              min={0}
              max={100}
              step={0.5}
              onChange={(v) => setFormData(prev => ({ ...prev, discountPercent: Number(v) || 0 }))}
              style={{ width: '100%' }}
            />
          </div>
        </Col>
        <Col xs={24} md={12}>
          <div className={styles.formGroup}>
            <label htmlFor="isDebtor">Должник</label>
            <Checkbox
              id="isDebtor"
              checked={formData.isDebtor || false}
              onChange={(e) => setFormData(prev => ({ ...prev, isDebtor: e.target.checked }))}
            >
              Да
            </Checkbox>
          </div>
        </Col>
        <Col xs={24} md={12}>
          <div className={styles.formGroup}>
            <label htmlFor="totalOrdersAmount">Сумма заказов</label>
            <InputNumber
              id="totalOrdersAmount"
              value={formData.totalOrdersAmount}
              onChange={(v) => setFormData(prev => ({ ...prev, totalOrdersAmount: Number(v) || 0 }))}
              min={0}
              style={{ width: '100%' }}
            />
          </div>
        </Col>

        <Col xs={24} md={12}>
          <div className={styles.formGroup}>
            <label htmlFor="visitCount">Количество посещений</label>
            <InputNumber
              id="visitCount"
              value={formData.visitCount}
              onChange={(v) => setFormData(prev => ({ ...prev, visitCount: Number(v) || 0 }))}
              min={0}
              style={{ width: '100%' }}
            />
          </div>
        </Col>
        <Col xs={24} md={12}>
          <div className={styles.formGroup}>
            <label htmlFor="averageCheck">Средний чек</label>
            <InputNumber
              id="averageCheck"
              value={formData.averageCheck}
              onChange={(v) => setFormData(prev => ({ ...prev, averageCheck: Number(v) || 0 }))}
              min={0}
              style={{ width: '100%' }}
            />
          </div>
        </Col>

        <Col xs={24}>
          <div className={styles.formGroup}>
            <label htmlFor="comment">Комментарий</label>
            <Input.TextArea
              id="comment"
              name="comment"
              value={formData.comment || ''}
              onChange={handleChange}
              rows={3}
            />
          </div>
        </Col>

        <Col span={24}>
          <div className={styles.formActions}>
            <Button type="default" onClick={() => navigate('/users')} className={styles.cancelButton}>
              Отмена
            </Button>
            <Button type="primary" htmlType="submit" className={styles.submitButton}>
              {isEditMode ? 'Сохранить' : 'Добавить'}
            </Button>
          </div>
        </Col>
      </Row>
    </form>
  );
};
