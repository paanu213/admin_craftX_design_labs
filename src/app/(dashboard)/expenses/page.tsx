import { Header } from "@/components/layout/Header";
import { PageWrapper } from "@/components/layout/PageWrapper";
import { ExpensesContent } from "./expenses-content";

export default function ExpensesPage() {
  return (
    <>
      <Header title="Expenses" />
      <PageWrapper>
        <ExpensesContent />
      </PageWrapper>
    </>
  );
}
