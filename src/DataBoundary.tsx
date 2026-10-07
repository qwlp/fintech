import { Component, type ReactNode } from "react";
import { Button } from "./components/ui/button";
export default class DataBoundary extends Component<
  { children: ReactNode },
  { failed: boolean }
> {
  state = { failed: false };
  static getDerivedStateFromError() {
    return { failed: true };
  }
  render() {
    return this.state.failed ? (
      <section className="sponsor-desk-empty" role="alert">
        <p>Could not load this view. Please try again.</p>
        <Button onClick={() => this.setState({ failed: false })}>Retry</Button>
      </section>
    ) : (
      this.props.children
    );
  }
}
