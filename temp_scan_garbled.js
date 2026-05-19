const fs = require('fs');

let content = fs.readFileSync('examples/04-weather/main.js', 'utf8');

// Find all garbled comments and log them
const lines = content.split('\n');
const garbledMap = {};

lines.forEach((line, idx) => {
  // Look for comment lines that contain unusual characters
  if (line.trim().startsWith('//')) {
    // Check for characters that are likely garbled (uncommon CJK characters)
    const unusualChars = ['闅', '鍒', '濆', '棌', '鐗', '堟', '潈', '淇', '伅', '鏇', '槧', '鎻', '婚', '澧', '増', '姒', '鏁', '綋', '浜', '害', '瓒', '呴', '珮', '娓', '呰', '瘮', '渚', '瑁', '垜', '澘', '鎴', '栬', 'В', '閿', '嚮', '鏄', '剧', 'ず', '崲', '閿', '佸', '畾'];
    const hasUnusual = unusualChars.some(c => line.includes(c));
    if (hasUnusual) {
      const comment = line.trim().substring(2).trim();
      garbledMap[idx + 1] = comment;
      console.log(`Line ${idx + 1}: ${comment}`);
    }
  }
});

console.log('\nTotal garbled comments:', Object.keys(garbledMap).length);
