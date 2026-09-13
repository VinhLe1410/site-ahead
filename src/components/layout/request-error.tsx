import { Alert, AlertDescription } from "@/components/ui/alert";

export function RequestError({ message }: { message: string }) {
  return (
    <Alert variant="destructive">
      <AlertDescription>{message}</AlertDescription>
    </Alert>
  );
}
