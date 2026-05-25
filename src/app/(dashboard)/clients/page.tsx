import { Header } from "@/components/layout/Header";
import { PageWrapper, PageHeader } from "@/components/layout/PageWrapper";
import { ClientsContent } from "./clients-content";

export default function ClientsPage() {
  return (
    <>
      <Header title="Clients" />
      <PageWrapper>
        <ClientsContent />
      </PageWrapper>
    </>
  );
}
