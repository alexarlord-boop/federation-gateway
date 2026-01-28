/* generated using openapi-typescript-codegen -- do not edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
/**
 * A single event in subordinate history.
 */
export type SubordinateEvent = {
    /**
     * Unix timestamp (seconds since epoch) when the event occurred.
     */
    timestamp: number;
    /**
     * The type/category of the event (e.g., created, deleted, jwk_added).
     */
    type: string;
    /**
     * Subordinate status at the time of the event, if applicable.
     */
    status?: string | null;
    /**
     * Optional descriptive message.
     */
    message?: string | null;
    /**
     * Optional identifier for the actor performing the event.
     */
    actor?: string | null;
};

