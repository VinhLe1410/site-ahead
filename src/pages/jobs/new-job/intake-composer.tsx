import {
  useEffect,
  useRef,
  useState,
  type ChangeEvent,
  type FormEvent,
} from "react";
import { useAction } from "convex/react";
import {
  ArrowUp,
  Check,
  FileAudio,
  Loader2,
  Mic,
  Paperclip,
  RotateCcw,
  Square,
  X,
} from "lucide-react";
import { api } from "../../../../convex/_generated/api";
import { getErrorMessage } from "../../../../shared/errors";
import { Button } from "@/components/ui/button";
import {
  InputGroup,
  InputGroupAddon,
  InputGroupTextarea,
} from "@/components/ui/input-group";

const maxAudioBytes = 600 * 1024;

const maxRecordingSeconds = 60;

export function IntakeComposer({
  disabled,
  onSend,
}: {
  disabled: boolean;
  onSend: (text: string) => Promise<void>;
}) {
  const transcribeAudio = useAction(api.intake.transcribeAudio);
  const [text, setText] = useState("");
  const [audio, setAudio] = useState<{ blob: Blob; name: string } | null>(null);

  const [phase, setPhase] = useState<
    "idle" | "starting" | "recording" | "transcribing" | "sending"
  >("idle");

  const [seconds, setSeconds] = useState(0);
  const [hasTranscript, setHasTranscript] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const recorderRef = useRef<MediaRecorder | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const mountedRef = useRef(true);

  useEffect(() => {
    mountedRef.current = true;

    return () => {
      mountedRef.current = false;

      if (timerRef.current !== null) clearInterval(timerRef.current);

      if (recorderRef.current !== null) {
        recorderRef.current.onstop = null;
        recorderRef.current.ondataavailable = null;

        if (recorderRef.current.state !== "inactive")
          recorderRef.current.stop();
      }

      streamRef.current?.getTracks().forEach((track) => track.stop());
    };
  }, []);

  async function transcribe(blob: Blob, name: string) {
    setError(null);

    if (blob.size === 0 || blob.size > maxAudioBytes) {
      setError("Choose a short audio clip under 600 KB.");
      setPhase("idle");

      return;
    }

    setAudio({ blob, name });
    setPhase("transcribing");

    try {
      const bytes = new Uint8Array(await blob.arrayBuffer());
      let binary = "";

      for (const byte of bytes) binary += String.fromCharCode(byte);

      const result = await transcribeAudio({
        audioBase64: btoa(binary),
        mimeType: blob.type,
      });

      if (!mountedRef.current) return;

      if (result.text.trim().length === 0)
        throw new Error(
          "No speech found in this clip. Record again or type your message.",
        );

      setText((current) =>
        current.trim().length === 0
          ? result.text
          : `${current}\n\n${result.text}`,
      );
      setHasTranscript(true);
      setAudio(null);
    } catch {
      if (mountedRef.current)
        setError("Could not transcribe this clip. Retry or type your message.");
    } finally {
      if (mountedRef.current) setPhase("idle");
    }
  }

  function stopRecording() {
    if (timerRef.current !== null) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }

    if (
      recorderRef.current !== null &&
      recorderRef.current.state !== "inactive"
    )
      recorderRef.current.stop();
  }

  async function startRecording() {
    setError(null);

    if (!navigator.mediaDevices?.getUserMedia || !("MediaRecorder" in window)) {
      setError(
        "Recording is unavailable in this browser. Attach an audio clip or type your message.",
      );

      return;
    }

    setPhase("starting");

    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });

      if (!mountedRef.current) {
        stream.getTracks().forEach((track) => track.stop());

        return;
      }

      streamRef.current = stream;

      const mimeType = ["audio/webm;codecs=opus", "audio/mp4"].find((type) =>
        MediaRecorder.isTypeSupported(type),
      );

      const recorder = new MediaRecorder(stream, {
        mimeType,
        audioBitsPerSecond: 48_000,
      });

      recorderRef.current = recorder;
      const chunks: Blob[] = [];
      let recordedBytes = 0;

      recorder.ondataavailable = (event) => {
        chunks.push(event.data);
        recordedBytes += event.data.size;

        if (recordedBytes > maxAudioBytes) stopRecording();
      };

      recorder.onstop = () => {
        stream.getTracks().forEach((track) => track.stop());
        streamRef.current = null;
        void transcribe(
          new Blob(chunks, { type: recorder.mimeType }),
          "Voice note",
        );
      };

      recorder.onerror = () => {
        recorder.onstop = null;
        stopRecording();
        stream.getTracks().forEach((track) => track.stop());
        streamRef.current = null;
        setPhase("idle");
        setError("Recording failed. Try again or type your message.");
      };

      recorder.start(1000);
      setPhase("recording");
      setSeconds(0);
      let elapsedSeconds = 0;
      timerRef.current = setInterval(() => {
        elapsedSeconds += 1;
        setSeconds(elapsedSeconds);

        if (elapsedSeconds >= maxRecordingSeconds) stopRecording();
      }, 1000);
    } catch {
      streamRef.current?.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
      setPhase("idle");
      setError(
        "Could not start recording. Check microphone access or attach an audio clip.",
      );
    }
  }

  function handleUpload(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    event.target.value = "";

    if (file === undefined) return;

    if (!file.type.startsWith("audio/")) {
      setError("Choose an audio file such as MP3, M4A, WAV or WebM.");

      return;
    }

    void transcribe(file, file.name);
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (disabled || phase !== "idle" || !text.trim()) return;

    setError(null);
    setPhase("sending");

    try {
      await onSend(text.trim());
      setText("");
      setHasTranscript(false);
      setAudio(null);
    } catch (cause) {
      setError(
        getErrorMessage(cause, "Could not send your message. Try again."),
      );
    } finally {
      setPhase("idle");
    }
  }

  const isBusy = disabled || phase !== "idle";

  return (
    <form className="p-4 pt-3" onSubmit={(event) => void handleSubmit(event)}>
      {hasTranscript && (
        <p
          role="status"
          className="mb-2 flex items-center gap-1.5 text-xs text-muted-foreground"
        >
          <Check className="size-3.5" /> Transcript ready. Edit it below, then
          send.
        </p>
      )}
      <InputGroup className="rounded-none bg-card">
        <label htmlFor="intake-message" className="sr-only">
          Message about the job
        </label>
        <InputGroupTextarea
          id="intake-message"
          className="min-h-20 max-h-64 resize-y rounded-none border-0 bg-transparent px-3.5 py-3 text-sm shadow-none focus-visible:ring-0"
          placeholder="Describe the job or add a correction…"
          value={text}
          onChange={(event) => setText(event.target.value)}
          disabled={isBusy}
          maxLength={12000}
        />
        {phase === "recording" && (
          <div
            role="status"
            className="flex items-center gap-2 px-3.5 pb-2 text-xs"
          >
            <span className="size-2 rounded-full bg-destructive" />
            <span>
              Recording {Math.floor(seconds / 60)}:
              {String(seconds % 60).padStart(2, "0")} / 1:00
            </span>
          </div>
        )}
        {phase === "transcribing" && (
          <p
            role="status"
            className="flex items-center gap-2 px-3.5 pb-2 text-xs text-muted-foreground"
          >
            <Loader2 className="size-3.5 animate-spin" /> Transcribing audio…
          </p>
        )}
        <InputGroupAddon
          align="block-end"
          className="justify-between gap-2 p-2 pt-0"
        >
          <div className="flex items-center gap-1">
            {phase === "recording" ? (
              <Button
                type="button"
                variant="destructive"
                size="sm"
                onClick={stopRecording}
              >
                <Square className="size-3 fill-current" /> Stop
              </Button>
            ) : (
              <Button
                type="button"
                variant="ghost"
                size="icon-sm"
                aria-label="Record a voice note, up to one minute"
                title="Record a voice note"
                disabled={isBusy}
                onClick={() => void startRecording()}
              >
                {phase === "starting" ? (
                  <Loader2 className="size-4 animate-spin" />
                ) : (
                  <Mic className="size-4" />
                )}
              </Button>
            )}
            <Button
              type="button"
              variant="ghost"
              size="icon-sm"
              aria-label="Attach audio, up to 600 KB"
              title="Attach audio, up to 600 KB"
              disabled={isBusy}
              onClick={() => fileRef.current?.click()}
            >
              <Paperclip className="size-4" />
            </Button>
            <input
              ref={fileRef}
              type="file"
              accept="audio/*"
              aria-label="Audio attachment"
              className="hidden"
              onChange={handleUpload}
              disabled={isBusy}
            />
          </div>
          <Button type="submit" size="sm" disabled={isBusy || !text.trim()}>
            {phase === "sending" ? (
              <Loader2 className="size-4 animate-spin" />
            ) : (
              <ArrowUp className="size-4" />
            )}{" "}
            Send
          </Button>
        </InputGroupAddon>
      </InputGroup>
      {audio !== null && phase === "idle" && (
        <div className="mt-2 flex items-center gap-2 border px-2 py-1.5 text-xs">
          <FileAudio className="size-3.5 shrink-0 text-muted-foreground" />
          <span className="min-w-0 flex-1 truncate">{audio.name}</span>
          <Button
            type="button"
            variant="ghost"
            size="icon-xs"
            aria-label="Retry transcription"
            disabled={disabled}
            onClick={() => void transcribe(audio.blob, audio.name)}
          >
            <RotateCcw className="size-3.5" />
          </Button>
          <Button
            type="button"
            variant="ghost"
            size="icon-xs"
            aria-label="Remove audio clip"
            disabled={disabled}
            onClick={() => {
              setAudio(null);
              setError(null);
            }}
          >
            <X className="size-3.5" />
          </Button>
        </div>
      )}
      {error !== null && (
        <p role="alert" className="mt-2 text-xs leading-5 text-destructive">
          {error}
        </p>
      )}
    </form>
  );
}
