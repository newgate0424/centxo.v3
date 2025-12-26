/* eslint-disable @typescript-eslint/no-explicit-any */
declare module 'facebook-nodejs-business-sdk' {
    export class FacebookAdsApi {
        static init(accessToken: string): void;
    }

    export class AdAccount {
        constructor(id: string);
        read(fields: string[], params?: any): Promise<any>;
        getCampaigns(fields: string[], params?: any): Promise<any[]>;
        getAdSets(fields: string[], params?: any): Promise<any[]>;
        getAds(fields: string[], params?: any): Promise<any[]>;
        getInsights(fields: string[], params?: any): Promise<any[]>;
    }

    export class Campaign {
        constructor(id: string);
        update(fields: string[], params?: any): Promise<any>;
    }

    export class AdSet {
        constructor(id: string);
        update(fields: string[], params?: any): Promise<any>;
    }

    export class Ad {
        constructor(id: string);
        update(fields: string[], params?: any): Promise<any>;
    }

    export class User {
        constructor(id: string);
        getAdAccounts(fields: string[], params?: any): Promise<any[]>;
    }
}
