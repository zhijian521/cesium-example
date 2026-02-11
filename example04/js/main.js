// Cesium Ion Token
Cesium.Ion.defaultAccessToken = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJqdGkiOiI0OTAzZDRkZi00ODkyLTQ5OTUtOGE1MC1jN2JmNjc0ODdiOGUiLCJpZCI6MzMxMzk2LCJpYXQiOjE3NTUwNDgwNTV9.GH-UECFbXsiJip__VTu2oXoBmx8dt61E52q3rBakZyI';

// 鍏ㄥ眬鍙橀噺
let viewer;
let airplaneEntity;
let pathEntity;
let isCameraLocked = false;
let infoPanelVisible = false;
let airplaneEntities = [];
let pathEntities = [];
let tailEffectEntities = [];
let buildingCustomShader;
let isNightMode = true;
let weatherComponent;
let ringPathPositions = [];
let selectedAirplaneIndex = 0; // 褰撳墠閫変腑鐨勯鏈虹储寮?
let cameraDistance = 500; // 鐩告満璺熼殢璺濈锛堢背锛?
let cameraHeightOffset = 200; // 鐩告満楂樺害鍋忕Щ锛堢背锛?

// 涓滄柟鏄庣彔浣嶇疆
const INFO_PANEL_OFFSET_Y_MIN = 20;
const INFO_PANEL_OFFSET_Y_MAX = 200;
const INFO_PANEL_DISTANCE_MIN = 300;
const INFO_PANEL_DISTANCE_MAX = 8000;
const CAMERA_DISTANCE_MIN = 100;
const CAMERA_DISTANCE_MAX = 2000;
const TARGET_SPEED_KMH = 280;
const SPEED_DISPLAY_RANGE_KMH = 20;
const BUILDING_MIN_VISIBLE_HEIGHT = 30.0;
const speedBaselineMap = new WeakMap();
const tailEffectToAirplaneIndexMap = new WeakMap();
const airplaneAlertStateMap = new WeakMap();

const AIRPLANE_ALERT_CONFIG = {
    abnormalProbability: 0.45,
    minDurationSeconds: 1.2,
    maxDurationSeconds: 3.2
};

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

const WARNING_ICON_DATA_URL = createWarningIconDataUrl();

const STORM_EFFECT_CONFIG = {
    minHeightOffset: 220,
    maxHeightOffset: 560,
    lonLatJitter: 0.0046,
    billboardSpreadMeters: 620,
    coreRadius: 780,
    cloudBillboardSizeMeters: 260
};

const WEATHER_PRESET = 'rainstorm';
const WEATHER_PRESET_LABELS = {
    drizzle: '小雨云',
    rainstorm: '雷阵雨云',
    darkStorm: '厚乌云'
};

const WEATHER_SAMPLE_ANCHORS = [
    { lon: 121.4998, lat: 31.2397, radiusMeters: 920, label: '东方明珠周边' },
    { lon: 121.488, lat: 31.228, radiusMeters: 820, label: '陆家嘴南侧' }
];

const dongfangmingzhu = {
    lon: 121.4998,
    lat: 31.2397,
    height: 600
};

// 婊存按婀栦綅缃?
const dishuihu = {
    lon: 121.935,
    lat: 30.900,
    height: 600
};

// 宕囨槑宀涗綅缃?
const chongmingdao = {
    lon: 121.75,
    lat: 31.52,
    height: 600
};

// 寤虹瓚鐫€鑹插櫒浠ｇ爜 - 鍘熻壊 + 鐧界嚎鎵弿鏁堟灉
const BUILDING_SHADER = `
    void fragmentMain(FragmentInput fsInput, inout czm_modelMaterial material) {
        float height = fsInput.attributes.positionMC.z;

        // 浣跨敤寤虹瓚鍘熻壊锛堢櫧鑹?娴呯伆鍩虹锛? 璋冧寒
        vec3 baseColor = vec3(0.92, 0.92, 0.92);

        // 鑾峰彇鏃堕棿鐢ㄤ簬鍔ㄧ敾
        float time = float(czm_frameNumber) * 0.02;

        // === 鐧界嚎鎵弿鏁堟灉锛堝甫闂撮殧锛屼綆鐭缓绛戜笉鏄剧ず锛?==
        float scanGlow = 0.0;
        
        // 鍙涓€瀹氶珮搴︿互涓婄殑寤虹瓚鏄剧ず鍏夋晥锛?0绫充互涓婏級
        if (height > 50.0) {
            // 鎵弿鍛ㄦ湡锛氬寘鍚壂鎻忔椂闂村拰闂撮殧鏃堕棿
            float scanSpeed = 200.0; // 鎵弿閫熷害
            float scanHeight = 600.0; // 鎵弿楂樺害鑼冨洿
            float cycleDuration = scanHeight + 200.0; // 鎵弿楂樺害 + 闂撮殧璺濈
            
            // 褰撳墠鍛ㄦ湡涓殑浣嶇疆
            float cyclePos = mod(time * scanSpeed, cycleDuration);
            
            // 鍙湁鍦ㄦ壂鎻忚寖鍥村唴鎵嶆樉绀哄厜鏁?
            if (cyclePos < scanHeight) {
                float scanPos = cyclePos;
                float distToScan = abs(height - scanPos);
                float scanWidth = 8.0; // 鎵弿绾垮搴?
                scanGlow = 1.0 - smoothstep(0.0, scanWidth, distToScan);
                scanGlow *= 0.9;
            }
        }
        
        // 鎵弿绾块鑹诧紙浜櫧鑹插甫鍙戝厜锛?
        vec3 scanColor = vec3(1.0, 1.0, 1.0);

        // === 鍏夊奖鏁堟灉 ===
        // 鑾峰彇娉曠嚎鍜岃鍥炬柟鍚?
        vec3 vNormal = normalize(fsInput.attributes.normalEC);
        vec3 vView = normalize(-fsInput.attributes.positionEC);
        
        // 涓诲厜婧愭柟鍚?
        vec3 lightDir = normalize(vec3(0.6, 0.4, 0.7));
        
        // 婕弽灏勫厜鐓?- 鎻愪寒
        float diff = max(dot(vNormal, lightDir), 0.0);
        float diffuse = 0.6 + 0.5 * diff;
        
        // 闃村奖 - 鍑忚交
        float shadowFactor = smoothstep(-0.3, 0.6, diff);
        
        // 鐜鍏夐伄钄?- 鎻愪寒
        float ao = 0.8 + 0.2 * max(vNormal.z, 0.0);
        
        // 鑿叉秴灏旇竟缂樺厜
        float rim = 1.0 - max(dot(vNormal, vView), 0.0);
        rim = pow(rim, 3.0);
        
        // 搴旂敤鍏夊奖 - 鏁翠綋鎻愪寒
        vec3 litColor = baseColor * diffuse * ao;
        litColor *= mix(0.85, 1.0, shadowFactor);
        litColor += vec3(rim * 0.2); // 杈圭紭鍏夊寮?
        
        // 娣诲姞鎵弿绾挎晥鏋?
        litColor = mix(litColor, scanColor, scanGlow);
        litColor += scanColor * scanGlow * 0.6; // 鍙戝厜澧炲己
        
        // 鏈€缁堟彁浜?
        litColor *= 1.15;

        material.diffuse = litColor;
        material.alpha = 0.6;
    }
`;

