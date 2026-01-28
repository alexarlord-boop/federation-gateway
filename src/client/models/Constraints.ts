/* generated using openapi-typescript-codegen -- do not edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
import type { AllowedEntityTypes } from './AllowedEntityTypes';
import type { NamingConstraints } from './NamingConstraints';
/**
 * A set of constraints applied to subordinate entities. Additional parameters MAY be defined.
 */
export type Constraints = {
    /**
     * Integer specifying the maximum number of Intermediate Entities between the Entity setting the constraint and the Trust Chain subject.
     */
    max_path_length?: number;
    /**
     * Restrictions on the URIs of the Entity Identifiers of Subordinate Entities.
     */
    naming_constraints?: NamingConstraints;
    /**
     * Entity Type Identifiers that Subordinate Entities are allowed to have.
     */
    allowed_entity_types?: AllowedEntityTypes;
};

