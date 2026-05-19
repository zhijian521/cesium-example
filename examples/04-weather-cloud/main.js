/*== 04-weather-cloud — rain-1 模型加载（SceneManager） ==*/

Cesium.Ion.defaultAccessToken = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJqdGkiOiI0OTAzZDRkZi00ODkyLTQ5OTUtOGE1MC1jN2JmNjc0ODdiOGUiLCJpZCI6MzMxMzk2LCJpYXQiOjE3NTUwNDgwNTV9.GH-UECFbXsiJip__VTu2oXoBmx8dt61E52q3rBakZyI';

var MODEL_URI = '../../assets/models/weather/rain_1.glb';
var MODEL_POSITION = { lon: 121.4998, lat: 31.2397, height: 80 };

var viewer;
var modelEntity;

function createModelEntity() {
    var position = Cesium.Cartesian3.fromDegrees(MODEL_POSITION.lon, MODEL_POSITION.lat, MODEL_POSITION.height);
    var hpr = new Cesium.HeadingPitchRoll(0, 0, 0);
    var orientation = Cesium.Transforms.headingPitchRollQuaternion(position, hpr);

    modelEntity = viewer.entities.add({
        name: 'rain-1',
        position: position,
        orientation: orientation,
        model: {
            uri: MODEL_URI,
            scale: 1.0,
            minimumPixelSize: 128,
            maximumScale: 400,
            runAnimations: true,
            color: Cesium.Color.WHITE,
            colorBlendMode: Cesium.ColorBlendMode.MIX,
            colorBlendAmount: 0.32
        }
    });
}

function flyToModel() {
    if (!modelEntity) return;
    viewer.flyTo(modelEntity, {
        duration: 1.8,
        offset: new Cesium.HeadingPitchRange(
            Cesium.Math.toRadians(20),
            Cesium.Math.toRadians(-18),
            520
        )
    });
}

async function init() {
    try {
        viewer = await SceneManager.init('cesiumContainer', {
            msaaSamples: 4,
            terrainProvider: null
        });

        createModelEntity();
        setupControls();
        flyToModel();

        setTimeout(function () {
            var el = document.getElementById('loading');
            if (el) el.style.display = 'none';
        }, 1500);
    } catch (error) {
        console.error('加载 rain-1 模型失败:', error);
        var el = document.getElementById('loading');
        if (el) el.innerText = '加载失败';
    }
}

function setupControls() {
    var btn = document.getElementById('btnResetView');
    if (btn) btn.addEventListener('click', flyToModel);
}

init();
