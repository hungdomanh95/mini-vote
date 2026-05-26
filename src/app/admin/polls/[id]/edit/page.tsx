import { PollForm } from "@/components/admin/PollForm/PollForm";

type PageProps = {
  params: Promise<{ id: string }>;
};

export default async function EditPollPage({ params }: PageProps) {
  const { id } = await params;

  return <PollForm mode="edit" pollId={id} />;
}
