"use client";

import { ChangeEvent, FormEvent, useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowLeft, Plus, Save, Trash2, Upload, X } from "lucide-react";
import type { PollInput, PollOptionInput, PollStatus, PublicPoll } from "@/types/poll.type";
import { AdminLoginPanel } from "../AdminLoginPanel";

type PollFormProps = {
  mode: "create" | "edit";
  pollId?: string;
};

type EditableOption = PollOptionInput & {
  imageUrl: string;
};

type FormState = {
  title: string;
  description: string;
  slug: string;
  allowMultiple: boolean;
  maxSelections: string;
  status: PollStatus;
  showResultAfterVote: boolean;
  options: EditableOption[];
};

function toSlug(value: string) {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)+/g, "");
}

function getInitialState(): FormState {
  return {
    title: "",
    description: "",
    slug: "",
    allowMultiple: false,
    maxSelections: "",
    status: "active",
    showResultAfterVote: true,
    options: [
      { label: "Option A", imageUrl: "", orderIndex: 0 },
      { label: "Option B", imageUrl: "", orderIndex: 1 },
    ],
  };
}

function mapPollToForm(poll: PublicPoll): FormState {
  return {
    title: poll.title,
    description: poll.description ?? "",
    slug: poll.slug,
    allowMultiple: poll.allowMultiple,
    maxSelections: poll.maxSelections ? String(poll.maxSelections) : "",
    status: poll.status,
    showResultAfterVote: poll.showResultAfterVote,
    options: poll.options.map((option) => ({
      id: option.id,
      label: option.label,
      imageUrl: option.imageUrl ?? "",
      orderIndex: option.orderIndex,
    })),
  };
}

