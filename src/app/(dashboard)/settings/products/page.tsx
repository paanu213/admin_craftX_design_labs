import { Header } from "@/components/layout/Header";
import { PageWrapper } from "@/components/layout/PageWrapper";
import { ProductsContent } from "./products-content";

export default function ProductsPage() {
  return (
    <>
      <Header title="Products" />
      <PageWrapper>
        <ProductsContent />
      </PageWrapper>
    </>
  );
}
