/**
 * The public GET /api/v1/companies/{nzbn} payload. Each related table's rows keep the upper-case
 * column names of the Companies Office CSV files (see backend/app/api/api_v1/endpoints/companies.py),
 * so the shapes below list the columns pages rely on and leave the rest open.
 */

export interface Address {
    START_DATE?: string | null;
    // Registered office: REGISTERED_OFFICE_ADDRESS_ADDRESS_1..4, _POSTCODE, _COUNTRY, _CARE_OF
    REGISTERED_OFFICE_ADDRESS_CARE_OF?: string | null;
    REGISTERED_OFFICE_ADDRESS_ADDRESS_1?: string | null;
    REGISTERED_OFFICE_ADDRESS_ADDRESS_2?: string | null;
    REGISTERED_OFFICE_ADDRESS_ADDRESS_3?: string | null;
    REGISTERED_OFFICE_ADDRESS_ADDRESS_4?: string | null;
    REGISTERED_OFFICE_ADDRESS_POSTCODE?: string | null;
    REGISTERED_OFFICE_ADDRESS_COUNTRY?: string | null;
    // Address for service: ADDRESS_FOR_SERVICE_1..4, _POSTCODE, _COUNTRY, _CARE_OF
    ADDRESS_FOR_SERVICE_CARE_OF?: string | null;
    ADDRESS_FOR_SERVICE_1?: string | null;
    ADDRESS_FOR_SERVICE_POSTCODE?: string | null;
    ADDRESS_FOR_SERVICE_COUNTRY?: string | null;
    // Public addresses: TYPE (OFFICE / POSTAL / DELIVERY / INVOICE), ADDRESS_1..4, ADDRESS_POSTCODE, ADDRESS_COUNTRY
    TYPE?: string | null;
    ADDRESS_CARE_OF?: string | null;
    ADDRESS_1?: string | null;
    ADDRESS_POSTCODE?: string | null;
    ADDRESS_COUNTRY?: string | null;
    [column: string]: string | null | undefined;
}

export interface Director {
    FIRST_NAME?: string | null;
    MIDDLE_NAMES?: string | null;
    LAST_NAME?: string | null;
    START_DATE?: string | null;
    ASIC_DIR_YN?: string | null;
    ACN?: string | null;
    ASIC_COMPANY_NAME?: string | null;
}

export interface Shareholder {
    SH_NAME: string;
    SH_TYPE?: string | null;
    NUMBER_OF_SHARES: string;
    START_DATE?: string | null;
    SH_STATUS?: string | null;
    PARCEL_IDENTIFIER?: string | null;
}

export interface IndustryClassification {
    ANZSIC_CODE: string;
    ANZSIC_DESCRIPTION: string;
    START_DATE?: string | null;
}

export interface GST {
    GST_NUMBER: string;
    START_DATE?: string | null;
}

export interface TradingName {
    TRADING_NAME: string;
    START_DATE?: string | null;
}

export interface Website {
    WEBSITE: string;
    START_DATE?: string | null;
}

export interface TradingArea {
    TRADING_AREA: string;
}

export interface Insolvency {
    INSOLVENCY_TYPE?: string | null;
    APPOINTMENT_TYPE?: string | null;
    APPOINTEE_FIRST_NAME?: string | null;
    APPOINTEE_MIDDLE_NAMES?: string | null;
    APPOINTEE_LAST_NAME?: string | null;
    ORGANISATION?: string | null;
    APPOINTMENT_DATE?: string | null;
    APPOINTMENT_VACATED_DATE?: string | null;
}

export interface MaoriBusiness {
    NZBN: string;
    START_DATE?: string | null;
    // Bulk data releases have used both a single IDENTIFYING_FACTOR column and numbered
    // IDENTIFYING_FACTOR_1..9 columns.
    IDENTIFYING_FACTOR?: string | null;
    [factor: `IDENTIFYING_FACTOR_${number}`]: string | null | undefined;
    IDENTIFYING_FACTOR_FREE_TEXT?: string | null;
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export type RegisterRow = Record<string, any>;

export interface CompanyDetails {
    NZBN: string;
    COMPANY_IDENTIFIER?: string | null;
    ENTITY_NAME: string;
    ENTITY_STATUS: string;
    ENTITY_TYPE: string;
    REGISTRATION_DATE: string | null;
    REMOVAL_DATE?: string | null;

    abn?: { ABN: string } | null;
    gst?: GST | null;
    industry_classification: IndustryClassification[];
    trading_names: TradingName[];
    websites: Website[];
    trading_areas: TradingArea[];
    addresses: {
        service: Address[];
        public: Address[];
        office: Address[];
    };
    directors: Director[];
    shareholders: Shareholder[];
    insolvency: Insolvency[];
    special_entity: {
        maori_business?: MaoriBusiness | null;
        other_incorporated?: RegisterRow | null;
        charitable_trust_board?: RegisterRow | null;
        public_sector?: RegisterRow | null;
        unincorporated?: RegisterRow | null;
    };
}
