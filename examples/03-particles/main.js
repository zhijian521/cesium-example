/*== 03-particles — 编排层（飞机粒子特效 + SceneManager） ==*/

Cesium.Ion.defaultAccessToken = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJqdGkiOiI0OTAzZDRkZi00ODkyLTQ5OTUtOGE1MC1jN2JmNjc0ODdiOGUiLCJpZCI6MzMxMzk2LCJpYXQiOjE3NTUwNDgwNTV9.GH-UECFbXsiJip__VTu2oXoBmx8dt61E52q3rBakZyI';

var viewer;
var airplaneEntity;
var pathEntity;
var isCameraLocked = false;
var infoPanelVisible = false;
var airplaneEntities = [];
var pathEntities = [];
var selectedAirplaneIndex = 0;
var cameraDistance = 500;
var cameraHeightOffset = 200;

var particleSystems = [];
var particleEffectKey = 'flame';
var particleIntensity = 1.0;
var particleTextures = {};
var particleMatrix3Scratch = new Cesium.Matrix3();
var particleUp = new Cesium.Cartesian3();
var flameBuoyancyScratch = new Cesium.Cartesian3();
var particleForward = new Cesium.Cartesian3();
var particleBackward = new Cesium.Cartesian3();
var particleRight = new Cesium.Cartesian3();
var trailAlignScratch = new Cesium.Cartesian3();
var turbulenceScratch = new Cesium.Cartesian3();
var turbulenceScratch2 = new Cesium.Cartesian3();

var AIRPLANE_MODEL_URL = '../../assets/models/aircraft/aircraft_Animi.gltf';

var LOCATIONS = {
    dongfangmingzhu: { lon: 121.4998, lat: 31.2397, height: 600 },
    dishuihu: { lon: 121.935, lat: 30.9, height: 600 },
    chongmingdao: { lon: 121.75, lat: 31.52, height: 600 }
};

var PARTICLE_PRESETS = {
    flame: {
        imageKey: 'flame',
        offset: new Cesium.Cartesian3(-14.5, 0, -0.5),
        variants: [
            {
                startColor: new Cesium.Color(1.0, 0.995, 0.9, 0.55),
                endColor: new Cesium.Color(1.0, 0.88, 0.55, 0.18),
                startScale: 0.36, endScale: 2.4,
                minLife: 0.3, maxLife: 0.7,
                minSpeed: 9.5, maxSpeed: 15.0,
                emissionRate: 175,
                angle: Cesium.Math.toRadians(6), size: 6,
                emitterRotationY: 8,
                updateCallback: applyFlameBuoyancy
            },
            {
                startColor: new Cesium.Color(1.0, 0.85, 0.55, 0.32),
                endColor: new Cesium.Color(0.85, 0.35, 0.18, 0.06),
                startScale: 0.95, endScale: 6.4,
                minLife: 0.9, maxLife: 2.2,
                minSpeed: 3.8, maxSpeed: 8.0,
                emissionRate: 90,
                angle: Cesium.Math.toRadians(30), size: 11,
                emitterRotationY: 18,
                updateCallback: applyFlameBuoyancyStrong
            },
            {
                imageKey: 'blackSmoke',
                startColor: new Cesium.Color(0.2, 0.2, 0.2, 0.28),
                endColor: new Cesium.Color(0.08, 0.08, 0.08, 0.0),
                startScale: 1.2, endScale: 5.8,
                minLife: 1.2, maxLife: 2.6,
                minSpeed: 1.6, maxSpeed: 2.8,
                emissionRate: 35,
                angle: Cesium.Math.toRadians(28), size: 12,
                emitterRotationY: 18,
                updateCallback: applySmokeBuoyancy
            }
        ]
    },
    smoke: {
        imageKey: 'smoke',
        startColor: new Cesium.Color(0.8, 0.8, 0.8, 0.6),
        endColor: new Cesium.Color(0.2, 0.2, 0.2, 0.0),
        startScale: 2.0, endScale: 6.0,
        minLife: 1.5, maxLife: 3.0,
        minSpeed: 1.5, maxSpeed: 3.5,
        emissionRate: 50,
        angle: Cesium.Math.toRadians(25), size: 14,
        offset: new Cesium.Cartesian3(-18, 0, 0)
    },
    trail: {
        imageKey: 'airflowSmoke',
        variants: [
            {
                startColor: new Cesium.Color(1.0, 1.0, 1.0, 0.32),
                endColor: new Cesium.Color(1.0, 1.0, 1.0, 0.0),
                startScale: 0.9, endScale: 3.2,
                minLife: 2.5, maxLife: 4.5,
                minSpeed: 0.4, maxSpeed: 1.1,
                emissionRate: 55,
                angle: Cesium.Math.toRadians(10.0), size: 10,
                sizeAspect: { x: 1.4, y: 0.9 },
                updateCallback: applySoftAirflow,
                streams: [
                    { offset: new Cesium.Cartesian3(-23.8, -1.8, 2.0), emissionScale: 1.0, sizeScale: 1.0 },
                    { offset: new Cesium.Cartesian3(-23.8, 1.8, 2.0), emissionScale: 1.0, sizeScale: 1.0 }
                ]
            },
            {
                startColor: new Cesium.Color(1.0, 1.0, 1.0, 0.2),
                endColor: new Cesium.Color(1.0, 1.0, 1.0, 0.0),
                startScale: 1.6, endScale: 5.0,
                minLife: 3.8, maxLife: 6.0,
                minSpeed: 0.25, maxSpeed: 0.7,
                emissionRate: 24,
                angle: Cesium.Math.toRadians(16.0), size: 14,
                sizeAspect: { x: 1.6, y: 1.1 },
                updateCallback: applySoftAirflow,
                streams: [
                    { offset: new Cesium.Cartesian3(-24.2, -1.8, 2.2), emissionScale: 0.75, sizeScale: 1.05 },
                    { offset: new Cesium.Cartesian3(-24.2, 1.8, 2.2), emissionScale: 0.75, sizeScale: 1.05 },
                    { offset: new Cesium.Cartesian3(-23.6, 0.0, 2.25), emissionScale: 0.5, sizeScale: 0.95 }
                ]
            }
        ]
    }
};

