const fs = require('fs');
const path = require('path');

/**
 * Test extraction modules with test files
 */
async function testExtraction() {
  // Get command line arguments
  const extractorName = process.argv[2];
  if (!extractorName) {
    console.error('Usage: node test-extract.js <extractor_module_name> [test_file]');
    console.error('Example: node test-extract.js VrmExtract');
    console.error('Example: node test-extract.js CodeweaversV3Finance codeweavers_data.json');
    process.exit(1);
  }

  // Ensure the extractors name has .js extension
  const extractorFile = extractorName.endsWith('.js') ? extractorName : `${extractorName}.js`;
  const testFile = process.argv[3] || `extractors/test/${extractorName.replace(/\.js$/, '')}.txt`;

  try {
    // Load the extractors module
    const extractorPath = path.resolve(`./extractors/${extractorFile}`);
    console.log(`Loading extractor from: ${extractorPath}`);

    const ExtractorClass = require(extractorPath);

    if (!ExtractorClass) {
      console.error(`Failed to load extractor: ${extractorName}`);
      process.exit(1);
    }

    // Create an instance of the extractors
    const extractor = new ExtractorClass();

    // Load the test file
    const testFilePath = path.resolve(testFile);
    console.log(`Loading test file from: ${testFilePath}`);

    if (!fs.existsSync(testFilePath)) {
      console.error(`Test file not found: ${testFilePath}`);
      process.exit(1);
    }

    const content = fs.readFileSync(testFilePath, 'utf8');

    // Process the content
    console.log(`Processing with ${extractorName}...`);
    const result = extractor.process(content);

    // Output the result
    console.log('\nExtraction Result:');
    if (result) {
      console.log(JSON.stringify(result, null, 2));
      console.log('\nExtraction successful!');
    } else {
      console.log('No data extracted.');
    }
  } catch (error) {
    console.error('Error during extraction test:', error);
  }
}

// Run the test
testExtraction();