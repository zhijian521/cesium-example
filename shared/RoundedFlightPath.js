/*== 矩形圆角航线 — 圆角四边形路线 + 转弯倾斜姿态 + 距离比例采样 ==*/

const RoundedFlightPath = (function () {
    // === 圆角矩形配置 ===
    const ROUTE_CONFIG = {
        halfWidthLon: 0.02,
        halfHeightLat: 0.014,
        cornerRadiusLon: 0.0055,
        cornerRadiusLat: 0.0042,
        pointsPerStraight: 32,
        pointsPerCorner: 72
    };

    // === 转弯倾斜配置 ===
    const BANKING_CONFIG = {
        sampleWindowSeconds: 1.2,
        fullTurnDeltaDegrees: 20,
        minTurnDeltaDegrees: 2,
        maxRollDegrees: 5
    };

    // === 复用对象（避免每帧 GC） ===
    const scratchBaseOrientation = new Cesium.Quaternion();
    const scratchBankQuaternion = new Cesium.Quaternion();
    const scratchFlightAxis = new Cesium.Cartesian3();
    const scratchWorldBankedOrientation = new Cesium.Quaternion();

    // === 默认配置 ===
    const DEFAULTS = {
        center: { lon: 121.4803, lat: 31.2397, height: 600 },
        name: '东方明珠圆角四边形环线',
        duration: 60,
        clockMultiplier: 0.3,
        modelUri: '../../assets/models/beta-alia/beta_alia_vtol_aircraft.glb',
        modelScale: 5,
        modelMinPixelSize: 80,
        modelMaxScale: 100,
        pathColor: '#90EE90',
        pathAlpha: 0.8,
        pathWidth: 3,
        pathGlowPower: 0.2
    };

    // === 辅助：插入直线段 ===
    function appendStraightSegment(points, start, end, segmentCount) {
        for (let i = 0; i < segmentCount; i++) {
            const t = i / segmentCount;
            points.push({
                lon: Cesium.Math.lerp(start.lon, end.lon, t),
                lat: Cesium.Math.lerp(start.lat, end.lat, t)
            });
        }
    }

    // === 辅助：插入圆角弧段 ===
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

    // === 生成圆角矩形路线点 ===
    function createRoundedRectangleRoute(center, height) {
        const cfg = ROUTE_CONFIG;
        const left = center.lon - cfg.halfWidthLon;
        const right = center.lon + cfg.halfWidthLon;
        const top = center.lat + cfg.halfHeightLat;
        const bottom = center.lat - cfg.halfHeightLat;
        const points = [];

        // 上边（左→右）
        appendStraightSegment(points,
            { lon: left + cfg.cornerRadiusLon, lat: top },
            { lon: right - cfg.cornerRadiusLon, lat: top },
            cfg.pointsPerStraight
        );
        // 右上角（π/2 → 0）
        appendRoundedCorner(points,
            { lon: right - cfg.cornerRadiusLon, lat: top - cfg.cornerRadiusLat },
            cfg.cornerRadiusLon, cfg.cornerRadiusLat,
            Math.PI / 2, 0, cfg.pointsPerCorner
        );
        // 右边（上→下）
        appendStraightSegment(points,
            { lon: right, lat: top - cfg.cornerRadiusLat },
            { lon: right, lat: bottom + cfg.cornerRadiusLat },
            cfg.pointsPerStraight
        );
        // 右下角（0 → -π/2）
        appendRoundedCorner(points,
            { lon: right - cfg.cornerRadiusLon, lat: bottom + cfg.cornerRadiusLat },
            cfg.cornerRadiusLon, cfg.cornerRadiusLat,
            0, -Math.PI / 2, cfg.pointsPerCorner
        );
        // 下边（右→左）
        appendStraightSegment(points,
            { lon: right - cfg.cornerRadiusLon, lat: bottom },
            { lon: left + cfg.cornerRadiusLon, lat: bottom },
            cfg.pointsPerStraight
        );
        // 左下角（-π/2 → -π）
        appendRoundedCorner(points,
            { lon: left + cfg.cornerRadiusLon, lat: bottom + cfg.cornerRadiusLat },
            cfg.cornerRadiusLon, cfg.cornerRadiusLat,
            -Math.PI / 2, -Math.PI, cfg.pointsPerCorner
        );
        // 左边（下→上）
        appendStraightSegment(points,
            { lon: left, lat: bottom + cfg.cornerRadiusLat },
            { lon: left, lat: top - cfg.cornerRadiusLat },
            cfg.pointsPerStraight
        );
        // 左上角（π → π/2）
        appendRoundedCorner(points,
            { lon: left + cfg.cornerRadiusLon, lat: top - cfg.cornerRadiusLat },
            cfg.cornerRadiusLon, cfg.cornerRadiusLat,
            Math.PI, Math.PI / 2, cfg.pointsPerCorner
        );

        // 闭合回路
        const first = points[0];
        points.push({ lon: first.lon, lat: first.lat });

        return points.map(function (p) {
            return { lon: p.lon, lat: p.lat, height: height };
        });
    }

    // === 距离比例采样（转弯处自然减速） ===
    function createSampledPositionProperty(routePoints, startTime, durationSeconds) {
        var positionProperty = new Cesium.SampledPositionProperty();
        var cartesianPoints = routePoints.map(function (p) {
            return Cesium.Cartesian3.fromDegrees(p.lon, p.lat, p.height);
        });
        var cumulativeDistances = [0];

        for (var i = 1; i < cartesianPoints.length; i++) {
            var segDist = Cesium.Cartesian3.distance(cartesianPoints[i - 1], cartesianPoints[i]);
            cumulativeDistances.push(cumulativeDistances[i - 1] + segDist);
        }

        var totalDistance = cumulativeDistances[cumulativeDistances.length - 1] || 1;

        positionProperty.setInterpolationOptions({
            interpolationDegree: 2,
            interpolationAlgorithm: Cesium.HermitePolynomialApproximation
        });

        cartesianPoints.forEach(function (cartesianPoint, index) {
            var time = Cesium.JulianDate.addSeconds(
                startTime,
                (cumulativeDistances[index] / totalDistance) * durationSeconds,
                new Cesium.JulianDate()
            );
            positionProperty.addSample(time, cartesianPoint);
        });

        return positionProperty;
    }

    // === 两点间航向 ===
    function getHeadingBetweenPositions(fromPos, toPos) {
        if (!fromPos || !toPos) return 0;

        var fromCarto = Cesium.Cartographic.fromCartesian(fromPos);
        var toCarto = Cesium.Cartographic.fromCartesian(toPos);
        var dLon = toCarto.longitude - fromCarto.longitude;
        var dLat = toCarto.latitude - fromCarto.latitude;

        if (Math.abs(dLon) < Cesium.Math.EPSILON10 && Math.abs(dLat) < Cesium.Math.EPSILON10) {
            return 0;
        }
        return Math.atan2(dLon, dLat);
    }

    // === 计算转弯倾斜姿态（heading + roll） ===
    function getBankedAttitude(positionProperty, time) {
        var currentPos = positionProperty.getValue(time);
        if (!currentPos) return null;

        var prevTime = Cesium.JulianDate.addSeconds(time, -BANKING_CONFIG.sampleWindowSeconds, new Cesium.JulianDate());
        var nextTime = Cesium.JulianDate.addSeconds(time, BANKING_CONFIG.sampleWindowSeconds, new Cesium.JulianDate());
        var prevPos = positionProperty.getValue(prevTime);
        var nextPos = positionProperty.getValue(nextTime);

        var headingBefore = prevPos ? getHeadingBetweenPositions(prevPos, currentPos) : null;
        var headingAfter = nextPos ? getHeadingBetweenPositions(currentPos, nextPos) : null;
        var heading = headingAfter != null ? headingAfter : (headingBefore != null ? headingBefore : 0);

        var signedTurnDeltaRad = (headingBefore == null || headingAfter == null)
            ? 0
            : Cesium.Math.negativePiToPi(headingAfter - headingBefore);

        var absTurnDeg = Math.abs(Cesium.Math.toDegrees(signedTurnDeltaRad));
        var turnRatio = absTurnDeg <= BANKING_CONFIG.minTurnDeltaDegrees
            ? 0
            : Cesium.Math.clamp(absTurnDeg / BANKING_CONFIG.fullTurnDeltaDegrees, 0, 1);
        var easedRatio = turnRatio * turnRatio * (3 - 2 * turnRatio); // smoothstep
        var bankDir = Math.sign(signedTurnDeltaRad);

        return {
            heading: heading,
            roll: bankDir * easedRatio * Cesium.Math.toRadians(BANKING_CONFIG.maxRollDegrees)
        };
    }

    // === 创建带倾斜的姿态属性 ===
    function createBankedOrientationProperty(positionProperty) {
        var baseOrientation = new Cesium.VelocityOrientationProperty(positionProperty);

        return new Cesium.CallbackProperty(function (time) {
            var base = baseOrientation.getValue(time, scratchBaseOrientation);
            var attitude = getBankedAttitude(positionProperty, time);
            if (!base || !attitude) return undefined;

            // 无需倾斜时直接返回基础姿态
            if (Math.abs(attitude.roll) < Cesium.Math.EPSILON6) {
                return Cesium.Quaternion.clone(base, new Cesium.Quaternion());
            }

            // 采样飞行方向轴
            var prevTime = Cesium.JulianDate.addSeconds(time, -BANKING_CONFIG.sampleWindowSeconds, new Cesium.JulianDate());
            var nextTime = Cesium.JulianDate.addSeconds(time, BANKING_CONFIG.sampleWindowSeconds, new Cesium.JulianDate());
            var prevPos = positionProperty.getValue(prevTime);
            var nextPos = positionProperty.getValue(nextTime);
            if (!prevPos || !nextPos) {
                return Cesium.Quaternion.clone(base, new Cesium.Quaternion());
            }

            var flightAxis = Cesium.Cartesian3.subtract(nextPos, prevPos, scratchFlightAxis);
            if (Cesium.Cartesian3.magnitudeSquared(flightAxis) < Cesium.Math.EPSILON10) {
                return Cesium.Quaternion.clone(base, new Cesium.Quaternion());
            }

            // 绕飞行轴旋转 roll 角度
            Cesium.Cartesian3.normalize(flightAxis, flightAxis);
            var bankQ = Cesium.Quaternion.fromAxisAngle(flightAxis, attitude.roll, scratchBankQuaternion);
            return Cesium.Quaternion.multiply(bankQ, base, scratchWorldBankedOrientation);
        }, false);
    }

    // === 获取转弯姿态（供 FlightTracker ENU 相机使用） ===
    function getAttitude(positionProperty, time) {
        return getBankedAttitude(positionProperty, time);
    }

    /**
     * 创建圆角矩形航线 + 带倾斜姿态的飞机
     */
    function create(viewer, options) {
        var opts = Object.assign({}, DEFAULTS, options || {});
        var center = opts.center;

        // 设置时钟
        var startTime = Cesium.JulianDate.now();
        var stopTime = Cesium.JulianDate.addSeconds(startTime, opts.duration, new Cesium.JulianDate());

        viewer.clock.startTime = startTime.clone();
        viewer.clock.stopTime = stopTime.clone();
        viewer.clock.currentTime = startTime.clone();
        viewer.clock.clockRange = Cesium.ClockRange.LOOP_STOP;
        viewer.clock.multiplier = opts.clockMultiplier;
        viewer.clock.shouldAnimate = true;

        // 生成路线 + 采样
        var routePoints = createRoundedRectangleRoute(center, center.height);
        var positionProperty = createSampledPositionProperty(routePoints, startTime, opts.duration);

        // 航线实体
        var pathPositions = routePoints.map(function (p) {
            return Cesium.Cartesian3.fromDegrees(p.lon, p.lat, p.height);
        });

        var pathEntity = viewer.entities.add({
            name: opts.name + ' - 航线',
            polyline: {
                positions: pathPositions,
                width: opts.pathWidth,
                material: new Cesium.PolylineGlowMaterialProperty({
                    glowPower: opts.pathGlowPower,
                    color: Cesium.Color.fromCssColorString(opts.pathColor).withAlpha(opts.pathAlpha)
                }),
                clampToGround: false
            }
        });

        // 飞机实体（带转弯倾斜）
        var airplaneEntity = viewer.entities.add({
            name: opts.name + ' - 飞机',
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
            orientation: createBankedOrientationProperty(positionProperty)
        });

        return {
            airplaneEntity: airplaneEntity,
            pathEntity: pathEntity,
            positionProperty: positionProperty
        };
    }

    // === 公开 API ===
    return {
        create: create,
        getAttitude: getAttitude
    };
})();
