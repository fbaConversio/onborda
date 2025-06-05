"use client";
import React, { useEffect, useMemo, useRef, useState } from "react";
import { useOnborda } from "./OnbordaContext";
import { motion } from "framer-motion";
import { usePathname, useRouter } from "next/navigation";
import { Portal } from "@radix-ui/react-portal";

// Types
import { OnbordaProps, Step } from "./types";
import { getCardStyle, getArrowStyle } from "./OnbordaStyles";
import useBreakpoint from "./hooks/useBreakpoint";

/**
 * Onborda Component
 * @param {OnbordaProps} props
 * @constructor
 */

export const defaultBreakpoints = {
  xs: 480,
  sm: 640,
  md: 768,
  lg: 1024,
  xl: 1280,
  "2xl": 1536,
  "3xl": 1920,
} as const;

const Onborda: React.FC<OnbordaProps> = ({
  children,
  shadowRgb = "0, 0, 0",
  shadowOpacity = "0.2",
  cardTransition = { type: "spring", damping: 26, stiffness: 170 },
  cardComponent: CardComponent,
  tourComponent: TourComponent,
  debug = false,
  observerTimeout = 5000,
  breakpoints = defaultBreakpoints,
  extendSides = {},
}: OnbordaProps) => {
  const {
    currentTour,
    currentStep,
    setCurrentStep,
    isOnbordaVisible,
    currentTourSteps,
    completedSteps,
    setCompletedSteps,
    tours,
    closeOnborda,
    setOnbordaVisible,
    isStepChanging,
    setIsStepChanging,
  } = useOnborda();

  // Merge and sort breakpoints, cached with useMemo to prevent recalculations on every render
  const mergedBreakpoints = useMemo(() => {
    // First merge the default breakpoints with custom ones
    const merged = {
      ...defaultBreakpoints,
      ...breakpoints,
    };

    // Convert to array and sort by numeric value
    const entries = Object.entries(merged);
    entries.sort((a, b) => a[1] - b[1]); // Sort ascending by breakpoint value

    // Convert back to object
    return entries.reduce((acc, [key, value]) => {
      acc[key] = value;
      return acc;
    }, {} as Record<string, number>);
  }, [breakpoints]); // Only recalculate when breakpoints prop changes

  const [elementToScroll, setElementToScroll] = useState<Element | null>(null);
  const [pointerPosition, setPointerPosition] = useState<{
    x: number;
    y: number;
    width: number;
    height: number;
  } | null>(null);
  const currentElementRef = useRef<Element | null>(null);
  // Add a ref to track if we've triggered positioning for the current element
  const positioningTriggeredRef = useRef<boolean>(false);

  // - -
  // Route Changes
  const router = useRouter();
  const path = usePathname();
  const [currentRoute, setCurrentRoute] = useState<string | null>(path);
  const [pendingRouteChange, setPendingRouteChange] = useState(false);

  // Add a state to track if we're currently scrolling
  const [isScrolling, setIsScrolling] = useState(false);

  const hasSelector = (step: Step): boolean => {
    return !!step?.selector || !!step?.customQuerySelector;
  };
  const getStepSelectorElement = (step: Step): Element | null => {
    return step?.selector
      ? document.querySelector(step.selector)
      : step?.customQuerySelector
      ? step.customQuerySelector()
      : null;
  };

  // Get the current tour object
  const currentTourObject = useMemo(() => {
    return tours.find((tour) => tour.tour === currentTour);
  }, [currentTour, isOnbordaVisible]);

  // Update the current route on route changes
  useEffect(() => {
    !pendingRouteChange && setCurrentRoute(path);
  }, [path, pendingRouteChange]);

  // - -
  // Initialisze
  useEffect(() => {
    let cleanup: any[] = [];
    if (isOnbordaVisible && currentTourSteps) {
      // Reset the positioning triggered flag when step changes
      positioningTriggeredRef.current = false;

      debug &&
        console.log(
          "Onborda: Current Step Changed",
          currentStep,
          completedSteps
        );
      const step = currentTourSteps[currentStep];
      if (step) {
        let elementFound = false;
        // Check if the step has a selector
        if (hasSelector(step)) {
          // This step has a selector. Lets find the element
          const element = getStepSelectorElement(step);
          // Check if the element is found
          if (element) {
            // Check if the element is visible in the viewport or needs scrolling
            const rect = element.getBoundingClientRect();
            const isVisible =
              rect.top >= 0 &&
              rect.left >= 0 &&
              rect.bottom <=
                (window.innerHeight || document.documentElement.clientHeight) &&
              rect.right <=
                (window.innerWidth || document.documentElement.clientWidth);

            // Set the element to scroll to
            setElementToScroll(element);
            currentElementRef.current = element;
            elementFound = true;

            // Enable pointer events on the element
            if (step.interactable) {
              const htmlElement = element as HTMLElement;
              htmlElement.style.pointerEvents = "auto";
            }

            // If element is already visible, show the pointer immediately
            // Otherwise, the scrolling effect will handle showing it after scrolling
            if (isVisible) {
              setIsScrolling(false);
              updatePointerPosition();
              positioningTriggeredRef.current = true;
            } else {
              // Element needs scrolling, hide pointer until scrolling completes
              setIsScrolling(true);
              positioningTriggeredRef.current = false;
            }
          }
          // Even if the element is already found, we still need to check if the route is different from the current route
          // do we have a route to navigate to?
          if (step.route) {
            // Check if the route is set and different from the current route
            if (currentRoute == null || !currentRoute?.endsWith(step.route)) {
              debug && console.log("Onborda: Navigating to route", step.route);
              // Trigger the next route
              router.push(step.route);

              // Use MutationObserver to detect when the target element is available in the DOM
              const observer = new MutationObserver((mutations, observer) => {
                const shouldSelect = hasSelector(currentTourSteps[currentStep]);
                if (shouldSelect) {
                  const element = getStepSelectorElement(
                    currentTourSteps[currentStep]
                  );
                  if (element) {
                    // Check if the element is visible in the viewport or needs scrolling
                    const rect = element.getBoundingClientRect();
                    const isVisible =
                      rect.top >= 0 &&
                      rect.left >= 0 &&
                      rect.bottom <=
                        (window.innerHeight ||
                          document.documentElement.clientHeight) &&
                      rect.right <=
                        (window.innerWidth ||
                          document.documentElement.clientWidth);

                    // Set the element to scroll to
                    setElementToScroll(element);
                    currentElementRef.current = element;

                    // Enable pointer events on the element
                    if (step.interactable) {
                      const htmlElement = element as HTMLElement;
                      htmlElement.style.pointerEvents = "auto";
                    }

                    // If element is already visible, show the pointer immediately
                    // Otherwise, the scrolling effect will handle showing it after scrolling
                    if (isVisible) {
                      setIsScrolling(false);
                      updatePointerPosition();
                      positioningTriggeredRef.current = true;
                    } else {
                      // Element needs scrolling, hide pointer until scrolling completes
                      setIsScrolling(true);
                      positioningTriggeredRef.current = false;
                    }

                    // Stop observing after the element is found
                    observer.disconnect();
                    debug &&
                      console.log(
                        "Onborda: Observer disconnected after element found",
                        element
                      );
                  } else {
                    debug &&
                      console.log(
                        "Onborda: Observing for element...",
                        currentTourSteps[currentStep]
                      );
                  }
                } else {
                  setCurrentStep(currentStep);
                  observer.disconnect();
                  debug &&
                    console.log(
                      "Onborda: Observer disconnected after no selector set",
                      currentTourSteps[currentStep]
                    );
                }
              });

              // Start observing the document body for changes
              observer.observe(document.body, {
                childList: true,
                subtree: true,
              });

              setPendingRouteChange(true);

              // Set a timeout to disconnect the observer if the element is not found within a certain period
              const timeoutId = setTimeout(() => {
                observer.disconnect();
                console.error(
                  "Onborda: Observer Timeout",
                  currentTourSteps[currentStep]
                );
              }, observerTimeout); // Adjust the timeout period as needed

              // Clear the timeout if the observer disconnects successfully
              const originalDisconnect = observer.disconnect.bind(observer);
              observer.disconnect = () => {
                setPendingRouteChange(false);
                clearTimeout(timeoutId);
                originalDisconnect();
              };
            }
          }
        } else {
          // no selector, but might still need to navigate to a route
          if (
            step.route &&
            (currentRoute == null || !currentRoute?.endsWith(step.route))
          ) {
            // Trigger the next route
            debug && console.log("Onborda: Navigating to route", step.route);
            router.push(step.route);
          } else if (!completedSteps.has(currentStep)) {
            // don't have a route to navigate to, but the step is not completed
            debug &&
              console.log(
                "Onborda: Step Completed via no selector",
                currentStep,
                step
              );

            if (step?.onComplete) {
              const tour = tours.find((t) => t.tour === currentTour);
              if (tour) {
                step.onComplete(tour);
              }
            }
            setCompletedSteps(completedSteps.add(currentStep));
          }
        }

        // No element set for this step? Place the pointer at the center of the screen
        if (!elementFound) {
          // For center positioning, we can set it immediately without delay
          setPointerPosition({
            x: window.innerWidth / 2,
            y: window.innerHeight / 2,
            width: 0,
            height: 0,
          });
          positioningTriggeredRef.current = true;
          setIsScrolling(false); // Make sure the cursor is visible for center positioning
          setElementToScroll(null);
          currentElementRef.current = null;
        }

        // Prefetch the next route
        const nextStep = currentTourSteps[currentStep + 1];
        if (nextStep && nextStep?.route) {
          debug &&
            console.log("Onborda: Prefetching Next Route", nextStep.route);
          router.prefetch(nextStep.route);
        }
      }
    }
    return () => {
      // Disable pointer events on the element on cleanup
      if (currentElementRef.current) {
        const htmlElement = currentElementRef.current as HTMLElement;
        htmlElement.style.pointerEvents = "";
      }
      // Cleanup any event listeners we may have added
      cleanup.forEach((fn) => fn());
    };
  }, [
    currentTour, // Re-run the effect when the current tour changes
    currentStep, // Re-run the effect when the current step changes
    currentTourSteps, // Re-run the effect when the current tour steps change
    isOnbordaVisible, // Re-run the effect when the onborda visibility changes
    currentRoute, // Re-run the effect when the current route changes
    completedSteps, // Re-run the effect when the completed steps change
  ]);

  // - -
  // Helper function to get element position
  const getElementPosition = (element: Element) => {
    const { top, left, width, height } = element.getBoundingClientRect();
    // Always use the latest scroll position values to ensure accuracy during scrolling

    const scrollTop =
      window.pageYOffset ||
      document.documentElement.scrollTop ||
      document.body.scrollTop ||
      0;

    const scrollLeft =
      window.pageXOffset ||
      document.documentElement.scrollLeft ||
      document.body.scrollLeft ||
      0;

    debug &&
      console.log(`Onborda: Getting element position: ${element.id}`, {
        top,
        left,
        width,
        height,
        scrollTop,
        scrollLeft,
        finalY: top + scrollTop,
        finalX: left + scrollLeft,
      });

    return {
      x: left + scrollLeft,
      y: top + scrollTop,
      width,
      height,
    };
  };

  const getInScrollContainerPosition = (element: Element) => {
    // Get the scroll container
    if (!currentTourObject?.scrollContainer) return null;

    const selector =
      currentTourObject?.steps?.[currentStep]?.scrollContainerOveride ??
      currentTourObject?.scrollContainer;

    const scrollContainer = document.querySelector(selector ?? "");
    if (!scrollContainer) {
      debug &&
        console.log(
          "Onborda: Scroll container not found, using default positioning"
        );
      return getElementPosition(element); // Fallback to default positioning
    }

    // Get the element's position relative to the viewport
    const elementRect = element.getBoundingClientRect();
    // Get the container's position relative to the viewport
    const containerRect = scrollContainer.getBoundingClientRect();

    // Calculate position relative to the container
    const relativeTop =
      elementRect.top - containerRect.top + scrollContainer.scrollTop;
    const relativeLeft =
      elementRect.left - containerRect.left + scrollContainer.scrollLeft;

    debug &&
      console.log(
        `Onborda: Getting element position in container: ${element.id}`,
        {
          elementRect,
          containerRect,
          containerScroll: {
            top: scrollContainer.scrollTop,
            left: scrollContainer.scrollLeft,
          },
          relative: {
            top: relativeTop,
            left: relativeLeft,
          },
        }
      );

    return {
      x: relativeLeft,
      y: relativeTop,
      width: elementRect.width,
      height: elementRect.height,
    };
  };

  // - -
  // Scroll to the element when the elementToScroll changes
  useEffect(() => {
    if (elementToScroll && isOnbordaVisible) {
      debug && console.log("Onborda: Element to Scroll Changed");

      // Get viewport dimensions
      const viewportHeight =
        window.innerHeight || document.documentElement.clientHeight;

      debug && console.log("Onborda: viewportHeight", viewportHeight);

      // Get element position
      const position = getElementPosition(elementToScroll);

      const positionInScrollContainer =
        getInScrollContainerPosition(elementToScroll);

      debug &&
        console.log(
          `Onborda: position: ${elementToScroll.id}`,
          position,
          positionInScrollContainer
        );

      // Check if element can be centered
      const threshold = (viewportHeight - position.height) / 2;

      debug &&
        console.log(`Onborda: threshold: ${elementToScroll.id}`, threshold);

      if (positionInScrollContainer) {
        if (positionInScrollContainer.y >= threshold) {
          // Hide the pointer during scrolling
          setIsScrolling(true);
        }
      } else {
        if (position.y >= threshold) {
          // Hide the pointer during scrolling
          setIsScrolling(true);
        }
      }

      // Start scroll animation
      elementToScroll.scrollIntoView({
        block: "center",
        inline: "center",
        behavior: "smooth",
      });

      // Wait for scrolling to complete, then show the pointer
      const scrollTimer = setTimeout(() => {
        // Update the position once before showing
        updatePointerPosition();
        // Show the pointer with the correct position
        setIsScrolling(false);
        positioningTriggeredRef.current = true;
      }, 600); // Matches the typical smooth scroll duration

      return () => {
        clearTimeout(scrollTimer);
      };
    }
  }, [elementToScroll, isOnbordaVisible]);

  // - -
  // Update pointer position on window resize
  const updatePointerPosition = () => {
    if (currentTourSteps) {
      const step = currentTourSteps[currentStep];
      if (step) {
        const element = getStepSelectorElement(step);
        if (element) {
          const position = getElementPosition(element);
          debug && console.log("Onborda: Pointer Position Updated", position);
          setPointerPosition(position);
        } else {
          // if the element is not found, place the pointer at the center of the screen
          setPointerPosition({
            x: window.innerWidth / 2,
            y: window.innerHeight / 2,
            width: 0,
            height: 0,
          });
          setElementToScroll(null);
          currentElementRef.current = null;
        }
      }
    }
  };

  // - -
  // Update pointer position on window resize and scroll
  useEffect(() => {
    if (isOnbordaVisible) {
      // Only listen for resize events here
      window.addEventListener("resize", updatePointerPosition);

      return () => {
        window.removeEventListener("resize", updatePointerPosition);
      };
    }
  }, [currentStep, currentTourSteps, isOnbordaVisible]);

  function simulateClick(selector: string | undefined) {
    if (!selector) return;

    debug && console.log("Onborda: Simulating click", selector);
    const element = document.querySelector(selector);
    if (element instanceof HTMLElement) {
      element.click();
    } else if (element) {
      // Create and dispatch a click event for non-HTMLElements
      const clickEvent = new MouseEvent("click", {
        bubbles: true,
        cancelable: true,
        view: window,
      });
      element.dispatchEvent(clickEvent);
    }
  }

  // - -

  const nextStep = async () => {
    if (isStepChanging) return;
    setIsStepChanging(true);

    debug && console.log("Onborda: Next Step", currentTourSteps?.[currentStep]);

    if (currentTourSteps?.[currentStep]?.clickElementOnNext) {
      simulateClick(currentTourSteps?.[currentStep]?.clickElementOnNext);
    }

    setTimeout(async () => {
      const nextStepIndex = currentStep + 1;
      await changeStep(nextStepIndex);
    }, 100);

    setTimeout(() => setIsStepChanging(false), 500);
  };

  const prevStep = async () => {
    if (isStepChanging) return;
    setIsStepChanging(true);

    debug &&
      console.log("Onborda: Previous Step", currentTourSteps?.[currentStep]);

    if (currentTourSteps?.[currentStep]?.clickElementOnPrev) {
      simulateClick(currentTourSteps?.[currentStep]?.clickElementOnPrev);
    }

    setTimeout(async () => {
      const prevStepIndex = currentStep - 1;
      await changeStep(prevStepIndex);
    }, 100);
    setTimeout(() => setIsStepChanging(false), 500);
  };

  const [previousStep, setPreviousStep] = useState<number | null>(null);

  const changeStep = async (step: number | string | null) => {
    if (step === null) return;

    const setStepIndex =
      typeof step === "string"
        ? currentTourSteps.findIndex((s) => s?.id === step)
        : step;

    setCurrentStep(setStepIndex);
  };

  const setStep = async (step: number | string) => {
    if (isStepChanging) return;
    setIsStepChanging(true);

    if (
      currentTourSteps?.[Number(previousStep)]?.clickElementOnUnset &&
      previousStep !== null
    ) {
      debug &&
        console.log(
          "Onborda: Simulating click",
          currentTourSteps?.[Number(previousStep)]?.clickElementOnUnset
        );
      simulateClick(
        currentTourSteps?.[Number(previousStep)]?.clickElementOnUnset
      );
    }

    if (currentTourSteps?.[Number(step)]?.clickElementOnSet) {
      debug &&
        console.log(
          "Onborda: Simulating click",
          currentTourSteps?.[Number(step)]?.clickElementOnSet
        );
      simulateClick(currentTourSteps?.[Number(step)]?.clickElementOnSet);
    }

    setTimeout(async () => {
      const setStepIndex =
        typeof step === "string"
          ? currentTourSteps.findIndex((s) => s?.id === step)
          : step;

      setPreviousStep(Number(step));
      setCurrentStep(setStepIndex);
    }, 100);

    setTimeout(() => setIsStepChanging(false), 500);
  };

  // - -
  // Card Arrow
  const CardArrow = ({ isVisible }: { isVisible: boolean }) => {
    if (!isVisible) {
      return null;
    }
    return (
      <svg
        viewBox="0 0 54 54"
        data-name="onborda-arrow"
        className="absolute w-6 h-6 origin-center"
        style={getArrowStyle(currentTourSteps?.[currentStep]?.side as any)}
      >
        <path id="triangle" d="M27 27L0 0V54L27 27Z" fill="currentColor" />
      </svg>
    );
  };

  // - -
  // Overlay Variants
  const variants = {
    visible: { opacity: 1 },
    hidden: { opacity: 0 },
  };

  // - -
  // Pointer Options
  const pointerPadding = currentTourSteps?.[currentStep]?.pointerPadding ?? 30;
  const pointerPadOffset = pointerPadding / 2;
  const pointerRadius = currentTourSteps?.[currentStep]?.pointerRadius ?? 28;
  const pointerEvents =
    pointerPosition && isOnbordaVisible ? "pointer-events-none" : "";

  const { currentSide, breakpoint, style } = useBreakpoint({
    breakpoints: mergedBreakpoints,
    extendSides,
    currentStep: currentTourSteps?.[currentStep],
  });

  debug &&
    console.log("Onborda: currentSide, breakpoint", currentSide, breakpoint);
  debug && console.log("Onborda: breakpoints", mergedBreakpoints);

  return (
    <>
      {/* Container for the Website content */}
      <div data-name="onborda-site-wrapper" className={` ${pointerEvents} `}>
        {children}
      </div>

      {pointerPosition &&
        isOnbordaVisible &&
        CardComponent &&
        currentTourObject &&
        isScrolling && (
          <motion.div
            className="fixed inset-0 pointer-events-none z-[997]"
            style={{
              background: `rgba(${shadowRgb}, ${shadowOpacity})`,
            }}
          />
        )}

      {/* Onborda Overlay Step Content */}
      {pointerPosition &&
        isOnbordaVisible &&
        CardComponent &&
        currentTourObject && (
          <Portal>
            <motion.div
              data-name="onborda-overlay"
              className="absolute inset-0 pointer-events-none z-[997]"
              initial="hidden"
              animate={isOnbordaVisible ? "visible" : "hidden"}
              variants={variants}
              transition={{ duration: 0.5 }}
            >
              <motion.div
                data-name="onborda-pointer"
                className="relative z-[998]"
                style={{
                  boxShadow: `0 0 200vw 200vh rgba(${shadowRgb}, ${shadowOpacity})`,
                  borderRadius: `${pointerRadius}px ${pointerRadius}px ${pointerRadius}px ${pointerRadius}px`,
                }}
                initial={
                  pointerPosition
                    ? {
                        x: pointerPosition.x - pointerPadOffset,
                        y: pointerPosition.y - pointerPadOffset,
                        width: pointerPosition.width + pointerPadding,
                        height: pointerPosition.height + pointerPadding,
                      }
                    : {}
                }
                animate={
                  pointerPosition
                    ? {
                        x: pointerPosition.x - pointerPadOffset,
                        y: pointerPosition.y - pointerPadOffset,
                        width: pointerPosition.width + pointerPadding,
                        height: pointerPosition.height + pointerPadding,
                        opacity: isScrolling ? 0 : 1,
                      }
                    : {}
                }
                transition={{
                  ...cardTransition,
                  opacity: { duration: 0 }, // Smooth fade for opacity
                }}
              >
                {/* Card */}
                <motion.div
                  className="absolute flex flex-col max-w-[100%] transition-all min-w-min pointer-events-auto z-[999]"
                  data-name="onborda-card"
                  animate={{
                    opacity: isScrolling ? 0 : 1,
                  }}
                  style={style}
                >
                  <CardComponent
                    step={currentTourSteps?.[currentStep]!}
                    tour={currentTourObject}
                    tours={tours}
                    currentStep={currentStep}
                    totalSteps={currentTourSteps?.length ?? 0}
                    nextStep={nextStep}
                    prevStep={prevStep}
                    setStep={setStep}
                    closeOnborda={closeOnborda}
                    setOnbordaVisible={setOnbordaVisible}
                    arrow={
                      <CardArrow
                        isVisible={
                          currentTourSteps?.[currentStep]
                            ? hasSelector(currentTourSteps?.[currentStep])
                            : false
                        }
                      />
                    }
                    completedSteps={Array.from(completedSteps)}
                    pendingRouteChange={pendingRouteChange}
                  />
                </motion.div>
              </motion.div>
            </motion.div>
            {TourComponent && (
              <motion.div
                data-name={"onborda-tour-wrapper"}
                animate={{
                  opacity: isScrolling ? 0 : 1,
                }}
                className={
                  "fixed top-0 left-0 z-[998] w-screen h-screen pointer-events-none"
                }
              >
                <motion.div
                  data-name={"onborda-tour"}
                  className={"pointer-events-auto"}
                >
                  <TourComponent
                    tour={currentTourObject}
                    currentTour={currentTour}
                    currentStep={currentStep}
                    setStep={setStep}
                    completedSteps={Array.from(completedSteps)}
                    closeOnborda={closeOnborda}
                  />
                </motion.div>
              </motion.div>
            )}
          </Portal>
        )}
    </>
  );
};

export default Onborda;
