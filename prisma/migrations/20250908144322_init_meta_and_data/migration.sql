-- CreateTable
CREATE TABLE "public"."DataBlob" (
    "id" TEXT NOT NULL,
    "data" BYTEA NOT NULL,

    CONSTRAINT "DataBlob_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."MetaBlob" (
    "id" TEXT NOT NULL,
    "backend" TEXT NOT NULL,
    "size" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "MetaBlob_pkey" PRIMARY KEY ("id")
);
