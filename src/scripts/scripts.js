import fs from 'fs';
import lighthouse from 'lighthouse';
import * as chromeLauncher from 'chrome-launcher';
import path from 'path';
import { Data } from '../testdata/data.js';

(async () => {
    const chrome = await chromeLauncher.launch({ chromeFlags: ['--headless'] });

    const conditions = [
        { label: '4G', downloadThroughputKbps: 1600, uploadThroughputKbps: 750, latencyMs: 20 },
        { label: '5Mbps', downloadThroughputKbps: 5000, uploadThroughputKbps: 1000, latencyMs: 50 },
        { label: '256Kbps', downloadThroughputKbps: 256, uploadThroughputKbps: 256, latencyMs: 300 }
    ];

    const commonOptions = {
        logLevel: 'info',
        output: 'html',
        onlyCategories: ['performance', 'accessibility'],
        port: chrome.port,
    };

    for (const condition of conditions) {
        for (const formFactor of ['desktop', 'mobile']) {
            const options = {
                ...commonOptions,
                emulatedFormFactor: formFactor,
                throttling: {
                    cpuSlowdownMultiplier: 4,
                    ...condition
                },
                screenEmulation: {
                    width: formFactor === 'desktop' ? 1366 : 360,
                    height: formFactor === 'desktop' ? 768 : 640,
                    deviceScaleFactor: formFactor === 'desktop' ? 1 : 2,
                    disabled: false,
                },
            };

            const runnerResult = await lighthouse(Data.Website.Amazon, options);
            const reportHtml = runnerResult.report;

            const subfolder = 'puppeteer-report';
            if (!fs.existsSync(subfolder)) {
                fs.mkdirSync(subfolder);
            }

            const reportFileName = `${formFactor}_${condition.label}_report.html`;
            const reportFilePath = path.join(subfolder, reportFileName);

            const combinedHtmlContent = `
            <!DOCTYPE html>
            <html>
            <head>
                <title>Lighthouse Report</title>
                <style>
                    body {
                        text-align: center;
                        font-family: 'Roboto', sans-serif; 
                    }
                    h1 {
                        margin-top: 20px;
                        text-align: center;
                        font-size: 24px; 
                        font-family: 'Roboto', sans-serif; 
                        color: #333;
                    }
                </style>
                <!-- Include Roboto font from Google Fonts -->
                <link href="https://fonts.googleapis.com/css2?family=Roboto:wght@400;700&display=swap" rel="stylesheet">
            </head>
            <body>
                <h1>${formFactor === 'desktop' ? 'Desktop' : 'Mobile'} ${condition.label} Report</h1>
                ${reportHtml}
            </body>
            </html>
        `;

            fs.writeFileSync(reportFilePath, combinedHtmlContent);

            console.log(`${formFactor === 'desktop' ? 'Desktop' : 'Mobile'} ${condition.label} Performance score:`, runnerResult.lhr.categories.performance.accessibility);
        }
    }

    await chrome.kill();
})();
