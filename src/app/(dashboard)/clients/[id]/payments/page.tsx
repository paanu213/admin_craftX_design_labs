import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { Header } from "@/components/layout/Header";
import { PageWrapper } from "@/components/layout/PageWrapper";
import { ClientPaymentsContent } from "./client-payments-content";
import { canDo } from "@/lib/permissions";

export default async function ClientPaymentsPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const session = await auth();
  if (!session) redirect("/login");

  const { id } = await params;
  const canApprove = session.user.permissionMatrix
    ? canDo(session.user.permissionMatrix, "payments", "update")
    : false;
  const canCancel = session.user.permissionMatrix
    ? canDo(session.user.permissionMatrix, "payments", "delete")
    : false;

  return (
    <>
      <Header title="Payment History" />
      <PageWrapper>
        <ClientPaymentsContent
          clientId={id}
          currentUserId={session.user.id}
          canApprove={canApprove}
          canCancel={canCancel}
        />
      </PageWrapper>
    </>
  );
}
