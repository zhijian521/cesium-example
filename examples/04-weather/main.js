// Cesium Ion Token
Cesium.Ion.defaultAccessToken = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJqdGkiOiI0OTAzZDRkZi00ODkyLTQ5OTUtOGE1MC1jN2JmNjc0ODdiOGUiLCJpZCI6MzMxMzk2LCJpYXQiOjE3NTUwNDgwNTV9.GH-UECFbXsiJip__VTu2oXoBmx8dt61E52q3rBakZyI';

// 全局变量
let viewer;
let airplaneEntity;
let pathEntity;
let isCameraLocked = false;
let infoPanelVisible = false;
let airplaneEntities = [];
let pathEntities = [];
let tailEffectEntities = [];
let buildingCustomShader;
let isNightMode = true;
let weatherComponent;
let ringPathPositions = [];
let selectedAirplaneIndex = 0; // 当前选中的飞机索�?
let cameraDistance = 500; // 相机跟随距离（米�?
let cameraHeightOffset = 200; // 相机高度偏移（米�?

// 东方明珠位置
const INFO_PANEL_OFFSET_Y_MIN = 20;
const INFO_PANEL_OFFSET_Y_MAX = 200;
const INFO_PANEL_DISTANCE_MIN = 300;
const INFO_PANEL_DISTANCE_MAX = 8000;
const CAMERA_DISTANCE_MIN = 100;
const CAMERA_DISTANCE_MAX = 2000;
const TARGET_SPEED_KMH = 280;
const SPEED_DISPLAY_RANGE_KMH = 20;
const BUILDING_MIN_VISIBLE_HEIGHT = 30.0;
const speedBaselineMap = new WeakMap();
const tailEffectToAirplaneIndexMap = new WeakMap();
const airplaneAlertStateMap = new WeakMap();

const WARNING_ICON_DATA_URL = createWarningIconDataUrl();

const STORM_EFFECT_CONFIG = {
    minHeightOffset: 220,
    maxHeightOffset: 560,
    lonLatJitter: 0.0046,
    billboardSpreadMeters: 620,
    coreRadius: 780,
    cloudBillboardSizeMeters: 260
};

const WEATHER_PRESET = 'rainstorm';
const WEATHER_PRESET_LABELS = {
    drizzle: 'С����',
    rainstorm: '��������',
    darkStorm: '������'
};

const WEATHER_SAMPLE_ANCHORS = [
    { lon: 121.4998, lat: 31.2397, radiusMeters: 920, label: '���������ܱ�' },
    { lon: 121.488, lat: 31.228, radiusMeters: 820, label: '½�����ϲ�' }
];

// 初始化地�?
async function initMap() {
    try {
        viewer = new Cesium.Viewer('cesiumContainer', {
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
            terrain: Cesium.Terrain.fromWorldTerrain(),
            // 渲染质量 - 平衡性能
            msaaSamples: 2, // 2x MSAA 抗锯�?
            contextOptions: {
                webgl: {
                    alpha: false,
                    antialias: true, // 启用 WebGL 抗锯�?
                    preserveDrawingBuffer: true,
                    powerPreference: 'high-performance'
                }
            }
        });

        // 隐藏版权信息
        viewer.cesiumWidget.creditContainer.style.display = 'none';

        // 初始化场景效�?
        initSceneEffects();

        weatherComponent = createWeatherEffectComponent(viewer, {
            baseHeight: dongfangmingzhu.height,
            preset: WEATHER_PRESET,
            config: STORM_EFFECT_CONFIG
        });

        // 加载建筑
        await loadBuildings();

        // 创建飞机和航�?
        createAirplaneAndPath();

        // 设置事件监听
        setupEventListeners();

        // 开始更新循�?
        viewer.scene.preRender.addEventListener(updateFrame);

        // 初始视角
        flyToOverview();

        // 隐藏加载提示
        setTimeout(() => {
            document.getElementById('loading').style.display = 'none';
        }, 2000);

    } catch (error) {
        console.error('初始化失�?', error);
        document.getElementById('loading').innerText = '����ʧ��';
    }
}

