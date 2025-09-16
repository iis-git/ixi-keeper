import React, { useEffect, useMemo, useState } from 'react';
import { shiftApi, Shift } from '../../../../shared/api/shifts';
import { userApi } from '../../../../shared/api/user';
import type { User } from '../../../../shared/types/model';

interface ShiftWidgetProps {
  onShiftChanged?: () => void;
}

export const ShiftWidget: React.FC<ShiftWidgetProps> = ({ onShiftChanged }) => {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeShift, setActiveShift] = useState<Shift | null>(null);
  const [bartenders, setBartenders] = useState<User[]>([]);
  const [selectedBartenders, setSelectedBartenders] = useState<number[]>([]);
  // Убрали заметку к открытию по требованию
  const [closingNote, setClosingNote] = useState('');

  const loadActive = async () => {
    try {
      setLoading(true);
      const resp = await shiftApi.getActive();
      const data = resp.data as any;
      if (data && (data as any).shift) {
        setActiveShift((data as any).shift);
      } else {
        setActiveShift(null);
      }
    } catch (e) {
      // 204 No Content -> no active shift
      setActiveShift(null);
    } finally {
      setLoading(false);
    }
  };

  const loadBartenders = async () => {
    try {
      const resp = await userApi.getAll();
      const list = (resp.data || []).filter((u: any) => (u.guestType || 'guest') === 'bartender');
      setBartenders(list);
    } catch (e) {
      // ignore
    }
  };

  useEffect(() => {
    loadActive();
    loadBartenders();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const isOpen = !!activeShift && activeShift.status === 'open';

  const handleOpenShift = async () => {
    try {
      if (selectedBartenders.length === 0) {
        alert('Выберите хотя бы одного бармена для открытия смены');
        return;
      }
      await shiftApi.open({ bartenders: selectedBartenders });
      setSelectedBartenders([]);
      await loadActive();
      onShiftChanged?.();
    } catch (e: any) {
      alert('Не удалось открыть смену');
      // eslint-disable-next-line no-console
      console.error(e);
    }
  };

  const handleCloseShift = async () => {
    try {
      if (!activeShift) return;
      if (!confirm('Закрыть текущую смену?')) return;
      await shiftApi.close(activeShift.id, { closingNote: closingNote || undefined });
      setClosingNote('');
      await loadActive();
      onShiftChanged?.();
    } catch (e: any) {
      alert('Не удалось закрыть смену');
      // eslint-disable-next-line no-console
      console.error(e);
    }
  };

  return (
    <div style={{ border: 'none', borderRadius: 8, padding: 12, marginBottom: 12 }}>


      {loading ? (
        <div style={{ color: '#888' }}>Загрузка...</div>
      ) : isOpen && activeShift ? (
        <div>
          <div style={{ fontSize: 13, color: '#555', marginBottom: 8 }}>
            Начата: {new Date(activeShift.openedAt).toLocaleString('ru-RU')}
          </div>
          <div style={{ marginBottom: 8 }}>
            <textarea
              placeholder="Заметка к закрытию (необязательно)"
              value={closingNote}
              onChange={(e) => setClosingNote(e.target.value)}
              style={{ width: '100%', minHeight: 60, background: '#fff' }}
            />
          </div>
          <button onClick={handleCloseShift} style={{ background: '#fa541c', color: '#fff', border: 'none', padding: '6px 12px', borderRadius: 4, cursor: 'pointer' }}>
            Закрыть смену
          </button>
        </div>
      ) : (
        <div>
          <div style={{ fontSize: 13, color: '#555', marginBottom: 8 }}>Выберите барменов для новой смены:</div>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginBottom: 8 }}>
            {bartenders.map(b => {
              const checked = selectedBartenders.includes(b.id);
              return (
                <label
                  key={b.id}
                  style={{
                    border: 'none',
                    borderRadius: 8,
                    padding: '6px 10px',
                    cursor: 'pointer',
                    background: checked ? '#1677ff' : '#f2f3f5',
                    color: checked ? '#fff' : '#1f1f1f',
                    boxShadow: checked ? '0 0 0 2px rgba(22,119,255,0.15) inset' : 'none',
                    transition: 'background 120ms ease'
                  }}
                >
                  <input
                    type="checkbox"
                    checked={checked}
                    onChange={(e) => {
                      setSelectedBartenders(prev => e.target.checked ? [...prev, b.id] : prev.filter(id => id !== b.id));
                    }}
                    style={{
                      marginRight: 6,
                      width: 16,
                      height: 16,
                      border: '1px solid rgba(0,0,0,0.15)',
                      borderRadius: 4,
                      backgroundColor: `#fff`,
                      opacity:`0`,
                      display: `none`
                    }}
                  />
                  {b.name}
                </label>
              );
            })}
          </div>
          <button onClick={handleOpenShift} style={{ background: '#1677ff', color: '#fff', border: 'none', padding: '6px 12px', borderRadius: 4, cursor: 'pointer', display: `block`, marginLeft: `auto` }}>
            Начать смену
          </button>
        </div>
      )}
    </div>
  );
};
