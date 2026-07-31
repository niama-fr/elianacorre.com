import { Alert, AlertDescription, AlertTitle } from "@ec/ui/components/alert";
import { Button } from "@ec/ui/components/button";

export function SafeRouteErrorPage() {
  return (
    <section className="flex flex-col items-start gap-4">
      <Alert variant="destructive">
        <AlertTitle>Impossible de charger cette page</AlertTitle>
        <AlertDescription>Réessayez. Si le problème persiste, reconnectez-vous.</AlertDescription>
      </Alert>
      <Button
        type="button"
        onClick={() => {
          location.reload();
        }}
      >
        Réessayer
      </Button>
    </section>
  );
}
