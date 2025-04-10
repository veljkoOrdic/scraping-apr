const fs = require('fs');
const path = require('path');
const mysql = require('mysql2');

// MySQL connection
const connection = mysql.createConnection({
    host: '136.243.15.44',
    user: 'guilhermeCS',
    password: 'xFdt77&1',
    database: 'db_internal',
    charset: 'utf8'
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

function storeVehicle(entry, vehicleData) {
    const date = new Date(entry.timestamp).toISOString().split('T')[0]; // Extract date in YYYY-MM-DD format
    const params={
        date:date,
        dealer_id: entry.dealer_id,
        car_id: entry.car_id,
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
    }

    connection.execute(
        `REPLACE INTO cc_finance_car_data SET ?`,
        params,
        (err, result) => {
            if (err) {
                console.error(`Insert error for car ${entry.car_id}:`, err.message);
            } else {
                console.log(`Saved: car_id=${entry.car_id}`);
            }
        }
    );
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

    connection.execute(
        `INSERT INTO cc_finance_finance_data SET ?`,
        params,
        (err, result) => {
            if (err) {
                console.error(`Insert error for car ${entry.car_id}, finance type ${financeEntry.type}:`, err.message);
            } else {
                console.log(`Inserted: car_id=${entry.car_id}, finance_type=${financeEntry.type}, ID=${result.insertId}`);
            }
        }
    );
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

    files.forEach(file => {
        if (file.endsWith('.json')) {
            const filePath = path.join(directoryPath, file);
            importFile(filePath);
        }
    });
});