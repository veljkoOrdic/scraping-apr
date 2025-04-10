const fs = require('fs');
const csv = require('csv-parser');
const { exec } = require('child_process');

function runCommand(scraper, carUrl, dealerId, carId) {
    return new Promise((resolve, reject) => {
        const command = `node ${scraper} ${carUrl} ${dealerId} ${carId}`;
        //const command = `node source-example.js ${carUrl}`;
        exec(command, (error, stdout, stderr) => {
            if (error) {
                reject(`Error executing command: ${error.message}`);
                return;
            }
            if (stderr) {
                reject(`stderr: ${stderr}`);
                return;
            }
            console.log(`stdout: ${stdout}`);
            resolve(stdout);
        });
    });
}

// Read the CSV file and execute the command for each row
async function processCSV(filePath, scraper, target_dir) {
    const results = [];

    fs.createReadStream(filePath)
        .pipe(csv())
        .on('data', (row) => {
            const cleanedRow = {};
            for (let key in row) {
                cleanedRow[key.trim()] = row[key];
            }
            results.push(cleanedRow);
        })
        .on('end', async () => {
            for (let row of results) {
                const carUrl = row['url'];
                const dealerId = row['dealer_id'];
                const carId = row['car_id'];
                let filePath = target_dir +'/'+ dealerId + '-' + carId + '.json';
                if (fs.existsSync(filePath)) {
                    console.log('This file exist: ' + filePath);
                    return;
                }
                console.log(`Processing car: ${carUrl}, Dealer ID: ${dealerId}, Car ID: ${carId}`);

                try {
                    // Wait for the command to finish before moving on to the next row
                    await runCommand(scraper, carUrl, dealerId, carId);
                    console.log('Command executed successfully.');
                } catch (error) {
                    console.error(`Failed to execute command: ${error}`);
                }
            }
            console.log('All commands processed.');
        });
}

const path = process.argv[2];
const scraper = process.argv[3];
const target_dir = process.argv[4];
processCSV(path, scraper, target_dir);
