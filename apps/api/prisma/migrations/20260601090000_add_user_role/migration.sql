-- Create enum for global marketplace roles
CREATE TYPE "UserRole" AS ENUM ('ADMIN', 'USER');

-- Add role column to users with USER as the default role
ALTER TABLE "User"
ADD COLUMN "role" "UserRole" NOT NULL DEFAULT 'USER';
