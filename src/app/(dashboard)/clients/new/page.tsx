import { Header } from "@/components/layout/Header";
import { PageWrapper } from "@/components/layout/PageWrapper";
import { ClientForm } from "@/components/forms/ClientForm";

export default function NewClientPage() {
  return (
    <>
      <Header title="Add Client" />
      <PageWrapper>
        <ClientForm />
      </PageWrapper>
    </>
  );
}
