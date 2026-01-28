/* generated using openapi-typescript-codegen -- do not edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
/**
 * Metadata Claims that can be used with any Entity Type
 */
export type CommonMetadata = {
    /**
     * A human-readable name representing the organization owning this Entity. If the owner is a physical person, this MAY be, for example, the person's name.
     */
    organization_name?: string;
    /**
     * A human-readable name of the Entity to be presented to the End-User.
     */
    display_name?: string;
    /**
     * A human-readable brief description of this Entity presentable to the End-User.
     */
    description?: string;
    /**
     * JSON array with one or more strings representing search keywords, tags, categories, or labels that apply to this Entity.
     */
    keywords?: Array<string>;
    /**
     * JSON array with one or more strings representing contact persons at the Entity. These MAY contain names, e-mail addresses, descriptions, phone numbers, etc.
     */
    contacts?: Array<string>;
    /**
     * A URL that points to the logo of this Entity. The file containing the logo SHOULD be published in a format that can be viewed via the web.
     */
    logo_uri?: string;
    /**
     * URL of the documentation of conditions and policies relevant to this Entity.
     */
    policy_uri?: string;
    /**
     * URL for documentation of additional information about this Entity viewable by the End-User.
     */
    information_uri?: string;
    /**
     * URL of a Web page for the organization owning this Entity.
     */
    organization_uri?: string;
};

