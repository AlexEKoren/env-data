using System;
using System.IO;
using System.Text.RegularExpressions;
using System.Collections.Generic;
using System.Linq;

namespace EnvDataApp
{
    class Program
    {
        static void Main(string[] args)
        {
            Console.WriteLine("=== Environmental Data Configuration Generator ===");
            Console.WriteLine("Cross-platform C# version for Mac/Windows/Linux");
            Console.WriteLine();

            // Get input file
            Console.Write("Enter path to input file: ");
            string inputFile = Console.ReadLine() ?? "";
            
            if (!File.Exists(inputFile))
            {
                Console.WriteLine("File not found!");
                return;
            }

            string fileContent = File.ReadAllText(inputFile);
            Console.WriteLine($"Loaded file: {Path.GetFileName(inputFile)}");

            // Get project details
            Console.Write("Enter project name: ");
            string projectName = Console.ReadLine() ?? "MyProject";

            // Validate years
            string inputYear;
            while (true)
            {
                Console.Write("Enter input year (2 digits): ");
                inputYear = Console.ReadLine() ?? "";
                if (int.TryParse(inputYear, out int inputYearNum) && inputYearNum >= 0 && inputYearNum <= 99)
                    break;
                Console.WriteLine("Invalid year. Please enter a 2-digit number (00-99).");
            }

            string startYear;
            while (true)
            {
                Console.Write("Enter start year (2 digits): ");
                startYear = Console.ReadLine() ?? "";
                if (int.TryParse(startYear, out int startYearNum) && startYearNum >= 0 && startYearNum <= 99)
                    break;
                Console.WriteLine("Invalid year. Please enter a 2-digit number (00-99).");
            }

            string endYear;
            while (true)
            {
                Console.Write("Enter end year (2 digits): ");
                endYear = Console.ReadLine() ?? "";
                if (int.TryParse(endYear, out int endYearNum) && endYearNum >= 0 && endYearNum <= 99 && endYearNum >= int.Parse(startYear))
                    break;
                Console.WriteLine($"Invalid year. Please enter a 2-digit number (00-99) that is >= {startYear}.");
            }

            // Get sources
            Console.WriteLine("\nEnter sources (press Enter with empty line to finish):");
            var sources = new List<string>();
            while (true)
            {
                Console.Write("Source name: ");
                string source = Console.ReadLine() ?? "";
                if (string.IsNullOrEmpty(source)) break;
                sources.Add(source);
            }

            // Get pollutants
            Console.WriteLine("\nEnter pollutants (press Enter with empty line to finish):");
            var pollutants = new List<(string name, bool isAnnual, bool isShortTerm, string interval, int highValue)>();
            while (true)
            {
                Console.Write("Pollutant name: ");
                string name = Console.ReadLine() ?? "";
                if (string.IsNullOrEmpty(name)) break;

                Console.Write("Include annual? (y/n): ");
                bool isAnnual = (Console.ReadLine() ?? "").ToLower().StartsWith("y");

                Console.Write("Include short-term? (y/n): ");
                bool isShortTerm = (Console.ReadLine() ?? "").ToLower().StartsWith("y");

                string interval = "24";
                int highValue = 1;
                
                if (isShortTerm)
                {
                    string[] validIntervals = { "1", "2", "3", "4", "6", "8", "12", "24" };
                    while (true)
                    {
                        Console.Write("Time interval (1,2,3,4,6,8,12,24): ");
                        interval = Console.ReadLine() ?? "24";
                        if (validIntervals.Contains(interval))
                            break;
                        Console.WriteLine("Invalid interval. Please choose from: 1,2,3,4,6,8,12,24");
                    }
                    
                    while (true)
                    {
                        Console.Write("High value (1-10): ");
                        if (int.TryParse(Console.ReadLine(), out highValue) && highValue >= 1 && highValue <= 10)
                            break;
                        Console.WriteLine("Invalid high value. Please enter a number between 1 and 10.");
                    }
                }

                pollutants.Add((name, isAnnual, isShortTerm, interval, highValue));
            }

            // Check for NO2 and get special configuration
            string no2Configuration = "";
            bool hasNo2Pollutant = pollutants.Any(p => p.name.ToUpper().Contains("NO2"));
            
            if (hasNo2Pollutant)
            {
                Console.WriteLine("\n⚠️  NO2 Pollutant Detected!");
                Console.WriteLine("NO2 requires additional configuration that will be inserted between CO STARTING and CO FINISHED sections.");
                Console.WriteLine("Enter your NO2 configuration (press Enter twice to finish):");
                Console.WriteLine("Example: ** NO2 CONVERSION OPTIONS");
                Console.WriteLine("         NO2STACK 0.200");
                Console.WriteLine("         NO2EQUIL 0.900");
                Console.WriteLine();
                
                var no2Lines = new List<string>();
                string line;
                int emptyLineCount = 0;
                
                while (emptyLineCount < 2)
                {
                    line = Console.ReadLine() ?? "";
                    if (string.IsNullOrEmpty(line))
                    {
                        emptyLineCount++;
                        if (emptyLineCount == 1) continue; // First empty line, keep going
                    }
                    else
                    {
                        emptyLineCount = 0; // Reset counter on non-empty line
                        no2Lines.Add(line);
                    }
                }
                
                no2Configuration = string.Join("\n", no2Lines);
                Console.WriteLine($"NO2 configuration saved ({no2Lines.Count} lines)");
            }

            // Get emission rates
            Console.WriteLine("\nEnter emission rates:");
            var rates = new Dictionary<string, Dictionary<string, (double shortTerm, double annual)>>();
            
            foreach (var source in sources)
            {
                rates[source] = new Dictionary<string, (double, double)>();
                foreach (var pollutant in pollutants)
                {
                    Console.WriteLine($"\n{source} - {pollutant.name}:");
                    
                    double shortTerm = 0, annual = 0;
                    if (pollutant.isShortTerm)
                    {
                        Console.Write($"  Short-term rate: ");
                        double.TryParse(Console.ReadLine(), out shortTerm);
                    }
                    if (pollutant.isAnnual)
                    {
                        Console.Write($"  Annual rate: ");
                        double.TryParse(Console.ReadLine(), out annual);
                    }
                    
                    rates[source][pollutant.name] = (shortTerm, annual);
                }
            }

            // Generate files
            Console.WriteLine("\nGenerating files...");
            var outputDir = Path.Combine(Path.GetDirectoryName(inputFile) ?? "", "generated_configs");
            Directory.CreateDirectory(outputDir);

            int fileCount = 0;
            var issues = new List<string>();

            for (int year = int.Parse(startYear); year <= int.Parse(endYear); year++)
            {
                string year2Digit = year.ToString("D2");

                foreach (var pollutant in pollutants)
                {
                    var emissionTypes = new List<string>();
                    if (pollutant.isAnnual) emissionTypes.Add("annual");
                    if (pollutant.isShortTerm) emissionTypes.Add("shortterm");

                    foreach (var emissionType in emissionTypes)
                    {
                        var variants = new[] { (hasDownwash: true, isFirstFile: true), (hasDownwash: false, isFirstFile: false) };

                        foreach (var variant in variants)
                        {
                            string content = ProcessFileContent(fileContent, inputYear, year2Digit, sources, rates, emissionType, variant.isFirstFile, pollutant.name, pollutant.interval, pollutant.highValue, projectName, variant.hasDownwash, no2Configuration, hasNo2Pollutant);
                            
                            string filename = GenerateFilename(pollutant.name, pollutant.interval, projectName, variant.hasDownwash, year2Digit, emissionType);
                            string filePath = Path.Combine(outputDir, filename);
                            
                            File.WriteAllText(filePath, content);
                            fileCount++;
                        }
                    }
                }
            }

            Console.WriteLine($"\nGenerated {fileCount} files in: {outputDir}");
            Console.WriteLine("Press any key to exit...");
            Console.ReadKey();
        }

