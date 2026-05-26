import { notFound } from "next/navigation";
import { PollVoteForm } from "@/components/poll/PollVoteForm/PollVoteForm";
import { ApiError } from "@/lib/errors";
import { getPublicPoll } from "@/services/poll.service";

type PageProps = {
  params: Promise<{ slug: string }>;
};

export default async function VotePage({ params }: PageProps) {
  const { slug } = await params;

  try {
    const poll = await getPublicPoll(slug);

    if (!poll) {
      notFound();
    }

    return (
      <main className="pageShell publicPage">
        <header className="voteHeader">
          <div className="voteHeaderText">
            <h1>{poll.title}</h1>
            {poll.description ? <p>{poll.description}</p> : null}
          </div>
        </header>

        <PollVoteForm poll={poll} />
      </main>
    );
  } catch (error) {
    if (error instanceof ApiError) {
      return (
        <main className="pageShell compactPage">
          <section className="panel narrowPanel">
            <p className="eyebrow">Setup</p>
            <h1>Chưa cấu hình server</h1>
            <p className="muted">{error.message}</p>
          </section>
        </main>
      );
    }

    throw error;
  }
}
