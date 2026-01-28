/* generated using openapi-typescript-codegen -- do not edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
import type { AnyValue } from '../models/AnyValue';
import type { EntityTypedMetadata } from '../models/EntityTypedMetadata';
import type { InternalID } from '../models/InternalID';
import type { Metadata } from '../models/Metadata';
import type { CancelablePromise } from '../core/CancelablePromise';
import { OpenAPI } from '../core/OpenAPI';
import { request as __request } from '../core/request';
export class SubordinateMetadataService {
    /**
     * Gets the value of a single subordinate specific metadata claim for an entity type.
     * @param subordinateId The id of the subordinate
     * @param entityType The metadata entity type
     * @param claim The metadata claim name
     * @returns AnyValue Successful response.
     * @throws ApiError
     */
    public static getSubordinateMetadataClaim(
        subordinateId: InternalID,
        entityType: string,
        claim: string,
    ): CancelablePromise<AnyValue> {
        return __request(OpenAPI, {
            method: 'GET',
            url: '/api/v1/admin/subordinates/{subordinateID}/metadata/{entityType}/{claim}',
            path: {
                'subordinateID': subordinateId,
                'entityType': entityType,
                'claim': claim,
            },
            errors: {
                404: `The requested resource was not found`,
                500: `Internal server error`,
            },
        });
    }
    /**
     * Create or update a subordinate specific metadata claim.
     * @param subordinateId The id of the subordinate
     * @param entityType The metadata entity type
     * @param claim The metadata claim name
     * @param requestBody
     * @returns AnyValue Successfully updated claim value.
     * @throws ApiError
     */
    public static changeSubordinateMetadataClaim(
        subordinateId: InternalID,
        entityType: string,
        claim: string,
        requestBody: AnyValue,
    ): CancelablePromise<AnyValue> {
        return __request(OpenAPI, {
            method: 'PUT',
            url: '/api/v1/admin/subordinates/{subordinateID}/metadata/{entityType}/{claim}',
            path: {
                'subordinateID': subordinateId,
                'entityType': entityType,
                'claim': claim,
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
     * Deletes the subordinate specific metadata claim for this entity type.
     * @param subordinateId The id of the subordinate
     * @param entityType The metadata entity type
     * @param claim The metadata claim name
     * @returns void
     * @throws ApiError
     */
    public static deleteSubordinateMetadataClaim(
        subordinateId: InternalID,
        entityType: string,
        claim: string,
    ): CancelablePromise<void> {
        return __request(OpenAPI, {
            method: 'DELETE',
            url: '/api/v1/admin/subordinates/{subordinateID}/metadata/{entityType}/{claim}',
            path: {
                'subordinateID': subordinateId,
                'entityType': entityType,
                'claim': claim,
            },
            errors: {
                500: `Internal server error`,
            },
        });
    }
    /**
     * Get all subordinate-specific metadata claims for an entity type
     * @param subordinateId The id of the subordinate
     * @param entityType The metadata entity type
     * @returns EntityTypedMetadata Successful response
     * @throws ApiError
     */
    public static getSubordinateEntityTypedMetadata(
        subordinateId: InternalID,
        entityType: string,
    ): CancelablePromise<EntityTypedMetadata> {
        return __request(OpenAPI, {
            method: 'GET',
            url: '/api/v1/admin/subordinates/{subordinateID}/metadata/{entityType}',
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
    /**
     * Create or update all subordinate-specific metadata for an entity type.
     * @param subordinateId The id of the subordinate
     * @param entityType The metadata entity type
     * @param requestBody
     * @returns EntityTypedMetadata Successfully updated metadata for entity type.
     * @throws ApiError
     */
    public static changeSubordinateEntityTypedMetadata(
        subordinateId: InternalID,
        entityType: string,
        requestBody: EntityTypedMetadata,
    ): CancelablePromise<EntityTypedMetadata> {
        return __request(OpenAPI, {
            method: 'PUT',
            url: '/api/v1/admin/subordinates/{subordinateID}/metadata/{entityType}',
            path: {
                'subordinateID': subordinateId,
                'entityType': entityType,
            },
            body: requestBody,
            mediaType: 'application/json',
            errors: {
                400: `Invalid request parameters`,
                500: `Internal server error`,
            },
        });
    }
    /**
     * Adds the posted metadata claims to the subordinate specific entity type's metadata.
     * @param subordinateId The id of the subordinate
     * @param entityType The metadata entity type
     * @param requestBody
     * @returns EntityTypedMetadata Successfully added the claims to the entity type's metadata.
     * @throws ApiError
     */
    public static addSubordinateMetadataClaims(
        subordinateId: InternalID,
        entityType: string,
        requestBody: EntityTypedMetadata,
    ): CancelablePromise<EntityTypedMetadata> {
        return __request(OpenAPI, {
            method: 'POST',
            url: '/api/v1/admin/subordinates/{subordinateID}/metadata/{entityType}',
            path: {
                'subordinateID': subordinateId,
                'entityType': entityType,
            },
            body: requestBody,
            mediaType: 'application/json',
            errors: {
                400: `Invalid request parameters`,
                500: `Internal server error`,
            },
        });
    }
    /**
     * Deletes all subordinate specific metadata for the entity type.
     * @param subordinateId The id of the subordinate
     * @param entityType The metadata entity type
     * @returns void
     * @throws ApiError
     */
    public static deleteSubordinateEntityTypedMetadata(
        subordinateId: InternalID,
        entityType: string,
    ): CancelablePromise<void> {
        return __request(OpenAPI, {
            method: 'DELETE',
            url: '/api/v1/admin/subordinates/{subordinateID}/metadata/{entityType}',
            path: {
                'subordinateID': subordinateId,
                'entityType': entityType,
            },
            errors: {
                500: `Internal server error`,
            },
        });
    }
    /**
     * Get subordinate-specific metadata published in the entity statement
     * @param subordinateId The id of the subordinate
     * @returns Metadata Successful response
     * @throws ApiError
     */
    public static getSubordinateMetadata(
        subordinateId: InternalID,
    ): CancelablePromise<Metadata> {
        return __request(OpenAPI, {
            method: 'GET',
            url: '/api/v1/admin/subordinates/{subordinateID}/metadata',
            path: {
                'subordinateID': subordinateId,
            },
            errors: {
                500: `Internal server error`,
            },
        });
    }
    /**
     * Update the complete subordinate-specific metadata structure.
     * Use with care!
     * @param subordinateId The id of the subordinate
     * @param requestBody
     * @returns Metadata Successful response
     * @throws ApiError
     */
    public static updateSubordinateMetadata(
        subordinateId: InternalID,
        requestBody: Metadata,
    ): CancelablePromise<Metadata> {
        return __request(OpenAPI, {
            method: 'PUT',
            url: '/api/v1/admin/subordinates/{subordinateID}/metadata',
            path: {
                'subordinateID': subordinateId,
            },
            body: requestBody,
            mediaType: 'application/json',
            errors: {
                400: `Invalid request parameters`,
                500: `Internal server error`,
            },
        });
    }
}
