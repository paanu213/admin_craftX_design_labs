import { Header } from "@/components/layout/Header";
import { PageWrapper } from "@/components/layout/PageWrapper";
import { ReportsContent } from "./reports-content";

export default function ReportsPage() {
  return (
    <>
      <Header title="Reports" />
      <PageWrapper>
        <ReportsContent />
      </PageWrapper>
    </>
  );
}
