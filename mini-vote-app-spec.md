# Mini Vote App - Đặc tả MVP cho Dev

## 1. Mục tiêu

Làm một web app cực nhỏ để tạo cuộc vote và ghi nhận:

- Tên người vote.
- Option người đó đã chọn.
- Tổng số lượt vote.
- Tỉ lệ vote theo từng option.
- Option có thể là chữ hoặc hình.
- Poll có thể cấu hình chọn 1 option hoặc nhiều option.
- Có trang admin đơn giản để tạo poll, sửa option và xem kết quả.

Ưu tiên: làm nhanh, dễ deploy, ít hạ tầng, ít config, đủ dùng cho MVP.

---

## 2. Stack tối giản đề xuất

Dùng một project duy nhất:

```txt
Next.js + TypeScript + Supabase + Vercel
```

### Vì sao chọn stack này?

- Không cần tách BE riêng.
- FE và BE nằm chung một repo.
- BE dùng Next.js Route Handlers trong thư mục `app/api`.
- Database dùng Supabase PostgreSQL.
- Ảnh option dùng Supabase Storage.
- Deploy FE + BE lên Vercel.
- Không cần Docker.
- Không cần VPS.
- Không cần Render/Railway/Fly.io cho backend riêng.

### Kiến trúc

```txt
Browser
  ↓
Next.js Pages / Components
  ↓
Next.js Route Handlers: /app/api/*
  ↓
Supabase PostgreSQL + Supabase Storage
```

---

## 3. Scope MVP

### Có làm

- Public page để user vote.
- Admin page cực đơn giản để tạo/sửa poll.
- Option dạng text.
- Option dạng image URL hoặc upload lên Supabase Storage.
- Poll chọn 1 hoặc chọn nhiều.
- Ghi nhận tên người vote.
- Trang kết quả có số vote và phần trăm.
- Chống vote trùng cơ bản bằng `localStorage` token + database check.
- Deploy lên Vercel.

### Chưa cần làm ở MVP

- Login user vote.
- Realtime result.
- Role permission phức tạp.
- Email invite.
- QR code.
- Multi-language.
- Audit log.
- Export Excel.
- Payment.
- Backend service riêng.

---

## 4. Routes

### Public routes

```txt
/vote/[slug]              Trang vote
/vote/[slug]/result       Trang kết quả
```

### Admin routes

```txt
/admin                    Danh sách poll
/admin/polls/new          Tạo poll
/admin/polls/[id]/edit    Sửa poll
/admin/polls/[id]/result  Xem kết quả
```

### API routes

```txt
GET    /api/polls/[slug]
POST   /api/polls/[slug]/vote
GET    /api/polls/[slug]/result

GET    /api/admin/polls
POST   /api/admin/polls
PATCH  /api/admin/polls/[id]
DELETE /api/admin/polls/[id]

POST   /api/admin/upload
```

---

## 5. Database schema

Dùng Supabase SQL Editor chạy script này.

```sql
create extension if not exists "pgcrypto";

create table polls (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  description text,
  slug text unique not null,
  allow_multiple boolean not null default false,
  max_selections int,
  status text not null default 'active',
  show_result_after_vote boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table poll_options (
  id uuid primary key default gen_random_uuid(),
  poll_id uuid not null references polls(id) on delete cascade,
  label text not null,
  image_url text,
  order_index int not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table votes (
  id uuid primary key default gen_random_uuid(),
  poll_id uuid not null references polls(id) on delete cascade,
  voter_name text not null,
  voter_token text,
  created_at timestamptz not null default now()
);

create table vote_selections (
  id uuid primary key default gen_random_uuid(),
  vote_id uuid not null references votes(id) on delete cascade,
  option_id uuid not null references poll_options(id) on delete restrict,
  unique(vote_id, option_id)
);

create index idx_polls_slug on polls(slug);
create index idx_poll_options_poll_id on poll_options(poll_id);
create index idx_votes_poll_id on votes(poll_id);
create index idx_votes_poll_token on votes(poll_id, voter_token);
create index idx_vote_selections_option_id on vote_selections(option_id);
```

### Chặn vote trùng cơ bản

```sql
create unique index unique_vote_token_per_poll
on votes(poll_id, voter_token)
where voter_token is not null;
```

---

## 6. Data model TypeScript

