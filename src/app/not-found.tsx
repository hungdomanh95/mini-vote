import Link from "next/link";

export default function NotFoundPage() {
  return (
    <main className="pageShell compactPage">
      <section className="panel narrowPanel">
        <p className="eyebrow">404</p>
        <h1>Không tìm thấy trang</h1>
        <Link className="primaryButton" href="/admin">
          Về admin
        </Link>
      </section>
    </main>
  );
}
