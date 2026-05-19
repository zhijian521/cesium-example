/*== 02-airspace — 编排层（上海机场空域 3D 展示，使用 SceneManager） ==*/

Cesium.Ion.defaultAccessToken = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJqdGkiOiI0OTAzZDRkZi00ODkyLTQ5OTUtOGE1MC1jN2JmNjc0ODdiOGUiLCJpZCI6MzMxMzk2LCJpYXQiOjE3NTUwNDgwNTV9.GH-UECFbXsiJip__VTu2oXoBmx8dt61E52q3rBakZyI';

// === 空域层级定义 ===
// 浦东机场（5条跑道，三跑道以上）
var PUDONG_LAYERS = [
    { bottomHeight: 0,    topHeight: 900,  radius: 20000, class: 'B', name: 'B类下层', color: '#64B5F6' },
    { bottomHeight: 900,  topHeight: 1800, radius: 40000, class: 'B', name: 'B类中层', color: '#1976D2' },
    { bottomHeight: 1800, topHeight: 6000, radius: 60000, class: 'B', name: 'B类上层', color: '#0D47A1' }
];

// 虹桥机场（2条跑道，双跑道）
var HONGQIAO_LAYERS = [
    { bottomHeight: 0,   topHeight: 600,  radius: 15000, class: 'B', name: 'B类下层', color: '#64B5F6' },
    { bottomHeight: 600, topHeight: 3600, radius: 30000, class: 'B', name: 'B类上层', color: '#1976D2' }
];

// 机场配置
var AIRPORTS = {
    hongqiao: {
        name: '上海虹桥国际机场',
        code: 'ZSSS',
        position: [121.3356, 31.1979, 3],
        layers: HONGQIAO_LAYERS,
        runways: [
            { start: [121.328, 31.185, 3], end: [121.336, 31.212, 3] },
            { start: [121.342, 31.182, 3], end: [121.350, 31.209, 3] }
        ]
    },
    pudong: {
        name: '上海浦东国际机场',
        code: 'ZSPD',
        position: [121.8083, 31.1443, 4],
        layers: PUDONG_LAYERS,
        runways: [
            { start: [121.785, 31.165, 4], end: [121.805, 31.200, 4] },
            { start: [121.815, 31.165, 4], end: [121.835, 31.200, 4] },
            { start: [121.775, 31.125, 4], end: [121.795, 31.160, 4] },
            { start: [121.805, 31.125, 4], end: [121.825, 31.160, 4] },
            { start: [121.835, 31.125, 4], end: [121.855, 31.160, 4] }
        ]
    }
};

// === 全局状态 ===
var viewer;
var state = {
    entities: {
        hongqiao: { base: [], layers: [[], []] },
        pudong:   { base: [], layers: [[], [], []] },
        buildings: null
    }
};

// === 启动 ===
document.addEventListener('DOMContentLoaded', async function () {
    try {
        // 1. 使用 SceneManager 初始化场景（地图 + 建筑 + 日夜模式）
        viewer = await SceneManager.init('cesiumContainer', {
            resolutionScale: 1.0
        });

        // 2. 查找 OSM 建筑 tileset 引用（供显隐控制）
        for (var i = 0; i < viewer.scene.primitives.length; i++) {
            var p = viewer.scene.primitives.get(i);
            if (p instanceof Cesium.Cesium3DTileset) {
                state.entities.buildings = p;
                break;
            }
        }

        // 3. 创建空域可视化
        createAirspace();

        // 4. 设置事件监听
        setupEventListeners();

        // 5. 飞往总览视角（居中覆盖虹桥+浦东两个空域）
        SceneManager.flyTo(
            Cesium.Cartesian3.fromDegrees(121.57, 31.17, 95000),
            { heading: Cesium.Math.toRadians(0), pitch: Cesium.Math.toRadians(-65), roll: 0 },
            2
        );

        // 6. 隐藏加载提示
        setTimeout(function () {
            var el = document.getElementById('loading');
            if (el) el.style.display = 'none';
        }, 1500);

    } catch (error) {
        console.error('初始化失败:', error);
        var el = document.getElementById('loading');
        if (el) el.innerText = '加载失败';
    }
});

