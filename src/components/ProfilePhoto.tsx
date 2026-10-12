import { useEffect, useRef, useState } from "react";
import { Dialog } from "radix-ui";
import { Camera, Upload, Trash2, X } from "lucide-react";
import AccountAvatar from "./AccountAvatar";
import { Button } from "./ui/button";
import "../styles/profile-photo.css";

export default function ProfilePhoto({
  url,
  initials,
  onUpload,
  onRemove,
}: {
  url?: string | null;
  initials: string;
  onUpload?: (photo: Blob) => Promise<boolean>;
  onRemove?: () => Promise<boolean>;
}) {
  const [open, setOpen] = useState(false);
  const [photo, setPhoto] = useState<Blob | null>(null);
  const [preview, setPreview] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const input = useRef<HTMLInputElement>(null);
  useEffect(() => {
    if (!photo) {
      setPreview("");
      return;
    }
    const next = URL.createObjectURL(photo);
    setPreview(next);
    return () => URL.revokeObjectURL(next);
  }, [photo]);
  const changeOpen = (next: boolean) => {
    if (busy) return;
    setOpen(next);
    if (!next) {
      setPhoto(null);
      setError("");
    }
  };
  const choose = async (file?: File) => {
    if (!file || busy) return;
    setError("");
    if (!["image/jpeg", "image/png", "image/webp"].includes(file.type)) {
      setError("Choose a JPG, PNG or WebP photo.");
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      setError("Choose a photo smaller than 5 MB.");
      return;
    }
    setBusy(true);
    const original = URL.createObjectURL(file);
    try {
      const image = new Image();
      image.src = original;
      await image.decode();
      const side = Math.min(image.naturalWidth, image.naturalHeight);
      if (!side) throw new Error("Empty image");
      const canvas = document.createElement("canvas");
      canvas.width = canvas.height = Math.min(512, side);
      const context = canvas.getContext("2d");
      if (!context) throw new Error("Cannot prepare image");
      context.fillStyle = "white";
      context.fillRect(0, 0, canvas.width, canvas.height);
      context.drawImage(
        image,
        (image.naturalWidth - side) / 2,
        (image.naturalHeight - side) / 2,
        side,
        side,
        0,
        0,
        canvas.width,
        canvas.height,
      );
      const resized = await new Promise<Blob>((resolve, reject) =>
        canvas.toBlob(
          (blob) =>
            blob ? resolve(blob) : reject(new Error("Cannot prepare photo")),
          "image/jpeg",
          0.85,
        ),
      );
      if (resized.size > 1024 * 1024) throw new Error("Photo is too large");
      setPhoto(resized);
    } catch {
      setError("Couldn’t read this photo. Try another image.");
    } finally {
      URL.revokeObjectURL(original);
      setBusy(false);
    }
  };
  const save = async (remove = false) => {
    if (busy) return;
    setBusy(true);
    setError("");
    try {
      const saved = remove
        ? await onRemove?.()
        : photo && (await onUpload?.(photo));
      if (!saved) throw new Error("Save failed");
      setOpen(false);
      setPhoto(null);
    } catch {
      setError(
        remove
          ? "Couldn’t remove your photo. Please try again."
          : "Couldn’t upload your photo. Please try again.",
      );
    } finally {
      setBusy(false);
    }
  };
  return (
    <div className="profile-photo">
      <AccountAvatar url={url} initials={initials} className="profile-avatar" />
      {onUpload && (
        <Dialog.Root open={open} onOpenChange={changeOpen}>
          <Dialog.Trigger asChild>
            <button
              type="button"
              className="profile-photo-trigger"
              aria-label="Change profile picture"
              title="Change profile picture"
            >
              <Camera size={14} aria-hidden="true" />
            </button>
          </Dialog.Trigger>
          <Dialog.Portal>
            <Dialog.Overlay className="link-account-overlay" />
            <Dialog.Content
              className="profile-photo-dialog"
              onEscapeKeyDown={(event) => {
                if (busy) event.preventDefault();
              }}
              onPointerDownOutside={(event) => {
                if (busy) event.preventDefault();
              }}
            >
              <Dialog.Title>Profile picture</Dialog.Title>
              <Dialog.Description>
                Choose a JPG, PNG or WebP photo up to 5 MB. Your photo will be
                cropped to a square.
              </Dialog.Description>
              <Dialog.Close
                className="profile-photo-close"
                aria-label="Close profile picture"
                disabled={busy}
              >
                <X size={18} />
              </Dialog.Close>
              <AccountAvatar
                url={preview || url}
                initials={initials}
                className="profile-photo-preview"
              />
              <input
                ref={input}
                type="file"
                accept="image/jpeg,image/png,image/webp"
                aria-label="Choose profile picture"
                className="profile-photo-input"
                disabled={busy}
                onChange={(event) => {
                  void choose(event.target.files?.[0]);
                  event.target.value = "";
                }}
              />
              <Button
                type="button"
                variant="outline"
                disabled={busy}
                onClick={() => input.current?.click()}
              >
                <Upload size={16} />
                {photo ? "Choose another photo" : "Choose photo"}
              </Button>
              {error && (
                <p role="alert" className="profile-photo-error">
                  {error}
                </p>
              )}
              <div className="profile-photo-actions">
                {url && onRemove && (
                  <Button
                    type="button"
                    variant="ghost"
                    disabled={busy}
                    onClick={() => void save(true)}
                  >
                    <Trash2 size={15} />
                    Remove photo
                  </Button>
                )}
                <Button
                  type="button"
                  disabled={busy || !photo}
                  onClick={() => void save()}
                >
                  {busy ? "Working…" : "Save photo"}
                </Button>
              </div>
            </Dialog.Content>
          </Dialog.Portal>
        </Dialog.Root>
      )}
    </div>
  );
}