// 初始化场景效�?
function initSceneEffects() {
    const scene = viewer.scene;

    scene.globe.enableLighting = true;
    scene.globe.depthTestAgainstTerrain = true;
    scene.highDynamicRange = true;

    // 主光�?- 模拟阳光斜射，产生明显光�?
    scene.light = new Cesium.DirectionalLight({
        direction: new Cesium.Cartesian3(0.6, -0.4, -0.7),
        intensity: 2.5
    });

    // 背景�?- 调亮
    scene.backgroundColor = new Cesium.Color(0.05, 0.08, 0.15, 1.0);

    // 雾效
    scene.fog.enabled = true;
    scene.fog.density = 0.00015;
    scene.fog.minimumBrightness = 0.2;

    // 阴影设置
    scene.shadowMap.enabled = true;
    scene.shadowMap.size = 2048;
    scene.shadowMap.softShadows = true;
    scene.shadowMap.darkness = 0.4;

    // 环境�?- 增加整体亮度
    scene.globe.dynamicAtmosphereLighting = true;
    scene.globe.dynamicAtmosphereLightingFromSun = true;

    // 曝光和色调映�?- 提亮画面
    scene.hdr = true;
    scene.globe.maximumScreenSpaceError = 2;

    // === 清晰度与性能平衡 ===
    // 启用抗锯�?
    scene.postProcessStages.fxaa.enabled = true;

    // 分辨率比�?- 超高清设�?
    viewer.resolutionScale = 1.5;

    // 地形细节 - 适中
    scene.globe.maximumScreenSpaceError = 4;

    // 瓦片缓存
    scene.globe.tileCacheSize = 384;
    applySceneMode(isNightMode);
}

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

    updateSceneModeButton();
}

function toggleSceneMode() {
    applySceneMode(!isNightMode);
}

function updateSceneModeButton() {
    const button = document.getElementById('btnSceneMode');
    if (button) {
        button.textContent = isNightMode ? '�л�������' : '�л���ҹ��';
    }
}

