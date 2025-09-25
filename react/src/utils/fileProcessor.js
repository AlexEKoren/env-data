/**
 * File Processing Utilities
 * Handles all text replacement and file generation logic for environmental configurations
 */

/**
 * Processes a file template and generates modified content based on parameters
 * @param {string} fileContent - Original file content
 * @param {Object} params - Processing parameters
 * @param {string} params.inputYear - 2-digit input year (e.g., "24")
 * @param {string} params.outputYear - Full output year (e.g., "2024")
 * @param {string} params.outputYear2Digit - 2-digit output year (e.g., "24")
 * @param {Array} params.sources - Array of source objects
 * @param {Object} params.sourcePollutantPairs - Object mapping source-pollutant pairs to emission rates
 * @param {string} params.emissionType - "annual" or "shortterm"
 * @param {boolean} params.isFirstFile - Whether this is the first file (affects BUILDING DOWNWASH handling)
 * @param {string} params.pollutantName - Name of the pollutant
 * @returns {Object} { content: string, issues: Array } - Modified file content and processing issues
 */
export const processFileContent = (fileContent, params) => {
  const {
    inputYear,
    outputYear,
    outputYear2Digit,
    sources,
    sourcePollutantPairs,
    emissionType,
    isFirstFile,
    pollutantName,
    no2Configuration,
    hasNo2Pollutant,
  } = params;

  console.log(
    `\n🚀 Starting file processing for ${pollutantName} (${emissionType}, ${outputYear})`
  );
  console.log(`📋 Processing parameters:`);
  console.log(
    `   - Input Year: ${inputYear} -> Output Year: ${outputYear} (${outputYear2Digit})`
  );
  console.log(`   - Sources: ${sources.length}`);
  console.log(`   - Emission Type: ${emissionType}`);
  console.log(`   - Is First File: ${isFirstFile}`);
  console.log(`   - Original Content Length: ${fileContent.length} characters`);

  let modifiedContent = fileContent;
  const issues = [];

  // 1. Replace input year in .dat files
  const datResult = replaceDatFiles(
    modifiedContent,
    inputYear,
    outputYear2Digit
  );
  modifiedContent = datResult.content;
  issues.push(...datResult.issues);

  // 2. Replace SRCPARAM emission rates
  const srcParamResult = replaceSrcParamRates(
    modifiedContent,
    sources,
    sourcePollutantPairs,
    emissionType,
    params.pollutantId
  );
  modifiedContent = srcParamResult.content;
  issues.push(...srcParamResult.issues);

  // 3. Handle NO2 configuration insertion (if NO2 pollutant)
  if (
    hasNo2Pollutant &&
    pollutantName.toUpperCase().includes("NO2") &&
    no2Configuration.trim()
  ) {
    const no2Result = insertNo2Configuration(modifiedContent, no2Configuration);
    modifiedContent = no2Result.content;
    issues.push(...no2Result.issues);
  }

  // 4. Handle BUILDING DOWNWASH section (remove for non-first files)
  if (!isFirstFile) {
    const downwashResult = removeBuildingDownwash(modifiedContent);
    modifiedContent = downwashResult.content;
    issues.push(...downwashResult.issues);
  }

  // 5. Replace .SFC and .PFL file references
  const sfcPflResult = replaceSfcPflFiles(
    modifiedContent,
    inputYear,
    outputYear
  );
  modifiedContent = sfcPflResult.content;
  issues.push(...sfcPflResult.issues);

  // 6. Replace pollutant name
  const pollutantResult = replacePollutantName(modifiedContent, pollutantName);
  modifiedContent = pollutantResult.content;
  issues.push(...pollutantResult.issues);

  // 7. Replace OU STARTING/OU FINISHED section
  // Generate filename for .plt reference

  const filename = generateFilename(
    pollutantName,
    params.pollutant.timeInterval,
    params.projectName || "project",
    params.isFirstFile,
    params.outputYear,
    emissionType
  );

  const ouResult = replaceOuSection(
    modifiedContent,
    emissionType,
    params.pollutant.timeInterval,
    pollutantName,
    filename,
    params.pollutant.highValue
  );
  modifiedContent = ouResult.content;
  issues.push(...ouResult.issues);

  console.log(`\n✅ File processing completed for ${pollutantName}`);
  console.log(`📊 Final content length: ${modifiedContent.length} characters`);
  console.log(
    `📈 Content change: ${
      modifiedContent.length - fileContent.length
    } characters`
  );

  return { content: modifiedContent, issues };
};

