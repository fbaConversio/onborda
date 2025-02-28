# Onborda - Next.js onboarding flow

NB: This is a fork of alexc-harrap's own fork of Onborda (https://github.com/Libresoft-UK/onborda/tree/main).

Onborda is a lightweight onboarding flow that utilises [framer-motion](https://www.framer.com/motion/) for animations and [tailwindcss](https://tailwindcss.com/) for styling. Fully customisable pointers (tooltips) that can easily be used with [shadcn/ui](https://ui.shadcn.com/) for modern web applications.

- **Demo - [onborda.vercel.app](https://onborda.vercel.app)**
- **[Demo repository](https://github.com/uixmat/onborda-demo)**

## Getting started

```bash
# npm
npm i @fbaconversio/onborda
# pnpm
pnpm add @fbaconversio/onborda
# yarn
yarn add @fbaconversio/onborda
# bun
bun i @fbaconversio/onborda
```

### Global `layout.tsx`

```tsx
<OnbordaProvider tours={tours}>
  <Onborda
    cardComponent={CustomCardComponent}
    tourComponent={CustomTourComponent}
  >
    {children}
  </Onborda>
</OnbordaProvider>
```

### Components & `page.tsx`

Optionally target anything in your app using the elements `id` attribute to overlay a backdrop and highlight the target element. If no `selector` or `customQuerySelector` is provided, the overlay will cover the entire page and the step will display as a traditional modal.

```tsx
<div id="onborda-step1">Onboard Step</div>
```

### Tailwind config

Tailwind CSS will need to scan the node module in order to include the classes used. See [configuring source paths](https://tailwindcss.com/docs/content-configuration#configuring-source-paths) for more information about this topic.

> **Note** \_You only require this if you're **not using** a custom component.

```ts
const config: Config = {
  content: [
    "./node_modules/@fbaconversio/onborda/dist/**/*.{js,ts,jsx,tsx}", // Add this
  ],
};
```

### Card Component

If you require greater control over the card design or simply wish to create a totally custom component then you can do so easily. The following props can be used to customise your card component.

| Prop                 | Type                                | Description                                                                                   |
| -------------------- | ----------------------------------- | --------------------------------------------------------------------------------------------- |
| `step`               | `Step`                              | The current `Step` object from your steps array, including content, title, etc.               |
| `tour`               | `Tour`                              | The current `Tour` object from your tours array, including title, description, etc.           |
| `tours`              | `Tour[]`                            | All the current `Tour` object from your tours array, including title, description, etc.       |
| `currentStep`        | `number`                            | The index of the current step in the steps array.                                             |
| `totalSteps`         | `number`                            | The total number of steps in the onboarding process.                                          |
| `setStep`            | `(step: number \| string) => void;` | A function to set the current step in the onboarding process.                                 |
| `nextStep`           | `() => void`                        | A function to advance to the next step in the onboarding process.                             |
| `prevStep`           | `() => void`                        | A function to go back to the previous step in the onboarding process.                         |
| `closeOnborda`       | `() => void`                        | A function to close the onboarding process.                                                   |
| `setOnbordaVisible`  | `(visible: boolean) => void`        | A function to set the visibility of the onboarding overlay.                                   |
| `arrow`              | `JSX.Element`                       | An SVG object, the orientation is controlled by the steps side prop                           |
| `completedSteps`     | `number[]`                          | An array of completed step indexes/ids.                                                       |
| `pendingRouteChange` | `boolean`                           | A boolean to determine if a route change is pending. Only set if the step has a selector set. |

```tsx
"use client";
import type { CardComponentProps } from "onborda";

export const CustomCardComponent = ({
  step,
  currentStep,
  totalSteps,
  setStep,
  nextStep,
  prevStep,
  closeOnborda,
  arrow,
  completedSteps,
  pendingRouteChange,
}: CardComponentProps) => {
  return (
    <div>
      <h1>
        {step.icon} {step.title}{" "}
        {completedSteps.contains(currentStep) ? <>✅</> : <></>}
      </h1>
      <h2>
        {currentStep} of {totalSteps}
      </h2>
      <div>{step.content}</div>
      <button
        onClick={prevStep}
        disabled={pendingRouteChange || currentStep == 0}
      >
        Previous
      </button>
      <button
        onClick={nextStep}
        disabled={pendingRouteChange || currentStep === totalSteps - 1}
      >
        Next
      </button>
      <button onClick={closeOnborda} disabled={pendingRouteChange}>
        Finish
      </button>
      <button onClick={() => setStep(0)}>Restart</button>
      {arrow}
    </div>
  );
};
```

### Tour Component

If you require greater control over the tour design or simply wish to create a totally custom component then you can do so easily.

| Prop             | Type                                | Description                                                   |
| ---------------- | ----------------------------------- | ------------------------------------------------------------- |
| `tour`           | `Tour`                              | The current `Tour` object from your tours array.              |
| `currentTour`    | `string`                            | The current tour name.                                        |
| `currentStep`    | `number`                            | The index of the current step in the steps array.             |
| `completedSteps` | `number[]`                          | An array of completed step indexes/ids.                       |
| `setStep`        | `(step: number \| string) => void;` | A function to set the current step in the onboarding process. |
| `closeOnborda`   | `() => void`                        | A function to close the onboarding process.                   |

```tsx
"use client";
import type { TourComponentProps } from "onborda";

export const CustomTourComponent = ({
  tour,
  currentTour,
  currentStep,
  setStep,
  completedSteps,
  closeOnborda,
}: TourComponentProps) => {
  return (
    <div className={"absolute bottom-3 left-3 w-60 p-0"}>
      {" "}
      {/* Tailwind CSS classes to position TourCard in bottom left of screen */}
      <h1>{currentTour}</h1>
      <h2>
        {currentStep} of {tour.steps.length}
      </h2>
      <h2>
        {completedSteps.length} of {tour.steps.length} completed
      </h2>
      <ul>
        {tour.steps.map((step, index) => (
          <li key={index} onClick={() => setStep(index)}>
            {step.title} {completedSteps.contans(index) ? <>✅</> : <></>}
          </li>
        ))}
      </ul>
      <button
        onClick={closeOnborda}
        disabled={
          tour?.dismissible ? false : completedSteps.length < tour.steps.length
        }
      >
        {tour?.customCloseText || "Close"}
      </button>
    </div>
  );
};
```

### Tour object

| Prop                         | Type                       | Description                                                                                                                                                              |
| ---------------------------- | -------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `tour`                       | `string`                   | The name of the tour.                                                                                                                                                    |
| `steps`                      | `Step[]`                   | An array of `Step` objects defining each step of the tour.                                                                                                               |
| `title`                      | `string`                   | Optional. The title of the tour.                                                                                                                                         |
| `description`                | `string`                   | Optional. The description of the tour.                                                                                                                                   |
| `dismissible`                | `boolean`                  | Optional. Determines whether the user can dismiss the tour.                                                                                                              |
| `onComplete`                 | `() => void`               | Optional. A function that is called when the tour is completed.                                                                                                          |
| `initialCompletedStepsState` | `() => Promise<boolean[]>` | Optional. A client or server function that returns a promise that resolves to an array of booleans for each step. If true, the step is marked as completed on tour init. |
| `[key: string]`              | `any`                      | Optional. Any additional properties you wish to add. Will be available in the `useOnborda` hook as well as the TourCard component.                                       |

```tsx
const tour: Tour = {
  tour: "firstyour",
  steps: [Step],
};
```

### Step object

| Prop                   | Type                                                          | Description                                                                                                                                                                                 |
| ---------------------- | ------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `content`              | `React.ReactNode`                                             | The main content or body of the step.                                                                                                                                                       |
| `id`                   | `string`                                                      | Optional. A unique identifier for the step. If set, step can be acitavted using `setStep(step.id)`. Otherwise steps[] index is used.                                                        |
| `title`                | `string`                                                      | Optional. The title of your step                                                                                                                                                            |
| `icon`                 | `React.ReactNode`, `string`, `null`                           | Optional. An icon or element to display alongside the step title.                                                                                                                           |
| `selector`             | `string`                                                      | Optional. A string used to target an Element by `id` that this step refers to. Takes precedence over `customQuerySelector`.                                                                 |
| `customQuerySelector`  | `()=>Element \| null`                                         | Optional. A client function that returns the element to target that this step refers to. Proceeded by `selector`. <br> Useful for targeting complex elements, like those from UI libraries. |
| `clickElementOnNext`   | `string`                                                      | Optional. CSS selector for an element to click automatically when proceeding to the next step.                                                                                              |
| `clickElementOnPrev`   | `string`                                                      | Optional. CSS selector for an element to click automatically when going back to the previous step.                                                                                          |
| `clickElementOnUnset`  | `string`                                                      | Optional. CSS selector for an element to click automatically when the current step is unset using `setStep()`.                                                                              |
| `clickElementOnSet`    | `string`                                                      | Optional. CSS selector for an element to click automatically when this step is activated using `setStep()`.                                                                                 |
| `side`                 | `ExtendedSide` or `Partial<Record<Breakpoint, ExtendedSide>>` | Optional. Determines where the tooltip should appear relative to the target element. Can be configured for different breakpoints (see example below).                                       |
| `showControls`         | `boolean`                                                     | Optional. Determines whether control buttons (next, prev) should be shown if using the default card.                                                                                        |
| `pointerPadding`       | `number`                                                      | Optional. The padding around the pointer (keyhole) highlighting the target element.                                                                                                         |
| `pointerRadius`        | `number`                                                      | Optional. The border-radius of the pointer (keyhole) highlighting the target element.                                                                                                       |
| `route`                | `string`                                                      | Optional. The route to navigate to using `next/navigation` when this step is set.                                                                                                           |
| `interactable`         | `boolean`                                                     | Optional. Determines whether the user can interact with the target element.                                                                                                                 |
| `isCompleteConditions` | `(element: Element) => boolean`                               | Optional. A client function that returns a boolean. If true, the step is marked as completed. Called when the user interacts with the target element.                                       |
| `onComplete`           | `() => void`                                                  | Optional. A client function that is called when the step is marked as completed. Called if `isCompleteConditions` returns true.                                                             |
| `observerSelector`     | `string`                                                      | Optional. A querySelector string used to target an Element/s that this step refers to. Each element found will have a MutationObserver attached with a callback to `isCompleteConditions`.  |
| `[key: string]`        | `any`                                                         | Optional. Any additional properties you wish to add. Will be available in the `useOnborda` hook as well as the Card component.                                                              |
| <del>`nextRoute`</del> | <del>`string`</del>                                           | **Deprecated**. <del>Optional. The route to navigate to using `next/navigation` when moving to the next step.</del>                                                                         |
| <del>`prevRoute`</del> | <del>`string`</del>                                           | **Deprecated**. <del>Optional. The route to navigate to using `next/navigation` when moving to the previous step.</del>                                                                     |

> [!IMPORTANT]
> The `nextRoute` and `prevRoute` properties have been deprecated. Please use the `route` property instead.

> [!TIP]
> Each Element found by `observerSelector` will have a `data-onborda-observed` attribute set to `true` when the observer is attached. This can be used to target the observed elements in your Tailwind classes for styling. EG `data-[onborda-observed=true]:outline-warning` will add a yellow outline to the observed elements.

#### Responsive side positioning example

```tsx
const step: Step = {
  // Basic properties
  title: "Responsive Positioning Example",
  content: <>This card will position differently based on screen size</>,
  selector: "#target-element",

  // Responsive positioning
  side: {
    default: "top", // Default position for all breakpoints
    xs: "bottom", // Override for xs screens (< 480px)
    md: "left", // Override for md screens (≥ 768px)
    lg: "right", // Override for lg screens (≥ 1024px)
    xl: "customSide", // Use a custom side position for xl screens (≥ 1280px)
  },
};
```

### Onborda Props

| Property                 | Type                                                              | Description                                                                                                                                                                                                                                                                         |
| ------------------------ | ----------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `children`               | `React.ReactNode`                                                 | Your website or application content.                                                                                                                                                                                                                                                |
| `shadowRgb`              | `string`                                                          | Optional. The RGB values for the shadow color surrounding the target area. Defaults to black `"0,0,0"`.                                                                                                                                                                             |
| `shadowOpacity`          | `string`                                                          | Optional. The opacity value for the shadow surrounding the target area. Defaults to `"0.2"`                                                                                                                                                                                         |
| `cardTransition`         | `Transition`                                                      | Transitions between steps are of the type Transition from [framer-motion](https://www.framer.com/motion/transition/), see the [transition docs](https://www.framer.com/motion/transition/) for more info. Example: `{{ type: "spring" }}`.                                          |
| `cardComponent`          | `React.ReactNode`                                                 | The React component to use as the card for each step.                                                                                                                                                                                                                               |
| `tourComponent`          | `React.ReactNode`                                                 | The React component to use as a list of steps for the current tour.                                                                                                                                                                                                                 |
| `breakpoints`            | `Partial<Record<Breakpoint, number>> & { [key: string]: number }` | Optional. Override default breakpoints or add custom breakpoints for responsive positioning. Defaults to: `{ xs: 480, sm: 640, md: 768, lg: 1024, xl: 1280, "2xl": 1536, "3xl": 1920 }`. Values represent min-width in pixels.                                                      |
| `extendSides`            | `{ [key: string]: React.CSSProperties }`                          | Optional. Define custom side positions with specific CSS properties that can be referenced in a step's `side` property.                                                                                                                                                             |
| `debug`                  | `boolean`                                                         | Optional. Console logs the current step and the target element. Defaults to `false`.                                                                                                                                                                                                |
| `observerTimeout`        | `number`                                                          | Optional. The timeout in milliseconds for the observer to wait for the target element to be available. Defaults to `5000`. Observer is used to wait for the target element to be available before proceeding to the next step e.g. when the target element is on a different route. |
| <del>`showOnborda`</del> | <del>`boolean`</del>                                              | **Deprecated** <del>Optional. Controls the visibility of the onboarding overlay, eg. if the user is a first time visitor. Defaults to `false`.</del>                                                                                                                                |
| <del>`steps`</del>       | <del>`Array[]`</del>                                              | **Deprecated** <del>An array of `Step` objects defining each step of the onboarding process.</del>                                                                                                                                                                                  |

> [!IMPORTANT]
> The `steps` property has been deprecated. Please use the `OnbordaProvider.tours` property instead.
> The `showOnborda` property has been deprecated. Please use the `OnbordaProvider.defaultIsOnbordaVisible` property instead.

```tsx
<Onborda
  shadowRgb="55,48,163"
  shadowOpacity="0.8"
  cardComponent={CustomCard}
  tourComponent={CustomTour}
  cardTransition={{ duration: 2, type: "tween" }}
  breakpoints={{
    xs: 480,
    sm: 640,
    md: 768,
    lg: 1024,
    xl: 1280,
    "2xl": 1536,
    "3xl": 1920,
    custom: 2200, // Custom breakpoint
  }}
  extendSides={{
    // Define custom positioning styles
    customSide: {
      transform: "translate(-50%, 0)",
      left: "50%",
      bottom: "100%",
      marginBottom: "25px",
    },
    anotherCustomSide: {
      transform: "translate(0, -50%)",
      top: "50%",
      left: "100%",
      marginLeft: "25px",
    },
  }}
>
  {children}
</Onborda>
```

### OnbordaProvider Props

| Property                  | Type              | Description                                                                                |
| ------------------------- | ----------------- | ------------------------------------------------------------------------------------------ |
| `children`                | `React.ReactNode` | Your website or application content.                                                       |
| `tours`                   | `Tour[]`          | An array of `Tour` objects defining each tour of the onboarding process.                   |
| `activeTour`              | `string`          | Optional. The id of the active tour. If set, Onborda will start tour automatically.        |
| `defaultIsOnbordaVisible` | `boolean`         | Optional. Controls the visibility of the onboarding overlay on mount. Defaults to `false`. |

```tsx
<OnbordaProvider tours={tours}>{children}</OnbordaProvider>
```

### UseOnborda Context

The `useOnborda` hook provides a set of functions to control the onboarding process from any child within the `OnboardaProvider`. The hook returns an object with the following properties:

| Property            | Type                                                                     | Description                                                                                                                                              |
| ------------------- | ------------------------------------------------------------------------ | -------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `tours`             | `Tour[]`                                                                 | An array of `Tour` objects defining each tour of the onboarding process.                                                                                 |
| `startOnborda`      | `(tourName: string, visible?: boolean, step?: number \| string) => void` | A function to start the onboarding process. [visible] defaults to OnbordaProvider.defaultIsOnbordaVisible. [step] defaults to the first incomplete step. |
| `closeOnborda`      | `() => void`                                                             | A function to close the onboarding process.                                                                                                              |
| `curreentTour`      | `string`                                                                 | The name of the current tour.                                                                                                                            |
| `currentStep`       | `number`                                                                 | The index of the current step in the steps array.                                                                                                        |
| `setCurrentStep`    | `(step: number \| string) => void;`                                      | A function to set the current step in the onboarding process.                                                                                            |
| `currentTourSteps`  | `Step[]`                                                                 | The steps array for the current tour.                                                                                                                    |
| `completedSteps`    | `Set<number>`                                                            | An array of completed step indexes/ids.                                                                                                                  |
| `setCompletedSteps` | `React.Dispatch<React.SetStateAction<Set<number>>>`                      | A function to set the completed steps array.                                                                                                             |
| `isOnbordaVisible`  | `boolean`                                                                | A boolean to determine if the onboarding overlay is visible.                                                                                             |
| `setOnbordaVisible` | `React.Dispatch<React.SetStateAction<boolean>>`                          | A function to set the visibility of the onboarding overlay.                                                                                              |
| `isStepChanging`    | `boolean`                                                                | A boolean indicating if a step change is in progress. Useful to prevent multiple clicks while transitions are happening.                                 |
| `setIsStepChanging` | `(isStepChanging: boolean) => void`                                      | A function to manually control the step changing state.                                                                                                  |

```tsx
const {
  tours,
  startOnborda,
  closeOnborda,
  currentTour,
  currentStep,
  setCurrentStep,
  currentTourSteps,
  completedSteps,
  setCompletedSteps,
  isOnbordaVisible,
  setOnbordaVisible,
  isStepChanging,
  setIsStepChanging,
} = useOnborda();
```

### Example `tours` array with new features

```tsx
import { FirstTourInitialState } from "@app/lib/initialTourStates"; // Optional initial state from server action
const tours: Tour[] = [
  {
    tour: "firsttour",
    title: "First Tour",
    description: "This is the first tour",
    dismissible: false, // User can't dismiss the tour until all steps are completed
    customProperty: "This is a custom property passed to the Tour card",
    initialCompletedStepsState: FirstTourInitialState, // Optional server action called on tour init to get completed steps boolean array
    steps: [
      {
        icon: <>👋</>,
        title: "Tour 1, Step 1",
        content: <>First tour, first step</>,
        selector: "#tour1-step1",
        side: {
          default: "top",
          sm: "right",
          lg: "bottom",
        },
        clickElementOnNext: "#next-button", // When user clicks "Next", this element will also be clicked
        showControls: true,
        pointerPadding: 10,
        pointerRadius: 10,
        route: "/foo",
        customProperty: "This is a custom property passed to the Step card",
      },
      {
        icon: <>👋</>,
        title: "Tour 1, Step 2",
        content: (
          <>First tour, second step. To proceed please provide a value</>
        ),
        selector: "#tour1-step2-input", // target the input
        isCompleteConditions: (element) =>
          (element as HTMLInputElement)?.value?.trim() !== "", // check if the step is completed when element is interacted with
        interactable: true, // allow user to interact with the input
        side: "right",
        showControls: true,
        pointerPadding: 10,
        pointerRadius: 10,
        route: "/bar",
        clickElementOnSet: "#focus-input", // When this step is set using the setStep() function, click this element (e.g., focus an input)
      },
      {
        icon: <>👋</>,
        title: "Tour 1, Step 3",
        content: <>Thanks for settings the value</>,
        selector: "#tour1-step3",
        side: {
          default: "customSide", // Use custom positioning defined in extendSides
          lg: "bottom", // Override for larger devices
        },
        showControls: true,
        pointerPadding: 10,
        pointerRadius: 10,
        route: "/bar",
        clickElementOnUnset: "#save-button", // When leaving this step using the setStep() function, click the #save-button
      },
    ],
  },
];
```

### Contribution

To setup the project locally, clone the repository and run the following commands:

```bash
# Install dependencies
npm install
```

To test the local library in a local Next.js project, run the following command in this project to setup npm link

```bash
# Create a symlink to the package
npm link
```

Then in your Next.js project run the following command to link the package. This will create a symlink in your Next.js project to the local package.

```bash
# Link the package
npm link onborda
```

To unlink the package, run the following command in your Next.js project

```bash
# Unlink the package
npm unlink onborda
```

If you already have the published package installed in your project, the symlink will take precedence over the published package. Ensure to push changes to this package before pushing changes to your project.

Now you can make changes to the package and see them reflected in your Next.js project. The package must be built after every change to see the changes in your Next.js project.

```bash
# Build the package
npm run build
```

To save rebuilding the package after every change, you can run the following command in this project to watch for changes and rebuild the package, which will in turn update the symlink in your Next.js project.

```bash
# Watch for changes and rebuild the package
npm run dev
# Cancel the watch process
^c
```
