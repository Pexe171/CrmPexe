import { create } from "zustand";

type WhatsappSocketState = {
  /** accountId -> qr code data (base64 or string) */
  qrByAccount: Record<string, string>;
  /** accountId -> connected */
  connectedByAccount: Record<string, boolean>;
  setQr: (accountId: string, qrCodeData: string | null) => void;
  setConnected: (accountId: string) => void;
  clear: (accountId: string) => void;
};

export const useWhatsappSocketStore = create<WhatsappSocketState>((set) => ({
  qrByAccount: {},
  connectedByAccount: {},
  setQr: (accountId, qrCodeData) =>
    set((state) => ({
      qrByAccount: qrCodeData
        ? { ...state.qrByAccount, [accountId]: qrCodeData }
        : (() => {
            const next = { ...state.qrByAccount };
            delete next[accountId];
            return next;
          })()
    })),
  setConnected: (accountId) =>
    set((state) => ({
      connectedByAccount: { ...state.connectedByAccount, [accountId]: true }
    })),
  clear: (accountId) =>
    set((state) => {
      const qr = { ...state.qrByAccount };
      const conn = { ...state.connectedByAccount };
      delete qr[accountId];
      delete conn[accountId];
      return { qrByAccount: qr, connectedByAccount: conn };
    })
}));
