import { Header } from "@/components/layout/Header";
import { PageWrapper } from "@/components/layout/PageWrapper";
import { UserGroupsContent } from "./user-groups-content";

export default function UserGroupsPage() {
  return (
    <>
      <Header title="User Groups" />
      <PageWrapper>
        <UserGroupsContent />
      </PageWrapper>
    </>
  );
}
