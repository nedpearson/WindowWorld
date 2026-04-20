/**
 * Queue singletons â€” exported so services can enqueue jobs without
 * importing the full BullMQ runtime during test/build.
 * Queues are only connected when Redis is available.
 */
export declare const pdfQueue: any;
export declare const emailQueue: any;
export declare const aiQueue: any;
export declare const automationQueue: any;
export declare const syncQueue: any;
export declare const leadScoringQueue: any;
export declare function initializeJobQueues(): Promise<void>;
//# sourceMappingURL=index.d.ts.map