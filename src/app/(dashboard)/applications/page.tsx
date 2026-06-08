import { Header } from "@/components/layout/Header";
import { PageWrapper } from "@/components/layout/PageWrapper";
import { ApplicationsContent } from "./applications-content";

export default function ApplicationsPage() {
  return (
    <>
      <Header title="Applications" />
      <PageWrapper>
        <ApplicationsContent />
      </PageWrapper>
    </>
  );
}
