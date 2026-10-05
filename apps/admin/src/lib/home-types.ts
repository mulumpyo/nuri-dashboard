export type Holiday = { date: string; name: string; source: string };
export type Device = { id: string; name: string; revokedAt?: string | null };
export type HomeMe = {
  kind: string;
  id?: string;
  email?: string;
  role?: string;
  totpRequired?: boolean;
  canManageTotp?: boolean;
  canManageUsers?: boolean;
};
export type HomePrompt = {
  title: string;
  message: string;
  confirmLabel?: string;
  danger?: boolean;
  done?: string;
  run: () => Promise<void>;
};
