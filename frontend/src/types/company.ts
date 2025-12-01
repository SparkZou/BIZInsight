export interface Address {
    // Service Address Fields
    ADDRESS_FOR_SERVICE_1?: string;
    ADDRESS_FOR_SERVICE_2?: string;
    ADDRESS_FOR_SERVICE_POSTCODE?: string;
    ADDRESS_FOR_SERVICE_COUNTRY?: string;

    // Registered Office Fields
    REGISTERED_OFFICE_ADDRESS_ADDRESS_1?: string;
    REGISTERED_OFFICE_ADDRESS_ADDRESS_2?: string;
    REGISTERED_OFFICE_ADDRESS_POSTCODE?: string;
    REGISTERED_OFFICE_ADDRESS_COUNTRY?: string;

    ADDRESS_TYPE?: string; // 'Service', 'Public', 'Office'
}

export interface Director {
    FIRST_NAME: string;
    MIDDLE_NAMES?: string;
    LAST_NAME: string;
    START_DATE: string;
    ASIC_DIR_YN?: string;
    ACN?: number;
    ASIC_COMPANY_NAME?: string;
}

export interface Shareholder {
    SHAREHOLDER_1_FIRST_NAMES: string;
    SHAREHOLDER_1_LAST_NAME: string;
    TOTAL_SHARES: string;
    SHARE_ALLOCATION?: number;
}

export interface IndustryClassification {
    ANZSIC_CODE: string;
    ANZSIC_DESCRIPTION: string;
}

export interface ABN {
    ABN: string;
    STATUS: string;
}

export interface GST {
    GST_REGISTRATION_DATE: string;
    GST_STATUS_CODE: string;
}

export interface TradingName {
    TRADING_NAME: string;
    START_DATE?: string;
}

export interface Website {
    WEBSITE: string;
    START_DATE?: string;
}

export interface TradingArea {
    TRADING_AREA: string;
}

export interface Insolvency {
    INSOLVENCY_TYPE: string;
    DATE_APPOINTED: string;
    PRACTITIONER_NAME?: string;
    PRACTITIONER_FIRM?: string;
}

export interface MaoriBusiness {
    MAORI_BUSINESS_INDICATOR: string;
}

export interface CompanyDetails {
    NZBN: string;
    ENTITY_NAME: string;
    ENTITY_STATUS: string;
    ENTITY_TYPE: string;
    REGISTRATION_DATE: string;

    // Extensions
    abn?: ABN;
    industry_classification: IndustryClassification[];
    gst?: GST;
    trading_names: TradingName[];
    websites: Website[];

    // Addresses
    addresses: {
        service: Address[];
        public: Address[];
        office: Address[];
    };

    // People
    directors: Director[];
    shareholders: Shareholder[];

    // Business
    trading_areas: TradingArea[];

    // Compliance
    insolvency: Insolvency[];

    // Special Entity Types
    special_entity: {
        maori_business?: MaoriBusiness;
        other_incorporated?: any;
        public_sector?: any;
        unincorporated?: any;
    };
}
