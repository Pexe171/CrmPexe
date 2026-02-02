-- Add new enum value for marketplace interest notifications
ALTER TYPE "NotificationType" ADD VALUE IF NOT EXISTS 'MARKETPLACE_INTEREST';
