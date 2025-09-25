using System.Collections.ObjectModel;
using System.IO;
using System.IO.Compression;
using System.Text.RegularExpressions;
using System.Windows;
using System.Windows.Controls;
using Microsoft.Win32;
using Newtonsoft.Json;
using EnvDataApp.Models;
using EnvDataApp.Services;

namespace EnvDataApp
{
    public partial class MainWindow : Window
    {
        private ObservableCollection<Source> _sources = null!;
        private ObservableCollection<Pollutant> _pollutants = null!;
        private ObservableCollection<SourcePollutantPair> _sourcePollutantPairs = null!;
        private string _fileContent = string.Empty;

        public MainWindow()
        {
            InitializeComponent();
            InitializeData();
            UpdatePairsDisplay();
        }

        private void InitializeData()
        {
            _sources = new ObservableCollection<Source>();
            _pollutants = new ObservableCollection<Pollutant>();
            _sourcePollutantPairs = new ObservableCollection<SourcePollutantPair>();

            SourcesListBox.ItemsSource = _sources;
            PollutantsListBox.ItemsSource = _pollutants;

            // Subscribe to collection changes
            _sources.CollectionChanged += (s, e) => UpdatePairsDisplay();
            _pollutants.CollectionChanged += (s, e) => UpdatePairsDisplay();
        }

        private void BrowseButton_Click(object sender, RoutedEventArgs e)
        {
            var openFileDialog = new OpenFileDialog
            {
                Filter = "Text files (*.txt)|*.txt|Input files (*.inp)|*.inp|ADI files (*.adi)|*.adi|All files (*.*)|*.*",
                Title = "Select Input File"
            };

            if (openFileDialog.ShowDialog() == true)
            {
                FilePathTextBox.Text = openFileDialog.FileName;
                try
                {
                    _fileContent = File.ReadAllText(openFileDialog.FileName);
                    StatusTextBlock.Text = $"File loaded: {Path.GetFileName(openFileDialog.FileName)}";
                }
                catch (Exception ex)
                {
                    MessageBox.Show($"Error reading file: {ex.Message}", "Error", MessageBoxButton.OK, MessageBoxImage.Error);
                }
            }
        }

        private void AddSourceButton_Click(object sender, RoutedEventArgs e)
        {
            var sourceName = NewSourceTextBox.Text.Trim();
            if (!string.IsNullOrEmpty(sourceName))
            {
                _sources.Add(new Source { Name = sourceName });
                NewSourceTextBox.Clear();
                UpdatePairsDisplay();
            }
        }

        private void RemoveSource_Click(object sender, RoutedEventArgs e)
        {
            if (sender is Button button && button.Tag is string sourceId)
            {
                var source = _sources.FirstOrDefault(s => s.Id == sourceId);
                if (source != null)
                {
                    _sources.Remove(source);
                    // Remove related pairs
                    var pairsToRemove = _sourcePollutantPairs.Where(p => p.SourceId == sourceId).ToList();
                    foreach (var pair in pairsToRemove)
                    {
                        _sourcePollutantPairs.Remove(pair);
                    }
                    UpdatePairsDisplay();
                }
            }
        }

        private void AddPollutantButton_Click(object sender, RoutedEventArgs e)
        {
            var pollutantName = NewPollutantTextBox.Text.Trim();
            if (!string.IsNullOrEmpty(pollutantName))
            {
                _pollutants.Add(new Pollutant { Name = pollutantName });
                NewPollutantTextBox.Clear();
                UpdatePairsDisplay();
                CheckForNo2Pollutant();
            }
        }

        private void RemovePollutant_Click(object sender, RoutedEventArgs e)
        {
            if (sender is Button button && button.Tag is string pollutantId)
            {
                var pollutant = _pollutants.FirstOrDefault(p => p.Id == pollutantId);
                if (pollutant != null)
                {
                    _pollutants.Remove(pollutant);
                    // Remove related pairs
                    var pairsToRemove = _sourcePollutantPairs.Where(p => p.PollutantId == pollutantId).ToList();
                    foreach (var pair in pairsToRemove)
                    {
                        _sourcePollutantPairs.Remove(pair);
                    }
                    UpdatePairsDisplay();
                    CheckForNo2Pollutant();
                }
            }
        }

