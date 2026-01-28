/* generated using openapi-typescript-codegen -- do not edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
import type { AllowedEntityTypes } from '../models/AllowedEntityTypes';
import type { Constraints } from '../models/Constraints';
import type { EntityTypeIdentifier } from '../models/EntityTypeIdentifier';
import type { NamingConstraints } from '../models/NamingConstraints';
import type { CancelablePromise } from '../core/CancelablePromise';
import { OpenAPI } from '../core/OpenAPI';
import { request as __request } from '../core/request';
export class GeneralConstraintsService {
    /**
     * Get general constraints published in the entity statement
     * @returns Constraints Successful response
     * @throws ApiError
     */
    public static getGeneralConstraints(): CancelablePromise<Constraints> {
        return __request(OpenAPI, {
            method: 'GET',
            url: '/api/v1/admin/subordinates/constraints',
            errors: {
                500: `Internal server error`,
            },
        });
    }
    /**
     * Update the complete general constraints structure.
     * Use with care!
     * @param requestBody
     * @returns Constraints Successful response
     * @throws ApiError
     */
    public static updateGeneralConstraints(
        requestBody: Constraints,
    ): CancelablePromise<Constraints> {
        return __request(OpenAPI, {
            method: 'PUT',
            url: '/api/v1/admin/subordinates/constraints',
            body: requestBody,
            mediaType: 'application/json',
            errors: {
                400: `Invalid request parameters`,
                500: `Internal server error`,
            },
        });
    }
    /**
     * Get general max_path_length constraint
     * @returns number Successful response returning max_path_length.
     * @throws ApiError
     */
    public static getGeneralMaxPathLength(): CancelablePromise<number | null> {
        return __request(OpenAPI, {
            method: 'GET',
            url: '/api/v1/admin/subordinates/constraints/max-path-length',
            errors: {
                500: `Internal server error`,
            },
        });
    }
    /**
     * Set general max_path_length constraint
     * @param requestBody
     * @returns number Successfully updated max_path_length.
     * @throws ApiError
     */
    public static setGeneralMaxPathLength(
        requestBody: number,
    ): CancelablePromise<number> {
        return __request(OpenAPI, {
            method: 'PUT',
            url: '/api/v1/admin/subordinates/constraints/max-path-length',
            body: requestBody,
            mediaType: 'application/json',
            errors: {
                400: `Invalid request parameters`,
                500: `Internal server error`,
            },
        });
    }
    /**
     * Delete general max_path_length constraint
     * @returns void
     * @throws ApiError
     */
    public static deleteGeneralMaxPathLength(): CancelablePromise<void> {
        return __request(OpenAPI, {
            method: 'DELETE',
            url: '/api/v1/admin/subordinates/constraints/max-path-length',
            errors: {
                500: `Internal server error`,
            },
        });
    }
    /**
     * Get general naming_constraints
     * @returns NamingConstraints Successful response returning naming_constraints.
     * @throws ApiError
     */
    public static getGeneralNamingConstraints(): CancelablePromise<NamingConstraints> {
        return __request(OpenAPI, {
            method: 'GET',
            url: '/api/v1/admin/subordinates/constraints/naming-constraints',
            errors: {
                500: `Internal server error`,
            },
        });
    }
    /**
     * Set general naming_constraints
     * @param requestBody
     * @returns NamingConstraints Successfully updated naming_constraints.
     * @throws ApiError
     */
    public static setGeneralNamingConstraints(
        requestBody: NamingConstraints,
    ): CancelablePromise<NamingConstraints> {
        return __request(OpenAPI, {
            method: 'PUT',
            url: '/api/v1/admin/subordinates/constraints/naming-constraints',
            body: requestBody,
            mediaType: 'application/json',
            errors: {
                400: `Invalid request parameters`,
                500: `Internal server error`,
            },
        });
    }
    /**
     * Delete general naming_constraints
     * @returns void
     * @throws ApiError
     */
    public static deleteGeneralNamingConstraints(): CancelablePromise<void> {
        return __request(OpenAPI, {
            method: 'DELETE',
            url: '/api/v1/admin/subordinates/constraints/naming-constraints',
            errors: {
                500: `Internal server error`,
            },
        });
    }
    /**
     * Get general allowed entity types
     * @returns AllowedEntityTypes Successful response returning allowed entity types.
     * @throws ApiError
     */
    public static getGeneralAllowedEntityTypes(): CancelablePromise<AllowedEntityTypes> {
        return __request(OpenAPI, {
            method: 'GET',
            url: '/api/v1/admin/subordinates/constraints/allowed-entity-types',
            errors: {
                500: `Internal server error`,
            },
        });
    }
    /**
     * Set general allowed entity types
     * @param requestBody
     * @returns AllowedEntityTypes Successfully updated allowed entity types.
     * @throws ApiError
     */
    public static setGeneralAllowedEntityTypes(
        requestBody: AllowedEntityTypes,
    ): CancelablePromise<AllowedEntityTypes> {
        return __request(OpenAPI, {
            method: 'PUT',
            url: '/api/v1/admin/subordinates/constraints/allowed-entity-types',
            body: requestBody,
            mediaType: 'application/json',
            errors: {
                400: `Invalid request parameters`,
                500: `Internal server error`,
            },
        });
    }
    /**
     * Add general allowed entity type
     * @param requestBody
     * @returns AllowedEntityTypes Successfully added allowed entity type.
     * @throws ApiError
     */
    public static addGeneralAllowedEntityType(
        requestBody: EntityTypeIdentifier,
    ): CancelablePromise<AllowedEntityTypes> {
        return __request(OpenAPI, {
            method: 'POST',
            url: '/api/v1/admin/subordinates/constraints/allowed-entity-types',
            body: requestBody,
            mediaType: 'application/json',
            errors: {
                400: `Invalid request parameters`,
                500: `Internal server error`,
            },
        });
    }
    /**
     * Delete general allowed entity type
     * @param entityType The entity type to remove
     * @returns string Successfully deleted allowed entity type. Response contains updated list.
     * @throws ApiError
     */
    public static deleteGeneralAllowedEntityType(
        entityType: string,
    ): CancelablePromise<Array<string>> {
        return __request(OpenAPI, {
            method: 'DELETE',
            url: '/api/v1/admin/subordinates/constraints/allowed-entity-types/{entityType}',
            path: {
                'entityType': entityType,
            },
            errors: {
                500: `Internal server error`,
            },
        });
    }
}
