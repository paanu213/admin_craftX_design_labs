import { Header } from "@/components/layout/Header";
import { PageWrapper } from "@/components/layout/PageWrapper";
import { ExpenseDetail } from "./expense-detail";

export default function ExpenseDetailPage({
  params,
}: {
  params: { id: string };
}) {
  return (
    <>
      <Header title="Expense Details" />
      <PageWrapper>
        <ExpenseDetail expenseId={params.id} />
      </PageWrapper>
    </>
  );
}
