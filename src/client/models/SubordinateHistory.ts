/* generated using openapi-typescript-codegen -- do not edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
import type { Pagination } from './Pagination';
import type { SubordinateEvent } from './SubordinateEvent';
/**
 * History of events related to a subordinate with pagination information.
 */
export type SubordinateHistory = {
    events: Array<SubordinateEvent>;
    pagination: Pagination;
};