const BUILDING_SHADER_OPTIMIZED = `
    void fragmentMain(FragmentInput fsInput, inout czm_modelMaterial material) {
        vec3 positionMC = fsInput.attributes.positionMC;
        vec3 positionEC = fsInput.attributes.positionEC;
        vec3 normalEC = fsInput.attributes.normalEC;
        vec3 posToCamera = normalize(-positionEC);
        vec3 coord = normalize(vec3(czm_inverseViewRotation * reflect(posToCamera, normalEC)));
        float ambientCoefficient = 0.3;
        float diffuseCoefficient = max(0.0, dot(normalEC, czm_sunDirectionEC));

        if (u_isDark) {
            vec4 darkRefColor = texture(u_envTexture2, vec2(coord.x, (coord.z - coord.y) / 2.0));
            material.diffuse = mix(
                mix(vec3(0.3), vec3(0.1, 0.2, 0.4), clamp(positionMC.z / 200.0, 0.0, 1.0)),
                darkRefColor.rgb,
                0.3
            );
            material.diffuse *= 0.25;

            float baseHeight = -40.0;
            float heightRange = 20.0;
            float glowRange = 300.0;
            float buildingHeight = positionMC.z - baseHeight;
            float pulse = fract(czm_frameNumber / 120.0) * 3.14159265 * 2.0;
            float gradient = buildingHeight / heightRange + sin(pulse) * 0.1;
            material.diffuse *= vec3(gradient);

            float scanTime = fract(czm_frameNumber / 120.0);
            scanTime = abs(scanTime - 0.5) * 2.0;
            float h = clamp(buildingHeight / glowRange, 0.0, 1.0);
            float diff = step(0.015, abs(h - scanTime));
            float lineMask = 1.0 - diff;
            vec3 lineColor = vec3(0.7);
            material.diffuse = mix(material.diffuse, lineColor, lineMask * 0.6);
        } else {
            vec4 dayRefColor = texture(u_envTexture, vec2(coord.x, (coord.z - coord.y) / 3.0));
            material.diffuse = mix(
                mix(vec3(0.0), vec3(0.5), clamp(positionMC.z / 300.0, 0.0, 1.0)),
                dayRefColor.rgb,
                0.3
            );
            material.diffuse *= min(diffuseCoefficient + ambientCoefficient, 1.0);
        }

        material.alpha = 1.0;
    }
`;

// 鍒濆鍖栧湴鍥?
async function initMap() {
    try {
        viewer = new Cesium.Viewer('cesiumContainer', {
            animation: false,
            baseLayerPicker: false,
            fullscreenButton: false,
            vrButton: false,
            geocoder: false,
            homeButton: false,
            infoBox: false,
            sceneModePicker: false,
            selectionIndicator: false,
            timeline: false,
            navigationHelpButton: false,
            navigationInstructionsInitiallyVisible: false,
            shouldAnimate: true,
            terrain: Cesium.Terrain.fromWorldTerrain(),
            // 娓叉煋璐ㄩ噺 - 骞宠　鎬ц兘
            msaaSamples: 2, // 2x MSAA 鎶楅敮榻?
            contextOptions: {
                webgl: {
                    alpha: false,
                    antialias: true, // 鍚敤 WebGL 鎶楅敮榻?
                    preserveDrawingBuffer: true,
                    powerPreference: 'high-performance'
                }
            }
        });

        // 闅愯棌鐗堟潈淇℃伅
        viewer.cesiumWidget.creditContainer.style.display = 'none';

        // 鍒濆鍖栧満鏅晥鏋?
        initSceneEffects();

        weatherComponent = createWeatherEffectComponent(viewer, {
            baseHeight: dongfangmingzhu.height,
            preset: WEATHER_PRESET,
            config: STORM_EFFECT_CONFIG
        });

        // 鍔犺浇寤虹瓚
        await loadBuildings();

        // 鍒涘缓椋炴満鍜岃埅绾?
        createAirplaneAndPath();

        // 璁剧疆浜嬩欢鐩戝惉
        setupEventListeners();

        // 寮€濮嬫洿鏂板惊鐜?
        viewer.scene.preRender.addEventListener(updateFrame);

        // 鍒濆瑙嗚
        flyToOverview();

        // 闅愯棌鍔犺浇鎻愮ず
        setTimeout(() => {
            document.getElementById('loading').style.display = 'none';
        }, 2000);

    } catch (error) {
        console.error('鍒濆鍖栧け璐?', error);
        document.getElementById('loading').innerText = '加载失败';
    }
}

