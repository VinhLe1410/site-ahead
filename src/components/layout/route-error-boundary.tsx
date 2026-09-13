import { Component, type ReactNode } from "react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";

type RouteErrorBoundaryProps = { children: ReactNode };

type RouteErrorBoundaryState = { failed: boolean; revision: number };

export class RouteErrorBoundary extends Component<
  RouteErrorBoundaryProps,
  RouteErrorBoundaryState
> {
  state = { failed: false, revision: 0 };

  static getDerivedStateFromError() {
    return { failed: true };
  }

  retry = () => {
    this.setState(({ revision }) => ({
      failed: false,
      revision: revision + 1,
    }));
  };

  render() {
    if (this.state.failed) {
      return (
        <Alert variant="destructive">
          <AlertTitle>Could not load this page</AlertTitle>
          <AlertDescription className="mt-2">
            <p>Your saved data has not changed.</p>
            <Button className="mt-3" variant="outline" onClick={this.retry}>
              Try again
            </Button>
          </AlertDescription>
        </Alert>
      );
    }

    return <div key={this.state.revision}>{this.props.children}</div>;
  }
}
