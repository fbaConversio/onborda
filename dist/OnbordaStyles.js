import { arrow, computePosition, flip, offset, shift, size, limitShift, } from "@floating-ui/react-dom";
// Get viewport dimensions helper
export const getViewportDimensions = () => {
    return {
        width: window.innerWidth || document.documentElement.clientWidth,
        height: window.innerHeight || document.documentElement.clientHeight,
    };
};
// Helper function to parse a side string into Floating UI's placement format
export const parseFloatingPlacement = (side) => {
    // For Floating UI, placement is in format: 'side-alignment'
    // e.g., 'top', 'bottom-start', 'right-end', etc.
    // First, handle default case
    if (!side)
        return "bottom";
    // Handle four primary sides
    if (side === "top" ||
        side === "bottom" ||
        side === "left" ||
        side === "right") {
        return side;
    }
    // Handle compound sides like 'top-left', 'bottom-right', etc.
    const parts = side.split("-");
    if (parts.length === 2) {
        // Check for sides that start with primary direction
        if (["top", "bottom", "left", "right"].includes(parts[0])) {
            const primarySide = parts[0];
            // Map our directional terms to Floating UI's start/end terminology
            let alignment;
            if (parts[1] === "left" || parts[1] === "top") {
                alignment = "start";
            }
            else if (parts[1] === "right" || parts[1] === "bottom") {
                alignment = "end";
            }
            if (alignment) {
                return `${primarySide}-${alignment}`;
            }
        }
        else if (["left", "right"].includes(parts[1])) {
            // Handle cases like 'top-left' which in Floating UI is 'top-start'
            const primarySide = parts[0];
            const alignment = parts[1] === "left" ? "start" : "end";
            return `${primarySide}-${alignment}`;
        }
    }
    // Default to bottom if we couldn't parse it
    return "bottom";
};
// Parse Floating UI placement back to our side format
export const parsePlacementToSide = (placement) => {
    const [side, alignment] = placement.split("-");
    if (!alignment)
        return side;
    // Convert start/end to directional terms based on the primary side
    if (["top", "bottom"].includes(side)) {
        // For top/bottom, start = left, end = right
        return `${side}-${alignment === "start" ? "left" : "right"}`;
    }
    else {
        // For left/right, start = top, end = bottom
        return `${side}-${alignment === "start" ? "top" : "bottom"}`;
    }
};
// This will replace getCardStyle and getAdjustedCardStyle with Floating UI logic
export const computeCardPosition = async (referenceElement, floatingElement, arrowElement, preferredSide = "bottom", debug = false) => {
    if (!referenceElement || !floatingElement) {
        if (debug)
            console.log("Onborda: Missing elements for positioning", {
                referenceElement,
                floatingElement,
            });
        return null;
    }
    // Parse our side format to Floating UI's placement format
    const initialPlacement = parseFloatingPlacement(preferredSide);
    if (debug) {
        console.log("Onborda: Computing position with Floating UI", {
            preferredSide,
            initialPlacement,
            referenceElement,
            floatingElement,
        });
    }
    // Define the boundary padding (inset from viewport edges)
    const PADDING = 8;
    // Get reference dimensions for arrow positioning and optimization
    const refRect = referenceElement.getBoundingClientRect();
    const floatingRect = floatingElement.getBoundingClientRect();
    const viewportRect = {
        width: window.innerWidth,
        height: window.innerHeight,
    };
    // Performance optimization: Pre-compute optimal offset based on placement
    const baseOffset = 15; // Smaller base offset for quicker positioning
    // Check if there's enough space for the preferred side without any repositioning
    // This helps us prioritize the original placement more strongly
    const hasSpaceForPreferredSide = hasEnoughSpaceForPlacement(refRect, floatingRect, viewportRect, initialPlacement, baseOffset, PADDING);
    try {
        // Use Floating UI to compute the position with optimized middleware
        const computedPosition = await computePosition(referenceElement, floatingElement, {
            placement: initialPlacement,
            strategy: "absolute",
            middleware: [
                // Add offset from the reference element
                offset(baseOffset),
                // Only use flip middleware if we don't have space for the preferred side
                // This ensures we don't flip unnecessarily
                ...(!hasSpaceForPreferredSide
                    ? [
                        flip({
                            padding: PADDING,
                            fallbackStrategy: "bestFit",
                            // Add a threshold to prevent flipping for minor overflow
                            // This helps stick to the preferred side more consistently
                            flipAlignment: false, // Don't adjust alignment (left/right or top/bottom)
                            // Only flip to opposite side, don't try other sides
                            fallbackPlacements: [getOppositePosition(initialPlacement)],
                            // Higher threshold means it will try harder to stick with original side
                            rootBoundary: "viewport",
                        }),
                    ]
                    : []),
                // Handle arrow positioning if we have an arrow
                ...(arrowElement
                    ? [arrow({ element: arrowElement, padding: 8 })]
                    : []),
                // Always apply shift, but with a higher offset threshold
                // This helps ensure the element stays in the viewport, but doesn't move
                // unless absolutely necessary
                shift({
                    padding: PADDING,
                    mainAxis: true,
                    crossAxis: true,
                    // Use limiter to prevent excess movement
                    limiter: limitShift({
                        // Higher offset means we try harder to keep the original position
                        offset: {
                            mainAxis: PADDING,
                            crossAxis: PADDING,
                        },
                    }),
                }),
                // Apply size constraints last, after position is determined
                size({
                    padding: PADDING,
                    apply({ elements }) {
                        // Apply size constraints directly
                        const viewportWidth = window.innerWidth - PADDING * 2;
                        const viewportHeight = window.innerHeight - PADDING * 2;
                        // Only apply constraints if needed
                        if (floatingRect.width > viewportWidth) {
                            elements.floating.style.maxWidth = `${viewportWidth}px`;
                        }
                        if (floatingRect.height > viewportHeight) {
                            elements.floating.style.maxHeight = `${viewportHeight}px`;
                        }
                    },
                }),
            ],
        });
        if (debug) {
            console.log("Onborda: Floating UI position computed", {
                hasSpaceForPreferredSide,
                computedPosition,
                effectiveSide: parsePlacementToSide(computedPosition.placement),
            });
        }
        return {
            ...computedPosition,
            referenceWidth: refRect.width,
            referenceHeight: refRect.height,
        };
    }
    catch (error) {
        console.error("Onborda: Error computing position", error);
        return null;
    }
};
// Helper function to check if there's enough space for a placement
// This helps us determine if we need to flip or shift at all
function hasEnoughSpaceForPlacement(refRect, floatingRect, viewportRect, placement, offset, padding) {
    const [side] = placement.split("-");
    // Calculate available space on each side
    const availableSpace = {
        top: refRect.top - offset - padding,
        right: viewportRect.width - (refRect.right + offset + padding),
        bottom: viewportRect.height - (refRect.bottom + offset + padding),
        left: refRect.left - offset - padding,
    };
    // Check if the preferred side has enough space
    switch (side) {
        case "top":
            return availableSpace.top >= floatingRect.height;
        case "right":
            return availableSpace.right >= floatingRect.width;
        case "bottom":
            return availableSpace.bottom >= floatingRect.height;
        case "left":
            return availableSpace.left >= floatingRect.width;
        default:
            return true;
    }
}
// Helper to get the opposite position directly (faster than computing all fallbacks)
function getOppositePosition(placement) {
    const [side, alignment] = placement.split("-");
    const oppositeSides = {
        top: "bottom",
        bottom: "top",
        left: "right",
        right: "left",
    };
    const oppositeSide = oppositeSides[side];
    return alignment
        ? `${oppositeSide}-${alignment}`
        : oppositeSide;
}
// Original getFlipPlacements function remains unchanged
function getFlipPlacements(placement) {
    // Extract the base side and alignment
    const [side, alignment] = placement.split("-");
    // Create opposite placement pairs with the same alignment
    const oppositePlacements = {
        top: "bottom",
        bottom: "top",
        left: "right",
        right: "left",
    };
    const oppositeSide = oppositePlacements[side];
    const basePlacement = alignment
        ? `${oppositeSide}-${alignment}`
        : oppositeSide;
    // Include other sides as additional fallbacks
    const otherSides = ["top", "right", "bottom", "left"].filter((s) => s !== side && s !== oppositeSide);
    // Generate all possible placements with the otherSides
    const otherPlacements = alignment
        ? [...otherSides.map((s) => `${s}-${alignment}`), ...otherSides]
        : otherSides;
    // Return the list of fallback placements, starting with the opposite
    return [basePlacement, ...otherPlacements];
}
// Convert floating UI state to arrow styles - optimized for more direct positioning
export const getArrowStyle = (floatingState) => {
    if (!floatingState || !floatingState.middlewareData.arrow) {
        return {};
    }
    const { x, y } = floatingState.middlewareData.arrow;
    const staticSide = {
        top: "bottom",
        right: "left",
        bottom: "top",
        left: "right",
    }[floatingState.placement.split("-")[0]] || "bottom";
    const placementRotation = {
        top: 90,
        right: 180,
        bottom: 270,
        left: 0,
    };
    // Calculate positioning directly for better performance
    const side = floatingState.placement.split("-")[0];
    const alignment = floatingState.placement.split("-")[1];
    const rotation = placementRotation[side];
    // Direct style application for better performance
    const style = {
        position: "absolute",
        transform: `rotate(${rotation}deg)`,
        [staticSide]: "-20px", // Slightly closer for snappier appearance
    };
    // Direct positioning based on side
    if (staticSide === "top" || staticSide === "bottom") {
        style.left = x != null ? `${x}px` : "50%";
    }
    else {
        style.top = y != null ? `${y}px` : "50%";
    }
    // Simplified alignment handling for better performance
    if (alignment === "start") {
        if (side === "top" || side === "bottom") {
            style.left = "10px";
        }
        else {
            style.top = "10px";
        }
    }
    else if (alignment === "end") {
        if (side === "top" || side === "bottom") {
            style.right = "10px";
            delete style.left;
        }
        else {
            style.bottom = "10px";
            delete style.top;
        }
    }
    else {
        // Center alignment
        if (side === "top" || side === "bottom") {
            // Simpler transform with fewer properties for better performance
            style.left = "50%";
            style.transform = `translateX(-50%) rotate(${rotation}deg)`;
        }
        else {
            style.top = "50%";
            style.transform = `translateY(-50%) rotate(${rotation}deg)`;
        }
    }
    return style;
};
// Deprecated functions - keeping them with warnings for backward compatibility
export const getCardStyle = (side) => {
    console.warn("getCardStyle is deprecated. Use Floating UI positioning instead.");
    // Default to centered style for backward compatibility
    return {
        position: "absolute",
        top: "50%",
        left: "50%",
        transform: "translate(-50%, -50%)",
    };
};
export const getAdjustedCardStyle = (side, pointerPosition, cardDimensions, debug = false, hasFlipped = false) => {
    console.warn("getAdjustedCardStyle is deprecated. Use computeCardPosition instead.");
    // Return a sensible default for backward compatibility
    return {
        style: {
            position: "absolute",
            top: "50%",
            left: "50%",
            transform: "translate(-50%, -50%)",
        },
        effectiveSide: side,
    };
};
