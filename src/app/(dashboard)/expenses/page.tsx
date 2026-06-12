import { auth } from "@/lib/auth";
import { Header } from "@/components/layout/Header";
import { PageWrapper } from "@/components/layout/PageWrapper";
import { ExpensesContent } from "./expenses-content";
import { canDo } from "@/lib/permissions";

export default async function ExpensesPage() {
  const session = await auth();
  const canApprove = session?.user?.permissionMatrix
    ? canDo(session.user.permissionMatrix, "expenses", "update")
    : false;

  return (
    <>
      <Header title="Expenses" />
      <PageWrapper>
        <ExpensesContent canApprove={canApprove} />
      </PageWrapper>
    </>
  );
}
