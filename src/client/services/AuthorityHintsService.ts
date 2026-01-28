/* generated using openapi-typescript-codegen -- do not edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
import type { AddAuthorityHint } from '../models/AddAuthorityHint';
import type { AuthorityHint } from '../models/AuthorityHint';
import type { InternalID } from '../models/InternalID';
import type { CancelablePromise } from '../core/CancelablePromise';
import { OpenAPI } from '../core/OpenAPI';
import { request as __request } from '../core/request';
export class AuthorityHintsService {
    /**
     * List all AuthorityHints
     * Gets a list of all `AuthorityHint` entities.
     * @returns AuthorityHint Successful response - returns an array of `AuthorityHint` entities.
     * @throws ApiError
     */
    public static getAuthorityHints(): CancelablePromise<Array<AuthorityHint>> {
        return __request(OpenAPI, {
            method: 'GET',
            url: '/api/v1/admin/entity-configuration/authority-hints',
            errors: {
                500: `Internal server error`,
            },
        });
    }
    /**
     * Create an AuthorityHint
     * Creates a new instance of an `AuthorityHint`.
     * @param requestBody A new `AuthorityHint` to be created.
     * @returns AuthorityHint Successful response.
     * @throws ApiError
     */
    public static createAuthorityHint(
        requestBody: AddAuthorityHint,
    ): CancelablePromise<AuthorityHint> {
        return __request(OpenAPI, {
            method: 'POST',
            url: '/api/v1/admin/entity-configuration/authority-hints',
            body: requestBody,
            mediaType: 'application/json',
            errors: {
                400: `Invalid request parameters`,
                500: `Internal server error`,
            },
        });
    }
    /**
     * Get an AuthorityHint
     * Gets the details of a single instance of an `AuthorityHint`.
     * @param authorityHintId A unique identifier for an AuthorityHint
     * @returns AuthorityHint Successful response - returns a single `AuthorityHint`.
     * @throws ApiError
     */
    public static getAuthorityHint(
        authorityHintId: InternalID,
    ): CancelablePromise<AuthorityHint> {
        return __request(OpenAPI, {
            method: 'GET',
            url: '/api/v1/admin/entity-configuration/authority-hints/{authorityHintID}',
            path: {
                'authorityHintID': authorityHintId,
            },
            errors: {
                404: `The requested resource was not found`,
                500: `Internal server error`,
            },
        });
    }
    /**
     * Update an AuthorityHint
     * Updates an existing `AuthorityHint`.
     * @param authorityHintId A unique identifier for an AuthorityHint
     * @param requestBody Updated `AuthorityHint` information.
     * @returns AuthorityHint Successful response.
     * @throws ApiError
     */
    public static updateAuthorityHint(
        authorityHintId: InternalID,
        requestBody: AddAuthorityHint,
    ): CancelablePromise<AuthorityHint> {
        return __request(OpenAPI, {
            method: 'PUT',
            url: '/api/v1/admin/entity-configuration/authority-hints/{authorityHintID}',
            path: {
                'authorityHintID': authorityHintId,
            },
            body: requestBody,
            mediaType: 'application/json',
            errors: {
                400: `Invalid request parameters`,
                404: `The requested resource was not found`,
                500: `Internal server error`,
            },
        });
    }
    /**
     * Delete an AuthorityHint
     * Deletes an existing `AuthorityHint`.
     * @param authorityHintId A unique identifier for an AuthorityHint
     * @returns void
     * @throws ApiError
     */
    public static deleteAuthorityHint(
        authorityHintId: InternalID,
    ): CancelablePromise<void> {
        return __request(OpenAPI, {
            method: 'DELETE',
            url: '/api/v1/admin/entity-configuration/authority-hints/{authorityHintID}',
            path: {
                'authorityHintID': authorityHintId,
            },
            errors: {
                500: `Internal server error`,
            },
        });
    }
}