        private void CheckForNo2Pollutant()
        {
            bool hasNo2 = _pollutants.Any(p => p.Name.ToUpper().Contains("NO2"));
            No2ConfigGroupBox.Visibility = hasNo2 ? Visibility.Visible : Visibility.Collapsed;
        }

        private void UpdatePairsDisplay()
        {
            PairsContainer.Children.Clear();

            foreach (var source in _sources)
            {
                var sourceGroup = new GroupBox
                {
                    Header = $"Source: {source.Name}",
                    Margin = new Thickness(0, 5, 0, 0)
                };

                var stackPanel = new StackPanel { Margin = new Thickness(10, 10, 10, 10) };

                foreach (var pollutant in _pollutants)
                {
                    var pair = _sourcePollutantPairs.FirstOrDefault(p => p.SourceId == source.Id && p.PollutantId == pollutant.Id);
                    if (pair == null)
                    {
                        pair = new SourcePollutantPair
                        {
                            SourceId = source.Id,
                            PollutantId = pollutant.Id
                        };
                        _sourcePollutantPairs.Add(pair);
                    }

                    var pairPanel = new StackPanel { Margin = new Thickness(0, 5, 0, 0) };
                    
                    var pollutantLabel = new Label { Content = $"Pollutant: {pollutant.Name}" };
                    pairPanel.Children.Add(pollutantLabel);

                    var ratesPanel = new StackPanel { Orientation = Orientation.Horizontal, Margin = new Thickness(0, 5, 0, 0) };
                    
                    if (pollutant.IsShortTerm)
                    {
                        var shortTermLabel = new Label { Content = "Short Term Rate:", VerticalAlignment = VerticalAlignment.Center };
                        var shortTermTextBox = new TextBox
                        {
                            Width = 100,
                            Text = pair.ShortTermRate.ToString(),
                            Margin = new Thickness(5, 0, 0, 0)
                        };
                        shortTermTextBox.TextChanged += (s, e) =>
                        {
                            if (double.TryParse(shortTermTextBox.Text, out double value))
                                pair.ShortTermRate = value;
                        };
                        ratesPanel.Children.Add(shortTermLabel);
                        ratesPanel.Children.Add(shortTermTextBox);
                    }

                    if (pollutant.IsAnnual)
                    {
                        var annualLabel = new Label { Content = "Annual Rate:", VerticalAlignment = VerticalAlignment.Center };
                        var annualTextBox = new TextBox
                        {
                            Width = 100,
                            Text = pair.AnnualRate.ToString(),
                            Margin = new Thickness(5, 0, 0, 0)
                        };
                        annualTextBox.TextChanged += (s, e) =>
                        {
                            if (double.TryParse(annualTextBox.Text, out double value))
                                pair.AnnualRate = value;
                        };
                        ratesPanel.Children.Add(annualLabel);
                        ratesPanel.Children.Add(annualTextBox);
                    }

                    pairPanel.Children.Add(ratesPanel);
                    stackPanel.Children.Add(pairPanel);
                }

                sourceGroup.Content = stackPanel;
                PairsContainer.Children.Add(sourceGroup);
            }
        }

        private void SaveConfigButton_Click(object sender, RoutedEventArgs e)
        {
            var saveFileDialog = new SaveFileDialog
            {
                Filter = "JSON files (*.json)|*.json|All files (*.*)|*.*",
                Title = "Save Configuration"
            };

            if (saveFileDialog.ShowDialog() == true)
            {
                try
                {
                    var config = new
                    {
                        ProjectName = ProjectNameTextBox.Text,
                        InputYear = InputYearTextBox.Text,
                        StartYear = StartYearTextBox.Text,
                        EndYear = EndYearTextBox.Text,
                        No2Configuration = No2ConfigTextBox.Text,
                        Sources = _sources.ToList(),
                        Pollutants = _pollutants.ToList(),
                        SourcePollutantPairs = _sourcePollutantPairs.ToList()
                    };

                    var json = JsonConvert.SerializeObject(config, Formatting.Indented);
                    File.WriteAllText(saveFileDialog.FileName, json);
                    StatusTextBlock.Text = "Configuration saved successfully";
                }
                catch (Exception ex)
                {
                    MessageBox.Show($"Error saving configuration: {ex.Message}", "Error", MessageBoxButton.OK, MessageBoxImage.Error);
                }
            }
        }

