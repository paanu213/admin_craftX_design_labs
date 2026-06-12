import { Header } from "@/components/layout/Header";
import { PageWrapper } from "@/components/layout/PageWrapper";
import { MasterDataContent } from "./master-data-content";

export default function MasterDataPage() {
  return (
    <>
      <Header title="Master Data" />
      <PageWrapper>
        <MasterDataContent />
      </PageWrapper>
    </>
  );
}
