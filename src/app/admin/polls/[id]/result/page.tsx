import { AdminPollResult } from "@/components/admin/AdminPollResult";

type PageProps = {
  params: Promise<{ id: string }>;
};

export default async function AdminResultPage({ params }: PageProps) {
  const { id } = await params;

  return <AdminPollResult pollId={id} />;
}
