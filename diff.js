// diff.js

const fs = require('fs');
const path = require('path');

// Get both folder paths from the command-line arguments
const [folder1, folder2] = process.argv.slice(2);

if (!folder1 || !folder2) {
    console.error('Usage: node diff <folder1> <folder2>');
    process.exit(1);
}

const fullPath1 = path.resolve(folder1);
const fullPath2 = path.resolve(folder2);

// Validate directories
if (!fs.existsSync(fullPath1) || !fs.lstatSync(fullPath1).isDirectory()) {
    console.error(`"${fullPath1}" is not a valid directory.`);
    process.exit(1);
}

if (!fs.existsSync(fullPath2) || !fs.lstatSync(fullPath2).isDirectory()) {
    console.error(`"${fullPath2}" is not a valid directory.`);
    process.exit(1);
}

// Read JSON files in both directories
function getJsonFilenames(folderPath) {
    return fs
        .readdirSync(folderPath)
        .filter(file => path.extname(file).toLowerCase() === '.json');
}

const files1 = getJsonFilenames(fullPath1);
const files2 = getJsonFilenames(fullPath2);

// Find common files
const set2 = new Set(files2);
const commonFiles = files1.filter(file => set2.has(file));

// Display results
console.log(`Number of common JSON files: ${commonFiles.length}`);
if (commonFiles.length > 0) {
    console.log('Common files:');
    commonFiles.forEach(file => console.log(`- ${file}`));
}
