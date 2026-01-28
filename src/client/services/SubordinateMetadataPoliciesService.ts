/* generated using openapi-typescript-codegen -- do not edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
import type { AnyValue } from '../models/AnyValue';
import type { EntityTypedMetadataPolicy } from '../models/EntityTypedMetadataPolicy';
import type { InternalID } from '../models/InternalID';
import type { MetadataPolicy } from '../models/MetadataPolicy';
import type { MetadataPolicyEntry } from '../models/MetadataPolicyEntry';
import type { MetadataPolicyOperatorName } from '../models/MetadataPolicyOperatorName';
import type { CancelablePromise } from '../core/CancelablePromise';
import { OpenAPI } from '../core/OpenAPI';
import { request as __request } from '../core/request';
export class SubordinateMetadataPoliciesService {
    /**
     * Gets the value of a single metadata policy operator for a subordinate-specific claim.
     * @param subordinateId The id of the subordinate
     * @param entityType The metadata entity type
     * @param claim The metadata claim name
     * @param operator The metadata policy operator name
     * @returns AnyValue Successful response.
     * @throws ApiError
     */
    public static getSubordinateMetadataPolicyOperator(
        subordinateId: InternalID,
        entityType: string,
        claim: string,
        operator: MetadataPolicyOperatorName,
    ): CancelablePromise<AnyValue> {
        return __request(OpenAPI, {
            method: 'GET',
            url: '/api/v1/admin/subordinates/{subordinateID}/metadata-policies/{entityType}/{claim}/{operator}',
            path: {
                'subordinateID': subordinateId,
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
     * Create or update a subordinate-specific metadata policy operator value.
     * @param subordinateId The id of the subordinate
     * @param entityType The metadata entity type
     * @param claim The metadata claim name
     * @param operator The metadata policy operator name
     * @param requestBody
     * @returns AnyValue Successfully updated operator value.
     * @throws ApiError
     */
    public static changeSubordinateMetadataPolicyOperator(
        subordinateId: InternalID,
        entityType: string,
        claim: string,
        operator: MetadataPolicyOperatorName,
        requestBody: AnyValue,
    ): CancelablePromise<AnyValue> {
        return __request(OpenAPI, {
            method: 'PUT',
            url: '/api/v1/admin/subordinates/{subordinateID}/metadata-policies/{entityType}/{claim}/{operator}',
            path: {
                'subordinateID': subordinateId,
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
     * Deletes the subordinate-specific metadata policy operator value for this claim.
     * @param subordinateId The id of the subordinate
     * @param entityType The metadata entity type
     * @param claim The metadata claim name
     * @param operator The metadata policy operator name
     * @returns void
     * @throws ApiError
     */
    public static deleteSubordinateMetadataPolicyOperator(
        subordinateId: InternalID,
        entityType: string,
        claim: string,
        operator: MetadataPolicyOperatorName,
    ): CancelablePromise<void> {
        return __request(OpenAPI, {
            method: 'DELETE',
            url: '/api/v1/admin/subordinates/{subordinateID}/metadata-policies/{entityType}/{claim}/{operator}',
            path: {
                'subordinateID': subordinateId,
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
     * Get all metadata policy operators for a subordinate-specific claim for an entity type.
     * @param subordinateId The id of the subordinate
     * @param entityType The metadata entity type
     * @param claim The metadata claim name
     * @returns MetadataPolicyEntry Successful response.
     * @throws ApiError
     */
    public static getSubordinateMetadataPolicyClaim(
        subordinateId: InternalID,
        entityType: string,
        claim: string,
    ): CancelablePromise<MetadataPolicyEntry> {
        return __request(OpenAPI, {
            method: 'GET',
            url: '/api/v1/admin/subordinates/{subordinateID}/metadata-policies/{entityType}/{claim}',
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
     * Create or update the subordinate-specific metadata policy entry for a claim.
     * @param subordinateId The id of the subordinate
     * @param entityType The metadata entity type
     * @param claim The metadata claim name
     * @param requestBody
     * @returns MetadataPolicyEntry Successfully updated metadata policy entry for claim.
     * @throws ApiError
     */
    public static changeSubordinateMetadataPolicyClaim(
        subordinateId: InternalID,
        entityType: string,
        claim: string,
        requestBody: MetadataPolicyEntry,
    ): CancelablePromise<MetadataPolicyEntry> {
        return __request(OpenAPI, {
            method: 'PUT',
            url: '/api/v1/admin/subordinates/{subordinateID}/metadata-policies/{entityType}/{claim}',
            path: {
                'subordinateID': subordinateId,
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
     * Adds the posted operators to the subordinate-specific claim's metadata policy entry.
     * @param subordinateId The id of the subordinate
     * @param entityType The metadata entity type
     * @param claim The metadata claim name
     * @param requestBody
     * @returns MetadataPolicyEntry Successfully added operators to the claim's metadata policy entry.
     * @throws ApiError
     */
    public static addSubordinateMetadataPolicyOperators(
        subordinateId: InternalID,
        entityType: string,
        claim: string,
        requestBody: MetadataPolicyEntry,
    ): CancelablePromise<MetadataPolicyEntry> {
        return __request(OpenAPI, {
            method: 'POST',
            url: '/api/v1/admin/subordinates/{subordinateID}/metadata-policies/{entityType}/{claim}',
            path: {
                'subordinateID': subordinateId,
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
     * Deletes all subordinate-specific metadata policy operators for the claim.
     * @param subordinateId The id of the subordinate
     * @param entityType The metadata entity type
     * @param claim The metadata claim name
     * @returns void
     * @throws ApiError
     */
    public static deleteSubordinateMetadataPolicyClaim(
        subordinateId: InternalID,
        entityType: string,
        claim: string,
    ): CancelablePromise<void> {
        return __request(OpenAPI, {
            method: 'DELETE',
            url: '/api/v1/admin/subordinates/{subordinateID}/metadata-policies/{entityType}/{claim}',
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
     * Get all subordinate-specific metadata policy claims for an entity type
     * @param subordinateId The id of the subordinate
     * @param entityType The metadata entity type
     * @returns EntityTypedMetadataPolicy Successful response
     * @throws ApiError
     */
    public static getSubordinateEntityTypedMetadataPolicy(
        subordinateId: InternalID,
        entityType: string,
    ): CancelablePromise<EntityTypedMetadataPolicy> {
        return __request(OpenAPI, {
            method: 'GET',
            url: '/api/v1/admin/subordinates/{subordinateID}/metadata-policies/{entityType}',
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
     * Create or update all subordinate-specific metadata policies for an entity type.
     * @param subordinateId The id of the subordinate
     * @param entityType The metadata entity type
     * @param requestBody
     * @returns EntityTypedMetadataPolicy Successfully updated metadata policies for entity type.
     * @throws ApiError
     */
    public static changeSubordinateEntityTypedMetadataPolicy(
        subordinateId: InternalID,
        entityType: string,
        requestBody: EntityTypedMetadataPolicy,
    ): CancelablePromise<EntityTypedMetadataPolicy> {
        return __request(OpenAPI, {
            method: 'PUT',
            url: '/api/v1/admin/subordinates/{subordinateID}/metadata-policies/{entityType}',
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
     * Adds the posted metadata policy claims to the subordinate-specific entity type's policies.
     * @param subordinateId The id of the subordinate
     * @param entityType The metadata entity type
     * @param requestBody
     * @returns EntityTypedMetadataPolicy Successfully added the claims to the entity type's metadata policies.
     * @throws ApiError
     */
    public static addSubordinateMetadataPolicyClaims(
        subordinateId: InternalID,
        entityType: string,
        requestBody: EntityTypedMetadataPolicy,
    ): CancelablePromise<EntityTypedMetadataPolicy> {
        return __request(OpenAPI, {
            method: 'POST',
            url: '/api/v1/admin/subordinates/{subordinateID}/metadata-policies/{entityType}',
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
     * Deletes all subordinate-specific metadata policies for the entity type.
     * @param subordinateId The id of the subordinate
     * @param entityType The metadata entity type
     * @returns void
     * @throws ApiError
     */
    public static deleteSubordinateEntityTypedMetadataPolicy(
        subordinateId: InternalID,
        entityType: string,
    ): CancelablePromise<void> {
        return __request(OpenAPI, {
            method: 'DELETE',
            url: '/api/v1/admin/subordinates/{subordinateID}/metadata-policies/{entityType}',
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
     * Get subordinate-specific metadata policies published in the entity statement
     * @param subordinateId The id of the subordinate
     * @returns MetadataPolicy Successful response
     * @throws ApiError
     */
    public static getSubordinateMetadataPolicies(
        subordinateId: InternalID,
    ): CancelablePromise<MetadataPolicy> {
        return __request(OpenAPI, {
            method: 'GET',
            url: '/api/v1/admin/subordinates/{subordinateID}/metadata-policies',
            path: {
                'subordinateID': subordinateId,
            },
            errors: {
                500: `Internal server error`,
            },
        });
    }
    /**
     * Update the complete subordinate-specific metadata policies structure.
     * Use with care!
     * @param subordinateId The id of the subordinate
     * @param requestBody
     * @returns MetadataPolicy Successful response
     * @throws ApiError
     */
    public static updateSubordinateMetadataPolicies(
        subordinateId: InternalID,
        requestBody: MetadataPolicy,
    ): CancelablePromise<MetadataPolicy> {
        return __request(OpenAPI, {
            method: 'PUT',
            url: '/api/v1/admin/subordinates/{subordinateID}/metadata-policies',
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
    /**
     * Copy general metadata policies to this subordinate.
     * Copies the general metadata policies and sets them specifically for this subordinate.
     * @param subordinateId The id of the subordinate
     * @returns MetadataPolicy Successfully copied general metadata policies to subordinate.
     * @throws ApiError
     */
    public static copyGeneralMetadataPoliciesToSubordinate(
        subordinateId: InternalID,
    ): CancelablePromise<MetadataPolicy> {
        return __request(OpenAPI, {
            method: 'POST',
            url: '/api/v1/admin/subordinates/{subordinateID}/metadata-policies',
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
     * Deletes all subordinate-specific metadata policies.
     * @param subordinateId The id of the subordinate
     * @returns void
     * @throws ApiError
     */
    public static deleteSubordinateMetadataPolicies(
        subordinateId: InternalID,
    ): CancelablePromise<void> {
        return __request(OpenAPI, {
            method: 'DELETE',
            url: '/api/v1/admin/subordinates/{subordinateID}/metadata-policies',
            path: {
                'subordinateID': subordinateId,
            },
            errors: {
                404: `The requested resource was not found`,
                500: `Internal server error`,
            },
        });
    }
}
