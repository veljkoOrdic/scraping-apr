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

connection.query(`
  CREATE TABLE IF NOT EXISTS cc_car_finance_data (
      id INT AUTO_INCREMENT PRIMARY KEY,
      dealer_id VARCHAR(255),
      car_id VARCHAR(255),
      url TEXT,
      source VARCHAR(255),
      vehicle_type VARCHAR(255),
      make VARCHAR(255),
      model VARCHAR(255),
      body VARCHAR(255),
      derivative VARCHAR(255),
      plate VARCHAR(255),
      year VARCHAR(255),
      mileage INT,
      status VARCHAR(255),
      type VARCHAR(255),
      name VARCHAR(255),
      finance_type VARCHAR(255),
      cash_price DECIMAL(10,2),
      total_price DECIMAL(10,2),
      deposit DECIMAL(10,2),
      balance DECIMAL(10,2),
      apr DECIMAL(5,2),
      rate_of_interest DECIMAL(5,2),
      term INT,
      regular_payment DECIMAL(10,2),
      final_payment DECIMAL(10,2),
      total_amount_payable DECIMAL(10,2),
      total_charge_for_credit DECIMAL(10,2),
      amount_of_credit DECIMAL(10,2),
      lender VARCHAR(255),
      annual_mileage INT,
      contract_mileage INT,
      excess_mileage_rate DECIMAL(5,2),
      residual DECIMAL(10,2),
      price_to_buy DECIMAL(10,2)
  )
`, (err) => {
    if (err) {
        console.error('Error creating table:', err);
        return;
    }

    const directoryPath = path.join(__dirname, 'data');

    // Check if directory exists
    if (!fs.existsSync(directoryPath)) {
        console.error('Data directory not found.');
        // Process single file from the script itself
        processTestData();
        return;
    }

    fs.readdir(directoryPath, (err, files) => {
        if (err) {
            console.error('Unable to scan directory:', err);
            return;
        }

        // Test inserting in database
        // processTestData();
        // return;

        files.forEach(file => {
            if (file.endsWith('.json')) {
                const filePath = path.join(directoryPath, file);
                try {
                    const content = JSON.parse(fs.readFileSync(filePath, 'utf-8'));
                    processData(content, file);
                } catch (err) {
                    console.error(`Error processing file ${file}:`, err);
                }
            }
        });
    });
});

// Function to process test data (used when no directory available)
function processTestData() {
    const testEntry = {
        timestamp: '2025-04-09T11:12:19.122Z',
        source: 'codeweavers_calculator',
        url: 'https://www.perrys.co.uk/used/peugeot/508/16-hybrid-225-allure-5dr-e-eat8-estate/milton-keynes/buckinghamshire/21308663',
        dealer_id: '15',
        car_id: '24879586',
        data: [
            {
                type: 'vehicle',
                manufacturer: 'Peugeot',
                model: '508',
                variant: 'SW ESTATE',
                derivative: '1.6 Hybrid 225 Allure e-EAT8',
                registration_number: 'KV24LZO',
                registration_date: '22/03/2024',
                mileage: 8719,
                status: 'PreOwned'
            },
            {
                type: 'finance_hp',
                name: 'HP',
                finance_type: 'Hire Purchase',
                cash_price: 31494,
                total_price: 31494,
                deposit: 3149.4,
                balance: 28344.6,
                apr: 9.9,
                rate_of_interest: 5.18,
                term: 60,
                regular_payment: 594.76,
                final_payment: 604.76,
                total_amount_payable: 38845,
                total_charge_for_credit: 7351,
                amount_of_credit: 28344.6,
                lender: 'Northridge Finance',
                annual_mileage: 10000,
                excess_mileage_rate: 0,
                residual: 0
            },
            {
                type: 'finance_pcp',
                name: 'PCP',
                finance_type: 'PCP',
                cash_price: 31494,
                total_price: 31494,
                deposit: 3149.4,
                balance: 28344.6,
                apr: 9.9,
                rate_of_interest: 9.47,
                term: 48,
                regular_payment: 546.05,
                final_payment: 9705,
                total_amount_payable: 39064.8,
                total_charge_for_credit: 7570.8,
                amount_of_credit: 28344.6,
                lender: 'Northridge Finance',
                annual_mileage: 10000,
                contract_mileage: 40000,
                excess_mileage_rate: 22,
                residual: 9695,
                price_to_buy: 9705
            }
        ]
    };

    processData([testEntry], 'test_data');
}

// Function to process car data and insert into database
function processData(contents, filename) {
    if (!Array.isArray(contents)) {
        contents = [contents]; // Convert to array if single object
    }

    contents.forEach(entry => {
        // Find vehicle data
        const vehicleData = entry.data.find(d => d.type === 'vehicle');
        if (!vehicleData) {
            console.log(`No vehicle data found in entry: ${entry.car_id}`);
            return;
        }

        // Find finance entries
        const financeEntries = entry.data.filter(d => d.type.startsWith('finance_'));
        if (financeEntries.length === 0) {
            console.log(`No finance data found in entry: ${entry.car_id}`);
            return;
        }

        // Process each finance type for this car
        financeEntries.forEach(financeEntry => {
            const params = {
                dealer_id: entry.dealer_id,
                car_id: entry.car_id,
                url: entry.url,
                source: entry.source,

                // Vehicle data
                vehicle_type: vehicleData.type,
                make: vehicleData.manufacturer,
                model: vehicleData.model,
                body: vehicleData.variant,
                derivative: vehicleData.derivative,
                plate: vehicleData.registration_number,
                year: vehicleData.registration_date,
                mileage: vehicleData.mileage,
                status: vehicleData.status,

                // Finance data - we include all possible fields
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

            // Create placeholder for fields
            const fields = Object.keys(params).join(', ');
            const placeholders = Object.keys(params).map(() => '?').join(', ');
            const values = Object.values(params);

            // Insert into database
            connection.query(
                `INSERT INTO cc_car_finance_data (${fields}) VALUES (${placeholders})`,
                values,
                (err, result) => {
                    if (err) {
                        console.error(`Insert error for car ${entry.car_id}, finance type ${financeEntry.type}:`, err.message);
                    } else {
                        console.log(`Inserted: car_id=${entry.car_id}, finance_type=${financeEntry.type}, ID=${result.insertId}`);
                    }
                }
            );
        });
    });
}