        private void LoadConfigButton_Click(object sender, RoutedEventArgs e)
        {
            var openFileDialog = new OpenFileDialog
            {
                Filter = "JSON files (*.json)|*.json|All files (*.*)|*.*",
                Title = "Load Configuration"
            };

            if (openFileDialog.ShowDialog() == true)
            {
                try
                {
                    var json = File.ReadAllText(openFileDialog.FileName);
                    var config = JsonConvert.DeserializeObject<dynamic>(json) ?? throw new InvalidOperationException("Failed to deserialize configuration");

                    ProjectNameTextBox.Text = config.ProjectName ?? "";
                    InputYearTextBox.Text = config.InputYear ?? "";
                    StartYearTextBox.Text = config.StartYear ?? "";
                    EndYearTextBox.Text = config.EndYear ?? "";
                    No2ConfigTextBox.Text = config.No2Configuration ?? "";

                    _sources.Clear();
                    if (config.Sources != null)
                    {
                        foreach (var source in config.Sources)
                        {
                            _sources.Add(new Source { Id = source.Id, Name = source.Name });
                        }
                    }

                    _pollutants.Clear();
                    if (config.Pollutants != null)
                    {
                        foreach (var pollutant in config.Pollutants)
                        {
                            _pollutants.Add(new Pollutant
                            {
                                Id = pollutant.Id,
                                Name = pollutant.Name,
                                IsAnnual = pollutant.IsAnnual,
                                IsShortTerm = pollutant.IsShortTerm,
                                TimeInterval = pollutant.TimeInterval,
                                HighValue = pollutant.HighValue
                            });
                        }
                    }

                    _sourcePollutantPairs.Clear();
                    if (config.SourcePollutantPairs != null)
                    {
                        foreach (var pair in config.SourcePollutantPairs)
                        {
                            _sourcePollutantPairs.Add(new SourcePollutantPair
                            {
                                SourceId = pair.SourceId,
                                PollutantId = pair.PollutantId,
                                ShortTermRate = pair.ShortTermRate,
                                AnnualRate = pair.AnnualRate
                            });
                        }
                    }

                    UpdatePairsDisplay();
                    CheckForNo2Pollutant();
                    StatusTextBlock.Text = "Configuration loaded successfully";
                }
                catch (Exception ex)
                {
                    MessageBox.Show($"Error loading configuration: {ex.Message}", "Error", MessageBoxButton.OK, MessageBoxImage.Error);
                }
            }
        }