// === 空域创建 ===
function createAirspace() {
    createAirportAirspace('hongqiao', AIRPORTS.hongqiao);
    createAirportAirspace('pudong', AIRPORTS.pudong);
}

function createAirportAirspace(key, airport) {
    var lon = airport.position[0];
    var lat = airport.position[1];
    var alt = airport.position[2];
    var center = Cesium.Cartesian3.fromDegrees(lon, lat, alt);
    var entities = state.entities[key];

    createAirportMarker(center, airport, entities.base);
    createRunways(lon, lat, alt, airport, entities.base);

    airport.layers.forEach(function (layerDef, index) {
        createAirspaceLayer(lon, lat, alt, layerDef, layerDef.radius, index, entities.layers[index]);
    });
}

function createAirportMarker(position, airport, entityArray) {
    var marker = viewer.entities.add({
        name: airport.name,
        position: position,
        billboard: {
            image: createAirportPinSvg(airport.code),
            verticalOrigin: Cesium.VerticalOrigin.BOTTOM,
            scale: 0.8,
            heightReference: Cesium.HeightReference.RELATIVE_TO_GROUND,
            disableDepthTestDistance: Number.POSITIVE_INFINITY
        },
        label: {
            text: airport.name,
            font: 'bold 14px Microsoft YaHei',
            fillColor: Cesium.Color.WHITE,
            outlineColor: Cesium.Color.BLACK,
            outlineWidth: 3,
            style: Cesium.LabelStyle.FILL_AND_OUTLINE,
            verticalOrigin: Cesium.VerticalOrigin.TOP,
            pixelOffset: new Cesium.Cartesian2(0, -40),
            heightReference: Cesium.HeightReference.RELATIVE_TO_GROUND,
            disableDepthTestDistance: Number.POSITIVE_INFINITY,
            eyeOffset: new Cesium.Cartesian3(0, 0, -1000)
        }
    });
    entityArray.push(marker);
}

function createRunways(centerLon, centerLat, alt, airport, entityArray) {
    airport.runways.forEach(function (runway, index) {
        var runwayEntity = viewer.entities.add({
            name: airport.name + ' - 跑道 ' + (index + 1),
            corridor: {
                positions: Cesium.Cartesian3.fromDegreesArrayHeights([
                    runway.start[0], runway.start[1], runway.start[2],
                    runway.end[0], runway.end[1], runway.end[2]
                ]),
                width: 60,
                material: Cesium.Color.fromCssColorString('#333333').withAlpha(0.8),
                outline: true,
                outlineColor: Cesium.Color.WHITE,
                outlineWidth: 1,
                heightReference: Cesium.HeightReference.RELATIVE_TO_GROUND
            }
        });
        entityArray.push(runwayEntity);
    });
}

