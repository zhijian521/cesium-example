/*== 01-flight-vtol — 编排层（VTOL 模型 + 圆角矩形航线 + 转弯倾斜 + ENU 跟随） ==*/

Cesium.Ion.defaultAccessToken = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJqdGkiOiI0OTAzZDRkZi00ODkyLTQ5OTUtOGE1MC1jN2JmNjc0ODdiOGUiLCJpZCI6MzMxMzk2LCJpYXQiOjE3NTUwNDgwNTV9.GH-UECFbXsiJip__VTu2oXoBmx8dt61E52q3rBakZyI';

var viewer;
var airplaneEntity;
var positionProperty;
var propellerDone = false;

// === 启动 ===
document.addEventListener('DOMContentLoaded', async function () {
    try {
        // 1. 初始化场景（地图 + 建筑 + 着色器 + 日夜模式）
        viewer = await SceneManager.init('cesiumContainer');

        // 2. 创建圆角矩形航线 + VTOL 飞机（带转弯倾斜姿态）
        var flight = RoundedFlightPath.create(viewer, {
            center: { lon: 121.4803, lat: 31.2397, height: 600 },
            name: '东方明珠圆角四边形环线 - VTOL',
            modelUri: '../../assets/models/beta-alia/beta_alia_vtol_aircraft.glb'
        });
        airplaneEntity = flight.airplaneEntity;
        positionProperty = flight.positionProperty;

        // 禁用 VTOL 模型默认动画（后续手动设置螺旋桨转速）
        airplaneEntity.model.runAnimations = false;

        // 3. 初始化飞行追踪器（ENU 模式 + 近距离 + banking 航向）
        FlightTracker.init(viewer, {
            cameraMode: 'enu',
            cameraDefaultDistance: 120,
            cameraHeightRatio: 0.42,
            getHeading: function (entity, time) {
                var attitude = RoundedFlightPath.getAttitude(positionProperty, time);
                return attitude ? attitude.heading : 0;
            }
        });
        FlightTracker.setAirplane(airplaneEntity, '东方明珠圆角四边形环线 - VTOL');

        // 4. 设置交互事件
        setupEventListeners();

        // 5. 每帧更新循环
        viewer.scene.preRender.addEventListener(onFrameUpdate);

        // 6. 飞往总览视角
        SceneManager.flyTo(
            Cesium.Cartesian3.fromDegrees(121.4998, 31.2097, 3000),
            { heading: Cesium.Math.toRadians(0), pitch: Cesium.Math.toRadians(-40), roll: 0 }
        );

        // 7. 隐藏加载提示
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

// === 每帧更新 ===
function onFrameUpdate() {
    // 螺旋桨动画轮询
    if (!propellerDone) {
        pollPropellerSpeed();
    }

    FlightTracker.update(viewer.clock.currentTime, {
        systemStatus: '正常'
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

    // 单击：切换信息面板 or 解锁
    handler.setInputAction(function (click) {
        var picked = viewer.scene.pick(click.position);

        if (Cesium.defined(picked)) {
            var entity = picked.id;
            if (entity === airplaneEntity) {
                FlightTracker.togglePanel();
                return;
            }
        }

        if (FlightTracker.isLocked()) {
            FlightTracker.hidePanel();
            FlightTracker.unlockCamera();
        } else {
            FlightTracker.hidePanel();
        }
    }, Cesium.ScreenSpaceEventType.LEFT_CLICK);

    // 双击：锁定/解锁相机跟随
    handler.setInputAction(function (click) {
        var picked = viewer.scene.pick(click.position);

        if (Cesium.defined(picked)) {
            var entity = picked.id;
            if (entity === airplaneEntity) {
                FlightTracker.toggleCameraLock();
            }
        }
    }, Cesium.ScreenSpaceEventType.LEFT_DOUBLE_CLICK);
}
