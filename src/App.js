import React, { useState } from "react";
import JSZip from "jszip";
import { saveAs } from "file-saver";
import {
  processFileContent,
  generateFilename,
  validateProcessingParams,
  logProcessingInfo,
} from "./utils/fileProcessor";

function App() {
  // State management
  const [adiFile, setAdiFile] = useState(null);
  const [fileContent, setFileContent] = useState("");
  const [projectName, setProjectName] = useState("");
  const [inputYear, setInputYear] = useState("15");
  const [startYear, setStartYear] = useState("15");
  const [endYear, setEndYear] = useState("19");
  const [sources, setSources] = useState([]);
  const [pollutants, setPollutants] = useState([]);
  const [sourcePollutantPairs, setSourcePollutantPairs] = useState({});
  const [collapsedSources, setCollapsedSources] = useState({});
  const [processingReport, setProcessingReport] = useState(null);
  const [showReportModal, setShowReportModal] = useState(false);
  const [no2Configuration, setNo2Configuration] = useState("");

  // Time interval options
  const timeIntervals = ["1", "2", "3", "4", "6", "8", "12", "24"];

  // Check if NO2 is present in pollutants
  const hasNo2Pollutant = pollutants.some((pollutant) =>
    pollutant.name.toUpperCase().includes("NO2")
  );

  // Handle file upload
  const handleFileUpload = async (event) => {
    const file = event.target.files[0];
    if (file) {
      setAdiFile(file);
      // Read and store the file content
      try {
        const content = await file.text();
        setFileContent(content);
        console.log(
          "File uploaded successfully. Content length:",
          content.length
        );
        console.log("First 200 characters:", content.substring(0, 200));
      } catch (error) {
        console.error("Error reading file:", error);
        alert("Error reading file. Please try again.");
      }
    }
  };

  // Add new source
  const addSource = () => {
    const newSource = {
      id: Date.now(),
      name: `Source ${sources.length + 1}`,
      description: "",
    };
    setSources([...sources, newSource]);

    // Initialize source-pollutant pairs for this source
    const newPairs = {};
    pollutants.forEach((pollutant) => {
      newPairs[`${newSource.id}-${pollutant.id}`] = {
        shortTermRate: "",
        annualRate: "",
      };
    });
    setSourcePollutantPairs({ ...sourcePollutantPairs, ...newPairs });
  };

  // Add new pollutant
  const addPollutant = () => {
    const newPollutant = {
      id: Date.now(),
      name: `Pollutant ${pollutants.length + 1}`,
      casNumber: "",
      isAnnual: false,
      isShortTerm: false,
      timeInterval: "24",
      highValue: "1",
    };
    setPollutants([...pollutants, newPollutant]);

    // Initialize source-pollutant pairs for this pollutant
    const newPairs = {};
    sources.forEach((source) => {
      newPairs[`${source.id}-${newPollutant.id}`] = {
        shortTermRate: "",
        annualRate: "",
      };
    });
    setSourcePollutantPairs({ ...sourcePollutantPairs, ...newPairs });
  };

  // Update source name
  const updateSourceName = (sourceId, newName) => {
    setSources(
      sources.map((source) =>
        source.id === sourceId ? { ...source, name: newName } : source
      )
    );
  };

  // Update pollutant data
  const updatePollutant = (pollutantId, field, value) => {
    setPollutants(
      pollutants.map((pollutant) =>
        pollutant.id === pollutantId
          ? { ...pollutant, [field]: value }
          : pollutant
      )
    );
  };

  // Update source-pollutant pair emission rates
  const updateEmissionRate = (sourceId, pollutantId, field, value) => {
    const key = `${sourceId}-${pollutantId}`;
    setSourcePollutantPairs({
      ...sourcePollutantPairs,
      [key]: {
        ...sourcePollutantPairs[key],
        [field]: value,
      },
    });
  };

  // Remove source
  const removeSource = (sourceId) => {
    setSources(sources.filter((source) => source.id !== sourceId));
    // Remove all pairs for this source
    const newPairs = {};
    Object.keys(sourcePollutantPairs).forEach((key) => {
      if (!key.startsWith(`${sourceId}-`)) {
        newPairs[key] = sourcePollutantPairs[key];
      }
    });
    setSourcePollutantPairs(newPairs);
    // Remove from collapsed state
    const newCollapsed = { ...collapsedSources };
    delete newCollapsed[sourceId];
    setCollapsedSources(newCollapsed);
  };

  // Remove pollutant
  const removePollutant = (pollutantId) => {
    setPollutants(
      pollutants.filter((pollutant) => pollutant.id !== pollutantId)
    );
    // Remove all pairs for this pollutant
    const newPairs = {};
    Object.keys(sourcePollutantPairs).forEach((key) => {
      if (!key.endsWith(`-${pollutantId}`)) {
        newPairs[key] = sourcePollutantPairs[key];
      }
    });
    setSourcePollutantPairs(newPairs);
  };

  // Toggle source collapse
  const toggleSourceCollapse = (sourceId) => {
    setCollapsedSources({
      ...collapsedSources,
      [sourceId]: !collapsedSources[sourceId],
    });
  };

  // Save configuration to JSON file
  const saveConfiguration = () => {
    const config = {
      projectName,
      inputYear,
      startYear,
      endYear,
      sources,
      pollutants,
      sourcePollutantPairs,
      collapsedSources,
      no2Configuration,
      timestamp: new Date().toISOString(),
    };

    const configJson = JSON.stringify(config, null, 2);
    const blob = new Blob([configJson], { type: "application/json" });
    saveAs(blob, `env-config-${new Date().toISOString().split("T")[0]}.json`);
  };

  // Load configuration from JSON file
  const loadConfiguration = (event) => {
    const file = event.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const config = JSON.parse(e.target.result);

        // Validate and set configuration
        if (config.projectName) setProjectName(config.projectName);
        if (config.inputYear) setInputYear(config.inputYear);
        if (config.startYear) setStartYear(config.startYear);
        if (config.endYear) setEndYear(config.endYear);
        if (config.sources) setSources(config.sources);
        if (config.pollutants) setPollutants(config.pollutants);
        if (config.sourcePollutantPairs)
          setSourcePollutantPairs(config.sourcePollutantPairs);
        if (config.collapsedSources)
          setCollapsedSources(config.collapsedSources);
        if (config.no2Configuration)
          setNo2Configuration(config.no2Configuration);

        alert("Configuration loaded successfully!");
      } catch (error) {
        console.error("Error loading configuration:", error);
        alert(
          "Error loading configuration file. Please check the file format."
        );
      }
    };
    reader.readAsText(file);

    // Reset the file input so the same file can be selected again
    event.target.value = "";
  };

  // Generate configurations
  const generateConfigurations = async () => {
    if (!adiFile || !fileContent) {
      alert("Please select a file first");
      return;
    }

    if (!projectName.trim()) {
      alert("Please enter a project name");
      return;
    }

    if (sources.length === 0) {
      alert("Please add at least one source");
      return;
    }

    if (pollutants.length === 0) {
      alert("Please add at least one pollutant");
      return;
    }

    // Validate that at least one pollutant has emission types selected
    const hasValidPollutants = pollutants.some(
      (p) => p.isAnnual || p.isShortTerm
    );
    if (!hasValidPollutants) {
      alert(
        "Please select at least one emission type (Annual or Short Term) for your pollutants"
      );
      return;
    }

    // Validate NO2 configuration if NO2 pollutant exists
    if (hasNo2Pollutant && !no2Configuration.trim()) {
      alert(
        "NO2 pollutant detected. Please provide NO2 configuration in the NO2 Configuration section."
      );
      return;
    }

    // Validate year inputs
    // Validate 2-digit years
    if (!startYear || !endYear) {
      alert("Please enter both start and end years");
      return;
    }

    if (startYear.length !== 2 || endYear.length !== 2) {
      alert("Start and end years must be 2-digit numbers");
      return;
    }

    const startYearNum = parseInt(startYear);
    const endYearNum = parseInt(endYear);

    if (isNaN(startYearNum) || isNaN(endYearNum)) {
      alert("Please enter valid 2-digit years");
      return;
    }

    if (startYearNum > endYearNum) {
      alert("Start year must be less than or equal to end year");
      return;
    }

    try {
      const zip = new JSZip();
      const allIssues = [];

      console.log("Using stored file content length:", fileContent.length);
      console.log(
        "Original file content preview:",
        fileContent.substring(0, 500)
      );

      const startYearNum = parseInt(startYear);
      const endYearNum = parseInt(endYear);

      // Generate files for each year in range
      for (let year = startYearNum; year <= endYearNum; year++) {
        // Keep 2-digit year as is, no padding or conversion
        const year2Digit = year.toString();

        // Generate files for each pollutant
        for (const pollutant of pollutants) {
          const emissionTypes = [];
          // Add annual if checked (not mutually exclusive)
          if (pollutant.isAnnual) {
            emissionTypes.push("annual");
          }
          // Add shortterm if checked (not mutually exclusive)
          if (pollutant.isShortTerm) {
            emissionTypes.push("shortterm");
          }

          console.log(`🔍 Processing pollutant: ${pollutant.name}`);
          console.log(`   - isAnnual: ${pollutant.isAnnual}`);
          console.log(`   - isShortTerm: ${pollutant.isShortTerm}`);
          console.log(`   - emissionTypes: [${emissionTypes.join(", ")}]`);

          // Generate files for each emission type
          emissionTypes.forEach((emissionType) => {
            // Generate two files: one with downwash, one without
            const fileVariants = [
              { hasDownwash: true, isFirstFile: true },
              { hasDownwash: false, isFirstFile: false },
            ];

            fileVariants.forEach((variant) => {
              // Prepare processing parameters
              const processingParams = {
                inputYear,
                outputYear: year2Digit,
                outputYear2Digit: year2Digit,
                sources,
                sourcePollutantPairs,
                emissionType,
                isFirstFile: variant.isFirstFile,
                pollutantName: pollutant.name,
                pollutantId: pollutant.id,
                pollutant: pollutant,
                projectName: projectName,
                no2Configuration: no2Configuration,
                hasNo2Pollutant: hasNo2Pollutant,
              };

              // Validate parameters
              const validation = validateProcessingParams(processingParams);
              if (!validation.isValid) {
                console.error(`Validation failed: ${validation.error}`);
                return;
              }

              // Process file content using helper library
              const result = processFileContent(fileContent, processingParams);

              // Collect issues with context
              result.issues.forEach((issue) => {
                allIssues.push({
                  ...issue,
                  context: {
                    pollutant: pollutant.name,
                    year: year2Digit,
                    emissionType,
                    hasDownwash: variant.hasDownwash,
                    filename: generateFilename(
                      pollutant.name,
                      pollutant.timeInterval,
                      projectName,
                      variant.hasDownwash,
                      year2Digit
                    ),
                  },
                });
              });

              // Generate filename using helper library
              const filename = generateFilename(
                pollutant.name,
                pollutant.timeInterval,
                projectName,
                variant.hasDownwash,
                year2Digit,
                emissionType
              );

              console.log(
                `📄 Generating file: ${filename} (${emissionType}, ${
                  variant.hasDownwash ? "with" : "without"
                } downwash)`
              );

              // Log processing info for debugging
              logProcessingInfo(
                pollutant.name,
                year2Digit,
                emissionType,
                result.content,
                filename
              );

              // Add file to zip
              zip.file(filename, result.content);
            });
          });
        }
      }

      // Generate and download zip file
      const zipBlob = await zip.generateAsync({ type: "blob" });
      saveAs(zipBlob, `environmental_configs_${startYear}_${endYear}.zip`);

      // Prepare processing report
      const report = {
        totalFiles: zip.files ? Object.keys(zip.files).length : 0,
        totalIssues: allIssues.length,
        errors: allIssues.filter((issue) => issue.type === "error"),
        warnings: allIssues.filter((issue) => issue.type === "warning"),
        issues: allIssues,
        timestamp: new Date().toISOString(),
      };

      setProcessingReport(report);
      setShowReportModal(true);

      if (allIssues.length === 0) {
        alert("Configuration files generated successfully with no issues!");
      } else {
        alert(
          `Configuration files generated successfully! Found ${allIssues.length} issues. Check the report for details.`
        );
      }
    } catch (error) {
      console.error("Error generating configurations:", error);
      alert(
        "Error generating configurations. Please check the console for details."
      );
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-gray-800 text-white py-6 mb-8">
        <div className="max-w-7xl mx-auto px-4">
          <h1 className="text-3xl font-bold text-center">
            Environmental Data Configuration Generator
          </h1>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 pb-8">
        {/* Project Configuration Section */}
        <section className="bg-white rounded-lg shadow-md p-6 mb-8">
          <h2 className="text-2xl font-semibold text-gray-800 mb-4 border-b-2 border-blue-500 pb-2">
            Project Configuration
          </h2>
          <div className="space-y-4">
            <div className="grid grid-cols-1 lg:grid-cols-4 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Input File *
                </label>
                <input
                  type="file"
                  accept=".txt,.inp"
                  onChange={handleFileUpload}
                  className="block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-green-50 file:text-green-700 hover:file:bg-green-100"
                />
                {adiFile && (
                  <p className="text-xs text-green-600 mt-1 truncate">
                    {adiFile.name}
                  </p>
                )}
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Project Name *
                </label>
                <input
                  type="text"
                  value={projectName}
                  onChange={(e) => setProjectName(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="Enter project name"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Input Year (2-digit)
                </label>
                <input
                  type="text"
                  value={inputYear}
                  onChange={(e) => setInputYear(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="24"
                  maxLength="2"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Configuration
                </label>
                <div className="flex gap-2">
                  <button
                    onClick={saveConfiguration}
                    className="flex-1 bg-green-600 text-white py-2 px-3 rounded-md hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-green-500 focus:ring-offset-2 transition-colors text-sm"
                  >
                    💾 Save
                  </button>
                  <label className="flex-1 bg-purple-600 text-white py-2 px-3 rounded-md hover:bg-purple-700 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:ring-offset-2 transition-colors cursor-pointer text-center text-sm">
                    📁 Load
                    <input
                      type="file"
                      accept=".json"
                      onChange={loadConfiguration}
                      className="hidden"
                    />
                  </label>
                </div>
              </div>
            </div>
            {fileContent && (
              <div className="mt-3 p-3 bg-green-50 border border-green-200 rounded-md">
                <p className="text-green-800 text-sm">
                  <span className="font-medium">File loaded:</span>{" "}
                  {fileContent.length} characters
                </p>
              </div>
            )}
          </div>
        </section>

        {/* NO2 Configuration Section - Only show if NO2 pollutant exists */}
        {hasNo2Pollutant && (
          <section className="bg-white rounded-lg shadow-md p-6 mb-8">
            <h2 className="text-2xl font-semibold text-gray-800 mb-4 border-b-2 border-orange-500 pb-2">
              NO2 Configuration
            </h2>
            <div className="space-y-4">
              <div className="bg-orange-50 border border-orange-200 rounded-md p-4">
                <p className="text-orange-800 text-sm">
                  <span className="font-medium">
                    ⚠️ NO2 Pollutant Detected:
                  </span>{" "}
                  NO2 requires additional configuration that will be inserted
                  between CO STARTING and CO FINISHED sections.
                </p>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  NO2 Configuration *
                </label>
                <textarea
                  value={no2Configuration}
                  onChange={(e) => setNo2Configuration(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                  rows="6"
                  placeholder="Paste your NO2 configuration here (e.g., ** NO2 CONVERSION OPTIONS, NO2STACK 0.200, NO2EQUIL 0.900, etc.)"
                  required
                />
                <p className="text-sm text-gray-600 mt-1">
                  This configuration will be inserted into the CO STARTING/CO
                  FINISHED section for all NO2 pollutant files.
                </p>
              </div>
            </div>
          </section>
        )}

        {/* Sources and Pollutants Side by Side */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Sources Management */}
          <section className="bg-white rounded-lg shadow-md p-6">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-2xl font-semibold text-gray-800 border-b-2 border-green-500 pb-2">
                Sources
              </h2>
              <button
                onClick={addSource}
                className="bg-green-500 hover:bg-green-600 text-white px-4 py-2 rounded-md font-medium transition-colors"
              >
                + Add Source
              </button>
            </div>
            <div className="space-y-4">
              {sources.map((source) => (
                <div
                  key={source.id}
                  className="border border-gray-200 rounded-lg bg-gray-50"
                >
                  <div className="flex items-center justify-between p-4">
                    <div className="flex items-center space-x-3">
                      <button
                        onClick={() => toggleSourceCollapse(source.id)}
                        className="text-gray-500 hover:text-gray-700 transition-colors"
                      >
                        {collapsedSources[source.id] ? (
                          <svg
                            className="w-5 h-5"
                            fill="none"
                            stroke="currentColor"
                            viewBox="0 0 24 24"
                          >
                            <path
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              strokeWidth={2}
                              d="M9 5l7 7-7 7"
                            />
                          </svg>
                        ) : (
                          <svg
                            className="w-5 h-5"
                            fill="none"
                            stroke="currentColor"
                            viewBox="0 0 24 24"
                          >
                            <path
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              strokeWidth={2}
                              d="M19 9l-7 7-7-7"
                            />
                          </svg>
                        )}
                      </button>
                      <input
                        type="text"
                        value={source.name}
                        onChange={(e) =>
                          updateSourceName(source.id, e.target.value)
                        }
                        className="flex-1 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent"
                        placeholder="Source name"
                      />
                    </div>
                    <button
                      onClick={() => removeSource(source.id)}
                      className="bg-red-500 hover:bg-red-600 text-white px-3 py-1 rounded text-sm transition-colors"
                    >
                      🗑️
                    </button>
                  </div>

                  {/* Collapsible Source-Pollutant Pairs */}
                  {!collapsedSources[source.id] && pollutants.length > 0 && (
                    <div className="px-4 pb-4 border-t border-gray-200 pt-4">
                      <h4 className="text-lg font-medium text-gray-700 mb-3">
                        Emission Rates by Pollutant:
                      </h4>
                      <div className="space-y-3">
                        {pollutants.map((pollutant) => (
                          <div
                            key={pollutant.id}
                            className="flex items-center space-x-3"
                          >
                            <span className="w-24 text-sm font-medium text-gray-600">
                              {pollutant.name}:
                            </span>
                            <div className="flex space-x-2">
                              {pollutant.isShortTerm && (
                                <input
                                  type="number"
                                  placeholder="Short Term"
                                  value={
                                    sourcePollutantPairs[
                                      `${source.id}-${pollutant.id}`
                                    ]?.shortTermRate || ""
                                  }
                                  onChange={(e) =>
                                    updateEmissionRate(
                                      source.id,
                                      pollutant.id,
                                      "shortTermRate",
                                      e.target.value
                                    )
                                  }
                                  className="w-24 px-2 py-1 text-sm border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-green-500"
                                />
                              )}
                              {pollutant.isAnnual && (
                                <input
                                  type="number"
                                  placeholder="Annual"
                                  value={
                                    sourcePollutantPairs[
                                      `${source.id}-${pollutant.id}`
                                    ]?.annualRate || ""
                                  }
                                  onChange={(e) =>
                                    updateEmissionRate(
                                      source.id,
                                      pollutant.id,
                                      "annualRate",
                                      e.target.value
                                    )
                                  }
                                  className="w-24 px-2 py-1 text-sm border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-green-500"
                                />
                              )}
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </section>

          {/* Pollutants Management */}
          <section className="bg-white rounded-lg shadow-md p-6">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-2xl font-semibold text-gray-800 border-b-2 border-green-500 pb-2">
                Pollutants
              </h2>
              <button
                onClick={addPollutant}
                className="bg-green-500 hover:bg-green-600 text-white px-4 py-2 rounded-md font-medium transition-colors"
              >
                + Add Pollutant
              </button>
            </div>
            <div className="space-y-4">
              {pollutants.map((pollutant) => (
                <div
                  key={pollutant.id}
                  className="border border-gray-200 rounded-lg bg-gray-50 p-4"
                >
                  <div className="flex items-center justify-between mb-3">
                    <input
                      type="text"
                      value={pollutant.name}
                      onChange={(e) =>
                        updatePollutant(pollutant.id, "name", e.target.value)
                      }
                      className="flex-1 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent mr-3"
                      placeholder="Pollutant name"
                    />
                    <button
                      onClick={() => removePollutant(pollutant.id)}
                      className="bg-red-500 hover:bg-red-600 text-white px-3 py-1 rounded text-sm transition-colors"
                    >
                      🗑️
                    </button>
                  </div>

                  <div className="space-y-3">
                    <input
                      type="text"
                      value={pollutant.casNumber}
                      onChange={(e) =>
                        updatePollutant(
                          pollutant.id,
                          "casNumber",
                          e.target.value
                        )
                      }
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent"
                      placeholder="CAS Number"
                    />

                    <div className="space-y-4">
                      {/* Checkboxes - Vertical Layout */}
                      <div className="space-y-3">
                        <label className="flex items-center space-x-2">
                          <input
                            type="checkbox"
                            checked={pollutant.isAnnual}
                            onChange={(e) =>
                              updatePollutant(
                                pollutant.id,
                                "isAnnual",
                                e.target.checked
                              )
                            }
                            className="w-4 h-4 text-green-600 border-gray-300 rounded focus:ring-green-500"
                          />
                          <span className="text-sm font-medium text-gray-700">
                            Annual
                          </span>
                        </label>

                        <div className="flex items-center space-x-4">
                          <label className="flex items-center space-x-2">
                            <input
                              type="checkbox"
                              checked={pollutant.isShortTerm}
                              onChange={(e) =>
                                updatePollutant(
                                  pollutant.id,
                                  "isShortTerm",
                                  e.target.checked
                                )
                              }
                              className="w-4 h-4 text-green-600 border-gray-300 rounded focus:ring-green-500"
                            />
                            <span className="text-sm font-medium text-gray-700">
                              Short Term
                            </span>
                          </label>

                          {/* Time Interval and High Value Dropdowns - Horizontally aligned with Short Term checkbox */}
                          {pollutant.isShortTerm && (
                            <>
                              <div className="flex items-center space-x-2">
                                <label className="text-sm font-medium text-gray-700">
                                  Interval:
                                </label>
                                <select
                                  value={pollutant.timeInterval}
                                  onChange={(e) =>
                                    updatePollutant(
                                      pollutant.id,
                                      "timeInterval",
                                      e.target.value
                                    )
                                  }
                                  className="px-2 py-1 text-sm border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-green-500"
                                >
                                  {timeIntervals.map((interval) => (
                                    <option key={interval} value={interval}>
                                      {interval}h
                                    </option>
                                  ))}
                                </select>
                              </div>

                              <div className="flex items-center space-x-2">
                                <label className="text-sm font-medium text-gray-700">
                                  High Value:
                                </label>
                                <select
                                  value={pollutant.highValue}
                                  onChange={(e) =>
                                    updatePollutant(
                                      pollutant.id,
                                      "highValue",
                                      e.target.value
                                    )
                                  }
                                  className="px-2 py-1 text-sm border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-green-500"
                                >
                                  {Array.from(
                                    { length: 10 },
                                    (_, i) => i + 1
                                  ).map((value) => {
                                    let ordinal;
                                    if (value === 1) ordinal = "1ST";
                                    else if (value === 2) ordinal = "2ND";
                                    else if (value === 3) ordinal = "3RD";
                                    else ordinal = `${value}TH`;
                                    return (
                                      <option
                                        key={value}
                                        value={value.toString()}
                                      >
                                        {ordinal}
                                      </option>
                                    );
                                  })}
                                </select>
                              </div>
                            </>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </section>
        </div>

        {/* Generate Section */}
        <section className="bg-white rounded-lg shadow-md p-6 mt-8">
          <h2 className="text-2xl font-semibold text-gray-800 mb-6 border-b-2 border-green-500 pb-2">
            Export Configuration
          </h2>
          <div className="space-y-4">
            <div className="flex items-center space-x-6">
              <div className="flex items-center space-x-3">
                <label className="text-sm font-medium text-gray-700">
                  Start Year (2-digit):
                </label>
                <input
                  type="text"
                  value={startYear}
                  onChange={(e) => {
                    const value = e.target.value.replace(/\D/g, ""); // Only allow digits
                    if (value.length <= 2) {
                      setStartYear(value);
                    }
                  }}
                  className="w-20 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent"
                  placeholder="24"
                  maxLength="2"
                />
              </div>
              <div className="flex items-center space-x-3">
                <label className="text-sm font-medium text-gray-700">
                  End Year (2-digit):
                </label>
                <input
                  type="text"
                  value={endYear}
                  onChange={(e) => {
                    const value = e.target.value.replace(/\D/g, ""); // Only allow digits
                    if (value.length <= 2) {
                      setEndYear(value);
                    }
                  }}
                  className="w-20 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent"
                  placeholder="25"
                  maxLength="2"
                />
              </div>
            </div>

            <div className="text-center pt-4">
              <button
                onClick={generateConfigurations}
                className="bg-blue-500 hover:bg-blue-600 text-white px-8 py-3 rounded-lg text-lg font-medium transition-colors"
              >
                🚀 Generate Configurations
              </button>
            </div>
          </div>
        </section>
      </main>

      {/* Processing Report Modal */}
      {showReportModal && processingReport && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-xl max-w-4xl w-full max-h-[90vh] flex flex-col">
            {/* Modal Header */}
            <div className="flex justify-between items-center p-6 border-b border-gray-200">
              <h2 className="text-2xl font-semibold text-gray-800">
                Processing Report
              </h2>
              <button
                onClick={() => setShowReportModal(false)}
                className="text-gray-400 hover:text-gray-600 text-2xl font-bold"
              >
                ×
              </button>
            </div>

            {/* Modal Content */}
            <div className="flex-1 overflow-hidden flex flex-col">
              {/* Summary */}
              <div className="p-6 border-b border-gray-200">
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                  <div className="bg-blue-50 p-4 rounded-lg">
                    <div className="text-2xl font-bold text-blue-600">
                      {processingReport.totalFiles}
                    </div>
                    <div className="text-sm text-blue-800">Files Generated</div>
                  </div>
                  <div className="bg-red-50 p-4 rounded-lg">
                    <div className="text-2xl font-bold text-red-600">
                      {processingReport.errors.length}
                    </div>
                    <div className="text-sm text-red-800">Errors</div>
                  </div>
                  <div className="bg-yellow-50 p-4 rounded-lg">
                    <div className="text-2xl font-bold text-yellow-600">
                      {processingReport.warnings.length}
                    </div>
                    <div className="text-sm text-yellow-800">Warnings</div>
                  </div>
                  <div className="bg-gray-50 p-4 rounded-lg">
                    <div className="text-2xl font-bold text-gray-600">
                      {processingReport.totalIssues}
                    </div>
                    <div className="text-sm text-gray-800">Total Issues</div>
                  </div>
                </div>
              </div>

              {/* Issues List */}
              <div className="flex-1 overflow-y-auto p-6">
                {processingReport.issues.length === 0 ? (
                  <div className="text-center py-8">
                    <div className="text-green-500 text-6xl mb-4">✅</div>
                    <h3 className="text-xl font-semibold text-gray-800 mb-2">
                      No Issues Found!
                    </h3>
                    <p className="text-gray-600">
                      All files were processed successfully without any
                      problems.
                    </p>
                  </div>
                ) : (
                  <div className="space-y-4">
                    <h3 className="text-lg font-semibold text-gray-800 mb-4">
                      Issues Found:
                    </h3>
                    {processingReport.issues.map((issue, index) => (
                      <div
                        key={index}
                        className={`p-4 rounded-lg border-l-4 ${
                          issue.type === "error"
                            ? "bg-red-50 border-red-400"
                            : "bg-yellow-50 border-yellow-400"
                        }`}
                      >
                        <div className="flex items-start justify-between">
                          <div className="flex-1">
                            <div className="flex items-center mb-2">
                              <span
                                className={`inline-block w-2 h-2 rounded-full mr-2 ${
                                  issue.type === "error"
                                    ? "bg-red-500"
                                    : "bg-yellow-500"
                                }`}
                              ></span>
                              <span
                                className={`font-medium ${
                                  issue.type === "error"
                                    ? "text-red-800"
                                    : "text-yellow-800"
                                }`}
                              >
                                {issue.type.toUpperCase()}
                              </span>
                              <span className="ml-2 text-sm text-gray-600">
                                {issue.category}
                              </span>
                            </div>
                            <p className="text-gray-800 mb-2">
                              {issue.message}
                            </p>
                            <p className="text-sm text-gray-600 mb-2">
                              {issue.details}
                            </p>
                            <div className="text-xs text-gray-500">
                              <strong>File:</strong> {issue.context.filename} |{" "}
                              <strong>Pollutant:</strong>{" "}
                              {issue.context.pollutant} | <strong>Year:</strong>{" "}
                              {issue.context.year} | <strong>Type:</strong>{" "}
                              {issue.context.emissionType}
                              {issue.context.hasDownwash
                                ? " (with downwash)"
                                : " (no downwash)"}
                            </div>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Modal Footer */}
              <div className="p-6 border-t border-gray-200 flex justify-end">
                <button
                  onClick={() => setShowReportModal(false)}
                  className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-2 rounded-md font-medium transition-colors"
                >
                  Close Report
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default App;
