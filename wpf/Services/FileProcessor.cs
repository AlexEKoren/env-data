using System.Text.RegularExpressions;
using EnvDataApp.Models;

namespace EnvDataApp.Services
{
    public class FileProcessor
    {
        public static (string content, List<ProcessingIssue> issues) ProcessFileContent(
            string fileContent,
            string inputYear,
            string outputYear,
            List<Source> sources,
            List<SourcePollutantPair> sourcePollutantPairs,
            string emissionType,
            bool isFirstFile,
            string pollutantName,
            string pollutantId,
            Pollutant pollutant,
            string projectName,
            string no2Configuration,
            bool hasNo2Pollutant)
        {
            var issues = new List<ProcessingIssue>();
            var content = fileContent;

            // 1. Replace .dat files
            var datResult = ReplaceDatFiles(content, inputYear, outputYear);
            content = datResult.content;
            issues.AddRange(datResult.issues);

            // 2. Replace SRCPARAM rates
            var srcParamResult = ReplaceSrcParamRates(content, sources, sourcePollutantPairs, emissionType);
            content = srcParamResult.content;
            issues.AddRange(srcParamResult.issues);

            // 3. Handle building downwash
            if (!isFirstFile)
            {
                var downwashResult = RemoveBuildingDownwash(content);
                content = downwashResult.content;
                issues.AddRange(downwashResult.issues);
            }

            // 4. Replace SFC and PFL files
            var sfcPflResult = ReplaceSfcPflFiles(content, inputYear, outputYear);
            content = sfcPflResult.content;
            issues.AddRange(sfcPflResult.issues);

            // 5. Replace pollutant name
            var pollutantResult = ReplacePollutantName(content, pollutantName);
            content = pollutantResult.content;
            issues.AddRange(pollutantResult.issues);

            // 6. Handle NO2 configuration
            if (hasNo2Pollutant && pollutantName.Contains("NO2"))
            {
                var no2Result = InsertNo2Configuration(content, no2Configuration);
                content = no2Result.content;
                issues.AddRange(no2Result.issues);
            }

            // 7. Replace OU section
            var ouResult = ReplaceOuSection(content, emissionType, pollutant.TimeInterval, pollutant.HighValue, projectName, pollutantName, outputYear, isFirstFile);
            content = ouResult.content;
            issues.AddRange(ouResult.issues);

            return (content, issues);
        }

        private static (string content, List<ProcessingIssue> issues) ReplaceDatFiles(string content, string inputYear, string outputYear)
        {
            var issues = new List<ProcessingIssue>();
            var pattern = $@"-{inputYear}\.dat";
            var regex = new Regex(pattern, RegexOptions.IgnoreCase);
            
            if (regex.IsMatch(content))
            {
                content = regex.Replace(content, $"-{outputYear}.dat");
            }
            else
            {
                issues.Add(new ProcessingIssue
                {
                    Type = "warning",
                    Message = $"Could not find pattern '-{inputYear}.dat' to replace with '-{outputYear}.dat'",
                    Context = "DAT file replacement"
                });
            }

            return (content, issues);
        }

        private static (string content, List<ProcessingIssue> issues) ReplaceSrcParamRates(string content, List<Source> sources, List<SourcePollutantPair> pairs, string emissionType)
        {
            var issues = new List<ProcessingIssue>();
            var lines = content.Split('\n');
            var modifiedLines = new List<string>();

            foreach (var line in lines)
            {
                var modifiedLine = line;
                foreach (var source in sources)
                {
                    var pattern = $@"SRCPARAM\s+{Regex.Escape(source.Name)}\s+(\S+)";
                    var regex = new Regex(pattern, RegexOptions.IgnoreCase);
                    var match = regex.Match(line);
                    
                    if (match.Success)
                    {
                        var pair = pairs.FirstOrDefault(p => p.SourceId == source.Id);
                        if (pair != null)
                        {
                            var rate = emissionType == "annual" ? pair.AnnualRate : pair.ShortTermRate;
                            modifiedLine = regex.Replace(line, $"SRCPARAM {source.Name} {rate}");
                        }
                        else
                        {
                            issues.Add(new ProcessingIssue
                            {
                                Type = "warning",
                                Message = $"No emission rate found for source '{source.Name}'",
                                Context = $"SRCPARAM replacement for {source.Name}"
                            });
                        }
                    }
                }
                modifiedLines.Add(modifiedLine);
            }

            return (string.Join('\n', modifiedLines), issues);
        }

        private static (string content, List<ProcessingIssue> issues) RemoveBuildingDownwash(string content)
        {
            var issues = new List<ProcessingIssue>();
            var pattern = @"\*\*\s*BUILDING\s+DOWNWASH\s+\*\*.*?(?=URBANSRC|$)";
            var regex = new Regex(pattern, RegexOptions.IgnoreCase | RegexOptions.Singleline);
            
            if (regex.IsMatch(content))
            {
                content = regex.Replace(content, "");
            }
            else
            {
                issues.Add(new ProcessingIssue
                {
                    Type = "warning",
                    Message = "Could not find BUILDING DOWNWASH section to remove",
                    Context = "Building downwash removal"
                });
            }

            return (content, issues);
        }