```ts
export type Poll = {
  id: string;
  title: string;
  description?: string | null;
  slug: string;
  allowMultiple: boolean;
  maxSelections?: number | null;
  status: "active" | "closed";
  showResultAfterVote: boolean;
  createdAt: string;
  updatedAt: string;
};

export type PollOption = {
  id: string;
  pollId: string;
  label: string;
  imageUrl?: string | null;
  orderIndex: number;
};

export type Vote = {
  id: string;
  pollId: string;
  voterName: string;
  voterToken?: string | null;
  createdAt: string;
};
```

---

## 7. API chi tiết

## 7.1. Lấy poll public

```txt
GET /api/polls/[slug]
```

Response:

```json
{
  "id": "uuid",
  "title": "Bạn thích thiết kế nào?",
  "description": "Chọn option bạn thích nhất",
  "slug": "vote-design",
  "allowMultiple": false,
  "maxSelections": 1,
  "status": "active",
  "showResultAfterVote": true,
  "options": [
    {
      "id": "uuid",
      "label": "Option A",
      "imageUrl": "https://..."
    }
  ]
}
```

---

## 7.2. Submit vote

```txt
POST /api/polls/[slug]/vote
```

Request:

```json
{
  "voterName": "Nguyễn Văn A",
  "optionIds": ["uuid"],
  "voterToken": "client-generated-token"
}
```

Validation bắt buộc:

- Poll phải tồn tại.
- Poll phải có `status = active`.
- `voterName` không được rỗng.
- `optionIds` phải có ít nhất 1 item.
- Mỗi `optionId` phải thuộc poll hiện tại.
- Nếu `allow_multiple = false` thì chỉ cho chọn đúng 1 option.
- Nếu `allow_multiple = true` và có `max_selections` thì không được chọn quá số lượng cho phép.
- Nếu `voterToken` đã vote trong poll này thì trả lỗi duplicate.

Response thành công:

```json
{
  "success": true,
  "voteId": "uuid"
}
```

Response lỗi:

```json
{
  "success": false,
  "code": "ALREADY_VOTED",
  "message": "Bạn đã vote rồi"
}
```

---

## 7.3. Lấy kết quả vote

```txt
GET /api/polls/[slug]/result
```

Response:

```json
{
  "pollId": "uuid",
  "totalVotes": 10,
  "totalSelections": 12,
  "options": [
    {
      "id": "uuid",
      "label": "Option A",
      "imageUrl": "https://...",
      "voteCount": 7,
      "percentage": 58.33
    }
  ]
}
```

Cách tính:

```ts
const baseTotal = poll.allowMultiple ? totalSelections : totalVotes;

const percentage =
  baseTotal === 0 ? 0 : Number(((voteCount / baseTotal) * 100).toFixed(2));
```

---

## 8. Logic submit vote

Pseudo code:

```ts
async function submitVote(slug: string, body: SubmitVoteBody) {
  const poll = await getPollBySlug(slug);

  if (!poll) throw new Error("POLL_NOT_FOUND");
  if (poll.status !== "active") throw new Error("POLL_CLOSED");

  const voterName = body.voterName.trim();
  const optionIds = Array.from(new Set(body.optionIds));

  if (!voterName) throw new Error("VOTER_NAME_REQUIRED");
  if (optionIds.length === 0) throw new Error("OPTION_REQUIRED");

  if (!poll.allowMultiple && optionIds.length !== 1) {
    throw new Error("ONLY_ONE_OPTION_ALLOWED");
  }

  if (
    poll.allowMultiple &&
    poll.maxSelections &&
    optionIds.length > poll.maxSelections
  ) {
    throw new Error("MAX_SELECTION_EXCEEDED");
  }

  const validOptions = await getOptionsByPollId(poll.id);

  const validOptionIds = new Set(validOptions.map((option) => option.id));

  const hasInvalidOption = optionIds.some((optionId) => {
    return !validOptionIds.has(optionId);
  });

  if (hasInvalidOption) throw new Error("INVALID_OPTION");

  if (body.voterToken) {
    const existingVote = await getVoteByToken(poll.id, body.voterToken);

    if (existingVote) {
      throw new Error("ALREADY_VOTED");
    }
  }

  const vote = await createVote({
    pollId: poll.id,
    voterName,
    voterToken: body.voterToken,
  });

  await createVoteSelections({
    voteId: vote.id,
    optionIds,
  });

  return vote;
}
```

