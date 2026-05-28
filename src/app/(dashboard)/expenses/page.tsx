import { auth } from "@/lib/auth";
import { Header } from "@/components/layout/Header";
import { PageWrapper } from "@/components/layout/PageWrapper";
import { ExpensesContent } from "./expenses-content";

export default async function ExpensesPage() {
  const session = await auth();
  const userRole = session?.user?.role ?? "CMO";

  return (
    <>
      <Header title="Expenses" />
      <PageWrapper>
        <ExpensesContent userRole={userRole} />
      </PageWrapper>
    </>
  );
}
