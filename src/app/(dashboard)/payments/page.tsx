import { Header } from "@/components/layout/Header";
import { PageWrapper } from "@/components/layout/PageWrapper";
import { PaymentsContent } from "./payments-content";

export default function PaymentsPage() {
  return (
    <>
      <Header title="Payments" />
      <PageWrapper>
        <PaymentsContent />
      </PageWrapper>
    </>
  );
}
