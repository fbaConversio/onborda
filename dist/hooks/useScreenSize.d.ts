import { Step, Side } from "../types";
import { defaultBreakpoints } from "../Onborda";
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
export declare const useBreakpoint: (breakpoints?: typeof defaultBreakpoints, currentStep?: Step) => ScreenSize;
export default useScreenSize;
