// calculate.js

const fs = require('fs');
const path = require('path');

// Get the folder path from the command-line argument
const folderPath = process.argv[2];

if (!folderPath) {
    console.error('Please provide a folder path. Usage: node calculate <folderPath>');
    process.exit(1);
}

const fullPath = path.resolve(folderPath);

// Check if the folder exists
if (!fs.existsSync(fullPath)) {
    console.error(`Folder "${fullPath}" does not exist.`);
    process.exit(1);
}

// Read the directory and count .json files
fs.readdir(fullPath, (err, files) => {
    if (err) {
        console.error('Error reading the directory:', err.message);
        process.exit(1);
    }

    const jsonFiles = files.filter(file => path.extname(file).toLowerCase() === '.json');
    console.log(`Number of JSON files in "${folderPath}": ${jsonFiles.length}`);
});
