using System.ComponentModel;

namespace EnvDataApp.Models
{
    public class SourcePollutantPair : INotifyPropertyChanged
    {
        private string _sourceId = string.Empty;
        private string _pollutantId = string.Empty;
        private double _shortTermRate = 0.0;
        private double _annualRate = 0.0;

        public string SourceId
        {
            get => _sourceId;
            set
            {
                _sourceId = value;
                OnPropertyChanged(nameof(SourceId));
            }
        }

        public string PollutantId
        {
            get => _pollutantId;
            set
            {
                _pollutantId = value;
                OnPropertyChanged(nameof(PollutantId));
            }
        }

        public double ShortTermRate
        {
            get => _shortTermRate;
            set
            {
                _shortTermRate = value;
                OnPropertyChanged(nameof(ShortTermRate));
            }
        }

        public double AnnualRate
        {
            get => _annualRate;
            set
            {
                _annualRate = value;
                OnPropertyChanged(nameof(AnnualRate));
            }
        }

        public event PropertyChangedEventHandler? PropertyChanged;

        protected virtual void OnPropertyChanged(string propertyName)
        {
            PropertyChanged?.Invoke(this, new PropertyChangedEventArgs(propertyName));
        }
    }
}
