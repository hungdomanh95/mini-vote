import Link from "next/link";
import { notFound } from "next/navigation";
import { PollResultList } from "@/components/poll/PollResultList/PollResultList";
import { ApiError } from "@/lib/errors";
import { getPollResult } from "@/services/result.service";

type PageProps = {
  params: Promise<{ slug: string }>;
};

export default async function VoteResultPage({ params }: PageProps) {
  const { slug } = await params;

  try {
    const result = await getPollResult(slug);

    if (!result) {
      notFound();
    }

    return (
      <main className="pageShell publicPage">
        <header className="publicHeader">
          <p className="eyebrow">Kết quả</p>
          <h1>{result.title}</h1>
          {result.description ? <p>{result.description}</p> : null}
        </header>

        <section className="panel">
          <div className="resultSummary">
            <span>{result.totalVotes} người vote</span>
            <span>{result.totalSelections} lượt chọn</span>
          </div>
          <PollResultList result={result} />
          <div className="actionRow">
            <Link className="ghostButton" href={`/vote/${result.slug}`}>
              Quay lại vote
            </Link>
          </div>
        </section>
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
