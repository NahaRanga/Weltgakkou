// Bentuk state yang dikembalikan server action admin ke form di admin-controls.tsx.
export type FormState = { error?: string; ok?: string; whatsappText?: string; whatsapp?: string };

export type VerifyState = { done?: "accepted" | "rejected"; error?: string; whatsappText?: string; whatsapp?: string };

export type BatchState = { error?: string; ok?: string };
