import { Header } from "@/components/layout/Header";
import { PageWrapper } from "@/components/layout/PageWrapper";
import { UsersContent } from "./users-content";

export default function UsersPage() {
  return (
    <>
      <Header title="User Management" />
      <PageWrapper>
        <UsersContent />
      </PageWrapper>
    </>
  );
}