// 鍒濆鍖栧満鏅晥鏋?
function initSceneEffects() {
    const scene = viewer.scene;

    scene.globe.enableLighting = true;
    scene.globe.depthTestAgainstTerrain = true;
    scene.highDynamicRange = true;

    // 涓诲厜婧?- 妯℃嫙闃冲厜鏂滃皠锛屼骇鐢熸槑鏄惧厜褰?
    scene.light = new Cesium.DirectionalLight({
        direction: new Cesium.Cartesian3(0.6, -0.4, -0.7),
        intensity: 2.5
    });

    // 鑳屾櫙鑹?- 璋冧寒
    scene.backgroundColor = new Cesium.Color(0.05, 0.08, 0.15, 1.0);

    // 闆炬晥
    scene.fog.enabled = true;
    scene.fog.density = 0.00015;
    scene.fog.minimumBrightness = 0.2;

    // 闃村奖璁剧疆
    scene.shadowMap.enabled = true;
    scene.shadowMap.size = 2048;
    scene.shadowMap.softShadows = true;
    scene.shadowMap.darkness = 0.4;

    // 鐜鍏?- 澧炲姞鏁翠綋浜害
    scene.globe.dynamicAtmosphereLighting = true;
    scene.globe.dynamicAtmosphereLightingFromSun = true;

    // 鏇濆厜鍜岃壊璋冩槧灏?- 鎻愪寒鐢婚潰
    scene.hdr = true;
    scene.globe.maximumScreenSpaceError = 2;

    // === 娓呮櫚搴︿笌鎬ц兘骞宠　 ===
    // 鍚敤鎶楅敮榻?
    scene.postProcessStages.fxaa.enabled = true;

    // 鍒嗚鲸鐜囨瘮渚?- 瓒呴珮娓呰缃?
    viewer.resolutionScale = 1.5;

    // 鍦板舰缁嗚妭 - 閫備腑
    scene.globe.maximumScreenSpaceError = 4;

    // 鐡︾墖缂撳瓨
    scene.globe.tileCacheSize = 384;
    applySceneMode(isNightMode);
}

function applySceneMode(useNightMode) {
    isNightMode = useNightMode;
    const scene = viewer.scene;

    if (isNightMode) {
        scene.light = new Cesium.DirectionalLight({
            direction: new Cesium.Cartesian3(0.6, -0.4, -0.7),
            intensity: 0.50
        });
        scene.sun.show = false;
        scene.moon.show = false;
        scene.skyAtmosphere.show = false;
        scene.globe.showGroundAtmosphere = false;
        scene.globe.dynamicAtmosphereLighting = false;
        scene.globe.dynamicAtmosphereLightingFromSun = false;

        if (buildingCustomShader) {
            buildingCustomShader.setUniform('u_isDark', true);
        }
    } else {
        scene.light = new Cesium.DirectionalLight({
            direction: new Cesium.Cartesian3(0.6, -0.4, -0.7),
            intensity: 2.5
        });
        scene.sun.show = true;
        scene.moon.show = false;
        scene.skyAtmosphere.show = true;
        scene.globe.showGroundAtmosphere = true;
        scene.globe.dynamicAtmosphereLighting = true;
        scene.globe.dynamicAtmosphereLightingFromSun = true;

        if (buildingCustomShader) {
            buildingCustomShader.setUniform('u_isDark', false);
        }
    }

    updateSceneModeButton();
}

function toggleSceneMode() {
    applySceneMode(!isNightMode);
}

function updateSceneModeButton() {
    const button = document.getElementById('btnSceneMode');
    if (button) {
        button.textContent = isNightMode ? '切换到白天' : '切换到夜晚';
    }
}

// 鍔犺浇3D寤虹瓚
async function loadBuildings() {
    try {
        const osmBuildings = await Cesium.createOsmBuildingsAsync(viewer);

        buildingCustomShader = new Cesium.CustomShader({
            uniforms: {
                u_envTexture: {
                    value: new Cesium.TextureUniform({
                        url: '../images/sky.jpg'
                    }),
                    type: Cesium.UniformType.SAMPLER_2D
                },
                u_envTexture2: {
                    value: new Cesium.TextureUniform({
                        url: '../images/pic.jpg'
                    }),
                    type: Cesium.UniformType.SAMPLER_2D
                },
                u_isDark: {
                    value: isNightMode,
                    type: Cesium.UniformType.BOOL
                }
            },
            mode: Cesium.CustomShaderMode.REPLACE_MATERIAL,
            lightingModel: Cesium.LightingModel.UNLIT,
            fragmentShaderText: BUILDING_SHADER_OPTIMIZED
        });

        osmBuildings.customShader = buildingCustomShader;
        osmBuildings.tileVisible.addEventListener((tile) => {
            const content = tile.content;
            const featureCount = content.featuresLength;
            for (let featureIndex = 0; featureIndex < featureCount; featureIndex++) {
                const feature = content.getFeature(featureIndex);
                const height = Number(feature.getProperty('height'));
                const estimatedHeight = Number(feature.getProperty('cesium#estimatedHeight'));
                const resolvedHeight = Number.isFinite(height)
                    ? height
                    : (Number.isFinite(estimatedHeight) ? estimatedHeight : NaN);
                feature.show = !Number.isFinite(resolvedHeight) || resolvedHeight >= BUILDING_MIN_VISIBLE_HEIGHT;
            }
        });

        osmBuildings.maximumScreenSpaceError = 8; // 寤虹瓚缁嗚妭绮惧害锛堝钩琛★級
        viewer.scene.primitives.add(osmBuildings);

    } catch (error) {
        console.error('鍔犺浇寤虹瓚澶辫触:', error);
    }
}