// === 启动 ===
document.addEventListener('DOMContentLoaded', async function () {
    try {
        viewer = await SceneManager.init('cesiumContainer');

        createAirplaneAndPath();
        setupEventListeners();
        initParticleTextures();
        setupEffectControls();

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
        var lon = LOCATIONS.dongfangmingzhu.lon + 0.015 * Math.cos(angle);
        var lat = LOCATIONS.dongfangmingzhu.lat + 0.015 * Math.sin(angle) * 0.85;
        var time = Cesium.JulianDate.addSeconds(startTime, (i / numPoints) * duration, new Cesium.JulianDate());
        var position = Cesium.Cartesian3.fromDegrees(lon, lat, LOCATIONS.dongfangmingzhu.height);
        positionProperty1.addSample(time, position);
        pathPositions1.push(position);
    }

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
        availability: new Cesium.TimeIntervalCollection([
            new Cesium.TimeInterval({ start: startTime, stop: stopTime })
        ]),
        model: {
            uri: AIRPLANE_MODEL_URL,
            scale: 5,
            minimumPixelSize: 50,
            maximumScale: 100
        },
        orientation: new Cesium.VelocityOrientationProperty(positionProperty1)
    });
    airplaneEntities.push(airplaneEntity);

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
        var lon2 = LOCATIONS.dishuihu.lon + (LOCATIONS.chongmingdao.lon - LOCATIONS.dishuihu.lon) * t;
        var lat2 = LOCATIONS.dishuihu.lat + (LOCATIONS.chongmingdao.lat - LOCATIONS.dishuihu.lat) * t;
        var time2 = Cesium.JulianDate.addSeconds(startTime, (j / numPoints2) * duration, new Cesium.JulianDate());
        var pos = Cesium.Cartesian3.fromDegrees(lon2, lat2, 800);
        positionProperty2.addSample(time2, pos);
        pathPositions2.push(pos);
    }
    for (var k = halfPoints; k <= numPoints2; k++) {
        var t2 = (k - halfPoints) / (numPoints2 - halfPoints);
        var lon3 = LOCATIONS.chongmingdao.lon + (LOCATIONS.dishuihu.lon - LOCATIONS.chongmingdao.lon) * t2;
        var lat3 = LOCATIONS.chongmingdao.lat + (LOCATIONS.dishuihu.lat - LOCATIONS.chongmingdao.lat) * t2;
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
        availability: new Cesium.TimeIntervalCollection([
            new Cesium.TimeInterval({ start: startTime, stop: stopTime })
        ]),
        model: {
            uri: AIRPLANE_MODEL_URL,
            scale: 5,
            minimumPixelSize: 50,
            maximumScale: 100
        },
        orientation: new Cesium.VelocityOrientationProperty(positionProperty2)
    });
    airplaneEntities.push(airplaneEntity2);
}

