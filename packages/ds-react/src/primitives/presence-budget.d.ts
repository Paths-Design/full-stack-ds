/** Mirrored web primitive: one active-time budget, with an optional DOM projection.
 * Framework wrappers own lifecycle. Progress never owns dismissal or another clock.
 */
export declare function createPresenceBudget(onDismiss: () => void, reducedMotionSteps?: number, onProgress?: (remaining: number, enabled: boolean, reduced: boolean) => void): {
    sync: (open: boolean, ms: number | null | undefined) => void;
    pause: (reason?: string) => void;
    resume: (reason?: string) => void;
    bindProgress: (element: Element | null | undefined) => void;
    destroy: () => void;
    focusOut: (event?: {
        currentTarget: EventTarget | null;
        relatedTarget: EventTarget | null;
    }) => void;
    restart: () => void;
    /** Read-only projection for consumers; never a second time source. */
    snapshot: () => {
        enabled: boolean;
        remainingMs: number;
        durationMs: number;
        paused: boolean;
    };
};
