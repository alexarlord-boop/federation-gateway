/* generated using openapi-typescript-codegen -- do not edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
import type { AddTrustMarkIssuer } from '../models/AddTrustMarkIssuer';
import type { AddTrustMarkIssuerCreate } from '../models/AddTrustMarkIssuerCreate';
import type { AddTrustMarkOwner } from '../models/AddTrustMarkOwner';
import type { AddTrustMarkOwnerCreate } from '../models/AddTrustMarkOwnerCreate';
import type { AddTrustMarkType } from '../models/AddTrustMarkType';
import type { InternalID } from '../models/InternalID';
import type { TrustMarkIssuer } from '../models/TrustMarkIssuer';
import type { TrustMarkOwner } from '../models/TrustMarkOwner';
import type { TrustMarkType } from '../models/TrustMarkType';
import type { CancelablePromise } from '../core/CancelablePromise';
import { OpenAPI } from '../core/OpenAPI';
import { request as __request } from '../core/request';
export class FederationTrustMarksService {
    /**
     * List all TrustMarkTypes
     * Gets a list of all `TrustMarkType` entities.
     * @returns TrustMarkType Successful response - returns an array of `TrustMarkType` entities.
     * @throws ApiError
     */
    public static getTrustMarkTypes(): CancelablePromise<Array<TrustMarkType>> {
        return __request(OpenAPI, {
            method: 'GET',
            url: '/api/v1/admin/trust-marks/types',
            errors: {
                500: `Internal server error`,
            },
        });
    }
    /**
     * Create a TrustMarkType
     * Creates a new instance of a `TrustMarkType`.
     * @param requestBody A new `TrustMarkType` to be created.
     * @returns TrustMarkType Successful response - returns the created `TrustMarkType`.
     * @throws ApiError
     */
    public static createTrustMarkType(
        requestBody: AddTrustMarkType,
    ): CancelablePromise<TrustMarkType> {
        return __request(OpenAPI, {
            method: 'POST',
            url: '/api/v1/admin/trust-marks/types',
            body: requestBody,
            mediaType: 'application/json',
            errors: {
                400: `Invalid request parameters`,
                500: `Internal server error`,
            },
        });
    }
    /**
     * Get a TrustMarkType
     * Gets the details of a single instance of a `TrustMarkType`.
     * @param trustMarkTypeId A unique identifier for a TrustMarkType
     * @returns TrustMarkType Successful response - returns a single `TrustMarkType`.
     * @throws ApiError
     */
    public static getTrustMarkType(
        trustMarkTypeId: InternalID,
    ): CancelablePromise<TrustMarkType> {
        return __request(OpenAPI, {
            method: 'GET',
            url: '/api/v1/admin/trust-marks/types/{trustMarkTypeID}',
            path: {
                'trustMarkTypeID': trustMarkTypeId,
            },
            errors: {
                404: `The requested resource was not found`,
                500: `Internal server error`,
            },
        });
    }
    /**
     * Update a TrustMarkType
     * Updates an existing `TrustMarkType`.
     * @param trustMarkTypeId A unique identifier for a TrustMarkType
     * @param requestBody Updated `TrustMarkType` information.
     * @returns TrustMarkType Successful response - returns the updated `TrustMarkType`.
     * @throws ApiError
     */
    public static updateTrustMarkType(
        trustMarkTypeId: InternalID,
        requestBody: AddTrustMarkType,
    ): CancelablePromise<TrustMarkType> {
        return __request(OpenAPI, {
            method: 'PUT',
            url: '/api/v1/admin/trust-marks/types/{trustMarkTypeID}',
            path: {
                'trustMarkTypeID': trustMarkTypeId,
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
     * Delete a TrustMarkType
     * Deletes an existing `TrustMarkType`.
     * @param trustMarkTypeId A unique identifier for a TrustMarkType
     * @returns void
     * @throws ApiError
     */
    public static deleteTrustMarkType(
        trustMarkTypeId: InternalID,
    ): CancelablePromise<void> {
        return __request(OpenAPI, {
            method: 'DELETE',
            url: '/api/v1/admin/trust-marks/types/{trustMarkTypeID}',
            path: {
                'trustMarkTypeID': trustMarkTypeId,
            },
            errors: {
                404: `The requested resource was not found`,
                500: `Internal server error`,
            },
        });
    }
    /**
     * List all issuers for a TrustMarkType
     * @param trustMarkTypeId A unique identifier for a TrustMarkType
     * @returns TrustMarkIssuer Successful response - returns an array of issuer objects.
     * @throws ApiError
     */
    public static getTrustMarkTypeIssuers(
        trustMarkTypeId: InternalID,
    ): CancelablePromise<Array<TrustMarkIssuer>> {
        return __request(OpenAPI, {
            method: 'GET',
            url: '/api/v1/admin/trust-marks/types/{trustMarkTypeID}/issuers',
            path: {
                'trustMarkTypeID': trustMarkTypeId,
            },
            errors: {
                404: `The requested resource was not found`,
                500: `Internal server error`,
            },
        });
    }
    /**
     * Set issuers list for a TrustMarkType
     * @param trustMarkTypeId A unique identifier for a TrustMarkType
     * @param requestBody
     * @returns TrustMarkIssuer Successfully set the list of issuers for the trust mark type.
     * @throws ApiError
     */
    public static setTrustMarkTypeIssuers(
        trustMarkTypeId: InternalID,
        requestBody: Array<AddTrustMarkIssuer>,
    ): CancelablePromise<Array<TrustMarkIssuer>> {
        return __request(OpenAPI, {
            method: 'PUT',
            url: '/api/v1/admin/trust-marks/types/{trustMarkTypeID}/issuers',
            path: {
                'trustMarkTypeID': trustMarkTypeId,
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
     * Add an issuer to a TrustMarkType
     * @param trustMarkTypeId A unique identifier for a TrustMarkType
     * @param requestBody
     * @returns TrustMarkIssuer Successfully added issuer to the trust mark type.
     * @throws ApiError
     */
    public static addTrustMarkTypeIssuer(
        trustMarkTypeId: InternalID,
        requestBody: AddTrustMarkIssuer,
    ): CancelablePromise<Array<TrustMarkIssuer>> {
        return __request(OpenAPI, {
            method: 'POST',
            url: '/api/v1/admin/trust-marks/types/{trustMarkTypeID}/issuers',
            path: {
                'trustMarkTypeID': trustMarkTypeId,
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
     * Delete an issuer for a TrustMarkType
     * @param trustMarkTypeId A unique identifier for a TrustMarkType
     * @param issuerId The internal ID of the trust mark issuer
     * @returns TrustMarkIssuer Successfully deleted issuer for the trust mark type. Response contains updated list.
     * @throws ApiError
     */
    public static deleteTrustMarkTypeIssuer(
        trustMarkTypeId: InternalID,
        issuerId: InternalID,
    ): CancelablePromise<Array<TrustMarkIssuer>> {
        return __request(OpenAPI, {
            method: 'DELETE',
            url: '/api/v1/admin/trust-marks/types/{trustMarkTypeID}/issuers/{issuerID}',
            path: {
                'trustMarkTypeID': trustMarkTypeId,
                'issuerID': issuerId,
            },
            errors: {
                404: `The requested resource was not found`,
                500: `Internal server error`,
            },
        });
    }
    /**
     * @returns TrustMarkOwner Successful response - returns all owners.
     * @throws ApiError
     */
    public static getApiV1AdminTrustMarksOwners(): CancelablePromise<Array<TrustMarkOwner>> {
        return __request(OpenAPI, {
            method: 'GET',
            url: '/api/v1/admin/trust-marks/owners',
        });
    }
    /**
     * @param requestBody
     * @returns TrustMarkOwner Created owner.
     * @throws ApiError
     */
    public static postApiV1AdminTrustMarksOwners(
        requestBody?: AddTrustMarkOwnerCreate,
    ): CancelablePromise<TrustMarkOwner> {
        return __request(OpenAPI, {
            method: 'POST',
            url: '/api/v1/admin/trust-marks/owners',
            body: requestBody,
            mediaType: 'application/json',
        });
    }
    /**
     * @param ownerId The internal ID of the trust mark owner
     * @returns TrustMarkOwner Owner.
     * @throws ApiError
     */
    public static getApiV1AdminTrustMarksOwners1(
        ownerId: InternalID,
    ): CancelablePromise<TrustMarkOwner> {
        return __request(OpenAPI, {
            method: 'GET',
            url: '/api/v1/admin/trust-marks/owners/{ownerID}',
            path: {
                'ownerID': ownerId,
            },
            errors: {
                404: `The requested resource was not found`,
            },
        });
    }
    /**
     * @param ownerId The internal ID of the trust mark owner
     * @param requestBody
     * @returns TrustMarkOwner Updated owner.
     * @throws ApiError
     */
    public static putApiV1AdminTrustMarksOwners(
        ownerId: InternalID,
        requestBody: AddTrustMarkOwnerCreate,
    ): CancelablePromise<TrustMarkOwner> {
        return __request(OpenAPI, {
            method: 'PUT',
            url: '/api/v1/admin/trust-marks/owners/{ownerID}',
            path: {
                'ownerID': ownerId,
            },
            body: requestBody,
            mediaType: 'application/json',
            errors: {
                404: `The requested resource was not found`,
            },
        });
    }
    /**
     * @param ownerId The internal ID of the trust mark owner
     * @returns void
     * @throws ApiError
     */
    public static deleteApiV1AdminTrustMarksOwners(
        ownerId: InternalID,
    ): CancelablePromise<void> {
        return __request(OpenAPI, {
            method: 'DELETE',
            url: '/api/v1/admin/trust-marks/owners/{ownerID}',
            path: {
                'ownerID': ownerId,
            },
            errors: {
                404: `The requested resource was not found`,
            },
        });
    }
    /**
     * List trust mark types linked to owner
     * @param ownerId The internal ID of the trust mark owner
     * @returns TrustMarkType Successful response - returns an array of linked TrustMarkType entities.
     * @throws ApiError
     */
    public static listOwnerTypes(
        ownerId: InternalID,
    ): CancelablePromise<Array<TrustMarkType>> {
        return __request(OpenAPI, {
            method: 'GET',
            url: '/api/v1/admin/trust-marks/owners/{ownerID}/types',
            path: {
                'ownerID': ownerId,
            },
        });
    }
    /**
     * Replace owner’s trust mark type links
     * @param ownerId The internal ID of the trust mark owner
     * @param requestBody
     * @returns TrustMarkType Successfully replaced the list of TrustMarkTypes linked to the owner.
     * @throws ApiError
     */
    public static setOwnerTypes(
        ownerId: InternalID,
        requestBody: Array<InternalID>,
    ): CancelablePromise<Array<TrustMarkType>> {
        return __request(OpenAPI, {
            method: 'PUT',
            url: '/api/v1/admin/trust-marks/owners/{ownerID}/types',
            path: {
                'ownerID': ownerId,
            },
            body: requestBody,
            mediaType: 'application/json',
        });
    }
    /**
     * Add a trust mark type link to owner
     * @param ownerId The internal ID of the trust mark owner
     * @param requestBody
     * @returns TrustMarkType Successfully added the TrustMarkType link to the owner. Response contains updated list.
     * @throws ApiError
     */
    public static addOwnerType(
        ownerId: InternalID,
        requestBody: InternalID,
    ): CancelablePromise<Array<TrustMarkType>> {
        return __request(OpenAPI, {
            method: 'POST',
            url: '/api/v1/admin/trust-marks/owners/{ownerID}/types',
            path: {
                'ownerID': ownerId,
            },
            body: requestBody,
            mediaType: 'application/json',
        });
    }
    /**
     * Unlink a trust mark type from owner
     * @param ownerId The internal ID of the trust mark owner
     * @param trustMarkTypeId A unique identifier for a TrustMarkType
     * @returns void
     * @throws ApiError
     */
    public static unlinkOwnerType(
        ownerId: InternalID,
        trustMarkTypeId: InternalID,
    ): CancelablePromise<void> {
        return __request(OpenAPI, {
            method: 'DELETE',
            url: '/api/v1/admin/trust-marks/owners/{ownerID}/types/{trustMarkTypeID}',
            path: {
                'ownerID': ownerId,
                'trustMarkTypeID': trustMarkTypeId,
            },
        });
    }
    /**
     * @returns TrustMarkIssuer
     * @throws ApiError
     */
    public static getApiV1AdminTrustMarksIssuers(): CancelablePromise<Array<TrustMarkIssuer>> {
        return __request(OpenAPI, {
            method: 'GET',
            url: '/api/v1/admin/trust-marks/issuers',
        });
    }
    /**
     * @param requestBody
     * @returns TrustMarkIssuer
     * @throws ApiError
     */
    public static postApiV1AdminTrustMarksIssuers(
        requestBody: AddTrustMarkIssuerCreate,
    ): CancelablePromise<TrustMarkIssuer> {
        return __request(OpenAPI, {
            method: 'POST',
            url: '/api/v1/admin/trust-marks/issuers',
            body: requestBody,
            mediaType: 'application/json',
        });
    }
    /**
     * @param issuerId The internal ID of the trust mark issuer
     * @returns TrustMarkIssuer
     * @throws ApiError
     */
    public static getApiV1AdminTrustMarksIssuers1(
        issuerId: InternalID,
    ): CancelablePromise<TrustMarkIssuer> {
        return __request(OpenAPI, {
            method: 'GET',
            url: '/api/v1/admin/trust-marks/issuers/{issuerID}',
            path: {
                'issuerID': issuerId,
            },
            errors: {
                404: `The requested resource was not found`,
            },
        });
    }
    /**
     * @param issuerId The internal ID of the trust mark issuer
     * @param requestBody
     * @returns TrustMarkIssuer
     * @throws ApiError
     */
    public static putApiV1AdminTrustMarksIssuers(
        issuerId: InternalID,
        requestBody: AddTrustMarkIssuerCreate,
    ): CancelablePromise<TrustMarkIssuer> {
        return __request(OpenAPI, {
            method: 'PUT',
            url: '/api/v1/admin/trust-marks/issuers/{issuerID}',
            path: {
                'issuerID': issuerId,
            },
            body: requestBody,
            mediaType: 'application/json',
            errors: {
                404: `The requested resource was not found`,
            },
        });
    }
    /**
     * @param issuerId The internal ID of the trust mark issuer
     * @returns void
     * @throws ApiError
     */
    public static deleteApiV1AdminTrustMarksIssuers(
        issuerId: InternalID,
    ): CancelablePromise<void> {
        return __request(OpenAPI, {
            method: 'DELETE',
            url: '/api/v1/admin/trust-marks/issuers/{issuerID}',
            path: {
                'issuerID': issuerId,
            },
            errors: {
                404: `The requested resource was not found`,
            },
        });
    }
    /**
     * List trust mark types linked to issuer
     * @param issuerId The internal ID of the trust mark issuer
     * @returns TrustMarkType Successful response - returns an array of linked TrustMarkType entities.
     * @throws ApiError
     */
    public static listIssuerTypes(
        issuerId: InternalID,
    ): CancelablePromise<Array<TrustMarkType>> {
        return __request(OpenAPI, {
            method: 'GET',
            url: '/api/v1/admin/trust-marks/issuers/{issuerID}/types',
            path: {
                'issuerID': issuerId,
            },
        });
    }
    /**
     * Replace issuer’s trust mark type links
     * @param issuerId The internal ID of the trust mark issuer
     * @param requestBody
     * @returns TrustMarkType Successfully replaced the list of TrustMarkTypes linked to the issuer.
     * @throws ApiError
     */
    public static setIssuerTypes(
        issuerId: InternalID,
        requestBody: Array<InternalID>,
    ): CancelablePromise<Array<TrustMarkType>> {
        return __request(OpenAPI, {
            method: 'PUT',
            url: '/api/v1/admin/trust-marks/issuers/{issuerID}/types',
            path: {
                'issuerID': issuerId,
            },
            body: requestBody,
            mediaType: 'application/json',
        });
    }
    /**
     * Add a trust mark type link to issuer
     * @param issuerId The internal ID of the trust mark issuer
     * @param requestBody
     * @returns TrustMarkType Successfully added the TrustMarkType link to the issuer. Response contains updated list.
     * @throws ApiError
     */
    public static addIssuerType(
        issuerId: InternalID,
        requestBody: InternalID,
    ): CancelablePromise<Array<TrustMarkType>> {
        return __request(OpenAPI, {
            method: 'POST',
            url: '/api/v1/admin/trust-marks/issuers/{issuerID}/types',
            path: {
                'issuerID': issuerId,
            },
            body: requestBody,
            mediaType: 'application/json',
        });
    }
    /**
     * Unlink a trust mark type from issuer
     * @param issuerId The internal ID of the trust mark issuer
     * @param trustMarkTypeId A unique identifier for a TrustMarkType
     * @returns void
     * @throws ApiError
     */
    public static unlinkIssuerType(
        issuerId: InternalID,
        trustMarkTypeId: InternalID,
    ): CancelablePromise<void> {
        return __request(OpenAPI, {
            method: 'DELETE',
            url: '/api/v1/admin/trust-marks/issuers/{issuerID}/types/{trustMarkTypeID}',
            path: {
                'issuerID': issuerId,
                'trustMarkTypeID': trustMarkTypeId,
            },
        });
    }
    /**
     * Get trust mark type owner
     * @param trustMarkTypeId A unique identifier for a `TrustMarkType`.
     * @returns TrustMarkOwner Successful response - returns the `TrustMarkOwner`.
     * @throws ApiError
     */
    public static getTrustMarkOwner(
        trustMarkTypeId: InternalID,
    ): CancelablePromise<TrustMarkOwner> {
        return __request(OpenAPI, {
            method: 'GET',
            url: '/api/v1/admin/trust-marks/types/{trustMarkTypeID}/owner',
            path: {
                'trustMarkTypeID': trustMarkTypeId,
            },
            errors: {
                404: `The requested resource was not found`,
                500: `Internal server error`,
            },
        });
    }
    /**
     * Update trust mark type owner
     * @param trustMarkTypeId A unique identifier for a `TrustMarkType`.
     * @param requestBody Updated `TrustMarkOwner` information.
     * @returns TrustMarkOwner Successful response - returns the updated `TrustMarkOwner`.
     * @throws ApiError
     */
    public static updateTrustMarkOwner(
        trustMarkTypeId: InternalID,
        requestBody: AddTrustMarkOwnerCreate,
    ): CancelablePromise<TrustMarkOwner> {
        return __request(OpenAPI, {
            method: 'PUT',
            url: '/api/v1/admin/trust-marks/types/{trustMarkTypeID}/owner',
            path: {
                'trustMarkTypeID': trustMarkTypeId,
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
     * Create trust mark type owner
     * @param trustMarkTypeId A unique identifier for a `TrustMarkType`.
     * @param requestBody A new `TrustMarkOwner` to be created.
     * @returns TrustMarkOwner Successful response - returns the created `TrustMarkOwner`.
     * @throws ApiError
     */
    public static createTrustMarkOwner(
        trustMarkTypeId: InternalID,
        requestBody: AddTrustMarkOwner,
    ): CancelablePromise<TrustMarkOwner> {
        return __request(OpenAPI, {
            method: 'POST',
            url: '/api/v1/admin/trust-marks/types/{trustMarkTypeID}/owner',
            path: {
                'trustMarkTypeID': trustMarkTypeId,
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
     * Delete trust mark type owner
     * @param trustMarkTypeId A unique identifier for a `TrustMarkType`.
     * @returns void
     * @throws ApiError
     */
    public static deleteTrustMarkOwner(
        trustMarkTypeId: InternalID,
    ): CancelablePromise<void> {
        return __request(OpenAPI, {
            method: 'DELETE',
            url: '/api/v1/admin/trust-marks/types/{trustMarkTypeID}/owner',
            path: {
                'trustMarkTypeID': trustMarkTypeId,
            },
            errors: {
                404: `The requested resource was not found`,
                500: `Internal server error`,
            },
        });
    }
}
