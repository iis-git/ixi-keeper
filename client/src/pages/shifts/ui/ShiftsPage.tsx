import React, { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { shiftApi, Shift } from '../../../shared/api/shifts';
import { ShiftModal } from '../../../features/shifts/shift-modal';
import { Select, DatePicker, Button, Space, message, Tooltip } from 'antd';
import dayjs from 'dayjs';
import { fetchInventoryClipboardText } from '../../../shared/utils/inventoryClipboard';
import { EyeOutlined, CopyOutlined } from '@ant-design/icons';

const formatDT = (s?: string | null) => (s ? new Date(s).toLocaleString('ru-RU') : '—');

const ShiftsPage: React.FC = () => {
  const [list, setList] = useState<Shift[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [shiftModalOpen, setShiftModalOpen] = useState(false);
  const [statusFilter, setStatusFilter] = useState<'all'|'open'|'closed'>('all');
  const [dateFrom, setDateFrom] = useState<string>('');
  const [dateTo, setDateTo] = useState<string>('');
  const [bartendersByShift, setBartendersByShift] = useState<Record<number, string[]>>({});
  const navigate = useNavigate();

  const formatMoney = (n: any) => `${Number(n || 0).toFixed(2)} ₾`;

  const buildShiftReportText = (shift: any, bartenders: { id: number; name: string }[], orders: any[]): string => {
    const revenue = shift?.summary?.revenue || {} as any;
    const ordersSummary = shift?.summary?.orders || {} as any;
    const payments = shift?.summary?.payments || {} as any;
    const guests = shift?.summary?.guests ?? 0;
    const avgCheckNet = shift?.summary?.avgCheckNet ?? 0;

    const by: Record<number, { checks: number; net: number }> = {} as any;
    (orders || []).forEach((o: any) => {
      if (o && o.status === 'completed') {
        const uid = Number(o.closedByUserId || 0);
        if (!uid) return;
        if (!by[uid]) by[uid] = { checks: 0, net: 0 };
        by[uid].checks += 1;
        by[uid].net += Number(o.netAmount ?? o.totalAmount ?? 0);
      }
    });
    const contributions = Object.entries(by)
      .map(([id, v]) => ({
        bartenderId: Number(id),
        name: (bartenders || []).find((b) => b.id === Number(id))?.name || `#${id}`,
        checks: (v as any).checks,
        net: (v as any).net,
        avg: (v as any).checks ? (v as any).net / (v as any).checks : 0,
      }))
      .sort((a, b) => b.net - a.net);

    const lines: string[] = [];
    const formatDT = (s?: string | null) => (s ? new Date(s).toLocaleString('ru-RU') : '—');
    lines.push(`Открыта:\u00A0${formatDT(shift?.openedAt)}`);
    if (shift?.closedAt) lines.push(`Закрыта:\u00A0${formatDT(shift?.closedAt)}`);
    lines.push(`Статус:\u00A0${shift?.status === 'open' ? 'Открыта' : 'Закрыта'}`);
    lines.push('Итоги');
    lines.push(`Выручка (gross):\u00A0${formatMoney(revenue.gross)}`);
    lines.push(`Скидки: −${formatMoney(revenue.discount)}`);
    lines.push(`Выручка (net):\u00A0${formatMoney(revenue.net)}`);
    lines.push(`Чеков (всего):\u00A0${ordersSummary.total ?? 0}`);
    lines.push(`Чеков (завершено):\u00A0${ordersSummary.completed ?? 0}`);
    lines.push(`Отменено:\u00A0${ordersSummary.cancelled ?? 0}`);
    lines.push(`Гостей:\u00A0${guests}`);
    lines.push(`Средний чек (net):\u00A0${formatMoney(avgCheckNet)}`);
    lines.push('Бармены');
    const bartenderNames = (bartenders || []).map(b => b.name);
    if (bartenderNames.length) lines.push(...bartenderNames);
    for (const r of contributions) {
      lines.push(`Бармен:\u00A0${r.name}; Чеков:\u00A0${r.checks}; Выручка (net):\u00A0${formatMoney(r.net)}; Средний чек:\u00A0${formatMoney(r.avg)}`);
    }
    lines.push('Оплаты');
    lines.push(`Наличные:\u00A0${formatMoney(payments.cash)}`);
    lines.push(`Карта:\u00A0${formatMoney(payments.card)}`);
    lines.push(`Перевод:\u00A0${formatMoney(payments.transfer)}`);
    return lines.join('\n');
  };

  const handleCopyRowReport = async (id: number) => {
    try {
      const [detail, ord] = await Promise.all([
        shiftApi.getById(id),
        shiftApi.getOrders(id),
      ]);
      const freshShift = (detail.data as any)?.shift as any;
      const freshBart = ((detail.data as any)?.bartenders || []).map((b: any) => ({ id: b.user?.id ?? b.userId, name: b.user?.name ?? `#${b.userId}` }));
      const freshOrders = (ord.data || []) as any[];
      const report = buildShiftReportText(freshShift, freshBart, freshOrders);
      const inventory = await fetchInventoryClipboardText();
      const text = `${report}\n\nОстатки:\n${inventory}`;
      await navigator.clipboard.writeText(text);
      message.success('Отчет по смене скопирован');
    } catch (e) {
      console.error('copy row report error', e);
      message.error('Не удалось скопировать отчет');
    }
  };

  const load = async () => {
    try {
      setLoading(true);
      // Debug: start loading
      // eslint-disable-next-line no-console
      console.log('[ShiftsPage] Loading shifts list...');
      const resp = await shiftApi.list();
      // Debug: response meta
      // eslint-disable-next-line no-console
      console.log('[ShiftsPage] Shifts response:', {
        status: resp.status,
        url: (resp as any)?.config?.url,
        count: Array.isArray(resp.data) ? resp.data.length : 'not-array',
        dataSample: Array.isArray(resp.data) ? resp.data.slice(0, 2) : resp.data,
      });
      setList(resp.data || []);
      setError(null);
    } catch (e: any) {
      setError('Не удалось загрузить список смен');
      // eslint-disable-next-line no-console
      console.error('[ShiftsPage] Failed to load shifts:', e);
    } finally {
      setLoading(false);
      // eslint-disable-next-line no-console
      console.log('[ShiftsPage] Loading shifts finished');
    }
  };

  useEffect(() => {
    // eslint-disable-next-line no-console
    console.log('[ShiftsPage] Mount, requesting shifts...');
    load();
  }, []);

  // Fetch bartenders for visible shifts
  useEffect(() => {
    const fetchBartenders = async () => {
      try {
        const ids = (list || []).map(s => s.id).filter((id): id is number => typeof id === 'number');
        const results: Record<number, string[]> = {};
        // Limit concurrent requests if many
        const chunkSize = 5;
        for (let i = 0; i < ids.length; i += chunkSize) {
          const chunk = ids.slice(i, i + chunkSize);
          const resps = await Promise.all(chunk.map(id => shiftApi.getById(id).catch(() => null)));
          resps.forEach((r, idx) => {
            const id = chunk[idx];
            if (r && r.data) {
              const bartenders = (r.data.bartenders || []).map((b: any) => b.user?.name ?? `#${b.userId}`);
              results[id] = bartenders;
            }
          });
        }
        setBartendersByShift(prev => ({ ...prev, ...results }));
      } catch (e) {
        // eslint-disable-next-line no-console
        console.warn('[ShiftsPage] Failed to fetch bartenders for shifts', e);
      }
    };
    if ((list || []).length) {
      fetchBartenders();
    }
  }, [list]);

  const filtered = useMemo(() => {
    const result = (list || []).filter(sh => {
      if (statusFilter !== 'all' && sh.status !== statusFilter) return false;
      const opened = sh.openedAt ? new Date(sh.openedAt).getTime() : 0;
      if (dateFrom) {
        const fromTs = new Date(dateFrom + 'T00:00:00').getTime();
        if (opened < fromTs) return false;
      }
      if (dateTo) {
        const toTs = new Date(dateTo + 'T23:59:59').getTime();
        if (opened > toTs) return false;
      }
      return true;
    });
    // Debug: filtering info
    // eslint-disable-next-line no-console
    console.debug('[ShiftsPage] Filtered shifts', {
      total: list?.length ?? 0,
      filtered: result.length,
      statusFilter,
      dateFrom,
      dateTo,
    });
    return result;
  }, [list, statusFilter, dateFrom, dateTo]);

  if (loading) return <div style={{ padding: 16 }}>Загрузка...</div>;
  if (error) return <div style={{ padding: 16, color: '#cf1322' }}>{error}</div>;

  return (
    <div style={{ padding: 16 }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8 }}>
        <h1 style={{ margin: 0 }}>Смены</h1>
        <button
          onClick={() => setShiftModalOpen(true)}
          style={{ background: '#1677ff', color: '#fff', border: 'none', padding: '6px 12px', borderRadius: 6, cursor: 'pointer' }}
        >
          Открыть смену
        </button>
      </div>
      <div style={{ marginBottom: 12 }}>
        <Space wrap size={12} align="center">
          <div>
            <div style={{ fontSize: 12, color: '#666' }}>Статус</div>
            <Select
              value={statusFilter}
              onChange={(v)=> setStatusFilter(v as any)}
              style={{ width: 180 }}
              options={[
                { value: 'all', label: 'Все' },
                { value: 'open', label: 'Открытые' },
                { value: 'closed', label: 'Закрытые' },
              ]}
            />
          </div>
          <div>
            <div style={{ fontSize: 12, color: '#666' }}>Период (от/до)</div>
            <DatePicker.RangePicker
              value={[
                dateFrom ? dayjs(dateFrom, 'YYYY-MM-DD') : null,
                dateTo ? dayjs(dateTo, 'YYYY-MM-DD') : null,
              ] as any}
              onChange={(vals)=> {
                const [from, to] = vals || [];
                setDateFrom(from ? from.format('YYYY-MM-DD') : '');
                setDateTo(to ? to.format('YYYY-MM-DD') : '');
              }}
              allowEmpty={[true,true]}
            />
          </div>
          <div>
            <div style={{ height: 18 }} />
            <Button onClick={()=>{ setStatusFilter('all'); setDateFrom(''); setDateTo(''); }}>
              Сбросить
            </Button>
          </div>
        </Space>
      </div>
      {filtered.length === 0 ? (
        <div style={{ marginTop: 12 }}>
          Смен пока нет. Начните первую смену.
        </div>
      ) : (
        <table style={{ width: '100%', borderCollapse: 'collapse', background: '#fff', color: '#000', borderRadius: 8, overflow: 'hidden', boxShadow: '0 1px 4px rgba(0,0,0,0.06)' }}>
          <thead>
            <tr>
              <th style={{ textAlign: 'left', padding: 10, borderBottom: '1px solid #eee' }}>ID</th>
              <th style={{ textAlign: 'left', padding: 10, borderBottom: '1px solid #eee' }}>Открыта</th>
              <th style={{ textAlign: 'left', padding: 10, borderBottom: '1px solid #eee' }}>Закрыта</th>
              <th style={{ textAlign: 'left', padding: 10, borderBottom: '1px solid #eee' }}>Статус</th>
              <th style={{ textAlign: 'left', padding: 10, borderBottom: '1px solid #eee' }}>Бармены</th>
              <th style={{ textAlign: 'left', padding: 10, borderBottom: '1px solid #eee' }}>Выручка (net)</th>
              <th style={{ textAlign: 'left', padding: 10, borderBottom: '1px solid #eee' }}>Чеков</th>
              <th style={{ textAlign: 'left', padding: 10, borderBottom: '1px solid #eee' }}>Действия</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map((sh) => (
              <tr key={sh.id}>
                <td style={{ padding: 10, borderBottom: '1px solid #f0f0f0' }}>#{sh.id}</td>
                <td style={{ padding: 10, borderBottom: '1px solid #f0f0f0' }}>{formatDT(sh.openedAt)}</td>
                <td style={{ padding: 10, borderBottom: '1px solid #f0f0f0' }}>{formatDT(sh.closedAt)}</td>
                <td style={{ padding: 10, borderBottom: '1px solid #f0f0f0' }}>{sh.status === 'open' ? 'Открыта' : 'Закрыта'}</td>
                <td style={{ padding: 10, borderBottom: '1px solid #f0f0f0' }}>
                  {(bartendersByShift[sh.id] || []).join(', ') || '—'}
                </td>
                <td style={{ padding: 10, borderBottom: '1px solid #f0f0f0' }}>{sh.summary?.revenue?.net ? Number(sh.summary.revenue.net).toFixed(2) + ' ₾' : '—'}</td>
                <td style={{ padding: 10, borderBottom: '1px solid #f0f0f0' }}>{sh.summary?.orders?.total ?? '—'}</td>
                <td style={{ padding: 10, borderBottom: '1px solid #f0f0f0' }}>
                  <Space>
                    <Tooltip title="Открыть">
                      <Button
                        type="primary"
                        icon={<EyeOutlined />}
                        onClick={() => navigate(`/shifts/${sh.id}`)}
                        style={{ width: 40, height: 40, padding: 0, borderRadius: 4 }}
                      />
                    </Tooltip>
                    <Tooltip title="Скопировать отчет">
                      <Button
                        type="primary"
                        icon={<CopyOutlined />}
                        style={{ width: 40, height: 40, padding: 0, borderRadius: 4, background: '#52c41a', borderColor: '#52c41a' }}
                        onClick={() => handleCopyRowReport(sh.id)}
                      />
                    </Tooltip>
                  </Space>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}

      <ShiftModal
        open={shiftModalOpen}
        onClose={() => setShiftModalOpen(false)}
        onShiftChanged={() => { setShiftModalOpen(false); load(); }}
      />
    </div>
  );
};

export default ShiftsPage;
