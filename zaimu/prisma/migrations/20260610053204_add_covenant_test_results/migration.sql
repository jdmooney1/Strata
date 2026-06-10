-- CreateTable
CREATE TABLE "covenant_test_results" (
    "id" TEXT NOT NULL,
    "covenant_id" TEXT NOT NULL,
    "tested_at" TIMESTAMP(3) NOT NULL,
    "value" TEXT NOT NULL,
    "status" "CovenantStatus" NOT NULL,
    "notes" TEXT,

    CONSTRAINT "covenant_test_results_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "covenant_test_results" ADD CONSTRAINT "covenant_test_results_covenant_id_fkey" FOREIGN KEY ("covenant_id") REFERENCES "loan_covenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;
