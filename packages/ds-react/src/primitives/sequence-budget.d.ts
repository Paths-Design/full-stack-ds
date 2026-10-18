export interface SequenceConfig {
    delegatedPicker?: boolean;
    labels: {
        start: string;
        stop: string;
        item: string;
    };
    transition?: {
        durationMs: number;
        easing: string;
        referenceWidth: number;
        minMultiplier: number;
        maxMultiplier: number;
    };
    parts: Record<"viewport" | "previous" | "next" | "rotation" | "picker", string>;
    progress: Array<{
        selector: string;
        effect: "elapsed-width" | "elapsed-ring";
        steps: number;
        when?: {
            axis: string;
            values: string[];
        };
    }>;
}
export interface SequenceOptions {
    presentation?: Record<string, string | undefined>;
    index: number;
    labels: readonly string[];
    durationMs: number | null | undefined;
    autoPlay: boolean;
    onIndexChange: (index: number) => void;
}
/** A DOM projection of a controlled sequence. No clock other than presence-budget. */
export declare function createSequenceBudget(config: SequenceConfig): {
    sync: (next: SequenceOptions) => void;
    bindRoot: (element: unknown) => void;
    requestIndex: (next: number) => void;
    destroy: () => void;
    snapshot: () => {
        enabled: boolean;
        remainingMs: number;
        durationMs: number;
        paused: boolean;
    };
};
