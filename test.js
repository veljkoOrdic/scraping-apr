const fs = require('fs');
const path = require('path');

const inputDir = path.join(__dirname, 'data/fp');
const outputDir = path.join(__dirname, 'data/fp-test');

// 1. Empty the output directory first
if (fs.existsSync(outputDir)) {
    fs.readdirSync(outputDir).forEach(file => {
        fs.unlinkSync(path.join(outputDir, file));
    });
    console.log(`🧹 Cleaned: ${outputDir}`);
} else {
    fs.mkdirSync(outputDir, {recursive: true});
}

// 2. Process files
const files = fs.readdirSync(inputDir).filter(f => f.endsWith('.json'));

files.forEach(file => {
    const inputPath = path.join(inputDir, file);
    const raw = fs.readFileSync(inputPath, 'utf8');

    let entries;
    try {
        entries = JSON.parse(raw);
    } catch (e) {
        console.error(`❌ Invalid JSON in ${file}`);
        return;
    }

// Remove not_found entries first
    const filteredEntries = entries.filter(entry => entry.data?.type !== 'not_found');

// Skip file if nothing remains after removing not_found
    if (filteredEntries.length === 0) {
        console.log(`⏭️ Skipped (only not_found): ${file}`);
        return;
    }

    // cleaned entry, save representative if exist, if not save normal HP and PCP
    const cleaned = filteredEntries.map(entry => {
        if (!Array.isArray(entry.data)) return entry;

        const hasRepHP = entry.data.some(item => item.finance_type === 'HP' && item.is_representative);
        const hasRepPCP = entry.data.some(item => item.finance_type === 'PCP' && item.is_representative);

        entry.data = entry.data.filter(item => {
            if (item.finance_type === 'HP') {
                return hasRepHP ? item.is_representative : true;
            }
            if (item.finance_type === 'PCP') {
                return hasRepPCP ? item.is_representative : false;
            }
            return item.type === 'vehicle';
        });

        return entry;
    });


    const isEmpty = cleaned.every(e => !Array.isArray(e.data) || e.data.length === 0);
    if (isEmpty) {
        console.log(`⏭️ Skipped (empty after filtering): ${file}`);
        return;
    }

    const outputPath = path.join(outputDir, file);
    fs.writeFileSync(outputPath, JSON.stringify(cleaned, null, 2), 'utf8');
    console.log(`✅ Saved: ${file}`);
});
