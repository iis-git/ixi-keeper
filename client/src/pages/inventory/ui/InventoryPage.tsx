import React, { useEffect, useMemo, useState } from 'react';
import styles from './InventoryPage.module.scss';
import { productApi } from '../../../shared/api/product';
import { categoryApi } from '../../../shared/api/category';
import type { Product } from '../../../entities/product/model/types';
import type { Category } from '../../../entities/category/model/types';
import { handleApiError } from '../../../shared/api/base';

export const InventoryPage: React.FC = () => {
  const [products, setProducts] = useState<Product[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  // flat list view: no extra UI states

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [p, c] = await Promise.all([
          productApi.getAll(),
          categoryApi.getAll(),
        ]);
        setProducts(p.data);
        setCategories(c.data);
      } catch (err: any) {
        setError(handleApiError(err));
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, []);

  const categoryMap = useMemo(() => {
    const m = new Map<number, string>();
    categories.forEach((cat) => m.set(cat.id, cat.name));
    return m;
  }, [categories]);

  // Сортировка
  type SortKey = 'name' | 'category' | 'stock' | 'unit' | 'alert';
  const [sortKey, setSortKey] = useState<SortKey>('name');
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('asc');

  const toggleSort = (key: SortKey) => {
    setSortKey((prev) => (prev === key ? prev : key));
    setSortDir((prev) => (sortKey === key ? (prev === 'asc' ? 'desc' : 'asc') : 'asc'));
  };

  // Форматирование числа для вывода (без лишних нулей)
  const formatAmount = (value: any): string => {
    if (value === null || value === undefined || value === '') return '0';
    const num = Number(value);
    if (Number.isNaN(num)) return String(value);
    const s = num.toFixed(3);
    return s.replace(/\.0+$/, '').replace(/(\.[1-9]*)0+$/, '$1');
  };

  const buildClipboardText = (): string => {
    // Группировка по названию категории
    const groups = new Map<string, any[]>();
    for (const p of products) {
      const catName = p.categoryId ? (categoryMap.get(p.categoryId) || 'Без категории') : 'Без категории';
      if (!groups.has(catName)) groups.set(catName, []);
      (groups.get(catName) as any[]).push(p);
    }

    const lines: string[] = [];
    for (const [cat, items] of groups) {
      lines.push(`${cat}:`);
      for (const p of items) {
        const isComposite = (p as any).isComposite;
        const unit = (p as any).unit || '';
        const threshold: number | undefined = typeof (p as any).lowStockThreshold === 'number' ? (p as any).lowStockThreshold : undefined;

        if (isComposite) {
          const calc = (p as any).calculatedStock;
          const avail = (p as any).availablePortions;
          const portions = Number(typeof calc === 'number' ? calc : (typeof avail === 'number' ? avail : 0));
          const portionText = portions === 1 ? 'порция' : portions >= 2 && portions <= 4 ? 'порции' : 'порций';
          lines.push(`- ${p.name} - ${formatAmount(portions)} ${portionText}`);
        } else {
          const stockNum = Number((p as any).stock);
          const amount = `${formatAmount(stockNum)}${unit ? ` ${unit}` : ''}`; // пробел между количеством и ед.
          const unitSizeNum = Number((p as any).unitSize) || 1;
          const positionsAvailable = Number.isFinite(stockNum) && unitSizeNum > 0 ? Math.floor(stockNum / unitSizeNum) : undefined;
          const isLow = typeof positionsAvailable === 'number' && typeof threshold === 'number' && threshold > 0 && positionsAvailable <= threshold;
          lines.push(`- ${p.name} - ${amount}${isLow ? ' -ЗАКАНЧИВАЕТСЯ' : ''}`);
        }
      }
      lines.push('');
    }

    return lines.join('\n').trim();
  };

  const handleCopy = async (): Promise<void> => {
    try {
      const text = buildClipboardText();
      await navigator.clipboard.writeText(text);
      window.alert('Список остатков скопирован в буфер обмена');
    } catch (e) {
      console.error(e);
      window.alert('Не удалось скопировать. Попробуйте ещё раз.');
    }
  };

  // Подготавливаем строки для таблицы и сортировки
  const rows = useMemo(() => {
    return products.map((p) => {
      const isComposite = (p as any).isComposite;
      const calc = (p as any).calculatedStock;
      const avail = (p as any).availablePortions;
      const parsedStock = Number((p as any).stock);
      const hasParsedStock = Number.isFinite(parsedStock);
      const stockNum = isComposite
        ? (typeof calc === 'number' ? calc : (typeof avail === 'number' ? avail : NaN))
        : (hasParsedStock ? parsedStock : NaN);
      const stockDisplay = Number.isFinite(stockNum) ? stockNum : undefined;
      const unit = isComposite ? 'порц.' : ((p as any).unit || '');
      const catName = p.categoryId ? categoryMap.get(p.categoryId) || '-' : '-';
      const threshold: number | undefined = typeof (p as any).lowStockThreshold === 'number' ? (p as any).lowStockThreshold : undefined;
      const unitSizeNum = Number((p as any).unitSize) || 1;
      const positionsAvailable = isComposite
        ? (typeof calc === 'number' ? calc : (typeof avail === 'number' ? avail : undefined))
        : (Number.isFinite(parsedStock) && unitSizeNum > 0 ? Math.floor(parsedStock / unitSizeNum) : undefined);
      const isAlert = typeof positionsAvailable === 'number' && typeof threshold === 'number' && threshold > 0 && positionsAvailable <= threshold;

      return {
        id: p.id,
        name: p.name || '',
        category: catName,
        stockNum,
        stockDisplay,
        unit,
        alert: isAlert,
        isComposite,
      };
    });
  }, [products, categoryMap]);

  const sortedRows = useMemo(() => {
    const arr = [...rows];
    arr.sort((a, b) => {
      const dir = sortDir === 'asc' ? 1 : -1;
      switch (sortKey) {
        case 'name':
          return a.name.localeCompare(b.name) * dir;
        case 'category':
          return a.category.localeCompare(b.category) * dir;
        case 'unit':
          return a.unit.localeCompare(b.unit) * dir;
        case 'alert':
          // true выше false при desc
          return ((a.alert === b.alert) ? 0 : a.alert ? 1 : -1) * dir;
        case 'stock':
        default: {
          const aNum = Number.isFinite(a.stockNum) ? Number(a.stockNum) : -Infinity;
          const bNum = Number.isFinite(b.stockNum) ? Number(b.stockNum) : -Infinity;
          return (aNum - bNum) * dir;
        }
      }
    });
    return arr;
  }, [rows, sortKey, sortDir]);

  if (loading) {
    return (
      <div className={styles.inventoryPage}>
        <div className={styles.header}>
          <h2 className={styles.title}>Остатки</h2>
        </div>
        <div>Загрузка...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className={styles.inventoryPage}>
        <div className={styles.header}>
          <h2 className={styles.title}>Остатки</h2>
        </div>
        <div className={styles.error}>{error}</div>
      </div>
    );
  }

  return (
    <div className={styles.inventoryPage}>
      <div className={styles.header}>
        <h2 className={styles.title}>Остатки</h2>
        <button className={styles.copyButton} onClick={handleCopy}>Скопировать</button>
      </div>

      <div className={styles.tableWrapper}>
        <table>
          <thead>
            <tr>
              <th className={styles.sortable} onClick={() => toggleSort('name')}>
                Название
                {sortKey === 'name' && <span className={styles.sortIndicator}>{sortDir === 'asc' ? '▲' : '▼'}</span>}
              </th>
              <th className={styles.sortable} onClick={() => toggleSort('category')}>
                Категория
                {sortKey === 'category' && <span className={styles.sortIndicator}>{sortDir === 'asc' ? '▲' : '▼'}</span>}
              </th>
              <th className={styles.sortable} onClick={() => toggleSort('stock')}>
                Остаток
                {sortKey === 'stock' && <span className={styles.sortIndicator}>{sortDir === 'asc' ? '▲' : '▼'}</span>}
              </th>
              <th className={styles.sortable} onClick={() => toggleSort('unit')}>
                Ед.
                {sortKey === 'unit' && <span className={styles.sortIndicator}>{sortDir === 'asc' ? '▲' : '▼'}</span>}
              </th>
              <th className={styles.sortable} onClick={() => toggleSort('alert')}>
                Оповещение
                {sortKey === 'alert' && <span className={styles.sortIndicator}>{sortDir === 'asc' ? '▲' : '▼'}</span>}
              </th>
            </tr>
          </thead>
          <tbody>
            {sortedRows.map((row) => (
              <tr key={row.id}>
                <td>{row.name}</td>
                <td>{row.category}</td>
                <td>{row.stockDisplay !== undefined ? row.stockDisplay : '—'}</td>
                <td>{row.unit}</td>
                <td>{row.alert ? 'Заканчивается' : '—'}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

export default InventoryPage;
