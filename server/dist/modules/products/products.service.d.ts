export declare const WINDOW_SERIES: {
    SERIES_2000: {
        name: string;
        description: string;
        basePrice: number;
        pricePerSqFt: number;
        minPrice: number;
    };
    SERIES_3000: {
        name: string;
        description: string;
        basePrice: number;
        pricePerSqFt: number;
        minPrice: number;
    };
    SERIES_4000: {
        name: string;
        description: string;
        basePrice: number;
        pricePerSqFt: number;
        minPrice: number;
    };
    SERIES_6000: {
        name: string;
        description: string;
        basePrice: number;
        pricePerSqFt: number;
        minPrice: number;
    };
    SERIES_CASEMENT: {
        name: string;
        description: string;
        basePrice: number;
        pricePerSqFt: number;
        minPrice: number;
    };
    SERIES_AWNING: {
        name: string;
        description: string;
        basePrice: number;
        pricePerSqFt: number;
        minPrice: number;
    };
    SERIES_SLIDER: {
        name: string;
        description: string;
        basePrice: number;
        pricePerSqFt: number;
        minPrice: number;
    };
    SERIES_PICTURE: {
        name: string;
        description: string;
        basePrice: number;
        pricePerSqFt: number;
        minPrice: number;
    };
    SERIES_BAY: {
        name: string;
        description: string;
        basePrice: number;
        pricePerSqFt: number;
        minPrice: number;
    };
    SERIES_BOW: {
        name: string;
        description: string;
        basePrice: number;
        pricePerSqFt: number;
        minPrice: number;
    };
};
export declare const OPTION_PRICES: {
    LOW_E: {
        name: string;
        price: number;
        included: string[];
    };
    ARGON_FILL: {
        name: string;
        price: number;
        included: string[];
    };
    TRIPLE_PANE: {
        name: string;
        price: number;
        included: never[];
    };
    IMPACT: {
        name: string;
        price: number;
        included: string[];
    };
    OBSCURE: {
        name: string;
        price: number;
        included: never[];
    };
    TINTED: {
        name: string;
        price: number;
        included: never[];
    };
    GRIDS_COLONIAL: {
        name: string;
        price: number;
        included: never[];
    };
    GRIDS_PRAIRIE: {
        name: string;
        price: number;
        included: never[];
    };
    GRIDS_CRAFTSMAN: {
        name: string;
        price: number;
        included: never[];
    };
    SCREEN_STANDARD: {
        name: string;
        price: number;
        included: string[];
    };
    SCREEN_SOLAR: {
        name: string;
        price: number;
        included: never[];
    };
    COLOR_WHITE: {
        name: string;
        price: number;
        included: never[];
    };
    COLOR_TAN: {
        name: string;
        price: number;
        included: never[];
    };
    COLOR_BROWN: {
        name: string;
        price: number;
        included: never[];
    };
    COLOR_BLACK: {
        name: string;
        price: number;
        included: never[];
    };
    INSTALL_STANDARD: {
        name: string;
        price: number;
        included: never[];
    };
    INSTALL_PERMIT: {
        name: string;
        price: number;
        included: never[];
    };
    INSTALL_HAUL: {
        name: string;
        price: number;
        included: never[];
    };
};
export declare const FINANCING_OPTIONS: {
    id: string;
    label: string;
    months: number;
    aprPct: number;
    minAmount: number;
}[];
export declare class ProductsService {
    catalog(): ({
        options: {
            id: string;
            name: string;
            price: number;
            included: boolean;
        }[];
        name: string;
        description: string;
        basePrice: number;
        pricePerSqFt: number;
        minPrice: number;
        id: string;
    } | {
        options: {
            id: string;
            name: string;
            price: number;
            included: boolean;
        }[];
        name: string;
        description: string;
        basePrice: number;
        pricePerSqFt: number;
        minPrice: number;
        id: string;
    } | {
        options: {
            id: string;
            name: string;
            price: number;
            included: boolean;
        }[];
        name: string;
        description: string;
        basePrice: number;
        pricePerSqFt: number;
        minPrice: number;
        id: string;
    } | {
        options: {
            id: string;
            name: string;
            price: number;
            included: boolean;
        }[];
        name: string;
        description: string;
        basePrice: number;
        pricePerSqFt: number;
        minPrice: number;
        id: string;
    } | {
        options: {
            id: string;
            name: string;
            price: number;
            included: boolean;
        }[];
        name: string;
        description: string;
        basePrice: number;
        pricePerSqFt: number;
        minPrice: number;
        id: string;
    } | {
        options: {
            id: string;
            name: string;
            price: number;
            included: boolean;
        }[];
        name: string;
        description: string;
        basePrice: number;
        pricePerSqFt: number;
        minPrice: number;
        id: string;
    } | {
        options: {
            id: string;
            name: string;
            price: number;
            included: boolean;
        }[];
        name: string;
        description: string;
        basePrice: number;
        pricePerSqFt: number;
        minPrice: number;
        id: string;
    } | {
        options: {
            id: string;
            name: string;
            price: number;
            included: boolean;
        }[];
        name: string;
        description: string;
        basePrice: number;
        pricePerSqFt: number;
        minPrice: number;
        id: string;
    } | {
        options: {
            id: string;
            name: string;
            price: number;
            included: boolean;
        }[];
        name: string;
        description: string;
        basePrice: number;
        pricePerSqFt: number;
        minPrice: number;
        id: string;
    } | {
        options: {
            id: string;
            name: string;
            price: number;
            included: boolean;
        }[];
        name: string;
        description: string;
        basePrice: number;
        pricePerSqFt: number;
        minPrice: number;
        id: string;
    })[];
    getById(id: string): {
        allOptions: {
            LOW_E: {
                name: string;
                price: number;
                included: string[];
            };
            ARGON_FILL: {
                name: string;
                price: number;
                included: string[];
            };
            TRIPLE_PANE: {
                name: string;
                price: number;
                included: never[];
            };
            IMPACT: {
                name: string;
                price: number;
                included: string[];
            };
            OBSCURE: {
                name: string;
                price: number;
                included: never[];
            };
            TINTED: {
                name: string;
                price: number;
                included: never[];
            };
            GRIDS_COLONIAL: {
                name: string;
                price: number;
                included: never[];
            };
            GRIDS_PRAIRIE: {
                name: string;
                price: number;
                included: never[];
            };
            GRIDS_CRAFTSMAN: {
                name: string;
                price: number;
                included: never[];
            };
            SCREEN_STANDARD: {
                name: string;
                price: number;
                included: string[];
            };
            SCREEN_SOLAR: {
                name: string;
                price: number;
                included: never[];
            };
            COLOR_WHITE: {
                name: string;
                price: number;
                included: never[];
            };
            COLOR_TAN: {
                name: string;
                price: number;
                included: never[];
            };
            COLOR_BROWN: {
                name: string;
                price: number;
                included: never[];
            };
            COLOR_BLACK: {
                name: string;
                price: number;
                included: never[];
            };
            INSTALL_STANDARD: {
                name: string;
                price: number;
                included: never[];
            };
            INSTALL_PERMIT: {
                name: string;
                price: number;
                included: never[];
            };
            INSTALL_HAUL: {
                name: string;
                price: number;
                included: never[];
            };
        };
        name: string;
        description: string;
        basePrice: number;
        pricePerSqFt: number;
        minPrice: number;
        id: string;
    } | {
        allOptions: {
            LOW_E: {
                name: string;
                price: number;
                included: string[];
            };
            ARGON_FILL: {
                name: string;
                price: number;
                included: string[];
            };
            TRIPLE_PANE: {
                name: string;
                price: number;
                included: never[];
            };
            IMPACT: {
                name: string;
                price: number;
                included: string[];
            };
            OBSCURE: {
                name: string;
                price: number;
                included: never[];
            };
            TINTED: {
                name: string;
                price: number;
                included: never[];
            };
            GRIDS_COLONIAL: {
                name: string;
                price: number;
                included: never[];
            };
            GRIDS_PRAIRIE: {
                name: string;
                price: number;
                included: never[];
            };
            GRIDS_CRAFTSMAN: {
                name: string;
                price: number;
                included: never[];
            };
            SCREEN_STANDARD: {
                name: string;
                price: number;
                included: string[];
            };
            SCREEN_SOLAR: {
                name: string;
                price: number;
                included: never[];
            };
            COLOR_WHITE: {
                name: string;
                price: number;
                included: never[];
            };
            COLOR_TAN: {
                name: string;
                price: number;
                included: never[];
            };
            COLOR_BROWN: {
                name: string;
                price: number;
                included: never[];
            };
            COLOR_BLACK: {
                name: string;
                price: number;
                included: never[];
            };
            INSTALL_STANDARD: {
                name: string;
                price: number;
                included: never[];
            };
            INSTALL_PERMIT: {
                name: string;
                price: number;
                included: never[];
            };
            INSTALL_HAUL: {
                name: string;
                price: number;
                included: never[];
            };
        };
        name: string;
        description: string;
        basePrice: number;
        pricePerSqFt: number;
        minPrice: number;
        id: string;
    } | {
        allOptions: {
            LOW_E: {
                name: string;
                price: number;
                included: string[];
            };
            ARGON_FILL: {
                name: string;
                price: number;
                included: string[];
            };
            TRIPLE_PANE: {
                name: string;
                price: number;
                included: never[];
            };
            IMPACT: {
                name: string;
                price: number;
                included: string[];
            };
            OBSCURE: {
                name: string;
                price: number;
                included: never[];
            };
            TINTED: {
                name: string;
                price: number;
                included: never[];
            };
            GRIDS_COLONIAL: {
                name: string;
                price: number;
                included: never[];
            };
            GRIDS_PRAIRIE: {
                name: string;
                price: number;
                included: never[];
            };
            GRIDS_CRAFTSMAN: {
                name: string;
                price: number;
                included: never[];
            };
            SCREEN_STANDARD: {
                name: string;
                price: number;
                included: string[];
            };
            SCREEN_SOLAR: {
                name: string;
                price: number;
                included: never[];
            };
            COLOR_WHITE: {
                name: string;
                price: number;
                included: never[];
            };
            COLOR_TAN: {
                name: string;
                price: number;
                included: never[];
            };
            COLOR_BROWN: {
                name: string;
                price: number;
                included: never[];
            };
            COLOR_BLACK: {
                name: string;
                price: number;
                included: never[];
            };
            INSTALL_STANDARD: {
                name: string;
                price: number;
                included: never[];
            };
            INSTALL_PERMIT: {
                name: string;
                price: number;
                included: never[];
            };
            INSTALL_HAUL: {
                name: string;
                price: number;
                included: never[];
            };
        };
        name: string;
        description: string;
        basePrice: number;
        pricePerSqFt: number;
        minPrice: number;
        id: string;
    } | {
        allOptions: {
            LOW_E: {
                name: string;
                price: number;
                included: string[];
            };
            ARGON_FILL: {
                name: string;
                price: number;
                included: string[];
            };
            TRIPLE_PANE: {
                name: string;
                price: number;
                included: never[];
            };
            IMPACT: {
                name: string;
                price: number;
                included: string[];
            };
            OBSCURE: {
                name: string;
                price: number;
                included: never[];
            };
            TINTED: {
                name: string;
                price: number;
                included: never[];
            };
            GRIDS_COLONIAL: {
                name: string;
                price: number;
                included: never[];
            };
            GRIDS_PRAIRIE: {
                name: string;
                price: number;
                included: never[];
            };
            GRIDS_CRAFTSMAN: {
                name: string;
                price: number;
                included: never[];
            };
            SCREEN_STANDARD: {
                name: string;
                price: number;
                included: string[];
            };
            SCREEN_SOLAR: {
                name: string;
                price: number;
                included: never[];
            };
            COLOR_WHITE: {
                name: string;
                price: number;
                included: never[];
            };
            COLOR_TAN: {
                name: string;
                price: number;
                included: never[];
            };
            COLOR_BROWN: {
                name: string;
                price: number;
                included: never[];
            };
            COLOR_BLACK: {
                name: string;
                price: number;
                included: never[];
            };
            INSTALL_STANDARD: {
                name: string;
                price: number;
                included: never[];
            };
            INSTALL_PERMIT: {
                name: string;
                price: number;
                included: never[];
            };
            INSTALL_HAUL: {
                name: string;
                price: number;
                included: never[];
            };
        };
        name: string;
        description: string;
        basePrice: number;
        pricePerSqFt: number;
        minPrice: number;
        id: string;
    } | {
        allOptions: {
            LOW_E: {
                name: string;
                price: number;
                included: string[];
            };
            ARGON_FILL: {
                name: string;
                price: number;
                included: string[];
            };
            TRIPLE_PANE: {
                name: string;
                price: number;
                included: never[];
            };
            IMPACT: {
                name: string;
                price: number;
                included: string[];
            };
            OBSCURE: {
                name: string;
                price: number;
                included: never[];
            };
            TINTED: {
                name: string;
                price: number;
                included: never[];
            };
            GRIDS_COLONIAL: {
                name: string;
                price: number;
                included: never[];
            };
            GRIDS_PRAIRIE: {
                name: string;
                price: number;
                included: never[];
            };
            GRIDS_CRAFTSMAN: {
                name: string;
                price: number;
                included: never[];
            };
            SCREEN_STANDARD: {
                name: string;
                price: number;
                included: string[];
            };
            SCREEN_SOLAR: {
                name: string;
                price: number;
                included: never[];
            };
            COLOR_WHITE: {
                name: string;
                price: number;
                included: never[];
            };
            COLOR_TAN: {
                name: string;
                price: number;
                included: never[];
            };
            COLOR_BROWN: {
                name: string;
                price: number;
                included: never[];
            };
            COLOR_BLACK: {
                name: string;
                price: number;
                included: never[];
            };
            INSTALL_STANDARD: {
                name: string;
                price: number;
                included: never[];
            };
            INSTALL_PERMIT: {
                name: string;
                price: number;
                included: never[];
            };
            INSTALL_HAUL: {
                name: string;
                price: number;
                included: never[];
            };
        };
        name: string;
        description: string;
        basePrice: number;
        pricePerSqFt: number;
        minPrice: number;
        id: string;
    } | {
        allOptions: {
            LOW_E: {
                name: string;
                price: number;
                included: string[];
            };
            ARGON_FILL: {
                name: string;
                price: number;
                included: string[];
            };
            TRIPLE_PANE: {
                name: string;
                price: number;
                included: never[];
            };
            IMPACT: {
                name: string;
                price: number;
                included: string[];
            };
            OBSCURE: {
                name: string;
                price: number;
                included: never[];
            };
            TINTED: {
                name: string;
                price: number;
                included: never[];
            };
            GRIDS_COLONIAL: {
                name: string;
                price: number;
                included: never[];
            };
            GRIDS_PRAIRIE: {
                name: string;
                price: number;
                included: never[];
            };
            GRIDS_CRAFTSMAN: {
                name: string;
                price: number;
                included: never[];
            };
            SCREEN_STANDARD: {
                name: string;
                price: number;
                included: string[];
            };
            SCREEN_SOLAR: {
                name: string;
                price: number;
                included: never[];
            };
            COLOR_WHITE: {
                name: string;
                price: number;
                included: never[];
            };
            COLOR_TAN: {
                name: string;
                price: number;
                included: never[];
            };
            COLOR_BROWN: {
                name: string;
                price: number;
                included: never[];
            };
            COLOR_BLACK: {
                name: string;
                price: number;
                included: never[];
            };
            INSTALL_STANDARD: {
                name: string;
                price: number;
                included: never[];
            };
            INSTALL_PERMIT: {
                name: string;
                price: number;
                included: never[];
            };
            INSTALL_HAUL: {
                name: string;
                price: number;
                included: never[];
            };
        };
        name: string;
        description: string;
        basePrice: number;
        pricePerSqFt: number;
        minPrice: number;
        id: string;
    } | {
        allOptions: {
            LOW_E: {
                name: string;
                price: number;
                included: string[];
            };
            ARGON_FILL: {
                name: string;
                price: number;
                included: string[];
            };
            TRIPLE_PANE: {
                name: string;
                price: number;
                included: never[];
            };
            IMPACT: {
                name: string;
                price: number;
                included: string[];
            };
            OBSCURE: {
                name: string;
                price: number;
                included: never[];
            };
            TINTED: {
                name: string;
                price: number;
                included: never[];
            };
            GRIDS_COLONIAL: {
                name: string;
                price: number;
                included: never[];
            };
            GRIDS_PRAIRIE: {
                name: string;
                price: number;
                included: never[];
            };
            GRIDS_CRAFTSMAN: {
                name: string;
                price: number;
                included: never[];
            };
            SCREEN_STANDARD: {
                name: string;
                price: number;
                included: string[];
            };
            SCREEN_SOLAR: {
                name: string;
                price: number;
                included: never[];
            };
            COLOR_WHITE: {
                name: string;
                price: number;
                included: never[];
            };
            COLOR_TAN: {
                name: string;
                price: number;
                included: never[];
            };
            COLOR_BROWN: {
                name: string;
                price: number;
                included: never[];
            };
            COLOR_BLACK: {
                name: string;
                price: number;
                included: never[];
            };
            INSTALL_STANDARD: {
                name: string;
                price: number;
                included: never[];
            };
            INSTALL_PERMIT: {
                name: string;
                price: number;
                included: never[];
            };
            INSTALL_HAUL: {
                name: string;
                price: number;
                included: never[];
            };
        };
        name: string;
        description: string;
        basePrice: number;
        pricePerSqFt: number;
        minPrice: number;
        id: string;
    } | {
        allOptions: {
            LOW_E: {
                name: string;
                price: number;
                included: string[];
            };
            ARGON_FILL: {
                name: string;
                price: number;
                included: string[];
            };
            TRIPLE_PANE: {
                name: string;
                price: number;
                included: never[];
            };
            IMPACT: {
                name: string;
                price: number;
                included: string[];
            };
            OBSCURE: {
                name: string;
                price: number;
                included: never[];
            };
            TINTED: {
                name: string;
                price: number;
                included: never[];
            };
            GRIDS_COLONIAL: {
                name: string;
                price: number;
                included: never[];
            };
            GRIDS_PRAIRIE: {
                name: string;
                price: number;
                included: never[];
            };
            GRIDS_CRAFTSMAN: {
                name: string;
                price: number;
                included: never[];
            };
            SCREEN_STANDARD: {
                name: string;
                price: number;
                included: string[];
            };
            SCREEN_SOLAR: {
                name: string;
                price: number;
                included: never[];
            };
            COLOR_WHITE: {
                name: string;
                price: number;
                included: never[];
            };
            COLOR_TAN: {
                name: string;
                price: number;
                included: never[];
            };
            COLOR_BROWN: {
                name: string;
                price: number;
                included: never[];
            };
            COLOR_BLACK: {
                name: string;
                price: number;
                included: never[];
            };
            INSTALL_STANDARD: {
                name: string;
                price: number;
                included: never[];
            };
            INSTALL_PERMIT: {
                name: string;
                price: number;
                included: never[];
            };
            INSTALL_HAUL: {
                name: string;
                price: number;
                included: never[];
            };
        };
        name: string;
        description: string;
        basePrice: number;
        pricePerSqFt: number;
        minPrice: number;
        id: string;
    } | {
        allOptions: {
            LOW_E: {
                name: string;
                price: number;
                included: string[];
            };
            ARGON_FILL: {
                name: string;
                price: number;
                included: string[];
            };
            TRIPLE_PANE: {
                name: string;
                price: number;
                included: never[];
            };
            IMPACT: {
                name: string;
                price: number;
                included: string[];
            };
            OBSCURE: {
                name: string;
                price: number;
                included: never[];
            };
            TINTED: {
                name: string;
                price: number;
                included: never[];
            };
            GRIDS_COLONIAL: {
                name: string;
                price: number;
                included: never[];
            };
            GRIDS_PRAIRIE: {
                name: string;
                price: number;
                included: never[];
            };
            GRIDS_CRAFTSMAN: {
                name: string;
                price: number;
                included: never[];
            };
            SCREEN_STANDARD: {
                name: string;
                price: number;
                included: string[];
            };
            SCREEN_SOLAR: {
                name: string;
                price: number;
                included: never[];
            };
            COLOR_WHITE: {
                name: string;
                price: number;
                included: never[];
            };
            COLOR_TAN: {
                name: string;
                price: number;
                included: never[];
            };
            COLOR_BROWN: {
                name: string;
                price: number;
                included: never[];
            };
            COLOR_BLACK: {
                name: string;
                price: number;
                included: never[];
            };
            INSTALL_STANDARD: {
                name: string;
                price: number;
                included: never[];
            };
            INSTALL_PERMIT: {
                name: string;
                price: number;
                included: never[];
            };
            INSTALL_HAUL: {
                name: string;
                price: number;
                included: never[];
            };
        };
        name: string;
        description: string;
        basePrice: number;
        pricePerSqFt: number;
        minPrice: number;
        id: string;
    } | {
        allOptions: {
            LOW_E: {
                name: string;
                price: number;
                included: string[];
            };
            ARGON_FILL: {
                name: string;
                price: number;
                included: string[];
            };
            TRIPLE_PANE: {
                name: string;
                price: number;
                included: never[];
            };
            IMPACT: {
                name: string;
                price: number;
                included: string[];
            };
            OBSCURE: {
                name: string;
                price: number;
                included: never[];
            };
            TINTED: {
                name: string;
                price: number;
                included: never[];
            };
            GRIDS_COLONIAL: {
                name: string;
                price: number;
                included: never[];
            };
            GRIDS_PRAIRIE: {
                name: string;
                price: number;
                included: never[];
            };
            GRIDS_CRAFTSMAN: {
                name: string;
                price: number;
                included: never[];
            };
            SCREEN_STANDARD: {
                name: string;
                price: number;
                included: string[];
            };
            SCREEN_SOLAR: {
                name: string;
                price: number;
                included: never[];
            };
            COLOR_WHITE: {
                name: string;
                price: number;
                included: never[];
            };
            COLOR_TAN: {
                name: string;
                price: number;
                included: never[];
            };
            COLOR_BROWN: {
                name: string;
                price: number;
                included: never[];
            };
            COLOR_BLACK: {
                name: string;
                price: number;
                included: never[];
            };
            INSTALL_STANDARD: {
                name: string;
                price: number;
                included: never[];
            };
            INSTALL_PERMIT: {
                name: string;
                price: number;
                included: never[];
            };
            INSTALL_HAUL: {
                name: string;
                price: number;
                included: never[];
            };
        };
        name: string;
        description: string;
        basePrice: number;
        pricePerSqFt: number;
        minPrice: number;
        id: string;
    };
    /**
     * Calculate price for a single window opening
     * Width Ã— Height are in inches (rough opening)
     */
    calculateWindowPrice(params: {
        seriesId: string;
        widthInches: number;
        heightInches: number;
        options?: string[];
        quantity?: number;
    }): {
        seriesId: string;
        seriesName: string;
        widthInches: number;
        heightInches: number;
        sqFt: number;
        unitPrice: number;
        optionTotal: number;
        pricePerWindow: number;
        quantity: number;
        lineTotal: number;
        appliedOptions: {
            id: string;
            name: string;
            price: number;
        }[];
    };
    calculateMonthlyPayment(principal: number, finOptionId: string): {
        optionId: string;
        label: string;
        monthlyPayment: number;
        totalCost: number;
        totalInterest: number;
        months: number;
    };
    financingOptions(): {
        id: string;
        label: string;
        months: number;
        aprPct: number;
        minAmount: number;
    }[];
}
export declare const productsService: ProductsService;
//# sourceMappingURL=products.service.d.ts.map