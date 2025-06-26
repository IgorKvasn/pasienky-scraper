import puppeteer from 'puppeteer';
import cron from 'node-cron';
import * as fs from 'fs';
import * as path from 'path';
import { parseExcel } from './parse-excel';
import { app, PORT } from './api';

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
    user_pref("browser.helperApps.neverAsk.saveToDisk", "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet,application/vnd.ms-excel");
    user_pref("pdfjs.disabled", true);
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

        // Navigate to the Google Sheets page
        // try {
        //     await page.goto(scheduleLink, { 
        //         waitUntil: 'networkidle0', 
        //         timeout: 30000 
        //     });
        //     console.log('Navigated to the Google Sheets page');
        // } catch (error) {
            // console.error('Navigation failed, retrying with longer timeout...');
            await page.goto(scheduleLink, { 
                waitUntil: 'domcontentloaded', 
                timeout: 60000 
            });
            console.log('Navigation completed with fallback method');
        // }
        
        // Wait for the sheet to load
        await page.waitForSelector('.docs-sheet-container', { timeout: 30000 });
        console.log('docs-sheet-container');
        // Click the File menu
         await page.waitForSelector('#docs-file-menu');
         await page.click('#docs-file-menu');
        
        await page.waitForSelector('span[aria-label="Stiahnuť d"]');
        await page.click('span[aria-label="Stiahnuť d"]');

         await page.waitForSelector('span[aria-label="Microsoft Excel (.xlsx) x"]');
         console.log('idem stahovat subor');
         await page.click('span[aria-label="Microsoft Excel (.xlsx) x"]');
        

        // // Wait for and click Download
        // await page.waitForSelector('div[role="menuitem"]:has-text("Download")');
        // await page.click('div[role="menuitem"]:has-text("Download")');

        // // Wait for and click Excel format
        // await page.waitForSelector('div[role="menuitem"]:has-text("Microsoft Excel")');
        // await page.click('div[role="menuitem"]:has-text("Microsoft Excel")');

        // Wait for the Excel file to download
        await new Promise(resolve => setTimeout(resolve, 5000));

        // Find the downloaded Excel file
        const files = fs.readdirSync(DOWNLOAD_DIR);
        const excelFile = files.find(file => file.endsWith('.xlsx') || file.endsWith('.xls'));

    
        if (!excelFile) {
            throw new Error('Excel file not found in downloads');
        }

        console.log('Excel file found:', excelFile);

        const results = await parseExcel(path.join(DOWNLOAD_DIR, excelFile));
        
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

        // Clean up downloaded file
        // fs.unlinkSync(path.join(DOWNLOAD_DIR, excelFile));

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