// === 每帧更新 ===
function onFrameUpdate() {
    if (!airplaneEntities.length) return;

    var currentAirplane = airplaneEntities[selectedAirplaneIndex];
    if (!currentAirplane) return;

    var currentTime = viewer.clock.currentTime;
    var position = currentAirplane.position.getValue(currentTime);
    if (!position) return;

    if (infoPanelVisible) {
        updateInfoPanelPosition(position);
    }
    updateFlightData(position, currentTime, currentAirplane.name);

    if (isCameraLocked) {
        updateCameraFollow(position, currentTime);
    }

    updateParticleSystem(currentAirplane, currentTime);
}

// === 信息面板 ===
function updateInfoPanelPosition(position) {
    var flightInfo = document.getElementById('flightInfo');
    var canvas = viewer.scene.canvas;
    var screenPosition = Cesium.SceneTransforms.wgs84ToWindowCoordinates(viewer.scene, position);

    if (screenPosition &&
        screenPosition.x > 0 && screenPosition.x < canvas.width &&
        screenPosition.y > 0 && screenPosition.y < canvas.height) {
        flightInfo.style.left = screenPosition.x + 'px';
        flightInfo.style.top = screenPosition.y + 'px';
        flightInfo.classList.add('show');
    } else {
        flightInfo.classList.remove('show');
    }
}

function updateFlightData(position, currentTime, airplaneName) {
    var cartographic = Cesium.Cartographic.fromCartesian(position);
    var height = cartographic.height;

    var dt = 0.1;
    var nextTime = Cesium.JulianDate.addSeconds(currentTime, dt, new Cesium.JulianDate());
    var currentAirplane = airplaneEntities[selectedAirplaneIndex];
    var nextPosition = currentAirplane.position.getValue(nextTime);

    var heading = 0;
    var speedKmh = 0;

    if (nextPosition) {
        var currentCarto = Cesium.Cartographic.fromCartesian(position);
        var nextCarto = Cesium.Cartographic.fromCartesian(nextPosition);
        heading = Cesium.Math.toDegrees(
            Math.atan2(nextCarto.longitude - currentCarto.longitude, nextCarto.latitude - currentCarto.latitude)
        );
        if (heading < 0) heading += 360;
        var distance = Cesium.Cartesian3.distance(position, nextPosition);
        speedKmh = (distance / dt) * 3.6;
    }

    document.getElementById('airplaneName').innerText = airplaneName || '未知';
    document.getElementById('altitude').innerText = Math.round(height) + ' m';
    document.getElementById('heading').innerText = Math.round(heading) + '°';
    document.getElementById('speed').innerText = Math.round(speedKmh) + ' km/h';
}

// === 相机跟随 ===
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

    viewer.camera.setView({
        destination: Cesium.Cartesian3.fromDegrees(backLon, backLat, cameraHeight),
        orientation: {
            heading: heading,
            pitch: Cesium.Math.toRadians(-15),
            roll: 0
        }
    });
}

