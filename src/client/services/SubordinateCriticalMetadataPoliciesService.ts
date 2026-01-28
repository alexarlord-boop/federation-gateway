/* generated using openapi-typescript-codegen -- do not edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
import type { MetadataPolicyOperatorName } from '../models/MetadataPolicyOperatorName';
import type { CancelablePromise } from '../core/CancelablePromise';
import { OpenAPI } from '../core/OpenAPI';
import { request as __request } from '../core/request';
export class SubordinateCriticalMetadataPoliciesService {
    /**
     * List all critical metadata policy operators
     * Gets a list of all critical metadata policy operator names.
     * @returns MetadataPolicyOperatorName Successful response - returns an array of critical metadata policy operators.
     * @throws ApiError
     */
    public static getCriticalMetadataPolicyOperators(): CancelablePromise<Array<MetadataPolicyOperatorName>> {
        return __request(OpenAPI, {
            method: 'GET',
            url: '/api/v1/admin/subordinates/metadata-policy-crit',
        });
    }
    /**
     * Create or Update critical metadata policy operators
     * @param requestBody
     * @returns MetadataPolicyOperatorName Successful response - returns an array of critical metadata policy operators.
     * @throws ApiError
     */
    public static setCriticalMetadataPolicyOperators(
        requestBody: Array<MetadataPolicyOperatorName>,
    ): CancelablePromise<Array<MetadataPolicyOperatorName>> {
        return __request(OpenAPI, {
            method: 'PUT',
            url: '/api/v1/admin/subordinates/metadata-policy-crit',
            body: requestBody,
            mediaType: 'application/json',
            errors: {
                400: `Invalid request parameters`,
            },
        });
    }
    /**
     * Create a critical metadata policy operator
     * Creates a new critical metadata policy operator entry.
     * @param requestBody A new critical metadata policy operator to be created.
     * @returns any Successful response.
     * @throws ApiError
     */
    public static createCriticalMetadataPolicyOperator(
        requestBody: MetadataPolicyOperatorName,
    ): CancelablePromise<any> {
        return __request(OpenAPI, {
            method: 'POST',
            url: '/api/v1/admin/subordinates/metadata-policy-crit',
            body: requestBody,
            mediaType: 'application/json',
            errors: {
                400: `Invalid request parameters`,
            },
        });
    }
    /**
     * Delete a critical metadata policy operator
     * Deletes an existing critical metadata policy operator entry.
     * @param operator The critical metadata policy operator to be deleted.
     * @returns void
     * @throws ApiError
     */
    public static deleteCriticalMetadataPolicyOperator(
        operator: MetadataPolicyOperatorName,
    ): CancelablePromise<void> {
        return __request(OpenAPI, {
            method: 'DELETE',
            url: '/api/v1/admin/subordinates/metadata-policy-crit/{operator}',
            path: {
                'operator': operator,
            },
        });
    }
}
