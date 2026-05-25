import { Header } from "@/components/layout/Header";
import { PageWrapper } from "@/components/layout/PageWrapper";
import { ExpenseForm } from "@/components/forms/ExpenseForm";

export default function NewExpensePage() {
  return (
    <>
      <Header title="Add Expense" />
      <PageWrapper>
        <ExpenseForm />
      </PageWrapper>
    </>
  );
}
