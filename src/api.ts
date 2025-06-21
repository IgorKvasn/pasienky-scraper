import express from 'express';
import * as fs from 'fs';
import * as path from 'path';
import { scrapeSchedule } from './index';

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware to parse JSON
app.use(express.json());

// GET /api/swim-timetable endpoint
app.get('/api/swim-timetable', async (req: any, res: any) => {
    try {
        const { date } = req.query;

        // Validate date parameter
        if (!date || typeof date !== 'string') {
            return res.status(400).json({
                error: 'Date parameter is required in format dd-mm-yyyy'
            });
        }

        // Validate date format
        const dateRegex = /^\d{2}-\d{2}-\d{4}$/;
        if (!dateRegex.test(date)) {
            return res.status(400).json({
                error: 'Date must be in format dd-mm-yyyy'
            });
        }

        const jsonFilePath = path.join(__dirname, '../downloads/schedule_results.json');

        // Check if schedule_results.json exists
        if (!fs.existsSync(jsonFilePath)) {
            console.log('Schedule results file not found, running scrapeSchedule...');
            await scrapeSchedule();
        }

        // Read the JSON file
        const jsonData = fs.readFileSync(jsonFilePath, 'utf8');
        const scheduleData = JSON.parse(jsonData);

        // Convert query date format (dd-mm-yyyy) to match stored format (dd.mm.yyyy)
        const queryDateParts = date.split('-');
        const formattedDate = `${queryDateParts[0]}.${queryDateParts[1]}.${queryDateParts[2]}`;

        // Convert dates to Date objects for comparison
        const startDate = new Date(formattedDate.split('.').reverse().join('-') + 'T00:00:00');
        console.log('startDate', startDate);
        // Filter results to include all dates from the start date onwards
        const filteredResults = scheduleData.results.filter((result: any) => {
            const resultDate = new Date(result.date.split('.').reverse().join('-') + 'T00:00:00');
            console.log('resultDate', (result.date.split('.').reverse().join('-') + 'T00:00:00') + ' - ' + resultDate.getTime() + ' - ' + (resultDate >= startDate));
            
            return resultDate >= startDate;
        });

        res.json({
            startDate: formattedDate,
            results: filteredResults,
            count: filteredResults.length,
            timestamp: scheduleData.timestamp
        });


    } catch (error) {
        console.error('Error in /api/swim-timetable:', error);
        res.status(500).json({
            error: 'Internal server error',
            message: error instanceof Error ? error.message : 'Unknown error'
        });
    }
});

// Health check endpoint
app.get('/health', (req: any, res: any) => {
    res.json({ status: 'OK', timestamp: new Date().toISOString() });
});

export { app, PORT }; 