---

## 9. Chống vote trùng đơn giản

FE tạo token một lần cho mỗi poll:

```ts
function getVoterToken(slug: string) {
  const key = `vote_token_${slug}`;
  const existingToken = localStorage.getItem(key);

  if (existingToken) return existingToken;

  const newToken = crypto.randomUUID();
  localStorage.setItem(key, newToken);

  return newToken;
}
```

Khi submit:

```ts
const voterToken = getVoterToken(slug);

await fetch(`/api/polls/${slug}/vote`, {
  method: "POST",
  headers: {
    "Content-Type": "application/json",
  },
  body: JSON.stringify({
    voterName,
    optionIds,
    voterToken,
  }),
});
```

Lưu ý:

- Cách này đủ cho MVP nhỏ.
- User xóa browser data hoặc đổi thiết bị vẫn vote lại được.
- Nếu muốn chặt hơn sau này mới thêm login hoặc mã vote riêng.

---

## 10. UI đề xuất

### Vote page

Layout đơn giản:

```txt
Container max-width 720px
  Header
    Poll title
    Description

  Card
    Input: Tên người vote

    Option list
      OptionCard
      OptionCard
      OptionCard

    Submit button

  Link xem kết quả nếu được bật
```

### Option card

State:

- Normal: border xám nhạt.
- Hover: border đậm hơn.
- Selected: border xanh, background xanh rất nhạt.
- Có image thì image nằm trên, text nằm dưới.
- Không có image thì card chỉ có text.

### Result page

```txt
Container max-width 720px
  Poll title
  Tổng số người vote

  Result item
    Label
    Vote count + percentage
    Progress bar
```

---

## 11. Cấu trúc thư mục đề xuất

```txt
src/
  app/
    vote/
      [slug]/
        page.tsx
        result/
          page.tsx

    admin/
      page.tsx
      polls/
        new/
          page.tsx
        [id]/
          edit/
            page.tsx
          result/
            page.tsx

    api/
      polls/
        [slug]/
          route.ts
          vote/
            route.ts
          result/
            route.ts

      admin/
        polls/
          route.ts
          [id]/
            route.ts
        upload/
          route.ts

  components/
    poll/
      PollVoteForm/
        PollVoteForm.tsx
        poll-vote-form.styled.ts

      PollOptionCard/
        PollOptionCard.tsx
        poll-option-card.styled.ts

      PollResultList/
        PollResultList.tsx
        poll-result-list.styled.ts

    admin/
      PollForm/
        PollForm.tsx
        poll-form.styled.ts

  lib/
    supabase/
      client.ts
      server.ts

    validators/
      poll.validator.ts
      vote.validator.ts

  services/
    poll.service.ts
    vote.service.ts
    result.service.ts

  types/
    poll.type.ts
    vote.type.ts
```

---

## 12. Admin bảo mật tối giản

Vì project cực nhỏ, không cần auth phức tạp ở MVP.

Có 2 lựa chọn:

### Cách 1: Admin password bằng env

Dùng một password admin lưu trong env:

```env
ADMIN_PASSWORD=your-strong-password
```

Admin nhập password, FE lưu session token đơn giản trong cookie.

Phù hợp demo/MVP cá nhân.

### Cách 2: Dùng Supabase Auth

Nếu muốn sạch hơn:

- Tạo account admin trong Supabase Auth.
- Chỉ email admin được vào `/admin`.
- Middleware kiểm tra session.

Khuyến nghị: nếu làm nhanh thì dùng cách 1, nếu public lâu dài thì dùng cách 2.

---

## 13. Environment variables

```env
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=

SUPABASE_SERVICE_ROLE_KEY=
ADMIN_PASSWORD=

NEXT_PUBLIC_APP_URL=
```

Lưu ý:

- `NEXT_PUBLIC_*` có thể dùng ở browser.
- `SUPABASE_SERVICE_ROLE_KEY` chỉ dùng server-side.
- Không import service role key trong component client.

---

## 14. Supabase setup

### Database

1. Tạo Supabase project.
2. Vào SQL Editor.
3. Chạy schema SQL ở phần Database schema.
4. Tạo bucket storage tên `poll-options`.

