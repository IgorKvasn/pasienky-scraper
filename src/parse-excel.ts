export async function parseExcel(filepath: string) {
    console.log('Parsing Excel file:', filepath);
    const xlsx = require('xlsx');

    // Load workbook and sheet
    const workbook = xlsx.readFile(filepath);
    const sheet = workbook.Sheets['VEREJNOSŤ DRÁHY'];
    const data = xlsx.utils.sheet_to_json(sheet, { header: 1, raw: false });
    
    // Days in Slovak for matching
    const days = ['pondelok', 'utorok', 'streda', 'štvrtok', 'piatok', 'sobota', 'nedeľa'];
    
    const results: Array<{date: string, data: string[]}> = [];
    
    for (let i = 0; i < data.length; i++) {
        const row = data[i];
        const cell = row[0];
    
        if (typeof cell === 'string') {
            const text = cell.toLowerCase().replace(/\n/g, ' ').trim();
            const dayMatch = days.find(day => text.startsWith(day));
    
            if (dayMatch) {
                // Extract date from string, e.g., "pondelok 9.6.2025"
                const dateMatch = text.match(/\b\d{1,2}\.\d{1,2}\.\d{4}\b/);
                const date = dateMatch ? dateMatch[0] : null;
    
                if (!date) continue;
    
                // Find the next "voľné dráhy" row
                for (let j = i + 1; j < data.length; j++) {
                    const nextRow = data[j];
                    if (typeof nextRow[0] === 'string' && nextRow[0].toLowerCase().includes('voľné dráhy')) {
                        const values = nextRow.slice(1, 5).map((v: any) => parseFloat(v) || 0); // first 4 columns (after label)
                        const allPositive = values.every((v: any) => v > 0);
    
                        // if (allPositive) {
                            console.log(`${date}:`);
                            console.log(nextRow.slice(1).map((v: any) => v || '').join(' | '));
                             
                            results.push({
                                date: date.split('.').reverse().map((part, index) => 
                                    index < 2 ? part.padStart(2, '0') : part
                                ).join('-'),
                                data: nextRow.slice(1).map((v: any) => v || '')
                            });
                        // }
                        break;
                    }
                }
            }
        }
    }
    
    return results;
}
