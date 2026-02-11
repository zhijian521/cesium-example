(function attachWeatherComponent(global) {
    const DEFAULT_WEATHER_CONFIG = {
        minCellCount: 3,
        maxCellCount: 4,
        minHeightOffset: 260,
        maxHeightOffset: 720,
        lonLatJitter: 0.006,
        billboardSpreadMeters: 760,
        coreRadius: 780,
        minCloudClusterCount: 4,
        maxCloudClusterCount: 6,
        minClusterBillboardCount: 9,
        maxClusterBillboardCount: 15,
        cloudThicknessMultiplier: 5,
        cloudBillboardSizeMeters: 260,
        cloudBillboardAlpha: 0.58,
        cloudDriftMeters: 66,
        rainLinesPerCell: 34,
        rainTrailLength: 130,
        rainColumnHeight: 620,
        rainFallSpeed: 120,
        rainWidth: 1,
        rainAlpha: 0.26,
        lightningDrop: 700,
        lightningWidth: 1.2,
        lightningGlowWidth: 2.8,
        lightningSegments: 8,
        lightningHorizontalJitterMeters: 92,
        lightningRefreshHz: 18,
        lightningMinIntervalSec: 3.8,
        lightningMaxIntervalSec: 8.2,
        lightningMinStrikeDurationSec: 0.09,
        lightningMaxStrikeDurationSec: 0.16
    };

    const WEATHER_PRESETS = {
        drizzle: {
            minCellCount: 1,
            maxCellCount: 2,
            minCloudClusterCount: 4,
            maxCloudClusterCount: 6,
            minClusterBillboardCount: 11,
            maxClusterBillboardCount: 18,
            cloudThicknessMultiplier: 7,
            cloudBillboardAlpha: 0.52,
            rainLinesPerCell: 16,
            rainTrailLength: 120,
            rainAlpha: 0.18,
            lightningMinIntervalSec: 12,
            lightningMaxIntervalSec: 20,
            lightningMinStrikeDurationSec: 0.05,
            lightningMaxStrikeDurationSec: 0.1,
            lightningWidth: 0.8,
            lightningGlowWidth: 2.1
        },
        rainstorm: {
            minCellCount: 2,
            maxCellCount: 3,
            minCloudClusterCount: 6,
            maxCloudClusterCount: 8,
            minClusterBillboardCount: 12,
            maxClusterBillboardCount: 20,
            cloudThicknessMultiplier: 7,
            cloudBillboardAlpha: 0.64,
            rainLinesPerCell: 34,
            rainTrailLength: 130,
            rainAlpha: 0.26,
            lightningMinIntervalSec: 3.8,
            lightningMaxIntervalSec: 8.2,
            lightningMinStrikeDurationSec: 0.09,
            lightningMaxStrikeDurationSec: 0.16,
            lightningWidth: 1.2,
            lightningGlowWidth: 2.8
        },
        darkStorm: {
            minCellCount: 3,
            maxCellCount: 4,
            minCloudClusterCount: 8,
            maxCloudClusterCount: 10,
            minClusterBillboardCount: 14,
            maxClusterBillboardCount: 24,
            cloudThicknessMultiplier: 8,
            cloudBillboardAlpha: 0.72,
            rainLinesPerCell: 50,
            rainTrailLength: 140,
            rainAlpha: 0.31,
            lightningMinIntervalSec: 2.2,
            lightningMaxIntervalSec: 5.8,
            lightningMinStrikeDurationSec: 0.1,
            lightningMaxStrikeDurationSec: 0.2,
            lightningWidth: 1.35,
            lightningGlowWidth: 3.2
        }
    };

    const CLOUD_SMOKE_COLOR_PALETTE = [
        Cesium.Color.fromBytes(245, 245, 245),
        Cesium.Color.fromBytes(208, 208, 208),
        Cesium.Color.fromBytes(170, 170, 170),
        Cesium.Color.fromBytes(132, 132, 132),
        Cesium.Color.fromBytes(96, 96, 96)
    ];

    function createWeatherEffectComponent(viewer, options = {}) {
        if (!viewer) {
            throw new Error('createWeatherEffectComponent requires a Cesium viewer instance');
        }

        const baseHeight = Number.isFinite(options.baseHeight) ? options.baseHeight : 600;
        let activePreset = (typeof options.preset === 'string' && WEATHER_PRESETS[options.preset])
            ? options.preset
            : 'rainstorm';
        let baseConfig = {
            ...DEFAULT_WEATHER_CONFIG,
            ...WEATHER_PRESETS[activePreset],
            ...(options.config || {})
        };

        const weatherEntities = [];
        const weatherEntitySet = new WeakSet();
        const cloudSmokeSpriteDataUrls = createCloudSmokeSpriteVariants();

        function resolveConfig(configOverrides) {
            if (!configOverrides) return baseConfig;
            return {
                ...baseConfig,
                ...configOverrides
            };
        }

        function getPresetNames() {
            return Object.keys(WEATHER_PRESETS);
        }

        function getActivePreset() {
            return activePreset;
        }

        function setPreset(presetName, configOverrides = {}) {
            if (!WEATHER_PRESETS[presetName]) return false;
            activePreset = presetName;
            baseConfig = {
                ...DEFAULT_WEATHER_CONFIG,
                ...WEATHER_PRESETS[activePreset],
                ...configOverrides
            };
            return true;
        }

        function addEntity(entity) {
            if (!entity) return;
            entity.allowPicking = false;
            entity.isWeatherEffect = true;
            weatherEntities.push(entity);
            weatherEntitySet.add(entity);
        }

        function clearAllEffects() {
            for (const entity of weatherEntities) {
                weatherEntitySet.delete(entity);
                viewer.entities.remove(entity);
            }
            weatherEntities.length = 0;
        }

        function isWeatherEntity(entity) {
            if (!entity) return false;
            if (weatherEntitySet.has(entity)) return true;
            if (entity.isWeatherEffect) return true;
            return typeof entity.name === 'string' && entity.name.includes('雷阵雨');
        }

        function resolvePickedAirplaneIndex(clickPosition, airplaneEntities = [], tailEffectMap = new WeakMap()) {
            const pickedObjects = viewer.scene.drillPick(clickPosition, 200);
            if (!pickedObjects || !pickedObjects.length) return -1;

            for (const pickedObject of pickedObjects) {
                const pickedId = pickedObject?.id ?? pickedObject?.primitive?.id;
                if (!pickedId) continue;
                if (isWeatherEntity(pickedId)) continue;

                const airplaneIndex = airplaneEntities.findIndex(entity => entity === pickedId);
                if (airplaneIndex !== -1) return airplaneIndex;

                const tailEffectIndex = tailEffectMap.get(pickedId);
                if (tailEffectIndex !== undefined && tailEffectIndex !== -1) {
                    return tailEffectIndex;
                }
            }

            return -1;
        }

        function createOnRing(pathPositions, configOverrides) {
            if (!pathPositions || pathPositions.length < 2) return;
            const weatherConfig = resolveConfig(configOverrides);
            const cellCount = getRandomInt(weatherConfig.minCellCount, weatherConfig.maxCellCount);

            for (let i = 0; i < cellCount; i++) {
                const anchorIndex = getRandomInt(0, pathPositions.length - 1);
                const anchorCartographic = Cesium.Cartographic.fromCartesian(pathPositions[anchorIndex]);
                if (!anchorCartographic) continue;

                const lon = Cesium.Math.toDegrees(anchorCartographic.longitude)
                    + Cesium.Math.lerp(-weatherConfig.lonLatJitter, weatherConfig.lonLatJitter, Math.random());
                const lat = Cesium.Math.toDegrees(anchorCartographic.latitude)
                    + Cesium.Math.lerp(-weatherConfig.lonLatJitter, weatherConfig.lonLatJitter, Math.random());

                const anchorHeight = Number(anchorCartographic.height);
                const resolvedBaseHeight = Number.isFinite(anchorHeight) ? anchorHeight : baseHeight;
                const height = resolvedBaseHeight + getRandomInt(weatherConfig.minHeightOffset, weatherConfig.maxHeightOffset);

                createStormCellEffects(lon, lat, height, weatherConfig);
            }
        }

        function createFromAnchors(anchorList, configOverrides) {
            if (!anchorList || !anchorList.length) return;
            const weatherConfig = resolveConfig(configOverrides);

            for (const anchor of anchorList) {
                const anchorLon = Number(anchor?.lon);
                const anchorLat = Number(anchor?.lat);
                if (!Number.isFinite(anchorLon) || !Number.isFinite(anchorLat)) continue;

                const radiusMeters = Number(anchor?.radiusMeters) || weatherConfig.billboardSpreadMeters;
                const pointBaseHeight = Number.isFinite(Number(anchor?.baseHeight))
                    ? Number(anchor.baseHeight)
                    : baseHeight;

                const cellCount = getRandomInt(weatherConfig.minCellCount, weatherConfig.maxCellCount);
                for (let i = 0; i < cellCount; i++) {
                    const offset = getMetersOffsetFromCenter(radiusMeters);
                    const pos = offsetMetersToLonLat(anchorLon, anchorLat, offset.x, offset.y);
                    const height = pointBaseHeight + getRandomInt(weatherConfig.minHeightOffset, weatherConfig.maxHeightOffset);
                    createStormCellEffects(pos.lon, pos.lat, height, weatherConfig);
                }
            }
        }

        function createStormCellEffects(lon, lat, height, weatherConfig) {
            const clusterCount = getRandomInt(weatherConfig.minCloudClusterCount, weatherConfig.maxCloudClusterCount);

            for (let clusterIndex = 0; clusterIndex < clusterCount; clusterIndex++) {
                const clusterOffset = getMetersOffsetFromCenter(weatherConfig.billboardSpreadMeters);
                const clusterCenter = offsetMetersToLonLat(lon, lat, clusterOffset.x, clusterOffset.y);
                const clusterHeight = height + Cesium.Math.lerp(-120, 180, Math.random());

                const baseCloudCount = getRandomInt(weatherConfig.minClusterBillboardCount, weatherConfig.maxClusterBillboardCount);
                const cloudThicknessMultiplier = Math.max(5, Number(weatherConfig.cloudThicknessMultiplier) || 5);
                const cloudCount = Math.round(baseCloudCount * cloudThicknessMultiplier);
                for (let i = 0; i < cloudCount; i++) {
                    const localOffset = getMetersOffsetFromCenter(weatherConfig.billboardSpreadMeters * 0.35);
                    const cloudPosBase = offsetMetersToLonLat(clusterCenter.lon, clusterCenter.lat, localOffset.x, localOffset.y);
                    const cloudHeightBase = clusterHeight + Cesium.Math.lerp(-55, 65, Math.random());
                    const cloudSize = weatherConfig.cloudBillboardSizeMeters * Cesium.Math.lerp(0.58, 1.2, Math.random());
                    const cloudAspectRatio = Cesium.Math.lerp(0.64, 1.04, Math.random());
                    const alphaBase = weatherConfig.cloudBillboardAlpha * Cesium.Math.lerp(0.88, 1.2, Math.random());
                    const driftPhase = Math.random() * Math.PI * 2;
                    const driftSpeed = Cesium.Math.lerp(0.04, 0.1, Math.random());
                    const driftScale = Cesium.Math.lerp(0.55, 1.05, Math.random());
                    const spriteUrl = cloudSmokeSpriteDataUrls[getRandomInt(0, cloudSmokeSpriteDataUrls.length - 1)];
                    const baseColor = CLOUD_SMOKE_COLOR_PALETTE[getRandomInt(0, CLOUD_SMOKE_COLOR_PALETTE.length - 1)].clone();

                    const cloudEntity = viewer.entities.add({
                        name: '雷阵雨云团',
                        position: new Cesium.CallbackProperty((time) => {
                            const t = Cesium.JulianDate.secondsDifference(time, viewer.clock.startTime);
                            const driftDistance = weatherConfig.cloudDriftMeters * driftScale;
                            const driftEast = Math.cos(driftPhase + t * driftSpeed) * driftDistance;
                            const driftNorth = Math.sin(driftPhase * 0.85 + t * driftSpeed * 0.7) * driftDistance * 0.6;
                            const drifting = offsetMetersToLonLat(cloudPosBase.lon, cloudPosBase.lat, driftEast, driftNorth);
                            const vertical = Math.sin(t * driftSpeed * 0.9 + driftPhase) * 12;
                            return Cesium.Cartesian3.fromDegrees(drifting.lon, drifting.lat, cloudHeightBase + vertical);
                        }, false),
                        billboard: {
                            image: spriteUrl,
                            width: cloudSize,
                            height: cloudSize * cloudAspectRatio,
                            color: new Cesium.CallbackProperty((time) => {
                                const t = Cesium.JulianDate.secondsDifference(time, viewer.clock.startTime);
                                const pulse = 0.86 + 0.14 * Math.sin(t * 0.24 + driftPhase);
                                const cloudColor = baseColor.clone();
                                cloudColor.alpha = alphaBase * pulse;
                                return cloudColor;
                            }, false),
                            horizontalOrigin: Cesium.HorizontalOrigin.CENTER,
                            verticalOrigin: Cesium.VerticalOrigin.CENTER,
                            alignedAxis: Cesium.Cartesian3.UNIT_Z,
                            sizeInMeters: true,
                            disableDepthTestDistance: Number.POSITIVE_INFINITY,
                            scaleByDistance: new Cesium.NearFarScalar(500, 1.2, 9000, 0.72)
                        }
                    });
                    addEntity(cloudEntity);
                }
            }

            createRainCurtainEffects(lon, lat, height, weatherConfig.coreRadius * 0.7, weatherConfig);
            createLightningEffects(lon, lat, height, weatherConfig.coreRadius * 0.5, weatherConfig);
        }

        function createRainCurtainEffects(centerLon, centerLat, centerHeight, coverageMeters, weatherConfig) {
            for (let i = 0; i < weatherConfig.rainLinesPerCell; i++) {
                const offset = getMetersOffsetFromCenter(coverageMeters);
                const posBase = offsetMetersToLonLat(centerLon, centerLat, offset.x, offset.y);
                const topHeight = centerHeight + Cesium.Math.lerp(60, 130, Math.random());
                const fallPhase = Math.random() * weatherConfig.rainColumnHeight;
                const swayPhase = Math.random() * Math.PI * 2;

                const rainEntity = viewer.entities.add({
                    name: '雷阵雨雨线',
                    polyline: {
                        positions: new Cesium.CallbackProperty((time) => {
                            const t = Cesium.JulianDate.secondsDifference(time, viewer.clock.startTime);
                            const loopHeight = weatherConfig.rainColumnHeight;
                            const fallingOffset = (t * weatherConfig.rainFallSpeed + fallPhase) % loopHeight;
                            const currentTop = topHeight - fallingOffset;
                            const currentBottom = currentTop - weatherConfig.rainTrailLength;
                            const swayEast = Math.sin(t * 1.45 + swayPhase) * 5;
                            const swayNorth = Math.cos(t * 0.95 + swayPhase) * 2.8;

                            const head = offsetMetersToLonLat(posBase.lon, posBase.lat, 8 + swayEast, swayNorth);
                            const tail = offsetMetersToLonLat(head.lon, head.lat, -6, 10);

                            return [
                                Cesium.Cartesian3.fromDegrees(head.lon, head.lat, currentTop),
                                Cesium.Cartesian3.fromDegrees(tail.lon, tail.lat, currentBottom)
                            ];
                        }, false),
                        width: weatherConfig.rainWidth,
                        material: new Cesium.PolylineGlowMaterialProperty({
                            glowPower: 0.06,
                            color: Cesium.Color.fromCssColorString('#cfe9ff').withAlpha(weatherConfig.rainAlpha)
                        }),
                        arcType: Cesium.ArcType.NONE,
                        clampToGround: false
                    }
                });
                addEntity(rainEntity);
            }
        }

        function createLightningEffects(centerLon, centerLat, centerHeight, coverageMeters, weatherConfig) {
            const strikeCount = getRandomInt(1, 2);
            for (let i = 0; i < strikeCount; i++) {
                const offset = getMetersOffsetFromCenter(coverageMeters);
                const pos = offsetMetersToLonLat(centerLon, centerLat, offset.x, offset.y);
                const topHeight = centerHeight + Cesium.Math.lerp(120, 220, Math.random());
                const strikeState = createLightningStrikeState(weatherConfig);

                const lightningPositions = new Cesium.CallbackProperty((time) => buildLightningPolylinePositions(
                    pos.lon,
                    pos.lat,
                    topHeight,
                    weatherConfig.lightningSegments,
                    weatherConfig.lightningHorizontalJitterMeters,
                    weatherConfig.lightningRefreshHz,
                    time,
                    strikeState,
                    weatherConfig
                ), false);

                const glowEntity = viewer.entities.add({
                    name: '雷阵雨闪电光晕',
                    polyline: {
                        positions: lightningPositions,
                        width: weatherConfig.lightningGlowWidth,
                        material: new Cesium.ColorMaterialProperty(new Cesium.CallbackProperty((time) => {
                            const t = Cesium.JulianDate.secondsDifference(time, viewer.clock.startTime);
                            const active = updateLightningStrikeState(strikeState, t, weatherConfig);
                            if (!active) return Cesium.Color.TRANSPARENT;
                            const flash = 0.7 + 0.3 * Math.sin(t * 6.6);
                            return Cesium.Color.fromCssColorString('#dcecff').withAlpha(0.18 * flash);
                        }, false)),
                        arcType: Cesium.ArcType.NONE,
                        clampToGround: false,
                        show: new Cesium.CallbackProperty((time) => {
                            const t = Cesium.JulianDate.secondsDifference(time, viewer.clock.startTime);
                            return updateLightningStrikeState(strikeState, t, weatherConfig);
                        }, false)
                    }
                });
                addEntity(glowEntity);

                const lineEntity = viewer.entities.add({
                    name: '雷阵雨闪电',
                    polyline: {
                        positions: lightningPositions,
                        width: weatherConfig.lightningWidth,
                        material: new Cesium.ColorMaterialProperty(new Cesium.CallbackProperty((time) => {
                            const t = Cesium.JulianDate.secondsDifference(time, viewer.clock.startTime);
                            const active = updateLightningStrikeState(strikeState, t, weatherConfig);
                            if (!active) return Cesium.Color.TRANSPARENT;
                            const flash = 0.72 + 0.28 * Math.sin(t * 8.5);
                            return Cesium.Color.fromCssColorString('#f3f8ff').withAlpha(0.8 * flash);
                        }, false)),
                        arcType: Cesium.ArcType.NONE,
                        clampToGround: false,
                        show: new Cesium.CallbackProperty((time) => {
                            const t = Cesium.JulianDate.secondsDifference(time, viewer.clock.startTime);
                            return updateLightningStrikeState(strikeState, t, weatherConfig);
                        }, false)
                    }
                });
                addEntity(lineEntity);
            }
        }

        return {
            config: baseConfig,
            addEntity,
            clearAllEffects,
            isWeatherEntity,
            resolvePickedAirplaneIndex,
            createOnRing,
            createFromAnchors,
            getPresetNames,
            getActivePreset,
            setPreset
        };
    }

    function buildLightningPolylinePositions(centerLon, centerLat, topHeight, segments, jitterMeters, refreshHz, time, strikeState, weatherConfig) {
        const nowSeconds = Cesium.JulianDate.secondsDifference(time, viewerClockEpoch());
        const isActive = updateLightningStrikeState(strikeState, nowSeconds, weatherConfig);
        if (!isActive) {
            return [
                Cesium.Cartesian3.fromDegrees(centerLon, centerLat, topHeight),
                Cesium.Cartesian3.fromDegrees(centerLon, centerLat, topHeight - weatherConfig.lightningDrop)
            ];
        }

        const seed = Math.floor(nowSeconds * refreshHz) + strikeState.seed;
        const seededRandom = createSeededRandom(seed);
        const positions = [];

        for (let i = 0; i <= segments; i++) {
            const ratio = i / segments;
            const currentHeight = topHeight - weatherConfig.lightningDrop * ratio;
            const taper = 1 - ratio * 0.7;
            const offsetX = (seededRandom() * 2 - 1) * jitterMeters * taper;
            const offsetY = (seededRandom() * 2 - 1) * jitterMeters * taper;
            const lonLat = offsetMetersToLonLat(centerLon, centerLat, offsetX, offsetY);
            positions.push(Cesium.Cartesian3.fromDegrees(lonLat.lon, lonLat.lat, currentHeight));
        }

        return positions;
    }

    function createLightningStrikeState(weatherConfig) {
        return {
            active: false,
            start: 0,
            end: 0,
            next: Cesium.Math.lerp(weatherConfig.lightningMinIntervalSec, weatherConfig.lightningMaxIntervalSec, Math.random()),
            seed: getRandomInt(1, 1_000_000)
        };
    }

    function updateLightningStrikeState(state, nowSeconds, weatherConfig) {
        if (state.active) {
            if (nowSeconds <= state.end) return true;
            state.active = false;
            state.next = nowSeconds + Cesium.Math.lerp(weatherConfig.lightningMinIntervalSec, weatherConfig.lightningMaxIntervalSec, Math.random());
            state.seed = getRandomInt(1, 1_000_000);
            return false;
        }

        if (nowSeconds >= state.next) {
            state.active = true;
            state.start = nowSeconds;
            state.end = nowSeconds + Cesium.Math.lerp(weatherConfig.lightningMinStrikeDurationSec, weatherConfig.lightningMaxStrikeDurationSec, Math.random());
            return true;
        }

        return false;
    }

    function viewerClockEpoch() {
        return Cesium.JulianDate.fromDate(new Date(0));
    }

    function createCloudSmokeSpriteVariants() {
        return [
            createCloudSmokeSpriteDataUrl(11),
            createCloudSmokeSpriteDataUrl(23),
            createCloudSmokeSpriteDataUrl(37),
            createCloudSmokeSpriteDataUrl(51)
        ];
    }

    function createCloudSmokeSpriteDataUrl(seed) {
        const random = createSeededRandom(seed);
        const width = 512;
        const height = 320;
        const canvas = document.createElement('canvas');
        canvas.width = width;
        canvas.height = height;
        const context = canvas.getContext('2d');
        if (!context) return '';

        context.clearRect(0, 0, width, height);

        for (let i = 0; i < getSeededRandomInt(random, 20, 28); i++) {
            const centerX = width * Cesium.Math.lerp(0.12, 0.88, random());
            const centerY = height * Cesium.Math.lerp(0.24, 0.78, random());
            const radiusX = width * Cesium.Math.lerp(0.08, 0.24, random());
            const radiusY = height * Cesium.Math.lerp(0.08, 0.22, random());
            const rotation = Cesium.Math.lerp(-1.2, 1.2, random());
            const shade = Math.round(Cesium.Math.lerp(95, 246, random()));
            const tone = [shade, shade, shade];
            const alpha = Cesium.Math.lerp(0.16, 0.34, random());
            drawSoftSmokeLobe(context, centerX, centerY, radiusX, radiusY, rotation, tone, alpha);
        }

        applyCloudEdgeNoise(context, width, height, seed);
        smoothCloudAlphaEdges(context, width, height, 4);
        featherCloudAlphaEdges(context, width, height, 0.2, 0.98);

        return canvas.toDataURL('image/png');
    }

    function drawSoftSmokeLobe(context, centerX, centerY, radiusX, radiusY, rotation, tone, alpha) {
        const [red, green, blue] = tone;
        context.save();
        context.translate(centerX, centerY);
        context.rotate(rotation);
        context.scale(radiusX, radiusY);

        const gradient = context.createRadialGradient(0, 0, 0.08, 0, 0, 1);
        gradient.addColorStop(0, `rgba(${red}, ${green}, ${blue}, ${alpha})`);
        gradient.addColorStop(0.8, `rgba(${red}, ${green}, ${blue}, ${alpha * 0.36})`);
        gradient.addColorStop(1, `rgba(${red}, ${green}, ${blue}, 0)`);
        context.fillStyle = gradient;
        context.beginPath();
        context.arc(0, 0, 1, 0, Math.PI * 2);
        context.fill();
        context.restore();
    }

    function applyCloudEdgeNoise(context, width, height, seed) {
        const imageData = context.getImageData(0, 0, width, height);
        const data = imageData.data;
        const centerX = width * 0.5;
        const centerY = height * 0.56;
        const radiusX = width * 0.56;
        const radiusY = height * 0.36;

        for (let y = 0; y < height; y++) {
            for (let x = 0; x < width; x++) {
                const index = (y * width + x) * 4;
                const alpha = data[index + 3];
                if (alpha <= 2) continue;

                const nx = (x - centerX) / radiusX;
                const ny = (y - centerY) / radiusY;
                const radiusDistance = Math.sqrt(nx * nx + ny * ny);
                const edgeFactor = Cesium.Math.clamp((radiusDistance - 0.52) / 0.48, 0, 1);

                if (edgeFactor > 0) {
                    const noiseA = sampleHashNoise(x * 0.022, y * 0.027, seed * 0.91);
                    const noiseB = sampleHashNoise(x * 0.044 + 33.1, y * 0.018 + 17.8, seed * 1.73);
                    const noise = (noiseA * 0.55 + noiseB * 0.45) - 0.5;
                    const softness = 1 - edgeFactor * (0.22 + noise * 0.25);
                    data[index + 3] = Math.max(0, Math.min(255, alpha * softness));
                }
            }
        }

        context.putImageData(imageData, 0, 0);
    }

    function featherCloudAlphaEdges(context, width, height, innerRatio, outerRatio) {
        const imageData = context.getImageData(0, 0, width, height);
        const data = imageData.data;
        const centerX = width * 0.5;
        const centerY = height * 0.56;
        const radiusX = width * 0.5;
        const radiusY = height * 0.34;

        for (let y = 0; y < height; y++) {
            for (let x = 0; x < width; x++) {
                const index = (y * width + x) * 4;
                const alpha = data[index + 3];
                if (alpha === 0) continue;

                const nx = (x - centerX) / radiusX;
                const ny = (y - centerY) / radiusY;
                const distance = Math.sqrt(nx * nx + ny * ny);
                if (distance <= innerRatio) continue;

                const falloff = Cesium.Math.clamp((distance - innerRatio) / (outerRatio - innerRatio), 0, 1);
                const smooth = 1 - (falloff * falloff * (3 - 2 * falloff));
                data[index + 3] = Math.max(0, Math.min(255, alpha * smooth));
            }
        }

        context.putImageData(imageData, 0, 0);
    }

    function smoothCloudAlphaEdges(context, width, height, passes) {
        const imageData = context.getImageData(0, 0, width, height);

        for (let pass = 0; pass < passes; pass++) {
            const source = new Uint8ClampedArray(imageData.data);
            const destination = imageData.data;

            for (let y = 1; y < height - 1; y++) {
                for (let x = 1; x < width - 1; x++) {
                    const index = (y * width + x) * 4;
                    const alpha = source[index + 3];
                    if (alpha === 0 || alpha === 255) continue;

                    let sum = 0;
                    let weight = 0;
                    for (let dy = -1; dy <= 1; dy++) {
                        for (let dx = -1; dx <= 1; dx++) {
                            const sampleIndex = ((y + dy) * width + (x + dx)) * 4;
                            const sampleAlpha = source[sampleIndex + 3];
                            const sampleWeight = (dx === 0 && dy === 0) ? 4 : (dx === 0 || dy === 0 ? 2 : 1);
                            sum += sampleAlpha * sampleWeight;
                            weight += sampleWeight;
                        }
                    }

                    destination[index + 3] = Math.round(sum / weight);
                }
            }
        }

        context.putImageData(imageData, 0, 0);
    }

    function sampleHashNoise(x, y, seed) {
        const value = Math.sin(x * 12.9898 + y * 78.233 + seed * 37.719) * 43758.5453123;
        return value - Math.floor(value);
    }

    function createSeededRandom(seed) {
        let state = seed % 2147483647;
        if (state <= 0) state += 2147483646;
        return function random() {
            state = state * 16807 % 2147483647;
            return (state - 1) / 2147483646;
        };
    }

    function getSeededRandomInt(random, min, max) {
        const safeMin = Math.ceil(min);
        const safeMax = Math.floor(max);
        return Math.floor(random() * (safeMax - safeMin + 1)) + safeMin;
    }

    function getMetersOffsetFromCenter(radiusMeters) {
        const angle = Math.random() * Math.PI * 2;
        const distance = radiusMeters * Math.sqrt(Math.random());
        return {
            x: Math.cos(angle) * distance,
            y: Math.sin(angle) * distance
        };
    }

    function offsetMetersToLonLat(lon, lat, offsetEastMeters, offsetNorthMeters) {
        const latitudeRadians = Cesium.Math.toRadians(lat);
        const meterPerDegreeLat = 111320;
        const meterPerDegreeLon = meterPerDegreeLat * Math.cos(latitudeRadians);
        return {
            lon: lon + (offsetEastMeters / meterPerDegreeLon),
            lat: lat + (offsetNorthMeters / meterPerDegreeLat)
        };
    }

    function getRandomInt(min, max) {
        const safeMin = Math.ceil(min);
        const safeMax = Math.floor(max);
        return Math.floor(Math.random() * (safeMax - safeMin + 1)) + safeMin;
    }

    global.createWeatherEffectComponent = createWeatherEffectComponent;
    global.WEATHER_PRESETS = WEATHER_PRESETS;
})(window);
