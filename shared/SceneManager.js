/*== 场景管理器 — 地图初始化 + 场景效果 + 建筑加载 + 日夜切换 ==*/

const SceneManager = (function () {
    let viewer = null;
    let buildingCustomShader = null;
    let isNightMode = true;

    // === 建筑自定义着色器 ===
    const BUILDING_SHADER = `
    void fragmentMain(FragmentInput fsInput, inout czm_modelMaterial material) {
        vec3 positionMC = fsInput.attributes.positionMC;
        vec3 positionEC = fsInput.attributes.positionEC;
        vec3 normalEC = fsInput.attributes.normalEC;
        vec3 posToCamera = normalize(-positionEC);
        vec3 coord = normalize(vec3(czm_inverseViewRotation * reflect(posToCamera, normalEC)));
        float ambientCoefficient = 0.3;
        float diffuseCoefficient = max(0.0, dot(normalEC, czm_sunDirectionEC));

        if (u_isDark) {
            vec4 darkRefColor = texture(u_envTexture2, vec2(coord.x, (coord.z - coord.y) / 2.0));
            material.diffuse = mix(
                mix(vec3(0.3), vec3(0.1, 0.2, 0.4), clamp(positionMC.z / 200.0, 0.0, 1.0)),
                darkRefColor.rgb,
                0.3
            );
            material.diffuse *= 0.25;

            float baseHeight = -40.0;
            float heightRange = 20.0;
            float glowRange = 300.0;
            float buildingHeight = positionMC.z - baseHeight;
            float pulse = fract(czm_frameNumber / 120.0) * 3.14159265 * 2.0;
            float gradient = buildingHeight / heightRange + sin(pulse) * 0.1;
            material.diffuse *= vec3(gradient);

            float scanTime = fract(czm_frameNumber / 120.0);
            scanTime = abs(scanTime - 0.5) * 2.0;
            float h = clamp(buildingHeight / glowRange, 0.0, 1.0);
            float diff = step(0.015, abs(h - scanTime));
            float lineMask = 1.0 - diff;
            vec3 lineColor = vec3(0.7);
            material.diffuse = mix(material.diffuse, lineColor, lineMask * 0.6);
        } else {
            vec4 dayRefColor = texture(u_envTexture, vec2(coord.x, (coord.z - coord.y) / 3.0));
            material.diffuse = mix(
                mix(vec3(0.0), vec3(0.5), clamp(positionMC.z / 300.0, 0.0, 1.0)),
                dayRefColor.rgb,
                0.3
            );
            material.diffuse *= min(diffuseCoefficient + ambientCoefficient, 1.0);
        }

        material.alpha = 1.0;
    }
`;

    // === 默认配置 ===
    const DEFAULTS = {
        cesiumAccessToken: '',
        terrainProvider: null,
        customShaderText: BUILDING_SHADER,
        envTextureDay: '../../assets/images/sky.jpg',
        envTextureNight: '../../assets/images/pic.jpg',
        buildingMinHeight: 30,
        isNightMode: true,
        resolutionScale: 1.5,
        shadowMapSize: 2048,
        fogDensity: 0.00015,
        fogMinBrightness: 0.2,
        msaaSamples: 2,
        buildingMaxScreenSpaceError: 8,
        buildingTileCacheSize: 384,
        flyToDuration: 3
    };

    // === 初始化地图 ===
    async function init(containerId, options) {
        const opts = Object.assign({}, DEFAULTS, options || {});

        viewer = new Cesium.Viewer(containerId, {
            animation: false,
            baseLayerPicker: false,
            fullscreenButton: false,
            vrButton: false,
            geocoder: false,
            homeButton: false,
            infoBox: false,
            sceneModePicker: false,
            selectionIndicator: false,
            timeline: false,
            navigationHelpButton: false,
            navigationInstructionsInitiallyVisible: false,
            shouldAnimate: true,
            terrain: opts.terrainProvider || Cesium.Terrain.fromWorldTerrain(),
            msaaSamples: opts.msaaSamples,
            contextOptions: {
                webgl: {
                    alpha: false,
                    antialias: true,
                    preserveDrawingBuffer: true,
                    powerPreference: 'high-performance'
                }
            }
        });

        viewer.cesiumWidget.creditContainer.style.display = 'none';
        viewer.resolutionScale = opts.resolutionScale;

        initSceneEffects(opts);

        await loadBuildings(opts);

        isNightMode = opts.isNightMode;
        applySceneMode(isNightMode);

        return viewer;
    }

    // === 初始化场景效果 ===
    function initSceneEffects(opts) {
        const scene = viewer.scene;

        scene.globe.enableLighting = true;
        scene.globe.depthTestAgainstTerrain = true;
        scene.highDynamicRange = true;

        scene.light = new Cesium.DirectionalLight({
            direction: new Cesium.Cartesian3(0.6, -0.4, -0.7),
            intensity: 2.5
        });

        scene.backgroundColor = new Cesium.Color(0.05, 0.08, 0.15, 1.0);

        scene.fog.enabled = true;
        scene.fog.density = opts.fogDensity;
        scene.fog.minimumBrightness = opts.fogMinBrightness;

        scene.shadowMap.enabled = true;
        scene.shadowMap.size = opts.shadowMapSize;
        scene.shadowMap.softShadows = true;
        scene.shadowMap.darkness = 0.4;

        scene.globe.dynamicAtmosphereLighting = true;
        scene.globe.dynamicAtmosphereLightingFromSun = true;

        scene.hdr = true;
        scene.globe.maximumScreenSpaceError = 4;
        scene.postProcessStages.fxaa.enabled = true;
        scene.globe.tileCacheSize = opts.buildingTileCacheSize;
    }

    // === 加载3D建筑 ===
    async function loadBuildings(opts) {
        try {
            const osmBuildings = await Cesium.createOsmBuildingsAsync(viewer);

            buildingCustomShader = new Cesium.CustomShader({
                uniforms: {
                    u_envTexture: {
                        value: new Cesium.TextureUniform({
                            url: opts.envTextureDay
                        }),
                        type: Cesium.UniformType.SAMPLER_2D
                    },
                    u_envTexture2: {
                        value: new Cesium.TextureUniform({
                            url: opts.envTextureNight
                        }),
                        type: Cesium.UniformType.SAMPLER_2D
                    },
                    u_isDark: {
                        value: isNightMode,
                        type: Cesium.UniformType.BOOL
                    }
                },
                mode: Cesium.CustomShaderMode.REPLACE_MATERIAL,
                lightingModel: Cesium.LightingModel.UNLIT,
                fragmentShaderText: opts.customShaderText || BUILDING_SHADER
            });

            osmBuildings.customShader = buildingCustomShader;

            // 过滤低矮建筑
            osmBuildings.tileVisible.addEventListener(function (tile) {
                const content = tile.content;
                const featureCount = content.featuresLength;
                for (let i = 0; i < featureCount; i++) {
                    const feature = content.getFeature(i);
                    const height = Number(feature.getProperty('height'));
                    const estimatedHeight = Number(feature.getProperty('cesium#estimatedHeight'));
                    const resolvedHeight = Number.isFinite(height)
                        ? height
                        : (Number.isFinite(estimatedHeight) ? estimatedHeight : NaN);
                    feature.show = !Number.isFinite(resolvedHeight) || resolvedHeight >= opts.buildingMinHeight;
                }
            });

            osmBuildings.maximumScreenSpaceError = opts.buildingMaxScreenSpaceError;
            viewer.scene.primitives.add(osmBuildings);
        } catch (error) {
            console.error('加载建筑失败:', error);
        }
    }

    // === 应用场景模式 ===
    function applySceneMode(useNightMode) {
        isNightMode = useNightMode;
        const scene = viewer.scene;

        if (isNightMode) {
            scene.light = new Cesium.DirectionalLight({
                direction: new Cesium.Cartesian3(0.6, -0.4, -0.7),
                intensity: 0.50
            });
            scene.sun.show = false;
            scene.moon.show = false;
            scene.skyAtmosphere.show = false;
            scene.globe.showGroundAtmosphere = false;
            scene.globe.dynamicAtmosphereLighting = false;
            scene.globe.dynamicAtmosphereLightingFromSun = false;

            if (buildingCustomShader) {
                buildingCustomShader.setUniform('u_isDark', true);
            }
        } else {
            scene.light = new Cesium.DirectionalLight({
                direction: new Cesium.Cartesian3(0.6, -0.4, -0.7),
                intensity: 2.5
            });
            scene.sun.show = true;
            scene.moon.show = false;
            scene.skyAtmosphere.show = true;
            scene.globe.showGroundAtmosphere = true;
            scene.globe.dynamicAtmosphereLighting = true;
            scene.globe.dynamicAtmosphereLightingFromSun = true;

            if (buildingCustomShader) {
                buildingCustomShader.setUniform('u_isDark', false);
            }
        }
    }

    // === 切换日夜模式 ===
    function toggleSceneMode() {
        applySceneMode(!isNightMode);
        return isNightMode;
    }

    // === 飞行动画 ===
    function flyTo(destination, orientation, duration) {
        const dur = duration || DEFAULTS.flyToDuration;
        viewer.camera.flyTo({
            destination: destination,
            orientation: orientation || {},
            duration: dur
        });
    }

    // === 获取 Viewer ===
    function getViewer() {
        return viewer;
    }

    // === 获取当前模式 ===
    function getIsNightMode() {
        return isNightMode;
    }

    // === 公开 API ===
    return {
        init: init,
        toggleSceneMode: toggleSceneMode,
        applySceneMode: applySceneMode,
        flyTo: flyTo,
        getViewer: getViewer,
        getIsNightMode: getIsNightMode
    };
})();
