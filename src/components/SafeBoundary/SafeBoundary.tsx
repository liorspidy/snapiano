import { Component, ReactNode } from "react";

type Props = { children: ReactNode; onError: (error: unknown) => void };

// Catches an error thrown while the children render and tells the parent, which then shows something else. Used so a failing
// native camera never takes the whole scan screen down with it.
export class SafeBoundary extends Component<Props, { failed: boolean }> {
    state = { failed: false };
    static getDerivedStateFromError() { return { failed: true }; }
    componentDidCatch(error: unknown) { this.props.onError(error); }
    render() { return this.state.failed ? null : this.props.children; }
}
