/*== 圆形航线模块 — 创建圆形闭合航线 + 飞机实体 ==*/

const CircularFlightPath = (function () {
    // === 默认配置 ===
    const DEFAULTS = {
        center: { lon: 121.4998, lat: 31.2397, height: 600 },
        radiusLon: 0.015,
        radiusLat: 0.01275,   // 0.015 * 0.85
        numPoints: 100,
        duration: 60,
        clockMultiplier: 0.3,
        modelUri: '../../assets/models/aircraft/aircraft_Animi.gltf',
        modelScale: 5,
        modelMinPixelSize: 80,
        modelMaxScale: 100,
        pathColor: '#90EE90',
        pathAlpha: 0.8,
        pathWidth: 3,
        pathGlowPower: 0.2,
        pathClampToGround: false,
        interpolationDegree: 5
    };

    /**
     * 创建圆形航线 + 飞机
     * @param {Cesium.Viewer} viewer - Cesium Viewer 实例
     * @param {Object} options  - 配置选项
     * @returns {{ airplaneEntity: Cesium.Entity, pathEntity: Cesium.Entity }}
     */
    function create(viewer, options) {
        const opts = Object.assign({}, DEFAULTS, options || {});

        // 设置时钟
        const startTime = Cesium.JulianDate.now();
        const duration = opts.duration;
        const stopTime = Cesium.JulianDate.addSeconds(startTime, duration, new Cesium.JulianDate());

        viewer.clock.startTime = startTime.clone();
        viewer.clock.stopTime = stopTime.clone();
        viewer.clock.currentTime = startTime.clone();
        viewer.clock.clockRange = Cesium.ClockRange.LOOP_STOP;
        viewer.clock.multiplier = opts.clockMultiplier;
        viewer.clock.shouldAnimate = true;

        // === 构建位置采样 ===
        const positionProperty = new Cesium.SampledPositionProperty();
        positionProperty.setInterpolationOptions({
            interpolationDegree: opts.interpolationDegree,
            interpolationAlgorithm: Cesium.LagrangePolynomialApproximation
        });

        const pathPositions = [];
        const numPoints = opts.numPoints;
        const center = opts.center;

        for (let i = 0; i <= numPoints; i++) {
            const angle = (i / numPoints) * Math.PI * 2;
            const lon = center.lon + opts.radiusLon * Math.cos(angle);
            const lat = center.lat + opts.radiusLat * Math.sin(angle);

            const time = Cesium.JulianDate.addSeconds(startTime, (i / numPoints) * duration, new Cesium.JulianDate());
            const position = Cesium.Cartesian3.fromDegrees(lon, lat, center.height);

            positionProperty.addSample(time, position);
            pathPositions.push(Cesium.Cartesian3.fromDegrees(lon, lat, center.height));
        }

        // === 创建航线实体 ===
        const pathEntity = viewer.entities.add({
            name: (opts.name || '圆形环线') + ' - 航线',
            polyline: {
                positions: pathPositions,
                width: opts.pathWidth,
                material: new Cesium.PolylineGlowMaterialProperty({
                    glowPower: opts.pathGlowPower,
                    color: Cesium.Color.fromCssColorString(opts.pathColor).withAlpha(opts.pathAlpha)
                }),
                clampToGround: opts.pathClampToGround
            }
        });

        // === 创建飞机实体 ===
        const airplaneEntity = viewer.entities.add({
            name: (opts.name || '圆形环线') + ' - 飞机',
            position: positionProperty,
            availability: new Cesium.TimeIntervalCollection([new Cesium.TimeInterval({
                start: startTime,
                stop: stopTime
            })]),
            model: {
                uri: opts.modelUri,
                scale: opts.modelScale,
                minimumPixelSize: opts.modelMinPixelSize,
                maximumScale: opts.modelMaxScale
            },
            orientation: new Cesium.VelocityOrientationProperty(positionProperty)
        });

        return {
            airplaneEntity: airplaneEntity,
            pathEntity: pathEntity
        };
    }

    return { create: create };
})();