// === 事件监听 ===
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

    handler.setInputAction(function (click) {
        var pickedObject = viewer.scene.pick(click.position);
        if (Cesium.defined(pickedObject)) {
            var clickedIndex = airplaneEntities.findIndex(function (entity) { return entity === pickedObject.id; });
            if (clickedIndex !== -1) {
                selectedAirplaneIndex = clickedIndex;
                airplaneEntity = airplaneEntities[clickedIndex];
                pathEntity = pathEntities[clickedIndex];
                infoPanelVisible = !infoPanelVisible;
                if (!infoPanelVisible) flightInfo.classList.remove('show');
                return;
            }
        }
        if (isCameraLocked) {
            unlockCamera();
        } else {
            infoPanelVisible = false;
            flightInfo.classList.remove('show');
        }
    }, Cesium.ScreenSpaceEventType.LEFT_CLICK);

    handler.setInputAction(function (click) {
        var pickedObject = viewer.scene.pick(click.position);
        if (Cesium.defined(pickedObject)) {
            var clickedIndex = airplaneEntities.findIndex(function (entity) { return entity === pickedObject.id; });
            if (clickedIndex !== -1) {
                selectedAirplaneIndex = clickedIndex;
                airplaneEntity = airplaneEntities[clickedIndex];
                pathEntity = pathEntities[clickedIndex];
                toggleCameraLock();
            }
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

function handleCameraZoom(event) {
    if (!isCameraLocked) return;
    event.preventDefault();
    var zoomSpeed = 30;
    var delta = event.deltaY > 0 ? zoomSpeed : -zoomSpeed;
    cameraDistance = Math.max(100, Math.min(2000, cameraDistance + delta));
    cameraHeightOffset = cameraDistance * 0.4;
}

// === 粒子纹理生成 ===
function initParticleTextures() {
    particleTextures = {
        flame: buildRadialTexture('rgba(255, 255, 245, 0.7)', 'rgba(120, 45, 15, 0)', 'rgba(255, 220, 140, 0.5)'),
        smoke: buildRadialTexture('rgba(220, 220, 220, 0.8)', 'rgba(80, 80, 80, 0)'),
        airflowSmoke: buildRadialTexture('rgba(255, 255, 255, 0.95)', 'rgba(255, 255, 255, 0)'),
        blackSmoke: buildRadialTexture('rgba(95, 95, 95, 0.35)', 'rgba(15, 15, 15, 0)', 'rgba(55, 55, 55, 0.25)')
    };
}

function buildRadialTexture(innerColor, outerColor, midColor) {
    var canvas = document.createElement('canvas');
    canvas.width = 64;
    canvas.height = 64;
    var ctx = canvas.getContext('2d');
    var gradient = ctx.createRadialGradient(32, 32, 0, 32, 32, 32);
    gradient.addColorStop(0, innerColor);
    if (midColor) gradient.addColorStop(0.45, midColor);
    gradient.addColorStop(1, outerColor);
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, 64, 64);
    return canvas.toDataURL('image/png');
}

// === 特效控制 ===
function setupEffectControls() {
    var effectSelect = document.getElementById('effectSelect');
    var intensityRange = document.getElementById('intensityRange');
    var intensityValue = document.getElementById('intensityValue');

    effectSelect.addEventListener('change', function () {
        setParticleEffect(effectSelect.value);
    });
    intensityRange.addEventListener('input', function () {
        var value = parseFloat(intensityRange.value);
        intensityValue.textContent = value.toFixed(1) + '倍';
        setParticleIntensity(value);
    });

    particleEffectKey = effectSelect.value;
    particleIntensity = parseFloat(intensityRange.value);
    setParticleEffect(particleEffectKey);
}

function setParticleEffect(key) {
    particleEffectKey = key;
    createParticleSystems();
}

function setParticleIntensity(value) {
    particleIntensity = value;
    createParticleSystems();
}

// === 粒子系统创建 ===
function createParticleSystems() {
    if (!viewer) return;
    clearParticleSystems();
    if (particleEffectKey === 'none') return;

    var preset = PARTICLE_PRESETS[particleEffectKey];
    if (!preset) return;

    var variants = preset.variants && preset.variants.length ? preset.variants : [preset];

    variants.forEach(function (variant) {
        var streams = variant.streams && variant.streams.length
            ? variant.streams
            : (preset.streams && preset.streams.length ? preset.streams : [{ offset: variant.offset || preset.offset }]);

        streams.forEach(function (stream) {
            var sizeScale = Cesium.defined(stream.sizeScale) ? stream.sizeScale : 1.0;
            var emissionScale = Cesium.defined(stream.emissionScale) ? stream.emissionScale : 1.0;
            var size = getPresetValue(variant, preset, 'size') * particleIntensity * sizeScale;
            var emissionRate = getPresetValue(variant, preset, 'emissionRate') * particleIntensity * emissionScale;
            var imageKey = getPresetValue(variant, preset, 'imageKey');
            var startColor = getPresetValue(variant, preset, 'startColor');
            var endColor = getPresetValue(variant, preset, 'endColor');
            var startScale = getPresetValue(variant, preset, 'startScale');
            var endScale = getPresetValue(variant, preset, 'endScale');
            var minLife = getPresetValue(variant, preset, 'minLife');
            var maxLife = getPresetValue(variant, preset, 'maxLife');
            var minSpeed = getPresetValue(variant, preset, 'minSpeed');
            var maxSpeed = getPresetValue(variant, preset, 'maxSpeed');
            var angle = getPresetValue(variant, preset, 'angle');
            var sizeAspect = getPresetValue(variant, preset, 'sizeAspect');
            var updateCallback = getPresetValue(variant, preset, 'updateCallback');
            var emitterRotationY = getPresetValue(variant, preset, 'emitterRotationY');

            var particleSystem = new Cesium.ParticleSystem({
                image: particleTextures[imageKey],
                startColor: startColor,
                endColor: endColor,
                startScale: startScale,
                endScale: endScale,
                minimumParticleLife: minLife,
                maximumParticleLife: maxLife,
                minimumSpeed: minSpeed,
                maximumSpeed: maxSpeed,
                imageSize: buildImageSize(size, sizeAspect),
                emissionRate: emissionRate,
                emitter: new Cesium.ConeEmitter(angle),
                sizeInMeters: true,
                updateCallback: updateCallback
            });

            var offset = Cesium.defined(stream.offset) ? stream.offset : (variant.offset || preset.offset);
            particleSystem.emitterModelMatrix = computeEmitterModelMatrix(offset, emitterRotationY);
            viewer.scene.primitives.add(particleSystem);
            particleSystems.push(particleSystem);
        });
    });
}

function clearParticleSystems() {
    if (!particleSystems.length || !viewer) return;
    particleSystems.forEach(function (system) { viewer.scene.primitives.remove(system); });
    particleSystems = [];
}

function buildImageSize(size, aspect) {
    if (!aspect) return new Cesium.Cartesian2(size, size);
    return new Cesium.Cartesian2(size * aspect.x, size * aspect.y);
}

function getPresetValue(variant, preset, key) {
    return Cesium.defined(variant[key]) ? variant[key] : preset[key];
}

function computeEmitterModelMatrix(offset, rotationY) {
    var baseAngle = -90 + (rotationY || 0);
    var rotation = Cesium.Matrix3.fromRotationY(Cesium.Math.toRadians(baseAngle));
    return Cesium.Matrix4.fromRotationTranslation(rotation, offset);
}

// === 粒子物理回调 ===
function applyFlameBuoyancy(particle, dt) {
    if (!particle) return;
    var lift = Cesium.Cartesian3.multiplyByScalar(particleUp, 3.0 * dt, flameBuoyancyScratch);
    particle.velocity = Cesium.Cartesian3.add(particle.velocity, lift, particle.velocity);
    applyTurbulence(particle, dt, 0.35, 0.12);
    applyFlameRise(particle, dt, 0.6, 1.2);
}

function applyFlameBuoyancyStrong(particle, dt) {
    if (!particle) return;
    var lift = Cesium.Cartesian3.multiplyByScalar(particleUp, 4.8 * dt, flameBuoyancyScratch);
    particle.velocity = Cesium.Cartesian3.add(particle.velocity, lift, particle.velocity);
    applyTurbulence(particle, dt, 0.7, 0.22);
    applyFlameRise(particle, dt, 0.8, 1.8);
}

function applySmokeBuoyancy(particle, dt) {
    if (!particle) return;
    var lift = Cesium.Cartesian3.multiplyByScalar(particleUp, 2.0 * dt, flameBuoyancyScratch);
    particle.velocity = Cesium.Cartesian3.add(particle.velocity, lift, particle.velocity);
    applyTurbulence(particle, dt, 1.2, 0.35);
}

function applySoftAirflow(particle, dt) {
    if (!particle) return;
    var speed = Cesium.Cartesian3.magnitude(particle.velocity);
    if (speed <= 0.0001) return;
    var baseSpeed = Math.max(speed, 0.3);
    var desired = Cesium.Cartesian3.multiplyByScalar(particleBackward, baseSpeed, trailAlignScratch);
    Cesium.Cartesian3.lerp(particle.velocity, desired, 0.22, particle.velocity);
    var lift = Cesium.Cartesian3.multiplyByScalar(particleUp, 0.35 * dt, turbulenceScratch);
    var side = (Math.random() - 0.5) * 0.06;
    Cesium.Cartesian3.multiplyByScalar(particleRight, side, turbulenceScratch2);
    Cesium.Cartesian3.add(lift, turbulenceScratch2, turbulenceScratch);
    Cesium.Cartesian3.multiplyByScalar(turbulenceScratch, baseSpeed * dt, turbulenceScratch);
    particle.velocity = Cesium.Cartesian3.add(particle.velocity, turbulenceScratch, particle.velocity);
    Cesium.Cartesian3.multiplyByScalar(particle.velocity, 0.985, particle.velocity);
}

function applyTurbulence(particle, dt, sideStrength, upStrength) {
    var speed = Cesium.Cartesian3.magnitude(particle.velocity);
    if (speed <= 0.0001) return;
    var sideJitter = (Math.random() - 0.5) * sideStrength;
    var upJitter = (Math.random() - 0.5) * upStrength;
    Cesium.Cartesian3.multiplyByScalar(particleRight, sideJitter, turbulenceScratch);
    Cesium.Cartesian3.multiplyByScalar(particleUp, upJitter, turbulenceScratch2);
    Cesium.Cartesian3.add(turbulenceScratch, turbulenceScratch2, turbulenceScratch);
    Cesium.Cartesian3.multiplyByScalar(turbulenceScratch, speed * dt, turbulenceScratch);
    particle.velocity = Cesium.Cartesian3.add(particle.velocity, turbulenceScratch, particle.velocity);
}

function applyFlameRise(particle, dt, damping, extraLift) {
    var lift = Cesium.Cartesian3.multiplyByScalar(particleUp, extraLift * dt, flameBuoyancyScratch);
    particle.velocity = Cesium.Cartesian3.add(particle.velocity, lift, particle.velocity);
    var factor = Math.max(0.0, 1.0 - damping * dt);
    Cesium.Cartesian3.multiplyByScalar(particle.velocity, factor, particle.velocity);
}

// === 粒子模型矩阵 ===
function updateParticleSystem(entity, time) {
    if (!particleSystems.length || !entity) return;
    var modelMatrix = computeParticleModelMatrix(entity, time);
    if (modelMatrix) {
        Cesium.Matrix4.getMatrix3(modelMatrix, particleMatrix3Scratch);
        Cesium.Matrix3.getColumn(particleMatrix3Scratch, 2, particleUp);
        Cesium.Matrix3.getColumn(particleMatrix3Scratch, 0, particleForward);
        Cesium.Matrix3.getColumn(particleMatrix3Scratch, 1, particleRight);
        Cesium.Cartesian3.multiplyByScalar(particleForward, -1.0, particleBackward);
        particleSystems.forEach(function (system) { system.modelMatrix = modelMatrix; });
    }
}

function computeParticleModelMatrix(entity, time) {
    var position = entity.position.getValue(time);
    if (!position) return null;
    var nextTime = Cesium.JulianDate.addSeconds(time, 0.1, new Cesium.JulianDate());
    var nextPosition = entity.position.getValue(nextTime);
    if (!nextPosition) return null;
    var velocity = Cesium.Cartesian3.subtract(nextPosition, position, new Cesium.Cartesian3());
    Cesium.Cartesian3.normalize(velocity, velocity);
    var up = Cesium.Cartesian3.normalize(position, new Cesium.Cartesian3());
    var right = Cesium.Cartesian3.normalize(Cesium.Cartesian3.cross(velocity, up, new Cesium.Cartesian3()), new Cesium.Cartesian3());
    var correctedUp = Cesium.Cartesian3.normalize(Cesium.Cartesian3.cross(right, velocity, new Cesium.Cartesian3()), new Cesium.Cartesian3());
    var rotation = new Cesium.Matrix3();
    Cesium.Matrix3.setColumn(rotation, 0, velocity, rotation);
    Cesium.Matrix3.setColumn(rotation, 1, right, rotation);
    Cesium.Matrix3.setColumn(rotation, 2, correctedUp, rotation);
    return Cesium.Matrix4.fromRotationTranslation(rotation, position);
}