// 鍒涘缓椋炴満鍜岃埅绾?
function createAirplaneAndPath() {
    weatherComponent?.clearAllEffects();

    const startTime = Cesium.JulianDate.now();
    const duration = 60;
    const stopTime = Cesium.JulianDate.addSeconds(startTime, duration, new Cesium.JulianDate());

    // 璁剧疆鏃堕挓
    viewer.clock.startTime = startTime.clone();
    viewer.clock.stopTime = stopTime.clone();
    viewer.clock.currentTime = startTime.clone();
    viewer.clock.clockRange = Cesium.ClockRange.LOOP_STOP;
    viewer.clock.multiplier = 0.3; // 0.3鍊嶉€?
    viewer.clock.shouldAnimate = true;

    // === 鑸嚎1: 涓滄柟鏄庣彔鐜嚎 ===
    const numPoints = 100;
    const positionProperty1 = new Cesium.SampledPositionProperty();
    positionProperty1.setInterpolationOptions({
        interpolationDegree: 5,
        interpolationAlgorithm: Cesium.LagrangePolynomialApproximation
    });

    const pathPositions1 = [];

    for (let i = 0; i <= numPoints; i++) {
        const angle = (i / numPoints) * Math.PI * 2;
        const lon = dongfangmingzhu.lon + 0.015 * Math.cos(angle);
        const lat = dongfangmingzhu.lat + 0.015 * Math.sin(angle) * 0.85;

        const time = Cesium.JulianDate.addSeconds(startTime, (i / numPoints) * duration, new Cesium.JulianDate());
        const position = Cesium.Cartesian3.fromDegrees(lon, lat, dongfangmingzhu.height);

        positionProperty1.addSample(time, position);
        pathPositions1.push(Cesium.Cartesian3.fromDegrees(lon, lat, dongfangmingzhu.height));
    }

    ringPathPositions = pathPositions1.slice();

    weatherComponent?.createOnRing(pathPositions1);
    weatherComponent?.createFromAnchors(WEATHER_SAMPLE_ANCHORS);

    // 鍒涘缓鑸嚎1
    pathEntity = viewer.entities.add({
        name: '东方明珠环线 - 航线',
        polyline: {
            positions: pathPositions1,
            width: 3,
            material: new Cesium.PolylineGlowMaterialProperty({
                glowPower: 0.2,
                color: Cesium.Color.fromCssColorString('#90EE90').withAlpha(0.8)
            }),
            clampToGround: false
        }
    });
    pathEntities.push(pathEntity);

    // 鍒涘缓椋炴満1
    airplaneEntity = viewer.entities.add({
        name: '东方明珠环线 - 飞机',
        position: positionProperty1,
        availability: new Cesium.TimeIntervalCollection([new Cesium.TimeInterval({
            start: startTime,
            stop: stopTime
        })]),
        model: {
            uri: './model/shidi/shidi_Animi.gltf',
            scale: 5,
            minimumPixelSize: 80,
            maximumScale: 100
        },
        orientation: new Cesium.VelocityOrientationProperty(positionProperty1),
    });
    airplaneEntities.push(airplaneEntity);
    createTailBreathingEffectForAirplane(airplaneEntity, 0);

    // === 鑸嚎2: 婊存按婀栧埌宕囨槑宀涳紙寰€杩旓級 ===
    const numPoints2 = 1000; // 澧炲姞閲囨牱鐐癸紝澶у箙闄嶄綆閫熷害锛堥檷浣?0%锛?
    const positionProperty2 = new Cesium.SampledPositionProperty();
    positionProperty2.setInterpolationOptions({
        interpolationDegree: 5,
        interpolationAlgorithm: Cesium.LagrangePolynomialApproximation
    });

    const pathPositions2 = [];
    const halfPoints = Math.floor(numPoints2 / 2);

    // 鍘荤▼锛氭淮姘存箹 -> 宕囨槑宀?
    for (let i = 0; i <= halfPoints; i++) {
        const t = i / halfPoints;
        const lon = dishuihu.lon + (chongmingdao.lon - dishuihu.lon) * t;
        const lat = dishuihu.lat + (chongmingdao.lat - dishuihu.lat) * t;

        const time = Cesium.JulianDate.addSeconds(startTime, (i / numPoints2) * duration, new Cesium.JulianDate());
        const position = Cesium.Cartesian3.fromDegrees(lon, lat, 800);

        positionProperty2.addSample(time, position);
        pathPositions2.push(Cesium.Cartesian3.fromDegrees(lon, lat, 800));
    }

    // 杩旂▼锛氬磭鏄庡矝 -> 婊存按婀?
    for (let i = halfPoints; i <= numPoints2; i++) {
        const t = (i - halfPoints) / (numPoints2 - halfPoints);
        const lon = chongmingdao.lon + (dishuihu.lon - chongmingdao.lon) * t;
        const lat = chongmingdao.lat + (dishuihu.lat - chongmingdao.lat) * t;

        const time = Cesium.JulianDate.addSeconds(startTime, (i / numPoints2) * duration, new Cesium.JulianDate());
        const position = Cesium.Cartesian3.fromDegrees(lon, lat, 800);

        positionProperty2.addSample(time, position);
        pathPositions2.push(Cesium.Cartesian3.fromDegrees(lon, lat, 800));
    }

    // 鍒涘缓鑸嚎2
    const pathEntity2 = viewer.entities.add({
        name: '滴水湖到崇明岛 - 航线',
        polyline: {
            positions: pathPositions2,
            width: 3,
            material: new Cesium.PolylineGlowMaterialProperty({
                glowPower: 0.2,
                color: Cesium.Color.fromCssColorString('#4ECDC4').withAlpha(0.8)
            }),
            clampToGround: false
        }
    });
    pathEntities.push(pathEntity2);

    // 鍒涘缓椋炴満2
    const airplaneEntity2 = viewer.entities.add({
        name: '滴水湖到崇明岛 - 飞机',
        position: positionProperty2,
        availability: new Cesium.TimeIntervalCollection([new Cesium.TimeInterval({
            start: startTime,
            stop: stopTime
        })]),
        model: {
            uri: './model/shidi/shidi_Animi.gltf',
            scale: 5,
            minimumPixelSize: 80,
            maximumScale: 100
        },
        orientation: new Cesium.VelocityOrientationProperty(positionProperty2),
    });
    airplaneEntities.push(airplaneEntity2);
    createTailBreathingEffectForAirplane(airplaneEntity2, 1);
}

