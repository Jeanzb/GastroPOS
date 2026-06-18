import { create } from 'zustand';

interface OrderState {
  activeTableId: string | null;
  setActiveTableId: (tableId: string | null) => void;
}

export const useOrderStore = create<OrderState>((set) => ({
  activeTableId: null,
  setActiveTableId: (tableId) => set({ activeTableId: tableId }),
}));
