import { Step, Breakpoint, Side } from "../types";
type ScreenSize = {
    width: number;
    height: number;
    breakpoint: string;
    currentSide: Side;
};
/**
 * Hook to get the current screen size and responsive breakpoints
 * @param breakpoints Custom breakpoints object
 * @param currentStep Current step from the tour
 * @returns Current screen dimensions, responsive flags, and the appropriate side for the current breakpoint
 */
export declare const useBreakpoint: (breakpoints?: Partial<Record<Breakpoint, number>> & {
    [key: string]: number;
}, currentStep?: Step) => ScreenSize;
export default useBreakpoint;
