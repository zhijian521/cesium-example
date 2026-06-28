/*== 01-flight-basic — 编排层（使用共享模块） ==*/

// Cesium Ion Token
Cesium.Ion.defaultAccessToken = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJqdGkiOiI0OTAzZDRkZi00ODkyLTQ5OTUtOGE1MC1jN2JmNjc0ODdiOGUiLCJpZCI6MzMxMzk2LCJpYXQiOjE3NTUwNDgwNTV9.GH-UECFbXsiJip__VTu2oXoBmx8dt61E52q3rBakZyI';

let viewer;
let airplaneEntity;
let propellerDone = false;

// === 启动 ===
document.addEventListener('DOMContentLoaded', async function () {
    try {
        // 1. 初始化场景（地图 + 建筑 + 着色器 + 日夜模式）
        viewer = await SceneManager.init('cesiumContainer', {
            cesiumAccessToken: Cesium.Ion.defaultAccessToken
        });

        // 2. 创建圆形航线 + 飞机（仅保留东方明珠环线）
        const flight = CircularFlightPath.create(viewer, {
            center: { lon: 121.4998, lat: 31.2397, height: 600 },
            name: '东方明珠环线'
        });
        airplaneEntity = flight.airplaneEntity;

        // 禁用模型默认动画（后续手动设置螺旋桨转速）
        airplaneEntity.model.runAnimations = false;

        // 3. 附加尾部预警特效
        TailEffect.attach(viewer, airplaneEntity);

        // 4. 初始化飞行追踪器
        FlightTracker.init(viewer);
        FlightTracker.setAirplane(airplaneEntity, '东方明珠环线 - 飞机');

        // 5. 设置交互事件
        setupEventListeners();

        // 6. 每帧更新循环
        viewer.scene.preRender.addEventListener(onFrameUpdate);

        // 7. 飞往总览视角
        SceneManager.flyTo(
            Cesium.Cartesian3.fromDegrees(121.4998, 31.2097, 3000),
            { heading: Cesium.Math.toRadians(0), pitch: Cesium.Math.toRadians(-40), roll: 0 }
        );

        // 8. 隐藏加载提示
        setTimeout(function () {
            var loadingEl = document.getElementById('loading');
            if (loadingEl) loadingEl.style.display = 'none';
        }, 2000);

    } catch (error) {
        console.error('初始化失败:', error);
        var loadingEl = document.getElementById('loading');
        if (loadingEl) loadingEl.innerText = '加载失败';
    }
});

// === 每帧更新 ===
function onFrameUpdate() {
    // 螺旋桨动画轮询
    if (!propellerDone) {
        pollPropellerSpeed();
    }

    var currentTime = viewer.clock.currentTime;
    var isAbnormal = TailEffect.isAbnormal(airplaneEntity, currentTime);

    // 更新面板警告状态（控制状态指示灯颜色）
    var panel = document.getElementById('flightInfo');
    if (panel) {
        if (isAbnormal) {
            panel.classList.add('warning');
        } else {
            panel.classList.remove('warning');
        }
    }

    FlightTracker.update(currentTime, {
        systemStatus: isAbnormal ? '异常告警' : '正常'
    });
}

// === 加速螺旋桨动画 ===
function pollPropellerSpeed() {
    var dataSource = viewer.dataSourceDisplay && viewer.dataSourceDisplay.defaultDataSource;
    var visualizers = dataSource && dataSource._visualizers;
    if (!visualizers) return;

    for (var i = 0; i < visualizers.length; i++) {
        var modelState = visualizers[i]._modelHash && visualizers[i]._modelHash[airplaneEntity.id];
        if (modelState && modelState.modelPrimitive && modelState.modelPrimitive.ready) {
            var model = modelState.modelPrimitive;
            if (model.activeAnimations.length > 0) {
                model.activeAnimations.removeAll();
            }
            model.activeAnimations.addAll({
                multiplier: 15.0,
                loop: Cesium.ModelAnimationLoop.REPEAT
            });
            propellerDone = true;
            return;
        }
    }
}

// === 事件监听 ===
function setupEventListeners() {
    var handler = new Cesium.ScreenSpaceEventHandler(viewer.scene.canvas);
    var modeButton = document.getElementById('btnSceneMode');

    // 日夜切换按钮
    if (modeButton) {
        modeButton.addEventListener('click', function () {
            SceneManager.toggleSceneMode();
            var isNight = SceneManager.getIsNightMode();
            var icon = modeButton.querySelector('.btn-icon');
            var label = modeButton.querySelector('.btn-label');
            if (icon) icon.textContent = isNight ? '☀' : '🌙';
            if (label) label.textContent = isNight ? '白天' : '黑夜';
        });
    }

    // 单击：切换信息面板 or 解锁
    handler.setInputAction(function (click) {
        var picked = viewer.scene.pick(click.position);

        if (Cesium.defined(picked)) {
            var entity = picked.id;

            // 点击了飞机或其尾部特效 → 切换信息面板
            if (entity === airplaneEntity || TailEffect.isTailEntity(entity)) {
                FlightTracker.togglePanel();
                return;
            }
        }

        // 锁定状态点击其他地方 → 解锁
        if (FlightTracker.isLocked()) {
            FlightTracker.hidePanel();
            FlightTracker.unlockCamera();
        } else {
            // 非锁定状态 → 关闭面板
            FlightTracker.hidePanel();
        }
    }, Cesium.ScreenSpaceEventType.LEFT_CLICK);

    // 双击：锁定/解锁相机跟随
    handler.setInputAction(function (click) {
        var picked = viewer.scene.pick(click.position);

        if (Cesium.defined(picked)) {
            var entity = picked.id;

            if (entity === airplaneEntity || TailEffect.isTailEntity(entity)) {
                FlightTracker.toggleCameraLock();
            }
        }
    }, Cesium.ScreenSpaceEventType.LEFT_DOUBLE_CLICK);
}
