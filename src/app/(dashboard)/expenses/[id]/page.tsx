import { Header } from "@/components/layout/Header";
import { PageWrapper } from "@/components/layout/PageWrapper";
import { ExpenseDetail } from "./expense-detail";

export default async function ExpenseDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  return (
    <>
      <Header title="Expense Details" />
      <PageWrapper>
        <ExpenseDetail expenseId={id} />
      </PageWrapper>
    </>
  );
}
