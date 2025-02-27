import { Transition } from "framer-motion";
import { defaultBreakpoints } from "../Onborda";

// Provider
export interface OnbordaProviderProps {
  /** The children elements to be rendered inside the OnbordaProvider component */
  children: React.ReactNode;
  /** An array of tours, each containing multiple steps */
  tours: Tour[];
  /** Active Tour */
  activeTour?: string;
  /** Initial isOnbordaVisible state */
  defaultIsOnbordaVisible?: boolean;
}

// Context
export interface OnbordaContextType {
  /** array of tours */
  tours: Tour[];
  /** current step index */
  currentStep: number;
  /** current tour name */
  currentTour: string | null;
  /** current tour steps */
  currentTourSteps: Step[];
  /** function to set the current step */
  setCurrentStep: (step: number | string, delay?: number) => void;
  /** function to close Onborda */
  closeOnborda: () => void;
  /** function to start Onborda */
  startOnborda: (
    tourName: string,
    visible?: boolean,
    step?: number | string
  ) => void;
  /** flag to check if Onborda is visible */
  isOnbordaVisible: boolean;
  /** function to set the visibility of Onborda */
  setOnbordaVisible: (visible: boolean) => void;
  /** default completed steps */
  completedSteps: Set<number>;
  /** setstate function to set the completed steps */
  setCompletedSteps: React.Dispatch<React.SetStateAction<Set<number>>>;
  /** flag to check if the step is changing, can be used to prevent multiple clicks on the same step by disabling the button for instance */
  isStepChanging: boolean;
  /** function to set the step changing */
  setIsStepChanging: (isStepChanging: boolean) => void;
}

export type Breakpoint = keyof typeof defaultBreakpoints | "default";

export type Side =
  | "top"
  | "bottom"
  | "left"
  | "right"
  | "top-left"
  | "top-right"
  | "bottom-left"
  | "bottom-right"
  | "left-top"
  | "left-bottom"
  | "right-top"
  | "right-bottom";

export type ExtendedBreakpoint = Breakpoint | (string & {});
// Adding a new type that extends Side to allow any string
export type ExtendedSide = Side | (string & {});

// Step
export interface Step {
  // Step Content
  /** The unique identifier for the step */
  id?: string;
  /** The title of the step */
  title?: string;
  /** The content to be displayed in the step */
  content: React.ReactNode;
  /** The icon to be displayed in the step */
  icon?: React.ReactNode | string | null;
  /** The CSS selector for the element to highlight. Takes precedence over customQuerySelector if both are provided. */
  selector?: string;
  /** A custom function to query the target element. Ignored if selector is provided. */
  customQuerySelector?: () => Element | null;
  /** The CSS selector for the element to click on the next step. */
  clickElementOnNext?: string;
  /** The CSS selector for the element to click on the previous step. */
  clickElementOnPrev?: string;
  /** The CSS selector for the element to click on when the step is unset with the setStep function. */
  clickElementOnUnset?: string;
  /** The CSS selector for the element to click on when the step is set with the setStep function. */
  clickElementOnSet?: string;

  // Options
  /** The side where the step should be displayed for each breakpoint, setting the default will apply to all breakpoints, setting a specific breakpoint will override the default */
  side?: Partial<Record<ExtendedBreakpoint, ExtendedSide>>;
  /** Flag to show or hide the controls */
  showControls?: boolean;
  /** Padding around the pointer */
  pointerPadding?: number;
  /** Radius of the pointer */
  pointerRadius?: number;
  /** Flag to make the step interactable */
  interactable?: boolean;
  /** Conditions to be met before the next step can be triggered. Function is bound to on observer on the focused element, or observerSelector element if set. */
  isCompleteConditions?: (element: Element | null) => boolean;
  /** Selector for Element/s that an observer is attached to listen for changes. Upon each observation, isCompleteConditions is triggered. */
  observerSelector?: string;

  // Routing
  /** The route for this step */
  route?: string;
  /** The route to navigate to for the next step */
  /** @deprecated Use `route` instead */
  nextRoute?: string;
  /** The route to navigate to for the previous step */
  /** @deprecated Use `route` instead */
  prevRoute?: string;

