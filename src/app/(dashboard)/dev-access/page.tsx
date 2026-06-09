import { auth } from "@/lib/auth";
import { Header } from "@/components/layout/Header";
import { PageWrapper } from "@/components/layout/PageWrapper";
import { DevAccessContent } from "./dev-access-content";

export default async function DevAccessPage() {
  const session = await auth();
  const userRole = session?.user?.role ?? "CMO";

  return (
    <>
      <Header title="Dev Access" />
      <PageWrapper>
        <DevAccessContent userRole={userRole} userId={session?.user?.id ?? ""} />
      </PageWrapper>
    </>
  );
}
