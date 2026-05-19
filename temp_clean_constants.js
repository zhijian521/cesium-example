const fs = require('fs');
const path = require('path');

const filesToClean = [
  'examples/01-flight-extended/main.js',
  'examples/01-flight-rounded/main.js',
  'examples/01-flight-vtol/main.js',
  'examples/03-particles/main.js'
];

filesToClean.forEach(file => {
  let content = fs.readFileSync(file, 'utf8');
  const originalLength = content.length;

  // Remove dongfangmingzhu
  content = content.replace(/const dongfangmingzhu = \{\s*lon: [\d.]+,\s*lat: [\d.]+,\s*height: \d+\s*\};\n\n/, '');

  // Remove dishuihu with optional comment
  content = content.replace(/(?:\/\/ 滴水湖位置\n)?const dishuihu = \{\s*lon: [\d.]+,\s*lat: [\d.]+(?:\s*[,;])?\s*height: \d+\s*\};\n\n/, '');

  // Remove chongmingdao with optional comment
  content = content.replace(/(?:\/\/ 崇明岛位置\n)?const chongmingdao = \{\s*lon: [\d.]+,\s*lat: [\d.]+(?:\s*[,;])?\s*height: \d+\s*\};\n\n/, '');

  // Remove BUILDING_SHADER with optional comment
  content = content.replace(/(?:\/\/ 建筑着色器代码[\s\S]*?\n)?const BUILDING_SHADER = `[\s\S]*?`;\n\n/, '');

  // Remove BUILDING_SHADER_OPTIMIZED with optional comment
  content = content.replace(/(?:\/\/ 建筑着色器代码[\s\S]*?\n)?const BUILDING_SHADER_OPTIMIZED = `[\s\S]*?`;\n\n/, '');

  if (content.length !== originalLength) {
    fs.writeFileSync(file, content, 'utf8');
    console.log('Cleaned:', file, '- removed', originalLength - content.length, 'chars');
  } else {
    console.log('No changes:', file);
  }
});

console.log('Done!');
