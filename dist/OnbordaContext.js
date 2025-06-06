"use client";
import { jsx as _jsx } from "react/jsx-runtime";
import { createContext, useContext, useState, useCallback, useEffect, } from "react";
// Example Hooks Usage:
// const { setCurrentStep, closeOnborda, startOnborda } = useOnborda();
// // To trigger a specific step
// setCurrentStep(2); // step 3
// // To close/start onboarding
// closeOnborda();
// startOnborda();
const OnbordaContext = createContext(undefined);
const useOnborda = () => {
    const context = useContext(OnbordaContext);
    if (context === undefined) {
        throw new Error("useOnborda must be used within an OnbordaProvider");
    }
    return context;
};
const OnbordaProvider = ({ children, tours = [], activeTour = null, defaultIsOnbordaVisible = true, }) => {
    const [currentTour, setCurrentTourState] = useState(null);
    const [currentStep, setCurrentStepState] = useState(0);
    const [isOnbordaVisible, setOnbordaVisible] = useState(false);
    const [currentTourSteps, setCurrentTourStepsState] = useState([]);
    const [completedSteps, setCompletedSteps] = useState(new Set());
    const [isStepChanging, setIsStepChanging] = useState(false);
    // Start the active tour on mount
    useEffect(() => {
        if (activeTour && currentTour === null) {
            startOnborda(activeTour);
        }
    }, [activeTour]);
    const setCurrentStep = useCallback((step, delay) => {
        // If step is a string, find the index of the step with that id
        if (typeof step === "string") {
            const index = currentTourSteps.findIndex((s) => s?.id === step);
            if (index === -1) {
                throw new Error(`Step with id ${step} not found`);
            }
            step = index;
        }
        if (delay) {
            setTimeout(() => {
                setCurrentStepState(step);
            }, delay);
        }
        else {
            setCurrentStepState(step);
        }
    }, []);
    const closeOnborda = useCallback(() => {
        // If all steps are completed, call the onComplete function
        if (completedSteps.size === currentTourSteps.length) {
            const tour = tours.find((tour) => tour.tour === currentTour);
            if (tour) {
                tour.onComplete?.(tour);
            }
        }
        setOnbordaVisible(false);
        setCurrentTourState(null);
        setCurrentTourStepsState([]);
        setCurrentStepState(0);
        setCompletedSteps(new Set());
    }, [currentTour, currentTourSteps, completedSteps]);
    const initializeCompletedSteps = useCallback(async (tour) => {
        // Get the initial state of the completed steps
        const completeSteps = (tour?.initialCompletedStepsState &&
            (await tour.initialCompletedStepsState())) ||
            tour.steps.map(() => false);
        const firstIncomplete = completeSteps.findIndex((result) => !result);
        const completed = completeSteps.reduce((acc, result, index) => {
            if (result) {
                acc.push(index);
            }
            return acc;
        }, []);
        setCompletedSteps(new Set(completed));
        // If all steps are completed, return the last step
        return firstIncomplete === -1 ? tour.steps.length - 1 : firstIncomplete;
    }, [currentTour]);
    const setCurrentTour = useCallback((tourName, visible, initStep) => {
        if (!tourName) {
            closeOnborda();
            return;
        }
        setCurrentTourState(tourName);
        const tour = tours.find((tour) => tour.tour === tourName);
        setCurrentTourStepsState(tour?.steps || []);
        tour &&
            initializeCompletedSteps(tour).then((r) => {
                setCurrentStep(initStep ?? r);
                setOnbordaVisible(visible ?? defaultIsOnbordaVisible);
            });
    }, [tours]);
    const startOnborda = useCallback((tourName, visible, step) => {
        closeOnborda(); // Reset the current tour
        setCurrentTour(tourName, visible, step);
    }, [setCurrentTour]);
    return (_jsx(OnbordaContext.Provider, { value: {
            tours,
            currentTour,
            currentStep,
            currentTourSteps,
            setCurrentStep,
            closeOnborda,
            startOnborda,
            isOnbordaVisible,
            setOnbordaVisible,
            completedSteps,
            setCompletedSteps,
            isStepChanging,
            setIsStepChanging,
        }, children: children }));
};
export { OnbordaProvider, useOnborda };