  // Callbacks
  /** Callback function to be called when the step is completed */
  onComplete?: () => Promise<void>;

  /** Any additional data for custom use */
  [key: string]: any;
}

// Tour
//
export interface Tour {
  /** The tour ID */
  tour: string;
  /** Tour Title */
  title?: string;
  /** Tour Description */
  description?: string;
  /** An array of steps in the tour */
  steps: Step[];
  /** Complete Callback */
  onComplete?: () => void;
  /** Tour can be dismissed. */
  dismissible?: boolean;
  /** Any additional data for custom use */
  [key: string]: any;
  /** Initial completed steps state of the tour. an async function called on tour started. Can be a Server Action e.g. Promise.all([]) on API calls. */
  initialCompletedStepsState?: () => Promise<boolean[]>;
}

// Onborda
//
export interface OnbordaProps {
  /** The children elements to be rendered inside the Onborda component */
  children: React.ReactNode;

  /** An array of tours, each containing multiple steps */
  /** @deprecated Use `OnbordaProvider.tours` instead */
  steps?: Tour[];

  /** Flag to show or hide the Onborda component */
  /** @deprecated Use `OnbordaProvider.defaultIsOnbordaVisible` instead */
  showOnborda?: boolean;

  /** RGB value for the shadow color */
  shadowRgb?: string;

  /** Opacity value for the shadow */
  shadowOpacity?: string;

  /** Transition settings for the card component */
  cardTransition?: Transition;

  /** Custom card component to be used in the Onborda */
  cardComponent?: React.ComponentType<CardComponentProps>;

  /** Custom tour component to be used in the Onborda */
  tourComponent?: React.ComponentType<TourComponentProps>;
  /**
   * Breakpoints for the Onborda.
   * @default
   * {
   *   xs: 480,
   *   sm: 640,
   *   md: 768,
   *   lg: 1024,
   *   xl: 1280,
   *   "2xl": 1536,
   *   "3xl": 1920
   * }
   */
  breakpoints?: Partial<Record<Breakpoint, number>> & {
    [key: string]: number;
  };

  /** Extend the default sides of the Onborda with custom CSS.
   * @example
   * {
   *   customSide: {
   *     transform: "translate(-50%, 0)",
   *     left: "50%",
   *     bottom: "100%",
   *     marginBottom: "25px",
   *   },
   * }
   *
   * and then use it in the side prop in the step:
   * {
   *   side: {
   *     default: "customSide",
   *   },
   * }
   */
  extendSides?: {
    [key: string]: React.CSSProperties;
  };

  /** Flag to enable or disable debug mode */
  debug?: boolean;

  /** Timeout value for the observer when observing for the target element */
  observerTimeout?: number;
}

// Custom Card
export interface CardComponentProps {
  /** The current step object containing details of the step */
  step: Step;

  /** The current tour object containing details of the tour */
  tour: Tour;

  /** The index of the current step */
  currentStep: number;

  /** The total number of steps in the tour */
  totalSteps: number;

  /** Function to set the current step by step index or step.id */
  setStep: (step: number | string) => void;

  /** Function to navigate to the next step */
  nextStep: () => void;

  /** Function to navigate to the previous step */
  prevStep: () => void;

  /** Function to close the Onborda */
  closeOnborda: () => void;

  /** Function to set the tour visibility */
  setOnbordaVisible: (visible: boolean) => void;

  /** The arrow element to be displayed in the card */
  arrow: JSX.Element;

  /** Array of completed steps */
  completedSteps: (string | number)[];

  /** Is waiting for Route change */
  pendingRouteChange: boolean;
}

// Tour Component
export interface TourComponentProps {
  /** The current tour name */
  currentTour: string | null;
  /** The index of the current step */
  currentStep: number;
  /** The current Tour object containing details of the tour */
  tour: Tour;
  /** Function to set the current step by step index or step.id */
  setStep: (step: number | string) => void;
  /** Array of completed steps */
  completedSteps: (string | number)[];
  /** Function to close the Onborda */
  closeOnborda: () => void;
}
