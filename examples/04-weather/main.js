/*== 04-weather — 编排层（雷雨云天气飞行 + SceneManager） ==*/

Cesium.Ion.defaultAccessToken = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJqdGkiOiI0OTAzZDRkZi00ODkyLTQ5OTUtOGE1MC1jN2JmNjc0ODdiOGUiLCJpZCI6MzMxMzk2LCJpYXQiOjE3NTUwNDgwNTV9.GH-UECFbXsiJip__VTu2oXoBmx8dt61E52q3rBakZyI';

var viewer;
var airplaneEntity;
var pathEntity;
var isCameraLocked = false;
var infoPanelVisible = false;
var airplaneEntities = [];
var pathEntities = [];
var tailEffectEntities = [];
var weatherComponent;
var ringPathPositions = [];
var selectedAirplaneIndex = 0;
var cameraDistance = 500;
var cameraHeightOffset = 200;

var INFO_PANEL_OFFSET_Y_MIN = 20;
var INFO_PANEL_OFFSET_Y_MAX = 200;
var INFO_PANEL_DISTANCE_MIN = 300;
var INFO_PANEL_DISTANCE_MAX = 8000;
var CAMERA_DISTANCE_MIN = 100;
var CAMERA_DISTANCE_MAX = 2000;
var TARGET_SPEED_KMH = 280;
var SPEED_DISPLAY_RANGE_KMH = 20;
var speedBaselineMap = new WeakMap();
var tailEffectToAirplaneIndexMap = new WeakMap();
var airplaneAlertStateMap = new WeakMap();

var WARNING_ICON_DATA_URL = createWarningIconDataUrl();

var STORM_EFFECT_CONFIG = {
    minHeightOffset: 220,
    maxHeightOffset: 560,
    lonLatJitter: 0.0046,
    billboardSpreadMeters: 620,
    coreRadius: 780,
    cloudBillboardSizeMeters: 260
};

var WEATHER_PRESET = 'rainstorm';
var WEATHER_PRESET_LABELS = {
    drizzle: '细雨',
    rainstorm: '暴雨',
    darkStorm: '雷暴'
};

var WEATHER_SAMPLE_ANCHORS = [
    { lon: 121.4998, lat: 31.2397, radiusMeters: 920, label: '东方明珠周边' },
    { lon: 121.488, lat: 31.228, radiusMeters: 820, label: '陆家嘴南部' }
];

// === 启动 ===
document.addEventListener('DOMContentLoaded', async function () {
    try {
        viewer = await SceneManager.init('cesiumContainer');

        weatherComponent = createWeatherEffectComponent(viewer, {
            baseHeight: dongfangmingzhu.height,
            preset: WEATHER_PRESET,
            config: STORM_EFFECT_CONFIG
        });

        createAirplaneAndPath();
        setupEventListeners();

        viewer.scene.preRender.addEventListener(onFrameUpdate);

        SceneManager.flyTo(
            Cesium.Cartesian3.fromDegrees(121.4998, 31.2097, 3000),
            { heading: Cesium.Math.toRadians(0), pitch: Cesium.Math.toRadians(-40), roll: 0 },
            3
        );

        setTimeout(function () {
            var el = document.getElementById('loading');
            if (el) el.style.display = 'none';
        }, 2000);
    } catch (error) {
        console.error('初始化失败:', error);
        var el = document.getElementById('loading');
        if (el) el.innerText = '加载失败';
    }
});

