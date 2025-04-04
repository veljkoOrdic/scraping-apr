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