-- CreateEnum extension for integration account channels
ALTER TYPE "IntegrationAccountType" ADD VALUE IF NOT EXISTS 'INSTAGRAM_DIRECT';
ALTER TYPE "IntegrationAccountType" ADD VALUE IF NOT EXISTS 'FACEBOOK_MESSENGER';
ALTER TYPE "IntegrationAccountType" ADD VALUE IF NOT EXISTS 'EMAIL';
ALTER TYPE "IntegrationAccountType" ADD VALUE IF NOT EXISTS 'VOIP';
