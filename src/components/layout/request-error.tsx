import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";

export function RequestError({ message }: { message: string }) {
  return (
    <Alert variant="destructive">
      <AlertTitle>Could not save</AlertTitle>
      <AlertDescription>{message}</AlertDescription>
    </Alert>
  );
}
