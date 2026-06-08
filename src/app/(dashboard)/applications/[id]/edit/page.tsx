import { auth } from "@/lib/auth";
import { redirect, notFound } from "next/navigation";
import { Header } from "@/components/layout/Header";
import { PageWrapper } from "@/components/layout/PageWrapper";
import { ApplicationForm } from "@/components/forms/ApplicationForm";
import { db } from "@/lib/db";
import type { Application } from "@/types";

export default async function EditApplicationPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const session = await auth();
  const allowed = ["SUPER_ADMIN", "CEO", "CMO"];
  if (!session || !allowed.includes(session.user.role)) redirect("/applications");

  const { id } = await params;
  const raw = await db.application.findUnique({
    where: { id },
    include: { createdBy: { select: { id: true, name: true, role: true } } },
  });

  if (!raw) notFound();

  const app: Application = {
    ...raw,
    monthlyPrice: raw.monthlyPrice ? Number(raw.monthlyPrice) : null,
    yearlyPrice: raw.yearlyPrice ? Number(raw.yearlyPrice) : null,
    createdAt: raw.createdAt.toISOString(),
    updatedAt: raw.updatedAt.toISOString(),
  };

  return (
    <>
      <Header title="Edit Application" />
      <PageWrapper>
        <ApplicationForm application={app} />
      </PageWrapper>
    </>
  );
}
