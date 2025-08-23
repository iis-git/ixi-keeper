import React from 'react';
import { Modal as AntModal } from 'antd';
import type { ModalProps as AntModalProps } from 'antd';

export interface ModalProps extends Omit<AntModalProps, 'children'> {
  children?: React.ReactNode;
}

export const Modal: React.FC<ModalProps> = ({ 
  children, 
  title,
  open,
  onCancel,
  onOk,
  okText = 'OK',
  cancelText = 'Отмена',
  width = 520,
  centered = true,
  destroyOnClose = true,
  ...props 
}) => {
  return (
    <AntModal
      title={title}
      open={open}
      onCancel={onCancel}
      onOk={onOk}
      okText={okText}
      cancelText={cancelText}
      width={width}
      centered={centered}
      destroyOnClose={destroyOnClose}
      {...props}
    >
      {children}
    </AntModal>
  );
};

export default Modal;