        private void GenerateButton_Click(object sender, RoutedEventArgs e)
        {
            try
            {
                // Validation
                if (string.IsNullOrEmpty(_fileContent))
                {
                    MessageBox.Show("Please select an input file.", "Validation Error", MessageBoxButton.OK, MessageBoxImage.Warning);
                    return;
                }

                if (string.IsNullOrEmpty(ProjectNameTextBox.Text))
                {
                    MessageBox.Show("Please enter a project name.", "Validation Error", MessageBoxButton.OK, MessageBoxImage.Warning);
                    return;
                }

                if (!int.TryParse(InputYearTextBox.Text, out int inputYear) || inputYear < 0 || inputYear > 99)
                {
                    MessageBox.Show("Please enter a valid 2-digit input year.", "Validation Error", MessageBoxButton.OK, MessageBoxImage.Warning);
                    return;
                }

                if (!int.TryParse(StartYearTextBox.Text, out int startYear) || startYear < 0 || startYear > 99)
                {
                    MessageBox.Show("Please enter a valid 2-digit start year.", "Validation Error", MessageBoxButton.OK, MessageBoxImage.Warning);
                    return;
                }

                if (!int.TryParse(EndYearTextBox.Text, out int endYear) || endYear < 0 || endYear > 99)
                {
                    MessageBox.Show("Please enter a valid 2-digit end year.", "Validation Error", MessageBoxButton.OK, MessageBoxImage.Warning);
                    return;
                }

                if (startYear > endYear)
                {
                    MessageBox.Show("Start year must be less than or equal to end year.", "Validation Error", MessageBoxButton.OK, MessageBoxImage.Warning);
                    return;
                }

                if (_sources.Count == 0)
                {
                    MessageBox.Show("Please add at least one source.", "Validation Error", MessageBoxButton.OK, MessageBoxImage.Warning);
                    return;
                }

                if (_pollutants.Count == 0)
                {
                    MessageBox.Show("Please add at least one pollutant.", "Validation Error", MessageBoxButton.OK, MessageBoxImage.Warning);
                    return;
                }

                // Generate files
                var allIssues = new List<ProcessingIssue>();
                var zipPath = Path.Combine(Path.GetTempPath(), $"env_data_configs_{DateTime.Now:yyyyMMdd_HHmmss}.zip");

                using (var archive = ZipFile.Open(zipPath, ZipArchiveMode.Create))
                {
                    for (int year = startYear; year <= endYear; year++)
                    {
                        var year2Digit = year.ToString("D2");

                        foreach (var pollutant in _pollutants)
                        {
                            var emissionTypes = new List<string>();
                            if (pollutant.IsAnnual) emissionTypes.Add("annual");
                            if (pollutant.IsShortTerm) emissionTypes.Add("shortterm");

                            foreach (var emissionType in emissionTypes)
                            {
                                var fileVariants = new[]
                                {
                                    new { hasDownwash = true, isFirstFile = true },
                                    new { hasDownwash = false, isFirstFile = false }
                                };

                                foreach (var variant in fileVariants)
                                {
                                    var result = FileProcessor.ProcessFileContent(
                                        _fileContent,
                                        inputYear.ToString("D2"),
                                        year2Digit,
                                        _sources.ToList(),
                                        _sourcePollutantPairs.ToList(),
                                        emissionType,
                                        variant.isFirstFile,
                                        pollutant.Name,
                                        pollutant.Id,
                                        pollutant,
                                        ProjectNameTextBox.Text,
                                        No2ConfigTextBox.Text,
                                        _pollutants.Any(p => p.Name.ToUpper().Contains("NO2"))
                                    );

                                    allIssues.AddRange(result.issues.Select(issue => new ProcessingIssue
                                    {
                                        Type = issue.Type,
                                        Message = issue.Message,
                                        Context = $"{issue.Context} (Pollutant: {pollutant.Name}, Year: {year2Digit}, Type: {emissionType}, Downwash: {variant.hasDownwash})"
                                    }));

                                    var filename = FileProcessor.GenerateFilename(
                                        pollutant.Name,
                                        pollutant.TimeInterval,
                                        ProjectNameTextBox.Text,
                                        variant.hasDownwash,
                                        year2Digit,
                                        emissionType
                                    );

                                    var entry = archive.CreateEntry(filename);
                                    using (var entryStream = entry.Open())
                                    using (var writer = new StreamWriter(entryStream))
                                    {
                                        writer.Write(result.content);
                                    }
                                }
                            }
                        }
                    }
                }

                // Show results
                var saveFileDialog = new SaveFileDialog
                {
                    Filter = "ZIP files (*.zip)|*.zip|All files (*.*)|*.*",
                    Title = "Save Generated Configurations",
                    FileName = $"env_data_configs_{DateTime.Now:yyyyMMdd_HHmmss}.zip"
                };

                if (saveFileDialog.ShowDialog() == true)
                {
                    File.Copy(zipPath, saveFileDialog.FileName, true);
                    File.Delete(zipPath);

                    var issueCount = allIssues.Count;
                    var errorCount = allIssues.Count(i => i.Type == "error");
                    var warningCount = allIssues.Count(i => i.Type == "warning");

                    var message = $"Configuration generation completed!\n\n" +
                                 $"Files generated successfully.\n" +
                                 $"Total issues: {issueCount}\n" +
                                 $"Errors: {errorCount}\n" +
                                 $"Warnings: {warningCount}";

                    if (issueCount > 0)
                    {
                        message += $"\n\nIssues found:\n" + string.Join("\n", allIssues.Take(10).Select(i => $"- {i.Type.ToUpper()}: {i.Message}"));
                        if (allIssues.Count > 10)
                        {
                            message += $"\n... and {allIssues.Count - 10} more issues.";
                        }
                    }

                    MessageBox.Show(message, "Generation Complete", MessageBoxButton.OK, MessageBoxImage.Information);
                    StatusTextBlock.Text = $"Generated configurations saved to: {Path.GetFileName(saveFileDialog.FileName)}";
                }
            }
            catch (Exception ex)
            {
                MessageBox.Show($"Error generating configurations: {ex.Message}", "Error", MessageBoxButton.OK, MessageBoxImage.Error);
                StatusTextBlock.Text = "Error occurred during generation";
            }
        }
    }
}
