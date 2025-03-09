"use strict";
'use client';
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.AppStateProvider = exports.useAppState = void 0;
const react_1 = __importStar(require("react"));
const use_toast_1 = require("@/components/ui/use-toast");
const AppStateContext = (0, react_1.createContext)({
    appState: {
        spaces: null,
        activeSpace: null,
        conversations: null,
        isLoading: false,
        error: null,
        lastFetched: null,
    },
    refreshAppState: async () => { },
    setAppState: () => { },
    clearError: () => { },
});
const useAppState = () => (0, react_1.useContext)(AppStateContext);
exports.useAppState = useAppState;
const AppStateProvider = ({ children }) => {
    const [appState, setAppState] = (0, react_1.useState)({
        spaces: null,
        activeSpace: null,
        conversations: null,
        isLoading: true,
        error: null,
        lastFetched: null,
    });
    const refreshAppState = async () => {
        try {
            if (typeof window !== 'undefined' && window.electronAPI) {
                setAppState(prev => ({ ...prev, isLoading: true, error: null }));
                try {
                    const freshState = await window.electronAPI.refreshAppData();
                    setAppState({
                        spaces: freshState.spaces || null,
                        activeSpace: freshState.activeSpace || null,
                        conversations: freshState.conversations || null,
                        isLoading: false,
                        error: null,
                        lastFetched: freshState.lastFetched || Date.now(),
                    });
                }
                catch (electronError) {
                    // Fallback to fetch API if Electron handler is not registered
                    const response = await fetch('/api/app-state');
                    if (!response.ok) {
                        throw new Error('Failed to fetch app state');
                    }
                    const freshState = await response.json();
                    setAppState({
                        spaces: freshState.spaces || null,
                        activeSpace: freshState.activeSpace || null,
                        conversations: freshState.conversations || null,
                        isLoading: false,
                        error: null,
                        lastFetched: Date.now(),
                    });
                }
            }
            else {
                // In non-Electron environment, use fetch API
                const response = await fetch('/api/app-state');
                if (!response.ok) {
                    throw new Error('Failed to fetch app state');
                }
                const freshState = await response.json();
                setAppState({
                    spaces: freshState.spaces || null,
                    activeSpace: freshState.activeSpace || null,
                    conversations: freshState.conversations || null,
                    isLoading: false,
                    error: null,
                    lastFetched: Date.now(),
                });
            }
        }
        catch (error) {
            console.error('Error refreshing app state:', error);
            const errorMessage = error instanceof Error ? error.message : 'Failed to refresh data';
            setAppState(prev => ({
                ...prev,
                isLoading: false,
                error: errorMessage
            }));
            (0, use_toast_1.toast)({
                title: "Error",
                description: errorMessage,
                variant: "destructive"
            });
        }
    };
    // Update the app state
    const updateAppState = (newState) => {
        setAppState(prev => {
            const updated = { ...prev, ...newState, error: null };
            // Sync with Electron if available
            if (typeof window !== 'undefined' && window.electronAPI) {
                window.electronAPI.syncAppState(updated).catch(async (error) => {
                    console.error('Error syncing app state:', error);
                    // Fallback to fetch API if Electron handler is not registered
                    try {
                        const response = await fetch('/api/app-state', {
                            method: 'POST',
                            headers: { 'Content-Type': 'application/json' },
                            body: JSON.stringify(updated)
                        });
                        if (!response.ok) {
                            throw new Error('Failed to sync app state');
                        }
                    }
                    catch (fetchError) {
                        console.error('Error syncing app state via fetch:', fetchError);
                        (0, use_toast_1.toast)({
                            title: "Error",
                            description: "Failed to sync app state",
                            variant: "destructive"
                        });
                    }
                });
            }
            else {
                // In non-Electron environment, use fetch API
                fetch('/api/app-state', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(updated)
                }).catch(error => {
                    console.error('Error syncing app state via fetch:', error);
                    (0, use_toast_1.toast)({
                        title: "Error",
                        description: "Failed to sync app state",
                        variant: "destructive"
                    });
                });
            }
            return updated;
        });
    };
    // Clear any error state
    const clearError = () => {
        setAppState(prev => ({ ...prev, error: null }));
    };
    // Initialize the app state
    (0, react_1.useEffect)(() => {
        const getInitialState = async () => {
            try {
                if (typeof window !== 'undefined' && window.electronAPI) {
                    try {
                        const initialState = await window.electronAPI.getAppState();
                        if (initialState) {
                            setAppState({
                                spaces: initialState.spaces || null,
                                activeSpace: initialState.activeSpace || null,
                                conversations: initialState.conversations || null,
                                isLoading: false,
                                error: null,
                                lastFetched: initialState.lastFetched || Date.now(),
                            });
                            return;
                        }
                    }
                    catch (electronError) {
                        console.log('Electron API not available, falling back to fetch');
                    }
                }
                // Fallback to fetch API
                const response = await fetch('/api/app-state');
                if (!response.ok) {
                    throw new Error('Failed to fetch initial app state');
                }
                const initialState = await response.json();
                setAppState({
                    spaces: initialState.spaces || null,
                    activeSpace: initialState.activeSpace || null,
                    conversations: initialState.conversations || null,
                    isLoading: false,
                    error: null,
                    lastFetched: Date.now(),
                });
            }
            catch (error) {
                console.error('Error getting initial app state:', error);
                const errorMessage = error instanceof Error ? error.message : 'Failed to get initial app state';
                setAppState(prev => ({
                    ...prev,
                    isLoading: false,
                    error: errorMessage
                }));
                (0, use_toast_1.toast)({
                    title: "Error",
                    description: errorMessage,
                    variant: "destructive"
                });
            }
        };
        getInitialState();
    }, []);
    // Listen for app state updates from Electron
    (0, react_1.useEffect)(() => {
        if (typeof window !== 'undefined' && window.electronAPI) {
            const unsubscribe = window.electronAPI.onAppDataUpdated((event, updatedState) => {
                if (updatedState) {
                    setAppState({
                        spaces: updatedState.spaces || null,
                        activeSpace: updatedState.activeSpace || null,
                        conversations: updatedState.conversations || null,
                        isLoading: false,
                        error: null,
                        lastFetched: updatedState.lastFetched || Date.now(),
                    });
                }
            });
            // Clean up listener on unmount
            return () => {
                if (unsubscribe)
                    unsubscribe();
            };
        }
    }, []);
    return (<AppStateContext.Provider value={{ appState, refreshAppState, setAppState: updateAppState, clearError }}>
      {children}
    </AppStateContext.Provider>);
};
exports.AppStateProvider = AppStateProvider;
