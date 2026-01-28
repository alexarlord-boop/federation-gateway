/* generated using openapi-typescript-codegen -- do not edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
import type { EntityTypedMetadata } from './EntityTypedMetadata';
/**
 *  JSON object that declares roles that the Entity plays - its Entity Types - and that contains metadata for those Entity Types. Each member name of the JSON object is an Entity Type Identifier, and each value MUST be a JSON object containing metadata parameters according to the metadata schema of the Entity Type.
 */
export type Metadata = Record<string, EntityTypedMetadata>;
