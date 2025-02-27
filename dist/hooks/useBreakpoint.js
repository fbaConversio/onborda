"use client";
import { useState, useEffect } from "react";
import { getCardStyle } from "../OnbordaStyles";
/**
 * Hook to get the current screen size and responsive breakpoints
 * @param breakpoints Custom breakpoints object
 * @param currentStep Current step from the tour
 * @returns Current screen dimensions, responsive flags, and the appropriate side for the current breakpoint
 */
export const useBreakpoint = ({ breakpoints, extendSides, currentStep, }) => {
    const [screenSize, setScreenSize] = useState({
        width: typeof window !== "undefined" ? window.innerWidth : 0,
        height: typeof window !== "undefined" ? window.innerHeight : 0,
        breakpoint: "default",
        currentSide: "bottom",
        style: {},
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
        let currentBreakpoint = "default";
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
            // Mobile-first approach: find all applicable breakpoints for the current width
            // and choose the one with the largest breakpoint value that's still <= current width
            // First, set the default if it exists
            if (currentStep.side.default) {
                currentSide = currentStep.side.default;
            }
            // Sort breakpoints from smallest to largest
            const sideBreakpointEntries = Object.entries(currentStep.side)
                .filter(([key]) => key !== "default") // Exclude the default entry
                .sort(([keyA], [keyB]) => {
                // Get the numeric values of breakpoints
                const valueA = breakpoints[keyA] || 0;
                const valueB = breakpoints[keyB] || 0;
                return valueA - valueB;
            });
            // Apply breakpoints in mobile-first manner
            // This will iterate through breakpoints from smallest to largest
            // and apply the side for each applicable breakpoint (width >= breakpoint value)
            for (const [breakpointKey, sideValue] of sideBreakpointEntries) {
                const breakpointValue = breakpoints[breakpointKey] || 0;
                if (width >= breakpointValue) {
                    currentSide = sideValue;
                }
                else {
                    // Stop once we reach a breakpoint larger than current width
                    break;
                }
            }
        }
        const style = getCardStyle(currentSide, extendSides);
        setScreenSize({
            width,
            height,
            breakpoint: currentBreakpoint,
            currentSide,
            style,
        });
    };
    return screenSize;
};
export default useBreakpoint;