### Storage bucket

Bucket:

```txt
poll-options
```

Upload path đề xuất:

```txt
poll-options/{pollId}/{fileName}
```

File types cho phép:

```txt
image/jpeg
image/png
image/webp
```

Giới hạn size đề xuất:

```txt
2MB/file
```

---

## 15. Deploy lên Vercel

### Bước 1: Push code lên GitHub

```bash
git init
git add .
git commit -m "init mini vote app"
git branch -M main
git remote add origin <github-repo-url>
git push -u origin main
```

### Bước 2: Import project vào Vercel

- Vào Vercel.
- Add New Project.
- Import repo GitHub.
- Framework chọn Next.js.
- Add environment variables.
- Deploy.

### Bước 3: Add env trên Vercel

```env
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=
ADMIN_PASSWORD=
NEXT_PUBLIC_APP_URL=https://your-app.vercel.app
```

### Bước 4: Test production

Checklist:

- Mở `/admin`.
- Tạo poll.
- Copy link `/vote/[slug]`.
- Submit vote.
- Refresh result.
- Thử vote lại cùng browser để kiểm tra duplicate.
- Thử poll chọn nhiều option.
- Thử option có image.

---

## 16. Package đề xuất

```bash
npm install @supabase/supabase-js zod clsx
```

Optional UI:

```bash
npm install lucide-react
```

Không cần cài quá nhiều package cho MVP.

---

## 17. Scripts

```json
{
  "scripts": {
    "dev": "next dev",
    "build": "next build",
    "start": "next start",
    "lint": "next lint"
  }
}
```

---

## 18. Checklist dev

### BE/API

- [ ] Tạo Supabase client server-side.
- [ ] Tạo API lấy poll theo slug.
- [ ] Tạo API submit vote.
- [ ] Validate input bằng Zod.
- [ ] Kiểm tra option thuộc poll.
- [ ] Kiểm tra chọn 1 / chọn nhiều.
- [ ] Chặn duplicate bằng `voterToken`.
- [ ] Tạo API result.
- [ ] Tạo API admin CRUD poll.
- [ ] Tạo API upload image.

### FE

- [ ] Tạo vote page.
- [ ] Tạo option card.
- [ ] Tạo selected state.
- [ ] Tạo input tên người vote.
- [ ] Tạo submit loading/error/success.
- [ ] Tạo result page.
- [ ] Tạo admin poll list.
- [ ] Tạo admin poll form.
- [ ] Tạo upload image cho option.

### Deploy

- [ ] Tạo Supabase project.
- [ ] Chạy SQL schema.
- [ ] Tạo Storage bucket.
- [ ] Push GitHub.
- [ ] Import Vercel.
- [ ] Add env.
- [ ] Test production.

---

## 19. Acceptance criteria

Project đạt MVP khi:

- Tạo được poll từ admin.
- Poll có nhiều option.
- Option có thể có text hoặc image.
- Poll cấu hình được chọn 1 hoặc chọn nhiều.
- User nhập tên và vote được.
- Database lưu đúng tên người vote.
- Database lưu đúng option đã chọn.
- Kết quả hiển thị đúng số vote.
- Tỉ lệ phần trăm hiển thị đúng.
- User cùng browser không vote lại được nếu đã vote.
- Deploy thành công trên Vercel.
- Không expose `SUPABASE_SERVICE_ROLE_KEY` ra browser.

---

## 20. Ghi chú kỹ thuật

Dự án này nên giữ thật nhỏ.

Không nên tách backend riêng ở giai đoạn đầu. Nếu tách BE riêng sẽ phát sinh thêm:

- Deploy BE.
- CORS.
- Env riêng.
- Logging riêng.
- Cold start riêng.
- Domain riêng.
- Debug phức tạp hơn.

Với requirement hiện tại, Next.js Route Handlers là đủ để đóng vai trò backend.

---

## 21. Tài liệu tham khảo

- Next.js Route Handlers: https://nextjs.org/docs/app/getting-started/route-handlers
- Vercel Hobby Plan: https://vercel.com/docs/plans/hobby
- Vercel Deployments: https://vercel.com/docs/deployments
- Supabase Pricing: https://supabase.com/pricing
- Supabase Storage: https://supabase.com/docs/guides/storage