function createTailBreathingEffectForAirplane(airplane, airplaneIndex) {
    for (let layer = 0; layer < TAIL_RIPPLE_CONFIG.layerCount; layer++) {
        const layerProgressOffset = layer / TAIL_RIPPLE_CONFIG.layerCount;
        const tailEffect = viewer.entities.add({
            name: `椋炴満灏鹃儴姘存尝绾圭壒鏁?${airplaneIndex + 1}-${layer + 1}`,
            position: new Cesium.CallbackProperty((time) => getTailRipplePosition(airplane, time), false),
            ellipsoid: {
                radii: new Cesium.CallbackProperty((time) => {
                    const ripplePosition = getTailRipplePosition(airplane, time);
                    const rippleState = getTailRippleVisualState(airplane, time, layerProgressOffset, ripplePosition);
                    return new Cesium.Cartesian3(rippleState.radius, rippleState.radius, rippleState.radius);
                }, false),
                material: new Cesium.ColorMaterialProperty(new Cesium.CallbackProperty((time) => {
                    const ripplePosition = getTailRipplePosition(airplane, time);
                    const rippleState = getTailRippleVisualState(airplane, time, layerProgressOffset, ripplePosition);
                    return rippleState.color.withAlpha(rippleState.alpha);
                }, false)),
                outline: false
            }
        });

        tailEffectEntities.push(tailEffect);
        tailEffectToAirplaneIndexMap.set(tailEffect, airplaneIndex);
    }

    const warningIconEntity = viewer.entities.add({
        name: `椋炴満棰勮鍥炬爣-${airplaneIndex + 1}`,
        position: new Cesium.CallbackProperty((time) => getTailRipplePosition(airplane, time), false),
        billboard: {
            image: WARNING_ICON_DATA_URL,
            verticalOrigin: Cesium.VerticalOrigin.CENTER,
            disableDepthTestDistance: Number.POSITIVE_INFINITY,
            scaleByDistance: new Cesium.NearFarScalar(500, 1.25, 9000, 0.65),
            show: new Cesium.CallbackProperty((time) => isAirplaneAbnormal(airplane, time), false),
            width: new Cesium.CallbackProperty((time) => {
                const ripplePosition = getTailRipplePosition(airplane, time);
                const rippleState = getTailRippleVisualState(airplane, time, 0, ripplePosition);
                return getWarningIconSizePx(airplane, time, ripplePosition, rippleState);
            }, false),
            height: new Cesium.CallbackProperty((time) => {
                const ripplePosition = getTailRipplePosition(airplane, time);
                const rippleState = getTailRippleVisualState(airplane, time, 0, ripplePosition);
                return getWarningIconSizePx(airplane, time, ripplePosition, rippleState);
            }, false)
        }
    });

    tailEffectEntities.push(warningIconEntity);
    tailEffectToAirplaneIndexMap.set(warningIconEntity, airplaneIndex);
}

function createWarningIconDataUrl() {
    const size = 96;
    const canvas = document.createElement('canvas');
    canvas.width = size;
    canvas.height = size;
    const context = canvas.getContext('2d');
    if (!context) return '';

    context.clearRect(0, 0, size, size);
    context.beginPath();
    context.moveTo(size * 0.5, size * 0.12);
    context.lineTo(size * 0.12, size * 0.82);
    context.lineTo(size * 0.88, size * 0.82);
    context.closePath();
    context.fillStyle = '#ff3b30';
    context.fill();

    context.strokeStyle = '#ffd60a';
    context.lineWidth = size * 0.05;
    context.stroke();

    context.fillStyle = '#ffffff';
    context.fillRect(size * 0.475, size * 0.34, size * 0.05, size * 0.26);
    context.beginPath();
    context.arc(size * 0.5, size * 0.68, size * 0.03, 0, Math.PI * 2);
    context.fill();

    return canvas.toDataURL('image/png');
}

