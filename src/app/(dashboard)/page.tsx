import { auth } from "@/lib/auth";
import { Header } from "@/components/layout/Header";
import { PageWrapper } from "@/components/layout/PageWrapper";
import { DashboardContent } from "./dashboard-content";

export default async function DashboardPage() {
  const session = await auth();

  return (
    <>
      <Header title="Dashboard" />
      <PageWrapper>
        <DashboardContent userName={session?.user?.name ?? ""} />
      </PageWrapper>
    </>
  );
}
