import { useEffect, useRef, useState, type ChangeEvent } from "react";
import { useAction } from "convex/react";
import {
  FileAudio,
  Loader2,
  Mic,
  RotateCcw,
  Sparkles,
  Square,
  Upload,
} from "lucide-react";
import { api } from "../../../../convex/_generated/api";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";

export interface ExtractionResult {
  jobType: "excavation_and_trenching" | "electrical_work" | "other";
  location: string;
  description: string;
}

export interface VoiceRecorderProps {
  onTranscriptionComplete: (result: {
    transcript: string;
    extraction: ExtractionResult;
  }) => void;
  disabled?: boolean;
}

export function VoiceRecorder({
  onTranscriptionComplete,
  disabled = false,
}: VoiceRecorderProps) {
  const extractFromAudio = useAction(api.intake.extractFromAudio);

  const [mode, setMode] = useState<"record" | "upload">("record");
  const [isRecording, setIsRecording] = useState(false);
  const [recordingSeconds, setRecordingSeconds] = useState(0);
  const [audioBlob, setAudioBlob] = useState<Blob | null>(null);
  const [audioUrl, setAudioUrl] = useState<string | null>(null);
  const [fileName, setFileName] = useState<string | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const timerRef = useRef<number | null>(null);

  useEffect(() => {
    return () => {
      if (timerRef.current !== null) {
        clearInterval(timerRef.current);
      }

      if (streamRef.current !== null) {
        for (const track of streamRef.current.getTracks()) {
          track.stop();
        }
      }

      if (audioUrl !== null) {
        URL.revokeObjectURL(audioUrl);
      }
    };
  }, [audioUrl]);

  async function startRecording() {
    setError(null);

    try {
      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        throw new Error(
          "Microphone recording is not supported in this browser.",
        );
      }

      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      streamRef.current = stream;

      const mimeType = MediaRecorder.isTypeSupported("audio/webm;codecs=opus")
        ? "audio/webm;codecs=opus"
        : MediaRecorder.isTypeSupported("audio/mp4")
          ? "audio/mp4"
          : "";

      const options = mimeType ? { mimeType } : undefined;
      const mediaRecorder = new MediaRecorder(stream, options);
      mediaRecorderRef.current = mediaRecorder;

      const chunks: BlobPart[] = [];

      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          chunks.push(event.data);
        }
      };

      mediaRecorder.onstop = () => {
        const resolvedType = mediaRecorder.mimeType || "audio/webm";
        const blob = new Blob(chunks, { type: resolvedType });
        const url = URL.createObjectURL(blob);

        setAudioBlob(blob);
        setAudioUrl(url);
        setFileName("Voice recording");

        for (const track of stream.getTracks()) {
          track.stop();
        }

        streamRef.current = null;
      };

      mediaRecorder.start(250);
      setIsRecording(true);
      setRecordingSeconds(0);

      timerRef.current = window.setInterval(() => {
        setRecordingSeconds((prev) => prev + 1);
      }, 1000);
    } catch (caught) {
      setError(
        caught instanceof Error
          ? caught.message
          : "Could not access microphone. Please check permissions.",
      );
    }
  }

  function stopRecording() {
    if (timerRef.current !== null) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }

    if (
      mediaRecorderRef.current !== null &&
      mediaRecorderRef.current.state !== "inactive"
    ) {
      mediaRecorderRef.current.stop();
    }

    setIsRecording(false);
  }

  function handleFileUpload(event: ChangeEvent<HTMLInputElement>) {
    setError(null);
    const file = event.target.files?.[0];

    if (!file) {
      return;
    }

    if (audioUrl !== null) {
      URL.revokeObjectURL(audioUrl);
    }

    const url = URL.createObjectURL(file);
    setAudioBlob(file);
    setAudioUrl(url);
    setFileName(file.name);
  }

  function handleReset() {
    if (audioUrl !== null) {
      URL.revokeObjectURL(audioUrl);
    }

    setAudioBlob(null);
    setAudioUrl(null);
    setFileName(null);
    setError(null);
    setRecordingSeconds(0);
  }

  async function handleTranscribeAndExtract() {
    if (!audioBlob) {
      return;
    }

    setError(null);
    setIsProcessing(true);

    try {
      const buffer = await audioBlob.arrayBuffer();
      const bytes = new Uint8Array(buffer);
      let binary = "";

      for (let i = 0; i < bytes.byteLength; i++) {
        binary += String.fromCharCode(bytes[i]);
      }

      const audioBase64 = btoa(binary);
      const mimeType = audioBlob.type || "audio/webm";

      const result = await extractFromAudio({
        audioBase64,
        mimeType,
      });

      onTranscriptionComplete({
        transcript: result.transcript,
        extraction: result.extraction,
      });
    } catch (caught) {
      setError(
        caught instanceof Error
          ? caught.message
          : "Audio processing failed. Please check your ElevenLabs API key and try again.",
      );
    } finally {
      setIsProcessing(false);
    }
  }

  const formatTime = (totalSeconds: number) => {
    const mins = Math.floor(totalSeconds / 60)
      .toString()
      .padStart(2, "0");

    const secs = (totalSeconds % 60).toString().padStart(2, "0");

    return `${mins}:${secs}`;
  };

  return (
    <Card className="border-dashed bg-muted/30">
      <CardContent className="space-y-4 pt-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2 text-sm font-medium text-foreground">
            <Sparkles className="size-4 text-amber-500" />
            <span>ElevenLabs Voice Stream</span>
          </div>
          <div className="flex gap-1 rounded-lg border bg-background p-1 text-xs">
            <button
              type="button"
              onClick={() => {
                setMode("record");
                handleReset();
              }}
              disabled={isRecording || isProcessing || disabled}
              className={`rounded px-2.5 py-1 font-medium transition-colors ${
                mode === "record"
                  ? "bg-primary text-primary-foreground shadow-xs"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              Record Mic
            </button>
            <button
              type="button"
              onClick={() => {
                setMode("upload");
                handleReset();
              }}
              disabled={isRecording || isProcessing || disabled}
              className={`rounded px-2.5 py-1 font-medium transition-colors ${
                mode === "upload"
                  ? "bg-primary text-primary-foreground shadow-xs"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              Upload Audio
            </button>
          </div>
        </div>

        {mode === "record" && !audioBlob && (
          <div className="flex flex-col items-center justify-center rounded-lg border border-dashed p-6 text-center">
            {isRecording ? (
              <div className="space-y-3">
                <div className="flex items-center justify-center gap-2">
                  <span className="relative flex size-3">
                    <span className="absolute inline-flex size-full animate-ping rounded-full bg-red-400 opacity-75" />
                    <span className="relative inline-flex size-3 rounded-full bg-red-500" />
                  </span>
                  <span className="font-mono text-lg font-semibold text-foreground">
                    {formatTime(recordingSeconds)}
                  </span>
                </div>
                <p className="text-xs text-muted-foreground">
                  Recording client request... Speak clearly.
                </p>
                <Button
                  type="button"
                  variant="destructive"
                  size="sm"
                  onClick={stopRecording}
                  className="gap-1.5"
                >
                  <Square className="size-4 fill-current" />
                  Stop Recording
                </Button>
              </div>
            ) : (
              <div className="space-y-3">
                <div className="mx-auto flex size-12 items-center justify-center rounded-full bg-primary/10 text-primary">
                  <Mic className="size-6" />
                </div>
                <div>
                  <p className="text-sm font-medium">Record voice memo</p>
                  <p className="text-xs text-muted-foreground">
                    Dictate or play back client voicemail from your phone
                  </p>
                </div>
                <Button
                  type="button"
                  size="sm"
                  onClick={() => void startRecording()}
                  disabled={disabled}
                  className="gap-1.5"
                >
                  <Mic className="size-4" />
                  Start Recording
                </Button>
              </div>
            )}
          </div>
        )}

        {mode === "upload" && !audioBlob && (
          <div className="flex flex-col items-center justify-center rounded-lg border border-dashed p-6 text-center">
            <div className="mx-auto mb-2 flex size-12 items-center justify-center rounded-full bg-primary/10 text-primary">
              <Upload className="size-6" />
            </div>
            <p className="text-sm font-medium">Upload audio file</p>
            <p className="mb-3 text-xs text-muted-foreground">
              MP3, WAV, M4A, or WebM client voicemail files
            </p>
            <label>
              <input
                type="file"
                accept="audio/*,.mp3,.wav,.m4a,.webm"
                onChange={handleFileUpload}
                disabled={disabled}
                className="sr-only"
              />
              <span className="inline-flex cursor-pointer items-center justify-center gap-1.5 rounded-md border bg-background px-3 py-1.5 text-xs font-medium text-foreground shadow-xs hover:bg-accent">
                <FileAudio className="size-4" />
                Choose audio file
              </span>
            </label>
          </div>
        )}

        {audioBlob !== null && audioUrl !== null && (
          <div className="space-y-3 rounded-lg border bg-background p-4">
            <div className="flex items-center justify-between text-xs text-muted-foreground">
              <span className="truncate font-medium text-foreground">
                {fileName ?? "Audio clip"}
              </span>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={handleReset}
                disabled={isProcessing}
                className="h-6 px-2 text-xs"
              >
                <RotateCcw className="mr-1 size-3" />
                Reset
              </Button>
            </div>
            {/* Audio playback preview */}
            <audio controls src={audioUrl} className="w-full" />
            <Button
              type="button"
              onClick={() => void handleTranscribeAndExtract()}
              disabled={isProcessing || disabled}
              className="w-full gap-2"
            >
              {isProcessing ? (
                <>
                  <Loader2 className="size-4 animate-spin" />
                  Transcribing with ElevenLabs & Extracting...
                </>
              ) : (
                <>
                  <Sparkles className="size-4 text-amber-300" />
                  Transcribe & Extract Job
                </>
              )}
            </Button>
          </div>
        )}

        {error !== null && (
          <div className="rounded-md border border-destructive/20 bg-destructive/10 p-3 text-xs text-destructive">
            {error}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