/**
 * Replaces input year in .dat file references
 * @param {string} content - File content
 * @param {string} inputYear - 2-digit input year
 * @param {string} outputYear2Digit - 2-digit output year
 * @returns {Object} { content: string, issues: Array } - Modified content and issues
 */
const replaceDatFiles = (content, inputYear, outputYear2Digit) => {
  const regex = new RegExp(`-${inputYear}\\.dat`, "gi");
  const matches = content.match(regex);
  const issues = [];

  if (matches) {
    console.log(
      `✅ Found ${matches.length} .dat file reference(s): ${inputYear} -> ${outputYear2Digit}`
    );
    matches.forEach((match) => {
      console.log(`   Replacing: ${match} -> -${outputYear2Digit}.dat`);
    });
  } else {
    const issue = {
      type: "warning",
      category: "dat_files",
      message: `No .dat file references found for year: ${inputYear}`,
      details: `Expected pattern: -${inputYear}.dat`,
    };
    issues.push(issue);
    console.log(`❌ No .dat file references found for year: ${inputYear}`);
  }

  return {
    content: content.replace(regex, `-${outputYear2Digit}.dat`),
    issues,
  };
};

/**
 * Replaces SRCPARAM emission rates for all sources
 * @param {string} content - File content
 * @param {Array} sources - Array of source objects
 * @param {Object} sourcePollutantPairs - Emission rate pairs
 * @param {string} emissionType - "annual" or "shortterm"
 * @returns {Object} { content: string, issues: Array } - Modified content and issues
 */
const replaceSrcParamRates = (
  content,
  sources,
  sourcePollutantPairs,
  emissionType,
  pollutantId
) => {
  let modifiedContent = content;
  let totalReplacements = 0;
  const issues = [];

  console.log(
    `🔍 Processing SRCPARAM replacements for ${emissionType} emissions...`
  );

  sources.forEach((source) => {
    const pairKey = `${source.id}-${pollutantId}`;
    const pair = sourcePollutantPairs[pairKey];

    if (pair) {
      let emissionRate = "";
      if (emissionType === "annual" && pair.annualRate) {
        emissionRate = pair.annualRate;
      } else if (emissionType === "shortterm" && pair.shortTermRate) {
        emissionRate = pair.shortTermRate;
      }

      console.log(
        `🔍 SRCPARAM processing for ${source.name} (${emissionType}):`
      );
      console.log(`   - pair.annualRate: "${pair.annualRate}"`);
      console.log(`   - pair.shortTermRate: "${pair.shortTermRate}"`);
      console.log(`   - selected emissionRate: "${emissionRate}"`);

      if (emissionRate) {
        const srcParamRegex = new RegExp(
          `(SRCPARAM\\s+${source.name}\\s+)\\S+`,
          "g"
        );
        const matches = modifiedContent.match(srcParamRegex);

        if (matches) {
          console.log(
            `✅ Found ${matches.length} SRCPARAM line(s) for source: ${source.name}`
          );
          matches.forEach((match) => {
            console.log(
              `   Replacing: ${match} -> SRCPARAM ${source.name} ${emissionRate}`
            );
          });
          totalReplacements += matches.length;
        } else {
          const issue = {
            type: "error",
            category: "srcparam",
            message: `No SRCPARAM lines found for source: ${source.name}`,
            details: `Expected pattern: SRCPARAM ${source.name} <value>`,
          };
          issues.push(issue);
          console.log(`❌ No SRCPARAM lines found for source: ${source.name}`);
        }

        modifiedContent = modifiedContent.replace(
          srcParamRegex,
          `$1${emissionRate}`
        );
      } else {
        const issue = {
          type: "warning",
          category: "emission_rate",
          message: `No ${emissionType} emission rate found for source: ${source.name}`,
          details: `Please configure ${emissionType} emission rate for this source`,
        };
        issues.push(issue);
        console.log(
          `⚠️  No ${emissionType} emission rate found for source: ${source.name}`
        );
      }
    } else {
      const issue = {
        type: "error",
        category: "source_pair",
        message: `No emission rate pair found for source: ${source.name}`,
        details: `Missing configuration for source-pollutant pair (key: ${pairKey})`,
      };
      issues.push(issue);
      console.log(
        `⚠️  No emission rate pair found for source: ${source.name} (key: ${pairKey})`
      );
    }
  });

  console.log(`📊 Total SRCPARAM replacements made: ${totalReplacements}`);
  return { content: modifiedContent, issues };
};