        private static (string content, List<ProcessingIssue> issues) ReplaceSfcPflFiles(string content, string inputYear, string outputYear)
        {
            var issues = new List<ProcessingIssue>();
            var patterns = new[] { $@"{inputYear}\.SFC", $@"{inputYear}\.PFL" };
            var replacements = new[] { $"{outputYear}.SFC", $"{outputYear}.PFL" };

            for (int i = 0; i < patterns.Length; i++)
            {
                var regex = new Regex(patterns[i], RegexOptions.IgnoreCase);
                if (regex.IsMatch(content))
                {
                    content = regex.Replace(content, replacements[i]);
                }
                else
                {
                    issues.Add(new ProcessingIssue
                    {
                        Type = "warning",
                        Message = $"Could not find pattern '{patterns[i]}' to replace with '{replacements[i]}'",
                        Context = "SFC/PFL file replacement"
                    });
                }
            }

            return (content, issues);
        }

        private static (string content, List<ProcessingIssue> issues) ReplacePollutantName(string content, string pollutantName)
        {
            var issues = new List<ProcessingIssue>();
            var pattern = @"POLLUTID\s+(\S+)";
            var regex = new Regex(pattern, RegexOptions.IgnoreCase);
            
            if (regex.IsMatch(content))
            {
                content = regex.Replace(content, $"POLLUTID {pollutantName}");
            }
            else
            {
                issues.Add(new ProcessingIssue
                {
                    Type = "warning",
                    Message = $"Could not find POLLUTID pattern to replace with '{pollutantName}'",
                    Context = "Pollutant name replacement"
                });
            }

            return (content, issues);
        }

        private static (string content, List<ProcessingIssue> issues) InsertNo2Configuration(string content, string no2Configuration)
        {
            var issues = new List<ProcessingIssue>();
            
            // 1. Add PVMRM to any existing MODELOPT line that ends with CONC
            var modelOptPattern = @"(MODELOPT\s+[^C]*CONC)(?!\s+PVMRM)";
            var modelOptRegex = new Regex(modelOptPattern, RegexOptions.IgnoreCase);
            if (modelOptRegex.IsMatch(content))
            {
                content = modelOptRegex.Replace(content, "$1 PVMRM");
            }

            // 2. Insert NO2 configuration before CO FINISHED
            var coFinishPattern = @"(CO FINISHED)";
            var coFinishRegex = new Regex(coFinishPattern, RegexOptions.IgnoreCase);
            if (coFinishRegex.IsMatch(content))
            {
                content = coFinishRegex.Replace(content, $"{no2Configuration}\n$1");
            }
            else
            {
                issues.Add(new ProcessingIssue
                {
                    Type = "warning",
                    Message = "Could not find 'CO FINISHED' to insert NO2 configuration",
                    Context = "NO2 configuration insertion"
                });
            }

            return (content, issues);
        }

        private static (string content, List<ProcessingIssue> issues) ReplaceOuSection(string content, string emissionType, string interval, int highValue, string projectName, string pollutantName, string year, bool hasDownwash)
        {
            var issues = new List<ProcessingIssue>();
            var pattern = @"OU STARTING.*?OU FINISHED";
            var regex = new Regex(pattern, RegexOptions.Singleline);
            
            var filename = GenerateFilename(pollutantName, interval, projectName, hasDownwash, year, emissionType);
            var plotFilename = filename.Replace(".txt", ".plt");
            
            string replacementContent;
            if (emissionType == "annual")
            {
                replacementContent = $@"OU STARTING
PLOTFILE ANNUAL ALL {plotFilename}
OU FINISHED";
            }
            else
            {
                var formattedHighValue = FormatOrdinal(highValue);
                replacementContent = $@"OU STARTING
RECTABLE ALLAVE {formattedHighValue}
RECTABLE {interval} {formattedHighValue}
PLOTFILE {interval} ALL {formattedHighValue} {plotFilename}
OU FINISHED";
            }

            if (regex.IsMatch(content))
            {
                content = regex.Replace(content, replacementContent);
            }
            else
            {
                issues.Add(new ProcessingIssue
                {
                    Type = "warning",
                    Message = "Could not find OU STARTING/OU FINISHED section to replace",
                    Context = "OU section replacement"
                });
            }

            return (content, issues);
        }

        public static string GenerateFilename(string pollutantName, string interval, string projectName, bool hasDownwash, string year, string emissionType)
        {
            var intervalOrAnn = emissionType == "annual" ? "ANN" : interval;
            var downwashSuffix = hasDownwash ? "_dw" : "_nd";
            return $"{pollutantName}_{intervalOrAnn}_{projectName}{downwashSuffix}_{year}.txt";
        }

        private static string FormatOrdinal(int number)
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
