"use client";
import { useState, useEffect } from "react";
import { defaultBreakpoints } from "../Onborda";
/**
 * Hook to get the current screen size and responsive breakpoints
 * @param breakpoints Custom breakpoints object
 * @param currentStep Current step from the tour
 * @returns Current screen dimensions, responsive flags, and the appropriate side for the current breakpoint
 */
export const useBreakpoint = (breakpoints = defaultBreakpoints, currentStep) => {
    const [screenSize, setScreenSize] = useState({
        width: typeof window !== "undefined" ? window.innerWidth : 0,
        height: typeof window !== "undefined" ? window.innerHeight : 0,
        breakpoint: "xs",
        currentSide: "bottom",
    });
    useEffect(() => {
        // Skip if not in browser environment
        if (typeof window === "undefined")
            return;
        // Initialize with current dimensions
        updateScreenSize();
        // Add resize event listener
        window.addEventListener("resize", updateScreenSize);
        // Clean up event listener
        return () => {
            window.removeEventListener("resize", updateScreenSize);
        };
    }, [breakpoints, currentStep]);
    // Update screen size and breakpoint information
    const updateScreenSize = () => {
        const width = window.innerWidth;
        const height = window.innerHeight;
        // Determine current breakpoint
        let currentBreakpoint = "xs";
        const breakpointEntries = Object.entries(breakpoints).sort(([, valueA], [, valueB]) => valueA - valueB);
        for (const [key, value] of breakpointEntries) {
            if (width >= value) {
                currentBreakpoint = key;
            }
            else {
                break;
            }
        }
        // Determine the appropriate side based on the current breakpoint and step configuration
        let currentSide = "bottom";
        if (currentStep?.side) {
            // First check if there's a specific side for the current breakpoint
            if (currentStep.side[currentBreakpoint]) {
                currentSide = currentStep.side[currentBreakpoint];
            }
            // Then check if there's a default side
            else if (currentStep.side.default) {
                currentSide = currentStep.side.default;
            }
        }
        setScreenSize({
            width,
            height,
            breakpoint: currentBreakpoint,
            currentSide,
        });
    };
    return screenSize;
};
export default useScreenSize;
