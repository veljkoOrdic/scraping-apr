const fs = require('fs');
const path = require('path');

const sourceDir = path.join(__dirname, 'data/cw');
const targetDir = path.join(__dirname, 'data/not_found_cw');

if (!fs.existsSync(targetDir)) {
    fs.mkdirSync(targetDir, {recursive: true});
}

fs.readdirSync(sourceDir).forEach(file => {
    if (path.extname(file) === '.json') {
        const filePath = path.join(sourceDir, file);
        try {
            const content = fs.readFileSync(filePath, 'utf-8');
            const data = JSON.parse(content);

            if (
                Array.isArray(data) &&
                data[0]?.data?.type === 'not_found'
            ) {
                const targetPath = path.join(targetDir, file);
                fs.renameSync(filePath, targetPath);
                console.log(`Moved: ${file}`);
            }
        } catch (err) {
            console.error(`Error processing ${file}:`, err.message);
        }
    }
});