function getAirplaneVisualMetrics(airplane, time, referencePosition) {
    const cameraDistance = Cesium.Cartesian3.distance(viewer.camera.positionWC, referencePosition);
    const fovy = viewer.camera.frustum?.fovy || Cesium.Math.toRadians(60);
    const canvasHeight = Math.max(viewer.canvas.clientHeight || viewer.canvas.height || 1, 1);
    const metersPerPixel = (2 * cameraDistance * Math.tan(fovy * 0.5)) / canvasHeight;

    const modelScale = airplane?.model?.scale?.getValue?.(time) ?? airplane?.model?.scale ?? 5;
    const minimumPixelSize = airplane?.model?.minimumPixelSize?.getValue?.(time) ?? airplane?.model?.minimumPixelSize ?? 80;

    const numericScale = Number(modelScale) || 5;
    const numericMinimumPixelSize = Number(minimumPixelSize) || 80;
    const modelRadiusByScale = 10 * numericScale;
    const modelRadiusByPixel = numericMinimumPixelSize * metersPerPixel * 0.42;
    const visualRadius = Math.max(modelRadiusByScale, modelRadiusByPixel);

    return {
        visualRadius,
        metersPerPixel
    };
}

function getWarningIconSizePx(airplane, time, ripplePosition, rippleState) {
    if (!ripplePosition || !rippleState || rippleState.radius <= 0) {
        return TAIL_RIPPLE_CONFIG.warningIconMinSizePx;
    }

    const metrics = getAirplaneVisualMetrics(airplane, time, ripplePosition);
    const sourceRadiusMeters = rippleState.innerRadius > 0 ? rippleState.innerRadius : rippleState.radius;
    const rippleRadiusPx = sourceRadiusMeters / Math.max(metrics.metersPerPixel, 0.0001);
    const targetSize = rippleRadiusPx * TAIL_RIPPLE_CONFIG.warningIconScaleByRipplePixelRadius;
    return Cesium.Math.clamp(targetSize, TAIL_RIPPLE_CONFIG.warningIconMinSizePx, TAIL_RIPPLE_CONFIG.warningIconMaxSizePx);
}

function getTailRipplePosition(airplane, time) {
    const airplanePosition = airplane.position.getValue(time);
    if (!airplanePosition) return null;

    if (!TAIL_RIPPLE_CONFIG.centerOffsetRatio) return airplanePosition;

    const up = Cesium.Ellipsoid.WGS84.geodeticSurfaceNormal(airplanePosition, new Cesium.Cartesian3());
    const metrics = getAirplaneVisualMetrics(airplane, time, airplanePosition);
    const centerOffset = Cesium.Cartesian3.multiplyByScalar(
        up,
        metrics.visualRadius * TAIL_RIPPLE_CONFIG.centerOffsetRatio,
        new Cesium.Cartesian3()
    );
    return Cesium.Cartesian3.add(airplanePosition, centerOffset, new Cesium.Cartesian3());
}