/**
 * Removes BUILDING DOWNWASH section from content
 * @param {string} content - File content
 * @returns {Object} { content: string, issues: Array } - Modified content and issues
 */
const removeBuildingDownwash = (content) => {
  const regex = /\*\* BUILDING DOWNWASH \*\*[\s\S]*?(?=URBANSRC|$)/;
  const match = content.match(regex);
  const issues = [];

  if (match) {
    console.log(
      `🗑️  Removing BUILDING DOWNWASH section (${match[0].length} characters)`
    );
    console.log(`   Section preview: ${match[0].substring(0, 100)}...`);
  } else {
    const issue = {
      type: "warning",
      category: "building_downwash",
      message: "No BUILDING DOWNWASH section found to remove",
      details: "Expected pattern: ** BUILDING DOWNWASH ** ... URBANSRC",
    };
    issues.push(issue);
    console.log(`❌ No BUILDING DOWNWASH section found to remove`);
  }

  return { content: content.replace(regex, ""), issues };
};

/**
 * Replaces .SFC and .PFL file references with new year
 * @param {string} content - File content
 * @param {string} inputYear - 2-digit input year
 * @param {string} outputYear - Full output year
 * @returns {Object} { content: string, issues: Array } - Modified content and issues
 */
const replaceSfcPflFiles = (content, inputYear, outputYear) => {
  let modifiedContent = content;
  let totalReplacements = 0;
  const issues = [];

  // Replace .SFC files (case-insensitive)
  const sfcRegex = new RegExp(`${inputYear}\\.sfc`, "gi");
  const sfcMatches = modifiedContent.match(sfcRegex);

  if (sfcMatches) {
    console.log(
      `✅ Found ${sfcMatches.length} .SFC file reference(s): ${inputYear} -> ${outputYear}`
    );
    sfcMatches.forEach((match) => {
      console.log(`   Replacing: ${match} -> ${outputYear}.SFC`);
    });
    totalReplacements += sfcMatches.length;
  } else {
    const issue = {
      type: "warning",
      category: "sfc_files",
      message: `No .SFC file references found for year: ${inputYear}`,
      details: `Expected pattern: ${inputYear}.SFC`,
    };
    issues.push(issue);
    console.log(`❌ No .SFC file references found for year: ${inputYear}`);
  }

  modifiedContent = modifiedContent.replace(sfcRegex, `${outputYear}.SFC`);

  // Replace .PFL files (case-insensitive)
  const pflRegex = new RegExp(`${inputYear}\\.pfl`, "gi");
  const pflMatches = modifiedContent.match(pflRegex);

  if (pflMatches) {
    console.log(
      `✅ Found ${pflMatches.length} .PFL file reference(s): ${inputYear} -> ${outputYear}`
    );
    pflMatches.forEach((match) => {
      console.log(`   Replacing: ${match} -> ${outputYear}.PFL`);
    });
    totalReplacements += pflMatches.length;
  } else {
    const issue = {
      type: "warning",
      category: "pfl_files",
      message: `No .PFL file references found for year: ${inputYear}`,
      details: `Expected pattern: ${inputYear}.PFL`,
    };
    issues.push(issue);
    console.log(`❌ No .PFL file references found for year: ${inputYear}`);
  }

  modifiedContent = modifiedContent.replace(pflRegex, `${outputYear}.PFL`);

  console.log(`📊 Total .SFC/.PFL replacements made: ${totalReplacements}`);
  return { content: modifiedContent, issues };
};

/**
 * Replaces pollutant name placeholder
 * @param {string} content - File content
 * @param {string} pollutantName - Name of the pollutant
 * @returns {Object} { content: string, issues: Array } - Modified content and issues
 */
