import { readFileSync, writeFileSync, readdirSync } from 'fs';

const distDir = 'dist';

// Read index.html
const html = readFileSync(`${distDir}/index.html`, 'utf-8');

// Find the JS and CSS files
const assetsDir = `${distDir}/assets`;
const jsFiles = readdirSync(assetsDir).filter(f => f.endsWith('.js'));
const cssFiles = readdirSync(assetsDir).filter(f => f.endsWith('.css'));

console.log('JS files:', jsFiles);
console.log('CSS files:', cssFiles);

const jsCode = readFileSync(`${assetsDir}/${jsFiles[0]}`, 'utf-8');
const cssCode = cssFiles.length > 0 ? readFileSync(`${assetsDir}/${cssFiles[0]}`, 'utf-8') : '';

// Build the self-contained HTML using Blob URL for ESM
const bundleHtml = `<!doctype html>
<html lang="zh-CN" class="dark">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <link rel="icon" type="image/svg+xml" href="data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 32 32'%3E%3Crect width='32' height='32' rx='6' fill='%233b82f6'/%3E%3Cpath d='M5 22h4V14H5v8zm6 0h4V8h-4v14zm6 0h4V12h-4v10zm6 0h4V6h-4v16z' fill='white'/%3E%3C/svg%3E" />
    <title>NetView — 网络设备统一管理平台</title>
    <style>${cssCode}</style>
    <script>
    // Load ESM module via Blob URL to avoid CORS issues with file:// protocol
    (function() {
      var jsCode = ${JSON.stringify(jsCode)};
      var blob = new Blob([jsCode], { type: 'application/javascript' });
      var url = URL.createObjectURL(blob);
      var script = document.createElement('script');
      script.type = 'module';
      script.src = url;
      document.head.appendChild(script);
    })();
    </script>
  </head>
  <body>
    <div id="root"></div>
  </body>
</html>`;

const outputPath = `${distDir}/bundle.html`;
writeFileSync(outputPath, bundleHtml);
console.log(`Bundle created: ${outputPath} (${(Buffer.byteLength(bundleHtml) / 1024).toFixed(0)} KB)`);
