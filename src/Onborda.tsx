"use client";
import React, { useEffect, useMemo, useRef, useState } from "react";
import { useOnborda } from "./OnbordaContext";
import { motion } from "framer-motion";
import { usePathname, useRouter } from "next/navigation";
import { Portal } from "@radix-ui/react-portal";
import { autoUpdate } from "@floating-ui/react-dom";

// Types
import { OnbordaProps, Step } from "./types";
import {
  computeCardPosition,
  getArrowStyle,
  FloatingUIState,
  parsePlacementToSide,
  getViewportDimensions,
} from "./OnbordaStyles";

/**
 * Onborda Component
 * @param {OnbordaProps} props
 * @constructor
 */
const Onborda: React.FC<OnbordaProps> = ({
  children,
  shadowRgb = "0, 0, 0",
  shadowOpacity = "0.2",
  cardTransition = { type: "spring", damping: 26, stiffness: 170 },
  cardComponent: CardComponent,
  tourComponent: TourComponent,
  debug = false,
  observerTimeout = 5000,
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

  // Track window size
  const [windowSize, setWindowSize] = useState({
    width: typeof window !== "undefined" ? window.innerWidth : 0,
    height: typeof window !== "undefined" ? window.innerHeight : 0,
  });

  // Floating UI state
  const [floatingState, setFloatingState] = useState<FloatingUIState | null>(
    null
  );
  // Refs for card and arrow elements for Floating UI
  const cardRef = useRef<HTMLDivElement>(null);
  const arrowRef = useRef<HTMLDivElement>(null);
  // Cleanup function for autoUpdate
  const cleanupRef = useRef<(() => void) | null>(null);

  // - -
  // Route Changes
  const router = useRouter();
  const path = usePathname();
  const [currentRoute, setCurrentRoute] = useState<string | null>(path);
  const [pendingRouteChange, setPendingRouteChange] = useState(false);

  // Add a state to track if we're currently scrolling
  const [isScrolling, setIsScrolling] = useState(false);

  // Add state to track card dimensions
  const [cardDimensions, setCardDimensions] = useState<{
    width: number;
    height: number;
  }>({
    width: 300, // Default estimation
    height: 200, // Default estimation
  });

  // Improve animation performance with faster transitions when repositioning
  const [optimizedCardTransition, setOptimizedCardTransition] =
    useState(cardTransition);

  // Track initial positioning to avoid recomputing unnecessarily
  const isInitialPositioningDoneRef = useRef(false);
  // Add state to control card visibility animation
  const [isCardReadyToShow, setIsCardReadyToShow] = useState(false);

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

  // Update window size on resize
  useEffect(() => {
    const handleResize = () => {
      const viewport = getViewportDimensions();
      setWindowSize({
        width: viewport.width,
        height: viewport.height,
      });
    };

    if (typeof window !== "undefined") {
      handleResize(); // Set initial size
      window.addEventListener("resize", handleResize);
      return () => window.removeEventListener("resize", handleResize);
    }
  }, []);

  // Optimize by using a single update call that manages both pointer and card position
  const updatePositions = async (force = false) => {
    if (
      !isOnbordaVisible ||
      !currentElementRef.current ||
      !cardRef.current ||
      (isScrolling && !force)
    ) {
      return;
    }

    // Initially hide card until positioning is complete
    setIsCardReadyToShow(false);

    const preferredSide = currentTourSteps?.[currentStep]?.side || "bottom";

    try {
      // First update the pointer position (highlight)
      if (currentElementRef.current) {
        const rect = currentElementRef.current.getBoundingClientRect();
        const scrollLeft =
          window.pageXOffset || document.documentElement.scrollLeft || 0;
        const scrollTop =
          window.pageYOffset || document.documentElement.scrollTop || 0;

        setPointerPosition({
          x: rect.left + scrollLeft,
          y: rect.top + scrollTop,
          width: rect.width,
          height: rect.height,
        });
      }

      // Then compute card position with Floating UI
      const newFloatingState = await computeCardPosition(
        currentElementRef.current,
        cardRef.current,
        arrowRef.current,
        preferredSide,
        debug
      );

      if (newFloatingState) {
        setFloatingState(newFloatingState);

        // Differentiate between initial positioning and updates
        if (!isInitialPositioningDoneRef.current) {
          // For initial positioning, use the regular animation
          setOptimizedCardTransition(cardTransition);
          isInitialPositioningDoneRef.current = true;
        } else if (force) {
          // Force updates (like after scrolling or step changes) use a quick tween
          setOptimizedCardTransition({
            ...cardTransition,
            type: "tween",
            duration: 0.15,
          });
        } else {
          // For regular updates (autoUpdate during scrolling/resizing), use instant positioning
          setOptimizedCardTransition({
            type: "tween",
            duration: 0,
          });
        }

        // Once positioning is complete, set card ready to show after a short delay
        // to ensure position has stabilized
        setTimeout(() => {
          setIsCardReadyToShow(true);
        }, 50);
      }
    } catch (error) {
      console.error("Error updating positions:", error);
    }
  };

  // Replace updateCardPosition with our more efficient version
  const updateCardPosition = () => updatePositions();

  // Setup Floating UI autoUpdate when reference element or card changes
  useEffect(() => {
    // Clean up previous autoUpdate if it exists
    if (cleanupRef.current) {
      cleanupRef.current();
      cleanupRef.current = null;
    }

    if (isOnbordaVisible && currentElementRef.current && cardRef.current) {
      // Reset positioning flag on new step to ensure proper animation
      if (currentStep !== undefined) {
        isInitialPositioningDoneRef.current = false;
      }

      // Skip initial positioning during scrolling, we'll do it after scroll completes
      if (!isScrolling) {
        // Initial positioning with force flag
        updatePositions(true);
      }

      // Setup autoUpdate with optimized configuration for better performance
      cleanupRef.current = autoUpdate(
        currentElementRef.current,
        cardRef.current,
        // For autoUpdate, don't use force flag - repositioning should be instant
        () => updatePositions(false),
        {
          // Use more efficient update strategy
          ancestorScroll: true, // Update on ancestor scroll
          ancestorResize: true, // Update on ancestor resize
          elementResize: true, // Update on element resize
          layoutShift: true, // Update on layout shift
          animationFrame: false, // Don't use animationFrame which can feel laggy
        }
      );
    }

    return () => {
      if (cleanupRef.current) {
        cleanupRef.current();
        cleanupRef.current = null;
      }
    };
  }, [
    isOnbordaVisible,
    currentStep,
    // We specifically don't include these deps to prevent excessive recalculations:
    // currentElementRef.current,
    // cardRef.current,
  ]);

  // - -
  // Initialisze
  useEffect(() => {
    let cleanup: any[] = [];
    if (isOnbordaVisible && currentTourSteps) {
      // Reset the positioning triggered flag when step changes
      positioningTriggeredRef.current = false;
      // Reset initial positioning flag on step change to ensure proper rendering
      isInitialPositioningDoneRef.current = false;
      // Initially hide card until positioning is complete
      setIsCardReadyToShow(false);

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

            // If element is already visible, position immediately with no animation
            if (isVisible) {
              setIsScrolling(false);
              // First update pointer position
              if (currentElementRef.current) {
                const pos = getElementPosition(currentElementRef.current);
                setPointerPosition(pos);
              }
              positioningTriggeredRef.current = true;

              // Use an immediate update to prevent any positioning "jumps"
              setTimeout(() => {
                if (
                  isOnbordaVisible &&
                  currentElementRef.current &&
                  cardRef.current
                ) {
                  // Use zero-duration animation for immediate positioning
                  setOptimizedCardTransition({
                    type: "tween",
                    duration: 0,
                  });

                  // Force immediate positioning
                  updatePositions(true);

                  // Then switch to regular animation for subsequent updates
                  setTimeout(() => {
                    isInitialPositioningDoneRef.current = true;
                  }, 50);
                }
              }, 0);
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
                      // Initialize positioning with Floating UI
                      updateCardPosition();
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
            step?.onComplete && step.onComplete();
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
          // Reset floating state for center positioning
          setFloatingState(null);
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
      // Clean up floating UI update
      if (cleanupRef.current) {
        cleanupRef.current();
        cleanupRef.current = null;
      }
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
      console.log("Onborda: Getting element position", {
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

  // - -
  // Scroll to the element when the elementToScroll changes
  useEffect(() => {
    if (elementToScroll && isOnbordaVisible) {
      debug && console.log("Onborda: Element to Scroll Changed");
      const rect = elementToScroll.getBoundingClientRect();
      const isAbove = rect.top < 0;

      // Check if we need to scroll
      const needsScrolling =
        rect.top < 0 ||
        rect.left < 0 ||
        rect.bottom >
          (window.innerHeight || document.documentElement.clientHeight) ||
        rect.right >
          (window.innerWidth || document.documentElement.clientWidth);

      if (needsScrolling) {
        // Hide the pointer during scrolling
        setIsScrolling(true);
        // Also hide the card by marking it not ready
        setIsCardReadyToShow(false);

        // Reset initial positioning flag for a fresh animation after scroll
        isInitialPositioningDoneRef.current = false;
      }

      // Start scroll animation
      elementToScroll.scrollIntoView({
        block: isAbove ? "center" : "center",
        inline: "center",
        behavior: "smooth",
      });

      // Wait for scrolling to complete, then show the pointer
      const scrollTimer = setTimeout(() => {
        // Show the pointer with the correct position
        setIsScrolling(false);
        positioningTriggeredRef.current = true;

        // Use zero-duration animation for immediate positioning after scroll
        setOptimizedCardTransition({
          type: "tween",
          duration: 0,
        });

        // Force immediate positioning after scrolling
        updatePositions(true);

        // Then restore animation for user interactions
        setTimeout(() => {
          isInitialPositioningDoneRef.current = true;
        }, 50);
      }, 400); // Reduced from 600ms for faster response

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
            x: windowSize.width / 2,
            y: windowSize.height / 2,
            width: 0,
            height: 0,
          });
          setElementToScroll(null);
          currentElementRef.current = null;
          // Reset floating state for center positioning
          setFloatingState(null);
        }
      }
    }
  };

  // Update pointer position on window resize
  useEffect(() => {
    if (isOnbordaVisible) {
      // Use our combined update instead of just pointer
      const handleResize = () => {
        // Hide card during resize
        setIsCardReadyToShow(false);

        // Use immediate positioning for resize events
        setOptimizedCardTransition({
          type: "tween",
          duration: 0,
        });
        updatePositions(true);
      };

      window.addEventListener("resize", handleResize);
      return () => {
        window.removeEventListener("resize", handleResize);
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

    // Hide card immediately when changing steps
    setIsCardReadyToShow(false);

    const setStepIndex =
      typeof step === "string"
        ? currentTourSteps.findIndex((s) => s?.id === step)
        : step;

    setCurrentStep(setStepIndex);
  };

  const setStep = async (step: number | string) => {
    if (isStepChanging) return;
    setIsStepChanging(true);

    // Hide card immediately when setting a new step
    setIsCardReadyToShow(false);

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

    // Use the arrow reference for Floating UI
    return (
      <div
        ref={arrowRef}
        data-name="onborda-arrow"
        className="absolute pointer-events-none"
      >
        <svg
          viewBox="0 0 54 54"
          className="w-6 h-6 origin-center"
          style={getArrowStyle(floatingState)}
        >
          <path id="triangle" d="M27 27L0 0V54L27 27Z" fill="currentColor" />
        </svg>
      </div>
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

  // Measure card dimensions when it changes
  useEffect(() => {
    if (cardRef.current && isOnbordaVisible) {
      const updateCardSize = () => {
        const rect = cardRef.current?.getBoundingClientRect();
        if (rect) {
          const newDimensions = {
            width: rect.width,
            height: rect.height,
          };

          // Only update if dimensions actually changed
          if (
            newDimensions.width !== cardDimensions.width ||
            newDimensions.height !== cardDimensions.height
          ) {
            setCardDimensions(newDimensions);
            if (debug) {
              console.log("Onborda: Card dimensions updated", newDimensions);
            }
            // Update positioning when card size changes
            updateCardPosition();
          }
        }
      };

      // Initial measurement
      updateCardSize();

      // Set up resize observer to detect content changes in the card
      const resizeObserver = new ResizeObserver(updateCardSize);
      resizeObserver.observe(cardRef.current);

      return () => {
        if (cardRef.current) {
          resizeObserver.unobserve(cardRef.current);
        }
        resizeObserver.disconnect();
      };
    }
  }, [isOnbordaVisible, currentStep, windowSize]);

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
              transition={{ duration: 0.3 }} // Faster fade transition
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
                  ...optimizedCardTransition,
                  opacity: { duration: 0.1 }, // Faster fade for opacity
                }}
              >
                {/* Card with Floating UI positioning */}
                <motion.div
                  ref={cardRef}
                  className="absolute flex flex-col max-w-[100%] transition-all min-w-min pointer-events-auto z-[999]"
                  data-name="onborda-card"
                  initial={{ opacity: 0 }}
                  animate={{
                    opacity: isScrolling ? 0 : isCardReadyToShow ? 1 : 0,
                  }}
                  transition={{
                    ...optimizedCardTransition,
                    opacity: { duration: 0.25, delay: 0.05 }, // Smooth fade-in after positioning
                  }}
                  style={{
                    position: floatingState?.strategy || "absolute",
                    top: 0,
                    left: 0,
                    transform: "none", // Floating UI handles positioning with x,y
                    visibility: floatingState ? "visible" : "hidden",
                    x: floatingState?.x,
                    y: floatingState?.y,
                  }}
                >
                  <CardComponent
                    step={currentTourSteps?.[currentStep]!}
                    tour={currentTourObject}
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
