import { productApi } from '../api/product';
import { categoryApi } from '../api/category';
import type { Product } from '../../entities/product/model/types';
import type { Category } from '../../entities/category/model/types';

// Format number without trailing zeros
const formatAmount = (value: any): string => {
  if (value === null || value === undefined || value === '') return '0';
  const num = Number(value);
  if (Number.isNaN(num)) return String(value);
  const s = num.toFixed(3);
  return s.replace(/\.0+$/, '').replace(/(\.[1-9]*)0+$/, '$1');
};

export const buildInventoryClipboardText = (products: Product[], categories: Category[]): string => {
  const categoryMap = new Map<number, string>();
  categories.forEach((cat) => categoryMap.set(cat.id, cat.name));

  // Group by category name
  const groups = new Map<string, any[]>();
  for (const p of products) {
    const catName = (p as any).categoryId ? (categoryMap.get((p as any).categoryId) || 'Без категории') : 'Без категории';
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
        const amount = `${formatAmount(stockNum)}${unit ? ` ${unit}` : ''}`;
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

export const fetchInventoryClipboardText = async (): Promise<string> => {
  const [p, c] = await Promise.all([productApi.getAll(), categoryApi.getAll()]);
  return buildInventoryClipboardText(p.data, c.data);
};
