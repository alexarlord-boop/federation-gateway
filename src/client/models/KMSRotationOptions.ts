/* generated using openapi-typescript-codegen -- do not edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
/**
 * Rotation options for the KMS-managed keys.
 */
export type KMSRotationOptions = {
    /**
     * Whether automatic rotation is enabled.
     */
    enabled?: boolean;
    /**
     * Rotation interval in seconds.
     */
    interval?: number;
    /**
     * Overlap window where old and new keys are both valid, in seconds.
     */
    overlap?: number;
};

