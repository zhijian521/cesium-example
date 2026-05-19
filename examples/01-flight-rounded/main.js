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
let buildingCustomShader;
let isNightMode = true;
let selectedAirplaneIndex = 0; // 当前选中的飞机索引
let cameraDistance = 120; // 相机跟随距离（米）
let cameraHeightOffset = 50; // 相机高度偏移（米）

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
const ROUNDED_ROUTE_CONFIG = {
    halfWidthLon: 0.02,
    halfHeightLat: 0.014,
    cornerRadiusLon: 0.0055,
    cornerRadiusLat: 0.0042,
    pointsPerStraight: 32,
    pointsPerCorner: 72
};
const BANKING_CONFIG = {
    sampleWindowSeconds: 1.2,
    fullTurnDeltaDegrees: 20,
    minTurnDeltaDegrees: 2,
    maxRollDegrees: 5
};
const speedBaselineMap = new WeakMap();
const scratchBaseOrientation = new Cesium.Quaternion();
const scratchBankQuaternion = new Cesium.Quaternion();
const scratchFlightAxis = new Cesium.Cartesian3();
const scratchWorldBankedOrientation = new Cesium.Quaternion();

const routeOneCenter = {
    lon: dongfangmingzhu.lon - 0.0195,
    lat: dongfangmingzhu.lat,
    height: dongfangmingzhu.height
};

function appendStraightSegment(points, start, end, segmentCount) {
    for (let i = 0; i < segmentCount; i++) {
        const t = i / segmentCount;
        points.push({
            lon: Cesium.Math.lerp(start.lon, end.lon, t),
            lat: Cesium.Math.lerp(start.lat, end.lat, t)
        });
    }
}

function appendRoundedCorner(points, center, radiusLon, radiusLat, startAngle, endAngle, segmentCount) {
    for (let i = 0; i < segmentCount; i++) {
        const t = i / segmentCount;
        const angle = Cesium.Math.lerp(startAngle, endAngle, t);
        points.push({
            lon: center.lon + Math.cos(angle) * radiusLon,
            lat: center.lat + Math.sin(angle) * radiusLat
        });
    }
}

function createRoundedRectangleRoute(center, height) {
    const { halfWidthLon, halfHeightLat, cornerRadiusLon, cornerRadiusLat, pointsPerStraight, pointsPerCorner } = ROUNDED_ROUTE_CONFIG;
    const left = center.lon - halfWidthLon;
    const right = center.lon + halfWidthLon;
    const top = center.lat + halfHeightLat;
    const bottom = center.lat - halfHeightLat;
    const points = [];

    appendStraightSegment(
        points,
        { lon: left + cornerRadiusLon, lat: top },
        { lon: right - cornerRadiusLon, lat: top },
        pointsPerStraight
    );
    appendRoundedCorner(
        points,
        { lon: right - cornerRadiusLon, lat: top - cornerRadiusLat },
        cornerRadiusLon,
        cornerRadiusLat,
        Math.PI / 2,
        0,
        pointsPerCorner
    );
    appendStraightSegment(
        points,
        { lon: right, lat: top - cornerRadiusLat },
        { lon: right, lat: bottom + cornerRadiusLat },
        pointsPerStraight
    );
    appendRoundedCorner(
        points,
        { lon: right - cornerRadiusLon, lat: bottom + cornerRadiusLat },
        cornerRadiusLon,
        cornerRadiusLat,
        0,
        -Math.PI / 2,
        pointsPerCorner
    );
    appendStraightSegment(
        points,
        { lon: right - cornerRadiusLon, lat: bottom },
        { lon: left + cornerRadiusLon, lat: bottom },
        pointsPerStraight
    );
    appendRoundedCorner(
        points,
        { lon: left + cornerRadiusLon, lat: bottom + cornerRadiusLat },
        cornerRadiusLon,
        cornerRadiusLat,
        -Math.PI / 2,
        -Math.PI,
        pointsPerCorner
    );
    appendStraightSegment(
        points,
        { lon: left, lat: bottom + cornerRadiusLat },
        { lon: left, lat: top - cornerRadiusLat },
        pointsPerStraight
    );
    appendRoundedCorner(
        points,
        { lon: left + cornerRadiusLon, lat: top - cornerRadiusLat },
        cornerRadiusLon,
        cornerRadiusLat,
        Math.PI,
        Math.PI / 2,
        pointsPerCorner
    );

    const firstPoint = points[0];
    points.push({ ...firstPoint });

    return points.map(point => ({
        lon: point.lon,
        lat: point.lat,
        height
    }));
}