// === 创建飞机和航线 ===
function createAirplaneAndPath() {
    weatherComponent && weatherComponent.clearAllEffects();

    var startTime = Cesium.JulianDate.now();
    var duration = 60;
    var stopTime = Cesium.JulianDate.addSeconds(startTime, duration, new Cesium.JulianDate());

    viewer.clock.startTime = startTime.clone();
    viewer.clock.stopTime = stopTime.clone();
    viewer.clock.currentTime = startTime.clone();
    viewer.clock.clockRange = Cesium.ClockRange.LOOP_STOP;
    viewer.clock.multiplier = 0.3;
    viewer.clock.shouldAnimate = true;

    // 航线1: 东方明珠椭圆环线
    var numPoints = 100;
    var positionProperty1 = new Cesium.SampledPositionProperty();
    positionProperty1.setInterpolationOptions({
        interpolationDegree: 5,
        interpolationAlgorithm: Cesium.LagrangePolynomialApproximation
    });
    var pathPositions1 = [];

    for (var i = 0; i <= numPoints; i++) {
        var angle = (i / numPoints) * Math.PI * 2;
        var lon = dongfangmingzhu.lon + 0.015 * Math.cos(angle);
        var lat = dongfangmingzhu.lat + 0.015 * Math.sin(angle) * 0.85;
        var time = Cesium.JulianDate.addSeconds(startTime, (i / numPoints) * duration, new Cesium.JulianDate());
        var position = Cesium.Cartesian3.fromDegrees(lon, lat, dongfangmingzhu.height);
        positionProperty1.addSample(time, position);
        pathPositions1.push(Cesium.Cartesian3.fromDegrees(lon, lat, dongfangmingzhu.height));
    }

    ringPathPositions = pathPositions1.slice();

    weatherComponent && weatherComponent.createOnRing(pathPositions1);
    weatherComponent && weatherComponent.createFromAnchors(WEATHER_SAMPLE_ANCHORS);

    pathEntity = viewer.entities.add({
        name: '东方明珠环线 - 航线',
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

    airplaneEntity = viewer.entities.add({
        name: '东方明珠环线 - 飞机',
        position: positionProperty1,
        availability: new Cesium.TimeIntervalCollection([new Cesium.TimeInterval({
            start: startTime, stop: stopTime
        })]),
        model: {
            uri: '../../assets/models/aircraft/aircraft_Animi.gltf',
            scale: 5,
            minimumPixelSize: 80,
            maximumScale: 100
        },
        orientation: new Cesium.VelocityOrientationProperty(positionProperty1)
    });
    airplaneEntities.push(airplaneEntity);
    createTailBreathingEffectForAirplane(airplaneEntity, 0);

    // 航线2: 滴水湖到崇明岛往返
    var numPoints2 = 1000;
    var positionProperty2 = new Cesium.SampledPositionProperty();
    positionProperty2.setInterpolationOptions({
        interpolationDegree: 5,
        interpolationAlgorithm: Cesium.LagrangePolynomialApproximation
    });
    var pathPositions2 = [];
    var halfPoints = Math.floor(numPoints2 / 2);

    for (var j = 0; j <= halfPoints; j++) {
        var t = j / halfPoints;
        var lon2 = dishuihu.lon + (chongmingdao.lon - dishuihu.lon) * t;
        var lat2 = dishuihu.lat + (chongmingdao.lat - dishuihu.lat) * t;
        var time2 = Cesium.JulianDate.addSeconds(startTime, (j / numPoints2) * duration, new Cesium.JulianDate());
        var pos = Cesium.Cartesian3.fromDegrees(lon2, lat2, 800);
        positionProperty2.addSample(time2, pos);
        pathPositions2.push(pos);
    }
    for (var k = halfPoints; k <= numPoints2; k++) {
        var t2 = (k - halfPoints) / (numPoints2 - halfPoints);
        var lon3 = chongmingdao.lon + (dishuihu.lon - chongmingdao.lon) * t2;
        var lat3 = chongmingdao.lat + (dishuihu.lat - chongmingdao.lat) * t2;
        var time3 = Cesium.JulianDate.addSeconds(startTime, (k / numPoints2) * duration, new Cesium.JulianDate());
        var pos2 = Cesium.Cartesian3.fromDegrees(lon3, lat3, 800);
        positionProperty2.addSample(time3, pos2);
        pathPositions2.push(pos2);
    }

    var pathEntity2 = viewer.entities.add({
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

    var airplaneEntity2 = viewer.entities.add({
        name: '滴水湖到崇明岛 - 飞机',
        position: positionProperty2,
        availability: new Cesium.TimeIntervalCollection([new Cesium.TimeInterval({
            start: startTime, stop: stopTime
        })]),
        model: {
            uri: '../../assets/models/aircraft/aircraft_Animi.gltf',
            scale: 5,
            minimumPixelSize: 80,
            maximumScale: 100
        },
        orientation: new Cesium.VelocityOrientationProperty(positionProperty2)
    });
    airplaneEntities.push(airplaneEntity2);
    createTailBreathingEffectForAirplane(airplaneEntity2, 1);
}

// === 尾部波纹特效 ===
function createTailBreathingEffectForAirplane(airplane, airplaneIndex) {
    for (var layer = 0; layer < TAIL_RIPPLE_CONFIG.layerCount; layer++) {
        var layerProgressOffset = layer / TAIL_RIPPLE_CONFIG.layerCount;
        var tailEffect = viewer.entities.add({
            name: '飞机尾部水波纹特效' + (airplaneIndex + 1) + '-' + (layer + 1),
            position: new Cesium.CallbackProperty(function (time) { return getTailRipplePosition(airplane, time); }, false),
            ellipsoid: {
                radii: new Cesium.CallbackProperty(function (time) {
                    var ripplePosition = getTailRipplePosition(airplane, time);
                    var rippleState = getTailRippleVisualState(airplane, time, layerProgressOffset, ripplePosition);
                    return new Cesium.Cartesian3(rippleState.radius, rippleState.radius, rippleState.radius);
                }, false),
                material: new Cesium.ColorMaterialProperty(new Cesium.CallbackProperty(function (time) {
                    var ripplePosition = getTailRipplePosition(airplane, time);
                    var rippleState = getTailRippleVisualState(airplane, time, layerProgressOffset, ripplePosition);
                    return rippleState.color.withAlpha(rippleState.alpha);
                }, false)),
                outline: false
            }
        });
        tailEffectEntities.push(tailEffect);
        tailEffectToAirplaneIndexMap.set(tailEffect, airplaneIndex);
    }

    var warningIconEntity = viewer.entities.add({
        name: '飞机预警图标-' + (airplaneIndex + 1),
        position: new Cesium.CallbackProperty(function (time) { return getTailRipplePosition(airplane, time); }, false),
        billboard: {
            image: WARNING_ICON_DATA_URL,
            verticalOrigin: Cesium.VerticalOrigin.CENTER,
            disableDepthTestDistance: Number.POSITIVE_INFINITY,
            scaleByDistance: new Cesium.NearFarScalar(500, 1.25, 9000, 0.65),
            show: new Cesium.CallbackProperty(function (time) { return isAirplaneAbnormal(airplane, time); }, false),
            width: new Cesium.CallbackProperty(function (time) {
                var ripplePosition = getTailRipplePosition(airplane, time);
                var rippleState = getTailRippleVisualState(airplane, time, 0, ripplePosition);
                return getWarningIconSizePx(airplane, time, ripplePosition, rippleState);
            }, false),
            height: new Cesium.CallbackProperty(function (time) {
                var ripplePosition = getTailRipplePosition(airplane, time);
                var rippleState = getTailRippleVisualState(airplane, time, 0, ripplePosition);
                return getWarningIconSizePx(airplane, time, ripplePosition, rippleState);
            }, false)
        }
    });
    tailEffectEntities.push(warningIconEntity);
    tailEffectToAirplaneIndexMap.set(warningIconEntity, airplaneIndex);
}

function createWarningIconDataUrl() {
    var size = 96;
    var canvas = document.createElement('canvas');
    canvas.width = size;
    canvas.height = size;
    var context = canvas.getContext('2d');
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
    var cameraDist = Cesium.Cartesian3.distance(viewer.camera.positionWC, referencePosition);
    var fovy = (viewer.camera.frustum && viewer.camera.frustum.fovy) || Cesium.Math.toRadians(60);
    var canvasHeight = Math.max(viewer.canvas.clientHeight || viewer.canvas.height || 1, 1);
    var metersPerPixel = (2 * cameraDist * Math.tan(fovy * 0.5)) / canvasHeight;
    var modelScaleValue = (airplane && airplane.model && airplane.model.scale && airplane.model.scale.getValue)
        ? airplane.model.scale.getValue(time) : (airplane && airplane.model ? airplane.model.scale : 5);
    var minimumPixelSizeValue = (airplane && airplane.model && airplane.model.minimumPixelSize && airplane.model.minimumPixelSize.getValue)
        ? airplane.model.minimumPixelSize.getValue(time) : (airplane && airplane.model ? airplane.model.minimumPixelSize : 80);
    var numericScale = Number(modelScaleValue) || 5;
    var numericMinPixelSize = Number(minimumPixelSizeValue) || 80;
    var modelRadiusByScale = 10 * numericScale;
    var modelRadiusByPixel = numericMinPixelSize * metersPerPixel * 0.42;
    var visualRadius = Math.max(modelRadiusByScale, modelRadiusByPixel);
    return { visualRadius: visualRadius, metersPerPixel: metersPerPixel };
}

function getWarningIconSizePx(airplane, time, ripplePosition, rippleState) {
    if (!ripplePosition || !rippleState || rippleState.radius <= 0) return TAIL_RIPPLE_CONFIG.warningIconMinSizePx;
    var metrics = getAirplaneVisualMetrics(airplane, time, ripplePosition);
    var sourceRadiusMeters = rippleState.innerRadius > 0 ? rippleState.innerRadius : rippleState.radius;
    var rippleRadiusPx = sourceRadiusMeters / Math.max(metrics.metersPerPixel, 0.0001);
    var targetSize = rippleRadiusPx * TAIL_RIPPLE_CONFIG.warningIconScaleByRipplePixelRadius;
    return Cesium.Math.clamp(targetSize, TAIL_RIPPLE_CONFIG.warningIconMinSizePx, TAIL_RIPPLE_CONFIG.warningIconMaxSizePx);
}

function getTailRipplePosition(airplane, time) {
    var airplanePosition = airplane.position.getValue(time);
    if (!airplanePosition) return null;
    if (!TAIL_RIPPLE_CONFIG.centerOffsetRatio) return airplanePosition;
    var up = Cesium.Ellipsoid.WGS84.geodeticSurfaceNormal(airplanePosition, new Cesium.Cartesian3());
    var metrics = getAirplaneVisualMetrics(airplane, time, airplanePosition);
    var centerOffset = Cesium.Cartesian3.multiplyByScalar(up, metrics.visualRadius * TAIL_RIPPLE_CONFIG.centerOffsetRatio, new Cesium.Cartesian3());
    return Cesium.Cartesian3.add(airplanePosition, centerOffset, new Cesium.Cartesian3());
}

function getTailRippleVisualState(airplane, time, layerProgressOffset, ripplePosition) {
    if (!isAirplaneAbnormal(airplane, time)) {
        return { radius: 0, innerRadius: 0, alpha: 0, color: TAIL_RIPPLE_CONFIG.warningColorStart };
    }
    var elapsedSeconds = Cesium.JulianDate.secondsDifference(time, viewer.clock.startTime);
    var normalizedTime = (elapsedSeconds / TAIL_RIPPLE_CONFIG.cycleSeconds + layerProgressOffset) % 1;
    var cycleProgress = normalizedTime < 0 ? normalizedTime + 1 : normalizedTime;
    var breathingScale = 1 + TAIL_RIPPLE_CONFIG.breathingAmplitude * Math.sin(elapsedSeconds * TAIL_RIPPLE_CONFIG.breathingFrequency);
    var basePosition = ripplePosition || airplane.position.getValue(time);
    if (!basePosition) return { radius: 1, innerRadius: 1, alpha: TAIL_RIPPLE_CONFIG.minAlpha, color: TAIL_RIPPLE_CONFIG.warningColorStart };
    var metrics = getAirplaneVisualMetrics(airplane, time, basePosition);
    var baseRadius = metrics.visualRadius * TAIL_RIPPLE_CONFIG.baseRadiusRatio;
    var innerRadius = baseRadius * breathingScale;
    var radius = innerRadius * (1 + TAIL_RIPPLE_CONFIG.growRadiusRatio * cycleProgress);
    var alpha = TAIL_RIPPLE_CONFIG.minAlpha + (1 - cycleProgress) * (TAIL_RIPPLE_CONFIG.maxAlpha - TAIL_RIPPLE_CONFIG.minAlpha);
    var color = Cesium.Color.lerp(TAIL_RIPPLE_CONFIG.warningColorStart, TAIL_RIPPLE_CONFIG.warningColorEnd, cycleProgress, new Cesium.Color());
    return { radius: radius, innerRadius: innerRadius, alpha: alpha, color: color };
}

function isAirplaneAbnormal(airplane, time) {
    var nowSeconds = Cesium.JulianDate.secondsDifference(time, viewer.clock.startTime);
    var alertState = airplaneAlertStateMap.get(airplane);
    if (!alertState) {
        var duration = Cesium.Math.lerp(AIRPLANE_ALERT_CONFIG.minDurationSeconds, AIRPLANE_ALERT_CONFIG.maxDurationSeconds, Math.random());
        alertState = { isAbnormal: false, nextSwitchAt: nowSeconds + duration };
        airplaneAlertStateMap.set(airplane, alertState);
    }
    if (nowSeconds >= alertState.nextSwitchAt) {
        alertState.isAbnormal = Math.random() < AIRPLANE_ALERT_CONFIG.abnormalProbability;
        var dur = Cesium.Math.lerp(AIRPLANE_ALERT_CONFIG.minDurationSeconds, AIRPLANE_ALERT_CONFIG.maxDurationSeconds, Math.random());
        alertState.nextSwitchAt = nowSeconds + dur;
    }
    return alertState.isAbnormal;
}

// === 每帧更新 ===
function onFrameUpdate() {
    if (!airplaneEntities.length) return;
    var currentAirplane = airplaneEntities[selectedAirplaneIndex];
    if (!currentAirplane) return;
    var currentTime = viewer.clock.currentTime;
    var position = currentAirplane.position.getValue(currentTime);
    if (!position) return;

    if (infoPanelVisible) updateInfoPanelPosition(position);
    updateFlightData(position, currentTime, currentAirplane.name);
    if (isCameraLocked) updateCameraFollow(position, currentTime);
}

function updateInfoPanelPosition(position) {
    var flightInfo = document.getElementById('flightInfo');
    var canvas = viewer.scene.canvas;
    var screenPosition = Cesium.SceneTransforms.wgs84ToWindowCoordinates(viewer.scene, position);
    if (screenPosition && screenPosition.x > 0 && screenPosition.x < canvas.width && screenPosition.y > 0 && screenPosition.y < canvas.height) {
        var cameraToPlaneDistance = Cesium.Cartesian3.distance(viewer.camera.positionWC, position);
        var zoomFactor = (cameraToPlaneDistance - INFO_PANEL_DISTANCE_MIN) / (INFO_PANEL_DISTANCE_MAX - INFO_PANEL_DISTANCE_MIN);
        var clampedZoomFactor = Cesium.Math.clamp(zoomFactor, 0, 1);
        var easedZoomFactor = 1 - Math.pow(1 - clampedZoomFactor, 5);
        var panelOffsetY = Cesium.Math.lerp(INFO_PANEL_OFFSET_Y_MAX, INFO_PANEL_OFFSET_Y_MIN, easedZoomFactor);
        var panelTop = Math.max(12, screenPosition.y - panelOffsetY);
        flightInfo.style.left = screenPosition.x + 'px';
        flightInfo.style.top = panelTop + 'px';
        flightInfo.classList.add('show');
    } else {
        flightInfo.classList.remove('show');
    }
}

function calculateSpeedKmh(currentAirplane, currentTime, currentPosition) {
    var sampleOffsetSeconds = 0.5;
    var previousTime = Cesium.JulianDate.addSeconds(currentTime, -sampleOffsetSeconds, new Cesium.JulianDate());
    var nextTime = Cesium.JulianDate.addSeconds(currentTime, sampleOffsetSeconds, new Cesium.JulianDate());
    var previousPosition = currentAirplane.position.getValue(previousTime);
    var nextPosition = currentAirplane.position.getValue(nextTime);
    if (previousPosition && nextPosition) return (Cesium.Cartesian3.distance(previousPosition, nextPosition) / (sampleOffsetSeconds * 2)) * 3.6;
    if (nextPosition) return (Cesium.Cartesian3.distance(currentPosition, nextPosition) / sampleOffsetSeconds) * 3.6;
    if (previousPosition) return (Cesium.Cartesian3.distance(previousPosition, currentPosition) / sampleOffsetSeconds) * 3.6;
    return TARGET_SPEED_KMH;
}

function normalizeDisplaySpeedKmh(currentAirplane, rawSpeedKmh) {
    if (!Number.isFinite(rawSpeedKmh) || rawSpeedKmh <= 0) return TARGET_SPEED_KMH;
    var baselineSpeed = speedBaselineMap.get(currentAirplane);
    if (!baselineSpeed) { baselineSpeed = rawSpeedKmh; speedBaselineMap.set(currentAirplane, baselineSpeed); }
    var normalizedSpeed = (rawSpeedKmh / baselineSpeed) * TARGET_SPEED_KMH;
    var minSpeed = TARGET_SPEED_KMH - SPEED_DISPLAY_RANGE_KMH;
    var maxSpeed = TARGET_SPEED_KMH + SPEED_DISPLAY_RANGE_KMH;
    return Math.round(Cesium.Math.clamp(normalizedSpeed, minSpeed, maxSpeed));
}

function updateFlightData(position, currentTime, airplaneName) {
    var cartographic = Cesium.Cartographic.fromCartesian(position);
    var height = cartographic.height;
    var currentAirplane = airplaneEntities[selectedAirplaneIndex];
    if (!currentAirplane) return;
    var rawSpeedKmh = calculateSpeedKmh(currentAirplane, currentTime, position);
    var speedKmh = normalizeDisplaySpeedKmh(currentAirplane, rawSpeedKmh);
    var nextTime = Cesium.JulianDate.addSeconds(currentTime, 0.1, new Cesium.JulianDate());
    var nextPosition = currentAirplane.position.getValue(nextTime);
    var heading = 0;
    if (nextPosition) {
        var currentCarto = Cesium.Cartographic.fromCartesian(position);
        var nextCarto = Cesium.Cartographic.fromCartesian(nextPosition);
        heading = Cesium.Math.toDegrees(Math.atan2(nextCarto.longitude - currentCarto.longitude, nextCarto.latitude - currentCarto.latitude));
        if (heading < 0) heading += 360;
    }
    document.getElementById('airplaneName').innerText = airplaneName || '未知';
    document.getElementById('speed').innerText = speedKmh + ' km/h';
    document.getElementById('altitude').innerText = Math.round(height) + ' m';
    document.getElementById('heading').innerText = Math.round(heading) + '°';
    var isAbnormal = isAirplaneAbnormal(currentAirplane, currentTime);
    var panel = document.getElementById('flightInfo');
    if (panel) {
        if (isAbnormal) panel.classList.add('warning'); else panel.classList.remove('warning');
    }
    document.getElementById('systemStatus').innerText = isAbnormal ? '异常告警' : '正常';
}

function updateCameraFollow(position, currentTime) {
    var cartographic = Cesium.Cartographic.fromCartesian(position);
    var nextTime = Cesium.JulianDate.addSeconds(currentTime, 0.1, new Cesium.JulianDate());
    var currentAirplane = airplaneEntities[selectedAirplaneIndex];
    var nextPosition = currentAirplane.position.getValue(nextTime);
    var heading = 0;
    if (nextPosition) {
        var currentCarto = Cesium.Cartographic.fromCartesian(position);
        var nextCarto = Cesium.Cartographic.fromCartesian(nextPosition);
        heading = Math.atan2(nextCarto.longitude - currentCarto.longitude, nextCarto.latitude - currentCarto.latitude);
    }
    var sideAngle = Cesium.Math.toRadians(-10);
    var backHeading = heading - sideAngle;
    var backLon = Cesium.Math.toDegrees(cartographic.longitude) - Math.sin(backHeading) * (cameraDistance / 111000);
    var backLat = Cesium.Math.toDegrees(cartographic.latitude) - Math.cos(backHeading) * (cameraDistance / 111000);
    var cameraHeight = cartographic.height + cameraHeightOffset;
    var cameraPosition = Cesium.Cartesian3.fromDegrees(backLon, backLat, cameraHeight);
    var targetUp = Cesium.Ellipsoid.WGS84.geodeticSurfaceNormal(position, new Cesium.Cartesian3());
    var targetOffset = Cesium.Cartesian3.multiplyByScalar(targetUp, 16, new Cesium.Cartesian3());
    var lookTarget = Cesium.Cartesian3.add(position, targetOffset, new Cesium.Cartesian3());
    var direction = Cesium.Cartesian3.normalize(Cesium.Cartesian3.subtract(lookTarget, cameraPosition, new Cesium.Cartesian3()), new Cesium.Cartesian3());
    var up = Cesium.Ellipsoid.WGS84.geodeticSurfaceNormal(cameraPosition, new Cesium.Cartesian3());
    viewer.camera.setView({ destination: cameraPosition, orientation: { direction: direction, up: up } });
}

// === 事件监听 ===
function resolvePickedAirplaneIndex(clickPosition) {
    if (weatherComponent) {
        return weatherComponent.resolvePickedAirplaneIndex(clickPosition, airplaneEntities, tailEffectToAirplaneIndexMap);
    }
    var pickedObject = viewer.scene.pick(clickPosition);
    if (!Cesium.defined(pickedObject)) return -1;
    var clickedIndex = airplaneEntities.findIndex(function (entity) { return entity === pickedObject.id; });
    if (clickedIndex !== -1) return clickedIndex;
    var effectIndex = tailEffectToAirplaneIndexMap.get(pickedObject.id);
    return effectIndex !== undefined ? effectIndex : -1;
}

function refreshWeatherEffects() {
    if (!weatherComponent) return;
    weatherComponent.clearAllEffects();
    if (ringPathPositions.length > 1) weatherComponent.createOnRing(ringPathPositions);
    weatherComponent.createFromAnchors(WEATHER_SAMPLE_ANCHORS);
}

function setupWeatherPresetControl() {
    var select = document.getElementById('weatherPresetSelect');
    if (!select || !weatherComponent) return;
    var presets = weatherComponent.getPresetNames();
    select.innerHTML = '';
    for (var i = 0; i < presets.length; i++) {
        var presetName = presets[i];
        var option = document.createElement('option');
        option.value = presetName;
        option.textContent = WEATHER_PRESET_LABELS[presetName] || presetName;
        if (presetName === weatherComponent.getActivePreset()) option.selected = true;
        select.appendChild(option);
    }
    select.addEventListener('change', function () {
        var nextPreset = select.value;
        var changed = weatherComponent.setPreset(nextPreset, STORM_EFFECT_CONFIG);
        if (changed) refreshWeatherEffects();
    });
}

function setupEventListeners() {
    var handler = new Cesium.ScreenSpaceEventHandler(viewer.scene.canvas);
    var flightInfo = document.getElementById('flightInfo');
    var modeButton = document.getElementById('btnSceneMode');

    if (modeButton) {
        modeButton.addEventListener('click', function () {
            SceneManager.toggleSceneMode();
            var isNight = SceneManager.getIsNightMode();
            var icon = modeButton.querySelector('.btn-icon');
            var label = modeButton.querySelector('.btn-label');
            if (icon) icon.textContent = isNight ? '☀' : '🌙';
            if (label) label.textContent = isNight ? '切换白天' : '切换黑夜';
        });
    }

    setupWeatherPresetControl();

    handler.setInputAction(function (click) {
        var resolvedIndex = resolvePickedAirplaneIndex(click.position);
        if (resolvedIndex !== -1) {
            selectedAirplaneIndex = resolvedIndex;
            airplaneEntity = airplaneEntities[resolvedIndex];
            pathEntity = pathEntities[resolvedIndex];
            infoPanelVisible = !infoPanelVisible;
            if (!infoPanelVisible) flightInfo.classList.remove('show');
            return;
        }
        if (isCameraLocked) {
            infoPanelVisible = false;
            flightInfo.classList.remove('show');
            unlockCamera();
        } else {
            infoPanelVisible = false;
            flightInfo.classList.remove('show');
        }
    }, Cesium.ScreenSpaceEventType.LEFT_CLICK);

    handler.setInputAction(function (click) {
        var resolvedIndex = resolvePickedAirplaneIndex(click.position);
        if (resolvedIndex !== -1) {
            selectedAirplaneIndex = resolvedIndex;
            airplaneEntity = airplaneEntities[resolvedIndex];
            pathEntity = pathEntities[resolvedIndex];
            toggleCameraLock();
        }
    }, Cesium.ScreenSpaceEventType.LEFT_DOUBLE_CLICK);
}

function toggleCameraLock() {
    isCameraLocked = !isCameraLocked;
    var cameraHint = document.getElementById('cameraHint');
    if (isCameraLocked) {
        viewer.scene.screenSpaceCameraController.enableInputs = false;
        cameraHint.classList.add('show');
        viewer.canvas.addEventListener('wheel', handleCameraZoom, { passive: false });
    } else {
        unlockCamera();
    }
}

function unlockCamera() {
    isCameraLocked = false;
    viewer.scene.screenSpaceCameraController.enableInputs = true;
    document.getElementById('cameraHint').classList.remove('show');
    viewer.canvas.removeEventListener('wheel', handleCameraZoom);
}

function handleCameraZoom(e) {
    if (!isCameraLocked) return;
    e.preventDefault();
    var zoomSpeed = 30;
    var delta = e.deltaY > 0 ? zoomSpeed : -zoomSpeed;
    cameraDistance = Math.max(CAMERA_DISTANCE_MIN, Math.min(CAMERA_DISTANCE_MAX, cameraDistance + delta));
    cameraHeightOffset = cameraDistance * 0.4;
}
