import React, { useEffect, useMemo, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { shiftApi, Shift } from '../../../shared/api/shifts';
import { Button, message } from 'antd';
import { fetchInventoryClipboardText } from '../../../shared/utils/inventoryClipboard';

const formatDT = (s?: string | null) => (s ? new Date(s).toLocaleString('ru-RU') : '—');

const StatItem: React.FC<{ label: string; value: React.ReactNode }> = ({ label, value }) => (
  <div style={{ padding: 12, border: '1px solid #eee', borderRadius: 8, minWidth: 160 }}>
    <div style={{ fontSize: 12, color: '#888' }}>{label}</div>
    <div style={{ fontSize: 18, fontWeight: 600 }}>{value}</div>
  </div>
);

const formatMoney = (n: any) => `${Number(n || 0).toFixed(2)} ₾`;

const ShiftDetailsPage: React.FC = () => {
  const { id } = useParams();
  const shiftId = Number(id);
  const [shift, setShift] = useState<Shift | null>(null);
  const [bartenders, setBartenders] = useState<{ id: number; name: string }[]>([]);
  const [orders, setOrders] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = async () => {
    try {
      setLoading(true);
      const resp = await shiftApi.getById(shiftId);
      // eslint-disable-next-line no-console
      console.log('[ShiftDetailsPage] getById response', {
        status: resp.status,
        url: (resp as any)?.config?.url,
        data: resp.data,
      });
      const data: any = resp.data;
      setShift(data.shift);
      setBartenders((data.bartenders || []).map((b: any) => ({ id: b.user?.id ?? b.userId, name: b.user?.name ?? `#${b.userId}` })));
      const o = await shiftApi.getOrders(shiftId);
      // eslint-disable-next-line no-console
      console.log('[ShiftDetailsPage] getOrders response', {
        status: o.status,
        url: (o as any)?.config?.url,
        count: Array.isArray(o.data) ? o.data.length : 'not-array',
        sample: Array.isArray(o.data) ? o.data.slice(0,2) : o.data,
      });
      setOrders(o.data || []);
      setError(null);
    } catch (e) {
      setError('Не удалось загрузить смену');
      // eslint-disable-next-line no-console
      console.error('[ShiftDetailsPage] load error', e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (Number.isFinite(shiftId)) {
      // eslint-disable-next-line no-console
      console.log('[ShiftDetailsPage] Mount for id:', shiftId);
      load();
    }
  }, [shiftId]);

  // IMPORTANT: Hooks must be called unconditionally. Compute memoized values
  // before any early returns and make them resilient to null/empty state.
  const bartenderMap = useMemo(() => {
    const m = new Map<number, string>();
    (bartenders || []).forEach(b => m.set(b.id, b.name));
    return m;
  }, [bartenders]);

  const contributions = useMemo(() => {
    type Row = { bartenderId: number; name: string; checks: number; net: number; avg: number };
    const by: Record<number, { checks: number; net: number }> = {} as any;
    (orders as any[]).forEach((o) => {
      if (o && o.status === 'completed') {
        const uid = Number(o.closedByUserId || 0);
        if (!uid) return;
        if (!by[uid]) by[uid] = { checks: 0, net: 0 };
        by[uid].checks += 1;
        by[uid].net += Number(o.netAmount ?? o.totalAmount ?? 0);
      }
    });
    const rows: Row[] = Object.entries(by).map(([id, v]) => ({
      bartenderId: Number(id),
      name: bartenderMap.get(Number(id)) || `#${id}`,
      checks: v.checks,
      net: v.net,
      avg: v.checks ? v.net / v.checks : 0,
    }));
    rows.sort((a,b) => b.net - a.net);
    return rows;
  }, [orders, bartenderMap]);

  const buildShiftReportText = (
    data?: { s?: Shift | null; bart?: { id: number; name: string }[]; ordersList?: any[] }
  ): string => {
    const s = data?.s ?? shift;
    const bart = data?.bart ?? bartenders;
    const ords = data?.ordersList ?? orders;
    if (!s) return '';
    const revenue = s.summary?.revenue || ({} as any);
    const ordersSummary = s.summary?.orders || ({} as any);
    const payments = s.summary?.payments || ({} as any);
    const guests = s.summary?.guests ?? 0;
    const avgCheckNet = s.summary?.avgCheckNet ?? 0;

    // contributions based on provided orders
    const by: Record<number, { checks: number; net: number }> = {} as any;
    (ords || []).forEach((o: any) => {
      if (o && o.status === 'completed') {
        const uid = Number(o.closedByUserId || 0);
        if (!uid) return;
        if (!by[uid]) by[uid] = { checks: 0, net: 0 };
        by[uid].checks += 1;
        by[uid].net += Number(o.netAmount ?? o.totalAmount ?? 0);
      }
    });
    const contr = Object.entries(by)
      .map(([id, v]) => ({
        bartenderId: Number(id),
        name: (bart || []).find((b) => b.id === Number(id))?.name || `#${id}`,
        checks: (v as any).checks,
        net: (v as any).net,
        avg: (v as any).checks ? (v as any).net / (v as any).checks : 0,
      }))
      .sort((a, b) => b.net - a.net);

    const lines: string[] = [];
    lines.push(`Открыта:\u00A0${formatDT(s.openedAt)}`);
    if (s.closedAt) lines.push(`Закрыта:\u00A0${formatDT(s.closedAt)}`);
    lines.push(`Статус:\u00A0${s.status === 'open' ? 'Открыта' : 'Закрыта'}`);
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
    if ((bart || []).length) {
      for (const b of bart!) lines.push(b.name);
    }
    for (const r of contr) {
      lines.push(`Бармен:\u00A0${r.name}; Чеков:\u00A0${r.checks}; Выручка (net):\u00A0${formatMoney(r.net)}; Средний чек:\u00A0${formatMoney(r.avg)}`);
    }
    lines.push('Оплаты');
    lines.push(`Наличные:\u00A0${formatMoney(payments.cash)}`);
    lines.push(`Карта:\u00A0${formatMoney(payments.card)}`);
    lines.push(`Перевод:\u00A0${formatMoney(payments.transfer)}`);
    return lines.join('\n');
  };

  const handleCopyReport = async () => {
    try {
      const report = buildShiftReportText();
      const inventory = await fetchInventoryClipboardText();
      const text = `${report}\n\nОстатки:\n${inventory}`;
      await navigator.clipboard.writeText(text);
    } catch (e) {
      console.error('copy report error', e);
      throw e;
    }
  };

  const handleCloseAndCopy = async () => {
    try {
      if (!shift) return;
      // Закрываем смену (сервер вернет обновленную смену)
      await shiftApi.close(shift.id, {} as any);
      // Получаем актуальные данные для отчета
      const [detail, ord] = await Promise.all([
        shiftApi.getById(shift.id),
        shiftApi.getOrders(shift.id),
      ]);
      const freshShift = (detail.data as any)?.shift as Shift;
      const freshBart = ((detail.data as any)?.bartenders || []).map((b: any) => ({ id: b.user?.id ?? b.userId, name: b.user?.name ?? `#${b.userId}` }));
      const freshOrders = (ord.data || []) as any[];

      // Сформировать и скопировать
      const report = buildShiftReportText({ s: freshShift, bart: freshBart, ordersList: freshOrders });
      const inventory = await fetchInventoryClipboardText();
      const text = `${report}\n\nОстатки:\n${inventory}`;
      await navigator.clipboard.writeText(text);

      // Обновить UI состоянием
      setShift(freshShift);
      setBartenders(freshBart);
      setOrders(freshOrders);

      message.success('Смена закрыта, отчет скопирован');
    } catch (e) {
      console.error('close and copy error', e);
      message.error('Не удалось закрыть смену или скопировать отчет');
      throw e;
    }
  };

  if (loading) return <div style={{ padding: 16 }}>Загрузка...</div>;
  if (error) return <div style={{ padding: 16, color: '#cf1322' }}>{error}</div>;
  if (!shift) return <div style={{ padding: 16 }}>Смена не найдена</div>;

  const revenue = shift.summary?.revenue || {};
  const ordersSummary = shift.summary?.orders || {};
  const payments = shift.summary?.payments || {};
  const guests = shift.summary?.guests ?? 0;
  const avgCheckNet = shift.summary?.avgCheckNet ?? 0;


  return (
    <div style={{ padding: 16 }}>
      <div style={{ maxWidth: 920, margin: '0 auto', background: '#fff', color: '#000', padding: 24, borderRadius: 8 }}>
        <div style={{ marginBottom: 12 }}>
          <Link to="/shifts">← Назад к сменам</Link>
        </div>

        <h1 style={{ margin: '0 0 8px 0', fontWeight: 700 }}>Смена #{shift.id}</h1>
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 8 }}>
          <Button
            onClick={async () => {
              try {
                await handleCopyReport();
                message.success('Отчет по смене скопирован');
              } catch (e) {
                console.error(e);
                message.error('Не удалось скопировать отчет');
              }
            }}
          >
            Скопировать отчет
          </Button>
          {shift.status === 'open' && (
            <Button
              type="primary"
              danger
              onClick={async () => {
                try {
                  await handleCloseAndCopy();
                } catch (e) {
                  // error handled inside
                }
              }}
            >
              Закрыть смену и скопировать отчет
            </Button>
          )}
        </div>
        <div style={{ marginBottom: 16 }}>
          <div>Открыта: {formatDT(shift.openedAt)}</div>
          {shift.closedAt && <div>Закрыта: {formatDT(shift.closedAt)}</div>}
          <div>Статус: {shift.status === 'open' ? 'Открыта' : 'Закрыта'}</div>
        </div>

        <div style={{ margin: '16px 0' }}>
          <h3 style={{ margin: '0 0 6px 0' }}>Итоги</h3>
          <div>Выручка (gross): {Number(revenue.gross || 0).toFixed(2)} ₾</div>
          <div>Скидки: −{Number(revenue.discount || 0).toFixed(2)} ₾</div>
          <div>Выручка (net): {Number(revenue.net || 0).toFixed(2)} ₾</div>
          <div>Чеков (всего): {ordersSummary.total ?? 0}</div>
          <div>Чеков (завершено): {ordersSummary.completed ?? 0}</div>
          <div>Отменено: {ordersSummary.cancelled ?? 0}</div>
          <div>Гостей: {guests}</div>
          <div>Средний чек (net): {Number(avgCheckNet).toFixed(2)} ₾</div>
        </div>

        <div style={{ margin: '16px 0' }}>
          <h3 style={{ margin: '0 0 6px 0' }}>Бармены</h3>
          <div>
            {(bartenders || []).length ? bartenders.map(b => b.name).join(', ') : '—'}
          </div>
          {contributions.length > 0 && (
            <div style={{ marginTop: 8 }}>
              {contributions.map(r => (
                <div key={r.bartenderId}>
                  Бармен: {r.name}; Чеков: {r.checks}; Выручка (net): {r.net.toFixed(2)} ₾; Средний чек: {r.avg.toFixed(2)} ₾
                </div>
              ))}
            </div>
          )}
        </div>

        <div style={{ margin: '16px 0' }}>
          <h3 style={{ margin: '0 0 6px 0' }}>Оплаты</h3>
          <div>Наличные: {Number(payments.cash || 0).toFixed(2)} ₾</div>
          <div>Карта: {Number(payments.card || 0).toFixed(2)} ₾</div>
          <div>Перевод: {Number(payments.transfer || 0).toFixed(2)} ₾</div>
        </div>

        {shift.openingNote && (
          <div style={{ margin: '16px 0' }}>
            <h3 style={{ margin: '0 0 6px 0' }}>Заметка к открытию</h3>
            <div style={{ whiteSpace: 'pre-wrap' }}>{shift.openingNote}</div>
          </div>
        )}
        {shift.closingNote && (
          <div style={{ margin: '16px 0' }}>
            <h3 style={{ margin: '0 0 6px 0' }}>Заметка к закрытию</h3>
            <div style={{ whiteSpace: 'pre-wrap' }}>{shift.closingNote}</div>
          </div>
        )}

        
      </div>
    </div>
  );
};

export default ShiftDetailsPage;