const replacePollutantName = (content, pollutantName) => {
  // Match POLLUTID followed by whitespace and any text (capture the text to replace)
  const regex = /POLLUTID\s+(\S+)/g;
  const matches = content.match(regex);
  const issues = [];

  if (matches) {
    console.log(`✅ Found ${matches.length} POLLUTID line(s)`);
    matches.forEach((match) => {
      console.log(`   Replacing: ${match} -> POLLUTID ${pollutantName}`);
    });
  } else {
    const issue = {
      type: "warning",
      category: "pollutant_name",
      message: "No POLLUTID lines found",
      details: "Expected pattern: POLLUTID <any_text>",
    };
    issues.push(issue);
    console.log(`❌ No POLLUTID lines found`);
  }

  return {
    content: content.replace(regex, `POLLUTID ${pollutantName}`),
    issues,
  };
};

/**
 * Converts a number to ordinal format (1ST, 2ND, 3RD, 4TH, etc.)
 * @param {string|number} value - The numeric value to convert
 * @returns {string} - The ordinal format
 */
const formatOrdinal = (value) => {
  const num = parseInt(value, 10);
  if (num === 1) return "1ST";
  if (num === 2) return "2ND";
  if (num === 3) return "3RD";
  return `${num}TH`;
};

/**
 * Inserts NO2 configuration between CO STARTING and CO FINISHED sections
 * @param {string} content - File content
 * @param {string} no2Configuration - NO2 configuration to insert
 * @returns {Object} { content: string, issues: Array } - Modified content and issues
 */
const insertNo2Configuration = (content, no2Configuration) => {
  const issues = [];
  let modifiedContent = content;

  // Find CO STARTING/CO FINISHED section
  const coRegex = /CO STARTING[\s\S]*?CO FINISHED/gi;
  const match = content.match(coRegex);

  if (match) {
    console.log(
      `✅ Found CO STARTING/CO FINISHED section for NO2 configuration`
    );

    // 1. Add PVMRM to any existing MODELOPT line that ends with CONC
    const modelOptRegex = /(MODELOPT\s+[^C]*CONC)(?!\s+PVMRM)/gi;
    const modelOptMatches = modifiedContent.match(modelOptRegex);

    if (modelOptMatches) {
      console.log(
        `   Found ${modelOptMatches.length} MODELOPT CONC line(s), adding PVMRM`
      );
      modifiedContent = modifiedContent.replace(modelOptRegex, "$1 PVMRM");
    } else {
      console.log(`   No MODELOPT CONC lines found to modify`);
    }

    // 2. Insert NO2 configuration before CO FINISHED
    const coFinishRegex = /(CO FINISHED)/gi;
    const coFinishMatch = modifiedContent.match(coFinishRegex);

    if (coFinishMatch) {
      console.log(`   Inserting NO2 configuration before CO FINISHED`);
      modifiedContent = modifiedContent.replace(
        coFinishRegex,
        `${no2Configuration}\n$1`
      );
      console.log(
        `   Inserted NO2 configuration: ${
          no2Configuration.split("\n").length
        } lines`
      );
    } else {
      const issue = {
        type: "error",
        category: "no2_config",
        message: "No CO FINISHED line found for NO2 configuration insertion",
        details: "Expected pattern: CO FINISHED",
      };
      issues.push(issue);
      console.log(
        `❌ No CO FINISHED line found for NO2 configuration insertion`
      );
    }

    return { content: modifiedContent, issues };
  } else {
    const issue = {
      type: "error",
      category: "no2_config",
      message: "No CO STARTING/CO FINISHED section found for NO2 configuration",
      details: "Expected pattern: CO STARTING ... CO FINISHED",
    };
    issues.push(issue);
    console.log(
      `❌ No CO STARTING/CO FINISHED section found for NO2 configuration`
    );
    return { content, issues };
  }
};

/**
 * Replaces OU STARTING/OU FINISHED section with appropriate content
 * @param {string} content - File content
 * @param {string} emissionType - "annual" or "shortterm"
 * @param {string} interval - Time interval from pollutant settings
 * @param {string} pollutantName - Name of the pollutant
 * @param {string} filename - The filename being generated (without extension)
 * @param {string} highValue - High value from pollutant settings
 * @returns {Object} { content: string, issues: Array } - Modified content and issues
 */
