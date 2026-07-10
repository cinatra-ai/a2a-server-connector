// AC6 red-run proof (cinatra-ai/cinatra#1213): a DELIBERATE non-canonical
// transient banner + a direct sonner import, to prove the toast-banner-gate
// goes RED on a reintroduced violation. Throwaway branch; deleted after the run
// is recorded.
import { toast } from "sonner";
import { Alert, AlertDescription } from "@/components/ui/alert";

export function Ac6Violation({ searchParams }: { searchParams: { error?: string } }) {
  const error = searchParams.error;
  if (error) toast.error(error);
  return error ? (
    <Alert variant="destructive">
      <AlertDescription>{error}</AlertDescription>
    </Alert>
  ) : null;
}
