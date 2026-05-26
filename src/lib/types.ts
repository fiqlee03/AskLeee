export interface GarmentItem {
    id: string;
    user_id: string;
    image_urls: string[];
    category: 'tops' | 'bottoms' | 'footwear' | 'shoes' |'accessories';
    subcategory?: string;
    brand?: string;
    era?: string;
    colours: string[];
    fabrics: string[];
    is_natural_fibre?: boolean;
    tags: string[];
    notes?: string;
    purchase_price?: number;
    worn_count: number;
    ai_summary?: string;
    created_at: string;
}

export interface ChatMessage {
    id: string;
    role: 'user' | 'assistant';
    content: string;
    attached_item_ids?: string[];
    image_urls?: string[];
    created_at: string[];
}

export interface ThriftAnalysis {
    verdict: 'BUY' | 'PASS' | 'CONSIDER';
    confidenceScore: number;
    brandAssessment: string;
    fibreAnalysis: string;
    eraEstimate: string;
    qualitySignals: string[];
    redFlags: string[];
    maxFairPrice?: number; //In MYR
    reasoning: string;
}