const replaceOuSection = (
  content,
  emissionType,
  interval,
  pollutantName,
  filename,
  highValue
) => {
  const issues = [];

  // Find OU STARTING/OU FINISHED section
  const ouRegex = /OU STARTING[\s\S]*?OU FINISHED/gi;
  const match = content.match(ouRegex);

  if (match) {
    console.log(`✅ Found OU STARTING/OU FINISHED section`);

    // Remove .txt extension from filename for .plt file
    let plotFilename = filename.replace(/\.txt$/, ".plt");
    plotFilename = filename.replace(/\.inp$/, ".plt");

    let replacementContent;

    if (emissionType === "annual") {
      // Annual report format
      replacementContent = `OU STARTING
    PLOTFILE ANNUAL ALL ${plotFilename}
OU FINISHED`;
      console.log(
        `   Replacing with annual format: PLOTFILE ANNUAL ALL ${plotFilename}`
      );
    } else {
      // Non-annual report format
      const formattedHighValue = formatOrdinal(highValue);
      replacementContent = `OU STARTING
    RECTABLE ALLAVE ${formattedHighValue}
    RECTABLE ${interval} ${formattedHighValue}
    PLOTFILE ${interval} ALL ${formattedHighValue} ${plotFilename}
OU FINISHED`;
      console.log(
        `   Replacing with non-annual format for interval: ${interval}, highValue: ${formattedHighValue} with ${plotFilename}`
      );
    }

    const modifiedContent = content.replace(ouRegex, replacementContent);
    return { content: modifiedContent, issues };
  } else {
    const issue = {
      type: "error",
      category: "ou_section",
      message: "No OU STARTING/OU FINISHED section found",
      details: "Expected pattern: OU STARTING ... OU FINISHED",
    };
    issues.push(issue);
    console.log(`❌ No OU STARTING/OU FINISHED section found`);
    return { content, issues };
  }
};

/**
 * Generates filename for a configuration file
 * @param {string} pollutantName - Name of the pollutant
 * @param {string} interval - Time interval (from pollutant settings)
 * @param {string} projectName - Name of the project
 * @param {boolean} hasDownwash - Whether the file includes BUILDING DOWNWASH section
 * @param {string} year - Year
 * @param {string} emissionType - "annual" or "shortterm"
 * @param {string} extension - File extension (default: "txt")
 * @returns {string} Generated filename
 */
export const generateFilename = (
  pollutantName,
  interval,
  projectName,
  hasDownwash,
  year,
  emissionType,
  extension = "inp"
) => {
  const downwashSuffix = hasDownwash ? "_dw" : "_nd";
  // Use "ANN" for annual files, otherwise use the interval
  const intervalOrAnn = emissionType === "annual" ? "ANN" : interval;
  return `${pollutantName}_${intervalOrAnn}_${projectName}${downwashSuffix}_${year}.${extension}`;
};

/**
 * Validates that all required parameters are present for file processing
 * @param {Object} params - Processing parameters
 * @returns {Object} Validation result with isValid boolean and error message
 */
export const validateProcessingParams = (params) => {
  const {
    inputYear,
    outputYear,
    outputYear2Digit,
    sources,
    sourcePollutantPairs,
    emissionType,
    pollutantName,
  } = params;

  if (!inputYear || !outputYear || !outputYear2Digit) {
    return { isValid: false, error: "Missing year parameters" };
  }

  if (!sources || sources.length === 0) {
    return { isValid: false, error: "No sources provided" };
  }

  if (!sourcePollutantPairs || Object.keys(sourcePollutantPairs).length === 0) {
    return { isValid: false, error: "No emission rate pairs provided" };
  }

  if (!emissionType || !["annual", "shortterm"].includes(emissionType)) {
    return { isValid: false, error: "Invalid emission type" };
  }

  if (!pollutantName) {
    return { isValid: false, error: "Missing pollutant name" };
  }

  return { isValid: true };
};

/**
 * Logs processing information for debugging
 * @param {string} pollutantName - Name of the pollutant
 * @param {string} year - Year
 * @param {string} emissionType - Emission type
 * @param {string} content - File content
 * @param {string} filename - Generated filename
 */
export const logProcessingInfo = (
  pollutantName,
  year,
  emissionType,
  content,
  filename
) => {
  console.log(
    `Processing: ${pollutantName}, Year: ${year}, Emission: ${emissionType}`
  );
  console.log(`Creating file: ${filename}`);
  console.log(`Content length: ${content.length}`);
  console.log(`First 200 chars: ${content.substring(0, 200)}`);
};