function createSampledPositionProperty(routePoints, startTime, durationSeconds) {
    const positionProperty = new Cesium.SampledPositionProperty();
    const cartesianPoints = routePoints.map(point =>
        Cesium.Cartesian3.fromDegrees(point.lon, point.lat, point.height)
    );
    const cumulativeDistances = [0];

    for (let i = 1; i < cartesianPoints.length; i++) {
        const segmentDistance = Cesium.Cartesian3.distance(cartesianPoints[i - 1], cartesianPoints[i]);
        cumulativeDistances.push(cumulativeDistances[i - 1] + segmentDistance);
    }

    const totalDistance = cumulativeDistances[cumulativeDistances.length - 1] || 1;

    positionProperty.setInterpolationOptions({
        interpolationDegree: 2,
        interpolationAlgorithm: Cesium.HermitePolynomialApproximation
    });

    cartesianPoints.forEach((cartesianPoint, index) => {
        const time = Cesium.JulianDate.addSeconds(
            startTime,
            (cumulativeDistances[index] / totalDistance) * durationSeconds,
            new Cesium.JulianDate()
        );
        positionProperty.addSample(time, cartesianPoint);
    });

    return positionProperty;
}

function getHeadingBetweenPositions(fromPosition, toPosition) {
    if (!fromPosition || !toPosition) return 0;

    const fromCarto = Cesium.Cartographic.fromCartesian(fromPosition);
    const toCarto = Cesium.Cartographic.fromCartesian(toPosition);
    const deltaLon = toCarto.longitude - fromCarto.longitude;
    const deltaLat = toCarto.latitude - fromCarto.latitude;

    if (Math.abs(deltaLon) < Cesium.Math.EPSILON10 && Math.abs(deltaLat) < Cesium.Math.EPSILON10) {
        return 0;
    }

    return Math.atan2(deltaLon, deltaLat);
}

function getBankedAttitude(positionProperty, time) {
    const currentPosition = positionProperty.getValue(time);
    if (!currentPosition) return null;

    const previousTime = Cesium.JulianDate.addSeconds(time, -BANKING_CONFIG.sampleWindowSeconds, new Cesium.JulianDate());
    const nextTime = Cesium.JulianDate.addSeconds(time, BANKING_CONFIG.sampleWindowSeconds, new Cesium.JulianDate());
    const previousPosition = positionProperty.getValue(previousTime);
    const nextPosition = positionProperty.getValue(nextTime);
    const headingBefore = previousPosition ? getHeadingBetweenPositions(previousPosition, currentPosition) : null;
    const headingAfter = nextPosition ? getHeadingBetweenPositions(currentPosition, nextPosition) : null;
    const heading = headingAfter ?? headingBefore ?? 0;
    const signedTurnDeltaRadians = headingBefore === null || headingAfter === null
        ? 0
        : Cesium.Math.negativePiToPi(headingAfter - headingBefore);
    const signedTurnDeltaDegrees = Cesium.Math.toDegrees(signedTurnDeltaRadians);
    const absTurnDeltaDegrees = Math.abs(signedTurnDeltaDegrees);
    const turnRatio = absTurnDeltaDegrees <= BANKING_CONFIG.minTurnDeltaDegrees
        ? 0
        : Cesium.Math.clamp(absTurnDeltaDegrees / BANKING_CONFIG.fullTurnDeltaDegrees, 0, 1);
    const easedTurnRatio = turnRatio * turnRatio * (3 - 2 * turnRatio);
    const bankDirection = Math.sign(signedTurnDeltaDegrees);

    return {
        heading,
        roll: bankDirection * easedTurnRatio * Cesium.Math.toRadians(BANKING_CONFIG.maxRollDegrees)
    };
}

function createBankedOrientationProperty(positionProperty) {
    const baseOrientationProperty = new Cesium.VelocityOrientationProperty(positionProperty);

    return new Cesium.CallbackProperty((time) => {
        const baseOrientation = baseOrientationProperty.getValue(time, scratchBaseOrientation);
        const attitude = getBankedAttitude(positionProperty, time);
        if (!baseOrientation || !attitude) return undefined;

        if (Math.abs(attitude.roll) < Cesium.Math.EPSILON6) {
            return Cesium.Quaternion.clone(baseOrientation, new Cesium.Quaternion());
        }

        const previousTime = Cesium.JulianDate.addSeconds(time, -BANKING_CONFIG.sampleWindowSeconds, new Cesium.JulianDate());
        const nextTime = Cesium.JulianDate.addSeconds(time, BANKING_CONFIG.sampleWindowSeconds, new Cesium.JulianDate());
        const previousPosition = positionProperty.getValue(previousTime);
        const nextPosition = positionProperty.getValue(nextTime);
        if (!previousPosition || !nextPosition) {
            return Cesium.Quaternion.clone(baseOrientation, new Cesium.Quaternion());
        }

        const flightAxis = Cesium.Cartesian3.subtract(nextPosition, previousPosition, scratchFlightAxis);
        if (Cesium.Cartesian3.magnitudeSquared(flightAxis) < Cesium.Math.EPSILON10) {
            return Cesium.Quaternion.clone(baseOrientation, new Cesium.Quaternion());
        }

        Cesium.Cartesian3.normalize(flightAxis, flightAxis);
        const bankQuaternion = Cesium.Quaternion.fromAxisAngle(
            flightAxis,
            attitude.roll,
            scratchBankQuaternion
        );

        return Cesium.Quaternion.multiply(bankQuaternion, baseOrientation, scratchWorldBankedOrientation);
    }, false);
}

