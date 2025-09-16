import React, { useEffect, useState } from 'react';
import { ShiftWidget } from '../../shift-widget';
import styles from './ShiftModal.module.scss';
import { shiftApi } from '../../../../shared/api/shifts';

interface ShiftModalProps {
  open: boolean;
  onClose: () => void;
  onShiftChanged?: () => void;
}

export const ShiftModal: React.FC<ShiftModalProps> = ({ open, onClose, onShiftChanged }) => {
  const [active, setActive] = useState<any>(null);

  useEffect(() => {
    const load = async () => {
      try {
        const resp = await shiftApi.getActive();
        setActive((resp as any).data || null);
      } catch {
        setActive(null);
      }
    };
    if (open) load();
  }, [open]);

  if (!open) return null;

  return (
    <div className={styles.overlay} onClick={onClose}>
      <div className={styles.modal} onClick={e => e.stopPropagation()}>
        <div className={styles.header}>
          <div className={styles.title}>
            <span>Смена</span>
            <span className={styles.badge}>{active?.shift ? 'Открыта' : 'Закрыта'}</span>
          </div>
          <button onClick={onClose} className={styles.closeBtn}>×</button>
        </div>
        <div className={styles.content}>
          <ShiftWidget onShiftChanged={onShiftChanged} />
        </div>
      </div>
    </div>
  );
};
