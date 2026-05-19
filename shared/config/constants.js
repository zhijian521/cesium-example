/*== 公共常量 ==*/

const dongfangmingzhu = {
    lon: 121.4998,
    lat: 31.2397,
    height: 600
};

const dishuihu = {
    lon: 121.935,
    lat: 30.900,
    height: 600
};

const chongmingdao = {
    lon: 121.75,
    lat: 31.52,
    height: 600
};

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

const BUILDING_SHADER = `
    void fragmentMain(FragmentInput fsInput, inout czm_modelMaterial material) {
        float height = fsInput.attributes.positionMC.z;

        // 使用建筑原色（白色/浅灰基础）- 调亮
        vec3 baseColor = vec3(0.92, 0.92, 0.92);

        // 获取时间用于动画
        float time = float(czm_frameNumber) * 0.02;

        // === 白线扫描效果（带间隔，低矮建筑不显示）===
        float scanGlow = 0.0;
        
        // 只对一定高度以上的建筑显示光效（50米以上）
        if (height > 50.0) {
            // 扫描周期：包含扫描时间和间隔时间
            float scanSpeed = 200.0; // 扫描速度
            float scanHeight = 600.0; // 扫描高度范围
            float cycleDuration = scanHeight + 200.0; // 扫描高度 + 间隔距离
            
            // 当前周期中的位置
            float cyclePos = mod(time * scanSpeed, cycleDuration);
            
            // 只有在扫描范围内才显示光效
            if (cyclePos < scanHeight) {
                float scanPos = cyclePos;
                float distToScan = abs(height - scanPos);
                float scanWidth = 8.0; // 扫描线宽度
                scanGlow = 1.0 - smoothstep(0.0, scanWidth, distToScan);
                scanGlow *= 0.9;
            }
        }
        
        // 扫描线颜色（亮白色带发光）
        vec3 scanColor = vec3(1.0, 1.0, 1.0);

        // === 光影效果 ===
        // 获取法线和视图方向
        vec3 vNormal = normalize(fsInput.attributes.normalEC);
        vec3 vView = normalize(-fsInput.attributes.positionEC);
        
        // 主光源方向
        vec3 lightDir = normalize(vec3(0.6, 0.4, 0.7));
        
        // 漫反射光照 - 提亮
        float diff = max(dot(vNormal, lightDir), 0.0);
        float diffuse = 0.6 + 0.5 * diff;
        
        // 阴影 - 减轻
        float shadowFactor = smoothstep(-0.3, 0.6, diff);
        
        // 环境光遮蔽 - 提亮
        float ao = 0.8 + 0.2 * max(vNormal.z, 0.0);
        
        // 菲涅尔边缘光
        float rim = 1.0 - max(dot(vNormal, vView), 0.0);
        rim = pow(rim, 3.0);
        
        // 应用光影 - 整体提亮
        vec3 litColor = baseColor * diffuse * ao;
        litColor *= mix(0.85, 1.0, shadowFactor);
        litColor += vec3(rim * 0.2); // 边缘光增强
        
        // 添加扫描线效果
        litColor = mix(litColor, scanColor, scanGlow);
        litColor += scanColor * scanGlow * 0.6; // 发光增强
        
        // 最终提亮
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