// 初始化地图
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
            msaaSamples: 2, // 2x MSAA 抗锯齿
            contextOptions: {
                webgl: {
                    alpha: false,
                    antialias: true, // 启用 WebGL 抗锯齿
                    preserveDrawingBuffer: true,
                    powerPreference: 'high-performance'
                }
            }
        });

        // 隐藏版权信息
        viewer.cesiumWidget.creditContainer.style.display = 'none';

        // 初始化场景效果
        initSceneEffects();

        // 加载建筑
        await loadBuildings();

        // 创建飞机和航线
        createAirplaneAndPath();

        // 设置事件监听
        setupEventListeners();

        // 开始更新循环
        viewer.scene.preRender.addEventListener(updateFrame);

        // 初始视角
        flyToOverview();

        // 隐藏加载提示
        setTimeout(() => {
            document.getElementById('loading').style.display = 'none';
        }, 2000);

    } catch (error) {
        console.error('初始化失败:', error);
        document.getElementById('loading').innerText = '加载失败';
    }
}

// 初始化场景效果
function initSceneEffects() {
    const scene = viewer.scene;

    scene.globe.enableLighting = true;
    scene.globe.depthTestAgainstTerrain = true;
    scene.highDynamicRange = true;

    // 主光源 - 模拟阳光斜射，产生明显光影
    scene.light = new Cesium.DirectionalLight({
        direction: new Cesium.Cartesian3(0.6, -0.4, -0.7),
        intensity: 2.5
    });

    // 背景色 - 调亮
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

    // 环境光 - 增加整体亮度
    scene.globe.dynamicAtmosphereLighting = true;
    scene.globe.dynamicAtmosphereLightingFromSun = true;

    // 曝光和色调映射 - 提亮画面
    scene.hdr = true;
    scene.globe.maximumScreenSpaceError = 2;

    // === 清晰度与性能平衡 ===
    // 启用抗锯齿
    scene.postProcessStages.fxaa.enabled = true;

    // 分辨率比例 - 超高清设置
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
        button.textContent = isNightMode ? 'Switch to Day' : 'Switch to Night';
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

// 创建飞机和航线
function createAirplaneAndPath() {
    const startTime = Cesium.JulianDate.now();
    const duration = 60;
    const stopTime = Cesium.JulianDate.addSeconds(startTime, duration, new Cesium.JulianDate());

    // 设置时钟
    viewer.clock.startTime = startTime.clone();
    viewer.clock.stopTime = stopTime.clone();
    viewer.clock.currentTime = startTime.clone();
    viewer.clock.clockRange = Cesium.ClockRange.LOOP_STOP;
    viewer.clock.multiplier = 0.3; // 0.3倍速
    viewer.clock.shouldAnimate = true;

    // === 航线1: 东方明珠圆角四边形环线 ===
    const roundedRoutePoints = createRoundedRectangleRoute(routeOneCenter, routeOneCenter.height);
    const positionProperty1 = createSampledPositionProperty(roundedRoutePoints, startTime, duration);
    const pathPositions1 = roundedRoutePoints.map(point =>
        Cesium.Cartesian3.fromDegrees(point.lon, point.lat, point.height)
    );

    // 创建航线1
    pathEntity = viewer.entities.add({
        name: '东方明珠圆角四边形环线 - 航线',
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
        name: '东方明珠圆角四边形环线 - 飞机',
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
        orientation: createBankedOrientationProperty(positionProperty1),
    });
    airplaneEntities.push(airplaneEntity);

    // === 航线2: 滴水湖到崇明岛（往返） ===
    const numPoints2 = 1000; // 增加采样点，大幅降低速度（降低80%）
    const positionProperty2 = new Cesium.SampledPositionProperty();
    positionProperty2.setInterpolationOptions({
        interpolationDegree: 5,
        interpolationAlgorithm: Cesium.LagrangePolynomialApproximation
    });

    const pathPositions2 = [];
    const halfPoints = Math.floor(numPoints2 / 2);

    // 去程：滴水湖 -> 崇明岛
    for (let i = 0; i <= halfPoints; i++) {
        const t = i / halfPoints;
        const lon = dishuihu.lon + (chongmingdao.lon - dishuihu.lon) * t;
        const lat = dishuihu.lat + (chongmingdao.lat - dishuihu.lat) * t;

        const time = Cesium.JulianDate.addSeconds(startTime, (i / numPoints2) * duration, new Cesium.JulianDate());
        const position = Cesium.Cartesian3.fromDegrees(lon, lat, 800);

        positionProperty2.addSample(time, position);
        pathPositions2.push(Cesium.Cartesian3.fromDegrees(lon, lat, 800));
    }

    // 返程：崇明岛 -> 滴水湖
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
        name: '滴水湖到崇明岛 - 航线',
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
        name: '滴水湖到崇明岛 - 飞机',
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
}

// 每帧更新
function updateFrame() {
    if (!airplaneEntities.length) return;

    // 更新当前选中的飞机
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

    const currentAirplane = airplaneEntities[selectedAirplaneIndex];
    if (!currentAirplane) return;

    const rawSpeedKmh = calculateSpeedKmh(currentAirplane, currentTime, position);
    const speedKmh = normalizeDisplaySpeedKmh(currentAirplane, rawSpeedKmh);
    const attitude = getBankedAttitude(currentAirplane.position, currentTime);
    const heading = attitude ? Cesium.Math.zeroToTwoPi(attitude.heading) : 0;

    // 更新UI
    document.getElementById('airplaneName').innerText = airplaneName || '未知';
    document.getElementById('speed').innerText = speedKmh + ' km/h';
    document.getElementById('altitude').innerText = Math.round(height) + ' m';
    document.getElementById('heading').innerText = Math.round(Cesium.Math.toDegrees(heading)) + '°';
    document.getElementById('systemStatus').innerText = '正常';
}

// 更新相机跟随 - 在飞机尾部后方上方，支持滚轮缩放
function updateCameraFollow(position, currentTime) {
    const currentAirplane = airplaneEntities[selectedAirplaneIndex];
    const attitude = currentAirplane ? getBankedAttitude(currentAirplane.position, currentTime) : null;
    const heading = attitude?.heading ?? 0;
    const localFrame = Cesium.Transforms.eastNorthUpToFixedFrame(position);
    const localOffset = new Cesium.Cartesian3(
        -Math.sin(heading) * cameraDistance,
        -Math.cos(heading) * cameraDistance,
        cameraHeightOffset
    );
    const worldOffset = Cesium.Matrix4.multiplyByPointAsVector(
        localFrame,
        localOffset,
        new Cesium.Cartesian3()
    );
    const cameraPosition = Cesium.Cartesian3.add(position, worldOffset, new Cesium.Cartesian3());

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
function setupEventListeners() {
    const handler = new Cesium.ScreenSpaceEventHandler(viewer.scene.canvas);
    const flightInfo = document.getElementById('flightInfo');
    const cameraHint = document.getElementById('cameraHint');
    const modeButton = document.getElementById('btnSceneMode');

    if (modeButton) {
        modeButton.addEventListener('click', toggleSceneMode);
        updateSceneModeButton();
    }

    // 单击 - 显示/隐藏信息面板或解锁
    handler.setInputAction(function (click) {
        const pickedObject = viewer.scene.pick(click.position);

        if (Cesium.defined(pickedObject)) {
            const clickedIndex = airplaneEntities.findIndex(entity => entity === pickedObject.id);
            if (clickedIndex !== -1) {
                selectedAirplaneIndex = clickedIndex;
                airplaneEntity = airplaneEntities[clickedIndex];
                pathEntity = pathEntities[clickedIndex];
                infoPanelVisible = !infoPanelVisible;
                if (!infoPanelVisible) {
                    flightInfo.classList.remove('show');
                }
                return;
            }
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
        const pickedObject = viewer.scene.pick(click.position);

        if (Cesium.defined(pickedObject)) {
            const clickedIndex = airplaneEntities.findIndex(entity => entity === pickedObject.id);
            if (clickedIndex !== -1) {
                selectedAirplaneIndex = clickedIndex;
                airplaneEntity = airplaneEntities[clickedIndex];
                pathEntity = pathEntities[clickedIndex];
                toggleCameraLock();
            }
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

    // 更新距离和高度（保持视角比例）
    cameraDistance = Math.max(CAMERA_DISTANCE_MIN, Math.min(CAMERA_DISTANCE_MAX, cameraDistance + delta));
    cameraHeightOffset = cameraDistance * 0.4; // 保持高度与距离的比例
}

// 启动
document.addEventListener('DOMContentLoaded', initMap);
