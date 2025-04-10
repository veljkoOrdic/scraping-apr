# APR Puppeteer Project

This project uses Puppeteer to navigate websites and extract data about APR rates.

## Requirements

This project requires Node.js v23.

## Installation

### Install NVM on Ubuntu

```bash
# Update your system
sudo apt update
sudo apt install -y curl

# Install NVM
curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.39.7/install.sh | bash

# Load NVM in current shell
export NVM_DIR="$([ -z "${XDG_CONFIG_HOME-}" ] && printf %s "${HOME}/.nvm" || printf %s "${XDG_CONFIG_HOME}/nvm")"
[ -s "$NVM_DIR/nvm.sh" ] && \. "$NVM_DIR/nvm.sh"

# Verify NVM installation
nvm --version
```

You may need to restart your terminal or run `source ~/.bashrc` to complete the installation.

### Install Node.js 23

```bash
# Install Node.js 23
nvm install 23

# Use Node.js 23
nvm use 23

# Verify Node.js version
node --version
```

### Set up the project

1. Clone the repository
2. Install dependencies:
```
npm install
```

## Project Structure

- `lib/` - Core library files
    - `MyPuppeteer.js` - Main wrapper around Puppeteer with plugin support

- `plugins/` - Plugin implementations
    - `IPlugin.js` - Base interface for plugins
    - `LoggerPlugin.js` - Plugin for logging requests and responses
    - `ProxyPlugin.js` - Plugin for managing proxies

- `test.js` - Simple test script for monitoring requests
- `example.js` - Example usage of the basic MyPuppeteer
- `example-stealth.js` - Example with stealth plugin configuration

## Features

### Stealth Mode

This project uses `puppeteer-extra-plugin-stealth` to avoid bot detection. The stealth plugin includes the following evasion techniques:

- chrome.app
- chrome.csi
- chrome.loadTimes
- chrome.runtime
- iframe.contentWindow
- media.codecs
- navigator.hardwareConcurrency
- navigator.languages
- navigator.permissions
- navigator.plugins
- navigator.vendor
- navigator.webdriver
- sourceurl
- webgl.vendor
- window.outerdimensions

You can configure stealth options when creating a MyPuppeteer instance:

```javascript
const browser = new MyPuppeteer({
  stealthOptions: {
    disabledEvasions: ['navigator.webdriver', 'navigator.plugins'],
    userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36...',
    languages: ['en-US', 'en']
  }
});
```

### Plugin System

The custom Puppeteer wrapper supports plugins for various functionality:

```javascript
// Create a browser instance
const browser = new MyPuppeteer();

// Add plugins
browser.addPlugin(new LoggerPlugin());
browser.addPlugin(new ProxyPlugin({
  proxies: ['http://user:pass@proxy.example.com:8080']
}));

// Open a URL
await browser.open('https://example.com');
```

### Proxy Support

The `ProxyPlugin` provides support for using and rotating proxies:

```javascript
const proxyPlugin = new ProxyPlugin({
  proxies: [
    'http://user:pass@proxy1.example.com:8080',
    'http://user:pass@proxy2.example.com:8080'
  ],
  rotateOnStatus: [403, 429, 503],  // Rotate on these status codes
  rotateInterval: 60 * 60 * 1000     // Rotate every hour
});
```

## Usage

Run the test script to see network requests from a URL:
```
npm test
```

Or run with a specific URL:
```
node test.js https://example.com
```

Run the stealth example:
```
node example-stealth.js
```


### SQL Queries for Plugin and Dealer Analysis

To check which dealers use which plugins, use the following SQL:

```sql
INSERT INTO cc_car_finance_plugin_dealer
SELECT c.dealer_id, plugins, COUNT(*) AS cars
FROM `cc_finance_plugin_check` p
         INNER JOIN admin_guilherme.cc_scrapped_car c ON c.id=p.car_id
GROUP BY 1,2;
```

To get live cars for a specific plugin, use the following SQL:

```sql
SET @plugins='NewvehicleFinance';
SELECT t.*, s.price, vehicle.url
FROM (
         SELECT dealer_id, rounded_price, MIN(car_id) AS car_id FROM
             (
                 SELECT p.dealer_id, s.id AS car_id, price, FLOOR(s.price / 5000) * 5000 AS rounded_price
                 FROM `cc_car_finance_plugin_dealer` p
                          INNER JOIN db_live.sale s ON s.dealer_id=p.dealer_id
                 WHERE p.plugins=@plugins
             ) AS t
         GROUP BY 1,2) AS t
         INNER JOIN db_live.sale s ON s.id=t.car_id
         INNER JOIN db_live.vehicle ON t.car_id=vehicle.id;
```



### Steps to Process Cars:

1. **Save the processed cars to a CSV file**:
  - Use the SQL query to fetch the required car data and save the output to a CSV file (e.g., `data/cars.csv`).

2. **Process the CSV file**:
  - Run the `scrape-csv.js` script with the required arguments: the path to the CSV file, the scraper script, and the target directory.
  - Ensure the target directory exists before running the script.

3. **Import the saved files into the database**:
  - Use the `import-folder.js` script to import the JSON files from the target directory into the database.

### Example Commands:

1. **Run the SQL query and save the output to `data/cars.csv`**:
  - Use a database client or script to export the query results to a CSV file.

2. **Run the `scrape-csv.js` script**:
   ```bash
   mkdir -p data/nw
   node scrape-csv.js data/cars.csv newvehicle.js data/nw
   ```

3. **Import the JSON files into the database**:
   ```bash
   node import-folder.js data/nw
   ```