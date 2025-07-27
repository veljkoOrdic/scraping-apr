const fs = require('fs');
const path = require('path');
const mysql = require('mysql2');
const csv = require('csv-parser');

// MySQL connection
const connection = mysql.createConnection({
    host: '136.243.15.44',
    user: 'guilhermeCS',
    password: 'xFdt77&1',
    database: 'db_internal',
    charset: 'utf8',
    namedPlaceholders: true
});

connection.connect(err => {
    if (err) {
        console.error('MySQL connection error:', err);
        process.exit(1);
    }
    console.log('Connected to MySQL database.');
});

// CSV Import Logic
function importCSV(filePath, tableName) {
    // const tableName = 'cc_finance_csv_codeweaver';
    const rows = [];
    let lineNumber = 1;

    fs.createReadStream(filePath)
        .pipe(csv({mapHeaders: ({header}) => header.trim()}))
        .on('data', (row) => {
            lineNumber++;
            try {
                const dealer_id = parseInt(row.dealer_id?.trim());
                const rounded_price = row.rounded_price?.trim() === '' ? 0 : parseInt(row.rounded_price?.trim());
                const car_id = parseInt(row.car_id?.trim());
                const price = row.price?.trim() === '' ? 0 : parseInt(row.price?.trim());
                const url = row.url?.trim();

                if (
                    isNaN(dealer_id) ||
                    isNaN(rounded_price) ||
                    isNaN(car_id) ||
                    isNaN(price) ||
                    !url
                ) {
                    console.warn(`Skipping invalid row at line ${lineNumber}:`, row);
                    return;
                }

                rows.push({
                    dealer_id,
                    rounded_price,
                    car_id,
                    price,
                    url
                });
            } catch (err) {
                console.error(`Error parsing row at line ${lineNumber}:`, err);
            }
        })
        .on('end', () => {
            console.log(`Parsed ${rows.length} valid rows. Inserting into database...`);
            insertRows(rows, tableName);
        })
        .on('error', err => {
            console.error('Error reading CSV:', err);
            connection.end(() => process.exit(1));
        });
}

function insertRows(rows, tableName) {
    const query = `
        REPLACE
        INTO \`${tableName}\` 
        (dealer_id, rounded_price, car_id, price, url) 
        VALUES (?, ?, ?, ?, ?)
    `;

    let completed = 0;

    rows.forEach((row, index) => {
        const values = [row.dealer_id, row.rounded_price, row.car_id, row.price, row.url];
        connection.execute(query, values, (err, result) => {
            completed++;
            if (err) {
                console.error(`Error inserting row ${index + 1}:`, err.message);
            } else {
                console.log(`Inserted row ${index + 1}/${rows.length}`);
            }

            if (completed === rows.length) {
                console.log('Finished importing CSV.');
                connection.end(() => process.exit(0));
            }
        });
    });
}

// Run script with file path argument
const csvPath = process.argv[2];
const tableName = process.argv[3];
if (!csvPath || !tableName) {
    console.error('Usage: node impors-csv.js csvPath tableName, something is not correct');
    process.exit(1);
}

if (!fs.existsSync(csvPath)) {
    console.error('CSV file does not exist:', csvPath);
    process.exit(1);
}

importCSV(csvPath, tableName);