// 加载3D建筑
async function loadBuildings() {
    try {
        const osmBuildings = await Cesium.createOsmBuildingsAsync(viewer);

        buildingCustomShader = new Cesium.CustomShader({
            uniforms: {
                u_envTexture: {
                    value: new Cesium.TextureUniform({
                        url: '../../assets/images/sky.jpg'
                    }),
                    type: Cesium.UniformType.SAMPLER_2D
                },
                u_envTexture2: {
                    value: new Cesium.TextureUniform({
                        url: '../../assets/images/pic.jpg'
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
            fragmentShaderText: BUILDING_SHADER_OPTIMIZED
        });

        osmBuildings.customShader = buildingCustomShader;
        osmBuildings.tileVisible.addEventListener((tile) => {
            const content = tile.content;
            const featureCount = content.featuresLength;
            for (let featureIndex = 0; featureIndex < featureCount; featureIndex++) {
                const feature = content.getFeature(featureIndex);
                const height = Number(feature.getProperty('height'));
                const estimatedHeight = Number(feature.getProperty('cesium#estimatedHeight'));
                const resolvedHeight = Number.isFinite(height)
                    ? height
                    : (Number.isFinite(estimatedHeight) ? estimatedHeight : NaN);
                feature.show = !Number.isFinite(resolvedHeight) || resolvedHeight >= BUILDING_MIN_VISIBLE_HEIGHT;
            }
        });

        osmBuildings.maximumScreenSpaceError = 8; // 建筑细节精度（平衡）
        viewer.scene.primitives.add(osmBuildings);

    } catch (error) {
        console.error('加载建筑失败:', error);
    }
}

// 创建飞机和航�?
function createAirplaneAndPath() {
    weatherComponent?.clearAllEffects();

    const startTime = Cesium.JulianDate.now();
    const duration = 60;
    const stopTime = Cesium.JulianDate.addSeconds(startTime, duration, new Cesium.JulianDate());

    // 设置时钟
    viewer.clock.startTime = startTime.clone();
    viewer.clock.stopTime = stopTime.clone();
    viewer.clock.currentTime = startTime.clone();
    viewer.clock.clockRange = Cesium.ClockRange.LOOP_STOP;
    viewer.clock.multiplier = 0.3; // 0.3倍�?
    viewer.clock.shouldAnimate = true;

    // === 航线1: 东方明珠环线 ===
    const numPoints = 100;
    const positionProperty1 = new Cesium.SampledPositionProperty();
    positionProperty1.setInterpolationOptions({
        interpolationDegree: 5,
        interpolationAlgorithm: Cesium.LagrangePolynomialApproximation
    });

    const pathPositions1 = [];

    for (let i = 0; i <= numPoints; i++) {
        const angle = (i / numPoints) * Math.PI * 2;
        const lon = dongfangmingzhu.lon + 0.015 * Math.cos(angle);
        const lat = dongfangmingzhu.lat + 0.015 * Math.sin(angle) * 0.85;

        const time = Cesium.JulianDate.addSeconds(startTime, (i / numPoints) * duration, new Cesium.JulianDate());
        const position = Cesium.Cartesian3.fromDegrees(lon, lat, dongfangmingzhu.height);

        positionProperty1.addSample(time, position);
        pathPositions1.push(Cesium.Cartesian3.fromDegrees(lon, lat, dongfangmingzhu.height));
    }

    ringPathPositions = pathPositions1.slice();

    weatherComponent?.createOnRing(pathPositions1);
    weatherComponent?.createFromAnchors(WEATHER_SAMPLE_ANCHORS);

    // 创建航线1
    pathEntity = viewer.entities.add({
        name: '�������黷�� - ����',
        polyline: {
            positions: pathPositions1,
            width: 3,
            material: new Cesium.PolylineGlowMaterialProperty({
                glowPower: 0.2,
                color: Cesium.Color.fromCssColorString('#90EE90').withAlpha(0.8)
            }),
            clampToGround: false
        }
    });
    pathEntities.push(pathEntity);

    // 创建飞机1
    airplaneEntity = viewer.entities.add({
        name: '�������黷�� - �ɻ�',
        position: positionProperty1,
        availability: new Cesium.TimeIntervalCollection([new Cesium.TimeInterval({
            start: startTime,
            stop: stopTime
        })]),
        model: {
            uri: '../../assets/models/shidi/shidi_Animi.gltf',
            scale: 5,
            minimumPixelSize: 80,
            maximumScale: 100
        },
        orientation: new Cesium.VelocityOrientationProperty(positionProperty1),
    });
    airplaneEntities.push(airplaneEntity);
    createTailBreathingEffectForAirplane(airplaneEntity, 0);

    // === 航线2: 滴水湖到崇明岛（往返） ===
    const numPoints2 = 1000; // 增加采样点，大幅降低速度（降�?0%�?
    const positionProperty2 = new Cesium.SampledPositionProperty();
    positionProperty2.setInterpolationOptions({
        interpolationDegree: 5,
        interpolationAlgorithm: Cesium.LagrangePolynomialApproximation
    });

    const pathPositions2 = [];
    const halfPoints = Math.floor(numPoints2 / 2);

    // 去程：滴水湖 -> 崇明�?
    for (let i = 0; i <= halfPoints; i++) {
        const t = i / halfPoints;
        const lon = dishuihu.lon + (chongmingdao.lon - dishuihu.lon) * t;
        const lat = dishuihu.lat + (chongmingdao.lat - dishuihu.lat) * t;

        const time = Cesium.JulianDate.addSeconds(startTime, (i / numPoints2) * duration, new Cesium.JulianDate());
        const position = Cesium.Cartesian3.fromDegrees(lon, lat, 800);

        positionProperty2.addSample(time, position);
        pathPositions2.push(Cesium.Cartesian3.fromDegrees(lon, lat, 800));
    }

    // 返程：崇明岛 -> 滴水�?
    for (let i = halfPoints; i <= numPoints2; i++) {
        const t = (i - halfPoints) / (numPoints2 - halfPoints);
        const lon = chongmingdao.lon + (dishuihu.lon - chongmingdao.lon) * t;
        const lat = chongmingdao.lat + (dishuihu.lat - chongmingdao.lat) * t;

        const time = Cesium.JulianDate.addSeconds(startTime, (i / numPoints2) * duration, new Cesium.JulianDate());
        const position = Cesium.Cartesian3.fromDegrees(lon, lat, 800);

        positionProperty2.addSample(time, position);
        pathPositions2.push(Cesium.Cartesian3.fromDegrees(lon, lat, 800));
    }

    // 创建航线2
    const pathEntity2 = viewer.entities.add({
        name: '��ˮ���������� - ����',
        polyline: {
            positions: pathPositions2,
            width: 3,
            material: new Cesium.PolylineGlowMaterialProperty({
                glowPower: 0.2,
                color: Cesium.Color.fromCssColorString('#4ECDC4').withAlpha(0.8)
            }),
            clampToGround: false
        }
    });
    pathEntities.push(pathEntity2);

    // 创建飞机2
    const airplaneEntity2 = viewer.entities.add({
        name: '��ˮ���������� - �ɻ�',
        position: positionProperty2,
        availability: new Cesium.TimeIntervalCollection([new Cesium.TimeInterval({
            start: startTime,
            stop: stopTime
        })]),
        model: {
            uri: '../../assets/models/shidi/shidi_Animi.gltf',
            scale: 5,
            minimumPixelSize: 80,
            maximumScale: 100
        },
        orientation: new Cesium.VelocityOrientationProperty(positionProperty2),
    });
    airplaneEntities.push(airplaneEntity2);
    createTailBreathingEffectForAirplane(airplaneEntity2, 1);
}

function createTailBreathingEffectForAirplane(airplane, airplaneIndex) {
    for (let layer = 0; layer < TAIL_RIPPLE_CONFIG.layerCount; layer++) {
        const layerProgressOffset = layer / TAIL_RIPPLE_CONFIG.layerCount;
        const tailEffect = viewer.entities.add({
            name: `飞机尾部水波纹特�?${airplaneIndex + 1}-${layer + 1}`,
            position: new Cesium.CallbackProperty((time) => getTailRipplePosition(airplane, time), false),
            ellipsoid: {
                radii: new Cesium.CallbackProperty((time) => {
                    const ripplePosition = getTailRipplePosition(airplane, time);
                    const rippleState = getTailRippleVisualState(airplane, time, layerProgressOffset, ripplePosition);
                    return new Cesium.Cartesian3(rippleState.radius, rippleState.radius, rippleState.radius);
                }, false),
                material: new Cesium.ColorMaterialProperty(new Cesium.CallbackProperty((time) => {
                    const ripplePosition = getTailRipplePosition(airplane, time);
                    const rippleState = getTailRippleVisualState(airplane, time, layerProgressOffset, ripplePosition);
                    return rippleState.color.withAlpha(rippleState.alpha);
                }, false)),
                outline: false
            }
        });

        tailEffectEntities.push(tailEffect);
        tailEffectToAirplaneIndexMap.set(tailEffect, airplaneIndex);
    }

    const warningIconEntity = viewer.entities.add({
        name: `飞机预警图标-${airplaneIndex + 1}`,
        position: new Cesium.CallbackProperty((time) => getTailRipplePosition(airplane, time), false),
        billboard: {
            image: WARNING_ICON_DATA_URL,
            verticalOrigin: Cesium.VerticalOrigin.CENTER,
            disableDepthTestDistance: Number.POSITIVE_INFINITY,
            scaleByDistance: new Cesium.NearFarScalar(500, 1.25, 9000, 0.65),
            show: new Cesium.CallbackProperty((time) => isAirplaneAbnormal(airplane, time), false),
            width: new Cesium.CallbackProperty((time) => {
                const ripplePosition = getTailRipplePosition(airplane, time);
                const rippleState = getTailRippleVisualState(airplane, time, 0, ripplePosition);
                return getWarningIconSizePx(airplane, time, ripplePosition, rippleState);
            }, false),
            height: new Cesium.CallbackProperty((time) => {
                const ripplePosition = getTailRipplePosition(airplane, time);
                const rippleState = getTailRippleVisualState(airplane, time, 0, ripplePosition);
                return getWarningIconSizePx(airplane, time, ripplePosition, rippleState);
            }, false)
        }
    });

    tailEffectEntities.push(warningIconEntity);
    tailEffectToAirplaneIndexMap.set(warningIconEntity, airplaneIndex);
}

function createWarningIconDataUrl() {
    const size = 96;
    const canvas = document.createElement('canvas');
    canvas.width = size;
    canvas.height = size;
    const context = canvas.getContext('2d');
    if (!context) return '';

    context.clearRect(0, 0, size, size);
    context.beginPath();
    context.moveTo(size * 0.5, size * 0.12);
    context.lineTo(size * 0.12, size * 0.82);
    context.lineTo(size * 0.88, size * 0.82);
    context.closePath();
    context.fillStyle = '#ff3b30';
    context.fill();

    context.strokeStyle = '#ffd60a';
    context.lineWidth = size * 0.05;
    context.stroke();

    context.fillStyle = '#ffffff';
    context.fillRect(size * 0.475, size * 0.34, size * 0.05, size * 0.26);
    context.beginPath();
    context.arc(size * 0.5, size * 0.68, size * 0.03, 0, Math.PI * 2);
    context.fill();

    return canvas.toDataURL('image/png');
}

function getAirplaneVisualMetrics(airplane, time, referencePosition) {
    const cameraDistance = Cesium.Cartesian3.distance(viewer.camera.positionWC, referencePosition);
    const fovy = viewer.camera.frustum?.fovy || Cesium.Math.toRadians(60);
    const canvasHeight = Math.max(viewer.canvas.clientHeight || viewer.canvas.height || 1, 1);
    const metersPerPixel = (2 * cameraDistance * Math.tan(fovy * 0.5)) / canvasHeight;

    const modelScale = airplane?.model?.scale?.getValue?.(time) ?? airplane?.model?.scale ?? 5;
    const minimumPixelSize = airplane?.model?.minimumPixelSize?.getValue?.(time) ?? airplane?.model?.minimumPixelSize ?? 80;

    const numericScale = Number(modelScale) || 5;
    const numericMinimumPixelSize = Number(minimumPixelSize) || 80;
    const modelRadiusByScale = 10 * numericScale;
    const modelRadiusByPixel = numericMinimumPixelSize * metersPerPixel * 0.42;
    const visualRadius = Math.max(modelRadiusByScale, modelRadiusByPixel);

    return {
        visualRadius,
        metersPerPixel
    };
}

function getWarningIconSizePx(airplane, time, ripplePosition, rippleState) {
    if (!ripplePosition || !rippleState || rippleState.radius <= 0) {
        return TAIL_RIPPLE_CONFIG.warningIconMinSizePx;
    }

    const metrics = getAirplaneVisualMetrics(airplane, time, ripplePosition);
    const sourceRadiusMeters = rippleState.innerRadius > 0 ? rippleState.innerRadius : rippleState.radius;
    const rippleRadiusPx = sourceRadiusMeters / Math.max(metrics.metersPerPixel, 0.0001);
    const targetSize = rippleRadiusPx * TAIL_RIPPLE_CONFIG.warningIconScaleByRipplePixelRadius;
    return Cesium.Math.clamp(targetSize, TAIL_RIPPLE_CONFIG.warningIconMinSizePx, TAIL_RIPPLE_CONFIG.warningIconMaxSizePx);
}

function getTailRipplePosition(airplane, time) {
    const airplanePosition = airplane.position.getValue(time);
    if (!airplanePosition) return null;

    if (!TAIL_RIPPLE_CONFIG.centerOffsetRatio) return airplanePosition;

    const up = Cesium.Ellipsoid.WGS84.geodeticSurfaceNormal(airplanePosition, new Cesium.Cartesian3());
    const metrics = getAirplaneVisualMetrics(airplane, time, airplanePosition);
    const centerOffset = Cesium.Cartesian3.multiplyByScalar(
        up,
        metrics.visualRadius * TAIL_RIPPLE_CONFIG.centerOffsetRatio,
        new Cesium.Cartesian3()
    );
    return Cesium.Cartesian3.add(airplanePosition, centerOffset, new Cesium.Cartesian3());
}

function getTailRippleVisualState(airplane, time, layerProgressOffset, ripplePosition) {
    if (!isAirplaneAbnormal(airplane, time)) {
        return {
            radius: 0,
            innerRadius: 0,
            alpha: 0,
            color: TAIL_RIPPLE_CONFIG.warningColorStart
        };
    }

    const elapsedSeconds = Cesium.JulianDate.secondsDifference(time, viewer.clock.startTime);
    const normalizedTime = (elapsedSeconds / TAIL_RIPPLE_CONFIG.cycleSeconds + layerProgressOffset) % 1;
    const cycleProgress = normalizedTime < 0 ? normalizedTime + 1 : normalizedTime;
    const breathingScale = 1 + TAIL_RIPPLE_CONFIG.breathingAmplitude * Math.sin(elapsedSeconds * TAIL_RIPPLE_CONFIG.breathingFrequency);

    const basePosition = ripplePosition || airplane.position.getValue(time);
    if (!basePosition) {
        return {
            radius: 1,
            innerRadius: 1,
            alpha: TAIL_RIPPLE_CONFIG.minAlpha,
            color: TAIL_RIPPLE_CONFIG.warningColorStart
        };
    }

    const metrics = getAirplaneVisualMetrics(airplane, time, basePosition);
    const baseRadius = metrics.visualRadius * TAIL_RIPPLE_CONFIG.baseRadiusRatio;
    const innerRadius = baseRadius * breathingScale;
    const radius = innerRadius * (1 + TAIL_RIPPLE_CONFIG.growRadiusRatio * cycleProgress);
    const alpha = TAIL_RIPPLE_CONFIG.minAlpha + (1 - cycleProgress) * (TAIL_RIPPLE_CONFIG.maxAlpha - TAIL_RIPPLE_CONFIG.minAlpha);
    const color = Cesium.Color.lerp(
        TAIL_RIPPLE_CONFIG.warningColorStart,
        TAIL_RIPPLE_CONFIG.warningColorEnd,
        cycleProgress,
        new Cesium.Color()
    );

    return {
        radius,
        innerRadius,
        alpha,
        color
    };
}

function isAirplaneAbnormal(airplane, time) {
    const nowSeconds = Cesium.JulianDate.secondsDifference(time, viewer.clock.startTime);
    let alertState = airplaneAlertStateMap.get(airplane);

    if (!alertState) {
        const duration = Cesium.Math.lerp(
            AIRPLANE_ALERT_CONFIG.minDurationSeconds,
            AIRPLANE_ALERT_CONFIG.maxDurationSeconds,
            Math.random()
        );
        alertState = {
            isAbnormal: false,
            nextSwitchAt: nowSeconds + duration
        };
        airplaneAlertStateMap.set(airplane, alertState);
    }

    if (nowSeconds >= alertState.nextSwitchAt) {
        alertState.isAbnormal = Math.random() < AIRPLANE_ALERT_CONFIG.abnormalProbability;
        const duration = Cesium.Math.lerp(
            AIRPLANE_ALERT_CONFIG.minDurationSeconds,
            AIRPLANE_ALERT_CONFIG.maxDurationSeconds,
            Math.random()
        );
        alertState.nextSwitchAt = nowSeconds + duration;
    }

    return alertState.isAbnormal;
}

// 每帧更新
function updateFrame() {
    if (!airplaneEntities.length) return;

    // 更新当前选中的飞�?
    const currentAirplane = airplaneEntities[selectedAirplaneIndex];
    if (!currentAirplane) return;

    const currentTime = viewer.clock.currentTime;
    const position = currentAirplane.position.getValue(currentTime);

    if (!position) return;

    // 更新信息面板位置
    if (infoPanelVisible) {
        updateInfoPanelPosition(position);
    }

    // 更新飞行数据
    updateFlightData(position, currentTime, currentAirplane.name);

    // 相机跟随
    if (isCameraLocked) {
        updateCameraFollow(position, currentTime);
    }
}

// 更新信息面板位置
function updateInfoPanelPosition(position) {
    const flightInfo = document.getElementById('flightInfo');
    const canvas = viewer.scene.canvas;
    const screenPosition = Cesium.SceneTransforms.wgs84ToWindowCoordinates(viewer.scene, position);

    if (screenPosition &&
        screenPosition.x > 0 && screenPosition.x < canvas.width &&
        screenPosition.y > 0 && screenPosition.y < canvas.height) {

        const cameraToPlaneDistance = Cesium.Cartesian3.distance(viewer.camera.positionWC, position);
        const zoomFactor = (cameraToPlaneDistance - INFO_PANEL_DISTANCE_MIN) / (INFO_PANEL_DISTANCE_MAX - INFO_PANEL_DISTANCE_MIN);
        const clampedZoomFactor = Cesium.Math.clamp(zoomFactor, 0, 1);
        const easedZoomFactor = 1 - Math.pow(1 - clampedZoomFactor, 5);
        const panelOffsetY = Cesium.Math.lerp(INFO_PANEL_OFFSET_Y_MAX, INFO_PANEL_OFFSET_Y_MIN, easedZoomFactor);
        const panelTop = Math.max(12, screenPosition.y - panelOffsetY);

        flightInfo.style.left = screenPosition.x + 'px';
        flightInfo.style.top = panelTop + 'px';
        flightInfo.classList.add('show');
    } else {
        flightInfo.classList.remove('show');
    }
}

// 更新飞行数据
function calculateSpeedKmh(currentAirplane, currentTime, currentPosition) {
    const sampleOffsetSeconds = 0.5;
    const previousTime = Cesium.JulianDate.addSeconds(currentTime, -sampleOffsetSeconds, new Cesium.JulianDate());
    const nextTime = Cesium.JulianDate.addSeconds(currentTime, sampleOffsetSeconds, new Cesium.JulianDate());

    const previousPosition = currentAirplane.position.getValue(previousTime);
    const nextPosition = currentAirplane.position.getValue(nextTime);

    if (previousPosition && nextPosition) {
        const distanceMeters = Cesium.Cartesian3.distance(previousPosition, nextPosition);
        return (distanceMeters / (sampleOffsetSeconds * 2)) * 3.6;
    }

    if (nextPosition) {
        const distanceMeters = Cesium.Cartesian3.distance(currentPosition, nextPosition);
        return (distanceMeters / sampleOffsetSeconds) * 3.6;
    }

    if (previousPosition) {
        const distanceMeters = Cesium.Cartesian3.distance(previousPosition, currentPosition);
        return (distanceMeters / sampleOffsetSeconds) * 3.6;
    }

    return TARGET_SPEED_KMH;
}

function normalizeDisplaySpeedKmh(currentAirplane, rawSpeedKmh) {
    if (!Number.isFinite(rawSpeedKmh) || rawSpeedKmh <= 0) {
        return TARGET_SPEED_KMH;
    }

    let baselineSpeed = speedBaselineMap.get(currentAirplane);
    if (!baselineSpeed) {
        baselineSpeed = rawSpeedKmh;
        speedBaselineMap.set(currentAirplane, baselineSpeed);
    }

    const normalizedSpeed = (rawSpeedKmh / baselineSpeed) * TARGET_SPEED_KMH;
    const minSpeed = TARGET_SPEED_KMH - SPEED_DISPLAY_RANGE_KMH;
    const maxSpeed = TARGET_SPEED_KMH + SPEED_DISPLAY_RANGE_KMH;
    return Math.round(Cesium.Math.clamp(normalizedSpeed, minSpeed, maxSpeed));
}

function updateFlightData(position, currentTime, airplaneName) {
    const cartographic = Cesium.Cartographic.fromCartesian(position);
    const height = cartographic.height;

    // 计算航向
    const currentAirplane = airplaneEntities[selectedAirplaneIndex];
    if (!currentAirplane) return;

    const rawSpeedKmh = calculateSpeedKmh(currentAirplane, currentTime, position);
    const speedKmh = normalizeDisplaySpeedKmh(currentAirplane, rawSpeedKmh);

    const nextTime = Cesium.JulianDate.addSeconds(currentTime, 0.1, new Cesium.JulianDate());
    const nextPosition = currentAirplane.position.getValue(nextTime);
    let heading = 0;

    if (nextPosition) {
        const currentCarto = Cesium.Cartographic.fromCartesian(position);
        const nextCarto = Cesium.Cartographic.fromCartesian(nextPosition);
        heading = Cesium.Math.toDegrees(
            Math.atan2(
                nextCarto.longitude - currentCarto.longitude,
                nextCarto.latitude - currentCarto.latitude
            )
        );
        if (heading < 0) heading += 360;
    }

    // 更新UI
    document.getElementById('airplaneName').innerText = airplaneName || 'δ֪';
    document.getElementById('speed').innerText = speedKmh + ' km/h';
    document.getElementById('altitude').innerText = Math.round(height) + ' m';
    document.getElementById('heading').innerText = Math.round(heading) + '��';

    const isAbnormal = isAirplaneAbnormal(currentAirplane, currentTime);
    document.getElementById('systemStatus').innerText = isAbnormal ? '�쳣�澯' : '����';
}

// 更新相机跟随 - 在飞机尾部后方上方，支持滚轮缩放
function updateCameraFollow(position, currentTime) {
    const cartographic = Cesium.Cartographic.fromCartesian(position);

    // 计算飞机的方向（航向�?
    const nextTime = Cesium.JulianDate.addSeconds(currentTime, 0.1, new Cesium.JulianDate());
    const currentAirplane = airplaneEntities[selectedAirplaneIndex];
    const nextPosition = currentAirplane.position.getValue(nextTime);

    let heading = 0;
    if (nextPosition) {
        const currentCarto = Cesium.Cartographic.fromCartesian(position);
        const nextCarto = Cesium.Cartographic.fromCartesian(nextPosition);
        heading = Math.atan2(
            nextCarto.longitude - currentCarto.longitude,
            nextCarto.latitude - currentCarto.latitude
        );
    }

    // 计算相机位置：飞机斜后方上方
    const sideAngle = Cesium.Math.toRadians(-10); // 侧偏�?

    // 计算斜后方位置（基于当前缩放距离�?
    const backHeading = heading - sideAngle;
    const backLon = Cesium.Math.toDegrees(cartographic.longitude) - Math.sin(backHeading) * (cameraDistance / 111000);
    const backLat = Cesium.Math.toDegrees(cartographic.latitude) - Math.cos(backHeading) * (cameraDistance / 111000);
    const cameraHeight = cartographic.height + cameraHeightOffset;

    const cameraPosition = Cesium.Cartesian3.fromDegrees(backLon, backLat, cameraHeight);

    const targetUp = Cesium.Ellipsoid.WGS84.geodeticSurfaceNormal(position, new Cesium.Cartesian3());
    const targetOffset = Cesium.Cartesian3.multiplyByScalar(targetUp, 16, new Cesium.Cartesian3());
    const lookTarget = Cesium.Cartesian3.add(position, targetOffset, new Cesium.Cartesian3());
    const direction = Cesium.Cartesian3.normalize(
        Cesium.Cartesian3.subtract(lookTarget, cameraPosition, new Cesium.Cartesian3()),
        new Cesium.Cartesian3()
    );
    const up = Cesium.Ellipsoid.WGS84.geodeticSurfaceNormal(cameraPosition, new Cesium.Cartesian3());

    viewer.camera.setView({
        destination: cameraPosition,
        orientation: {
            direction,
            up
        }
    });
}

// 飞到总览视角
function flyToOverview() {
    viewer.camera.flyTo({
        destination: Cesium.Cartesian3.fromDegrees(121.4998, 31.2097, 3000),
        orientation: {
            heading: Cesium.Math.toRadians(0),
            pitch: Cesium.Math.toRadians(-40),
            roll: 0
        },
        duration: 3
    });
}

// 设置事件监听
function resolvePickedAirplaneIndex(clickPosition) {
    if (weatherComponent) {
        return weatherComponent.resolvePickedAirplaneIndex(
            clickPosition,
            airplaneEntities,
            tailEffectToAirplaneIndexMap
        );
    }

    const pickedObject = viewer.scene.pick(clickPosition);
    if (!Cesium.defined(pickedObject)) return -1;

    const clickedIndex = airplaneEntities.findIndex(entity => entity === pickedObject.id);
    if (clickedIndex !== -1) return clickedIndex;

    const effectIndex = tailEffectToAirplaneIndexMap.get(pickedObject.id);
    return effectIndex !== undefined ? effectIndex : -1;
}

function refreshWeatherEffects() {
    if (!weatherComponent) return;
    weatherComponent.clearAllEffects();

    if (ringPathPositions.length > 1) {
        weatherComponent.createOnRing(ringPathPositions);
    }
    weatherComponent.createFromAnchors(WEATHER_SAMPLE_ANCHORS);
}

function setupWeatherPresetControl() {
    const select = document.getElementById('weatherPresetSelect');
    if (!select || !weatherComponent) return;

    const presets = weatherComponent.getPresetNames();
    select.innerHTML = '';

    for (const presetName of presets) {
        const option = document.createElement('option');
        option.value = presetName;
        option.textContent = WEATHER_PRESET_LABELS[presetName] || presetName;
        if (presetName === weatherComponent.getActivePreset()) {
            option.selected = true;
        }
        select.appendChild(option);
    }

    select.addEventListener('change', () => {
        const nextPreset = select.value;
        const changed = weatherComponent.setPreset(nextPreset, STORM_EFFECT_CONFIG);
        if (changed) {
            refreshWeatherEffects();
        }
    });
}

function setupEventListeners() {
    const handler = new Cesium.ScreenSpaceEventHandler(viewer.scene.canvas);
    const flightInfo = document.getElementById('flightInfo');
    const cameraHint = document.getElementById('cameraHint');
    const modeButton = document.getElementById('btnSceneMode');

    if (modeButton) {
        modeButton.addEventListener('click', toggleSceneMode);
        updateSceneModeButton();
    }

    setupWeatherPresetControl();

    // 单击 - 显示/隐藏信息面板或解�?
    handler.setInputAction(function (click) {
        const resolvedIndex = resolvePickedAirplaneIndex(click.position);
        if (resolvedIndex !== -1) {
            selectedAirplaneIndex = resolvedIndex;
            airplaneEntity = airplaneEntities[resolvedIndex];
            pathEntity = pathEntities[resolvedIndex];
            infoPanelVisible = !infoPanelVisible;
            if (!infoPanelVisible) {
                flightInfo.classList.remove('show');
            }
            return;
        }

        if (isCameraLocked) {
            infoPanelVisible = false;
            flightInfo.classList.remove('show');
            // 锁定状态下点击其他地方 - 解锁
            unlockCamera();
        } else {
            // 其他情况关闭面板
            infoPanelVisible = false;
            flightInfo.classList.remove('show');
        }
    }, Cesium.ScreenSpaceEventType.LEFT_CLICK);

    // 双击 - 锁定/解锁视角
    handler.setInputAction(function (click) {
        const resolvedIndex = resolvePickedAirplaneIndex(click.position);
        if (resolvedIndex !== -1) {
            selectedAirplaneIndex = resolvedIndex;
            airplaneEntity = airplaneEntities[resolvedIndex];
            pathEntity = pathEntities[resolvedIndex];
            toggleCameraLock();
        }
    }, Cesium.ScreenSpaceEventType.LEFT_DOUBLE_CLICK);
}

// 切换相机锁定
function toggleCameraLock() {
    isCameraLocked = !isCameraLocked;
    const cameraHint = document.getElementById('cameraHint');

    if (isCameraLocked) {
        viewer.scene.screenSpaceCameraController.enableInputs = false;
        cameraHint.classList.add('show');
        // 添加滚轮缩放监听
        viewer.canvas.addEventListener('wheel', handleCameraZoom, { passive: false });
    } else {
        unlockCamera();
    }
}

// 解锁相机
function unlockCamera() {
    isCameraLocked = false;

    viewer.scene.screenSpaceCameraController.enableInputs = true;
    document.getElementById('cameraHint').classList.remove('show');
    // 移除滚轮缩放监听
    viewer.canvas.removeEventListener('wheel', handleCameraZoom);
}

// 处理相机滚轮缩放
function handleCameraZoom(e) {
    if (!isCameraLocked) return;

    e.preventDefault();

    // 滚轮向上（负值）= 放大（减小距离），向下（正值）= 缩小（增加距离）
    const zoomSpeed = 30; // 缩放速度
    const delta = e.deltaY > 0 ? zoomSpeed : -zoomSpeed;

    // 更新距离和高度（保持视角比例�?
    cameraDistance = Math.max(CAMERA_DISTANCE_MIN, Math.min(CAMERA_DISTANCE_MAX, cameraDistance + delta));
    cameraHeightOffset = cameraDistance * 0.4; // 保持高度与距离的比例
}

// 启动
document.addEventListener('DOMContentLoaded', initMap);


