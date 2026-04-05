import { create } from "zustand";

/* =======================
   TYPES
======================= */

export type User = {
  id: string;
  name: string;
  city?: string;
  phone?: string;
  role?: "USER" | "ADMIN";
  avatarUrl?: string | null;
};

export type Item = {
  id: string;
  title: string;
  price: number;
  city: string;
  category: string;
  condition: "new" | "used";
  description: string;
  photos: string[];
  createdAt: string;

  sellerId?: string;
  sellerName?: string;
  phone?: string;
};

type Store = {
  /* user */
  user: User | null;
  setUser: (u: User | null) => void;
  logout: () => void;
  updateProfile: (patch: Partial<User>) => void;

  /* items */
  items: Item[];
  addItem: (item: Omit<Item, "id" | "createdAt">) => void;
  removeItem: (id: string) => void;

  /* favorites */
  favIds: string[];
  isFav: (id: string) => boolean;
  toggleFav: (id: string) => void;
};

/* =======================
   STORE
======================= */

export const useStore = create<Store>((set, get) => ({
  /* user */
  user: null,

  setUser: (u) => set({ user: u }),

  logout: () => {
    fetch("/api/auth/logout", { method: "POST" }).catch(() => {});
    set({ user: null });
  },

  updateProfile: (patch) =>
    set((s) => ({
      user: s.user ? { ...s.user, ...patch } : s.user,
    })),

  /* items */
  items: [],

  addItem: (item) =>
    set((s) => ({
      items: [
        {
          ...item,
          id: crypto.randomUUID(),
          createdAt: new Date().toISOString(),
        },
        ...s.items,
      ],
    })),

  removeItem: (id) =>
    set((s) => ({
      items: s.items.filter((i) => i.id !== id),
      favIds: s.favIds.filter((x) => x !== id),
    })),

  /* favorites */
  favIds: [],

  isFav: (id) => get().favIds.includes(id),

  toggleFav: (id) =>
    set((s) => ({
      favIds: s.favIds.includes(id)
        ? s.favIds.filter((x) => x !== id)
        : [id, ...s.favIds],
    })),
}));
