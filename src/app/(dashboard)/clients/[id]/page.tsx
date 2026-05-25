import { Header } from "@/components/layout/Header";
import { PageWrapper } from "@/components/layout/PageWrapper";
import { ClientDetail } from "./client-detail";

export default function ClientDetailPage({
  params,
}: {
  params: { id: string };
}) {
  return (
    <>
      <Header title="Client Details" />
      <PageWrapper>
        <ClientDetail clientId={params.id} />
      </PageWrapper>
    </>
  );
}
