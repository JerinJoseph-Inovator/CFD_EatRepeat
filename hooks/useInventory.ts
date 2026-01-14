
import { useState, useEffect, useCallback } from 'react';
import { FoodItem } from '../types';

export const useInventory = () => {
  const [inventory, setInventory] = useState<FoodItem[]>(() => {
    const saved = localStorage.getItem('eat-repeat-vault');
    return saved ? JSON.parse(saved) : [];
  });

  useEffect(() => {
    localStorage.setItem('eat-repeat-vault', JSON.stringify(inventory));
  }, [inventory]);

  const addItem = useCallback((item: FoodItem) => {
    setInventory(prev => [{ ...item, id: crypto.randomUUID(), addedDate: new Date().toISOString() }, ...prev]);
  }, []);

  const removeItem = useCallback((id: string) => {
    setInventory(prev => prev.filter(item => item.id !== id));
  }, []);

  const hydrateDemo = useCallback((items: FoodItem[]) => {
    setInventory(items.map(i => ({ ...i, id: crypto.randomUUID() })));
  }, []);

  return { inventory, addItem, removeItem, hydrateDemo };
};
