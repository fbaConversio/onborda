import React from "react";
import { Placement, Strategy, MiddlewareData } from "@floating-ui/react-dom";
export interface FloatingUIState {
    x: number;
    y: number;
    strategy: Strategy;
    placement: Placement;
    middlewareData: MiddlewareData;
    referenceWidth?: number;
    referenceHeight?: number;
}
export declare const getViewportDimensions: () => {
    width: number;
    height: number;
};
export declare const parseFloatingPlacement: (side: string) => Placement;
export declare const parsePlacementToSide: (placement: Placement) => string;
export declare const computeCardPosition: (referenceElement: Element | null, floatingElement: HTMLElement | null, arrowElement: HTMLElement | null, preferredSide?: string, debug?: boolean) => Promise<FloatingUIState | null>;
export declare const getArrowStyle: (floatingState: FloatingUIState | null) => React.CSSProperties;
export declare const getCardStyle: (side: string) => React.CSSProperties;
export declare const getAdjustedCardStyle: (side: string, pointerPosition: {
    x: number;
    y: number;
    width: number;
    height: number;
} | null, cardDimensions: {
    width: number;
    height: number;
}, debug?: boolean, hasFlipped?: boolean) => {
    style: React.CSSProperties;
    effectiveSide: string;
};
