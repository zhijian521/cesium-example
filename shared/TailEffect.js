/*== 尾部预警特效 — 涟漪扩散 + 警告图标 + 异常检测 ==*/

const TailEffect = (function () {
    // === 涟漪特效配置 ===
    const TAIL_RIPPLE_CONFIG = {
        warningColorStart: Cesium.Color.fromCssColorString('#ffd60a'),
        warningColorEnd: Cesium.Color.fromCssColorString('#ff3b30'),
        layerCount: 4,
        cycleSeconds: 1.2,
        baseRadiusRatio: 0.1625,
        growRadiusRatio: 3.2,
        centerOffsetRatio: 0,
        minAlpha: 0.05,
        maxAlpha: 0.56,
        warningIconMinSizePx: 18,
        warningIconMaxSizePx: 52,
        warningIconScaleByRipplePixelRadius: 0.8,
        breathingAmplitude: 0.12,
        breathingFrequency: 3.2
    };

    // === 异常检测配置 ===
    const AIRPLANE_ALERT_CONFIG = {
        abnormalProbability: 0.45,
        minDurationSeconds: 1.2,
        maxDurationSeconds: 3.2
    };

    // === 内部状态 ===
    const airplaneAlertStateMap = new WeakMap();
    const tailEffectEntitySet = new Set();
    const tailEffectToAirplaneMap = new WeakMap();

    // === 创建预警图标（Canvas 绘制三角警告标志） ===
    const WARNING_ICON_DATA_URL = createWarningIconDataUrl();

    function createWarningIconDataUrl() {
        const size = 96;
        const canvas = document.createElement('canvas');
        canvas.width = size;
        canvas.height = size;
        const ctx = canvas.getContext('2d');
        if (!ctx) return '';

        ctx.clearRect(0, 0, size, size);
        ctx.beginPath();
        ctx.moveTo(size * 0.5, size * 0.12);
        ctx.lineTo(size * 0.12, size * 0.82);
        ctx.lineTo(size * 0.88, size * 0.82);
        ctx.closePath();
        ctx.fillStyle = '#ff3b30';
        ctx.fill();

        ctx.strokeStyle = '#ffd60a';
        ctx.lineWidth = size * 0.05;
        ctx.stroke();

        ctx.fillStyle = '#ffffff';
        ctx.fillRect(size * 0.475, size * 0.34, size * 0.05, size * 0.26);
        ctx.beginPath();
        ctx.arc(size * 0.5, size * 0.68, size * 0.03, 0, Math.PI * 2);
        ctx.fill();

        return canvas.toDataURL('image/png');
    }

    // === 获取飞机视觉指标（用于像素级特效尺寸计算） ===
    function getAirplaneVisualMetrics(viewer, airplane, time, referencePosition) {
        const camDist = Cesium.Cartesian3.distance(viewer.camera.positionWC, referencePosition);
        const fovy = viewer.camera.frustum ? viewer.camera.frustum.fovy : Cesium.Math.toRadians(60);
        const canvasHeight = Math.max(viewer.canvas.clientHeight || viewer.canvas.height || 1, 1);
        const metersPerPixel = (2 * camDist * Math.tan(fovy * 0.5)) / canvasHeight;

        const modelScale = airplane && airplane.model && airplane.model.scale
            ? (airplane.model.scale.getValue ? airplane.model.scale.getValue(time) : airplane.model.scale)
            : 5;
        const minimumPixelSize = airplane && airplane.model && airplane.model.minimumPixelSize
            ? (airplane.model.minimumPixelSize.getValue ? airplane.model.minimumPixelSize.getValue(time) : airplane.model.minimumPixelSize)
            : 80;

        const numericScale = Number(modelScale) || 5;
        const numericMinPx = Number(minimumPixelSize) || 80;
        const modelRadiusByScale = 10 * numericScale;
        const modelRadiusByPixel = numericMinPx * metersPerPixel * 0.42;
        const visualRadius = Math.max(modelRadiusByScale, modelRadiusByPixel);

        return { visualRadius: visualRadius, metersPerPixel: metersPerPixel };
    }

    // === 预警图标像素尺寸 ===
    function getWarningIconSizePx(viewer, airplane, time, ripplePosition, rippleState) {
        if (!ripplePosition || !rippleState || rippleState.radius <= 0) {
            return TAIL_RIPPLE_CONFIG.warningIconMinSizePx;
        }
        const metrics = getAirplaneVisualMetrics(viewer, airplane, time, ripplePosition);
        const sourceRadiusMeters = rippleState.innerRadius > 0 ? rippleState.innerRadius : rippleState.radius;
        const rippleRadiusPx = sourceRadiusMeters / Math.max(metrics.metersPerPixel, 0.0001);
        const targetSize = rippleRadiusPx * TAIL_RIPPLE_CONFIG.warningIconScaleByRipplePixelRadius;
        return Cesium.Math.clamp(targetSize, TAIL_RIPPLE_CONFIG.warningIconMinSizePx, TAIL_RIPPLE_CONFIG.warningIconMaxSizePx);
    }

    // === 涟漪位置（飞机尾部） ===
    function getRipplePosition(viewer, airplane, time) {
        return airplane.position.getValue(time);
    }

    // === 涟漪视觉状态 ===
    function getRippleVisualState(viewer, airplane, time, layerProgressOffset, ripplePosition) {
        if (!isAbnormal(airplane, time)) {
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
        const breathingScale = 1 + TAIL_RIPPLE_CONFIG.breathingAmplitude
            * Math.sin(elapsedSeconds * TAIL_RIPPLE_CONFIG.breathingFrequency);

        const basePosition = ripplePosition || airplane.position.getValue(time);
        if (!basePosition) {
            return {
                radius: 1,
                innerRadius: 1,
                alpha: TAIL_RIPPLE_CONFIG.minAlpha,
                color: TAIL_RIPPLE_CONFIG.warningColorStart
            };
        }

        const metrics = getAirplaneVisualMetrics(viewer, airplane, time, basePosition);
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

        return { radius: radius, innerRadius: innerRadius, alpha: alpha, color: color };
    }

    // === 异常状态检测 ===
    function isAbnormal(airplane, time) {
        const nowSeconds = Cesium.JulianDate.secondsDifference(time, viewerForAbnormal.clock.startTime);
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

    // 内部持有的 viewer 引用（供 isAbnormal 使用）
    let viewerForAbnormal = null;

    /**
     * 为飞机附加尾部预警特效
     * @param {Cesium.Viewer} viewer   - Viewer 实例
     * @param {Cesium.Entity} airplane - 飞机实体
     * @param {Object} options         - 配置选项
     * @returns {Cesium.Entity[]} 创建的特效实体数组
     */
    function attach(viewer, airplane, options) {
        viewerForAbnormal = viewer;
        const entities = [];

        // === 4 层涟漪椭圆 ===
        for (let layer = 0; layer < TAIL_RIPPLE_CONFIG.layerCount; layer++) {
            const layerOffset = layer / TAIL_RIPPLE_CONFIG.layerCount;

            const rippleEntity = viewer.entities.add({
                name: '尾部涟漪-' + (layer + 1),
                position: new Cesium.CallbackProperty(function (time) {
                    return getRipplePosition(viewer, airplane, time);
                }, false),
                ellipsoid: {
                    radii: new Cesium.CallbackProperty(function (time) {
                        const rp = getRipplePosition(viewer, airplane, time);
                        const state = getRippleVisualState(viewer, airplane, time, layerOffset, rp);
                        return new Cesium.Cartesian3(state.radius, state.radius, state.radius);
                    }, false),
                    material: new Cesium.ColorMaterialProperty(new Cesium.CallbackProperty(function (time) {
                        const rp = getRipplePosition(viewer, airplane, time);
                        const state = getRippleVisualState(viewer, airplane, time, layerOffset, rp);
                        return state.color.withAlpha(state.alpha);
                    }, false)),
                    outline: false
                }
            });

            entities.push(rippleEntity);
            tailEffectEntitySet.add(rippleEntity);
            tailEffectToAirplaneMap.set(rippleEntity, airplane);
        }

        // === 预警图标 ===
        const warningIcon = viewer.entities.add({
            name: '预警图标',
            position: new Cesium.CallbackProperty(function (time) {
                return getRipplePosition(viewer, airplane, time);
            }, false),
            billboard: {
                image: WARNING_ICON_DATA_URL,
                verticalOrigin: Cesium.VerticalOrigin.CENTER,
                disableDepthTestDistance: Number.POSITIVE_INFINITY,
                scaleByDistance: new Cesium.NearFarScalar(500, 1.25, 9000, 0.65),
                show: new Cesium.CallbackProperty(function (time) {
                    return isAbnormal(airplane, time);
                }, false),
                width: new Cesium.CallbackProperty(function (time) {
                    const rp = getRipplePosition(viewer, airplane, time);
                    const state = getRippleVisualState(viewer, airplane, time, 0, rp);
                    return getWarningIconSizePx(viewer, airplane, time, rp, state);
                }, false),
                height: new Cesium.CallbackProperty(function (time) {
                    const rp = getRipplePosition(viewer, airplane, time);
                    const state = getRippleVisualState(viewer, airplane, time, 0, rp);
                    return getWarningIconSizePx(viewer, airplane, time, rp, state);
                }, false)
            }
        });

        entities.push(warningIcon);
        tailEffectEntitySet.add(warningIcon);
        tailEffectToAirplaneMap.set(warningIcon, airplane);

        return entities;
    }

    /**
     * 检查实体是否属于尾部特效
     */
    function isTailEntity(entity) {
        return tailEffectEntitySet.has(entity);
    }

    /**
     * 获取特效实体关联的飞机
     */
    function getAirplaneFromEffect(entity) {
        return tailEffectToAirplaneMap.get(entity);
    }

    // === 公开 API ===
    return {
        attach: attach,
        isAbnormal: isAbnormal,
        isTailEntity: isTailEntity,
        getAirplaneFromEffect: getAirplaneFromEffect
    };
})();
