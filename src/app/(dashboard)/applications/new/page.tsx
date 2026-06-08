import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { Header } from "@/components/layout/Header";
import { PageWrapper } from "@/components/layout/PageWrapper";
import { ApplicationForm } from "@/components/forms/ApplicationForm";

export default async function NewApplicationPage() {
  const session = await auth();
  const allowed = ["SUPER_ADMIN", "CEO", "CMO"];
  if (!session || !allowed.includes(session.user.role)) redirect("/applications");
  return (
    <>
      <Header title="New Application" />
      <PageWrapper>
        <ApplicationForm />
      </PageWrapper>
    </>
  );
}
