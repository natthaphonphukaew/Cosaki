import { create } from 'zustand';
import { persist } from 'zustand/middleware';

const useAuthStore = create(
  persist(
    (set, get) => ({
      user: null,
      accessToken: null,
      refreshToken: null,

      // Dual-mode: a single account can act as a renter (buyer) or, once they
      // open a shop, as a seller. `mode` is the currently-active view.
      // `shop` mirrors the user's own shop record from the backend.
      mode: 'renter',          // 'renter' | 'seller'
      shop: null,

      setAuth: (user, accessToken, refreshToken) =>
        set({
          user,
          accessToken,
          refreshToken,
          mode: user?.role === 'shop_admin' ? 'seller' : 'renter',
        }),

      updateUser: (patch) =>
        set((s) => ({ user: { ...s.user, ...patch } })),

      setAccessToken: (accessToken) => set({ accessToken }),

      // Called after a successful POST /shops. The backend promotes the user to
      // shop_admin and returns a fresh access token reflecting the new role.
      applyShopCreated: ({ shop, accessToken, role }) =>
        set((s) => ({
          shop,
          accessToken: accessToken || s.accessToken,
          user: { ...s.user, role: role || 'shop_admin' },
          mode: 'seller',
        })),

      // Refresh the cached shop record (e.g. after fetching /shops/me on login).
      setShop: (shop) => set({ shop }),

      setMode: (mode) => set({ mode }),
      toggleMode: () =>
        set((s) => ({ mode: s.mode === 'seller' ? 'renter' : 'seller' })),

      // A user "is a seller" if the backend gave them the shop_admin role.
      hasShop: () => get().user?.role === 'shop_admin' || !!get().shop,

      clear: () =>
        set({
          user: null,
          accessToken: null,
          refreshToken: null,
          mode: 'renter',
          shop: null,
        }),
    }),
    { name: 'cosaki-auth' }
  )
);

export default useAuthStore;
