/* generated using openapi-typescript-codegen -- do not edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
import type { AnyValue } from '../models/AnyValue';
import type { EntityTypedMetadata } from '../models/EntityTypedMetadata';
import type { Metadata } from '../models/Metadata';
import type { CancelablePromise } from '../core/CancelablePromise';
import { OpenAPI } from '../core/OpenAPI';
import { request as __request } from '../core/request';
export class EntityConfigurationMetadataService {
    /**
     * Gets the value of a single metadata claim for an entity type.
     * @param entityType The metadata entity type
     * @param claim The metadata claim name
     * @returns AnyValue Successful response.
     * @throws ApiError
     */
    public static getMetadataClaim(
        entityType: string,
        claim: string,
    ): CancelablePromise<AnyValue> {
        return __request(OpenAPI, {
            method: 'GET',
            url: '/api/v1/admin/entity-configuration/metadata/{entityType}/{claim}',
            path: {
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
     * Create or update a metadata claim.
     * @param entityType The metadata entity type
     * @param claim The metadata claim name
     * @param requestBody
     * @returns AnyValue Successfully updated claim value.
     * @throws ApiError
     */
    public static changeMetadataClaim(
        entityType: string,
        claim: string,
        requestBody: AnyValue,
    ): CancelablePromise<AnyValue> {
        return __request(OpenAPI, {
            method: 'PUT',
            url: '/api/v1/admin/entity-configuration/metadata/{entityType}/{claim}',
            path: {
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
     * Deletes the metadata claim for this entity type.
     * @param entityType The metadata entity type
     * @param claim The metadata claim name
     * @returns void
     * @throws ApiError
     */
    public static deleteMetadataClaim(
        entityType: string,
        claim: string,
    ): CancelablePromise<void> {
        return __request(OpenAPI, {
            method: 'DELETE',
            url: '/api/v1/admin/entity-configuration/metadata/{entityType}/{claim}',
            path: {
                'entityType': entityType,
                'claim': claim,
            },
            errors: {
                500: `Internal server error`,
            },
        });
    }
    /**
     * Get all Metadata claims for an entity type
     * @param entityType The metadata entity type
     * @returns EntityTypedMetadata Successful response
     * @throws ApiError
     */
    public static getEntityTypedMetadata(
        entityType: string,
    ): CancelablePromise<EntityTypedMetadata> {
        return __request(OpenAPI, {
            method: 'GET',
            url: '/api/v1/admin/entity-configuration/metadata/{entityType}',
            path: {
                'entityType': entityType,
            },
            errors: {
                404: `The requested resource was not found`,
                500: `Internal server error`,
            },
        });
    }
    /**
     * Create or update (all) metadata for an entity type.
     * @param entityType The metadata entity type
     * @param requestBody
     * @returns EntityTypedMetadata Successfully updated metadata for entity type.
     * @throws ApiError
     */
    public static changeEntityTypedMetadata(
        entityType: string,
        requestBody: EntityTypedMetadata,
    ): CancelablePromise<EntityTypedMetadata> {
        return __request(OpenAPI, {
            method: 'PUT',
            url: '/api/v1/admin/entity-configuration/metadata/{entityType}',
            path: {
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
     * Adds the posted metadata claims to the entity type's metadata.
     * @param entityType The metadata entity type
     * @param requestBody
     * @returns EntityTypedMetadata Successfully added the claims to the entity type's metadata.
     * @throws ApiError
     */
    public static addMetadataClaims(
        entityType: string,
        requestBody: EntityTypedMetadata,
    ): CancelablePromise<EntityTypedMetadata> {
        return __request(OpenAPI, {
            method: 'POST',
            url: '/api/v1/admin/entity-configuration/metadata/{entityType}',
            path: {
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
     * Deletes all metadata for the entity type.
     * @param entityType The metadata entity type
     * @returns void
     * @throws ApiError
     */
    public static deleteEntityTypedMetadata(
        entityType: string,
    ): CancelablePromise<void> {
        return __request(OpenAPI, {
            method: 'DELETE',
            url: '/api/v1/admin/entity-configuration/metadata/{entityType}',
            path: {
                'entityType': entityType,
            },
            errors: {
                500: `Internal server error`,
            },
        });
    }
    /**
     * Gets the metadata published in the entity configuration
     * @returns Metadata Successful response
     * @throws ApiError
     */
    public static getEntityConfigurationMetadata(): CancelablePromise<Metadata> {
        return __request(OpenAPI, {
            method: 'GET',
            url: '/api/v1/admin/entity-configuration/metadata',
            errors: {
                500: `Internal server error`,
            },
        });
    }
    /**
     * Updates the complete metadata structure.
     * Use with care!
     * @param requestBody
     * @returns Metadata Successful response
     * @throws ApiError
     */
    public static updateEntityConfigurationMetadata(
        requestBody: Metadata,
    ): CancelablePromise<Metadata> {
        return __request(OpenAPI, {
            method: 'PUT',
            url: '/api/v1/admin/entity-configuration/metadata',
            body: requestBody,
            mediaType: 'application/json',
            errors: {
                400: `Invalid request parameters`,
                500: `Internal server error`,
            },
        });
    }
}