export function PollForm({ mode, pollId }: PollFormProps) {
  const router = useRouter();
  const [form, setForm] = useState<FormState>(() => getInitialState());
  const [slugTouched, setSlugTouched] = useState(mode === "edit");
  const [needsAuth, setNeedsAuth] = useState(false);
  const [isLoading, setIsLoading] = useState(mode === "edit");
  const [isSaving, setIsSaving] = useState(false);
  const [uploadingIndex, setUploadingIndex] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const loadPoll = useCallback(async () => {
    if (mode !== "edit" || !pollId) {
      return;
    }

    setIsLoading(true);
    setError(null);

    const response = await fetch(`/api/admin/polls/${pollId}`, {
      cache: "no-store",
    });
    const data = await response.json().catch(() => null);

    setIsLoading(false);

    if (response.status === 401) {
      setNeedsAuth(true);
      return;
    }

    if (!response.ok) {
      setError(data?.message ?? "Không thể tải poll");
      return;
    }

    setNeedsAuth(false);
    setForm(mapPollToForm(data.poll));
  }, [mode, pollId]);

  useEffect(() => {
    void loadPoll();
  }, [loadPoll]);

  const payload = useMemo<PollInput>(
    () => ({
      title: form.title,
      description: form.description || null,
      slug: form.slug,
      allowMultiple: form.allowMultiple,
      maxSelections:
        form.allowMultiple && form.maxSelections ? Number(form.maxSelections) : null,
      status: form.status,
      showResultAfterVote: form.showResultAfterVote,
      options: form.options.map((option, index) => ({
        id: option.id,
        label: option.label,
        imageUrl: option.imageUrl || null,
        orderIndex: index,
      })),
    }),
    [form],
  );

  function updateField<K extends keyof FormState>(key: K, value: FormState[K]) {
    setForm((current) => ({
      ...current,
      [key]: value,
    }));
  }

  function updateTitle(value: string) {
    setForm((current) => ({
      ...current,
      title: value,
      slug: slugTouched ? current.slug : toSlug(value),
    }));
  }

  function updateOption(index: number, patch: Partial<EditableOption>) {
    setForm((current) => ({
      ...current,
      options: current.options.map((option, optionIndex) =>
        optionIndex === index ? { ...option, ...patch } : option,
      ),
    }));
  }

  function addOption() {
    setForm((current) => ({
      ...current,
      options: [
        ...current.options,
        {
          label: `Option ${current.options.length + 1}`,
          imageUrl: "",
          orderIndex: current.options.length,
        },
      ],
    }));
  }

  function removeOption(index: number) {
    setForm((current) => ({
      ...current,
      options: current.options.filter((_, optionIndex) => optionIndex !== index),
    }));
  }

  async function uploadImage(index: number, event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];

    if (!file) {
      return;
    }

    setUploadingIndex(index);
    setError(null);

    const formData = new FormData();
    formData.set("file", file);
    formData.set("pollId", pollId ?? "draft");

    const response = await fetch("/api/admin/upload", {
      method: "POST",
      body: formData,
    });
    const data = await response.json().catch(() => null);

    setUploadingIndex(null);
    event.target.value = "";

    if (response.status === 401) {
      setNeedsAuth(true);
      return;
    }

    if (!response.ok) {
      setError(data?.message ?? "Không thể upload hình");
      return;
    }

    updateOption(index, { imageUrl: data.publicUrl });
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setIsSaving(true);
    setError(null);
    setSuccess(null);

    const endpoint = mode === "create" ? "/api/admin/polls" : `/api/admin/polls/${pollId}`;
    const response = await fetch(endpoint, {
      method: mode === "create" ? "POST" : "PATCH",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(payload),
    });
    const data = await response.json().catch(() => null);

    setIsSaving(false);

    if (response.status === 401) {
      setNeedsAuth(true);
      return;
    }

    if (!response.ok) {
      setError(data?.message ?? "Không thể lưu poll");
      return;
    }

    setSuccess("Poll đã được lưu");

    if (mode === "create") {
      router.push(`/admin/polls/${data.poll.id}/edit`);
    } else {
      setForm(mapPollToForm(data.poll));
    }
  }

  if (needsAuth) {
    return <AdminLoginPanel onSuccess={mode === "edit" ? loadPoll : () => setNeedsAuth(false)} />;
  }

  return (
    <main className="pageShell">
      <section className="adminHeader">
        <div>
          <p className="eyebrow">Admin</p>
          <h1>{mode === "create" ? "Tạo poll" : "Sửa poll"}</h1>
        </div>
        <Link className="ghostButton" href="/admin">
          <ArrowLeft aria-hidden="true" size={18} />
          Danh sách
        </Link>
      </section>

      {isLoading ? <p className="muted">Đang tải poll</p> : null}
      {error ? <p className="alert error">{error}</p> : null}
      {success ? <p className="alert success">{success}</p> : null}

      {!isLoading ? (
        <form className="panel adminForm" onSubmit={handleSubmit}>
          <div className="formGrid">
            <label className="field">
              <span>Tiêu đề</span>
              <input
                name="title"
                value={form.title}
                onChange={(event) => updateTitle(event.target.value)}
              />
            </label>

            <label className="field">
              <span>Slug</span>
              <input
                name="slug"
                value={form.slug}
                onChange={(event) => {
                  setSlugTouched(true);
                  updateField("slug", toSlug(event.target.value));
                }}
              />
            </label>

            <label className="field fullSpan">
              <span>Mô tả</span>
              <textarea
                name="description"
                rows={3}
                value={form.description}
                onChange={(event) => updateField("description", event.target.value)}
              />
            </label>
          </div>

          <div className="settingsGrid">
            <label className="toggleLine">
              <input
                checked={form.allowMultiple}
                type="checkbox"
                onChange={(event) => updateField("allowMultiple", event.target.checked)}
              />
              <span>Cho chọn nhiều option</span>
            </label>

            <label className="toggleLine">
              <input
                checked={form.showResultAfterVote}
                type="checkbox"
                onChange={(event) =>
                  updateField("showResultAfterVote", event.target.checked)
                }
              />
              <span>Hiện link kết quả sau vote</span>
            </label>

            <label className="field compactField">
              <span>Trạng thái</span>
              <select
                value={form.status}
                onChange={(event) => updateField("status", event.target.value as PollStatus)}
              >
                <option value="active">active</option>
                <option value="closed">closed</option>
              </select>
            </label>

            <label className="field compactField">
              <span>Số chọn tối đa</span>
              <input
                disabled={!form.allowMultiple}
                min={1}
                name="maxSelections"
                type="number"
                value={form.maxSelections}
                onChange={(event) => updateField("maxSelections", event.target.value)}
              />
            </label>
          </div>

          <section className="optionEditor">
            <div className="subHeader">
              <h2>Options</h2>
              <button className="ghostButton" type="button" onClick={addOption}>
                <Plus aria-hidden="true" size={18} />
                Thêm option
              </button>
            </div>

            <div className="optionEditorList">
              {form.options.map((option, index) => (
                <article className="optionEditorItem" key={option.id ?? index}>
                  <div className="optionPreview">
                    {option.imageUrl ? (
                      <>
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img alt={option.label} src={option.imageUrl} />
                        <button
                          className="smallIconButton"
                          title="Xóa hình"
                          type="button"
                          onClick={() => updateOption(index, { imageUrl: "" })}
                        >
                          <X aria-hidden="true" size={16} />
                        </button>
                      </>
                    ) : (
                      <Upload aria-hidden="true" size={22} />
                    )}
                  </div>

                  <div className="optionEditorFields">
                    <label className="field">
                      <span>Tên option</span>
                      <input
                        value={option.label}
                        onChange={(event) => updateOption(index, { label: event.target.value })}
                      />
                    </label>

                    <label className="field">
                      <span>Image URL</span>
                      <input
                        value={option.imageUrl}
                        onChange={(event) =>
                          updateOption(index, { imageUrl: event.target.value })
                        }
                      />
                    </label>

                    <div className="rowActions">
                      <label className="fileButton">
                        <Upload aria-hidden="true" size={17} />
                        {uploadingIndex === index ? "Đang upload" : "Upload"}
                        <input
                          accept="image/jpeg,image/png,image/webp"
                          type="file"
                          onChange={(event) => void uploadImage(index, event)}
                        />
                      </label>

                      <button
                        className="iconButton danger"
                        title="Xóa option"
                        type="button"
                        onClick={() => removeOption(index)}
                      >
                        <Trash2 aria-hidden="true" size={18} />
                      </button>
                    </div>
                  </div>
                </article>
              ))}
            </div>
          </section>

          <div className="actionRow">
            <button className="primaryButton" disabled={isSaving} type="submit">
              <Save aria-hidden="true" size={18} />
              {isSaving ? "Đang lưu" : "Lưu poll"}
            </button>

            {mode === "edit" ? (
              <Link className="ghostButton" href={`/vote/${form.slug}`}>
                Mở trang vote
              </Link>
            ) : null}
          </div>
        </form>
      ) : null}
    </main>
  );
}
