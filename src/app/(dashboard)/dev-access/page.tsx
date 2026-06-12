import { auth } from "@/lib/auth";
import { Header } from "@/components/layout/Header";
import { PageWrapper } from "@/components/layout/PageWrapper";
import { DevAccessContent } from "./dev-access-content";
import { canDo } from "@/lib/permissions";

export default async function DevAccessPage() {
  const session = await auth();
  const canGenerate = session?.user?.permissionMatrix
    ? canDo(session.user.permissionMatrix, "devAccess", "create")
    : false;

  return (
    <>
      <Header title="Dev Access" />
      <PageWrapper>
        <DevAccessContent canGenerate={canGenerate} userId={session?.user?.id ?? ""} />
      </PageWrapper>
    </>
  );
}
