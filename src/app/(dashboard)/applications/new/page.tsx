import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { Header } from "@/components/layout/Header";
import { PageWrapper } from "@/components/layout/PageWrapper";
import { ApplicationForm } from "@/components/forms/ApplicationForm";
import { canDo } from "@/lib/permissions";

export default async function NewApplicationPage() {
  const session = await auth();
  if (!session || !session.user.permissionMatrix || !canDo(session.user.permissionMatrix, "applications", "create")) {
    redirect("/applications");
  }
  return (
    <>
      <Header title="New Application" />
      <PageWrapper>
        <ApplicationForm />
      </PageWrapper>
    </>
  );
}
