Cesium.Ion.defaultAccessToken = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJqdGkiOiI0OTAzZDRkZi00ODkyLTQ5OTUtOGE1MC1jN2JmNjc0ODdiOGUiLCJpZCI6MzMxMzk2LCJpYXQiOjE3NTUwNDgwNTV9.GH-UECFbXsiJip__VTu2oXoBmx8dt61E52q3rBakZyI";

const MODEL_URI = "./rain-1/rain_1.glb";
const MODEL_POSITION = {
    lon: 121.4998,
    lat: 31.2397,
    height: 80
};

let viewer;
let modelEntity;

function hideLoading() {
    const loadingElement = document.getElementById("loading");
    if (!loadingElement) {
        return;
    }
    loadingElement.style.display = "none";
}

function showLoadingError(message) {
    const loadingElement = document.getElementById("loading");
    if (!loadingElement) {
        return;
    }
    loadingElement.textContent = message;
}

function getModelOrientation() {
    const position = Cesium.Cartesian3.fromDegrees(
        MODEL_POSITION.lon,
        MODEL_POSITION.lat,
        MODEL_POSITION.height
    );

    const heading = Cesium.Math.toRadians(0);
    const pitch = Cesium.Math.toRadians(0);
    const roll = Cesium.Math.toRadians(0);
    const hpr = new Cesium.HeadingPitchRoll(heading, pitch, roll);

    return Cesium.Transforms.headingPitchRollQuaternion(position, hpr);
}

function createModelEntity() {
    const modelPosition = Cesium.Cartesian3.fromDegrees(
        MODEL_POSITION.lon,
        MODEL_POSITION.lat,
        MODEL_POSITION.height
    );

    modelEntity = viewer.entities.add({
        name: "rain-1",
        position: modelPosition,
        orientation: getModelOrientation(),
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
    if (!modelEntity) {
        return;
    }

    viewer.flyTo(modelEntity, {
        duration: 1.8,
        offset: new Cesium.HeadingPitchRange(
            Cesium.Math.toRadians(20),
            Cesium.Math.toRadians(-18),
            520
        )
    });
}

function setupScene() {
    viewer.scene.globe.depthTestAgainstTerrain = true;
    viewer.scene.skyAtmosphere.show = true;
    viewer.scene.fog.enabled = true;
    viewer.scene.postProcessStages.fxaa.enabled = true;
    viewer.cesiumWidget.creditContainer.style.display = "none";
}

function setupControls() {
    const resetButton = document.getElementById("btnResetView");
    if (!resetButton) {
        return;
    }

    resetButton.addEventListener("click", flyToModel);
}

async function init() {
    try {
        viewer = new Cesium.Viewer("cesiumContainer", {
            animation: false,
            timeline: false,
            homeButton: false,
            sceneModePicker: false,
            navigationHelpButton: false,
            baseLayerPicker: true,
            geocoder: false,
            fullscreenButton: false,
            selectionIndicator: false,
            infoBox: false,
            shouldAnimate: true,
            msaaSamples: 4
        });

        setupScene();
        createModelEntity();
        setupControls();
        flyToModel();
        hideLoading();
    } catch (error) {
        console.error("加载 rain-1 模型失败:", error);
        showLoadingError("加载失败：请检查 rain_1.glb 是否存在");
    }
}

init();
