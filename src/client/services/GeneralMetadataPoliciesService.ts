/* generated using openapi-typescript-codegen -- do not edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
import type { AnyValue } from '../models/AnyValue';
import type { EntityTypedMetadataPolicy } from '../models/EntityTypedMetadataPolicy';
import type { MetadataPolicy } from '../models/MetadataPolicy';
import type { MetadataPolicyEntry } from '../models/MetadataPolicyEntry';
import type { MetadataPolicyOperatorName } from '../models/MetadataPolicyOperatorName';
import type { CancelablePromise } from '../core/CancelablePromise';
import { OpenAPI } from '../core/OpenAPI';
import { request as __request } from '../core/request';
export class GeneralMetadataPoliciesService {
    /**
     * Gets the value of a single metadata policy operator for a claim.
     * @param entityType The metadata entity type
     * @param claim The metadata claim name
     * @param operator The metadata policy operator name
     * @returns AnyValue Successful response.
     * @throws ApiError
     */
    public static getGeneralMetadataPolicyOperator(
        entityType: string,
        claim: string,
        operator: MetadataPolicyOperatorName,
    ): CancelablePromise<AnyValue> {
        return __request(OpenAPI, {
            method: 'GET',
            url: '/api/v1/admin/subordinates/metadata-policies/{entityType}/{claim}/{operator}',
            path: {
                'entityType': entityType,
                'claim': claim,
                'operator': operator,
            },
            errors: {
                404: `The requested resource was not found`,
                500: `Internal server error`,
            },
        });
    }
    /**
     * Create or update a metadata policy operator value.
     * @param entityType The metadata entity type
     * @param claim The metadata claim name
     * @param operator The metadata policy operator name
     * @param requestBody
     * @returns AnyValue Successfully updated operator value.
     * @throws ApiError
     */
    public static changeGeneralMetadataPolicyOperator(
        entityType: string,
        claim: string,
        operator: MetadataPolicyOperatorName,
        requestBody: AnyValue,
    ): CancelablePromise<AnyValue> {
        return __request(OpenAPI, {
            method: 'PUT',
            url: '/api/v1/admin/subordinates/metadata-policies/{entityType}/{claim}/{operator}',
            path: {
                'entityType': entityType,
                'claim': claim,
                'operator': operator,
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
     * Deletes the metadata policy operator value for this claim.
     * @param entityType The metadata entity type
     * @param claim The metadata claim name
     * @param operator The metadata policy operator name
     * @returns void
     * @throws ApiError
     */
    public static deleteGeneralMetadataPolicyOperator(
        entityType: string,
        claim: string,
        operator: MetadataPolicyOperatorName,
    ): CancelablePromise<void> {
        return __request(OpenAPI, {
            method: 'DELETE',
            url: '/api/v1/admin/subordinates/metadata-policies/{entityType}/{claim}/{operator}',
            path: {
                'entityType': entityType,
                'claim': claim,
                'operator': operator,
            },
            errors: {
                500: `Internal server error`,
            },
        });
    }
    /**
     * Get all metadata policy operators for a claim for an entity type.
     * @param entityType The metadata entity type
     * @param claim The metadata claim name
     * @returns MetadataPolicyEntry Successful response.
     * @throws ApiError
     */
    public static getGeneralMetadataPolicyClaim(
        entityType: string,
        claim: string,
    ): CancelablePromise<MetadataPolicyEntry> {
        return __request(OpenAPI, {
            method: 'GET',
            url: '/api/v1/admin/subordinates/metadata-policies/{entityType}/{claim}',
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
     * Create or update the metadata policy entry for a claim.
     * @param entityType The metadata entity type
     * @param claim The metadata claim name
     * @param requestBody
     * @returns MetadataPolicyEntry Successfully updated metadata policy entry for claim.
     * @throws ApiError
     */
    public static changeGeneralMetadataPolicyClaim(
        entityType: string,
        claim: string,
        requestBody: MetadataPolicyEntry,
    ): CancelablePromise<MetadataPolicyEntry> {
        return __request(OpenAPI, {
            method: 'PUT',
            url: '/api/v1/admin/subordinates/metadata-policies/{entityType}/{claim}',
            path: {
                'entityType': entityType,
                'claim': claim,
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
     * Adds the posted operators to the claim's metadata policy entry.
     * @param entityType The metadata entity type
     * @param claim The metadata claim name
     * @param requestBody
     * @returns MetadataPolicyEntry Successfully added operators to the claim's metadata policy entry.
     * @throws ApiError
     */
    public static addGeneralMetadataPolicyOperators(
        entityType: string,
        claim: string,
        requestBody: MetadataPolicyEntry,
    ): CancelablePromise<MetadataPolicyEntry> {
        return __request(OpenAPI, {
            method: 'POST',
            url: '/api/v1/admin/subordinates/metadata-policies/{entityType}/{claim}',
            path: {
                'entityType': entityType,
                'claim': claim,
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
     * Deletes all metadata policy operators for the claim.
     * @param entityType The metadata entity type
     * @param claim The metadata claim name
     * @returns void
     * @throws ApiError
     */
    public static deleteGeneralMetadataPolicyClaim(
        entityType: string,
        claim: string,
    ): CancelablePromise<void> {
        return __request(OpenAPI, {
            method: 'DELETE',
            url: '/api/v1/admin/subordinates/metadata-policies/{entityType}/{claim}',
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
     * Get all metadata policy claims for an entity type
     * @param entityType The metadata entity type
     * @returns EntityTypedMetadataPolicy Successful response
     * @throws ApiError
     */
    public static getGeneralEntityTypedMetadataPolicy(
        entityType: string,
    ): CancelablePromise<EntityTypedMetadataPolicy> {
        return __request(OpenAPI, {
            method: 'GET',
            url: '/api/v1/admin/subordinates/metadata-policies/{entityType}',
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
     * Create or update all metadata policies for an entity type.
     * @param entityType The metadata entity type
     * @param requestBody
     * @returns EntityTypedMetadataPolicy Successfully updated metadata policies for entity type.
     * @throws ApiError
     */
    public static changeGeneralEntityTypedMetadataPolicy(
        entityType: string,
        requestBody: EntityTypedMetadataPolicy,
    ): CancelablePromise<EntityTypedMetadataPolicy> {
        return __request(OpenAPI, {
            method: 'PUT',
            url: '/api/v1/admin/subordinates/metadata-policies/{entityType}',
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
     * Adds the posted metadata policy claims to the entity type's policies.
     * @param entityType The metadata entity type
     * @param requestBody
     * @returns EntityTypedMetadataPolicy Successfully added the claims to the entity type's metadata policies.
     * @throws ApiError
     */
    public static addGeneralMetadataPolicyClaims(
        entityType: string,
        requestBody: EntityTypedMetadataPolicy,
    ): CancelablePromise<EntityTypedMetadataPolicy> {
        return __request(OpenAPI, {
            method: 'POST',
            url: '/api/v1/admin/subordinates/metadata-policies/{entityType}',
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
     * Deletes all metadata policies for the entity type.
     * @param entityType The metadata entity type
     * @returns void
     * @throws ApiError
     */
    public static deleteGeneralEntityTypedMetadataPolicy(
        entityType: string,
    ): CancelablePromise<void> {
        return __request(OpenAPI, {
            method: 'DELETE',
            url: '/api/v1/admin/subordinates/metadata-policies/{entityType}',
            path: {
                'entityType': entityType,
            },
            errors: {
                500: `Internal server error`,
            },
        });
    }
    /**
     * Get general metadata policies published in the entity statement
     * @returns MetadataPolicy Successful response
     * @throws ApiError
     */
    public static getGeneralMetadataPolicies(): CancelablePromise<MetadataPolicy> {
        return __request(OpenAPI, {
            method: 'GET',
            url: '/api/v1/admin/subordinates/metadata-policies',
            errors: {
                500: `Internal server error`,
            },
        });
    }
    /**
     * Update the complete general metadata policies structure.
     * Use with care!
     * @param requestBody
     * @returns MetadataPolicy Successful response
     * @throws ApiError
     */
    public static updateGeneralMetadataPolicies(
        requestBody: MetadataPolicy,
    ): CancelablePromise<MetadataPolicy> {
        return __request(OpenAPI, {
            method: 'PUT',
            url: '/api/v1/admin/subordinates/metadata-policies',
            body: requestBody,
            mediaType: 'application/json',
            errors: {
                400: `Invalid request parameters`,
                500: `Internal server error`,
            },
        });
    }
}
