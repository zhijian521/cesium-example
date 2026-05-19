/*== 飞行追踪器 — 飞行信息面板 + 速度归一化 + 相机跟随 + 滚轮缩放 ==*/

const FlightTracker = (function () {
    // === 内部状态 ===
    let viewer = null;
    let airplaneEntity = null;
    let airplaneName = '';
    let isCameraLocked = false;
    let infoPanelVisible = false;
    let cameraDistance = 500;
    let cameraHeightOffset = 200;
    const speedBaselineMap = new WeakMap();

    // === DOM 引用 ===
    let flightInfo = null;
    let cameraHint = null;
    let elName = null;
    let elSpeed = null;
    let elAltitude = null;
    let elHeading = null;
    let elStatus = null;

    // === 配置 ===
    const DEFAULTS = {
        flightInfoId: 'flightInfo',
        cameraHintId: 'cameraHint',
        airplaneNameId: 'airplaneName',
        speedId: 'speed',
        altitudeId: 'altitude',
        headingId: 'heading',
        systemStatusId: 'systemStatus',
        targetSpeedKmh: 280,
        speedDisplayRangeKmh: 20,
        cameraDistanceMin: 100,
        cameraDistanceMax: 2000,
        cameraDefaultDistance: 500,
        cameraHeightRatio: 0.4,
        panelOffsetYMin: 20,
        panelOffsetYMax: 200,
        panelDistanceMin: 300,
        panelDistanceMax: 8000,
        zoomSpeed: 30
    };
    let config = DEFAULTS;

    // === 初始化 ===
    function init(_viewer, options) {
        viewer = _viewer;
        config = Object.assign({}, DEFAULTS, options || {});

        flightInfo = document.getElementById(config.flightInfoId);
        cameraHint = document.getElementById(config.cameraHintId);
        elName = document.getElementById(config.airplaneNameId);
        elSpeed = document.getElementById(config.speedId);
        elAltitude = document.getElementById(config.altitudeId);
        elHeading = document.getElementById(config.headingId);
        elStatus = document.getElementById(config.systemStatusId);

        cameraDistance = config.cameraDefaultDistance;
        cameraHeightOffset = cameraDistance * config.cameraHeightRatio;
    }

    // === 设置当前追踪的飞机 ===
    function setAirplane(entity, name) {
        airplaneEntity = entity;
        airplaneName = name || (entity && entity.name) || '';
    }

    // === 每帧更新 ===
    function update(currentTime, extras) {
        if (!airplaneEntity) return;

        const position = airplaneEntity.position.getValue(currentTime);
        if (!position) return;

        // 更新信息面板位置
        if (infoPanelVisible) {
            updatePanelPosition(position);
        }

        // 更新飞行数据
        updateFlightData(position, currentTime, extras);

        // 相机跟随
        if (isCameraLocked) {
            updateCameraFollow(position, currentTime);
        }
    }

    // === 信息面板位置更新（WGS84 → 屏幕投影） ===
    function updatePanelPosition(position) {
        const canvas = viewer.scene.canvas;
        const screenPos = Cesium.SceneTransforms.wgs84ToWindowCoordinates(viewer.scene, position);

        if (!screenPos ||
            screenPos.x <= 0 || screenPos.x >= canvas.width ||
            screenPos.y <= 0 || screenPos.y >= canvas.height) {
            flightInfo.classList.remove('show');
            return;
        }

        const distance = Cesium.Cartesian3.distance(viewer.camera.positionWC, position);
        const zoomFactor = (distance - config.panelDistanceMin) / (config.panelDistanceMax - config.panelDistanceMin);
        const clampedFactor = Cesium.Math.clamp(zoomFactor, 0, 1);
        const easedFactor = 1 - Math.pow(1 - clampedFactor, 5);
        const panelOffsetY = Cesium.Math.lerp(config.panelOffsetYMax, config.panelOffsetYMin, easedFactor);
        const panelTop = Math.max(12, screenPos.y - panelOffsetY);

        flightInfo.style.left = screenPos.x + 'px';
        flightInfo.style.top = panelTop + 'px';
        flightInfo.classList.add('show');
    }

    // === 更新飞行数据显示 ===
    function updateFlightData(position, currentTime, extras) {
        const cartographic = Cesium.Cartographic.fromCartesian(position);
        const rawSpeedKmh = calculateSpeedKmh(airplaneEntity, currentTime, position);
        const speedKmh = normalizeDisplaySpeedKmh(airplaneEntity, rawSpeedKmh);

        // 航向计算
        const nextTime = Cesium.JulianDate.addSeconds(currentTime, 0.1, new Cesium.JulianDate());
        const nextPosition = airplaneEntity.position.getValue(nextTime);
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

        // 更新 DOM
        if (elName) elName.innerText = airplaneName || '未知';
        if (elSpeed) elSpeed.innerText = speedKmh + ' km/h';
        if (elAltitude) elAltitude.innerText = Math.round(cartographic.height) + ' m';
        if (elHeading) elHeading.innerText = Math.round(heading) + '°';

        // 额外状态（如系统告警）
        if (elStatus && extras && extras.systemStatus !== undefined) {
            elStatus.innerText = extras.systemStatus;
        }
    }

    // === 速度计算 ===
    function calculateSpeedKmh(entity, currentTime, currentPosition) {
        const sampleOffsetSeconds = 0.5;
        const previousTime = Cesium.JulianDate.addSeconds(currentTime, -sampleOffsetSeconds, new Cesium.JulianDate());
        const nextTime = Cesium.JulianDate.addSeconds(currentTime, sampleOffsetSeconds, new Cesium.JulianDate());

        const previousPosition = entity.position.getValue(previousTime);
        const nextPosition = entity.position.getValue(nextTime);

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
        return config.targetSpeedKmh;
    }

    // === 速度归一化 ===
    function normalizeDisplaySpeedKmh(entity, rawSpeedKmh) {
        if (!Number.isFinite(rawSpeedKmh) || rawSpeedKmh <= 0) {
            return config.targetSpeedKmh;
        }

        let baselineSpeed = speedBaselineMap.get(entity);
        if (!baselineSpeed) {
            baselineSpeed = rawSpeedKmh;
            speedBaselineMap.set(entity, baselineSpeed);
        }

        const normalizedSpeed = (rawSpeedKmh / baselineSpeed) * config.targetSpeedKmh;
        const minSpeed = config.targetSpeedKmh - config.speedDisplayRangeKmh;
        const maxSpeed = config.targetSpeedKmh + config.speedDisplayRangeKmh;
        return Math.round(Cesium.Math.clamp(normalizedSpeed, minSpeed, maxSpeed));
    }

    // === 相机跟随 ===
    function updateCameraFollow(position, currentTime) {
        const cartographic = Cesium.Cartographic.fromCartesian(position);

        // 计算航向
        const nextTime = Cesium.JulianDate.addSeconds(currentTime, 0.1, new Cesium.JulianDate());
        const nextPosition = airplaneEntity.position.getValue(nextTime);

        let heading = 0;
        if (nextPosition) {
            const currentCarto = Cesium.Cartographic.fromCartesian(position);
            const nextCarto = Cesium.Cartographic.fromCartesian(nextPosition);
            heading = Math.atan2(
                nextCarto.longitude - currentCarto.longitude,
                nextCarto.latitude - currentCarto.latitude
            );
        }

        // 相机位置：飞机后上方
        const sideAngle = Cesium.Math.toRadians(-10);
        const backHeading = heading - sideAngle;
        const backLon = Cesium.Math.toDegrees(cartographic.longitude) - Math.sin(backHeading) * (cameraDistance / 111000);
        const backLat = Cesium.Math.toDegrees(cartographic.latitude) - Math.cos(backHeading) * (cameraDistance / 111000);
        const camHeight = cartographic.height + cameraHeightOffset;

        const cameraPosition = Cesium.Cartesian3.fromDegrees(backLon, backLat, camHeight);

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
            orientation: { direction: direction, up: up }
        });
    }

    // === 滚轮缩放 ===
    function handleCameraZoom(e) {
        if (!isCameraLocked) return;
        e.preventDefault();

        const delta = e.deltaY > 0 ? config.zoomSpeed : -config.zoomSpeed;
        cameraDistance = Math.max(config.cameraDistanceMin, Math.min(config.cameraDistanceMax, cameraDistance + delta));
        cameraHeightOffset = cameraDistance * config.cameraHeightRatio;
    }

    // === 锁定相机 ===
    function lockCamera() {
        isCameraLocked = true;
        viewer.scene.screenSpaceCameraController.enableInputs = false;
        if (cameraHint) cameraHint.classList.add('show');
        viewer.scene.canvas.addEventListener('wheel', handleCameraZoom, { passive: false });
    }

    // === 解锁相机 ===
    function unlockCamera() {
        isCameraLocked = false;
        viewer.scene.screenSpaceCameraController.enableInputs = true;
        if (cameraHint) cameraHint.classList.remove('show');
        viewer.scene.canvas.removeEventListener('wheel', handleCameraZoom);
    }

    // === 切换相机锁定 ===
    function toggleCameraLock() {
        if (isCameraLocked) {
            unlockCamera();
        } else {
            lockCamera();
        }
    }

    // === 面板控制 ===
    function togglePanel() {
        infoPanelVisible = !infoPanelVisible;
        if (!infoPanelVisible && flightInfo) {
            flightInfo.classList.remove('show');
        }
    }

    function showPanel() {
        infoPanelVisible = true;
    }

    function hidePanel() {
        infoPanelVisible = false;
        if (flightInfo) flightInfo.classList.remove('show');
    }

    // === 状态查询 ===
    function isLocked() {
        return isCameraLocked;
    }

    function isPanelShown() {
        return infoPanelVisible;
    }

    function getAirplane() {
        return airplaneEntity;
    }

    // === 公开 API ===
    return {
        init: init,
        setAirplane: setAirplane,
        update: update,
        lockCamera: lockCamera,
        unlockCamera: unlockCamera,
        toggleCameraLock: toggleCameraLock,
        togglePanel: togglePanel,
        showPanel: showPanel,
        hidePanel: hidePanel,
        isLocked: isLocked,
        isPanelShown: isPanelShown,
        getAirplane: getAirplane
    };
})();
