(function bootstrapCesiumShared() {
    function cloneContextOptions(contextOptions) {
        if (!contextOptions) {
            return undefined;
        }

        return {
            ...contextOptions,
            webgl: contextOptions.webgl ? { ...contextOptions.webgl } : undefined,
        };
    }

    function buildViewerOptions(overrides) {
        const sharedConfig = window.CESIUM_SHARED_CONFIG || {};
        const defaultOptions = sharedConfig.viewerDefaults || {};
        const options = {
            ...defaultOptions,
            contextOptions: cloneContextOptions(defaultOptions.contextOptions),
        };

        if (window.Cesium?.Terrain?.fromWorldTerrain) {
            options.terrain = window.Cesium.Terrain.fromWorldTerrain();
        }

        if (!overrides) {
            return options;
        }

        const mergedOptions = {
            ...options,
            ...overrides,
        };

        if (overrides.contextOptions) {
            mergedOptions.contextOptions = {
                ...options.contextOptions,
                ...overrides.contextOptions,
                webgl: {
                    ...(options.contextOptions?.webgl || {}),
                    ...(overrides.contextOptions.webgl || {}),
                },
            };
        }

        if (overrides.terrain === null) {
            delete mergedOptions.terrain;
        }

        return mergedOptions;
    }

    window.createCesiumViewer = function createCesiumViewer(containerId, overrides) {
        if (!window.Cesium) {
            throw new Error('Cesium 尚未加载，无法创建 Viewer');
        }

        const sharedConfig = window.CESIUM_SHARED_CONFIG || {};
        if (sharedConfig.ionAccessToken && window.Cesium.Ion) {
            window.Cesium.Ion.defaultAccessToken = sharedConfig.ionAccessToken;
        }

        return new window.Cesium.Viewer(containerId, buildViewerOptions(overrides));
    };

    window.hideCesiumCredits = function hideCesiumCredits(viewer) {
        if (viewer?.cesiumWidget?.creditContainer) {
            viewer.cesiumWidget.creditContainer.style.display = 'none';
        }
    };
})();
