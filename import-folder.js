const fs = require('fs');
const path = require('path');
const mysql = require('mysql2');

// MySQL connection
const connection = mysql.createConnection({
    charset: 'utf8',
    namedPlaceholders: true // Enable named placeholders
});

connection.connect(err => {
    if (err) {
        console.error('MySQL connection error:', err);
        process.exit(1);
    }
    console.log('Connected to MySQL database.');
});

// Function to import a single file
function importFile(filePath) {
    try {
        const content = JSON.parse(fs.readFileSync(filePath, 'utf-8'));
        processData(content);
    } catch (err) {
        console.error(`Error processing file ${filePath}:`, err);
    }
}

function sanitizeParams(params) {
    // Replace undefined values with null (handles nested objects)
    Object.keys(params).forEach(key => {
        if (params[key] === undefined) {
            params[key] = null;
        } else if (typeof params[key] === 'object' && params[key] !== null) {
            params[key] = sanitizeParams(params[key]); // Recursively sanitize nested objects
        }
    });
    return params;
}
function prepareColumns(params, prefix) {
    params = sanitizeParams(params)
    const columns = Object.keys(params).join(', ');
    const placeholders = Object.keys(params).map(() => '?').join(', ');
    const values = Object.values(params);

    const query = `${prefix} (${columns}) VALUES (${placeholders})`;
    return { query, values };
}

// Example usage in storeVehicle
function storeVehicle(entry, vehicleData) {
    const date = new Date(entry.timestamp).toISOString().split('T')[0]; // Extract date in YYYY-MM-DD format
    let params = {
        car_id: entry.car_id,
        date: date,
        dealer_id: entry.dealer_id,
        url: entry.url,
        vehicle_type: vehicleData.type,
        make: vehicleData.manufacturer,
        model: vehicleData.model,
        body: vehicleData.variant,
        derivative: vehicleData.derivative,
        plate: vehicleData.registration_number,
        year: vehicleData.registration_date,
        mileage: vehicleData.mileage,
        status: vehicleData.status,
    };

    const { query, values } = prepareColumns(params, 'REPLACE INTO cc_finance_car_data');
    connection.execute(query, values, (err, result) => {
        if (err) {
            console.error(`Insert error for car ${entry.car_id}:`, err.message);
        } else {
            console.log(`Saved: car_id=${entry.car_id}`);
        }
    });
}
// Function to store data into the database
function storeFinance(entry,  financeEntry) {
    const date = new Date(entry.timestamp).toISOString().split('T')[0]; // Extract date in YYYY-MM-DD format
    const params = {
        dealer_id: entry.dealer_id,
        date:date,
        car_id: entry.car_id,
        source: entry.source,
        type: financeEntry.type,
        name: financeEntry.name,
        finance_type: financeEntry.finance_type,
        cash_price: financeEntry.cash_price,
        total_price: financeEntry.total_price,
        deposit: financeEntry.deposit,
        balance: financeEntry.balance,
        apr: financeEntry.apr,
        rate_of_interest: financeEntry.rate_of_interest,
        term: financeEntry.term,
        regular_payment: financeEntry.regular_payment,
        final_payment: financeEntry.final_payment,
        total_amount_payable: financeEntry.total_amount_payable,
        total_charge_for_credit: financeEntry.total_charge_for_credit,
        amount_of_credit: financeEntry.amount_of_credit,
        lender: financeEntry.lender,
        annual_mileage: financeEntry.annual_mileage,
        contract_mileage: financeEntry.contract_mileage || null,
        excess_mileage_rate: financeEntry.excess_mileage_rate,
        residual: financeEntry.residual,
        price_to_buy: financeEntry.price_to_buy || null
    };

    const { query, values } = prepareColumns(params, 'REPLACE INTO  cc_finance_finance_data');
    connection.execute(query, values, (err, result) => {
        if (err) {
            console.error(`Insert error for car ${entry.car_id}:`, err.message);
            console.log(params)
        } else {
            console.log(`Saved: Finance car_id=${entry.car_id}, type=${financeEntry.type}`);
        }
    });

}

// Function to process car data and insert into database
function processData(contents) {
    contents.forEach(entry => {
        const vehicleData = entry.data.find(d => d.type === 'vehicle');
        if (!vehicleData) {
            console.log(`No vehicle data found in entry: ${entry.car_id}`);
            return;
        }
        storeVehicle(entry, vehicleData);

        const financeEntries = entry.data.filter(d => d.type.startsWith('finance_'));
        if (financeEntries.length === 0) {
            console.log(`No finance data found in entry: ${entry.car_id}`);
            return;
        }

        financeEntries.forEach(financeEntry => {
            storeFinance(entry,  financeEntry);
        });
    });
}

// Main script logic
const directoryPath = process.argv[2];
if (!directoryPath) {
    console.error('Please provide a directory path as the first argument.');
    process.exit(1);
}


if (!fs.existsSync(directoryPath)) {
    console.error('Provided directory does not exist.');
    process.exit(1);
}

fs.readdir(directoryPath, (err, files) => {
    if (err) {
        console.error('Unable to scan directory:', err);
        process.exit(1);
    }

    const jsonFiles = files.filter(file => file.endsWith('.json'));
    if (jsonFiles.length === 0) {
        console.log('No JSON files found in the directory.');
        connection.end(() => process.exit(0)); // Close the connection and exit
        return;
    }

    jsonFiles.forEach((file, index) => {
        const filePath = path.join(directoryPath, file);
        importFile(filePath);

        // If it's the last file, close the connection and exit
        if (index === jsonFiles.length - 1) {
            connection.end(() => process.exit(0));
        }
    });
});