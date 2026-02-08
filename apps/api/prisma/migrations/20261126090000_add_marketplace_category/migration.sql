CREATE TABLE IF NOT EXISTS "MarketplaceCategory" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "highlights" TEXT[] NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "MarketplaceCategory_pkey" PRIMARY KEY ("id")
);

CREATE INDEX IF NOT EXISTS "MarketplaceCategory_name_idx"
ON "MarketplaceCategory"("name");