function getTailRippleVisualState(airplane, time, layerProgressOffset, ripplePosition) {
    if (!isAirplaneAbnormal(airplane, time)) {
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
    const breathingScale = 1 + TAIL_RIPPLE_CONFIG.breathingAmplitude * Math.sin(elapsedSeconds * TAIL_RIPPLE_CONFIG.breathingFrequency);

    const basePosition = ripplePosition || airplane.position.getValue(time);
    if (!basePosition) {
        return {
            radius: 1,
            innerRadius: 1,
            alpha: TAIL_RIPPLE_CONFIG.minAlpha,
            color: TAIL_RIPPLE_CONFIG.warningColorStart
        };
    }

    const metrics = getAirplaneVisualMetrics(airplane, time, basePosition);
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

    return {
        radius,
        innerRadius,
        alpha,
        color
    };
}

function isAirplaneAbnormal(airplane, time) {
    const nowSeconds = Cesium.JulianDate.secondsDifference(time, viewer.clock.startTime);
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

// 姣忓抚鏇存柊
function updateFrame() {
    if (!airplaneEntities.length) return;

    // 鏇存柊褰撳墠閫変腑鐨勯鏈?
    const currentAirplane = airplaneEntities[selectedAirplaneIndex];
    if (!currentAirplane) return;

    const currentTime = viewer.clock.currentTime;
    const position = currentAirplane.position.getValue(currentTime);

    if (!position) return;

    // 鏇存柊淇℃伅闈㈡澘浣嶇疆
    if (infoPanelVisible) {
        updateInfoPanelPosition(position);
    }

    // 鏇存柊椋炶鏁版嵁
    updateFlightData(position, currentTime, currentAirplane.name);

    // 鐩告満璺熼殢
    if (isCameraLocked) {
        updateCameraFollow(position, currentTime);
    }
}

// 鏇存柊淇℃伅闈㈡澘浣嶇疆
function updateInfoPanelPosition(position) {
    const flightInfo = document.getElementById('flightInfo');
    const canvas = viewer.scene.canvas;
    const screenPosition = Cesium.SceneTransforms.wgs84ToWindowCoordinates(viewer.scene, position);

    if (screenPosition &&
        screenPosition.x > 0 && screenPosition.x < canvas.width &&
        screenPosition.y > 0 && screenPosition.y < canvas.height) {

        const cameraToPlaneDistance = Cesium.Cartesian3.distance(viewer.camera.positionWC, position);
        const zoomFactor = (cameraToPlaneDistance - INFO_PANEL_DISTANCE_MIN) / (INFO_PANEL_DISTANCE_MAX - INFO_PANEL_DISTANCE_MIN);
        const clampedZoomFactor = Cesium.Math.clamp(zoomFactor, 0, 1);
        const easedZoomFactor = 1 - Math.pow(1 - clampedZoomFactor, 5);
        const panelOffsetY = Cesium.Math.lerp(INFO_PANEL_OFFSET_Y_MAX, INFO_PANEL_OFFSET_Y_MIN, easedZoomFactor);
        const panelTop = Math.max(12, screenPosition.y - panelOffsetY);

        flightInfo.style.left = screenPosition.x + 'px';
        flightInfo.style.top = panelTop + 'px';
        flightInfo.classList.add('show');
    } else {
        flightInfo.classList.remove('show');
    }
}

// 鏇存柊椋炶鏁版嵁
function calculateSpeedKmh(currentAirplane, currentTime, currentPosition) {
    const sampleOffsetSeconds = 0.5;
    const previousTime = Cesium.JulianDate.addSeconds(currentTime, -sampleOffsetSeconds, new Cesium.JulianDate());
    const nextTime = Cesium.JulianDate.addSeconds(currentTime, sampleOffsetSeconds, new Cesium.JulianDate());

    const previousPosition = currentAirplane.position.getValue(previousTime);
    const nextPosition = currentAirplane.position.getValue(nextTime);

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

    return TARGET_SPEED_KMH;
}

function normalizeDisplaySpeedKmh(currentAirplane, rawSpeedKmh) {
    if (!Number.isFinite(rawSpeedKmh) || rawSpeedKmh <= 0) {
        return TARGET_SPEED_KMH;
    }

    let baselineSpeed = speedBaselineMap.get(currentAirplane);
    if (!baselineSpeed) {
        baselineSpeed = rawSpeedKmh;
        speedBaselineMap.set(currentAirplane, baselineSpeed);
    }

    const normalizedSpeed = (rawSpeedKmh / baselineSpeed) * TARGET_SPEED_KMH;
    const minSpeed = TARGET_SPEED_KMH - SPEED_DISPLAY_RANGE_KMH;
    const maxSpeed = TARGET_SPEED_KMH + SPEED_DISPLAY_RANGE_KMH;
    return Math.round(Cesium.Math.clamp(normalizedSpeed, minSpeed, maxSpeed));
}

function updateFlightData(position, currentTime, airplaneName) {
    const cartographic = Cesium.Cartographic.fromCartesian(position);
    const height = cartographic.height;

    // 璁＄畻鑸悜
    const currentAirplane = airplaneEntities[selectedAirplaneIndex];
    if (!currentAirplane) return;

    const rawSpeedKmh = calculateSpeedKmh(currentAirplane, currentTime, position);
    const speedKmh = normalizeDisplaySpeedKmh(currentAirplane, rawSpeedKmh);

    const nextTime = Cesium.JulianDate.addSeconds(currentTime, 0.1, new Cesium.JulianDate());
    const nextPosition = currentAirplane.position.getValue(nextTime);
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

    // 鏇存柊UI
    document.getElementById('airplaneName').innerText = airplaneName || '未知';
    document.getElementById('speed').innerText = speedKmh + ' km/h';
    document.getElementById('altitude').innerText = Math.round(height) + ' m';
    document.getElementById('heading').innerText = Math.round(heading) + '°';

    const isAbnormal = isAirplaneAbnormal(currentAirplane, currentTime);
    document.getElementById('systemStatus').innerText = isAbnormal ? '异常告警' : '正常';
}

// 鏇存柊鐩告満璺熼殢 - 鍦ㄩ鏈哄熬閮ㄥ悗鏂逛笂鏂癸紝鏀寔婊氳疆缂╂斁
function updateCameraFollow(position, currentTime) {
    const cartographic = Cesium.Cartographic.fromCartesian(position);

    // 璁＄畻椋炴満鐨勬柟鍚戯紙鑸悜锛?
    const nextTime = Cesium.JulianDate.addSeconds(currentTime, 0.1, new Cesium.JulianDate());
    const currentAirplane = airplaneEntities[selectedAirplaneIndex];
    const nextPosition = currentAirplane.position.getValue(nextTime);

    let heading = 0;
    if (nextPosition) {
        const currentCarto = Cesium.Cartographic.fromCartesian(position);
        const nextCarto = Cesium.Cartographic.fromCartesian(nextPosition);
        heading = Math.atan2(
            nextCarto.longitude - currentCarto.longitude,
            nextCarto.latitude - currentCarto.latitude
        );
    }

    // 璁＄畻鐩告満浣嶇疆锛氶鏈烘枩鍚庢柟涓婃柟
    const sideAngle = Cesium.Math.toRadians(-10); // 渚у亸瑙?

    // 璁＄畻鏂滃悗鏂逛綅缃紙鍩轰簬褰撳墠缂╂斁璺濈锛?
    const backHeading = heading - sideAngle;
    const backLon = Cesium.Math.toDegrees(cartographic.longitude) - Math.sin(backHeading) * (cameraDistance / 111000);
    const backLat = Cesium.Math.toDegrees(cartographic.latitude) - Math.cos(backHeading) * (cameraDistance / 111000);
    const cameraHeight = cartographic.height + cameraHeightOffset;

    const cameraPosition = Cesium.Cartesian3.fromDegrees(backLon, backLat, cameraHeight);

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
        orientation: {
            direction,
            up
        }
    });
}

// 椋炲埌鎬昏瑙嗚
function flyToOverview() {
    viewer.camera.flyTo({
        destination: Cesium.Cartesian3.fromDegrees(121.4998, 31.2097, 3000),
        orientation: {
            heading: Cesium.Math.toRadians(0),
            pitch: Cesium.Math.toRadians(-40),
            roll: 0
        },
        duration: 3
    });
}

