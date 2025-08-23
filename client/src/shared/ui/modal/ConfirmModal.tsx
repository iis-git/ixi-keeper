import React from 'react';
import { Modal } from './Modal';
import type { ModalProps } from './Modal';

export interface ConfirmModalProps extends Omit<ModalProps, 'onOk'> {
  onConfirm?: () => void;
  confirmText?: string;
  confirmType?: 'primary' | 'danger';
  message?: string;
}

export const ConfirmModal: React.FC<ConfirmModalProps> = ({
  onConfirm,
  confirmText = 'Подтвердить',
  confirmType = 'primary',
  message,
  children,
  ...props
}) => {
  const handleOk = () => {
    onConfirm?.();
  };

  return (
    <Modal
      {...props}
      onOk={handleOk}
      okText={confirmText}
      okButtonProps={{
        danger: confirmType === 'danger',
        type: confirmType === 'danger' ? 'primary' : 'primary'
      }}
    >
      {message && <p>{message}</p>}
      {children}
    </Modal>
  );
};

export default ConfirmModal;
