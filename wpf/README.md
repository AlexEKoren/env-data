# Environmental Data Configuration Generator - C# WPF Version

A native Windows desktop application for generating environmental data configurations from template files. This C# WPF version provides the same functionality as the React web version but as a native Windows executable.

## Privacy & Security

🔒 **Your data stays completely private and secure:**

- All file processing happens locally on your computer
- No data is transmitted over the internet
- No external services or APIs are used
- Your input files and generated configurations remain on your machine
- The application works entirely offline

## Features

- **Native Windows Application**: Built with WPF for optimal Windows integration
- **File Processing**: Upload and process `.txt`, `.inp`, or `.adi` template files
- **Dynamic Configuration**: Add/remove sources and pollutants with real-time pairing
- **Emission Rate Management**: Set short-term and annual emission rates for each source-pollutant pair
- **Multiple Output Formats**: Generate both annual and short-term reports
- **NO2 Special Handling**: Automatic NO2 configuration insertion when NO2 pollutants are detected
- **Configuration Persistence**: Save and load your project configurations
- **Batch Processing**: Generate files for multiple years and emission types
- **ZIP Export**: All generated files packaged in a downloadable ZIP archive
- **Processing Reports**: Detailed feedback on file generation issues

## Installation & Setup

### Prerequisites

- **Windows 10/11** (64-bit)
- **.NET 8.0 Runtime** or **.NET 8.0 SDK**
  - Download from: https://dotnet.microsoft.com/download/dotnet/8.0

### Development / Testing

If you want to build from source:

1. **Install .NET 8.0 SDK**

   ```bash
   # Verify installation
   dotnet --version
   ```

2. **Clone and build**

   ```bash
   cd env-data-csharp/EnvDataApp
   dotnet restore
   dotnet build
   dotnet run
   ```

3. **Create executable**
   ```bash
   dotnet publish -c Release -r win-x64 --self-contained
   ```

### Self-Hosting (Built Application)

1. **Download the built application** (when available)
2. **Extract to a folder** on your Windows machine
3. **Run `EnvDataApp.exe`** - no installation required!

## Usage

### 1. Project Configuration

- **Input File**: Select your template file (`.txt`, `.inp`, or `.adi`)
- **Project Name**: Enter a name for your project
- **Input Year**: 2-digit year from your template file
- **Year Range**: Start and end years for generation (2-digit format)

### 2. Sources Management

- **Add Sources**: Enter source names (e.g., "Stack1", "Boiler")
- **Remove Sources**: Click "Remove" next to any source
- Sources represent unique emission points like smoke stacks

### 3. Pollutants Management

- **Add Pollutants**: Enter pollutant names (e.g., "NO2", "SO2", "PM10")
- **Configure Options**:
  - **Annual**: Check to include annual reports
  - **Short Term**: Check to include short-term reports
  - **Time Interval**: Select from 1, 2, 3, 4, 6, 8, 12, 24 hours
  - **High Value**: Select ranking (1ST, 2ND, 3RD, etc.)

### 4. Emission Rates

- For each Source-Pollutant pair, enter:
  - **Short Term Rate**: For short-term reports
  - **Annual Rate**: For annual reports
- Rates are automatically paired based on your sources and pollutants

### 5. NO2 Configuration (Automatic)

- If any pollutant contains "NO2", a special configuration section appears
- Paste your NO2-specific configuration (e.g., conversion factors)
- This gets inserted into the CO STARTING/CO FINISHED section

### 6. Generate Configurations

- Click "Generate Configurations" to process all files
- The application will:
  - Create files for each year in your range
  - Generate both annual and short-term versions
  - Create downwash and non-downwash variants
  - Package everything in a ZIP file for download

## File Naming Convention

Generated files follow this pattern:

```
<pollutant>_<interval/ANN>_<project_name>_<dw/nd>_<year>.txt
```

**Examples:**

- `NO2_24_MyProject_dw_15.txt` (24-hour, with downwash, year 15)
- `SO2_ANN_MyProject_nd_16.txt` (Annual, no downwash, year 16)
- `PM10_1_MyProject_dw_17.txt` (1-hour, with downwash, year 17)

## Configuration Management

### Save Configuration

- Click "Save Configuration" to save your current setup
- Saves all sources, pollutants, rates, and settings to a JSON file
- Useful for reusing complex configurations

### Load Configuration

- Click "Load Configuration" to restore a saved setup
- Loads all settings and data from a JSON file
- Perfect for continuing work on previous projects

## Technical Details

### File Processing Rules

1. **Year Replacement**: `-<INPUT_YEAR>.dat` → `-<OUTPUT_YEAR>.dat`
2. **Emission Rates**: `SRCPARAM <SOURCE>` → updated with calculated rates
3. **Building Downwash**: Removed from second file of each pair
4. **Surface Files**: `<INPUT_YEAR>.SFC/PFL` → `<OUTPUT_YEAR>.SFC/PFL`
5. **Pollutant Names**: `POLLUTID <NAME>` → actual pollutant name
6. **NO2 Configuration**: Inserted between CO STARTING/CO FINISHED
7. **Output Sections**: Generated based on annual/short-term settings

### Dependencies

- **System.IO.Compression**: For ZIP file creation
- **Newtonsoft.Json**: For configuration serialization
- **WPF**: For the user interface

## Troubleshooting

### Common Issues

**"File not found" errors:**

- Ensure your input file is a valid text file
- Check that the file contains the expected sections (SRCPARAM, OU STARTING, etc.)

**"No files generated":**

- Verify you have at least one source and one pollutant
- Check that pollutants have either "Annual" or "Short Term" selected
- Ensure emission rates are entered for all source-pollutant pairs

**"Invalid year format":**

- Use 2-digit years (00-99)
- Start year must be ≤ end year

**"NO2 configuration not working":**

- Ensure your NO2 pollutant name contains "NO2" (case-insensitive)
- Check that your NO2 configuration text is properly formatted

### Performance Notes

- Large year ranges (50+ years) may take longer to process
- Complex configurations with many sources/pollutants will generate more files
- The application processes files in memory for speed

## File Structure

```
env-data-csharp/
├── EnvDataApp/
│   ├── Models/           # Data models (Source, Pollutant, etc.)
│   ├── Services/         # File processing logic
│   ├── MainWindow.xaml   # Main UI layout
│   ├── MainWindow.xaml.cs # UI logic
│   ├── App.xaml          # Application resources
│   └── EnvDataApp.csproj # Project configuration
└── README.md            # This file
```

## Support

This is a desktop application that runs entirely on your local machine. All processing happens offline, ensuring your data remains private and secure.
