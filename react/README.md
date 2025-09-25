# Environmental Data Configuration Generator

A React-based web application for generating multiple environmental data configuration files from a single template. The app allows users to configure sources, pollutants, and emission rates to generate customized configuration files for different time intervals and years.

## 🔒 Privacy & Security

**This application is completely secure and privacy-focused:**

- **100% Local Processing**: All data processing happens entirely on your computer
- **No Data Transmission**: Your files, configurations, and sensitive data never leave your machine
- **No Internet Required**: The application works completely offline after initial setup (only used to download widely-used and required packages. See package.json to see required dependencies)
- **No External Services**: No data is sent to external servers or third-party services
- **No Tracking**: No analytics, telemetry, or user tracking is implemented
- **Client-Side Only**: All file processing, generation, and manipulation occurs in your local browser without data transmission.

**Your data stays private and secure at all times.** Whether you're processing sensitive environmental data, proprietary configurations, or confidential project information, everything remains on your local machine.

## Features

- **File Processing**: Ingest and process `.INP` template files
- **Source Management**: Create and manage multiple emission sources (e.g., smoke stacks)
- **Pollutant Configuration**: Define pollutants with annual and short-term emission settings
- **Time Intervals**: Support for 1, 2, 3, 4, 6, 8, 12, and 24-hour intervals
- **Year Range Processing**: Generate configurations for multiple years
- **NO2 Special Handling**: Automatic NO2 configuration insertion when NO2 pollutants are present
- **Configuration Persistence**: Save and load project configurations
- **Batch Generation**: Generate multiple files with different variants (with/without downwash)
- **Export Management**: Download all generated files as a ZIP archive

## Development / Testing

### Prerequisites

- **Node.js** (version 18 or higher)
- **npm** (comes with Node.js)

### Installation

1. **Clone or navigate to the project directory:**

   ```bash
   cd env-data-app
   ```

2. **Install dependencies:**

   ```bash
   npm install
   ```

3. **Start the development server:**

   ```bash
   npm start
   ```

4. **Open your browser:**
   - The app will automatically open at `http://localhost:3000`
   - If it doesn't open automatically, manually navigate to the URL

### Development Commands

- `npm start` - Start development server with hot reload
- `npm test` - Run test suite
- `npm run build` - Create production build
- `npm run eject` - Eject from Create React App (not recommended)

## Production Deployment

### Building for Production

1. **Create a production build:**

   ```bash
   npm run build
   ```

2. **The build files will be created in the `build/` directory**

### Self-Hosting with Python HTTP Server

#### Option 1: Python 3 (Recommended)

1. **Navigate to the build directory:**

   ```bash
   cd build
   ```

2. **Start the HTTP server:**

   ```bash
   python3 -m http.server 8000
   ```

3. **Access the application:**
   - Open your browser and go to `http://localhost:8000`
   - The application will be served from this URL

#### Option 2: Python 2 (Legacy)

1. **Navigate to the build directory:**

   ```bash
   cd build
   ```

2. **Start the HTTP server:**

   ```bash
   python -m SimpleHTTPServer 8000
   ```

3. **Access the application:**
   - Open your browser and go to `http://localhost:8000`

### Alternative Hosting Options

#### Using Node.js serve package

1. **Install serve globally:**

   ```bash
   npm install -g serve
   ```

2. **Serve the build directory:**
   ```bash
   serve -s build -l 8000
   ```

#### Using any web server

You can also serve the `build/` directory using any web server (Apache, Nginx, etc.) by pointing the document root to the `build/` folder.

## Usage Instructions

### 1. Project Setup

- Enter a project name
- Upload a template `.ADI` file (or any text file)
- Set the input year (2-digit format, e.g., "15" for 2015)

### 2. Configuration Management

- **Save Configuration**: Click "Save Configuration" to download a JSON file with your current settings
- **Load Configuration**: Click "Load Configuration" to upload and restore a previously saved configuration

### 3. Sources and Pollutants

- **Add Sources**: Create emission sources (e.g., "Stack1", "Stack2")
- **Add Pollutants**: Define pollutants with annual and/or short-term emission options
- **Configure Emission Rates**: For each source-pollutant pair, set emission rates based on selected options

### 4. Year Range

- Set start and end years (2-digit format)
- The application will generate files for each year in the range

### 5. NO2 Configuration (if applicable)

- If NO2 is included as a pollutant, paste the required NO2 configuration
- This will be automatically inserted into NO2 pollutant files

### 6. Generate Files

- Click "Generate Configurations" to process all combinations
- Review any warnings or errors in the processing report modal
- Download the generated ZIP file containing all configuration files

## File Naming Convention

Generated files follow this naming pattern:

```
<pollutant>_<interval/ANN>_<project_name>_<dw/nd>_<year>.txt
```

Where:

- `pollutant`: Pollutant name
- `interval`: Time interval (1, 2, 3, 4, 6, 8, 12, 24) or "ANN" for annual
- `project_name`: Your project name
- `dw/nd`: "dw" for files with downwash, "nd" for files without downwash
- `year`: 2-digit year

## Troubleshooting

### Common Issues

1. **"Module not found" errors**: Run `npm install` to ensure all dependencies are installed
2. **Port already in use**: If port 3000 is busy, the development server will automatically use the next available port
3. **Build fails**: Ensure you have the latest version of Node.js and npm
4. **Files not generating**: Check the processing report modal for specific error messages

### Browser Compatibility

- Chrome (recommended)
- Firefox
- Safari
- Edge

## Technical Details

- **Framework**: React 18
- **Styling**: Tailwind CSS
- **File Processing**: Custom JavaScript utilities
- **File Generation**: JSZip for creating ZIP archives
- **State Management**: React Hooks (useState)

## Support

For issues or questions, please check the processing report modal for specific error messages and ensure all required fields are properly filled out.
