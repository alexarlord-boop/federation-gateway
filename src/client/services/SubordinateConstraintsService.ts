/* generated using openapi-typescript-codegen -- do not edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
import type { AllowedEntityTypes } from '../models/AllowedEntityTypes';
import type { Constraints } from '../models/Constraints';
import type { EntityTypeIdentifier } from '../models/EntityTypeIdentifier';
import type { InternalID } from '../models/InternalID';
import type { NamingConstraints } from '../models/NamingConstraints';
import type { CancelablePromise } from '../core/CancelablePromise';
import { OpenAPI } from '../core/OpenAPI';
import { request as __request } from '../core/request';
export class SubordinateConstraintsService {
    /**
     * Get subordinate-specific constraints published in the entity statement
     * @param subordinateId The id of the subordinate
     * @returns Constraints Successful response
     * @throws ApiError
     */
    public static getSubordinateConstraints(
        subordinateId: InternalID,
    ): CancelablePromise<Constraints> {
        return __request(OpenAPI, {
            method: 'GET',
            url: '/api/v1/admin/subordinates/{subordinateID}/constraints',
            path: {
                'subordinateID': subordinateId,
            },
            errors: {
                404: `The requested resource was not found`,
                500: `Internal server error`,
            },
        });
    }
    /**
     * Update the subordinate-specific constraints structure.
     * @param subordinateId The id of the subordinate
     * @param requestBody
     * @returns Constraints Successful response
     * @throws ApiError
     */
    public static updateSubordinateConstraints(
        subordinateId: InternalID,
        requestBody: Constraints,
    ): CancelablePromise<Constraints> {
        return __request(OpenAPI, {
            method: 'PUT',
            url: '/api/v1/admin/subordinates/{subordinateID}/constraints',
            path: {
                'subordinateID': subordinateId,
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
     * Copy general constraints to this subordinate.
     * Copies the general constraints and sets them specifically for this subordinate.
     * @param subordinateId The id of the subordinate
     * @returns Constraints Successfully copied general constraints to subordinate.
     * @throws ApiError
     */
    public static copyGeneralConstraintsToSubordinate(
        subordinateId: InternalID,
    ): CancelablePromise<Constraints> {
        return __request(OpenAPI, {
            method: 'POST',
            url: '/api/v1/admin/subordinates/{subordinateID}/constraints',
            path: {
                'subordinateID': subordinateId,
            },
            errors: {
                404: `The requested resource was not found`,
                500: `Internal server error`,
            },
        });
    }
    /**
     * Deletes all subordinate-specific constraints.
     * @param subordinateId The id of the subordinate
     * @returns void
     * @throws ApiError
     */
    public static deleteSubordinateConstraints(
        subordinateId: InternalID,
    ): CancelablePromise<void> {
        return __request(OpenAPI, {
            method: 'DELETE',
            url: '/api/v1/admin/subordinates/{subordinateID}/constraints',
            path: {
                'subordinateID': subordinateId,
            },
            errors: {
                404: `The requested resource was not found`,
                500: `Internal server error`,
            },
        });
    }
    /**
     * Get subordinate max_path_length constraint
     * @param subordinateId The id of the subordinate
     * @returns number Successful response returning subordinate max_path_length.
     * @throws ApiError
     */
    public static getSubordinateMaxPathLength(
        subordinateId: InternalID,
    ): CancelablePromise<number | null> {
        return __request(OpenAPI, {
            method: 'GET',
            url: '/api/v1/admin/subordinates/{subordinateID}/constraints/max-path-length',
            path: {
                'subordinateID': subordinateId,
            },
            errors: {
                404: `The requested resource was not found`,
                500: `Internal server error`,
            },
        });
    }
    /**
     * Set subordinate max_path_length constraint
     * @param subordinateId The id of the subordinate
     * @param requestBody
     * @returns number Successfully updated subordinate max_path_length.
     * @throws ApiError
     */
    public static setSubordinateMaxPathLength(
        subordinateId: InternalID,
        requestBody: number,
    ): CancelablePromise<number> {
        return __request(OpenAPI, {
            method: 'PUT',
            url: '/api/v1/admin/subordinates/{subordinateID}/constraints/max-path-length',
            path: {
                'subordinateID': subordinateId,
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
     * Delete subordinate max_path_length constraint
     * @param subordinateId The id of the subordinate
     * @returns void
     * @throws ApiError
     */
    public static deleteSubordinateMaxPathLength(
        subordinateId: InternalID,
    ): CancelablePromise<void> {
        return __request(OpenAPI, {
            method: 'DELETE',
            url: '/api/v1/admin/subordinates/{subordinateID}/constraints/max-path-length',
            path: {
                'subordinateID': subordinateId,
            },
            errors: {
                404: `The requested resource was not found`,
                500: `Internal server error`,
            },
        });
    }
    /**
     * Get subordinate naming_constraints
     * @param subordinateId The id of the subordinate
     * @returns NamingConstraints Successful response returning subordinate naming_constraints.
     * @throws ApiError
     */
    public static getSubordinateNamingConstraints(
        subordinateId: InternalID,
    ): CancelablePromise<NamingConstraints> {
        return __request(OpenAPI, {
            method: 'GET',
            url: '/api/v1/admin/subordinates/{subordinateID}/constraints/naming-constraints',
            path: {
                'subordinateID': subordinateId,
            },
            errors: {
                404: `The requested resource was not found`,
                500: `Internal server error`,
            },
        });
    }
    /**
     * Set subordinate naming_constraints
     * @param subordinateId The id of the subordinate
     * @param requestBody
     * @returns NamingConstraints Successfully updated subordinate naming_constraints.
     * @throws ApiError
     */
    public static setSubordinateNamingConstraints(
        subordinateId: InternalID,
        requestBody: NamingConstraints,
    ): CancelablePromise<NamingConstraints> {
        return __request(OpenAPI, {
            method: 'PUT',
            url: '/api/v1/admin/subordinates/{subordinateID}/constraints/naming-constraints',
            path: {
                'subordinateID': subordinateId,
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
     * Delete subordinate naming_constraints
     * @param subordinateId The id of the subordinate
     * @returns void
     * @throws ApiError
     */
    public static deleteSubordinateNamingConstraints(
        subordinateId: InternalID,
    ): CancelablePromise<void> {
        return __request(OpenAPI, {
            method: 'DELETE',
            url: '/api/v1/admin/subordinates/{subordinateID}/constraints/naming-constraints',
            path: {
                'subordinateID': subordinateId,
            },
            errors: {
                404: `The requested resource was not found`,
                500: `Internal server error`,
            },
        });
    }
    /**
     * Get subordinate allowed entity types
     * @param subordinateId The id of the subordinate
     * @returns AllowedEntityTypes Successful response returning subordinate allowed entity types.
     * @throws ApiError
     */
    public static getSubordinateAllowedEntityTypes(
        subordinateId: InternalID,
    ): CancelablePromise<AllowedEntityTypes> {
        return __request(OpenAPI, {
            method: 'GET',
            url: '/api/v1/admin/subordinates/{subordinateID}/constraints/allowed-entity-types',
            path: {
                'subordinateID': subordinateId,
            },
            errors: {
                404: `The requested resource was not found`,
                500: `Internal server error`,
            },
        });
    }
    /**
     * Set subordinate allowed entity types
     * @param subordinateId The id of the subordinate
     * @param requestBody
     * @returns string Successfully updated subordinate allowed entity types.
     * @throws ApiError
     */
    public static setSubordinateAllowedEntityTypes(
        subordinateId: InternalID,
        requestBody: AllowedEntityTypes,
    ): CancelablePromise<Array<string>> {
        return __request(OpenAPI, {
            method: 'PUT',
            url: '/api/v1/admin/subordinates/{subordinateID}/constraints/allowed-entity-types',
            path: {
                'subordinateID': subordinateId,
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
     * Add subordinate allowed entity type
     * @param subordinateId The id of the subordinate
     * @param requestBody
     * @returns AllowedEntityTypes Successfully added subordinate allowed entity type.
     * @throws ApiError
     */
    public static addSubordinateAllowedEntityType(
        subordinateId: InternalID,
        requestBody: EntityTypeIdentifier,
    ): CancelablePromise<AllowedEntityTypes> {
        return __request(OpenAPI, {
            method: 'POST',
            url: '/api/v1/admin/subordinates/{subordinateID}/constraints/allowed-entity-types',
            path: {
                'subordinateID': subordinateId,
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
     * Delete subordinate allowed entity type
     * @param subordinateId The id of the subordinate
     * @param entityType The entity type to remove
     * @returns string Successfully deleted subordinate allowed entity type. Response contains updated list.
     * @throws ApiError
     */
    public static deleteSubordinateAllowedEntityType(
        subordinateId: InternalID,
        entityType: string,
    ): CancelablePromise<Array<string>> {
        return __request(OpenAPI, {
            method: 'DELETE',
            url: '/api/v1/admin/subordinates/{subordinateID}/constraints/allowed-entity-types/{entityType}',
            path: {
                'subordinateID': subordinateId,
                'entityType': entityType,
            },
            errors: {
                404: `The requested resource was not found`,
                500: `Internal server error`,
            },
        });
    }
}