        static string ProcessFileContent(string content, string inputYear, string outputYear, List<string> sources, Dictionary<string, Dictionary<string, (double shortTerm, double annual)>> rates, string emissionType, bool isFirstFile, string pollutantName, string interval, int highValue, string projectName, bool hasDownwash, string no2Configuration, bool hasNo2Pollutant)
        {
            // 1. Replace .dat files
            content = Regex.Replace(content, $@"-{inputYear}\.dat", $"-{outputYear}.dat", RegexOptions.IgnoreCase);

            // 2. Replace SRCPARAM rates
            foreach (var source in sources)
            {
                var pattern = $@"SRCPARAM\s+{Regex.Escape(source)}\s+(\S+)";
                var match = Regex.Match(content, pattern, RegexOptions.IgnoreCase);
                if (match.Success && rates.ContainsKey(source) && rates[source].ContainsKey(pollutantName))
                {
                    var rate = emissionType == "annual" ? rates[source][pollutantName].annual : rates[source][pollutantName].shortTerm;
                    content = Regex.Replace(content, pattern, $"SRCPARAM {source} {rate}", RegexOptions.IgnoreCase);
                }
            }

            // 3. Remove building downwash if not first file
            if (!isFirstFile)
            {
                content = Regex.Replace(content, @"\*\*\s*BUILDING\s+DOWNWASH\s+\*\*.*?(?=URBANSRC|$)", "", RegexOptions.IgnoreCase | RegexOptions.Singleline);
            }

            // 4. Replace SFC and PFL files
            content = Regex.Replace(content, $@"{inputYear}\.SFC", $"{outputYear}.SFC", RegexOptions.IgnoreCase);
            content = Regex.Replace(content, $@"{inputYear}\.PFL", $"{outputYear}.PFL", RegexOptions.IgnoreCase);

            // 5. Replace pollutant name
            content = Regex.Replace(content, @"POLLUTID\s+(\S+)", $"POLLUTID {pollutantName}", RegexOptions.IgnoreCase);

            // 6. Handle NO2 configuration
            if (hasNo2Pollutant && pollutantName.ToUpper().Contains("NO2"))
            {
                // Add PVMRM to any existing MODELOPT line that ends with CONC
                content = Regex.Replace(content, @"(MODELOPT\s+[^C]*CONC)(?!\s+PVMRM)", "$1 PVMRM", RegexOptions.IgnoreCase);
                
                // Insert NO2 configuration before CO FINISHED
                content = Regex.Replace(content, @"(CO FINISHED)", $"{no2Configuration}\n$1", RegexOptions.IgnoreCase);
            }

            // 7. Replace OU section
            string filename = GenerateFilename(pollutantName, interval, projectName, hasDownwash, outputYear, emissionType);
            string plotFilename = filename.Replace(".txt", ".plt");
            
            string replacementContent;
            if (emissionType == "annual")
            {
                replacementContent = $@"OU STARTING
PLOTFILE ANNUAL ALL {plotFilename}
OU FINISHED";
            }
            else
            {
                string formattedHighValue = FormatOrdinal(highValue);
                replacementContent = $@"OU STARTING
RECTABLE ALLAVE {formattedHighValue}
RECTABLE {interval} {formattedHighValue}
PLOTFILE {interval} ALL {formattedHighValue} {plotFilename}
OU FINISHED";
            }

            content = Regex.Replace(content, @"OU STARTING.*?OU FINISHED", replacementContent, RegexOptions.Singleline);

            return content;
        }

        static string GenerateFilename(string pollutantName, string interval, string projectName, bool hasDownwash, string year, string emissionType)
        {
            string intervalOrAnn = emissionType == "annual" ? "ANN" : interval;
            string downwashSuffix = hasDownwash ? "_dw" : "_nd";
            return $"{pollutantName}_{intervalOrAnn}_{projectName}{downwashSuffix}_{year}.txt";
        }

        static string FormatOrdinal(int number)
        {
            return number switch
            {
                1 => "1ST",
                2 => "2ND", 
                3 => "3RD",
                _ => $"{number}TH"
            };
        }
    }
}