// 璁剧疆浜嬩欢鐩戝惉
function resolvePickedAirplaneIndex(clickPosition) {
    if (weatherComponent) {
        return weatherComponent.resolvePickedAirplaneIndex(
            clickPosition,
            airplaneEntities,
            tailEffectToAirplaneIndexMap
        );
    }

    const pickedObject = viewer.scene.pick(clickPosition);
    if (!Cesium.defined(pickedObject)) return -1;

    const clickedIndex = airplaneEntities.findIndex(entity => entity === pickedObject.id);
    if (clickedIndex !== -1) return clickedIndex;

    const effectIndex = tailEffectToAirplaneIndexMap.get(pickedObject.id);
    return effectIndex !== undefined ? effectIndex : -1;
}

function refreshWeatherEffects() {
    if (!weatherComponent) return;
    weatherComponent.clearAllEffects();

    if (ringPathPositions.length > 1) {
        weatherComponent.createOnRing(ringPathPositions);
    }
    weatherComponent.createFromAnchors(WEATHER_SAMPLE_ANCHORS);
}

function setupWeatherPresetControl() {
    const select = document.getElementById('weatherPresetSelect');
    if (!select || !weatherComponent) return;

    const presets = weatherComponent.getPresetNames();
    select.innerHTML = '';

    for (const presetName of presets) {
        const option = document.createElement('option');
        option.value = presetName;
        option.textContent = WEATHER_PRESET_LABELS[presetName] || presetName;
        if (presetName === weatherComponent.getActivePreset()) {
            option.selected = true;
        }
        select.appendChild(option);
    }

    select.addEventListener('change', () => {
        const nextPreset = select.value;
        const changed = weatherComponent.setPreset(nextPreset, STORM_EFFECT_CONFIG);
        if (changed) {
            refreshWeatherEffects();
        }
    });
}

function setupEventListeners() {
    const handler = new Cesium.ScreenSpaceEventHandler(viewer.scene.canvas);
    const flightInfo = document.getElementById('flightInfo');
    const cameraHint = document.getElementById('cameraHint');
    const modeButton = document.getElementById('btnSceneMode');

    if (modeButton) {
        modeButton.addEventListener('click', toggleSceneMode);
        updateSceneModeButton();
    }

    setupWeatherPresetControl();

    // 鍗曞嚮 - 鏄剧ず/闅愯棌淇℃伅闈㈡澘鎴栬В閿?
    handler.setInputAction(function (click) {
        const resolvedIndex = resolvePickedAirplaneIndex(click.position);
        if (resolvedIndex !== -1) {
            selectedAirplaneIndex = resolvedIndex;
            airplaneEntity = airplaneEntities[resolvedIndex];
            pathEntity = pathEntities[resolvedIndex];
            infoPanelVisible = !infoPanelVisible;
            if (!infoPanelVisible) {
                flightInfo.classList.remove('show');
            }
            return;
        }

        if (isCameraLocked) {
            infoPanelVisible = false;
            flightInfo.classList.remove('show');
            // 閿佸畾鐘舵€佷笅鐐瑰嚮鍏朵粬鍦版柟 - 瑙ｉ攣
            unlockCamera();
        } else {
            // 鍏朵粬鎯呭喌鍏抽棴闈㈡澘
            infoPanelVisible = false;
            flightInfo.classList.remove('show');
        }
    }, Cesium.ScreenSpaceEventType.LEFT_CLICK);

    // 鍙屽嚮 - 閿佸畾/瑙ｉ攣瑙嗚
    handler.setInputAction(function (click) {
        const resolvedIndex = resolvePickedAirplaneIndex(click.position);
        if (resolvedIndex !== -1) {
            selectedAirplaneIndex = resolvedIndex;
            airplaneEntity = airplaneEntities[resolvedIndex];
            pathEntity = pathEntities[resolvedIndex];
            toggleCameraLock();
        }
    }, Cesium.ScreenSpaceEventType.LEFT_DOUBLE_CLICK);
}

// 鍒囨崲鐩告満閿佸畾
function toggleCameraLock() {
    isCameraLocked = !isCameraLocked;
    const cameraHint = document.getElementById('cameraHint');

    if (isCameraLocked) {
        viewer.scene.screenSpaceCameraController.enableInputs = false;
        cameraHint.classList.add('show');
        // 娣诲姞婊氳疆缂╂斁鐩戝惉
        viewer.canvas.addEventListener('wheel', handleCameraZoom, { passive: false });
    } else {
        unlockCamera();
    }
}

// 瑙ｉ攣鐩告満
function unlockCamera() {
    isCameraLocked = false;

    viewer.scene.screenSpaceCameraController.enableInputs = true;
    document.getElementById('cameraHint').classList.remove('show');
    // 绉婚櫎婊氳疆缂╂斁鐩戝惉
    viewer.canvas.removeEventListener('wheel', handleCameraZoom);
}

// 澶勭悊鐩告満婊氳疆缂╂斁
function handleCameraZoom(e) {
    if (!isCameraLocked) return;

    e.preventDefault();

    // 婊氳疆鍚戜笂锛堣礋鍊硷級= 鏀惧ぇ锛堝噺灏忚窛绂伙級锛屽悜涓嬶紙姝ｅ€硷級= 缂╁皬锛堝鍔犺窛绂伙級
    const zoomSpeed = 30; // 缂╂斁閫熷害
    const delta = e.deltaY > 0 ? zoomSpeed : -zoomSpeed;

    // 鏇存柊璺濈鍜岄珮搴︼紙淇濇寔瑙嗚姣斾緥锛?
    cameraDistance = Math.max(CAMERA_DISTANCE_MIN, Math.min(CAMERA_DISTANCE_MAX, cameraDistance + delta));
    cameraHeightOffset = cameraDistance * 0.4; // 淇濇寔楂樺害涓庤窛绂荤殑姣斾緥
}

// 鍚姩
document.addEventListener('DOMContentLoaded', initMap);


