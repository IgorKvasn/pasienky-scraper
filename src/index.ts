import puppeteer from 'puppeteer';
import cron from 'node-cron';
import * as fs from 'fs';
import * as path from 'path';
import axios from 'axios';
import { parseExcel } from './parse-excel';
import { app, PORT } from './api';
import { arrayBuffer } from 'stream/consumers';

const BASE_URL = 'https://www.starz.sk/mestska-plavaren-pasienky/os-1002';
const DOWNLOAD_DIR = path.join(__dirname, '../downloads');
const FIREFOX_USER_DATA_DIR = '/tmp/firefox-profile';

// Ensure download directory exists
if (!fs.existsSync(DOWNLOAD_DIR)) {
    fs.mkdirSync(DOWNLOAD_DIR, { recursive: true });
}

export async function scrapeSchedule() {
    console.log('Starting schedule scraping...');
    // Create the profile directory and set preferences
    fs.mkdirSync(FIREFOX_USER_DATA_DIR, { recursive: true });
    fs.writeFileSync(
        path.join(FIREFOX_USER_DATA_DIR, 'user.js'),
        `
    user_pref("browser.download.folderList", 2);
    user_pref("browser.download.dir", "${DOWNLOAD_DIR}");
    user_pref("browser.helperApps.neverAsk.saveToDisk", "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet,application/vnd.ms-excel,application/octet-stream,application/zip,application/pdf");
    user_pref("browser.download.manager.showWhenStarting", false);
    user_pref("browser.download.useDownloadDir", true);
    user_pref("browser.download.panel.shown", false);
    user_pref("browser.download.always_ask_before_handling_new_types", false);
    user_pref("pdfjs.disabled", true);
    user_pref("browser.download.forbid_open_with", true);
    user_pref("browser.helperApps.alwaysAsk.force", false);
    user_pref("browser.download.manager.closeWhenDone", true);
    user_pref("browser.download.manager.focusWhenStarting", false);
    user_pref("browser.download.manager.alertOnEXEOpen", false);
    user_pref("browser.download.manager.showAlertOnComplete", false);
    user_pref("browser.download.manager.useWindow", false);
    user_pref("browser.download.manager.closeWhenDone", true);
    user_pref("browser.download.manager.showWhenStarting", false);
    user_pref("browser.download.manager.retention", 0);
    user_pref("browser.download.manager.scanWhenDone", false);
    user_pref("browser.download.manager.skipWinSecurityPolicyChecks", true);
    user_pref("browser.download.manager.alertOnEXEOpen", false);
    user_pref("browser.helperApps.neverAsk.openFile", "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet,application/vnd.ms-excel,application/octet-stream,application/zip,application/pdf");
    `
    );

    const browser = await puppeteer.launch({
        headless: true,
        browser: 'firefox',
        executablePath: '/usr/bin/firefox',
        args: [
            '--no-sandbox',
            '--disable-setuid-sandbox',
            '--window-size=1920,1080',
            // Set Firefox preferences for downloads
            '-profile', FIREFOX_USER_DATA_DIR,
        ],
    });

    try {
        console.log('Creating new page');
        const page = await browser.newPage();

        // Navigate to the main page
        await page.goto(BASE_URL, { waitUntil: 'networkidle0' });
        console.log('Navigated to the main page');
        // Find the link containing "VEREJNOSŤ - ROZPIS VOĽNÝCH DRÁH"
        const scheduleLink = await page.evaluate(() => {
            const links = Array.from(document.querySelectorAll('a'));
            const targetLink = links.find(link =>
                link.textContent?.includes('VEREJNOSŤ - ROZPIS VOĽNÝCH DRÁH')
            );
            return targetLink?.href;
        });

        if (!scheduleLink) {
            throw new Error('Schedule link not found');
        }

        console.log('Found schedule link:', scheduleLink);
     
        const outputFileName = path.join(DOWNLOAD_DIR, "downloaded_timetable.xlsx");
        await downloadSheetAsXLSX(scheduleLink, outputFileName);
        console.log('---stiahnute *- idem parsovat');
        const results = await parseExcel(outputFileName);

        // Save results to JSON file with timestamp
        const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
        const jsonFilename = `schedule_results.json`;
        const jsonPath = path.join(DOWNLOAD_DIR, jsonFilename);

        const outputData = {
            timestamp: new Date().toISOString(),
            results: results
        };

        fs.writeFileSync(jsonPath, JSON.stringify(outputData, null, 2));
        console.log(`Results saved to: ${jsonPath}`);


    } catch (error) {
        console.error('Error during scraping:', error);
    } finally {
        await browser.close();
    }
}

// Schedule the scraping to run every 12 hours
console.log('Scheduled scraping...');
cron.schedule('0 */12 * * *', () => {
    console.log('Running scheduled scraping...');
    scrapeSchedule();
});

// Start the Express server
app.listen(PORT, () => {
    console.log(`Express server listening on port ${PORT}`);
});

// Run immediately on startup
scrapeSchedule();

// parseExcel('/home/kvasnicka/data/projects/pasienky/downloads/MPP Rozpis.xlsx');

function extractFileId(url: string) {
    const regex = /\/d\/([a-zA-Z0-9-_]+)/;
    const match = url.match(regex);
    return match ? match[1] : null;
}

/**
 * Downloads a Google Sheets file as an XLSX.
 * @param {string} sheetUrl - The Google Sheets URL.
 * @param {string} destPath - Destination to save the XLSX file.
 */
async function downloadSheetAsXLSX(sheetUrl: string, destPath: string) {
    return new Promise(async (resolve, reject) => {
        const fileId = extractFileId(sheetUrl);

        if (!fileId) {
            console.error('❌ Could not extract file ID from the provided URL.');
            return;
        }

        const exportUrl = `https://docs.google.com/spreadsheets/d/${fileId}/export?format=xlsx`;

        try {
            const response = await axios.get(exportUrl, {
                responseType: 'stream',
            });

            const writer = fs.createWriteStream(destPath);

            response.data.pipe(writer);

            writer.on('finish', () => {
                console.log(`✅ File downloaded to ${destPath}`);
                resolve(destPath);
            });

            writer.on('error', (err) => {
                console.error('❌ Error writing file:', err);
                reject(err);
            });

        } catch (error: any) {
            console.error('❌ Error downloading file:', error.message);
            reject(error);
        }
    });
}

function waitForDownload(timeout = 15000): Promise<string> {
    return new Promise((resolve, reject) => {
        const start = Date.now();
        const interval = setInterval(() => {
            const files = fs.readdirSync(DOWNLOAD_DIR);
            const downloaded = files.find(f => f.endsWith('.xlsx') || f.endsWith('.xls'));
            if (downloaded) {
                clearInterval(interval);
                resolve(downloaded);
            } else if (Date.now() - start > timeout) {
                clearInterval(interval);
                reject(new Error('Download timeout'));
            }
        }, 500);
    });
}