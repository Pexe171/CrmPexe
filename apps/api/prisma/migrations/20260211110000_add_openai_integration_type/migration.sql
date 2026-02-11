-- Add OpenAI as a supported integration account type
ALTER TYPE "IntegrationAccountType" ADD VALUE IF NOT EXISTS 'OPENAI';
