"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Download, Upload, Save, Pencil } from "lucide-react";

type CertType = { id: number | string; name: string };

type Props = {
  userId: number | string;
  initial: {
    fullName: string;
    preferredName?: string | null;
    pronouns?: string | null;
    phone?: string | null;
    bio?: string | null;
  };
  certTypes: CertType[];
};

const inputCls =
  "w-full bg-cmba-black-surface border border-white/12 px-3 py-2 text-sm text-cmba-grey-light placeholder:text-cmba-grey-dark focus:border-cmba-red focus:outline-none transition-colors";
const labelCls = "block font-mono text-[10px] text-cmba-grey-mid uppercase tracking-wider mb-1";

export function AccountActions({ userId, initial, certTypes }: Props) {
  const router = useRouter();
  const [editing, setEditing] = useState(false);
  const [savingProfile, setSavingProfile] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);

  const [fullName, setFullName] = useState(initial.fullName ?? "");
  const [preferredName, setPreferredName] = useState(initial.preferredName ?? "");
  const [pronouns, setPronouns] = useState(initial.pronouns ?? "");
  const [phone, setPhone] = useState(initial.phone ?? "");
  const [bio, setBio] = useState(initial.bio ?? "");

  // upload cert
  const [typeId, setTypeId] = useState("");
  const [issueDate, setIssueDate] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const [uploadMsg, setUploadMsg] = useState<string | null>(null);

  async function saveProfile(e: React.FormEvent) {
    e.preventDefault();
    setSavingProfile(true);
    setMsg(null);
    try {
      const res = await fetch(`/api/users/${userId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ fullName, preferredName, pronouns, phone, bio }),
      });
      if (!res.ok) {
        setMsg("Could not save. Please check your entries.");
        return;
      }
      setMsg("Profile saved.");
      setEditing(false);
      router.refresh();
    } finally {
      setSavingProfile(false);
    }
  }

  async function uploadCert(e: React.FormEvent) {
    e.preventDefault();
    if (!typeId) { setUploadMsg("Choose a certification type."); return; }
    setUploading(true);
    setUploadMsg(null);
    try {
      let certificateFileId: number | string | undefined;
      if (file) {
        const fd = new FormData();
        fd.append("file", file);
        const up = await fetch("/api/certificate-files", {
          method: "POST",
          credentials: "include",
          body: fd,
        });
        const upData = await up.json();
        if (!up.ok) { setUploadMsg("File upload failed."); return; }
        certificateFileId = upData?.doc?.id;
      }
      const res = await fetch("/api/certifications", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          type: typeId,
          issueDate: issueDate || undefined,
          certificateFile: certificateFileId,
        }),
      });
      if (!res.ok) { setUploadMsg("Could not save the certification."); return; }
      setUploadMsg("Certification submitted. It will show as pending until an admin verifies it.");
      setTypeId("");
      setIssueDate("");
      setFile(null);
      router.refresh();
    } finally {
      setUploading(false);
    }
  }

  return (
    <div className="space-y-6">
      {/* Edit profile */}
      <section className="bg-cmba-black-card border border-white/12 p-5">
        <div className="flex items-center justify-between mb-4">
          <h2 className="font-display font-bold text-white uppercase tracking-wide text-sm">Profile</h2>
          {!editing && (
            <button onClick={() => setEditing(true)}
              className="inline-flex items-center gap-1.5 font-mono text-[11px] text-cmba-grey hover:text-cmba-red uppercase tracking-wider transition-colors">
              <Pencil size={12} /> Edit
            </button>
          )}
        </div>
        {msg && <p className="text-xs text-cmba-grey-light mb-3">{msg}</p>}
        {editing ? (
          <form onSubmit={saveProfile} className="space-y-3">
            <div><label className={labelCls}>Full name</label><input className={inputCls} value={fullName} onChange={(e) => setFullName(e.target.value)} required /></div>
            <div className="grid grid-cols-2 gap-3">
              <div><label className={labelCls}>Preferred name</label><input className={inputCls} value={preferredName} onChange={(e) => setPreferredName(e.target.value)} /></div>
              <div><label className={labelCls}>Pronouns</label><input className={inputCls} value={pronouns} onChange={(e) => setPronouns(e.target.value)} /></div>
            </div>
            <div><label className={labelCls}>Phone</label><input className={inputCls} value={phone} onChange={(e) => setPhone(e.target.value)} /></div>
            <div><label className={labelCls}>Bio</label><textarea className={inputCls} rows={3} value={bio} onChange={(e) => setBio(e.target.value)} /></div>
            <div className="flex gap-2">
              <button type="submit" disabled={savingProfile}
                className="inline-flex items-center gap-1.5 bg-cmba-red hover:bg-cmba-hot disabled:opacity-50 text-white font-display font-bold text-xs uppercase tracking-wider px-4 py-2 transition-colors">
                <Save size={14} /> {savingProfile ? "Saving…" : "Save"}
              </button>
              <button type="button" onClick={() => setEditing(false)}
                className="font-mono text-[11px] text-cmba-grey hover:text-white uppercase tracking-wider px-3">Cancel</button>
            </div>
          </form>
        ) : (
          <dl className="text-sm text-cmba-grey-light space-y-1">
            <div><span className="text-cmba-grey-mid">Name: </span>{initial.fullName}</div>
            {initial.preferredName && <div><span className="text-cmba-grey-mid">Preferred: </span>{initial.preferredName}</div>}
            {initial.pronouns && <div><span className="text-cmba-grey-mid">Pronouns: </span>{initial.pronouns}</div>}
            {initial.phone && <div><span className="text-cmba-grey-mid">Phone: </span>{initial.phone}</div>}
            {initial.bio && <p className="text-cmba-grey mt-2">{initial.bio}</p>}
          </dl>
        )}
      </section>

      {/* Upload certification */}
      <section className="bg-cmba-black-card border border-white/12 p-5">
        <h2 className="font-display font-bold text-white uppercase tracking-wide text-sm mb-4 flex items-center gap-2">
          <Upload size={14} className="text-cmba-red" /> Upload a certification
        </h2>
        {uploadMsg && <p className="text-xs text-cmba-grey-light mb-3">{uploadMsg}</p>}
        <form onSubmit={uploadCert} className="space-y-3">
          <div>
            <label className={labelCls}>Certification type</label>
            <select className={inputCls} value={typeId} onChange={(e) => setTypeId(e.target.value)} required>
              <option value="">Select…</option>
              {certTypes.map((t) => <option key={t.id} value={t.id}>{t.name}</option>)}
            </select>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div><label className={labelCls}>Issue date</label><input type="date" className={inputCls} value={issueDate} onChange={(e) => setIssueDate(e.target.value)} /></div>
            <div><label className={labelCls}>Certificate file (PDF/image)</label><input type="file" accept="application/pdf,image/*" className="text-xs text-cmba-grey-light" onChange={(e) => setFile(e.target.files?.[0] ?? null)} /></div>
          </div>
          <button type="submit" disabled={uploading}
            className="inline-flex items-center gap-1.5 bg-cmba-red hover:bg-cmba-hot disabled:opacity-50 text-white font-display font-bold text-xs uppercase tracking-wider px-4 py-2 transition-colors">
            <Upload size={14} /> {uploading ? "Submitting…" : "Submit certification"}
          </button>
          <p className="text-[11px] text-cmba-grey-mid">Your file is private — only you and CMBA admins can ever download it.</p>
        </form>
      </section>

      {/* Data export */}
      <section className="bg-cmba-black-card border border-white/12 p-5">
        <h2 className="font-display font-bold text-white uppercase tracking-wide text-sm mb-2">Your data</h2>
        <p className="text-xs text-cmba-grey leading-relaxed mb-3">
          Download a copy of your CMBA Connect data (profile, certifications, and consent history) at any time.
        </p>
        {/* Download endpoint (route handler), not a page — a plain anchor is correct. */}
        <a href="/api/account/export" download
          className="inline-flex items-center gap-1.5 border border-cmba-red/40 hover:border-cmba-red text-cmba-red hover:text-white font-mono text-xs uppercase tracking-wider px-4 py-2 transition-colors">
          <Download size={14} /> Export my data (JSON)
        </a>
      </section>
    </div>
  );
}