function createAirspaceLayer(lon, lat, alt, layerDef, radius, index, entityArray) {
    var layerColor = Cesium.Color.fromCssColorString(layerDef.color);
    var height = layerDef.topHeight - layerDef.bottomHeight;
    var centerHeight = (layerDef.bottomHeight + layerDef.topHeight) / 2;

    var cylinder = viewer.entities.add({
        name: layerDef.class + '类 ' + layerDef.name,
        position: Cesium.Cartesian3.fromDegrees(lon, lat, alt + centerHeight),
        cylinder: {
            length: height,
            topRadius: radius,
            bottomRadius: radius,
            material: layerColor.withAlpha(0.25),
            outline: true,
            outlineColor: layerColor,
            outlineWidth: 2,
            heightReference: Cesium.HeightReference.RELATIVE_TO_GROUND
        }
    });
    entityArray.push(cylinder);

    var labelAngle = (index * 72 + (index === 0 ? 0 : 36)) * Math.PI / 180;
    var labelLon = lon + (radius / 111000) * Math.cos(labelAngle) / Math.cos(lat * Math.PI / 180);
    var labelLat = lat + (radius / 111000) * Math.sin(labelAngle);

    var label = viewer.entities.add({
        name: layerDef.name + ' 标签',
        position: Cesium.Cartesian3.fromDegrees(labelLon, labelLat, alt + layerDef.topHeight),
        label: {
            text: layerDef.class + '类 ' + layerDef.name + '\n' + layerDef.bottomHeight + 'm-' + layerDef.topHeight + 'm\n半径' + (radius / 1000) + 'km',
            font: 'bold 10px Microsoft YaHei',
            fillColor: layerColor,
            outlineColor: Cesium.Color.BLACK,
            outlineWidth: 2,
            style: Cesium.LabelStyle.FILL_AND_OUTLINE,
            verticalOrigin: Cesium.VerticalOrigin.BOTTOM,
            horizontalOrigin: Cesium.HorizontalOrigin.LEFT,
            pixelOffset: new Cesium.Cartesian2(5, -5),
            heightReference: Cesium.HeightReference.RELATIVE_TO_GROUND
        }
    });
    entityArray.push(label);
}

function createAirportPinSvg(code) {
    var svg = '<svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 32 32">' +
        '<circle cx="16" cy="16" r="14" fill="#00d4ff" stroke="#fff" stroke-width="2"/>' +
        '<text x="16" y="20" text-anchor="middle" fill="#000" font-size="10" font-weight="bold" font-family="Arial">' + code + '</text>' +
        '</svg>';
    return 'data:image/svg+xml;base64,' + btoa(unescape(encodeURIComponent(svg)));
}

// === 事件处理 ===
function setupEventListeners() {
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

    setupMasterToggle('toggleHongqiao', 'hongqiao', 'toggleHqLayer');
    setupMasterToggle('togglePudong', 'pudong', 'togglePdLayer');

    for (var i = 0; i < 2; i++) {
        setupLayerToggle('toggleHqLayer' + i, 'hongqiao', i);
    }
    for (var j = 0; j < 3; j++) {
        setupLayerToggle('togglePdLayer' + j, 'pudong', j);
    }

    var buildingsToggle = document.getElementById('toggleBuildings');
    if (buildingsToggle) {
        buildingsToggle.addEventListener('change', function (e) {
            if (state.entities.buildings) {
                state.entities.buildings.show = e.target.checked;
            }
        });
    }

    var overviewBtn = document.getElementById('btnOverview');
    if (overviewBtn) {
        overviewBtn.addEventListener('click', function () {
            SceneManager.flyTo(
                Cesium.Cartesian3.fromDegrees(121.57, 31.17, 95000),
                { heading: Cesium.Math.toRadians(0), pitch: Cesium.Math.toRadians(-65), roll: 0 },
                2
            );
        });
    }
}

function setupMasterToggle(elementId, airportKey, childPrefix) {
    var el = document.getElementById(elementId);
    if (!el) return;

    el.addEventListener('change', function (e) {
        var show = e.target.checked;
        var layerCount = airportKey === 'hongqiao' ? 2 : 3;

        state.entities[airportKey].base.forEach(function (entity) { entity.show = show; });
        state.entities[airportKey].layers.forEach(function (layer) {
            layer.forEach(function (entity) { entity.show = show; });
        });

        for (var i = 0; i < layerCount; i++) {
            var child = document.getElementById(childPrefix + i);
            if (child) child.checked = show;
        }
    });
}

function setupLayerToggle(elementId, airportKey, layerIndex) {
    var el = document.getElementById(elementId);
    if (!el) return;

    el.addEventListener('change', function (e) {
        var layer = state.entities[airportKey].layers[layerIndex];
        if (layer) {
            layer.forEach(function (entity) { entity.show = e.target.checked; });
        }
    });
}
