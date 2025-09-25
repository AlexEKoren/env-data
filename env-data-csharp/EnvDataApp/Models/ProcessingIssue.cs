namespace EnvDataApp.Models
{
    public class ProcessingIssue
    {
        public string Type { get; set; } = string.Empty; // "error", "warning", "info"
        public string Message { get; set; } = string.Empty;
        public string Context { get; set; } = string.Empty; // Additional context like filename, pollutant, year, etc.
    }
}
